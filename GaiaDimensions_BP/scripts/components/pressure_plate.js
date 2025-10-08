import { system, world } from "@minecraft/server";
import { RedstoneControl } from "../systems/Redstone.js";
import { registerBreakHandler } from "../systems/event_manager.js";


const PRESSURE_PLATE_SUFFIX = "_pressure_plate";

let doorStates = new Map(); // Track door states to prevent conflicts

/**
 * Checks if a block is a custom pressure plate
 * @param {string} blockTypeId 
 * @returns {boolean}
 */
function isPressurePlate(blockTypeId) {
    // Vanilla plates are handled separately
    if (blockTypeId.startsWith("minecraft:")) {
        return false;
    }
    return blockTypeId.endsWith(PRESSURE_PLATE_SUFFIX);
}

/**
 * Checks if a block is a vanilla Minecraft pressure plate
 * @param {string} blockTypeId 
 * @returns {boolean}
 */
function isVanillaPressurePlate(blockTypeId) {
    return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("pressure_plate");
}




/**
 * Updates neighboring blocks when pressure plate state changes
 * @param {import("@minecraft/server").Block} block 
 * @param {boolean} newState 
 * @param {string} sourceId 
 */
function updateNeighbors(block, newState, sourceId) {
    const directions = ["north", "south", "east", "west"];
    for (const dir of directions) {
        const neighborBlock = block[dir]();
        if (neighborBlock) {
            let perm = neighborBlock.permutation;
            
            // Handle custom doors (gaiadimension: namespace)
                if (neighborBlock.typeId.startsWith("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    if (perm.getState("gaiadimension:open") !== undefined) {
                        const oldState = perm.getState("gaiadimension:open");
                        // Generate unique key for this door
                        const doorKey = `${neighborBlock.dimension.id},${neighborBlock.location.x},${neighborBlock.location.y},${neighborBlock.location.z}`;
                        const currentDoorState = doorStates.get(doorKey) || false;
                        
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
                            const oldState = upperPerm.getState("gaiadimension:open");
                            // Generate unique key for the upper door
                            const upperDoorKey = `${upperBlock.dimension.id},${upperBlock.location.x},${upperBlock.location.y},${upperBlock.location.z}`;
                            const currentUpperDoorState = doorStates.get(upperDoorKey) || false;
                            
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
                            const oldState = lowerPerm.getState("gaiadimension:open");
                            // Generate unique key for the lower door
                            const lowerDoorKey = `${lowerBlock.dimension.id},${lowerBlock.location.x},${lowerBlock.location.y},${lowerBlock.location.z}`;
                            const currentLowerDoorState = doorStates.get(lowerDoorKey) || false;
                            
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
                const oldState = perm.getState("open_bit");
                neighborBlock.setPermutation(perm.withState("open_bit", newState));
                // Play sound when door is opened or closed
                if (oldState !== newState) {
                    neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                }
            }
            // Handle vanilla Minecraft blocks with generic "open" state
            else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open") !== undefined && !neighborBlock.typeId.includes("lever")) {
                const oldState = perm.getState("open");
                neighborBlock.setPermutation(perm.withState("open", newState));
                // Play sound when door is opened or closed
                if (oldState !== newState) {
                    neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                }
            }
            
            // Set redstone signal for vanilla redstone components
            if (newState) {
                // When pressure plate is pressed, send power level 15 (max power)
                RedstoneControl.setRedstonePower(neighborBlock.location, 15, sourceId);
            } else {
                // When pressure plate is released, remove the power source
                RedstoneControl.removeRedstonePower(sourceId);
            }
        }
    }
}



/**
 * Checks adjacent blocks for custom doors and opens/closes them
 * @param {import("@minecraft/server").Block} block - The pressure plate block
 * @param {boolean} open - Whether to open or close the doors
 */
function checkAdjacentCustomDoors(block, open) {
    const dimension = block.dimension;
    const { x, y, z } = block.location;
    
    // Check adjacent blocks for custom doors only
    const adjacentPositions = [
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
            let activators = doorStates.get(activationKey) || new Set();
            
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
            const currentDoorState = doorStates.get(doorKey) || false;
            
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
function cleanupDoorStates() {
    const keysToDelete = [];
    
    // Check all tracked door states
    for (const doorKey of doorStates.keys()) {
        // Skip activator tracking keys for now
        if (doorKey.endsWith("_activators")) {
            continue;
        }
        
        try {
            // Parse the key to get dimension and coordinates
            const [dimensionId, x, y, z] = doorKey.split(',').map((part, index) => index === 0 ? part : Number(part));
            
            // Only delete door state tracking if we can confirm the door no longer exists
            // We'll be more conservative about deleting door states
            const dimension = world.getDimension(dimensionId);
            const block = dimension.getBlock({ x, y, z });
            
            // If the block is no longer a custom door, mark it for deletion
            if (!block || !block.typeId.startsWith("gaiadimension:") || !block.typeId.includes("door")) {
                keysToDelete.push(doorKey);
                // Also delete the activator tracking key
                keysToDelete.push(`${doorKey}_activators`);
            }
        } catch (e) {
            // If there's an error parsing the key or getting the block, be conservative
            // and don't delete the door state tracking
            // This prevents accidental deletion of door states for doors in unloaded chunks
        }
    }
    
    // Delete the marked keys
    for (const key of keysToDelete) {
        doorStates.delete(key);
    }
    
    // Clean up orphaned activator tracking keys
    const orphanedActivatorKeys = [];
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
let activePlates = new Set();

system.runInterval(() => {
    const players = world.getPlayers();
    const newlyActivePlates = new Set();

    // 1. Find all currently active plates by checking player locations
    for (const player of players) {
        // Check the block the player is standing on and the block they are in
        const loc = {x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z)};
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
    }

    // 2. Detect plates that were just pressed
    for (const plateKey of newlyActivePlates) {
        if (!activePlates.has(plateKey)) {
            // Plate was just pressed
            const [dimensionId, x, y, z] = plateKey.split(',');
            const dimension = world.getDimension(dimensionId);
            const block = dimension.getBlock({ x: Number(x), y: Number(y), z: Number(z) });

            if (block) {
                if (isPressurePlate(block.typeId)) {
                    // For custom plates, we control the state
                    block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
                    block.dimension.playSound("click_on.wooden_pressure_plate", block.location, { volume: 1, pitch: 1 });
                    const sourceId = `pressure_plate_${x}_${y}_${z}`;
                    updateNeighbors(block, true, sourceId);
                } else if (isVanillaPressurePlate(block.typeId)) {
                    // For vanilla plates, we ONLY trigger our custom logic.
                    // The game handles the state and sound.
                    const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
                    updateNeighbors(block, true, sourceId);
                    checkAdjacentCustomDoors(block, true);
                }
            }
        }
    }

    // 3. Detect plates that were just released
    for (const plateKey of activePlates) {
        if (!newlyActivePlates.has(plateKey)) {
            // Plate was just released
            const [dimensionId, x, y, z] = plateKey.split(',');
            const dimension = world.getDimension(dimensionId);
            const block = dimension.getBlock({ x: Number(x), y: Number(y), z: Number(z) });

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
        }
    }

    // 4. Update the state for the next tick
    activePlates = newlyActivePlates;

}, 2); // Run every 2 ticks for responsiveness

// Periodically clean up door states to prevent memory leaks
system.runInterval(() => {
    cleanupDoorStates();
}, 1200); // Clean up every 60 seconds (1200 ticks)

class PressurePlateComponent {
    // This is a dummy component just for identification
}

export function registerPressurePlateComponent({ blockComponentRegistry }) {
    const pressurePlateComponent = new PressurePlateComponent();
    blockComponentRegistry.registerCustomComponent("gaiadimension:pressure_plate", pressurePlateComponent);

    registerBreakHandler({
        event: "before",
        check: (block) => isPressurePlate(block.typeId),
        execute: (event) => {
            const { block } = event;
            const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
            RedstoneControl.removeRedstonePower(sourceId);
        }
    });
}