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
     * Track if the base Gaia fog is applied
     */
    static baseFogApplied = {};

    /**
     * Updates the fogs applied to the player
     * @param {Player} player Player to update fogs of
     */
    static updateFog(player, biome) {
        if (DimensionSystem.isInGaia(player)) {
            // 1. Ensure Base Gaia Fog is always active
            if (!this.baseFogApplied[player.id]) {
                try {
                    player.runCommand(`fog @s push "gaiadimension:fog_gaia" "gaia_base"`);
                    this.baseFogApplied[player.id] = true;
                } catch(e) {}
            }

            // 2. Layer Biome Fog on top
            if (this.activeBiomes[player.id] !== biome) {
                this.setBiomeFog(player, biome);
            }
        } else {
            // Remove everything when leaving Gaia
            this.clearAllFogs(player);
        }
    }

    /**
     * Removes all fogs, including the base dimension fog
     */
    static clearAllFogs(player) {
        this.clearBiomeFogs(player);
        if (this.baseFogApplied[player.id]) {
            try {
                player.runCommand(`fog @s remove "gaia_base"`);
            } catch(e) {}
            this.baseFogApplied[player.id] = false;
        }
    }

    /**
     * Removes only the biome-specific fogs
     */
    static clearBiomeFogs(player) {
        if (!this.playerFogs[player.id] || this.playerFogs[player.id].length === 0) return;

        for (const biome of this.playerFogs[player.id]) {
            try {
                player.runCommand(`fog @s remove "${biome}"`);
            } catch(e) {}
        }
        this.playerFogs[player.id] = [];
        this.activeBiomes[player.id] = null;
    }

    /**
     * Sets the biome-specific fog layer
     */
    static setBiomeFog(player, biome) {
        this.clearBiomeFogs(player);
        try {
            console.warn(`[FogSystem] Layering biome fog for ${player.name}: gaiadimension:${biome}_fog`);
            player.runCommand(`fog @s push "gaiadimension:${biome}_fog" "${biome}"`);
            if (!this.playerFogs[player.id]) this.playerFogs[player.id] = [];
            this.playerFogs[player.id].push(biome);
            this.activeBiomes[player.id] = biome;
        } catch(e) {}
    }
}

// Subscribe updateFog to playerChangeBiome for initial entry and transitions
Events.playerChangeBiome.subscribe((eventData) => {
    FogSystem.updateFog(eventData.player, eventData.biome);
});

// Also subscribe to playerChangeBlock to ensure base fog stays active on entry
Events.playerChangeBlock.subscribe((eventData) => {
    // We only need a light check here; setBiomeFog is handled by playerChangeBiome
    if (DimensionSystem.isInGaia(eventData.player) && !FogSystem.baseFogApplied[eventData.player.id]) {
        FogSystem.updateFog(eventData.player, null);
    } else if (!DimensionSystem.isInGaia(eventData.player) && FogSystem.baseFogApplied[eventData.player.id]) {
        FogSystem.clearAllFogs(eventData.player);
    }
});
