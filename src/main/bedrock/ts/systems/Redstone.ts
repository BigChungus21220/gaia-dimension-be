import { system, Block, Vector3, Dimension } from "@minecraft/server";
import { playDoorSound, getRedstonePower } from "../utils.js";

/**
 * Interface for tracking door states and redstone signals.
 */
interface DoorTracker {
    /** The block representing the door */
    doorBlock: Block;
    /** The tick when the last redstone signal was received */
    lastSignalTick: number;
    /** The handle for the interval check, or null if not running */
    checkInterval: number | null;
}

/**
 * System for controlling custom redstone-interactable doors.
 */
export class RedstoneControl {
    /**
     * Maps door keys to tracker info.
     * Internal map to keep track of doors being polled for redstone changes.
     */
    private static doorTrackers: Map<string, DoorTracker> = new Map<string, DoorTracker>();

    /**
     * Wakes up the door tracking system for a specific source.
     * Call this when a button/plate is pressed.
     * @param sourceBlock - The block that initiated the signal (e.g., a button or pressure plate)
     */
    public static updateRedstonePower(sourceBlock: Block): void {
        if (!sourceBlock) return;

        // Trace the network to find doors that might be affected by this source
        const doorInfos: { block: Block }[] = this.traceNetworkForDoors(sourceBlock);
        
        for (const doorInfo of doorInfos) {
            // Start tracking/polling this door
            this.trackDoor(doorInfo.block, sourceBlock);
            // Force an immediate check
            const doorKey: string = this.getBlockKey(doorInfo.block.location);
            this.checkDoorTracker(doorKey);
        }
    }

    /**
     * Adds a door to be tracked for signal timeout.
     * @param doorBlock - The door block to track
     * @param sourceBlock - The block providing the signal
     */
    public static trackDoor(doorBlock: Block, sourceBlock: Block): void {
        if (!doorBlock) return;
        
        // For double doors, we always track the lower half as the primary door
        let primaryDoorBlock: Block = doorBlock;
        if (doorBlock.typeId.includes("door") && doorBlock.typeId.includes("_upper")) {
            const lowerBlock: Block | undefined = doorBlock.below();
            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                primaryDoorBlock = lowerBlock;
            }
        }
        
        const doorKey: string = this.getBlockKey(primaryDoorBlock.location);
        
        // Create or update tracker
        let tracker: DoorTracker | undefined = this.doorTrackers.get(doorKey);
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
        if (tracker.checkInterval === null) {
            // Check every 5 ticks (0.25s) for responsiveness
            tracker.checkInterval = system.runInterval(() => {
                this.checkDoorTracker(doorKey);
            }, 5); 
        }
    }

    /**
     * Checks a door tracker and handles redstone power logic.
     * @param doorKey - The unique key identifying the door
     */
    public static checkDoorTracker(doorKey: string): void {
        const tracker: DoorTracker | undefined = this.doorTrackers.get(doorKey);
        if (!tracker) return;
        
        // Check if the door block still exists and is valid
        if (!tracker.doorBlock.isValid) {
            this.stopTracking(doorKey);
            return;
        }
        
        const { x, y, z }: Vector3 = tracker.doorBlock.location;
        const dimension: Dimension = tracker.doorBlock.dimension;
        let hasActiveSignal: boolean = false;
        
        // Check all blocks in a 3x3 area around the door for redstone power
        // (Checking direct neighbors is usually sufficient for redstone, 
        // but existing logic checked 3x3, keeping it for robustness with wire positioning)
        for (let dx: number = -1; dx <= 1; dx++) {
            for (let dy: number = -1; dy <= 1; dy++) {
                for (let dz: number = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    
                    const checkPos: Vector3 = { x: x + dx, y: y + dy, z: z + dz };
                    const checkBlock: Block | undefined = dimension.getBlock(checkPos);
                    if (!checkBlock) continue;

                    const redstonePower: number = getRedstonePower(checkBlock);
                    
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

        // If no active signal, stop tracking immediately if closed to save performance, 
        // assuming it won't open again until a source wakes it up.
        if (!hasActiveSignal) {
             this.stopTracking(doorKey);
        }
    }

    /**
     * Stops tracking a door and clears its interval.
     * @param doorKey - The unique key identifying the door
     */
    public static stopTracking(doorKey: string): void {
        const tracker: DoorTracker | undefined = this.doorTrackers.get(doorKey);
        if (tracker && tracker.checkInterval !== null) {
            system.clearRun(tracker.checkInterval);
            tracker.checkInterval = null;
        }
        this.doorTrackers.delete(doorKey);
    }

    /**
     * Sets the state of a door (open or closed) and plays appropriate sounds.
     * @param doorBlock - The primary door block to update
     * @param open - True to open the door, false to close it
     */
    public static setDoorState(doorBlock: Block, open: boolean): void {
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

            // Update function for individual door parts
            const updateBlock = (block: Block | undefined): void => {
                if (!block || !block.isValid || !block.typeId.includes("door")) return;
                const perm = block.permutation;
                // Use a cast to string to avoid potential typing issues with custom states
                const isOpen: boolean = perm.getState("gaiadimension:open" as string) === true;
                
                if (isOpen !== open) {
                    block.setPermutation(perm.withState("gaiadimension:open" as string, open));
                    playDoorSound(block, open);
                }
            };

            updateBlock(lowerDoor);
            updateBlock(upperDoor);

        } catch (e: unknown) {
            console.warn("Error setting door state", e);
        }
    }
    
    /**
     * Compatibility wrapper: starts tracking and forcing an immediate state check.
     * @param doorBlock - The door block to open/track
     * @param sourceBlock - The block that triggered the opening
     */
    public static openAndTrackDoor(doorBlock: Block, sourceBlock: Block): void {
        // Compatibility wrapper: just start tracking.
        // The tracking loop will handle the actual opening in the next check (few ms)
        // or we can force it.
        this.trackDoor(doorBlock, sourceBlock);
        // Force immediate check to ensure instant response
        const key: string = this.getBlockKey(doorBlock.location);
        this.checkDoorTracker(key);
    }
    
    /**
     * Updates an existing tracker or creates a new one.
     * @param doorBlock - The door block to track
     * @param sourceBlock - The source of the redstone signal
     */
    public static updateDoorTracker(doorBlock: Block, sourceBlock: Block): void {
        this.trackDoor(doorBlock, sourceBlock);
    }

    /**
     * Traces the redstone network to find custom doors.
     * Uses simple connectivity logic (searching neighbors recursively).
     * @param sourceBlock - The starting block for tracing
     * @param maxDepth - Maximum recursion depth for the search
     * @returns Array of door block wrappers
     */
    public static traceNetworkForDoors(sourceBlock: Block, maxDepth: number = 15): { block: Block }[] {
        if (!sourceBlock) return [];
        
        const foundDoors: { block: Block }[] = [];
        const visited: Set<string> = new Set<string>();
        const queue: { block: Block; depth: number }[] = [{ block: sourceBlock, depth: 0 }];
        const dimension: Dimension = sourceBlock.dimension;
        
        while (queue.length > 0) {
            const item: { block: Block; depth: number } | undefined = queue.shift();
            if (!item) continue;
            
            const { block, depth }: { block: Block; depth: number } = item;
            if (depth > maxDepth) continue;

            const blockKey: string = this.getBlockKey(block.location);
            if (visited.has(blockKey)) continue;
            visited.add(blockKey);
            
            // Check neighbors
            const neighbors: Vector3[] = this.getNeighbors(block.location);
            for (const neighborLoc of neighbors) {
                const neighborBlock: Block | undefined = dimension.getBlock(neighborLoc);
                if (!neighborBlock || neighborBlock.isAir) continue;

                // Found a custom door?
                if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    const doorKey: string = this.getBlockKey(neighborBlock.location);
                    // Avoid duplicates in result
                    if (!foundDoors.some((d: { block: Block }) => this.getBlockKey(d.block.location) === doorKey)) {
                         foundDoors.push({ block: neighborBlock });
                    }
                }
                
                // Continue tracing through redstone conductors
                if (depth < maxDepth && this.isRedstoneConductor(neighborBlock)) {
                     queue.push({ block: neighborBlock, depth: depth + 1 });
                }
            }
        }
        return foundDoors;
    }

    /**
     * Determines if a block can conduct/transmit redstone signals.
     * @param block - The block to check
     * @returns True if the block is a redstone component or conductor
     */
    public static isRedstoneConductor(block: Block): boolean {
        if (!block) return false;
        const typeId: string = block.typeId;
        return typeId === "minecraft:redstone_wire" || 
               typeId.includes("repeater") || 
               typeId.includes("redstone_torch") || 
               typeId === "minecraft:redstone_block" ||
               typeId.includes("piston") ||
               typeId.includes("comparator");
    }

    /**
     * Helper to get adjacent block coordinates.
     * @param location - The starting coordinates
     * @returns Array of 6 adjacent Vector3 positions
     */
    public static getNeighbors(location: Vector3): Vector3[] {
        const { x, y, z }: Vector3 = location;
        return [
            { x: x + 1, y, z }, { x: x - 1, y, z },
            { x, y: y + 1, z }, { x, y: y - 1, z },
            { x, y, z: z + 1 }, { x, y, z: z - 1 }
        ];
    }

    /**
     * Converts a location to a string key for Map usage.
     * @param location - The block coordinates
     * @returns A string in format "x,y,z"
     */
    public static getBlockKey(location: Vector3): string {
        return `${location.x},${location.y},${location.z}`;
    }
}
