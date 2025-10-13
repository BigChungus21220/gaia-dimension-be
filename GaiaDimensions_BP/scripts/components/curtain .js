import { system, BlockPermutation, GameMode, ItemStack, world } from "@minecraft/server";
import { registerBreakHandler, registerInteractHandler } from "../systems/event_manager.js";

const activeDoors = [];

function initializeFireDoorSystem() {
    system.runInterval(() => {
        for (let i = activeDoors.length - 1; i >= 0; i--) {
            const doorInfo = activeDoors[i];
            try {
                const block = doorInfo.dimension.getBlock(doorInfo.location);

                if (!block || block.typeId !== doorInfo.typeId) {
                    // Door was destroyed or changed
                    const isLower = doorInfo.typeId.includes("_lower");
                    const otherBlockLocation = {
                        x: doorInfo.location.x,
                        y: doorInfo.location.y + (isLower ? 1 : -1),
                        z: doorInfo.location.z
                    };
                    const otherBlock = doorInfo.dimension.getBlock(otherBlockLocation);

                    const expectedOtherTypeId = isLower
                        ? doorInfo.typeId.replace("_lower", "_upper")
                        : doorInfo.typeId.replace("_upper", "_lower");

                    if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
                        otherBlock.setType("minecraft:air");
                        // Also remove the other half from activeDoors
                        const otherIndex = activeDoors.findIndex(d => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
                        if (otherIndex > -1) {
                            activeDoors.splice(otherIndex, 1);
                        }
                    }

                    activeDoors.splice(i, 1); // Remove from list
                }
            } catch (error) {
                // Block is in an unloaded chunk, remove it from the list to avoid errors
                if (error.message.includes("Could not find block")) {
                    activeDoors.splice(i, 1);
                } else {
                    console.error("Error checking door:", error);
                }
            }
        }
    }, 100); // Check every 5 seconds
}


class DoorComponent {
    constructor() {
        this.onPlace = this.onPlace.bind(this);
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    /**
     * Finds the solid block a lever is attached to by checking its block states.
     * This is more reliable than checking all neighbors.
     * @param {import("@minecraft/server").Block} leverBlock The lever block.
     * @returns {import("@minecraft/server").Block | null} The block the lever is attached to, or null if not found.
     */
    findAttachedBlockForLever(leverBlock) {
        const permutation = leverBlock.permutation;
        const facingDirection = permutation.getState("minecraft:facing_direction");

        // The facing_direction state tells us which way the base of the lever is attached.
        // 0: Down (attached to ceiling)
        // 1: Up (on the floor)
        // 2: North (on a south-facing wall)
        // 3: South (on a north-facing wall)
        // 4: West (on an east-facing wall)
        // 5: East (on a west-facing wall)
        switch (facingDirection) {
            case 0: return leverBlock.above(); // Attached to the ceiling, block is above
            case 1: return leverBlock.below(); // On the floor, block is below
            case 2: return leverBlock.south(); // Facing north, attached to a block to the south
            case 3: return leverBlock.north(); // Facing south, attached to a block to the north
            case 4: return leverBlock.east();  // Facing west, attached to a block to the east
            case 5: return leverBlock.west();  // Facing east, attached to a block to the west
            default: return null; // Should not happen with levers
        }
    }

    /**
     * Updates custom doors when a lever is toggled by scanning a 3x3 cube around the lever.
     * @param {import("@minecraft/server").Block} leverBlock The lever block that was interacted with.
     */
    updateCustomDoorsFromLever(leverBlock) {
        // Get the lever state to determine if it's being turned on or off
        const isLeverOn = leverBlock.permutation.getState("open_bit");
        const newState = isLeverOn; // When interacted, the lever will toggle, so we use the new state
        
        // Scan 3x3 cube around the lever
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const checkLocation = {
                        x: leverBlock.location.x + x,
                        y: leverBlock.location.y + y,
                        z: leverBlock.location.z + z
                    };
                    
                    try {
                        const checkBlock = leverBlock.dimension.getBlock(checkLocation);
                        if (checkBlock && !checkBlock.isAir) {
                            // Check if it's a custom door
                            if (checkBlock.typeId.includes("gaiadimension:") && checkBlock.typeId.includes("door")) {
                                let perm = checkBlock.permutation;
                                if (perm.getState("gaiadimension:open") !== undefined) {
                                    // Always update the door state to match the lever's new state
                                    checkBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                                    
                                    // Play sound when door is opened or closed
                                    checkBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", checkBlock.location, { volume: 1, pitch: 1 });
                                    
                                    // Special handling for custom doors - update both upper and lower halves
                                    if (checkBlock.typeId.includes("_lower")) {
                                        const upperBlock = checkBlock.above();
                                        if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                                            const upperPerm = upperBlock.permutation;
                                            if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                                                
                                                // Play sound when door is opened or closed
                                                upperBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, { volume: 1, pitch: 1 });
                                            }
                                        }
                                    }
                                    else if (checkBlock.typeId.includes("_upper")) {
                                        const lowerBlock = checkBlock.below();
                                        if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                                            const lowerPerm = lowerBlock.permutation;
                                            if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                                                lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                                                
                            
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        // Ignore errors for blocks that might not be accessible
                    }
                }
            }
        }
    }
    
    /**
     * Checks for and toggles custom doors in all six directions around a given block.
     * @param {import("@minecraft/server").Block} block The central block to check around.
     */
    checkCustomDoorsAroundBlock(block) {
        if (!block) return;
        
        const directions = ["north", "south", "east", "west", "above", "below"];
        for (const dir of directions) {
            const neighborBlock = block[dir]();
            if (neighborBlock && neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                // Using a short delay with system.run to ensure block state changes are applied properly.
                system.run(() => this.toggleCustomDoor(neighborBlock));
            }
        }
    }

    /**
     * Toggles a custom door's open/closed state.
     * Also handles the upper/lower parts of the door.
     * @param {import("@minecraft/server").Block} doorBlock The door block to toggle.
     */
    toggleCustomDoor(doorBlock) {
        const perm = doorBlock.permutation;
        const openState = perm.getState("gaiadimension:open");

        if (openState === undefined) return; // Not a custom door with an open state

        const newState = !openState;
        doorBlock.setPermutation(perm.withState("gaiadimension:open", newState));
        
        // Determine if this is the lower or upper part of the door
        const isLower = doorBlock.typeId.includes("_lower");
        const otherBlock = isLower ? doorBlock.above() : doorBlock.below();
        
        // Construct the expected typeId for the other half of the door
        const expectedOtherTypeId = isLower 
            ? doorBlock.typeId.replace("_lower", "_upper") 
            : doorBlock.typeId.replace("_upper", "_lower");

        // If the other block exists and is the correct type, toggle it as well.
        if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
            const otherPerm = otherBlock.permutation;
            if (otherPerm.getState("gaiadimension:open") !== undefined) {
                otherBlock.setPermutation(otherPerm.withState("gaiadimension:open", newState));
            }
        }
    }

    toggleDoor(block, player) {
        const isOpen = block.permutation.getState("gaiadimension:open");
        const isLower = block.typeId.includes("_lower");
        const otherBlock = isLower ? block.above() : block.below();

        if (otherBlock && otherBlock.typeId.includes("door")) {
            const expectedOtherBlockId = isLower 
                ? block.typeId.replace("_lower", "_upper") 
                : block.typeId.replace("_upper", "_lower");
            
            if (otherBlock.typeId === expectedOtherBlockId) {
                const newState = !isOpen;
                block.setPermutation(block.permutation.withState("gaiadimension:open", newState));
                otherBlock.setPermutation(otherBlock.permutation.withState("gaiadimension:open", newState));
                player.playSound(newState ? "random.door_open" : "random.door_close", { location: block.location, volume: 1, pitch: 1 });
            }
        }
    }

    toggleTrapdoor(block, player) {
        const isOpen = block.permutation.getState("gaiadimension:open");
        const newState = !isOpen;
        block.setPermutation(block.permutation.withState("gaiadimension:open", newState));
        player.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", { location: block.location, volume: 1, pitch: 1 });
    }

    onPlace(event) {
        const { block } = event;
        if (!block.typeId.includes("_lower")) return;

        activeDoors.push({ location: block.location, dimension: block.dimension, typeId: block.typeId });

        const blockAbove = block.above();
        if (blockAbove?.isAir) {
            const lowerPerm = block.permutation;
            const rotation = lowerPerm.getState("minecraft:cardinal_direction");
            const upperBlockId = block.typeId.replace("_lower", "_upper");
            
            try {
                const upperPerm = BlockPermutation.resolve(upperBlockId, {
                    "minecraft:cardinal_direction": rotation
                });
                blockAbove.setPermutation(upperPerm);
                activeDoors.push({ location: blockAbove.location, dimension: blockAbove.dimension, typeId: upperBlockId });

                for (const dir of ["north", "south", "east", "west"]) {
                    const neighbor = block[dir]();
                    if (neighbor?.typeId === block.typeId && neighbor.permutation.getState("minecraft:cardinal_direction") === rotation) {
                        if (neighbor.permutation.getState("gaiadimension:inverse") === false) {
                            block.setPermutation(block.permutation.withState("gaiadimension:inverse", true));
                            blockAbove.setPermutation(blockAbove.permutation.withState("gaiadimension:inverse", true));
                            break;
                        }
                    }
                }
            } catch (e) {
                console.error(`Could not resolve upper door permutation for ${block.typeId}: ${e}`);
            }
        }
    }

    onPlayerInteract(event) {
        const { player, block } = event;
        if (block.typeId.includes("trapdoor")) {
            this.toggleTrapdoor(block, player);
        } else if (block.typeId.includes("door")) {
            this.toggleDoor(block, player);
        }
    }
}

export function registerDoorComponent({ blockComponentRegistry }) {
    const doorComponent = new DoorComponent();
    blockComponentRegistry.registerCustomComponent("gaiadimension:door", doorComponent);

    initializeFireDoorSystem();

    registerBreakHandler({
        event: "before",
        check: (block) => block.typeId.includes('door'),
        execute: (event) => {
            const { block, player } = event;
            if (!block || !block.isValid) return;

            const location = block.location;
            const dimension = block.dimension;
            const brokenBlockTypeId = block.typeId;

            // --- Cleanup activeDoors list for the broken block ---
            const index = activeDoors.findIndex(d => d.location.x === location.x && d.location.y === location.y && d.location.z === location.z);
            if (index > -1) {
                activeDoors.splice(index, 1);
            }

            // --- Handle the OTHER half of the door ---
            const isLower = brokenBlockTypeId.includes("_lower");
            const otherBlockLocation = {
                x: location.x,
                y: location.y + (isLower ? 1 : -1),
                z: location.z
            };

            // --- Cleanup activeDoors list for the other block ---
            const otherIndex = activeDoors.findIndex(d => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
            if (otherIndex > -1) {
                activeDoors.splice(otherIndex, 1);
            }

            const otherBlock = dimension.getBlock(otherBlockLocation);
            if (otherBlock && otherBlock.typeId.includes("door")) {
                const expectedOtherBlockId = isLower
                    ? brokenBlockTypeId.replace("_lower", "_upper")
                    : brokenBlockTypeId.replace("_upper", "_lower");

                if (otherBlock.typeId === expectedOtherBlockId) {
                    if (player.getGameMode() !== "creative") {
                        const itemName = otherBlock.typeId.replace("_lower", "").replace("_upper", "");
                        system.run(() => {
                            try {
                                dimension.spawnItem(new ItemStack(itemName, 1), otherBlock.location);
                            } catch (e) {
                            }
                        });
                    }
                    system.run(() => {
                        // Re-fetch the block to be safe inside the closure
                        const blockToSet = dimension.getBlock(otherBlockLocation);
                        if(blockToSet && blockToSet.typeId === expectedOtherBlockId) {
                            blockToSet.setType('minecraft:air');
                        }
                    });
                }
            }
        }
    });

    registerInteractHandler({
        check: (block) => block.typeId.startsWith("minecraft:") && block.typeId.includes("lever"),
        execute: (event) => {
            const { block } = event;
            system.run(() => {
                doorComponent.updateCustomDoorsFromLever(block);
            });
        }
    });
};
