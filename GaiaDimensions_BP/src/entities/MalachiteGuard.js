import { world, system, Entity, EntityDamageCause } from "@minecraft/server";

/**
 * Handles the Malachite Guard boss mechanics
 */
class MalachiteGuardSystem {
    constructor() {
        this.init();
    }

    init() {
        // Listen for Malachite Guard spawning
        world.afterEvents.entitySpawn.subscribe((event) => {
            const { entity } = event;
            if (entity.typeId === "gaiadimension:malachite_guard") {
                this.setupGuard(entity);
            }
        });

        // Monitor Guards and their Drones
        system.runInterval(() => {
            const overworld = world.getDimension("overworld");
            const guards = overworld.getEntities({
                type: "gaiadimension:malachite_guard"
            });

            // Keep track of active guards to kill "orphaned" drones
            const activeGuardIds = new Set();

            for (const guard of guards) {
                const guardId = guard.getDynamicProperty("gaiadimension:guard_id");
                if (guardId) {
                    activeGuardIds.add(guardId);
                    this.updateGuardState(guard, guardId);
                }
            }

            // Cleanup drones without parents
            const allDrones = overworld.getEntities({
                type: "gaiadimension:malachite_drone"
            });

            for (const drone of allDrones) {
                const parentId = drone.getDynamicProperty("gaiadimension:parent_id");
                if (parentId && !activeGuardIds.has(parentId)) {
                    drone.remove();
                }
            }
        }, 10); // Check every 0.5s for tighter responsiveness
    }

    /**
     * Initialize a new Malachite Guard
     * @param {Entity} guard 
     */
    setupGuard(guard) {
        const guardId = `mg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        guard.setDynamicProperty("gaiadimension:guard_id", guardId);
        guard.addTag("gaiadimension:has_active_drones");
        
        // Force initial defend mode
        system.run(() => {
            if (!guard.isValid) return;
            guard.triggerEvent("mg_defend");
            this.spawnDrones(guard, guardId);
        });
    }

    /**
     * Spawns 4 drones linked to the guard
     * @param {Entity} guard 
     * @param {string} guardId 
     */
    spawnDrones(guard, guardId) {
        const dim = guard.dimension;
        const loc = guard.location;
        const offsets = [
            { x: 4, z: 0 },
            { x: -4, z: 0 },
            { x: 0, z: 4 },
            { x: 0, z: -4 }
        ];

        offsets.forEach(offset => {
            try {
                const drone = dim.spawnEntity("gaiadimension:malachite_drone", {
                    x: loc.x + offset.x,
                    y: loc.y + 2,
                    z: loc.z + offset.z
                });
                drone.addTag(`mg_parent:${guardId}`);
                drone.setDynamicProperty("gaiadimension:parent_id", guardId);
            } catch (e) {}
        });
    }

    /**
     * Check if drones are still alive and update Guard state
     * @param {Entity} guard 
     * @param {string} guardId
     */
    updateGuardState(guard, guardId) {
        const drones = guard.dimension.getEntities({
            type: "gaiadimension:malachite_drone",
            tags: [`mg_parent:${guardId}`]
        });

        const hasDrones = drones.length > 0;
        const currentlyFlagged = guard.hasTag("gaiadimension:has_active_drones");

        if (!hasDrones && currentlyFlagged) {
            // All drones dead - Drop shield
            guard.removeTag("gaiadimension:has_active_drones");
            guard.triggerEvent("no_mg_defend");
            world.sendMessage("§c[Malachite Guard] §7The drones have fallen! The Guard's core is exposed!");
        } else if (hasDrones && !currentlyFlagged) {
            // Drones somehow respawned or system missed it - Re-enable shield
            guard.addTag("gaiadimension:has_active_drones");
            guard.triggerEvent("mg_defend");
        }
    }
}

export const malachiteGuardSystem = new MalachiteGuardSystem();
