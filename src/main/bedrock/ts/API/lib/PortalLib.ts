import { world, system, BlockPermutation, BlockVolume } from "@minecraft/server";

/**
 * Portal Definition Library
 * Allows easy creation of Nether-portal-like structures.
 */
export class PortalManager {
    static registeredPortals = new Map();

    static register(portalBlockId, frameBlockId, options = {}) {
        this.registeredPortals.set(portalBlockId, {
            frameId: frameBlockId,
            ...options
        });
    }

    static tryIgnite(originBlock) {
        if (!originBlock || !originBlock.dimension) {
            return false;
        }
        // console.warn(`[PortalLib] tryIgnite triggered at ${originBlock.location.x}, ${originBlock.location.y}, ${originBlock.location.z} in ${originBlock.dimension.id}`);
        
        for (const [portalId, config] of this.registeredPortals) {
            if (this.attemptPortalCreation(originBlock, portalId, config.frameId)) {
                return true;
            }
        }
        // console.warn(`[PortalLib] tryIgnite failed.`);
        return false;
    }

    static attemptPortalCreation(originBlock, portalId, frameId) {
        const shapeX = this.detectPortalShape(originBlock, frameId, 'x');
        if (shapeX) {
            this.fillPortal(shapeX, portalId, 'x');
            return true;
        }

        const shapeZ = this.detectPortalShape(originBlock, frameId, 'z');
        if (shapeZ) {
            this.fillPortal(shapeZ, portalId, 'z');
            return true;
        }

        return false;
    }

    static detectPortalShape(startBlock, frameId, axis) {
        // console.warn(`[PortalLib] Checking shape axis: ${axis}`);
        const dim = startBlock.dimension;
        if (!dim) return null;

        const { x, y, z } = startBlock.location;
        const MAX_SIZE = 21;
        const MIN_SIZE = 2;
        const fillerId = startBlock.typeId;

        const dx = axis === 'x' ? 1 : 0;
        const dz = axis === 'z' ? 1 : 0;
        
        const minYLimit = dim.heightRange ? dim.heightRange.min : -64;
        const maxYLimit = dim.heightRange ? dim.heightRange.max : 320;

        let bottomY = y;
        while (true) {
            const checkY = bottomY - 1;
            if (bottomY - y < -MAX_SIZE) return null;
            if (checkY < minYLimit) return null; // Hit world bottom
            
            let block;
            try { block = dim.getBlock({ x, y: checkY, z }); } catch(e) { return null; }
            if (!block) return null;

            if (this.isEmptyBlock(dim, block.location) || block.typeId === fillerId) {
                bottomY = checkY;
            } else if (block.typeId === frameId) {
                break;
            } else {
                // console.warn(`[PortalLib] Bottom search failed at y=${checkY}. Found: ${block.typeId}`);
                return null;
            }
        }

        let topY = bottomY;
        while (true) {
            if (topY - bottomY >= MAX_SIZE) return null;
            if (topY + 1 > maxYLimit) return null; // Hit world top

            let block;
            try { block = dim.getBlock({ x, y: topY + 1, z }); } catch(e) { return null; }
            if (!block) return null;

            if (this.isEmptyBlock(dim, block.location) || block.typeId === fillerId) {
                topY++;
            } else if (block.typeId === frameId) {
                break;
            } else {
                // console.warn(`[PortalLib] Top search failed at y=${topY+1}. Found: ${block.typeId}`);
                return null;
            }
        }

        const height = topY - bottomY + 1;
        if (height < MIN_SIZE) {
            return null;
        }

        let minSide = 0;
        let maxSide = 0;

        for (let i = 1; i <= MAX_SIZE; i++) {
            const cx = x - (dx * i);
            const cz = z - (dz * i);
            if (!this.checkColumn(dim, cx, cz, bottomY, topY, frameId, fillerId)) {
                if (this.checkFrameColumn(dim, cx, cz, bottomY, topY, frameId)) {
                    minSide = -i;
                    break;
                } else {
                    return null;
                }
            }
        }

        for (let i = 1; i <= MAX_SIZE; i++) {
            const cx = x + (dx * i);
            const cz = z + (dz * i);
            if (!this.checkColumn(dim, cx, cz, bottomY, topY, frameId, fillerId)) {
                if (this.checkFrameColumn(dim, cx, cz, bottomY, topY, frameId)) {
                    maxSide = i;
                    break;
                } else {
                    return null;
                }
            }
        }

        if (minSide === 0 || maxSide === 0) return null;

        const width = maxSide - minSide - 1;
        if (width < MIN_SIZE) return null;

        for (let i = minSide; i <= maxSide; i++) {
            const cx = x + (dx * i);
            const cz = z + (dz * i);
            
            const floorBlock = dim.getBlock({ x: cx, y: bottomY - 1, z: cz });
            const ceilBlock = dim.getBlock({ x: cx, y: topY + 1, z: cz });

            if (!floorBlock || floorBlock.typeId !== frameId) return null;
            if (!ceilBlock || ceilBlock.typeId !== frameId) return null;
        }

        return {
            dimension: dim,
            bounds: {
                minX: x + (dx * minSide) + (axis === 'x' ? 1 : 0),
                maxX: x + (dx * maxSide) - (axis === 'x' ? 1 : 0),
                minZ: z + (dz * minSide) + (axis === 'z' ? 1 : 0),
                maxZ: z + (dz * maxSide) - (axis === 'z' ? 1 : 0),
                minY: bottomY,
                maxY: topY
            }
        };
    }

    static checkColumn(dim, x, z, minY, maxY, frameId, fillerId) {
        for (let y = minY; y <= maxY; y++) {
            let block;
            try { block = dim.getBlock({ x, y, z }); } catch(e) { return false; }
            if (!block || (!this.isEmptyBlock(dim, block.location) && block.typeId !== fillerId)) return false;
        }
        return true;
    }

    static checkFrameColumn(dim, x, z, minY, maxY, frameId) {
        for (let y = minY; y <= maxY; y++) {
            let block;
            try { block = dim.getBlock({ x, y, z }); } catch(e) { return false; }
            if (!block || block.typeId !== frameId) return false;
        }
        return true;
    }

    static fillPortal(shape, portalId, axis) {
        const { dimension, bounds } = shape;
        const { minX, maxX, minZ, maxZ, minY, maxY } = bounds;

        let blockPerm = null;
        try {
            const perm = BlockPermutation.resolve(portalId);
            try {
                 // Axis X -> Portal runs East-West -> Face North/South (flat on Z)
                 // Axis Z -> Portal runs North-South -> Face East/West (flat on X)
                 const dir = axis === 'x' ? 'north' : 'east';
                 blockPerm = perm.withState("minecraft:cardinal_direction" as any, dir);
            } catch (e2) {
                 blockPerm = perm;
            }
        } catch (e) {
            // Failed to resolve permutation, will fallback to setType loop
        }

        let filled = false;
        if (blockPerm) {
            try {
                // Try to use fillBlocks for efficiency and forcefulness
                const volume = new BlockVolume(
                    { x: minX, y: minY, z: minZ },
                    { x: maxX, y: maxY, z: maxZ }
                );
                
                dimension.fillBlocks(volume, blockPerm, { matchingBlock: undefined });
                filled = true;
            } catch (e) {
                // fillBlocks failed
            }
        }

        if (!filled) {
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    for (let y = minY; y <= maxY; y++) {
                        const block = dimension.getBlock({ x, y, z });
                        if (block) {
                            try {
                                if (blockPerm) {
                                    block.setPermutation(blockPerm);
                                } else {
                                    block.setType(portalId);
                                }
                            } catch (e) {
                                try {
                                    block.setType(portalId);
                                } catch (e2) {}
                            }
                        }
                    }
                }
            }
        }
        
        const center = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2
        };
        dimension.playSound("block.end_portal.spawn", center);
    }

    static getExistingPortal(pos, dimension, portalBlockId, range = 128) {
        // Limited scanning for Bedrock API constraints
        const startX = Math.floor(pos.x);
        const startZ = Math.floor(pos.z);
        const scanRange = 16; // Small scan range for performance

        for (let x = startX - scanRange; x <= startX + scanRange; x += 16) {
            for (let z = startZ - scanRange; z <= startZ + scanRange; z += 16) {
                // Check varied heights
                for (let y = dimension.heightRange.min; y < dimension.heightRange.max; y += 16) {
                    try {
                        const block = dimension.getBlock({ x, y, z });
                        if (block && block.typeId === portalBlockId) {
                            return block;
                        }
                    } catch (e) {}
                }
            }
        }
        return null;
    }

    /**
     * Port of GaiaTeleporter.makePortal logic
     */
    static makePortal(pos, dimension, axis, portalBlockId, frameBlockId) {
        const origin = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
        const worldBorder = 30000000; 
        const heightMax = dimension.heightRange.max;
        const heightMin = dimension.heightRange.min;
        
        // Direction vectors based on Axis
        // Axis 'x' -> Direction East/West. Axis 'z' -> Direction South/North.
        // For offsets: if Axis is X, we extend along X.
        const direction = axis === 'x' ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
        const crossDir = axis === 'x' ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 }; // Clockwise/Perpendicular

        let d0 = -1.0;
        let blockpos = null;
        let d1 = -1.0;
        let blockpos1 = null;

        // Spiral Search (Radius 16)
        // Generator for spiral coordinates
        const spiral = this.spiralAround(origin, 16);
        
        for (const mut of spiral) {
            // Bounds check
            if (!this.isWithinBounds(mut, worldBorder) || !this.isWithinBounds(this.offset(mut, direction), worldBorder)) continue;

            // Shift back (Java logic: mut.move(direction.getOpposite(), 1))
            const checkPos = this.offset(mut, { x: -direction.x, y: -direction.y, z: -direction.z });

            // Check vertical column
            for (let l = heightMax - 1; l >= heightMin; l--) {
                checkPos.y = l;
                
                if (this.canReplaceBlock(dimension, checkPos)) {
                    let i1 = l;
                    while (l > heightMin && this.canReplaceBlock(dimension, this.offset(checkPos, {x:0, y:-1, z:0}))) {
                        l--;
                    }
                    
                    if (l + 4 <= heightMax) {
                        let j1 = i1 - l;
                        if (j1 <= 0 || j1 >= 3) {
                            checkPos.y = l;
                            
                            // Check region
                            if (this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, 0)) {
                                const d2 = this.distSqr(origin, checkPos);
                                
                                if (this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, -1) && 
                                    this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, 1) && 
                                    (d0 === -1.0 || d0 > d2)) {
                                    d0 = d2;
                                    blockpos = { ...checkPos };
                                }

                                if (d0 === -1.0 && (d1 === -1.0 || d1 > d2)) {
                                    d1 = d2;
                                    blockpos1 = { ...checkPos };
                                }
                            }
                        }
                    }
                }
            }
        }

        if (d0 === -1.0 && d1 !== -1.0) {
            blockpos = blockpos1;
            d0 = d1;
        }

        // Forced Placement if no valid spot found
        if (d0 === -1.0) {
            blockpos = { 
                x: origin.x, 
                y: Math.max(heightMin + 70, Math.min(origin.y, heightMax - 10)), 
                z: origin.z 
            };
            
            // Force create platform logic
            // Clearing logic for forced placement
            for (let fOffset = -1; fOffset < 2; ++fOffset) {
                for (let fWidth = 0; fWidth < 2; ++fWidth) {
                    for (let fHeight = -1; fHeight < 3; ++fHeight) {
                        const isFloor = fHeight < 0;
                        const p = {
                            x: blockpos.x + (fWidth * direction.x) + (fOffset * crossDir.x),
                            y: blockpos.y + fHeight,
                            z: blockpos.z + (fWidth * direction.z) + (fOffset * crossDir.z)
                        };
                        const blk = dimension.getBlock(p);
                        if (blk) blk.setPermutation(BlockPermutation.resolve(isFloor ? frameBlockId : "minecraft:air"));
                    }
                }
            }
        }

        // Place Frame
        for (let fWidth = -1; fWidth < 3; ++fWidth) {
            for (let fHeight = -1; fHeight < 4; ++fHeight) {
                if (fWidth === -1 || fWidth === 2 || fHeight === -1 || fHeight === 3) {
                    const p = {
                        x: blockpos.x + (fWidth * direction.x),
                        y: blockpos.y + fHeight,
                        z: blockpos.z + (fWidth * direction.z)
                    };
                    const blk = dimension.getBlock(p);
                    if (blk) blk.setPermutation(BlockPermutation.resolve(frameBlockId));
                }
            }
        }

        // Place Portal
        const portalPerm = BlockPermutation.resolve(portalBlockId);
        let orientedPerm;
        try {
             orientedPerm = portalPerm.withState("axis" as any, axis);
        } catch {
             try {
                 orientedPerm = portalPerm.withState("minecraft:cardinal_direction" as any, axis === 'x' ? 'east' : 'south');
             } catch {
                 orientedPerm = portalPerm;
             }
        }

        for (let pWidth = 0; pWidth < 2; ++pWidth) {
            for (let pHeight = 0; pHeight < 3; ++pHeight) {
                const p = {
                    x: blockpos.x + (pWidth * direction.x),
                    y: blockpos.y + pHeight,
                    z: blockpos.z + (pWidth * direction.z)
                };
                const blk = dimension.getBlock(p);
                if (blk) blk.setPermutation(orientedPerm);
            }
        }

        return blockpos;
    }

    static breakPortal(dimension, startLoc, portalBlockId) {
        const queue = [startLoc];
        const visited = new Set();
        const key = (l) => `${l.x},${l.y},${l.z}`;
        visited.add(key(startLoc));
        
        const blocksToBreak = [];
        const MAX_BLOCKS = 600; 

        let head = 0;
        while(head < queue.length && blocksToBreak.length < MAX_BLOCKS) {
            const current = queue[head++];
            
            let block;
            try { block = dimension.getBlock(current); } catch(e) { continue; }
            if (!block) continue;

            if (block.typeId === portalBlockId) {
                blocksToBreak.push(block);
                
                const neighbors = [
                    {x: current.x + 1, y: current.y, z: current.z},
                    {x: current.x - 1, y: current.y, z: current.z},
                    {x: current.x, y: current.y + 1, z: current.z},
                    {x: current.x, y: current.y - 1, z: current.z},
                    {x: current.x, y: current.y, z: current.z + 1},
                    {x: current.x, y: current.y, z: current.z - 1}
                ];

                for (const n of neighbors) {
                    const k = key(n);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push(n);
                    }
                }
            }
        }

        if (blocksToBreak.length > 0) {
             dimension.playSound("break.amethyst_block", startLoc);
             for(const b of blocksToBreak) {
                 try {
                     b.setType("minecraft:air"); 
                 } catch(e) {}
             }
        }
    }

    // --- Helpers ---

    static checkRegionForPlacement(dimension, originalPos, direction, crossDir, offsetScale) {
        for (let i = -1; i < 3; ++i) {
            for (let j = -1; j < 4; ++j) {
                const p = {
                    x: originalPos.x + (direction.x * i) + (crossDir.x * offsetScale),
                    y: originalPos.y + j,
                    z: originalPos.z + (direction.z * i) + (crossDir.z * offsetScale)
                };
                
                if (j < 0 && !this.isSolid(dimension, p)) {
                    return false;
                }
                if (j >= 0 && !this.isEmptyBlock(dimension, p)) {
                    return false;
                }
            }
        }
        return true;
    }

    static canReplaceBlock(dimension, pos) {
        // Simplified check: isAir, Liquid, or Replaceable plants
        try {
            const block = dimension.getBlock(pos);
            if (!block) return false;
            if (block.isAir || block.isLiquid || block.typeId.includes("minecraft:light_block")) return true;
            // Add other replaceable tags if known
            if (block.typeId.includes("grass") || block.typeId.includes("flower") || block.typeId.includes("snow")) return true;
            return false;
        } catch (e) { return false; }
    }

    static isSolid(dimension, pos) {
        try {
            const block = dimension.getBlock(pos);
            return block && !block.isAir && !block.isLiquid && !block.typeId.includes("minecraft:light_block"); // Basic solid check
        } catch (e) { return false; }
    }

    static isEmptyBlock(dimension, pos) {
        return this.canReplaceBlock(dimension, pos);
    }

    static isWithinBounds(pos, border) {
        return Math.abs(pos.x) < border && Math.abs(pos.z) < border;
    }

    static distSqr(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    static offset(pos, offset) {
        return { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z };
    }

    /**
     * Generator that yields spiral coordinates around a center.
     */
    static *spiralAround(center, radius) {
        let x = 0;
        let z = 0;
        let dx = 0;
        let dz = -1;
        
        // Yield center
        yield { x: center.x, y: center.y, z: center.z };

        // Max steps for spiral
        const maxSteps = (2 * radius + 1) ** 2;
        
        for (let i = 0; i < maxSteps; i++) {
            if (-radius <= x && x <= radius && -radius <= z && z <= radius) {
                // Skip center (already yielded)
                if (x !== 0 || z !== 0) {
                    yield { x: center.x + x, y: center.y, z: center.z + z };
                }
            }
            
            if (x === z || (x < 0 && x === -z) || (x > 0 && x === 1 - z)) {
                const temp = dx;
                dx = -dz;
                dz = temp;
            }
            
            x += dx;
            z += dz;
        }
    }
}

