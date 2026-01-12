import { DimensionSystem } from "./Gaia.js";
import * as Events from "./Events.js";

/**
 * Handles fog changes
 */
class FogSystem {
    /**
     * The fogs the player has applied
     */
    static playerFogs = {};
    /**
     * Cache active biome to prevent command spam
     */
    static activeBiomes = {};

    /**
     * Updates the fogs applied to the player
     * @param {Player} player Player to update fogs of
     */
    static updateFog(player, biome) {
        if (DimensionSystem.isInGaia(player)) {
            // Heavy Caching: Only update if biome changed
            if (this.activeBiomes[player.id] !== biome) {
                this.setFog(player, biome);
            }
        } else {
            this.clearFogs(player);
        }
    }

    /**
     * Removes all fogs applied to the player
     * @param {Player} player Player to remove fogs from
     */
    static clearFogs(player) {
        if (!this.playerFogs[player.id] || this.playerFogs[player.id].length === 0) return;

        for (const biome of this.playerFogs[player.id]) {
            try {
                // Quotes for safety
                player.runCommand(`fog @s remove "${biome}"`);
            } catch(e) {}
        }
        this.playerFogs[player.id] = [];
        this.activeBiomes[player.id] = null;
    }

    /**
     * Sets the active active fog of the player
     * @param {Player} player The player to add a fog to
     * @param {string} biome The biome fog to add to the player
     */
    static setFog(player, biome) {
        this.clearFogs(player);
        try {
            // Quote wrapping for identifier and user ID
            player.runCommand(`fog @s push "gaiadimension:${biome}_fog" "${biome}"`);
            if (!this.playerFogs[player.id]) this.playerFogs[player.id] = [];
            this.playerFogs[player.id].push(biome);
            this.activeBiomes[player.id] = biome;
        } catch(e) {}
    }
}

//Subscribe updateFog to playerChangeBiome
Events.playerChangeBiome.subscribe((eventData) => {
    FogSystem.updateFog(eventData.player, eventData.biome);
});
