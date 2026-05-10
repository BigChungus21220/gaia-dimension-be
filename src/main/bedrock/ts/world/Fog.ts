import { Player } from "@minecraft/server";
import { DimensionSystem } from "./Gaia.js";
import * as Events from "./Events.js";

/**
 * Handles fog changes
 */
class FogSystem {
    /**
     * The fogs the player has applied
     */
    static playerFogs: Record<string, string[]> = {};
    /**
     * Cache active biome to prevent command spam
     */
    static activeBiomes: Record<string, string | null> = {};
    /**
     * Track if the base Gaia fog is applied
     */
    static baseFogApplied: Record<string, boolean> = {};

    /**
     * Updates the fogs applied to the player
     * @param {Player} player Player to update fogs of
     * @param {string|null} biome Biome to update fog to
     */
    static updateFog(player: Player, biome: string | null): void {
        if (DimensionSystem.isInGaia(player)) {
            // 1. Ensure Base Gaia Fog is always active
            if (!this.baseFogApplied[player.id]) {
                try {
                    player.runCommand(`fog @s push "gaiadimension:fog_gaia" "gaia_base"`);
                    this.baseFogApplied[player.id] = true;
                } catch (error: unknown) {
                    // Ignore command errors
                }
            }

            // 2. Layer Biome Fog on top (only if biome is provided)
            if (biome && this.activeBiomes[player.id] !== biome) {
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
    static clearAllFogs(player: Player): void {
        this.clearBiomeFogs(player);
        if (this.baseFogApplied[player.id]) {
            try {
                player.runCommand(`fog @s remove "gaia_base"`);
            } catch (error: unknown) {
                // Ignore command errors
            }
            this.baseFogApplied[player.id] = false;
        }
    }

    /**
     * Removes only the biome-specific fogs
     */
    static clearBiomeFogs(player: Player): void {
        if (!this.playerFogs[player.id] || this.playerFogs[player.id].length === 0) return;

        for (const biome of this.playerFogs[player.id]) {
            try {
                player.runCommand(`fog @s remove "${biome}"`);
            } catch (error: unknown) {
                // Ignore command errors
            }
        }
        this.playerFogs[player.id] = [];
        this.activeBiomes[player.id] = null;
    }

    /**
     * Sets the biome-specific fog layer
     */
    static setBiomeFog(player: Player, biome: string): void {
        this.clearBiomeFogs(player);
        try {
            // console.warn(`[FogSystem] Pushing biome fog: gaiadimension:${biome}_fog with ID: ${biome}`);
            player.runCommand(`fog @s push "gaiadimension:${biome}_fog" "${biome}"`);
            if (!this.playerFogs[player.id]) this.playerFogs[player.id] = [];
            this.playerFogs[player.id].push(biome);
            this.activeBiomes[player.id] = biome;
        } catch (error: unknown) {
            console.warn(`[FogSystem] Failed to push fog for ${biome}: ${error}`);
        }
    }
}

// Subscribe updateFog to playerChangeBiome for initial entry and transitions
Events.playerChangeBiome.subscribe((eventData: Events.BiomeEventData): void => {
    FogSystem.updateFog(eventData.player, eventData.biome);
});

// Also subscribe to playerChangeBlock to ensure base fog stays active on entry
Events.playerChangeBlock.subscribe((eventData: Events.BlockEventData): void => {
    // We only need a light check here; setBiomeFog is handled by playerChangeBiome
    if (DimensionSystem.isInGaia(eventData.player) && !FogSystem.baseFogApplied[eventData.player.id]) {
        FogSystem.updateFog(eventData.player, null);
    } else if (!DimensionSystem.isInGaia(eventData.player) && FogSystem.baseFogApplied[eventData.player.id]) {
        FogSystem.clearAllFogs(eventData.player);
    }
});
