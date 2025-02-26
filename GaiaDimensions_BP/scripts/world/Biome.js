import {  world  } from "@minecraft/server";
import { level } from "./ModDimension";

// Cache the Gaia dimension once.
const gaiaDimension = level.getDimension("gaia_dimension");

// Use a Map for efficient per–player biome storage.
const playerBiomes = new Map();

// Custom event emitter for biome changes.
const playerChangeBiomeEvent = {
  _listeners: [],
  subscribe(callback) {
    this._listeners.push(callback);
  },
  trigger(eventData) {
    for (const listener of this._listeners) {
      try {
        listener(eventData);
      } catch (error) {
        console.error("Error in playerChangeBiome event:", error);
      }
    }
  }
};

class BiomeSystem {
  /**
   * Checks the bedrock block (always at y=0) beneath the player's x/z coordinates to determine the biome.
   * If the biome (extracted from the block’s typeId in the format "<biome>_bedrock")
   * has changed compared to what was previously stored, triggers a playerChangeBiome event.
   *
   * @param {Player} player - The player to update.
   */
  static updateBiome(player) {
    // Only process if the player is in the Gaia dimension.
    if (!gaiaDimension.isInDimension(player.location)) return;

    // Calculate the block position at y=0 (bedrock) using the player's x and z.
    const { x, z } = player.location;
    const pos = {
      x: Math.floor(x),
      y: 0,
      z: Math.floor(z)
    };

    // Get the block at the specified position from the cached Gaia dimension.
    const blockBelow = gaiaDimension.getBlock(pos);
    if (!blockBelow || typeof blockBelow.typeId !== "string") return;

    // Expect the typeId format to be "<biome>_bedrock" and extract the biome.
    const suffix = "_bedrock";
    const typeId = blockBelow.typeId;
    if (!typeId.endsWith(suffix)) return;
    const currentBiome = typeId.slice(0, -suffix.length);

    // If the stored biome for this player differs, trigger the custom event.
    if (playerBiomes.get(player.id) !== currentBiome) {
      playerChangeBiomeEvent.trigger({ player, biome: currentBiome });
    }
    // Update the stored biome.
    playerBiomes.set(player.id, currentBiome);
  }

  /**
   * Retrieves the currently tracked biome for the given player.
   *
   * @param {Player} player - The player whose biome is to be retrieved.
   * @returns {string|undefined} The current biome name, if available.
   */
  static getBiome(player) {
    return playerBiomes.get(player.id);
  }
}

export { BiomeSystem, playerChangeBiomeEvent };
