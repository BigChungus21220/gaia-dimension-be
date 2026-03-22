import { world, system, Entity, MolangVariableMap, ProjectileHitBlockAfterEvent, ProjectileHitEntityAfterEvent, Vector3 } from "@minecraft/server";
import { Element, Behavior } from "../items/MagicStaff.js";

interface ProjectileData {
    velocity: Vector3;
    element: number;
    behavior: number;
    bounceCount: number;
    dimensionId: string;
}

// Map to track data for hit logic
const projectileCache = new Map<string, ProjectileData>();
// Set of entity IDs currently in flight to avoid scanning dimensions
const activeProjectiles = new Set<string>();

const ELEMENT_COLORS: Record<number, {r: number, g: number, b: number}> = {
    [Element.PHYSICAL]: { r: 1.0, g: 1.0, b: 1.0 },
    [Element.FIRE]:     { r: 1.0, g: 0.4, b: 0.4 },
    [Element.ELECTRIC]: { r: 1.0, g: 1.0, b: 0.4 },
    [Element.POISON]:   { r: 0.6, g: 1.0, b: 0.2 },
    [Element.FROST]:    { r: 0.4, g: 0.8, b: 1.0 },
    [Element.MAGIC]:    { r: 1.0, g: 0.6, b: 1.0 },
    [Element.ENERGY]:   { r: 0.6, g: 0.4, b: 0.8 }
};

export function initializeMagicStaffBehaviors() {
    // 1. Track spawned projectiles immediately
    world.afterEvents.entitySpawn.subscribe((event) => {
        if (event.entity.typeId === "gaiadimension:staff_projectile") {
            activeProjectiles.add(event.entity.id);
        }
    });

    // 2. Efficient Data Tracking (Only loop over known projectiles)
    system.runInterval(() => {
        if (activeProjectiles.size === 0) return;

        for (const id of activeProjectiles) {
            const entity = world.getEntity(id);
            
            if (!entity || !entity.isValid) {
                activeProjectiles.delete(id);
                // We keep it in projectileCache for one more tick in case hit event is slightly delayed
                continue;
            }

            try {
                const vel = entity.getVelocity();
                // Only update cache if entity is moving or it's new
                if (vel.x !== 0 || vel.y !== 0 || vel.z !== 0 || !projectileCache.has(id)) {
                    projectileCache.set(id, {
                        velocity: vel,
                        element: entity.getProperty("gaiadimension:element") as number ?? 0,
                        behavior: entity.getProperty("gaiadimension:behavior") as number ?? 0,
                        bounceCount: entity.getProperty("gaiadimension:bounce_count") as number ?? 0,
                        dimensionId: entity.dimension.id
                    });
                }
            } catch (e) {
                // Chunk might be unloaded or entity invalid
                activeProjectiles.delete(id);
            }
        }

        // Periodic cleanup of the cache to prevent memory leaks from missed removals
        if (system.currentTick % 200 === 0) {
            for (const id of projectileCache.keys()) {
                if (!activeProjectiles.has(id) && !world.getEntity(id)) {
                    projectileCache.delete(id);
                }
            }
        }
    }, 1);

    // 3. Hit Behaviors
    world.afterEvents.projectileHitBlock.subscribe((event: ProjectileHitBlockAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        const data = projectileCache.get(event.projectile.id);
        if (data) {
            handleHit(event.projectile, data, event.location, event.face);
            activeProjectiles.delete(event.projectile.id);
            projectileCache.delete(event.projectile.id);
        }
    });

    world.afterEvents.projectileHitEntity.subscribe((event: ProjectileHitEntityAfterEvent) => {
        if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
        const data = projectileCache.get(event.projectile.id);
        if (data) {
            handleHit(event.projectile, data, event.location);
            activeProjectiles.delete(event.projectile.id);
            projectileCache.delete(event.projectile.id);
        }
    });
}

function handleHit(projectile: Entity, data: ProjectileData, location: Vector3, face?: string) {
    const { element, behavior, bounceCount, velocity } = data;

    if (behavior === Behavior.RICOCHET && face && bounceCount > 0) {
        let newVel = { x: velocity.x, y: velocity.y, z: velocity.z };
        if (face === "North" || face === "South") newVel.z *= -1;
        if (face === "East" || face === "West") newVel.x *= -1;
        if (face === "Up" || face === "Down") newVel.y *= -1;

        const speed = Math.sqrt(velocity.x**2 + velocity.y**2 + velocity.z**2);
        const currentSpeed = Math.sqrt(newVel.x**2 + newVel.y**2 + newVel.z**2);
        if (currentSpeed > 0) {
            const ratio = speed / currentSpeed;
            newVel.x *= ratio; newVel.y *= ratio; newVel.z *= ratio;
        }

        const offsetLoc = {
            x: location.x + (face === "East" ? 0.1 : (face === "West" ? -0.1 : 0)),
            y: location.y + (face === "Up" ? 0.1 : (face === "Down" ? -0.1 : 0)),
            z: location.z + (face === "South" ? 0.1 : (face === "North" ? -0.1 : 0))
        };

        try {
            const newProj = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", offsetLoc);
            newProj.setProperty("gaiadimension:element", element);
            newProj.setProperty("gaiadimension:behavior", Behavior.RICOCHET);
            newProj.setProperty("gaiadimension:bounce_count", bounceCount - 1);

            const projComp = newProj.getComponent("minecraft:projectile") as any;
            if (projComp) projComp.shoot(newVel);
            projectile.dimension.playSound("random.bowhit", location, { pitch: 1.2 });
        } catch (e) {}
        return;
    }

    // Death Effects
    try {
        projectile.dimension.playSound("random.glass", location, { pitch: 1.5, volume: 0.5 });
        const color = ELEMENT_COLORS[element] || ELEMENT_COLORS[Element.PHYSICAL];
        const vars = new MolangVariableMap();
        vars.setFloat("variable.color_r", color.r);
        vars.setFloat("variable.color_g", color.g);
        vars.setFloat("variable.color_b", color.b);
        projectile.dimension.spawnParticle("gaiadimension:staff_shatter_particle", location, vars);
    } catch (e) {}

    switch (behavior) {
        case Behavior.BLAST:
            try { projectile.dimension.createExplosion(location, 2, { breaksBlocks: false, causesFire: false }); } catch (e) {}
            break;
        case Behavior.BURST:
            const dirs = [{ x: 1, y: 0.5, z: 0 }, { x: -1, y: 0.5, z: 0 }, { x: 0, y: 0.5, z: 1 }, { x: 0, y: 0.5, z: -1 }];
            for (const d of dirs) {
                try {
                    const sub = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", location);
                    sub.setProperty("gaiadimension:element", element);
                    sub.setProperty("gaiadimension:behavior", Behavior.BASIC);
                    const projComp = sub.getComponent("minecraft:projectile") as any;
                    if (projComp) projComp.shoot(d);
                } catch (e) {}
            }
            break;
        case Behavior.LINGER:
            try { projectile.dimension.spawnEntity("minecraft:area_effect_cloud", location); } catch (e) {}
            break;
    }
}
