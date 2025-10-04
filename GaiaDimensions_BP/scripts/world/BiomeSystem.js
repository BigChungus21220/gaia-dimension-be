import { system, world } from "@minecraft/server";
import { GaiaDimension } from "./GaiaDimension";
import { playerChangeBiome } from "./Events";

/**
 * Handles biome changes by periodically checking player locations.
 */
class BiomeSystem {
    /**
     * A map to store the last known biome for each player.
     * @type {Map<string, string>}
     */
    static #playerBiomes = new Map();

    /**
     * Starts the biome checking interval.
     */
    static initializeBiomeChecker() {
        system.runInterval(() => {
            for (const player of world.getAllPlayers()) {
                if (GaiaDimension.isInGaia(player.location)) {
                    const currentBiome = GaiaDimension.getBiome(player.location);
                    const lastBiome = this.#playerBiomes.get(player.id);

                    if (currentBiome && currentBiome !== lastBiome) {
                        this.#playerBiomes.set(player.id, currentBiome);
                        playerChangeBiome.trigger({ player: player, biome: currentBiome });
                    }
                } else {
                    // Player is not in Gaia, remove them from the map
                    if (this.#playerBiomes.has(player.id)) {
                        this.#playerBiomes.delete(player.id);
                    }
                }
            }
        }, 20); // Runs every 20 ticks (1 second)
    }
}

export default BiomeSystem;

export function initializeBiomeChecker() {
    BiomeSystem.initializeBiomeChecker();
}
