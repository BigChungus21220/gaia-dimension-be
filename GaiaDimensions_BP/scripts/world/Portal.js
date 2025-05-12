import {
  world,
  BlockVolume,
  BlockPermutation
} from "@minecraft/server";
import { Vec3 } from "../Vec3";

export class Portal {
  constructor() {
    const raw = world.getDynamicProperty("PortalLinked") ?? "[]";
    this.linked = JSON.parse(raw);
  }

  _persist() {
    world.setDynamicProperty("PortalLinked", JSON.stringify(this.linked));
  }

  link(from, to, size) {
    if (!this.linked.some(l =>
      l.location.x === from.x && l.location.y === from.y && l.location.z === from.z &&
      l.linkedLocation.x === to.x && l.linkedLocation.y === to.y && l.linkedLocation.z === to.z
    )) {
      this.linked.push({ location: from, linkedLocation: to, size });
      this._persist();
    }
  }

  unlink(from, to) {
    this.linked = this.linked.filter(l =>
      !(
        l.location.x === from.x && l.location.y === from.y && l.location.z === from.z &&
        l.linkedLocation.x === to.x && l.linkedLocation.y === to.y && l.linkedLocation.z === to.z
      )
    );
    this._persist();
  }

  _getVolume(link, atEnd = false) {
    const corner = atEnd ? link.linkedLocation : link.location;
    return new BlockVolume(
      corner,
      {
        x: corner.x + link.size.x,
        y: corner.y + link.size.y,
        z: corner.z + link.size.z
      }
    );
  }

  getLink(positionType, loc) {
    return this.linked.find(l => this._getVolume(l, positionType === "end").isInside(loc));
  }

  isEntityInLinked(positionType, entity) {
    return this.getLink(positionType, entity.location);
  }

  clearAllLinks() {
    this.linked = [];
    this._persist();
  }

  getAllLinks() {
    return this.linked;
  }

  getCount() {
    return this.linked.length;
  }

  isLinked(from, to) {
    return this.linked.some(l =>
      l.location.x === from.x && l.location.y === from.y && l.location.z === from.z &&
      l.linkedLocation.x === to.x && l.linkedLocation.y === to.y && l.linkedLocation.z === to.z
    );
  }

  lightPortal(corner, dimension, xOriented) {
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 5; y++) {
        const pos = Vector3.add(corner, { x: xOriented ? 0 : x, y, z: xOriented ? x : 0 });
        const block = dimension.getBlock(pos);
        if (!block) continue;
        const isEdge = x === 0 || y === 0 || x === 3 || y === 4;
        block.setPermutation(
          BlockPermutation.resolve(
            isEdge ? "gaia:keystone_block" : "gaia:gaia_portal",
            isEdge ? {} : { "gaia:x_oriented": xOriented }
          )
        );
      }
    }
  }

  breakPortal(corner, dimension, xOriented) {
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        const pos = Vec3.add(corner, { x: xOriented ? 0 : x, y, z: xOriented ? x : 0 });
        const block = dimension.getBlock(pos);
        if (!block) continue;
        if (block.typeId === 'gaia:gaia_portal') {
          ['start','end'].forEach(p => {
            const link = this.getLink(p, pos);
            if (link) this.unlink(link.location, link.linkedLocation);
          });
          block.setPermutation(BlockPermutation.resolve("minecraft:air"));
        }
        const adj = block.getAdjacent().filter(b => b.typeId === 'gaia:gaia_portal');
        adj.forEach(b => {
          ['start','end'].forEach(p => {
            const link = this.getLink(p, b.location);
            if (link) this.unlink(link.location, link.linkedLocation);
          });
          b.setPermutation(BlockPermutation.resolve("minecraft:air"));
        });
      }
    }
  }

  isLit(corner, dimension, xOriented) {
    let valid = true;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 5; y++) {
        const pos = Vector3.add(corner, { x: xOriented ? 0 : x, y, z: xOriented ? x : 0 });
        const typeId = dimension.getBlock(pos)?.typeId;
        const isEdge = x === 0 || y === 0 || x === 3 || y === 4;
        if (isEdge && typeId !== "gaia:keystone_block") valid = false;
        if (!isEdge && typeId !== "gaia:gaia_portal") valid = false;
        if (!valid) break;
      }
      if (!valid) break;
    }
    return valid;
  }

  isUnlit(corner, dimension, xOriented) {
    let valid = true;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 5; y++) {
        const pos = Vec3.add(corner, { x: xOriented ? 0 : x, y, z: xOriented ? x : 0 });
        const typeId = dimension.getBlock(pos)?.typeId;
        const isEdge = x === 0 || y === 0 || x === 3 || y === 4;
        if (isEdge && typeId !== "gaia:keystone_block") valid = false;
        if (!isEdge && typeId !== "minecraft:air") valid = false;
        if (!valid) break;
      }
      if (!valid) break;
    }
    return valid;
  }

  canLight(block) {
    const pos = block.location;
    const dim = block.dimension;
    let offset = { x:0,y:0,z:0 };
    let found = false;
    let xOriented = true;
    for (let x = -2; x <= -1 && !found; x++) {
      for (let y = -3; y <= -1 && !found; y++) {
        const off = { x: xOriented?0:x, y, z: xOriented?x:0 };
        if (this.isUnlit(Vec3.add(pos, off), dim, true)) { offset = off; found = true; }
      }
    }
    if (!found) {
      xOriented = false;
      for (let x = -2; x <= -1 && !found; x++) {
        for (let y = -3; y <= -1 && !found; y++) {
          const off = { x: xOriented?0:x, y, z: xOriented?x:0 };
          if (this.isUnlit(Vec3.add(pos, off), dim, false)) { offset = off; found = true; }
        }
      }
    }
    if (found) this.lightPortal(Vec3.add(pos, offset), dim, xOriented);
    return found;
  }
}
