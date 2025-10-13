import { system, world } from "@minecraft/server";
import { RedstoneControl } from "../systems/Redstone.js";
import { registerBreakHandler } from "../systems/event_manager.js";

const BUTTON_SUFFIX = "_button";
const PRESS_DURATION = 1.5 * 20; // 2 seconds
const VANILLA_BUTTON_DURATION = 1.5 * 20; // 2 seconds for vanilla buttons too

class ButtonComponent {
    constructor() {
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    isCustomButton(blockTypeId) {
        return blockTypeId.endsWith(BUTTON_SUFFIX);
    }
    
    isVanillaButton(blockTypeId) {
        return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("button");
    }

    getSoundName(blockTypeId, isPressing) {
        if (this.isCustomButton(blockTypeId)) {
            // Using a generic sound name that should work for all wood types
            return isPressing ? 
                "click_on.bamboo_wood_button" : 
                "click_off.bamboo_wood_button";
        }
        return "";
    }

    updateNeighbors(buttonBlock, newState) {
        // STEP 1: Find the solid block that the button is attached to
        const solidBlock = this.findSolidBlock(buttonBlock);
        if (solidBlock) {
            // STEP 2: Check all directions from the solid block to find doors
            this.checkAllDirectionsFromSolidBlock(solidBlock, newState);
        }
        
        // Also update any direct neighbors that might be doors
        const directions = ["north", "south", "east", "west", "above", "below"];
        for (const dir of directions) {
            const neighborBlock = buttonBlock[dir]();
            if (neighborBlock && !neighborBlock.isAir) {
                let perm = neighborBlock.permutation;
                if (perm.getState("gaiadimension:open") !== undefined) {
                    neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                }
                if (perm.getState("open_bit") !== undefined && !neighborBlock.typeId.includes("lever")) {
                    neighborBlock.setPermutation(perm.withState("open_bit", newState));
                }
                // Also check for generic "open" state
                if (perm.getState("open") !== undefined && !neighborBlock.typeId.includes("lever")) {
                    neighborBlock.setPermutation(perm.withState("open", newState));
                }
                
                // Special handling for custom doors - update both upper and lower halves
                if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    let perm = neighborBlock.permutation;
                    if (perm.getState("gaiadimension:open") !== undefined) {
                        neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                    }
                    
                    // Special handling for custom doors - update both upper and lower halves
                    if (neighborBlock.typeId.includes("_lower")) {
                        const upperBlock = neighborBlock.above();
                        if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                            const upperPerm = upperBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                            }
                        }
                    }
                    else if (neighborBlock.typeId.includes("_upper")) {
                        const lowerBlock = neighborBlock.below();
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
    }
    
    findSolidBlock(buttonBlock) {
        const blockFace = buttonBlock.permutation.getState("minecraft:block_face");
        switch (blockFace) {
            case "down": return buttonBlock.above();
            case "up": return buttonBlock.below();
            case "north": return buttonBlock.south();
            case "south": return buttonBlock.north();
            case "west": return buttonBlock.east();
            case "east": return buttonBlock.west();
            default: return null;
        }
    }
    
    checkAllDirectionsFromSolidBlock(solidBlock, newState) {
        if (!solidBlock) return;
        
        // Check all directions from the solid block to find doors
        const directions = ["north", "south", "east", "west", "above", "below"];
        for (const dir of directions) {
            const neighborBlock = solidBlock[dir]();
            if (neighborBlock && !neighborBlock.isAir) {
                // Check if it's a custom door
                if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    // Handle custom doors with upper/lower halves
                    if (neighborBlock.typeId.includes("_upper")) {
                        // Found upper door half, now update it and the lower half below it
                        const lowerDoorBlock = neighborBlock.below();
                        if (lowerDoorBlock && !lowerDoorBlock.isAir && lowerDoorBlock.typeId.includes("_lower")) {
                            // Update upper door half
                            let upperPerm = neighborBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                neighborBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                            }
                            
                            // Update lower door half
                            let lowerPerm = lowerDoorBlock.permutation;
                            if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                                lowerDoorBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                            }
                        }
                    } else if (neighborBlock.typeId.includes("_lower")) {
                        // Found lower door half, now update it and the upper half above it
                        const upperDoorBlock = neighborBlock.above();
                        if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
                            // Update lower door half
                            let lowerPerm = neighborBlock.permutation;
                            if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                                neighborBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                            }
                            
                            // Update upper door half
                            let upperPerm = upperDoorBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                upperDoorBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                            }
                        }
                    } else {
                        // Single door block
                        let perm = neighborBlock.permutation;
                        if (perm.getState("gaiadimension:open") !== undefined) {
                            neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                        }
                    }
                }
                // Handle vanilla doors
                else if (neighborBlock.typeId.startsWith("minecraft:") && 
                         (neighborBlock.typeId.includes("door") || 
                          neighborBlock.typeId.includes("trapdoor") ||
                          neighborBlock.typeId.includes("fence_gate"))) {
                    let perm = neighborBlock.permutation;
                    // Try open_bit state first
                    if (perm.getState("open_bit") !== undefined) {
                        neighborBlock.setPermutation(perm.withState("open_bit", newState));
                    }
                }
            }
        }
    }

    handleCustomButtonPress(player, block) {
        const currentState = block.permutation.getState("gaiadimension:pressed");
        if (currentState === false) {
            // Visual state change
            block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
            
            // Sound
            const pressSound = this.getSoundName(block.typeId, true);
            if (pressSound) {
                player.playSound(pressSound, { location: block.location, volume: 1, pitch: 1 });
            }

            const attachedBlock = this.findSolidBlock(block);
            if (attachedBlock) {
                const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
                RedstoneControl.setRedstonePower(attachedBlock.location, 15, sourceId);
            }

            // Schedule the button to release
            system.runTimeout(() => {
                // Check if the block is still valid before proceeding
                if (block.isValid) {
                    try {
                        // Visual state change
                        block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
                    } catch (e) {
                        // Ignore error if block is no longer valid
                    }

                    // Sound
                    const releaseSound = this.getSoundName(block.typeId, false);
                    if (releaseSound) {
                        player.playSound(releaseSound, { location: block.location, volume: 1, pitch: 1 });
                    }

                    if (attachedBlock) {
                        const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
                        RedstoneControl.setRedstonePower(attachedBlock.location, 0, sourceId);
                    }
                }
            }, PRESS_DURATION);
        }
    }
    
    handleVanillaButtonPress(player, block) {
        // For vanilla buttons, we just need to open the custom doors
        // The button press itself is handled by Minecraft
        this.updateCustomDoorsOnly(block, true);
        
        // Schedule the custom doors to close
        system.runTimeout(() => {
            this.updateCustomDoorsOnly(block, false);
        }, VANILLA_BUTTON_DURATION);
    }

    updateCustomDoorsOnly(buttonBlock, newState) {
        const dimension = buttonBlock.dimension;
        const center = buttonBlock.location;
        const checkedDoors = new Set(); // To avoid toggling the same door twice

        // Scan a 3x3x3 cube around the button
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const checkLocation = { x: center.x + x, y: center.y + y, z: center.z + z };
                    const block = dimension.getBlock(checkLocation);

                    if (block && block.typeId.includes("door") && !block.typeId.includes("trapdoor")) {
                        
                        let lowerHalf, upperHalf;
                        if (block.typeId.includes("_lower")) {
                            lowerHalf = block;
                            upperHalf = block.above();
                        } else if (block.typeId.includes("_upper")) {
                            upperHalf = block;
                            lowerHalf = block.below();
                        } else {
                            continue;
                        }

                        if (!lowerHalf || !upperHalf || !lowerHalf.typeId.includes("_lower") || !upperHalf.typeId.includes("_upper")) {
                            continue;
                        }
                        
                        const lowerKey = `${lowerHalf.location.x},${lowerHalf.location.y},${lowerHalf.location.z}`;
                        if (checkedDoors.has(lowerKey)) {
                            continue;
                        }
                        checkedDoors.add(lowerKey);

                        const blocksToToggle = [lowerHalf, upperHalf];
                        for (const doorBlock of blocksToToggle) {
                            let perm = doorBlock.permutation;
                            if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== newState) {
                                doorBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                                
                                doorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", doorBlock.location, { volume: 1, pitch: 1 });
                                
                                if (newState) {
                                    RedstoneControl.openAndTrackDoor(doorBlock, buttonBlock);
                                } else {
                                    RedstoneControl.updateDoorTracker(doorBlock, buttonBlock);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    checkCustomDoorsFromSolidBlock(solidBlock, newState, sourceBlock) {
        if (!solidBlock) return;
        
        // Check all directions from the solid block to find custom doors only
        const directions = ["north", "south", "east", "west", "above", "below"];
        for (const dir of directions) {
            const neighborBlock = solidBlock[dir]();
            if (neighborBlock && !neighborBlock.isAir) {
                // Check if it's a custom door
                if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
                    // Handle custom doors with upper/lower halves
                    if (neighborBlock.typeId.includes("_upper")) {
                        // Found upper door half, now update it and the lower half below it
                        const lowerDoorBlock = neighborBlock.below();
                        if (lowerDoorBlock && !lowerDoorBlock.isAir && lowerDoorBlock.typeId.includes("_lower")) {
                            // Update upper door half
                            let upperPerm = neighborBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== newState) {
                                neighborBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                                
                                // Play sound when door is opened or closed
                                neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                                
                                // Start tracking the door if it's being opened
                                if (newState) {
                                    RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                                }
                            }
                            
                            // Update lower door half
                            let lowerPerm = lowerDoorBlock.permutation;
                            if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== newState) {
                                lowerDoorBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                                
                                // Play sound when door is opened or closed
                                lowerDoorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerDoorBlock.location, { volume: 1, pitch: 1 });
                                
                                // Start tracking the door if it's being opened
                                if (newState) {
                                    RedstoneControl.openAndTrackDoor(lowerDoorBlock, sourceBlock);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(lowerDoorBlock, sourceBlock);
                                }
                            }
                        }
                    } else if (neighborBlock.typeId.includes("_lower")) {
                        // Found lower door half, now update it and the upper half above it
                        const upperDoorBlock = neighborBlock.above();
                        if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
                            // Update lower door half
                            let lowerPerm = neighborBlock.permutation;
                            if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== newState) {
                                neighborBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                                
                                // Play sound when door is opened or closed
                                neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                                
                                // Start tracking the door if it's being opened
                                if (newState) {
                                    RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                                }
                            }
                            
                            // Update upper door half
                            let upperPerm = upperDoorBlock.permutation;
                            if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== newState) {
                                upperDoorBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                                
                                // Play sound when door is opened or closed
                                upperDoorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperDoorBlock.location, { volume: 1, pitch: 1 });
                                
                                // Start tracking the door if it's being opened
                                if (newState) {
                                    RedstoneControl.openAndTrackDoor(upperDoorBlock, sourceBlock);
                                } else {
                                    // Update tracker if door is being closed
                                    RedstoneControl.updateDoorTracker(upperDoorBlock, sourceBlock);
                                }
                            }
                        }
                    } else {
                        // Single door block
                        let perm = neighborBlock.permutation;
                        if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== newState) {
                            neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                            
                            // Play sound when door is opened or closed
                            neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
                            
                            // Start tracking the door if it's being opened
                            if (newState) {
                                RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                            } else {
                                // Update tracker if door is being closed
                                RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                            }
                        }
                    }
                }
            }
        }
    }

    onPlayerInteract(event) {
        const { player, block } = event;
        if (this.isCustomButton(block.typeId)) {
            this.handleCustomButtonPress(player, block);
        } else if (this.isVanillaButton(block.typeId)) {
            this.handleVanillaButtonPress(player, block);
        }
    }
    
    
}




export function registerButtonComponent({ blockComponentRegistry }) {
    const buttonComponent = new ButtonComponent();
    
    // Subscribe to player interact with block event for vanilla button support
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        system.run(() => {
            const { player, block } = event;
            // Only handle vanilla buttons (minecraft: namespace buttons)
            if (block.typeId.startsWith("minecraft:") && block.typeId.includes("button")) {
                // For vanilla buttons, we need to handle both direct adjacent doors AND network-traced doors
                // 1. Handle doors directly adjacent to the button (existing functionality)
                buttonComponent.updateCustomDoorsOnly(block, true);
                
                // 2. Trace the redstone network to find doors further away
                const foundDoors = RedstoneControl.traceNetworkForDoors(block);
                
                // Open found doors and start tracking them
                for (const doorInfo of foundDoors) {
                    RedstoneControl.openAndTrackDoor(doorInfo.block, block);
                }
                
                // Schedule the custom doors to close
                system.runTimeout(() => {
                    buttonComponent.updateCustomDoorsOnly(block, false);
                }, VANILLA_BUTTON_DURATION);
            }
            // Handle vanilla levers
            else if (block.typeId.startsWith("minecraft:") && block.typeId.includes("lever")) {
                // For vanilla levers, we need to handle both direct adjacent doors AND network-traced doors
                // 1. Handle doors directly adjacent to the lever (existing functionality)
                buttonComponent.updateCustomDoorsOnly(block, true);
                
                // 2. Trace the redstone network and open custom doors
                const foundDoors = RedstoneControl.traceNetworkForDoors(block);
                
                // Open found doors and start tracking them
                for (const doorInfo of foundDoors) {
                    RedstoneControl.openAndTrackDoor(doorInfo.block, block);
                }
            }
        });
    });
    
    // Register custom component for custom buttons
    blockComponentRegistry.registerCustomComponent("gaiadimension:button", {
        onPlayerInteract: (e) => system.run(() => buttonComponent.onPlayerInteract(e))
    });

    registerBreakHandler({
        event: "before",
        check: (block) => buttonComponent.isCustomButton(block.typeId),
        execute: (event) => {
            const { block } = event;
            const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
            RedstoneControl.removeRedstonePower(sourceId);
        }
    });
}
