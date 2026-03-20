import { world, system, Entity, ProjectileHitBlockAfterEvent, ProjectileHitEntityAfterEvent, Vector3 } from "@minecraft/server";
import { Element, Behavior } from "../items/MagicStaff.js";

// Map to track velocities because they are often zeroed out in the hit event
const lastVelocities = new Map<string, Vector3>();

export function initializeMagicStaffBehaviors() {
    // 1. Velocity Tracking
    system.runInterval(() => {
        const projectiles = world.getDimension("overworld").getEntities({ type: "gaiadimension:staff_projectile" });
        // Clean up stale IDs
        const activeIds = new Set(projectiles.map(p => p.id));
        for (const id of lastVelocities.keys()) {
            if (!activeIds.has(id)) lastVelocities.delete(id);
        }

        for (const proj of projectiles) {
            const vel = proj.getVelocity();
            if (vel.x !== 0 || vel.y !== 0 || vel.z !== 0) {
                lastVelocities.set(proj.id, vel);
            }
        }
    }, 1);

    // 2. Hit Behaviors
    world.afterEvents.projectileHitBlock.subscribe((event: ProjectileHitBlockAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        handleHit(event.projectile, event.location, event.face);
    });

    world.afterEvents.projectileHitEntity.subscribe((event: ProjectileHitEntityAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        handleHit(event.projectile, event.location);
    });
}

function handleHit(projectile: Entity, location: Vector3, face?: string) {
    const behavior = projectile.getProperty("gaiadimension:behavior") as number ?? 0;
    const element = projectile.getProperty("gaiadimension:element") as number ?? 0;
    const bounceCount = projectile.getProperty("gaiadimension:bounce_count") as number ?? 0;

    if (behavior === Behavior.RICOCHET && face && bounceCount > 0) {
        const velocity = lastVelocities.get(projectile.id);
        if (velocity) {
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
