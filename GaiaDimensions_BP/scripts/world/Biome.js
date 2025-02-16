import { level } from "./ModDimension";
import { world } from "@minecraft/server";

// Retrieve the Gaia dimension once.
const gaiaDimension = level.getDimension("gaia_dimension");

class Gaia {
    // Check if the location is in Gaia by comparing the dimension id.
    static isInGaia(location) {
        return location.dimension.id === gaiaDimension.id;
    }
}

class BiomeSystem {
    static #playerBiomes = {};

    /**
     * Updates the biome for the given player if they are in Gaia.
     * Triggers a playerChangeBiome event if the biome has changed.
     * @param {Player} player - The player to update.
     */
    static updateBiome(player) {
        // Only update if the player is in the Gaia dimension.
        if (Gaia.isInGaia(player.location)) {
            const currentBiome = Gaia.getBiome(player.location);
            if (this.#playerBiomes[player.id] !== currentBiome) {
                // Trigger a custom event for biome change.
                Events.playerChangeBiome.trigger({ player, biome: currentBiome });
            }
            this.#playerBiomes[player.id] = currentBiome;
        }
    }

    /**
     * Retrieves the current biome of the player as tracked by BiomeSystem.
     * @param {Player} player - The player whose biome to retrieve.
     * @returns {string|undefined} The biome name, if available.
     */
    static getBiome(player) {
        return this.#playerBiomes[player.id];
    }
}

// Update each player's biome on every tick.
world.afterEvents.tick.subscribe(() => {
    const players = world.getAllPlayers();
    for (const player of players) {
        BiomeSystem.updateBiome(player);
    }
});

export default BiomeSystem;
