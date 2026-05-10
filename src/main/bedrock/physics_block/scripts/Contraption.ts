import { world, BlockPermutation, Entity, Dimension, Block, Vector3, EquipmentSlot } from "@minecraft/server";

// ── EndlessDB (inlined from Create-BE) ──────────────────────────────────
// Splits JSON data across multiple dynamic properties to bypass the 32K limit.
const PART_SIZE = 32767;

class EndlessDB {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  get count(): number {
    const value = world.getDynamicProperty(this.prefix + "count");
    return typeof value === "number" ? value : 1;
  }

  set count(value: number) {
    world.setDynamicProperty(this.prefix + "count", value);
  }

  getAll(): Record<string, any> {
    let jsonStr = "";
    for (let i = 0; i < this.count; i++) {
      const part = world.getDynamicProperty(this.prefix + "part_" + i);
      jsonStr += part ?? "";
    }
    try {
      return JSON.parse(jsonStr === "" ? "{}" : jsonStr);
    } catch (error) {
      console.error("EndlessDB: Error parsing JSON:", error);
      return {};
    }
  }

  setAll(object: Record<string, any>): void {
    const jsonStr = JSON.stringify(object);
    let remaining = jsonStr;
    let i = 0;
    while (remaining.length > 0) {
      const part = remaining.slice(0, PART_SIZE);
      world.setDynamicProperty(this.prefix + "part_" + i, part);
      remaining = remaining.slice(PART_SIZE);
      i++;
    }
    this.count = i;
  }

  clear(): void {
    const keys = world.getDynamicPropertyIds();
    for (const key of keys) {
      if (key.startsWith(this.prefix + "part_") || key === this.prefix + "count") {
        world.setDynamicProperty(key, undefined);
      }
    }
  }
}


export class Contraption {
  private entity: Entity;
  private dimension: Dimension;
  private actors: Set<Entity>;
  private velocity: Vector3;
  private rotation: Vector3;
  private angularVelocity: Vector3;
  private db: EndlessDB;

  /**
   * @param {Entity} entity - The parent entity representing the contraption.
   */
  constructor(entity: Entity) {
    this.entity = entity;
    this.dimension = entity.dimension;
    this.actors = new Set<Entity>();
    // Initialize physics properties.
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    // Setup an EndlessDB instance to store extra dynamic data.
    this.db = new EndlessDB("contraption_" + entity.id + ":");
    // Save initial data.
    this.db.setAll({
      velocity: this.velocity,
      rotation: this.rotation,
      angularVelocity: this.angularVelocity,
      children: [] // Will store { id, relativePos } for each actor.
    });
  }

  /**
   * Static method: Scans a connected structure (using flood-fill) starting from a given block.
   *
   * @param {Block} startBlock - The block at which scanning begins.
   * @param {number} maxBlocks - Maximum blocks to scan (to avoid lag).
   * @returns {Array<Block>} An array of blocks forming the structure.
   */
  static scanStructure(startBlock: Block, maxBlocks: number = 10000): Block[] {
    const dimension = startBlock.dimension;
    const queue: Block[] = [startBlock];
    const scanned = new Set<string>();
    const structureBlocks: Block[] = [];

    while (queue.length > 0 && structureBlocks.length < maxBlocks) {
      const block = queue.shift();
      if (!block) continue;
      const key = `${block.location.x},${block.location.y},${block.location.z}`;
      if (scanned.has(key)) continue;
      scanned.add(key);
      structureBlocks.push(block);

      // Check 6 adjacent blocks (X, Y, Z directions)
      const neighbors = Contraption.getBlockNeighbors(block, dimension);
      for (const neighbor of neighbors) {
        const nKey = `${neighbor.location.x},${neighbor.location.y},${neighbor.location.z}`;
        if (!scanned.has(nKey) && Contraption.isValidStructureBlock(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    return structureBlocks;
  }

  /**
   * Returns an array of adjacent blocks (6 directions) for a given block.
   *
   * @param {Block} block 
   * @param {Dimension} dimension 
   * @returns {Array<Block>}
   */
  static getBlockNeighbors(block: Block, dimension: Dimension): Block[] {
    const { x, y, z } = block.location;
    const offsets: Vector3[] = [
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ];
    return offsets
      .map(({ x: dx, y: dy, z: dz }) =>
        dimension.getBlock({ x: x + dx, y: y + dy, z: z + dz })
      )
      .filter((b): b is Block => b != null);
  }

  /**
   * Determines if a block is valid for assembling a contraption.
   *
   * @param {Block} block 
   * @returns {boolean}
   */
  static isValidStructureBlock(block: Block): boolean {
    const invalid = [
      "minecraft:air", "minecraft:water", "minecraft:lava",
      // Add more block typeIds to ignore if needed.
    ];
    return !invalid.includes(block.typeId);
  }

  /**
   * Assembles the contraption by converting an array of blocks into moving actors.
   *
   * For each block:
   *  - Spawns a "create:block" entity at its location.
   *  - Sets its appearance using its item stack.
   *  - Stores its relative position (relative to this.entity.location) as a dynamic property.
   *  - Removes the original block (by setting it to air).
   *
   * @param {Array<Block>} blocks - Blocks to assemble.
   */
  assembleStructure(blocks: Block[]): void {
    blocks.forEach(block => {
      if (block.isAir || block.isLiquid) return;

      const blockEntity = this.dimension.spawnEntity("create:block", block.location);
      const equippable = blockEntity.getComponent("equippable");
      if (equippable) {
        equippable.setEquipment(EquipmentSlot.Mainhand, block.getItemStack());
      }

      // Calculate relative position to the contraption's parent.
      const relPos: Vector3 = {
        x: block.location.x - this.entity.location.x,
        y: block.location.y - this.entity.location.y,
        z: block.location.z - this.entity.location.z,
      };
      blockEntity.setDynamicProperty("relativePos", relPos);

      // Update EndlessDB data.
      const data = this.db.getAll();
      data.children.push({ id: blockEntity.id, relativePos: relPos });
      this.db.setAll(data);

      // Remove the block from the world.
      block.setPermutation(BlockPermutation.resolve("minecraft:air"));
      this.actors.add(blockEntity);
    });
  }

  /**
   * Updates the contraption's physics.
   *
   * - Applies linear motion (with a simple gravity effect).
   * - Updates rotation using angular velocity.
   * - Teleports the parent entity and all actor entities accordingly.
   *
   * @param {number} deltaTime - The time elapsed (in ticks).
   */
  update(deltaTime: number = 1): void {
    // Update rotation.
    this.rotation = {
      x: this.rotation.x + this.angularVelocity.x * deltaTime,
      y: this.rotation.y + this.angularVelocity.y * deltaTime,
      z: this.rotation.z + this.angularVelocity.z * deltaTime,
    };

    // Apply gravity.
    this.velocity.y -= 0.04 * deltaTime;

    // Update parent entity position.
    const { x, y, z } = this.entity.location;
    const newPos: Vector3 = {
      x: x + this.velocity.x * deltaTime,
      y: y + this.velocity.y * deltaTime,
      z: z + this.velocity.z * deltaTime,
    };
    this.entity.teleport(newPos, { dimension: this.dimension });

    // Update each actor's position.
    this.actors.forEach(actor => {
      const originalRel = actor.getDynamicProperty("relativePos") as Vector3 | undefined;
      if (!originalRel) return;
      const rotatedRel = this.rotateVector(originalRel, this.rotation);
      const actorNewPos: Vector3 = {
        x: newPos.x + rotatedRel.x,
        y: newPos.y + rotatedRel.y,
        z: newPos.z + rotatedRel.z,
      };
      actor.teleport(actorNewPos, { dimension: this.dimension });
    });

    // Save updated physics data.
    const data = this.db.getAll();
    data.velocity = this.velocity;
    data.rotation = this.rotation;
    this.db.setAll(data);
  }

  /**
   * Rotates a vector by given Euler angles.
   * Rotation order: X, then Y, then Z.
   *
   * @param {Vector3} vec
   * @param {Vector3} rot
   * @returns {Vector3} The rotated vector.
   */
  rotateVector(vec: Vector3, rot: Vector3): Vector3 {
    let { x, y, z } = vec;
    // Rotate about X.
    const cosX = Math.cos(rot.x), sinX = Math.sin(rot.x);
    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    y = y1; z = z1;
    // Rotate about Y.
    const cosY = Math.cos(rot.y), sinY = Math.sin(rot.y);
    let x1 = x * cosY + z * sinY;
    let z2 = -x * sinY + z * cosY;
    x = x1; z = z2;
    // Rotate about Z.
    const cosZ = Math.cos(rot.z), sinZ = Math.sin(rot.z);
    let x2 = x * cosZ - y * sinZ;
    let y2 = x * sinZ + y * cosZ;
    return { x: x2, y: y2, z };
  }
}
