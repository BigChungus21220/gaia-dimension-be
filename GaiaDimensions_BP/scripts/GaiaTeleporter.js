import { world, system, Entity } from "@minecraft/server";
import { Vec3 } from "./Vec3.js";
import { level } from "./ModDimension.js";
import Portal from "./world/Portal.js";

const gaiaMod = level.getDimension("gaia_dimension");
const OVERWORLD = world.getDimension("overworld");
const portalState = new WeakMap();

class PortalManager {
  static delay(ticks) {
    return new Promise(res => system.runTimeout(res, ticks));
  }

  static processEntity(entity) {
    if (!(entity instanceof Entity)) return;
    const now = system.currentTick;
    let state = portalState.get(entity) || { inPortal: false, backup: null, cooldown: 0 };
    if (now < state.cooldown) return;
    const inPortal = entity.isInPortal();
    if (inPortal && !state.inPortal) {
      state.inPortal = true;
      state.backup = Vec3.from(entity.location).round();
      state.cooldown = now + 10;
      portalState.set(entity, state);
      PortalManager.tp(entity, state.backup);
    } else if (!inPortal && state.inPortal) {
      state.inPortal = false;
      state.cooldown = now + 10;
      portalState.set(entity, state);
      PortalManager.back(entity, state.backup);
    }
  }

  static async tp(entity, backup) {
    entity.setDynamicProperty("enteredByPortal", true);
    const from = OVERWORLD;
    const toDim = gaiaMod.dimension;
    const offset = Vec3.from(backup).subtract(Vec3(gaiaMod.center.x, backup.y, gaiaMod.center.z));
    const dest = Vec3(gaiaMod.center.x, backup.y, gaiaMod.center.z).add(offset);
    entity.teleport(dest, { dimension: toDim });
    await PortalManager.delay(10);
    Portal.lightPortal(dest, toDim, true);
    await PortalManager.delay(10);
    if (!Portal.getLink("start", backup)) Portal.link(backup, Vec3.from(entity.location), Vec3(4,5,1));
  }

  static async back(entity, backup) {
    entity.setDynamicProperty("enteredByPortal", false);
    const toDim = OVERWORLD;
    entity.teleport(backup, { dimension: toDim });
  }
}

system.runInterval(() => {
  for (const p of world.getAllPlayers()) PortalManager.processEntity(p);
}, 5);
