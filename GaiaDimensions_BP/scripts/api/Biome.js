/**
 * Handles biome changes
 */
class BiomeSystem {
    /**
     * The biome each player is in
     */
    static playerBiomes = {};

    /**
     * Checks and updates player biome
     * @param {Player} player Player to update biome of
     */
    updateBiome(player){
        const biome = Gaia.getBiome(player.location);
        if (Gaia.isInGaia(player.location)) {
            if (playerBiomes[player.id] != biome){
                //send biomeChange event
            }
        }
        playerBiomes[player.id] = biome;
    }

    /**
     * Gets the biome a player is in
     * @param {Player} player Player to get biome of
     * @returns {string} Biome player is in
     */
    getBiome(player){
        return playerBiomes[player.id];
    }
}