import { Player } from "@minecraft/server";
import { DimensionSystem } from "./Gaia.js"
import * as Events from "./Events.js"

/**
 * Handles biome changes
 */
class BiomeSystem {
    /**
     * The biome each player is in
     */
    static #playerBiomes: Record<string, string> = {};

    /**
     * Checks and updates player biome
     * @param {Player} player Player to update biome of
     */
    static updateBiome(player: Player): void {
        const biome = DimensionSystem.getBiome(player);
        if (DimensionSystem.isInGaia(player)) {
            if (this.#playerBiomes[player.id] !== biome){
                // world.sendMessage(`§b[BiomeSystem] Biome change for ${player.name}: ${biome}`);
                Events.playerChangeBiome.trigger({ player, biome }); //trigger playerChangeBiome
            }
        }
        this.#playerBiomes[player.id] = biome;
    }

    /**
     * Gets the biome a player is in
     * @param {Player} player Player to get biome of
     * @returns {string} Biome player is in
     */
    static getBiome(player: Player): string {
        return this.#playerBiomes[player.id];
    }
}

export default BiomeSystem;

//Subscribe updateBiome to playerChangeBlock
Events.playerChangeBlock.subscribe((eventData) => {
    BiomeSystem.updateBiome(eventData.player);
});
