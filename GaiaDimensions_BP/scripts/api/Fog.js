import { Gaia } from "./Gaia";
import * as Events from "./Events";

//Subscribe updateFog to playerChangeBiome
Events.playerChangeBiome.subscribe((eventData) => {
    FogSystem.updateFog(eventData.player, eventData.biome);
})


/**
 * Handles fog changes
 */
class FogSystem {
    /**
     * The fogs the player has applied (hopefully only one)
     */
    static playerFogs = {};

    /**
     * Updates the fogs applied to the player
     * @param {Player} player Player to update fogs of
     */
    static updateFog(player, biome) {
        if (Gaia.isInGaia(player.location)) {
            this.setFog(player, biome);
        } else {
            this.clearFogs(player);
        }
    }

    /**
     * Removes all fogs applied to the player
     * @param {Player} player Player to remove fogs from
     */
    static clearFogs(player) {
        for (const biome of playerData[player.id]) {
            player.runCommandAsync("fog @s remove " + biome);
            this.playerFogs[player.id] = [];
        }
    }

    /**
     * Sets the active fog of the player
     * @param {Player} player The player to add a fog to
     * @param {string} biome The biome fog to add to the player
     */
    static setFog(player, biome) {
        this.clearFogs(player);
        player.runCommandAsync("fog @s push gaia:" + biome + "_fog " + biome);
        this.playerFogs[player.id].push(biome);
    }
}
