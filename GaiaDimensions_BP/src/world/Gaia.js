import { world, system, BlockPermutation } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";
import { PortalManager } from "../API/lib/PortalLib.js";
import { BIOME_MAPPING } from "../config/biome_config.js";

/**
 * Gaia Dimension Configuration
 */
const GAIA_DIMENSION_ID = "gaia_dimension";
const RANGE_START = 100000;
const RANGE_END = 400000;

export let GaiaDimension;

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

const pendingPortalTasks = [];

export class DimensionSystem {
    static isInGaia(entity) {
        if (!entity || !entity.isValid || !GaiaDimension) return false;
        if (entity.dimension.id !== GaiaDimension.inheritance.id) return false;
        return GaiaDimension.isInDimension(entity.location);
    }

    static getBiome(entity) {
        if (!entity || !entity.isValid) return "crystal_plains";
        try {
            const { x, z } = entity.location;
            const px = Math.floor(x);
            const pz = Math.floor(z);
            let block = entity.dimension.getBlock({ x: px, y: 0, z: pz });
            if (!block || !block.isValid || !BIOME_MAPPING.has(block.typeId)) {
                block = entity.dimension.getBlock({ x: px, y: -64, z: pz });
            }
            if (block && block.isValid && BIOME_MAPPING.has(block.typeId)) {
                return BIOME_MAPPING.get(block.typeId);
            }
        } catch (e) {}
        return "crystal_plains";
    }

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
                        if (b && b.typeId === "gaiadimension:gaia_dimension_portal") return { x: px + dx, y: y, z: pz + dz };
                    } catch(e) {}
                }
            }
        }
        return null;
    }

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
        if (sourceDim.id === targetDimId && inGaiaCurrently === isToGaia) return;

        player.setDynamicProperty("gaiadimension:last_teleport", system.currentTick);
        player.addTag("gaiadimension:teleport_cooldown");
        if (isToGaia) player.addTag("gaiadimension:in_gaia");
        else player.removeTag("gaiadimension:in_gaia");

        const sourceLoc = player.location;
        const sourcePortalLoc = this.findPortalBlock(sourceDim, sourceLoc) || sourceLoc; 

        const center = GaiaDimension.getCenter();
        let targetX, targetZ;
        if (isToGaia) {
            targetX = Math.max(RANGE_START, Math.min(RANGE_END, (sourceLoc.x / 4) + center.x));
            targetZ = Math.max(RANGE_START, Math.min(RANGE_END, (sourceLoc.z / 4) + center.z));
        } else {
            targetX = (sourceLoc.x - center.x) * 4;
            targetZ = (sourceLoc.z - center.z) * 4;
        }

        // Add ticking area to force load
        const targetDim = world.getDimension(targetDimId);
        const areaName = `portal_${player.id}`;
        try {
            targetDim.runCommand(`tickingarea add circle ${Math.floor(targetX)} 100 ${Math.floor(targetZ)} 2 ${areaName}`);
        } catch(e) {}

        pendingPortalTasks.push({
            playerId: player.id,
            targetDimId: targetDimId,
            targetX: targetX,
            targetZ: targetZ,
            sourcePortalLoc: { x: sourcePortalLoc.x, y: sourcePortalLoc.y, z: sourcePortalLoc.z },
            sourceDimId: sourceDim.id,
            rotationY: player.getRotation().y,
            createdAt: system.currentTick,
            areaName: areaName,
            state: "WAITING"
        });

        // Give player effects to prevent movement/death during wait
        player.addEffect("blindness", 220, { amplifier: 0, showParticles: false });
        player.addEffect("slowness", 220, { amplifier: 255, showParticles: false });
        player.addEffect("resistance", 250, { amplifier: 255, showParticles: false });
    }

    static teleportToGaia(player) {
        this.handleTeleport(player, player.dimension, GaiaDimension.inheritance.id, true);
    }

    static returnFromGaia(player) {
        this.handleTeleport(player, player.dimension, "minecraft:overworld", false);
    }
}

// Sequential Task Processor
system.runInterval(() => {
    if (pendingPortalTasks.length === 0) return;

    for (let i = pendingPortalTasks.length - 1; i >= 0; i--) {
        const task = pendingPortalTasks[i];
        const player = world.getEntity(task.playerId);

        if (!player || !player.isValid) {
            try { world.getDimension(task.targetDimId).runCommand(`tickingarea remove ${task.areaName}`); } catch(e) {}
            pendingPortalTasks.splice(i, 1);
            continue;
        }

        const targetDim = world.getDimension(task.targetDimId);

        // State 1: Wait for chunks to load (200 ticks)
        if (task.state === "WAITING") {
            if (system.currentTick - task.createdAt < 200) continue;
            task.state = "PREPARING";
        }

        // State 2: Verify existing link or Prepare ground
        if (task.state === "PREPARING") {
            const savedLink = PortalLinker.getLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
            if (savedLink) {
                task.finalPos = { x: savedLink.x + 1, y: savedLink.y + 1, z: savedLink.z };
                task.state = "TELEPORTING";
            } else {
                let targetY = DimensionSystem.getTopBlock(targetDim, Math.floor(task.targetX), Math.floor(task.targetZ), 319);
                if (targetY >= 318) targetY = 100;
                task.targetY = targetY;

                const landingPortal = DimensionSystem.findPortalBlock(targetDim, { x: task.targetX, y: targetY, z: task.targetZ });
                if (landingPortal) {
                    PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z);
                    PortalLinker.setLink(task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
                    task.finalPos = { x: landingPortal.x + 1, y: landingPortal.y + 1, z: landingPortal.z };
                    task.state = "TELEPORTING";
                } else {
                    task.state = "BUILDING";
                }
            }
        }

        // State 3: Build new portal
        if (task.state === "BUILDING") {
            const px = Math.floor(task.targetX);
            const py = task.targetY;
            const pz = Math.floor(task.targetZ);

            // Carve Air and Build Platform
            for (let dx = -3; dx <= 3; dx++) {
                for (let dz = -3; dz <= 3; dz++) {
                    for (let dy = -1; dy <= 6; dy++) {
                        const b = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
                        if (b) {
                            if (dy === -1) b.setType("minecraft:obsidian");
                            else b.setType("minecraft:air");
                        }
                    }
                }
            }

            // Map direction and axis
            let rotation = task.rotationY;
            while (rotation < 0) rotation += 360;
            rotation = rotation % 360;
            let direction = "north", axis = "x";
            if (rotation >= 45 && rotation < 135) { direction = "east"; axis = "z"; }
            else if (rotation >= 135 && rotation < 225) { direction = "south"; axis = "x"; }
            else if (rotation >= 225 && rotation < 315) { direction = "west"; axis = "z"; }

            const frameBlock = "gaiadimension:keystone_block"; 
            const portalBlockId = "gaiadimension:gaia_dimension_portal";
            let portalPerm = BlockPermutation.resolve(portalBlockId, { "gaiadimension:perm_dim": 0, "minecraft:cardinal_direction": direction });

            const build = (dx, dy, dz, type, perm) => {
                const b = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
                if (b) { b.setType(type); if (perm) b.setPermutation(perm); }
            };

            if (axis === "x") {
                for (let i = -1; i <= 2; i++) { build(i, 0, 0, frameBlock); build(i, 4, 0, frameBlock); }
                for (let y = 1; y <= 3; y++) { build(-1, y, 0, frameBlock); build(2, y, 0, frameBlock); }
                for (let i = 0; i <= 1; i++) for (let y = 1; y <= 3; y++) build(i, y, 0, portalBlockId, portalPerm);
            } else {
                for (let i = -1; i <= 2; i++) { build(0, 0, i, frameBlock); build(0, 4, i, frameBlock); }
                for (let y = 1; y <= 3; y++) { build(0, y, -1, frameBlock); build(0, y, 2, frameBlock); }
                for (let i = 0; i <= 1; i++) for (let y = 1; y <= 3; y++) build(0, y, i, portalBlockId, portalPerm);
            }

            PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, px, py, pz);
            PortalLinker.setLink(task.targetDimId, px, py, pz, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
            task.finalPos = { x: px + 1, y: py + 1, z: pz };
            task.state = "TELEPORTING";
        }

        // State 4: Final Teleport and Cleanup
        if (task.state === "TELEPORTING") {
            player.teleport(task.finalPos, { dimension: targetDim });
            try { targetDim.runCommand(`tickingarea remove ${task.areaName}`); } catch(e) {}
            pendingPortalTasks.splice(i, 1);
        }
    }
}, 10);

system.run(() => {
    try {
        GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
            range: { start: { x: RANGE_START, z: RANGE_START }, end: { x: RANGE_END, z: RANGE_END } },
            inheritance: "minecraft:overworld"
        });
    } catch (e) {}
});

let isAlwaysDayActive = false;
system.runInterval(() => {
    const players = world.getAllPlayers();
    let anyPlayerInGaia = false;
    for (const player of players) {
        if (!player.isValid) continue;
        const inGaia = DimensionSystem.isInGaia(player);
        if (inGaia) anyPlayerInGaia = true;

        const lastTeleport = player.getDynamicProperty("gaiadimension:last_teleport") || 0;
        const timeDiff = system.currentTick - lastTeleport;
        if (timeDiff > 300 && player.hasTag("gaiadimension:teleport_cooldown")) player.removeTag("gaiadimension:teleport_cooldown");
        
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
        const px = Math.floor(loc.x), py = Math.floor(loc.y), pz = Math.floor(loc.z);
        
        let inPortal = false;
        const b1 = dimension.getBlock({ x: px, y: py, z: pz });
        const b2 = dimension.getBlock({ x: px, y: py + 1, z: pz });
        if (b1?.typeId === "gaiadimension:gaia_dimension_portal" || b2?.typeId === "gaiadimension:gaia_dimension_portal") inPortal = true;
        
        if (inPortal) {
            if (inGaia) DimensionSystem.returnFromGaia(player);
            else if (dimension.id === "minecraft:overworld") DimensionSystem.teleportToGaia(player);
        }
    }

    if (anyPlayerInGaia && !isAlwaysDayActive) {
        world.getDimension("minecraft:overworld").runCommand("alwaysday");
        isAlwaysDayActive = true;
    } else if (!anyPlayerInGaia && isAlwaysDayActive) {
        world.getDimension("minecraft:overworld").runCommand("alwaysday");
        isAlwaysDayActive = false;
    }
}, 10);

world.afterEvents.entitySpawn.subscribe((event) => {
    const { entity } = event;
    if (!entity || !entity.isValid) return;
    if (entity.typeId === "minecraft:enderman" && DimensionSystem.isInGaia(entity)) {
        if (Math.random() < 0.95) system.run(() => { if (entity.isValid) entity.remove(); });
    }
});

world.afterEvents.gameRuleChange.subscribe(({rule, value}) => {
    if (rule == "showCoordinates" && value == false) {
        world.getAllPlayers().forEach(player => player.onScreenDisplay.setActionBar(`§.`));
    }
});
