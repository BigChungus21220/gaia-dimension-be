import { world, system, BlockPermutation } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";
import { PortalManager } from "../API/lib/PortalLib.js";

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
 * using dynamic properties on the world object.
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

export class DimensionSystem {
    /**
     * Determines if an entity is currently within the Gaia Dimension boundaries.
     */
    static isInGaia(entity) {
        if (!entity || !entity.isValid || !GaiaDimension) return false;
        if (entity.dimension.id !== GaiaDimension.inheritance.id) return false;
        return GaiaDimension.isInDimension(entity.location);
    }

    /**
     * Scans a column and nearby blocks for an existing portal structure to allow for linking.
     */
    static findPortalBlock(dimension, center) {
        const px = Math.floor(center.x);
        const pz = Math.floor(center.z);
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                for (let y = 0; y < 256; y++) {
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
     * Scans downwards from the sky to find the highest solid block.
     */
    static getTopBlock(dimension, x, z) {
        for (let y = 255; y > -64; y--) {
            try {
                const block = dimension.getBlock({ x, y, z });
                if (block && !block.isAir && !block.typeId.includes("liquid") && block.typeId !== "gaiadimension:gaia_dimension_portal") {
                    return y + 1;
                }
            } catch(e) {}
        }
        return 100;
    }

    /**
     * Core teleportation logic handling coordinate mapping, linking, and safety.
     */
    static handleTeleport(player, sourceDim, targetDimId, isToGaia) {
        if (!player.isValid) return;

        // Apply a timestamped cooldown to prevent immediate re-teleportation (janking)
        player.setDynamicProperty("gaiadimension:last_teleport", system.currentTick);

        const sourceLoc = player.location;
        const sourcePortalLoc = this.findPortalBlock(sourceDim, sourceLoc) || sourceLoc; 

        // 1. Check if this portal already has a persistent link saved
        const savedLink = PortalLinker.getLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z);
        if (savedLink) {
            try {
                const targetDim = world.getDimension(savedLink.dimensionId);
                const verifyPortal = this.findPortalBlock(targetDim, {x: savedLink.x, y: savedLink.y, z: savedLink.z});
                
                if (verifyPortal) {
                    // Rebuild safety platform at destination if it was destroyed
                    const lpx = Math.floor(verifyPortal.x);
                    const lpy = Math.floor(verifyPortal.y);
                    const lpz = Math.floor(verifyPortal.z);
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

                    player.teleport(
                        { x: verifyPortal.x + 1, y: verifyPortal.y + 1, z: verifyPortal.z },
                        { dimension: targetDim }
                    );
                    return;
                }
            } catch (e) {}
        }

        // 2. Calculate New Destination using 1:4 mapping and boundary clamping
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
        let targetY = this.getTopBlock(targetDim, Math.floor(targetX), Math.floor(targetZ));

        // 3. Teleport First to load the chunks at destination
        player.teleport(
            { x: targetX + 1, y: targetY + 1, z: targetZ },
            { dimension: targetDim }
        );
        player.addTag("gaiadimension:teleport_cooldown");

        // 4. Post-Teleport: Scan for existing portals near landing or build a new one
        system.runTimeout(() => {
            if (!player.isValid) return;

            const landingPortal = this.findPortalBlock(targetDim, { x: targetX, y: targetY, z: targetZ });
            
            if (landingPortal) {
                // Link the portals persistently
                PortalLinker.setLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z, targetDimId, landingPortal.x, landingPortal.y, landingPortal.z);
                PortalLinker.setLink(targetDimId, landingPortal.x, landingPortal.y, landingPortal.z, sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z);
                
                player.teleport(
                    { x: landingPortal.x + 1, y: landingPortal.y + 1, z: landingPortal.z },
                    { dimension: targetDim }
                );
                return;
            }

            // Determine Portal Orientation based on player facing
            const rotation = player.getRotation().y;
            const absRot = Math.abs(rotation % 360);
            let axis = "z"; 
            if ((absRot >= 45 && absRot <= 135) || (absRot >= 225 && absRot <= 315)) {
                axis = "x"; 
            }

            const px = Math.floor(targetX);
            const py = Math.floor(targetY);
            const pz = Math.floor(targetZ);

            // Generate Safety Platform (Obsidian)
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    try {
                        const b = targetDim.getBlock({ x: px + x, y: py - 1, z: pz + z });
                        if (b) b.setType("minecraft:obsidian"); 
                    } catch(e) {}
                }
            }

            // Construct Portal Frame and fill with Portal Blocks
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

            // Build Frame logic (centered 4x5)
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

            // Save the newly created link
            PortalLinker.setLink(sourceDim.id, sourcePortalLoc.x, sourcePortalLoc.y, sourcePortalLoc.z, targetDimId, px, py, pz);
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

// Initialization Logic
system.run(() => {
    try {
        GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
            range: {
                start: { x: RANGE_START, z: RANGE_START },
                end: { x: RANGE_END, z: RANGE_END }
            },
            inheritance: "minecraft:the_end"
        });
    } catch (e) {}
});

// Periodic loop to detect players standing inside portals
system.runInterval(() => {
    try {
        const players = world.getPlayers();
        for (const player of players) {
            if (!player.isValid) continue;
            
            // Check fixed 5s cooldown using current tick vs last teleport timestamp
            const lastTeleport = player.getDynamicProperty("gaiadimension:last_teleport") || 0;
            if (system.currentTick - lastTeleport < 100) continue;
            
            const dimension = player.dimension;
            const loc = player.location;
            const px = Math.floor(loc.x);
            const py = Math.floor(loc.y);
            const pz = Math.floor(loc.z);
            
            let inPortal = false;
            // Strict check: Player must be overlapping the portal block at legs or head
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
    } catch (e) {}
}, 10);
