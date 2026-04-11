import { world, system, Dimension, Vector3, Entity, Player } from "@minecraft/server";

/**
 * Gaia Dimension Configuration
 */
const GAIA_DIMENSION_ID = "gaiadimension:gaia";

export class DimensionSystem {
    /**
     * Checks if the given entity is currently in the Gaia Dimension.
     */
    static isInGaia(entity: { dimension: Dimension, location: Vector3, isValid: boolean }): boolean {
        if (!entity || !entity.isValid) return false;
        return entity.dimension.id === GAIA_DIMENSION_ID;
    }

    /**
     * Gets the biome ID at the specified location in the given dimension.
     */
    static getBiomeAt(dimension: Dimension, location: Vector3): string {
        try {
            // Use native 2026 API for biome fetching
            const biome = (dimension as any).getBiome(location);
            return biome ? biome.id.replace("minecraft:", "").replace("gaiadimension:", "") : "crystal_plains";
        } catch (e) {
            return "crystal_plains";
        }
    }

    /**
     * Gets the biome ID where the entity is currently located.
     */
    static getBiome(entity: Entity | Player): string {
        if (!entity || !entity.isValid) return "crystal_plains";
        return this.getBiomeAt(entity.dimension, entity.location);
    }
}

// Coordinate display logic fix (removed CoordinateDisplay.ts dependency)
world.afterEvents.gameRuleChange.subscribe(({rule, value}) => {
    if (rule === "showCoordinates" && value === false) {
        world.getAllPlayers().forEach(player => player.onScreenDisplay.setActionBar(`§.`));
    }
});
