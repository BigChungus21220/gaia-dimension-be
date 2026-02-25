import { world, system, BlockPermutation } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";
import { PortalManager } from "../API/lib/PortalLib.js";
import { BIOME_MAPPING } from "../config/biome_config.js";

/**
 * Gaia Dimension Configuration
 * Range: 100,000 to 400,000 (300k block square grid)
 * Location: Simulated in minecraft:the_end
 */
const GAIA_DIMENSION_ID = "gaia_dimension";
const RANGE_START = 100000;
const RANGE_END = 400000;

export let GaiaDimension;

/**
 * Persistently stores and retrieves links between portals across dimensions
 */
class PortalLinker {
    static getLink(dimensionId, x, y, z) {
        const key = `link_${dimensionId}_${Math.floor(x)}_${Math.floor(y)}_${Math.floor(z)}`;
        const data = world.getDynamicProperty(key);
        return data ? JSON.parse(data) : null;
    }

    static setLink(fromDim, fromX, fromY, fromZ, toDim, toX, toY, toZ) {
        const key = `link_${fromDim}_${Math.floor(fromX)}_${Math.floor(fromY)}_${Math.floor(fromZ)}`;
        const value = JSON.stringify({ dimensionId: toDim, x: toX, y: toY, z: toZ });
        world.setDynamicProperty(key, value);
    }
}

// Queue for tasks that need to run after a dimension change (once chunks load)
const pendingPortalTasks = [];

export class DimensionSystem {
    /**
     * Determines if an entity is currently within the Gaia Dimension boundaries.
     */
    static isInGaia(entity) {
        if (!entity || !entity.isValid || !GaiaDimension) {
            return false;
        }
        if (entity.dimension.id !== GaiaDimension.inheritance.id) {
            return false;
        }
        const result = GaiaDimension.isInDimension(entity.location);
        return result;
    }

    /**
     * Gets the biome name for a specific entity based on bedrock at y=0 or y=-64.
     */
    static getBiome(entity) {
        if (!entity || !entity.isValid) return "crystal_plains";
        try {
            const { x, z } = entity.location;
            const px = Math.floor(x);
            const pz = Math.floor(z);
            
            // Primary check: Y=0 (where Gaia generation places biome bedrock)
            let block = entity.dimension.getBlock({ x: px, y: 0, z: pz });
            
            // Fallback check: Y=-64 (Overworld actual bedrock floor)
            if (!block || !block.isValid || !BIOME_MAPPING.has(block.typeId)) {
                block = entity.dimension.getBlock({ x: px, y: -64, z: pz });
            }

            if (block && block.isValid && BIOME_MAPPING.has(block.typeId)) {
                return BIOME_MAPPING.get(block.typeId);
            }
        } catch (e) {}
        return "crystal_plains"; // Default
    }

    /**
     * Optimized scan for a portal block near a location.
     */
    static findPortalBlock(dimension, center) {
        const px = Math.floor(center.x);
        const py = Math.floor(center.y);
        const pz = Math.floor(center.z);
        
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = -16; dy <= 16; dy++) {
                    const y = py + dy;
                    if (y < dimension.heightRange.min || y > dimension.heightRange.max) continue;
                    try {
                        const b = dimension.getBlock({ x: px + dx, y: y, z: pz + dz });
                        if (b && b.typeId === "gaiadimension:gaia_dimension_portal") {
                            return { x: px + dx, y: y, z: pz + dz };
                        }
                    } catch(e) {}
                }
            }
        }
        return null;
    }

    /**
     * Scans downwards from a starting height to find the ground.
     */
    static getTopBlock(dimension, x, z, startY = 319) {
        for (let y = startY; y > dimension.heightRange.min; y--) {
            try {
                const block = dimension.getBlock({ x: x, y: y, z: z });
                if (block && !block.isAir && !block.typeId.includes("liquid") && block.typeId !== "gaiadimension:gaia_dimension_portal") {
                    return y + 1;
                }
            } catch(e) {}
        }
        return 100;
    }

    static handleTeleport(player, sourceDim, targetDimId, isToGaia) {
        if (!player.isValid) return;
        
        const inGaiaCurrently = this.isInGaia(player);
        if (sourceDim.id === targetDimId && inGaiaCurrently === isToGaia) {
            return;
        }

        player.setDynamicProperty("gaiadimension:last_teleport", system.currentTick);

        const sourceLoc = player.location;
        const sourcePortalLoc = this.findPortalBlock(sourceDim, sourceLoc) || sourceLoc; 

        const savedLink = PortalLinker.getLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z);
        if (savedLink) {
            try {
                const targetDim = world.getDimension(savedLink.dimensionId);
                player.teleport(
                    { x: savedLink.x + 1, y: savedLink.y + 1, z: savedLink.z },
                    { dimension: targetDim }
                );
                
                pendingPortalTasks.push({
                    playerId: player.id,
                    targetDimId: savedLink.dimensionId,
                    targetX: savedLink.x,
                    targetY: savedLink.y,
                    targetZ: savedLink.z,
                    type: "VERIFY_LINK",
                    sourcePortalLoc: { x: sourcePortalLoc.x, y: sourcePortalLoc.y, z: sourcePortalLoc.z },
                    sourceDimId: sourceDim.id,
                    createdAt: system.currentTick
                });
                return;
            } catch (e) {}
        }

        const center = GaiaDimension.getCenter();
        let targetX, targetZ;
        if (isToGaia) {
            let rawX = (sourceLoc.x / 4) + center.x;
            let rawZ = (sourceLoc.z / 4) + center.z;
            targetX = Math.max(RANGE_START, Math.min(RANGE_END, rawX));
            targetZ = Math.max(RANGE_START, Math.min(RANGE_END, rawZ));
        } else {
            targetX = (sourceLoc.x - center.x) * 4;
            targetZ = (sourceLoc.z - center.z) * 4;
        }

        const targetDim = world.getDimension(targetDimId);
        player.addEffect("resistance", 400, { amplifier: 255, showParticles: false });
        player.addEffect("slow_falling", 400, { amplifier: 0, showParticles: false });

        player.teleport(
            { x: targetX + 1, y: 120, z: targetZ },
            { dimension: targetDim }
        );
        player.addTag("gaiadimension:teleport_cooldown");
        if (isToGaia) player.addTag("gaiadimension:in_gaia");
        else player.removeTag("gaiadimension:in_gaia");

        pendingPortalTasks.push({
            playerId: player.id,
            targetDimId: targetDimId,
            targetX: targetX,
            targetZ: targetZ,
            type: "BUILD_NEW",
            sourcePortalLoc: { x: sourcePortalLoc.x, y: sourcePortalLoc.y, z: sourcePortalLoc.z },
            sourceDimId: sourceDim.id,
            rotationY: player.getRotation().y,
            createdAt: system.currentTick
        });
    }

    static teleportToGaia(player) {
        this.handleTeleport(player, player.dimension, GaiaDimension.inheritance.id, true);
    }

    static returnFromGaia(player) {
        this.handleTeleport(player, player.dimension, "minecraft:overworld", false);
    }
}

system.runInterval(() => {
    if (pendingPortalTasks.length === 0) return;

    for (let i = pendingPortalTasks.length - 1; i >= 0; i--) {
        const task = pendingPortalTasks[i];
        if (system.currentTick - task.createdAt < 20) continue;

        const player = world.getEntity(task.playerId);
        if (!player || !player.isValid) {
            pendingPortalTasks.splice(i, 1);
            continue;
        }

        const targetDim = world.getDimension(task.targetDimId);
        if (!targetDim) continue;
        
        try {
            const b = targetDim.getBlock({ x: Math.floor(task.targetX), y: 100, z: Math.floor(task.targetZ) });
            if (!b) continue;
        } catch (e) { continue; }

        if (task.type === "VERIFY_LINK") {
            const lpx = Math.floor(task.targetX);
            const lpy = Math.floor(task.targetY);
            const lpz = Math.floor(task.targetZ);
            
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    try {
                        const b = targetDim.getBlock({ x: lpx + x, y: lpy - 1, z: lpz + z });
                        if (b && (b.isAir || b.isLiquid)) b.setType("minecraft:obsidian");
                    } catch(e) {}
                }
            }
            pendingPortalTasks.splice(i, 1);
        } 
        else if (task.type === "BUILD_NEW") {
            let targetY = DimensionSystem.getTopBlock(targetDim, Math.floor(task.targetX), Math.floor(task.targetZ), 319);
            if (targetY >= 318) targetY = 100;

            const landingPortal = DimensionSystem.findPortalBlock(targetDim, { x: task.targetX, y: targetY, z: task.targetZ });
            
            if (landingPortal) {
                PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z);
                PortalLinker.setLink(task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
                player.teleport({ x: landingPortal.x + 1, y: landingPortal.y + 1, z: landingPortal.z }, { dimension: targetDim });
            } else {
                const px = Math.floor(task.targetX);
                const py = Math.floor(targetY);
                const pz = Math.floor(task.targetZ);

                for (let x = -3; x <= 3; x++) {
                    for (let z = -3; z <= 3; z++) {
                        for (let y = 0; y <= 6; y++) {
                            try {
                                const b = targetDim.getBlock({ x: px + x, y: py + y, z: pz + z });
                                if (b) b.setType("minecraft:air");
                            } catch(e) {}
                        }
                    }
                }

                for (let x = -2; x <= 2; x++) {
                    for (let z = -2; z <= 2; z++) {
                        try {
                            const b = targetDim.getBlock({ x: px + x, y: py - 1, z: pz + z });
                            if (b) b.setType("minecraft:obsidian");
                        } catch(e) {}
                    }
                }

                const absRot = Math.abs(task.rotationY % 360);
                let axis = ((absRot >= 45 && absRot <= 135) || (absRot >= 225 && absRot <= 315)) ? "x" : "z";
                const frameBlock = "gaiadimension:keystone_block"; 
                const portalBlockId = "gaiadimension:gaia_dimension_portal";
                let portalPerm = BlockPermutation.resolve(portalBlockId, { "gaiadimension:perm_dim": 0, "minecraft:cardinal_direction": axis === "x" ? "north" : "east" });

                const build = (dx, dy, dz, type, perm) => {
                    const block = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
                    if (block) { block.setType(type); if (perm) block.setPermutation(perm); }
                };

                if (axis === "x") {
                    for (let i = -1; i <= 2; i++) { build(0, 0, i, frameBlock); build(0, 4, i, frameBlock); }
                    for (let y = 1; y <= 3; y++) { build(0, y, -1, frameBlock); build(0, y, 2, frameBlock); }
                    for (let i = 0; i <= 1; i++) for (let y = 1; y <= 3; y++) build(0, y, i, portalBlockId, portalPerm);
                } else {
                    for (let i = -1; i <= 2; i++) { build(i, 0, 0, frameBlock); build(i, 4, 0, frameBlock); }
                    for (let y = 1; y <= 3; y++) { build(-1, y, 0, frameBlock); build(2, y, 0, frameBlock); }
                    for (let i = 0; i <= 1; i++) for (let y = 1; y <= 3; y++) build(i, y, 0, portalBlockId, portalPerm);
                }

                PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, px, py, pz);
                PortalLinker.setLink(targetDimId, px, py, pz, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
                player.teleport({ x: px + 1, y: py + 1, z: pz }, { dimension: targetDim });
            }
            pendingPortalTasks.splice(i, 1);
        }
    }
}, 20);

system.run(() => {
    try {
        GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
            range: { start: { x: RANGE_START, z: RANGE_START }, end: { x: RANGE_END, z: RANGE_END } },
            inheritance: "minecraft:overworld"
        });
    } catch (e) {}
});

system.runInterval(() => {
    const players = world.getPlayers();
    let anyPlayerInGaia = false;

    for (const player of players) {
        if (!player.isValid) continue;
        
        const inGaia = DimensionSystem.isInGaia(player);
        if (inGaia) anyPlayerInGaia = true;

        const lastTeleport = player.getDynamicProperty("gaiadimension:last_teleport") || 0;
        const timeDiff = system.currentTick - lastTeleport;

        if (timeDiff > 300 && player.hasTag("gaiadimension:teleport_cooldown")) {
            player.removeTag("gaiadimension:teleport_cooldown");
        }
        
        if (timeDiff < 100) continue;
        if (player.hasTag("gaiadimension:teleport_cooldown")) continue;
        
        if (player.hasTag("gaiadimension:in_gaia") && player.dimension.id === "minecraft:overworld") {
            if (!inGaia) {
                const center = GaiaDimension.getCenter();
                player.teleport({ x: center.x, y: 100, z: center.z }, { dimension: player.dimension });
                continue; 
            }
        }

        const dimension = player.dimension;
        const loc = player.location;
        const px = Math.floor(loc.x);
        const py = Math.floor(loc.y);
        const pz = Math.floor(loc.z);
        
        let inPortal = false;
        const b1 = dimension.getBlock({ x: px, y: py, z: pz });
        const b2 = dimension.getBlock({ x: px, y: py + 1, z: pz });
        if (b1?.typeId === "gaiadimension:gaia_dimension_portal" || b2?.typeId === "gaiadimension:gaia_dimension_portal") {
            inPortal = true;
        }
        
        if (inPortal) {
            if (inGaia) {
                DimensionSystem.returnFromGaia(player);
            } else if (dimension.id === "minecraft:overworld") {
                DimensionSystem.teleportToGaia(player);
            }
        }
    }

    if (anyPlayerInGaia) {
        world.getDimension("minecraft:overworld").runCommand("alwaysday");
    }
}, 10);

world.afterEvents.entitySpawn.subscribe((event) => {
    const { entity } = event;
    if (!entity || !entity.isValid) return;
    if (entity.typeId === "minecraft:enderman" && DimensionSystem.isInGaia(entity)) {
        if (Math.random() < 0.95) system.run(() => { if (entity.isValid) entity.remove(); });
    }
});
