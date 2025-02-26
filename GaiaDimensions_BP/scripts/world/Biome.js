import { Dimension } from "@minecraft/server";
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
   * Checks the block below the player (the bedrock) to determine the biome.
   * If the biome (extracted from the block’s type ID) has changed compared to what
   * was previously stored, triggers a playerChangeBiome event.
   *
   * @param {Player} player - The player to update.
   */
  static updateBiome(player) {
    // Only process if the player is in Gaia.
    let gaia = level.getDimension("gaia_dimension")
    if (!gaia.isInDimension(player.location)) return;

    // Calculate the block position immediately below the player.
    const { x, y, z } = player.location;
    const pos = {
      x: Math.floor(x),
      y: Math.floor(y) - 1,
      z: Math.floor(z)
    };

    // Get the block below from the cached Gaia dimension.
    const blockBelow = Dimension.getBlock(pos);
    if (!blockBelow || typeof blockBelow.typeId !== "string") return;

    // Expect the typeId to be in the format "<biome>_bedrock"
    const suffix = "_bedrock";
    const typeId = blockBelow.typeId;
    if (!typeId.endsWith(suffix)) return;
    const currentBiome = typeId.slice(0, -suffix.length);

    // If the biome has changed for this player, trigger the custom event.
    if (playerBiomes.get(player.id) !== currentBiome) {
      playerChangeBiomeEvent.trigger({ player, biome: currentBiome });
    }
    // Update stored biome.
    playerBiomes.set(player.id, currentBiome);
  }

  /**
   * Retrieves the currently tracked biome for the given player.
   *
   * @param {Player} player - The player whose biome is to be retrieved.
   * @returns {string|undefined} The current biome name if available.
   */
  static getBiome(player) {
    return playerBiomes.get(player.id);
  }
}

export { BiomeSystem, playerChangeBiomeEvent };
