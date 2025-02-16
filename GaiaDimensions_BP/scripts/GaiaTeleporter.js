import { world, system, Player, Entity } from "@minecraft/server";
import { Vec3 } from "./Vec3.js";
import { level } from "./world/ModDimension.js";

// A WeakMap to store each entity’s portal state.
const portalState = new WeakMap();

/**
 * PortalManager handles teleportation using only the Portal class.
 * It uses a WeakMap to store per-entity state and dynamically links
 * portal transitions.
 */
class PortalManager {
  /**
   * Processes an entity for portal transitions.
   * @param {Entity} entity 
   */
  static async processEntity(entity) {
    // We only handle Player instances.
    if (!(entity instanceof Player)) return;

    // Determine if the entity is “in a portal”
    const currentlyInPortal = entity.isInPortal();

    // Retrieve state or initialize new state.
    let state = portalState.get(entity);
    if (!state) {
      state = { inPortal: false, backupLocation: null };
      portalState.set(entity, state);
    }

    // When the entity has just entered a portal…
    if (currentlyInPortal && !state.inPortal) {
      // Save the backup location (rounded)
      state.backupLocation = Vec3.round(entity.location);
      state.inPortal = true;
      portalState.set(entity, state);
      await PortalManager.tpToTarget(entity, state.backupLocation);
    }
    // When the entity has just exited a portal…
    if (!currentlyInPortal && state.inPortal) {
      state.inPortal = false;
      portalState.set(entity, state);
      await PortalManager.backToOverworld(entity, state.backupLocation);
    }
  }

  /**
   * Teleports the entity to the target dimension using portal logic.
   * This mimics tpToGaia in our earlier code.
   * @param {Player} entity 
   * @param {object} backupLocation 
   */
  static async tpToTarget(entity, backupLocation) {
    // Mark that the entity has been processed.
    entity.setDynamicProperty("enteredByPortal", true);
    
    // For simplicity, assume the target location equals the backup.
    const targetLoc = backupLocation;
    
    // Dynamically import the Portal class so that it is loaded only when needed.
    const { default: Portal } = await import("./world/Portal.js");
    // For this example, assume Portal has a static property "targetDimension".
    const targetDimension = Portal.targetDimension || level.getDimension("gaia");

    // Teleport the entity to the target dimension at the target location.
    entity.teleport(targetLoc, { dimension: targetDimension });
    await PortalManager.delay(0.8);
    
    // Light the portal structure at the new location.
    Portal.lightPortal(entity.location, targetDimension, true);
    await PortalManager.delay(0.8);
    
    // For simplicity, assume the top block is the entity's current location.
    const finalLoc = entity.location;
    entity.teleport(finalLoc, { dimension: targetDimension });
    
    // If no link exists from the backup location, then link it.
    if (!Portal.getLink("start", backupLocation)) {
      Portal.link(backupLocation, finalLoc);
    }
  }

  /**
   * Teleports the entity back to the overworld.
   * @param {Player} entity 
   * @param {object} backupLocation 
   */
  static async backToOverworld(entity, backupLocation) {
    // Clear the portal entry marker.
    entity.setDynamicProperty("enteredByPortal", false);
    // For simplicity, use the backup location as the destination.
    const dest = backupLocation || entity.location;
    // Assume the overworld dimension is available as Portal.overworldDimension.
    const overworldDim = Portal.overworldDimension || world.getDimension("overworld");
    // Teleport the entity back.
    entity.teleport(dest, { dimension: overworldDim });
  }

  /**
   * Returns a Promise that resolves after the given seconds.
   * @param {number} seconds 
   * @returns {Promise<void>}
   */
  static delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 50));
  }
}

// Run an interval (every 5 ticks) to process all players.
system.runInterval(async () => {
  // Use dynamic import to get Portal in case its properties have changed.
  const { default: Portal } = await import("./world/Portal.js");
  // Process each player.
  for (const player of world.getAllPlayers()) {
    await PortalManager.processEntity(player);
  }
}, 5);

export default PortalManager;
