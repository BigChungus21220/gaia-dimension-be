import { world, system, Entity, ProjectileHitBlockAfterEvent, ProjectileHitEntityAfterEvent, Vector3 } from "@minecraft/server";
import { Element, Behavior } from "../items/MagicStaff.js";

interface ProjectileData {
    velocity: Vector3;
    element: number;
    behavior: number;
    bounceCount: number;
}

// Map to track data because projectiles are often removed/invalidated by the engine during hit events
const projectileCache = new Map<string, ProjectileData>();

export function initializeMagicStaffBehaviors() {
    // 1. Data Tracking
    system.runInterval(() => {
        // We'll check all dimensions if the API allows, or at least common ones
        for (const dim of ["overworld", "nether", "the_end", "gaiadimension"]) {
            try {
                const dimension = world.getDimension(dim);
                const projectiles = dimension.getEntities({ type: "gaiadimension:staff_projectile" });
                
                // Track active IDs to clean up later
                const activeIds = new Set(projectiles.map(p => p.id));
                
                for (const proj of projectiles) {
                    const vel = proj.getVelocity();
                    // We only update if velocity is meaningful, or if it's the first time
                    if (vel.x !== 0 || vel.y !== 0 || vel.z !== 0 || !projectileCache.has(proj.id)) {
                        projectileCache.set(proj.id, {
                            velocity: vel,
                            element: proj.getProperty("gaiadimension:element") as number ?? 0,
                            behavior: proj.getProperty("gaiadimension:behavior") as number ?? 0,
                            bounceCount: proj.getProperty("gaiadimension:bounce_count") as number ?? 0
                        });
                    }
                }
            } catch (e) {
                // Dimension might not be loaded
            }
        }

        // Periodic cleanup of stale IDs (optional, could be done more precisely in hit events)
        if (system.currentTick % 100 === 0) {
            // Very basic cleanup - in a real scenario we'd track entity validity
        }
    }, 1);

    // 2. Hit Behaviors
    world.afterEvents.projectileHitBlock.subscribe((event: ProjectileHitBlockAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        const data = projectileCache.get(event.projectile.id);
        handleHit(event.projectile, data, event.location, event.face);
        projectileCache.delete(event.projectile.id);
    });

    world.afterEvents.projectileHitEntity.subscribe((event: ProjectileHitEntityAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        const data = projectileCache.get(event.projectile.id);
        handleHit(event.projectile, data, event.location);
        projectileCache.delete(event.projectile.id);
    });
}

function handleHit(projectile: Entity, data: ProjectileData | undefined, location: Vector3, face?: string) {
    if (!data) return; // Cannot execute without cached data if entity is gone

    const { element, behavior, bounceCount, velocity } = data;

    if (behavior === Behavior.RICOCHET && face && bounceCount > 0) {
        let newVel = { x: velocity.x, y: velocity.y, z: velocity.z };
        
        // Reflect based on face
        if (face === "North" || face === "South") newVel.z *= -1;
        if (face === "East" || face === "West") newVel.x *= -1;
        if (face === "Up" || face === "Down") newVel.y *= -1;

        const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
        const currentSpeed = Math.sqrt(newVel.x**2 + newVel.y**2 + newVel.z**2);
        if (currentSpeed > 0) {
            const ratio = speed / currentSpeed;
            newVel.x *= ratio;
            newVel.y *= ratio;
            newVel.z *= ratio;
        }

        const offsetLoc = {
            x: location.x + (face === "East" ? 0.1 : (face === "West" ? -0.1 : 0)),
            y: location.y + (face === "Up" ? 0.1 : (face === "Down" ? -0.1 : 0)),
            z: location.z + (face === "South" ? 0.1 : (face === "North" ? -0.1 : 0))
        };

        const newProj = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", offsetLoc);
        newProj.setProperty("gaiadimension:element", element);
        newProj.setProperty("gaiadimension:behavior", Behavior.RICOCHET);
        newProj.setProperty("gaiadimension:bounce_count", bounceCount - 1);

        const projComp = newProj.getComponent("minecraft:projectile") as any;
        if (projComp) {
            projComp.shoot(newVel);
        }
        projectile.dimension.playSound("random.bowhit", location, { pitch: 1.2 });
        return;
    }

    switch (behavior) {
        case Behavior.BLAST:
            projectile.dimension.createExplosion(location, 2, { breaksBlocks: false, causesFire: false });
            break;
        case Behavior.BURST:
            const dirs = [
                { x: 1, y: 0.5, z: 0 }, { x: -1, y: 0.5, z: 0 },
                { x: 0, y: 0.5, z: 1 }, { x: 0, y: 0.5, z: -1 }
            ];
            for (const d of dirs) {
                const sub = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", location);
                sub.setProperty("gaiadimension:element", element);
                sub.setProperty("gaiadimension:behavior", Behavior.BASIC);
                const projComp = sub.getComponent("minecraft:projectile") as any;
                if (projComp) projComp.shoot(d);
            }
            break;
        case Behavior.LINGER:
            projectile.dimension.spawnEntity("minecraft:area_effect_cloud", location);
            break;
    }
}
