import { world, system, BlockPermutation } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";
import { PortalManager } from "../API/lib/PortalLib.js";

// Configuration
const GAIA_DIMENSION_ID = "gaia_dimension";
const RANGE_START = 100000;
const RANGE_END = 400000;

export const GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
    range: {
        start: { x: RANGE_START, z: RANGE_START },
        end: { x: RANGE_END, z: RANGE_END }
    },
    inheritance: "minecraft:the_end"
});

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

export class DimensionSystem {
    static isInGaia(entity) {
        if (!entity || !entity.isValid || !GaiaDimension) return false;
        if (entity.dimension.id !== GaiaDimension.inheritance.id) return false;
        return GaiaDimension.isInDimension(entity.location);
    }

    static findPortalBlock(dimension, center) {
        const px = Math.floor(center.x);
        const py = Math.floor(center.y);
        const pz = Math.floor(center.z);
        // Check 3x3x3 for portal block to identify exact portal location
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const b = dimension.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
                    if (b && b.typeId === "gaiadimension:gaia_dimension_portal") {
                        return { x: px + dx, y: py + dy, z: pz + dz };
                    }
                }
            }
        }
        return null;
    }

    static handleTeleport(player, sourceDim, targetDimId, isToGaia) {
        if (!player.isValid) return;

        // Set Cooldown Timestamp
        player.setDynamicProperty("gaiadimension:last_teleport", system.currentTick);

        const sourceLoc = player.location;
        const sourcePortalLoc = this.findPortalBlock(sourceDim, sourceLoc) || sourceLoc; 

        // 1. Check Persistent Link
        const savedLink = PortalLinker.getLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z);
        if (savedLink) {
            try {
                const targetDim = world.getDimension(savedLink.dimensionId);
                
                // Safety Check & Rebuild for Linked Portal
                const lpx = Math.floor(savedLink.x);
                const lpy = Math.floor(savedLink.y);
                const lpz = Math.floor(savedLink.z);
                
                // Rebuild platform if missing
                for (let x = -2; x <= 2; x++) {
                    for (let z = -2; z <= 2; z++) {
                        try {
                            const b = targetDim.getBlock({ x: lpx + x, y: lpy - 2, z: lpz + z });
                            if (b && (b.typeId === "minecraft:air" || b.typeId === "minecraft:void_air")) {
                                b.setType("minecraft:obsidian");
                            }
                        } catch(e) {}
                    }
                }

                player.teleport(
                    { x: savedLink.x, y: savedLink.y, z: savedLink.z },
                    { dimension: targetDim }
                );
                return;
            } catch (e) {}
        }

        // 2. Calculate New Destination
        const center = GaiaDimension.getCenter();
        let targetX, targetY = 100, targetZ;

        if (isToGaia) {
            targetX = (sourceLoc.x / 4) + center.x;
            targetZ = (sourceLoc.z / 4) + center.z;
        } else {
            targetX = (sourceLoc.x - center.x) * 4;
            targetZ = (sourceLoc.z - center.z) * 4;
        }

        const targetDim = world.getDimension(targetDimId);

        // 3. Teleport First
        player.teleport(
            { x: targetX, y: targetY + 1, z: targetZ },
            { dimension: targetDim }
        );

        // 4. Post-Teleport: Verify/Build & Link
        system.runTimeout(() => {
            if (!player.isValid) return;

            const landingPortal = this.findPortalBlock(targetDim, { x: targetX, y: targetY, z: targetZ });
            
            if (landingPortal) {
                // Rebuild platform for existing portal found by scan
                const lpx = Math.floor(landingPortal.x);
                const lpy = Math.floor(landingPortal.y);
                const lpz = Math.floor(landingPortal.z);
                for (let x = -2; x <= 2; x++) {
                    for (let z = -2; z <= 2; z++) {
                        try {
                            const b = targetDim.getBlock({ x: lpx + x, y: lpy - 1, z: lpz + z });
                            if (b && (b.typeId === "minecraft:air" || b.typeId === "minecraft:void_air")) {
                                b.setType("minecraft:obsidian");
                            }
                        } catch(e) {}
                    }
                }

                PortalLinker.setLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z, targetDimId, landingPortal.x, landingPortal.y + 1, landingPortal.z);
                PortalLinker.setLink(targetDimId, landingPortal.x, landingPortal.y, landingPortal.z, sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y + 1, sourcePortalLoc.z);
                
                player.teleport(
                    { x: landingPortal.x, y: landingPortal.y + 1, z: landingPortal.z },
                    { dimension: targetDim }
                );
                return;
            }

            // Build New Portal
            const rotation = player.getRotation().y;
            const absRot = Math.abs(rotation % 360);
            let axis = "z"; 
            if ((absRot >= 45 && absRot <= 135) || (absRot >= 225 && absRot <= 315)) {
                axis = "x"; 
            }

            const px = Math.floor(targetX);
            const py = Math.floor(targetY);
            const pz = Math.floor(targetZ);

            // Safety Platform (Obsidian)
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    try {
                        const b = targetDim.getBlock({ x: px + x, y: py - 1, z: pz + z });
                        if (b) b.setType("minecraft:obsidian"); 
                    } catch(e) {}
                }
            }

            // Build Frame & Portal
            const frameBlock = "gaiadimension:keystone_block"; 
            const portalBlockId = "gaiadimension:gaia_dimension_portal";
            
            let portalPerm;
            if (axis === "x") {
                portalPerm = BlockPermutation.resolve(portalBlockId, { "minecraft:cardinal_direction": "north" });
            } else {
                portalPerm = BlockPermutation.resolve(portalBlockId, { "minecraft:cardinal_direction": "east" });
            }

            const buildBlock = (dx, dy, dz, type, perm) => {
                try {
                    const block = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
                    if (block) {
                        block.setType(type);
                        if (perm) block.setPermutation(perm);
                    }
                } catch (e) {}
            };

            if (axis === "x") {
                for (let i = -1; i <= 2; i++) buildBlock(i, 0, 0, frameBlock);
                for (let i = -1; i <= 2; i++) buildBlock(i, 4, 0, frameBlock);
                for (let y = 1; y <= 3; y++) { buildBlock(-1, y, 0, frameBlock); buildBlock(2, y, 0, frameBlock); }
                for (let i = 0; i <= 1; i++) {
                    for (let y = 1; y <= 3; y++) {
                        buildBlock(i, y, 0, portalBlockId, portalPerm);
                    }
                }
            } else {
                for (let i = -1; i <= 2; i++) buildBlock(0, 0, i, frameBlock);
                for (let i = -1; i <= 2; i++) buildBlock(0, 4, i, frameBlock);
                for (let y = 1; y <= 3; y++) { buildBlock(0, y, -1, frameBlock); buildBlock(0, y, 2, frameBlock); }
                for (let i = 0; i <= 1; i++) {
                    for (let y = 1; y <= 3; y++) {
                        buildBlock(0, y, i, portalBlockId, portalPerm);
                    }
                }
            }

            // Save Link
            PortalLinker.setLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z, targetDimId, px, py + 1, pz);
            PortalLinker.setLink(targetDimId, px, py, pz, sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z); 

        }, 40); 
    }

    static teleportToGaia(player) {
        this.handleTeleport(player, player.dimension, GaiaDimension.inheritance.id, true);
    }

    static returnFromGaia(player) {
        this.handleTeleport(player, player.dimension, "minecraft:overworld", false);
    }
}

// Portal Logic
system.run(() => {
    world.sendMessage("Gaia Dimension System Loaded v9 - Faster Cooldown");
    
    system.runInterval(() => {
        const players = world.getPlayers();
        for (const player of players) {
            if (!player.isValid) continue;
            
            // Reduced 5s Cooldown check
            const lastTeleport = player.getDynamicProperty("gaiadimension:last_teleport") || 0;
            if (system.currentTick - lastTeleport < 100) continue;
            
            const dimension = player.dimension;
            const loc = player.location;
            const px = Math.floor(loc.x);
            const py = Math.floor(loc.y);
            const pz = Math.floor(loc.z);
            
            let inPortal = false;
            if (dimension.getBlock({ x: px, y: py, z: pz })?.typeId === "gaiadimension:gaia_dimension_portal" || 
                dimension.getBlock({ x: px, y: py + 1, z: pz })?.typeId === "gaiadimension:gaia_dimension_portal") {
                inPortal = true;
            }
            
            if (inPortal) {
                if (dimension.id === "minecraft:overworld") {
                    DimensionSystem.teleportToGaia(player);
                } else if (dimension.id === "minecraft:the_end") {
                    DimensionSystem.returnFromGaia(player);
                }
            }
        }
    }, 10);
});