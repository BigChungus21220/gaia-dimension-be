import { system, world, Block, Vector3, Dimension } from "@minecraft/server";
import { playDoorSound, getRedstonePower } from "../utils.js";

interface DoorTracker {
    doorBlock: Block;
    lastSignalTick: number;
    checkInterval: number | null;
}

export const RedstoneControl = {
    // Door tracking system
    // Maps door keys to tracker info
    doorTrackers: new Map<string, DoorTracker>(), 

    /**
     * Wakes up the door tracking system for a specific source.
     * Call this when a button/plate is pressed.
     * @param {Block} sourceBlock - The block that initiated the signal
     */
    updateRedstonePower(sourceBlock: Block) {
        // Trace the network to find doors that might be affected by this source
        const doorInfos = this.traceNetworkForDoors(sourceBlock);
        
        for (const doorInfo of doorInfos) {
            // Start tracking/polling this door
            this.trackDoor(doorInfo.block, sourceBlock);
            // Force an immediate check
            const doorKey = this.getBlockKey(doorInfo.block.location);
            this.checkDoorTracker(doorKey);
        }
    },

    /**
     * Adds a door to be tracked for signal timeout
     */
    trackDoor(doorBlock: Block, sourceBlock: Block) {
        if (!doorBlock) return;
        
        // For double doors, we always track the lower half as the primary door
        let primaryDoorBlock = doorBlock;
        if (doorBlock.typeId.includes("door") && doorBlock.typeId.includes("_upper")) {
            const lowerBlock = doorBlock.below();
            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                primaryDoorBlock = lowerBlock;
            }
        }
        
        const doorKey = this.getBlockKey(primaryDoorBlock.location);
        
        // Create or update tracker
        let tracker = this.doorTrackers.get(doorKey);
        if (!tracker) {
            tracker = {
                doorBlock: primaryDoorBlock,
                lastSignalTick: system.currentTick,
                checkInterval: null
            };
            this.doorTrackers.set(doorKey, tracker);
        } else {
            tracker.lastSignalTick = system.currentTick;
        }
        
        // Start checking interval if not already running
        if (!tracker.checkInterval) {
            // Check every 5 ticks (0.25s) for responsiveness
            tracker.checkInterval = system.runInterval(() => {
                this.checkDoorTracker(doorKey);
            }, 5); 
        }
    },

    /**
     * Checks a door tracker and handles redstone power logic
     */
    checkDoorTracker(doorKey: string) {
        const tracker = this.doorTrackers.get(doorKey);
        if (!tracker) return;
        
        // Check if the door block still exists
        if (!tracker.doorBlock.isValid) {
            this.stopTracking(doorKey);
            return;
        }
        
        const { x, y, z } = tracker.doorBlock.location;
        const dimension = tracker.doorBlock.dimension;
        let hasActiveSignal = false;
        
        // Check all blocks in a 3x3 area around the door for redstone power
        // (Checking direct neighbors is usually sufficient for redstone, 
        // but existing logic checked 3x3, keeping it for robustness with wire positioning)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    
                    const checkPos = { x: x + dx, y: y + dy, z: z + dz };
                    const checkBlock = dimension.getBlock(checkPos);
                    const redstonePower = getRedstonePower(checkBlock as Block);
                    
                    if (redstonePower > 0) {
                        hasActiveSignal = true;
                        break;
                    }
                }
                if (hasActiveSignal) break;
            }
            if (hasActiveSignal) break;
        }
        
        // Update Door State
        this.setDoorState(tracker.doorBlock, hasActiveSignal);

        // If no active signal, stop tracking after a short delay or immediately?
        // We stop tracking immediately if closed to save performance, 
        // assuming it won't open again until a source wakes it up.
        if (!hasActiveSignal) {
             this.stopTracking(doorKey);
        }
    },

    stopTracking(doorKey: string) {
        const tracker = this.doorTrackers.get(doorKey);
        if (tracker && tracker.checkInterval) {
            system.clearRun(tracker.checkInterval);
        }
        this.doorTrackers.delete(doorKey);
    },

    setDoorState(doorBlock: Block, open: boolean) {
        try {
            // Handle Double Doors
            let lowerDoor: Block | undefined = doorBlock;
            let upperDoor: Block | undefined = undefined;

            if (doorBlock.typeId.includes("_upper")) {
                 // Should have been normalized to lower, but safe check
                 lowerDoor = doorBlock.below();
                 upperDoor = doorBlock;
            } else {
                upperDoor = doorBlock.above();
            }

            // Update Lower
            if (lowerDoor && lowerDoor.isValid && lowerDoor.typeId.includes("gaiadimension:p")) { // gaiadimension:plant_door etc
                 // Just checking it's a valid door block roughly
            }

            const updateBlock = (block: Block | undefined) => {
                if (!block || !block.isValid || !block.typeId.includes("door")) return;
                const perm = block.permutation;
                const isOpen = perm.getState("gaiadimension:open" as any) === true;
                
                if (isOpen !== open) {
                    block.setPermutation(perm.withState("gaiadimension:open" as any, open));
                    playDoorSound(block, open);
                }
            };

            updateBlock(lowerDoor);
            updateBlock(upperDoor);

        } catch (e) {
            console.warn("Error setting door state", e);
        }
    },
    
    // Kept for "Wake Up" phase
    openAndTrackDoor(doorBlock: Block, sourceBlock: Block) {
        // Compatibility wrapper: just start tracking.
        // The tracking loop will handle the actual opening in the next check (few ms)
        // or we can force it.
        this.trackDoor(doorBlock, sourceBlock);
        // Force immediate check to ensure instant response
        const key = this.getBlockKey(doorBlock.location);
        this.checkDoorTracker(key);
    },
    
    updateDoorTracker(doorBlock: Block, sourceBlock: Block) {
        this.trackDoor(doorBlock, sourceBlock);
    },

    /**
     * Traces the redstone network to find custom doors.
     * Uses simple connectivity logic.
     */
    traceNetworkForDoors(sourceBlock: Block, maxDepth: number = 15) {
        if (!sourceBlock) return [];
        
        const foundDoors: { block: Block }[] = [];
        const visited = new Set<string>();
        const queue: { block: Block, depth: number }[] = [{ block: sourceBlock, depth: 0 }];
        const dimension = sourceBlock.dimension;
        
        while (queue.length > 0) {
            const item = queue.shift();
            if (!item) continue;
            const { block, depth } = item;
            if (depth > maxDepth) continue;

            const blockKey = this.getBlockKey(block.location);
            if (visited.has(blockKey)) continue;
            visited.add(blockKey);
            
            // Check neighbors
            const neighbors = this.getNeighbors(block.location);
            for (const neighborLoc of neighbors) {
                const neighborBlock = dimension.getBlock(neighborLoc);
                if (!neighborBlock || neighborBlock.isAir) continue;

                // Found a custom door?
                if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    const doorKey = this.getBlockKey(neighborBlock.location);
                    // Avoid duplicates in result
                    if (!foundDoors.some(d => this.getBlockKey(d.block.location) === doorKey)) {
                         // Lever exception: Don't trace through air/walls to a door if it's too close? 
                         // Existing logic had a specific lever check. We'll simplify:
                         // Just add it. The Polling system will verify if it's *actually* powered.
                         foundDoors.push({ block: neighborBlock });
                    }
                }
                
                // Continue tracing through conductors
                if (depth < maxDepth && this.isRedstoneConductor(neighborBlock)) {
                     queue.push({ block: neighborBlock, depth: depth + 1 });
                }
            }
        }
        return foundDoors;
    },

    isRedstoneConductor(block: Block) {
        if (!block) return false;
        const typeId = block.typeId;
        return typeId === "minecraft:redstone_wire" || 
               typeId.includes("repeater") || 
               typeId.includes("redstone_torch") || 
               typeId === "minecraft:redstone_block" ||
               typeId.includes("piston") ||
               typeId.includes("comparator");
    },

    getNeighbors(location: Vector3) {
        const { x, y, z } = location;
        return [
            { x: x + 1, y, z }, { x: x - 1, y, z },
            { x, y: y + 1, z }, { x, y: y - 1, z },
            { x, y, z: z + 1 }, { x, y, z: z - 1 }
        ];
    },

    getBlockKey(location: Vector3) {
        return `${location.x},${location.y},${location.z}`;
    }
};

