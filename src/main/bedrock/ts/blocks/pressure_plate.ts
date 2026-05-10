import { Block, BlockComponentRegistry, Dimension, system, world, BlockPermutation, Player, Vector3, BlockCustomComponent } from "@minecraft/server";
import { RedstoneControl } from "../systems/Redstone.js";

const PRESSURE_PLATE_SUFFIX = "_pressure_plate";

type DoorStateValue = boolean | Set<string>;
const doorStates = new Map<string, DoorStateValue>(); // Track door states to prevent conflicts

/**
 * Checks if a block is a custom pressure plate
 * @param blockTypeId 
 * @returns {boolean}
 */
function isPressurePlate(blockTypeId: string): boolean {
    // Vanilla plates are handled separately
    if (blockTypeId.startsWith("minecraft:")) {
        return false;
    }
    return blockTypeId.endsWith(PRESSURE_PLATE_SUFFIX);
}

/**
 * Checks if a block is a vanilla Minecraft pressure plate
 * @param blockTypeId 
 * @returns {boolean}
 */
function isVanillaPressurePlate(blockTypeId: string): boolean {
    return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("pressure_plate");
}

/**
 * Updates neighboring blocks when pressure plate state changes
 * @param block 
 * @param newState 
 * @param sourceId 
 */
function updateNeighbors(block: Block, newState: boolean, sourceId: string): void {
    // This part handles DIRECTLY opening adjacent doors
    const directions: ("north" | "south" | "east" | "west")[] = ["north", "south", "east", "west"];
    for (const dir of directions) {
        let neighborBlock: Block | undefined;
        try {
            if (dir === "north") neighborBlock = block.north();
            else if (dir === "south") neighborBlock = block.south();
            else if (dir === "east") neighborBlock = block.east();
            else if (dir === "west") neighborBlock = block.west();
        } catch (e: unknown) {
            // Ignore if block is at boundary or other issues
        }

        if (neighborBlock) {
            const perm = neighborBlock.permutation;
            
            // Handle custom doors (gaiadimension: namespace)
            if (neighborBlock.typeId.startsWith("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                if (perm.getState("gaiadimension:open") !== undefined) {
                    const oldState = perm.getState("gaiadimension:open") as boolean;
                    // Generate unique key for this door
                    const doorKey = `${neighborBlock.dimension.id},${neighborBlock.location.x},${neighborBlock.location.y},${neighborBlock.location.z}`;
                    const currentDoorState = (doorStates.get(doorKey) as boolean) || false;
                    
                    // Only update if the door state needs to change
                    if (currentDoorState !== newState) {
                        neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                        // Play sound when door is opened or closed
                        if (oldState !== newState) {
                            neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                        }
                        // Update door state tracking
                        doorStates.set(doorKey, newState);
                        
                        // Start tracking the door for timeout if it's being opened
                        if (newState) {
                            RedstoneControl.openAndTrackDoor(neighborBlock, block);
                        } else {
                            // Update tracker if door is being closed
                            RedstoneControl.updateDoorTracker(neighborBlock, block);
                        }
                    }
                    // Update door state tracking
                    doorStates.set(doorKey, newState);
                }
            
                // Special handling for custom doors - update both upper and lower halves
                // If this is the lower half of a door, also update the upper half
                if (neighborBlock.typeId.includes("_lower")) {
                    const upperBlock = neighborBlock.above();
                    if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                        const upperPerm = upperBlock.permutation;
                        if (upperPerm.getState("gaiadimension:open") !== undefined) {
                            const oldState = upperPerm.getState("gaiadimension:open") as boolean;
                            // Generate unique key for the upper door
                            const upperDoorKey = `${upperBlock.dimension.id},${upperBlock.location.x},${upperBlock.location.y},${upperBlock.location.z}`;
                            const currentUpperDoorState = (doorStates.get(upperDoorKey) as boolean) || false;
                            
                            // Only update if the door state needs to change
                            if (currentUpperDoorState !== newState) {
                                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                                // Play sound when door is opened or closed
                                if (oldState !== newState) {
                                    upperBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, { volume: 1, pitch: 1 });
                                }
                                // Update door state tracking for upper half
                                doorStates.set(upperDoorKey, newState);
                            }
                        }
                    }
                }
                // If this is the upper half of a door, also update the lower half
                else if (neighborBlock.typeId.includes("_upper")) {
                    const lowerBlock = neighborBlock.below();
                    if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                        const lowerPerm = lowerBlock.permutation;
                        if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                            const oldState = lowerPerm.getState("gaiadimension:open") as boolean;
                            // Generate unique key for the lower door
                            const lowerDoorKey = `${lowerBlock.dimension.id},${lowerBlock.location.x},${lowerBlock.location.y},${lowerBlock.location.z}`;
                            const currentLowerDoorState = (doorStates.get(lowerDoorKey) as boolean) || false;
                            
                            // Only update if the door state needs to change
                            if (currentLowerDoorState !== newState) {
                                lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                                // Play sound when door is opened or closed
                                if (oldState !== newState) {
                                    lowerBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, { volume: 1, pitch: 1 });
                                }
                                // Update door state tracking for lower half
                                doorStates.set(lowerDoorKey, newState);
                            }
                        }
                    }
                }
            }
            // Handle vanilla Minecraft blocks with open_bit state
            else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open_bit") !== undefined && !neighborBlock.typeId.includes("lever")) {
                const oldState = perm.getState("open_bit") as boolean;
                neighborBlock.setPermutation(perm.withState("open_bit", newState));
                // Play sound when door is opened or closed
                if (oldState !== newState) {
                    neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                }
            }
            // Handle vanilla Minecraft blocks with generic "open" state
            else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open") !== undefined && !neighborBlock.typeId.includes("lever")) {
                const oldState = perm.getState("open") as boolean;
                neighborBlock.setPermutation(perm.withState("open", newState));
                // Play sound when door is opened or closed
                if (oldState !== newState) {
                    neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                }
            }
        }
    }

    // This part handles powering the redstone network
    if (newState) {
        // When pressure plate is pressed, treat the plate's location as a power source.
        // Redstone.js will handle powering the adjacent wires.
        RedstoneControl.updateRedstonePower(block);
    }
}

/**
 * Checks adjacent blocks for custom doors and opens/closes them
 * @param block - The pressure plate block
 * @param open - Whether to open or close the doors
 */
function checkAdjacentCustomDoors(block: Block, open: boolean): void {
    const dimension = block.dimension;
    const { x, y, z } = block.location;
    
    // Check adjacent blocks for custom doors only
    const adjacentPositions: Vector3[] = [
        { x: x + 1, y, z },
        { x: x - 1, y, z },
        { x, y, z: z + 1 },
        { x, y, z: z - 1 },
        { x, y: y + 1, z },
        { x, y: y - 1, z }
    ];
    
    for (const pos of adjacentPositions) {
        const adjacentBlock = dimension.getBlock(pos);
        // Only process custom doors (gaiadimension: namespace)
        if (adjacentBlock && adjacentBlock.typeId.startsWith("gaiadimension:") && adjacentBlock.typeId.includes("door")) {
            // Generate unique key for this door
            const doorKey = `${adjacentBlock.dimension.id},${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`;
            
            // For multiple pressure plates, we need to track which pressure plates are activating this door
            const activationKey = `${doorKey}_activators`;
            const activators = (doorStates.get(activationKey) as Set<string>) || new Set<string>();
            
            // Generate a unique key for this pressure plate
            const plateKey = `${block.dimension.id},${block.location.x},${block.location.y},${block.location.z}`;
            
            if (open) {
                // Add this pressure plate to the activators set
                activators.add(plateKey);
            } else {
                // Remove this pressure plate from the activators set
                activators.delete(plateKey);
            }
            
            // Update the activators set
            doorStates.set(activationKey, activators);
            
            // Door should be open if any pressure plate is activating it
            const shouldDoorBeOpen = activators.size > 0;
            
            // Check current door state
            const currentDoorState = (doorStates.get(doorKey) as boolean) || false;
            
            // Only update if the door state needs to change
            if (currentDoorState !== shouldDoorBeOpen) {
                // Found a custom door, open/close it
                const perm = adjacentBlock.permutation;
                if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                    adjacentBlock.setPermutation(perm.withState("gaiadimension:open", shouldDoorBeOpen));
                    
                    // Play sound when door is opened or closed
                    dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", adjacentBlock.location, { volume: 1, pitch: 1 });
                    
                    // Update door state tracking
                    doorStates.set(doorKey, shouldDoorBeOpen);
                    
                    // Start tracking the door for timeout if it's being opened
                    if (shouldDoorBeOpen) {
                        RedstoneControl.openAndTrackDoor(adjacentBlock, block);
                    } else {
                        // Update tracker if door is being closed
                        RedstoneControl.updateDoorTracker(adjacentBlock, block);
                    }
                }
                
                // Special handling for custom doors - update both upper and lower halves
                if (adjacentBlock.typeId.includes("door")) {
                    // If this is the lower half of a door, also update the upper half
                    if (adjacentBlock.typeId.includes("_lower")) {
                        const upperBlock = adjacentBlock.above();
                        if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                            const upperPerm = upperBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", shouldDoorBeOpen));
                                
                                // Play sound when door is opened or closed
                                dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, { volume: 1, pitch: 1 });
                                
                                // Update door state tracking for upper half
                                const upperDoorKey = `${upperBlock.dimension.id},${upperBlock.location.x},${upperBlock.location.y},${upperBlock.location.z}`;
                                doorStates.set(upperDoorKey, shouldDoorBeOpen);
                                
                                // Start tracking the door for timeout if it's being opened
                                if (shouldDoorBeOpen) {
                                    RedstoneControl.openAndTrackDoor(upperBlock, block);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(upperBlock, block);
                                }
                            }
                        }
                    }
                    // If this is the upper half of a door, also update the lower half
                    else if (adjacentBlock.typeId.includes("_upper")) {
                        const lowerBlock = adjacentBlock.below();
                        if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                            const lowerPerm = lowerBlock.permutation;
                            if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                                lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", shouldDoorBeOpen));
                                
                                // Play sound when door is opened or closed
                                dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, { volume: 1, pitch: 1 });
                                
                                // Update door state tracking for lower half
                                const lowerDoorKey = `${lowerBlock.dimension.id},${lowerBlock.location.x},${lowerBlock.location.y},${lowerBlock.location.z}`;
                                doorStates.set(lowerDoorKey, shouldDoorBeOpen);
                                
                                // Start tracking the door for timeout if it's being opened
                                if (shouldDoorBeOpen) {
                                    RedstoneControl.openAndTrackDoor(lowerBlock, block);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(lowerBlock, block);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Cleans up door states for doors that no longer exist
 */
function cleanupDoorStates(): void {
    const keysToDelete: string[] = [];
    
    // Check all tracked door states
    for (const doorKey of doorStates.keys()) {
        // Skip activator tracking keys for now
        if (doorKey.endsWith("_activators")) {
            continue;
        }
        
        try {
            // Parse the key to get dimension and coordinates
            const parts = doorKey.split(',');
            const dimensionId = parts[0];
            const x = Number(parts[1]);
            const y = Number(parts[2]);
            const z = Number(parts[3]);
            
            // Only delete door state tracking if we can confirm the door no longer exists
            const dimension = world.getDimension(dimensionId);
            const block = dimension.getBlock({ x, y, z });
            
            // If the block is no longer a custom door, mark it for deletion
            if (!block || !block.typeId.startsWith("gaiadimension:") || !block.typeId.includes("door")) {
                keysToDelete.push(doorKey);
                // Also delete the activator tracking key
                keysToDelete.push(`${doorKey}_activators`);
            }
        } catch (e: unknown) {
            // If there's an error parsing the key or getting the block, be conservative
        }
    }
    
    // Delete the marked keys
    for (const key of keysToDelete) {
        doorStates.delete(key);
    }
    
    // Clean up orphaned activator tracking keys
    const orphanedActivatorKeys: string[] = [];
    for (const key of doorStates.keys()) {
        if (key.endsWith("_activators")) {
            const doorKey = key.substring(0, key.length - 11); // Remove "_activators"
            if (!doorStates.has(doorKey)) {
                orphanedActivatorKeys.push(key);
            }
        }
    }
    
    // Delete orphaned activator tracking keys
    for (const key of orphanedActivatorKeys) {
        doorStates.delete(key);
    }
}

// Start the pressure plate checking system
let activePlates = new Set<string>();

system.runInterval(() => {
    const players = world.getAllPlayers();
    const newlyActivePlates = new Set<string>();

    // Find all currently active plates by checking player locations
    for (const player of players) {
        try {
            // Check the block the player is standing on and the block they are in
            const loc: Vector3 = {x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z)};
            const headBlock = player.dimension.getBlock(loc);
            const blockBelow = player.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z });

            if (headBlock && (isPressurePlate(headBlock.typeId) || isVanillaPressurePlate(headBlock.typeId))) {
                const key = `${headBlock.dimension.id},${headBlock.location.x},${headBlock.location.y},${headBlock.location.z}`;
                newlyActivePlates.add(key);
            }
            if (blockBelow && (isPressurePlate(blockBelow.typeId) || isVanillaPressurePlate(blockBelow.typeId))) {
                const key = `${blockBelow.dimension.id},${blockBelow.location.x},${blockBelow.location.y},${blockBelow.location.z}`;
                newlyActivePlates.add(key);
            }
        } catch (e: unknown) {
            // Ignore errors from unloaded chunks
        }
    }

    // Detect plates that were just pressed
    for (const plateKey of newlyActivePlates) {
        if (!activePlates.has(plateKey)) {
            try {
                // Plate was just pressed
                const parts = plateKey.split(',');
                const dimensionId = parts[0];
                const x = Number(parts[1]);
                const y = Number(parts[2]);
                const z = Number(parts[3]);
                const dimension = world.getDimension(dimensionId);
                const block = dimension.getBlock({ x, y, z });

                if (block) {
                    if (isPressurePlate(block.typeId)) {
                        // For custom plates, we control the state
                        block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
                        block.dimension.playSound("click_on.wooden_pressure_plate", block.location, { volume: 1, pitch: 1 });
                        const sourceId = `pressure_plate_${x}_${y}_${z}`;
                        updateNeighbors(block, true, sourceId);
                    } else if (isVanillaPressurePlate(block.typeId)) {
                        // For vanilla plates, we ONLY trigger our custom logic.
                        const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
                        updateNeighbors(block, true, sourceId);
                        checkAdjacentCustomDoors(block, true);
                    }
                }
            } catch (e: unknown) {
                 // Ignore errors from unloaded chunks
            }
        }
    }

    // Detect plates that were just released
    for (const plateKey of activePlates) {
        if (!newlyActivePlates.has(plateKey)) {
            try {
                // Plate was just released
                const parts = plateKey.split(',');
                const dimensionId = parts[0];
                const x = Number(parts[1]);
                const y = Number(parts[2]);
                const z = Number(parts[3]);
                const dimension = world.getDimension(dimensionId);
                const block = dimension.getBlock({ x, y, z });

                if (block && (isPressurePlate(block.typeId) || isVanillaPressurePlate(block.typeId))) {
                    if (isPressurePlate(block.typeId)) {
                        // For custom plates, we control the state
                        block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
                        block.dimension.playSound("click_off.wooden_pressure_plate", block.location, { volume: 1, pitch: 1 });
                        const sourceId = `pressure_plate_${x}_${y}_${z}`;
                        updateNeighbors(block, false, sourceId);
                    } else if (isVanillaPressurePlate(block.typeId)) {
                        // For vanilla plates, we ONLY trigger our custom logic.
                        const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
                        updateNeighbors(block, false, sourceId);
                        checkAdjacentCustomDoors(block, false);
                    }
                }
            } catch (e: unknown) {
                 // Ignore errors from unloaded chunks
            }
        }
    }
    activePlates = newlyActivePlates;

}, 2); 

// Periodically clean up door states to prevent memory leaks
system.runInterval(() => {
    cleanupDoorStates();
}, 1200); 

class PressurePlateComponent implements BlockCustomComponent {
    // This is a dummy component just for identification
}

export function registerPressurePlateComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    const pressurePlateComponent = new PressurePlateComponent();
    blockComponentRegistry.registerCustomComponent("gaiadimension:pressure_plate", pressurePlateComponent);
}
