import Gaia from './Gaia'
import * as Events from "./Events"



/**
 * Handles biome changes
 */
class BiomeSystem {
    /**
     * The biome each player is in (should be made private)
     */
    static #playerBiomes = {};

    /**
     * Checks and updates player biome
     * @param {Player} player Player to update biome of
     */
    static updateBiome(player){
        const biome = Gaia.getBiome(player.location);
        if (Gaia.isInGaia(player.location)) {
            if (this.#playerBiomes[player.id] != biome){
                Events.playerChangeBiome.trigger({player:player,biome:biome}); //trigger playerChangeBiome
            }
        }
        this.#playerBiomes[player.id] = biome;
    }

    /**
     * Gets the biome a player is in
     * @param {Player} player Player to get biome of
     * @returns {string} Biome player is in
     */
    static getBiome(player){
        return this.#playerBiomes[player.id];
    }
}

export default BiomeSystem


//Subscribe updateBiome to playerChangeBlock
Events.playerChangeBlock.subscribe((eventData) => {
    BiomeSystem.updateBiome(eventData.player);
})