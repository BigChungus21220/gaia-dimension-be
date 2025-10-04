import { system, world } from "@minecraft/server";

const GEYSER_COMPONENT_ID = "gaiadimension:geyser";
const ERUPTION_DURATION_TICKS = 120; // 6 seconds
const KNOCKBACK_STRENGTH = 1.2;
const PARTICLE_EFFECT_STEAM = "gaiadimension:geyser_steam";
const PARTICLE_EFFECT_BLAST = "gaiadimension:geyser_blast";
const SOUND_ID = "geyser.blast";

/**
 * Manages the logic for all active geysers in the world.
 */
class GeyserManager {
    constructor() {
        // A map to track active geysers and their deactivation tick.
        this.activeGeysers = new Map();
        this.tickInterval = 5; // How often to run the update loop.
    }

    /**
     * Starts the global update loop that manages all active geysers.
     */
    initialize() {
        system.runInterval(() => {
            const currentTick = system.currentTick;
            for (const [geyserKey, deactivationTick] of this.activeGeysers.entries()) {
                if (currentTick >= deactivationTick) {
                    // Geyser has finished erupting.
                    this.activeGeysers.delete(geyserKey);
                } else {
                    // Geyser is still active, push entities.
                    this.applyPush(geyserKey);
                }
            }
        }, this.tickInterval);
    }

    /**
     * Triggers a geyser eruption.
     * @param {import("@minecraft/server").Block} block The geyser block that was stepped on.
     */
    erupt(block) {
        const geyserKey = this.getBlockKey(block);
        if (this.activeGeysers.has(geyserKey)) {
            return; // Already erupting.
        }

        // Schedule the deactivation.
        this.activeGeysers.set(geyserKey, system.currentTick + ERUPTION_DURATION_TICKS);

        // Play effects
        const eruptionLocation = { x: block.location.x + 0.5, y: block.location.y + 1.1, z: block.location.z + 0.5 };
        block.dimension.playSound(SOUND_ID, eruptionLocation);
        block.dimension.spawnParticle(PARTICLE_EFFECT_STEAM, eruptionLocation);
        block.dimension.spawnParticle(PARTICLE_EFFECT_BLAST, eruptionLocation);
    }

    /**
     * Applies the upward push to entities above a specific geyser.
     * @param {string} geyserKey A unique string identifying the geyser block.
     */
    applyPush(geyserKey) {
        const { dimension, location } = this.parseBlockKey(geyserKey);
        if (!dimension || !location) return;

        // More efficient entity query
        const entities = dimension.getEntities({ location, maxDistance: 6 });

        for (const entity of entities) {
            // Check if the entity is within the geyser's column
            const isHorizontallyAligned = Math.abs(entity.location.x - location.x) < 0.5 && Math.abs(entity.location.z - location.z) < 0.5;
            const isVerticallyAligned = entity.location.y >= location.y;

            if (isHorizontallyAligned && isVerticallyAligned) {
                try {
                    // Apply a strong upward knockback.
                    entity.applyKnockback(0, 0, 0, KNOCKBACK_STRENGTH);
                } catch (e) {
                    // Ignore errors for entities that can't have knockback applied.
                }
            }
        }
    }

    /**
     * Creates a unique string key for a block.
     * @param {import("@minecraft/server").Block} block
     * @returns {string}
     */
    getBlockKey(block) {
        return `${block.dimension.id}|${block.location.x},${block.location.y},${block.location.z}`;
    }

    /**
     * Parses a block key back into its components.
     * @param {string} key
     * @returns {{dimension: import("@minecraft/server").Dimension, location: import("@minecraft/server").Vector3} | {}}
     */
    parseBlockKey(key) {
        try {
            const [dimensionId, coords] = key.split('|');
            const [x, y, z] = coords.split(',').map(Number);
            return { dimension: world.getDimension(dimensionId), location: { x, y, z } };
        } catch (e) {
            return {};
        }
    }
}

/**
 * This is the main registration function for the geyser component.
 */
export function registerGeyserComponent({ blockComponentRegistry }) {
    const geyserManager = new GeyserManager();
    geyserManager.initialize();

    blockComponentRegistry.registerCustomComponent(GEYSER_COMPONENT_ID, {
        OnStepOn(event) {
            // When an entity steps on the geyser, trigger the eruption.
            geyserManager.erupt(event.block);
        }
    });
}