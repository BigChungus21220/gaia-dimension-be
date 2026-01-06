import { system, BlockPermutation, GameMode, ItemStack, world } from "@minecraft/server";
import { registerBreakHandler, registerInteractHandler, registerPlaceHandler } from "../systems/event_manager.js";

const activeCurtains = [];

const relativeDirs = {
    "north": { left: "west", right: "east" },
    "south": { left: "east", right: "west" },
    "east":  { left: "north", right: "south" },
    "west":  { left: "south", right: "north" }
};

function initializeCurtainSystem() {
    system.runInterval(() => {
        for (let i = activeCurtains.length - 1; i >= 0; i--) {
            const curtainInfo = activeCurtains[i];
            try {
                const block = curtainInfo.dimension.getBlock(curtainInfo.location);

                if (!block || block.typeId !== curtainInfo.typeId) {
                    // Curtain was destroyed or changed
                    const isLower = curtainInfo.typeId.includes("_lower") || curtainInfo.typeId.includes("_bottom");
                    const otherBlockLocation = {
                        x: curtainInfo.location.x,
                        y: curtainInfo.location.y + (isLower ? 1 : -1),
                        z: curtainInfo.location.z
                    };
                    const otherBlock = curtainInfo.dimension.getBlock(otherBlockLocation);

                    let expectedOtherTypeId;
                    if (curtainInfo.typeId.includes("_lower")) {
                        expectedOtherTypeId = curtainInfo.typeId.replace("_lower", "_upper");
                    } else if (curtainInfo.typeId.includes("_bottom")) {
                        expectedOtherTypeId = curtainInfo.typeId.replace("_bottom", "_top");
                    } else if (curtainInfo.typeId.includes("_upper")) {
                        expectedOtherTypeId = curtainInfo.typeId.replace("_upper", "_lower");
                    } else if (curtainInfo.typeId.includes("_top")) {
                        expectedOtherTypeId = curtainInfo.typeId.replace("_top", "_bottom");
                    }

                    if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
                        otherBlock.setType("minecraft:air");
                        const otherIndex = activeCurtains.findIndex(d => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
                        if (otherIndex > -1) {
                            activeCurtains.splice(otherIndex, 1);
                        }
                    }

                    activeCurtains.splice(i, 1); // Remove from list
                }
            } catch (error) {
                if (error.message.includes("Could not find block")) {
                    activeCurtains.splice(i, 1);
                } else {
                    console.error("Error checking curtain:", error);
                }
            }
        }
    }, 100); 
}

function updateCustomCurtainsFromLever(leverBlock) {
    const isLeverOn = leverBlock.permutation.getState("open_bit");
    const newState = isLeverOn; 
    
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
                        if (checkBlock.typeId.includes("gaiadimension:") && (checkBlock.typeId.includes("curtain") || checkBlock.typeId.includes("door"))) {
                            let perm = checkBlock.permutation;
                            if (perm.getState("gaiadimension:open") !== undefined) {
                                checkBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                                
                                const isCurtain = checkBlock.typeId.includes("curtain");
                                const openSound = isCurtain ? "item.book.page_turn" : "open.wooden_trapdoor";
                                const closeSound = isCurtain ? "item.book.page_turn" : "close.wooden_trapdoor";
                                
                                checkBlock.dimension.playSound(newState ? openSound : closeSound, checkBlock.location, { volume: 1, pitch: 1 });
                                
                                if (checkBlock.typeId.includes("_lower") || checkBlock.typeId.includes("_bottom")) {
                                    const upperBlock = checkBlock.above();
                                    if (upperBlock && !upperBlock.isAir && (upperBlock.typeId.includes("_upper") || upperBlock.typeId.includes("_top"))) {
                                        const upperPerm = upperBlock.permutation;
                                        if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                            upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                                            upperBlock.dimension.playSound(newState ? openSound : closeSound, upperBlock.location, { volume: 1, pitch: 1 });
                                        }
                                    }
                                }
                                else if (checkBlock.typeId.includes("_upper") || checkBlock.typeId.includes("_top")) {
                                    const lowerBlock = checkBlock.below();
                                    if (lowerBlock && !lowerBlock.isAir && (lowerBlock.typeId.includes("_lower") || lowerBlock.typeId.includes("_bottom"))) {
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
                }
            }
        }
    }
}

function toggleCustomCurtain(curtainBlock, player) {
    const perm = curtainBlock.permutation;
    const openState = perm.getState("gaiadimension:open");
    if (openState === undefined) return;

    const newState = !openState;
    curtainBlock.setPermutation(perm.withState("gaiadimension:open", newState));
    
    const isCurtain = curtainBlock.typeId.includes("curtain");
    const openSound = isCurtain ? "item.book.page_turn" : "random.door_open";
    const closeSound = isCurtain ? "item.book.page_turn" : "random.door_close";

    player.playSound(newState ? openSound : closeSound, { location: curtainBlock.location, volume: 1, pitch: 1 });

    const isLower = curtainBlock.typeId.includes("_lower") || curtainBlock.typeId.includes("_bottom");
    const otherBlock = isLower ? curtainBlock.above() : curtainBlock.below();
    
    let expectedOtherTypeId;
    if (curtainBlock.typeId.includes("_lower")) {
        expectedOtherTypeId = curtainBlock.typeId.replace("_lower", "_upper");
    } else if (curtainBlock.typeId.includes("_bottom")) {
        expectedOtherTypeId = curtainBlock.typeId.replace("_bottom", "_top");
    } else if (curtainBlock.typeId.includes("_upper")) {
        expectedOtherTypeId = curtainBlock.typeId.replace("_upper", "_lower");
    } else if (curtainBlock.typeId.includes("_top")) {
        expectedOtherTypeId = curtainBlock.typeId.replace("_top", "_bottom");
    }

    if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
        const otherPerm = otherBlock.permutation;
        if (otherPerm.getState("gaiadimension:open") !== undefined) {
            otherBlock.setPermutation(otherPerm.withState("gaiadimension:open", newState));
        }
    }
}

function toggleTrapdoor(block, player) {
    const isOpen = block.permutation.getState("gaiadimension:open");
    const newState = !isOpen;
    block.setPermutation(block.permutation.withState("gaiadimension:open", newState));
    player.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", { location: block.location, volume: 1, pitch: 1 });
}

function isValidNeighbor(neighbor, typeId, rotation) {
    return neighbor && neighbor.typeId === typeId && 
           neighbor.permutation.getState("minecraft:cardinal_direction") === rotation;
}

function updateToDouble(block, side) { // side: "left" or "right"
    system.run(() => {
     try {
         // Determine new type IDs
         const newTypeId = block.typeId + "_" + side;
         const topBlock = block.above();
         
         // Assuming consistent naming, verify top block exists
         if (!topBlock) return;
         
         const newTopTypeId = topBlock.typeId + "_" + side;
         
         // Store state
         const perm = block.permutation;
         const open = perm.getState("gaiadimension:open");
         const facing = perm.getState("minecraft:cardinal_direction");
         
         // Update Bottom
         block.setType(newTypeId);
         const newPerm = block.permutation.withState("gaiadimension:open", open).withState("minecraft:cardinal_direction", facing);
         block.setPermutation(newPerm);
         updateActiveCurtainType(block.location, newTypeId);
         
         // Update Top
         if (topBlock) {
             topBlock.setType(newTopTypeId);
             const newTopPerm = topBlock.permutation.withState("gaiadimension:open", open).withState("minecraft:cardinal_direction", facing);
             topBlock.setPermutation(newTopPerm);
             updateActiveCurtainType(topBlock.location, newTopTypeId);
         }
     } catch (e) {
         console.warn("Failed to form double curtain:", e);
     }
    });
}

function updateActiveCurtainType(location, newTypeId) {
    const entry = activeCurtains.find(c => c.location.x === location.x && c.location.y === location.y && c.location.z === location.z);
    if (entry) {
        entry.typeId = newTypeId;
    }
}

function destroyPartner(block, dimension) {
    system.run(() => {
    try {
        const typeId = block.typeId;
        // Derive item name from block type ID
        const itemName = typeId.replace("_lower", "").replace("_upper", "").replace("_bottom", "").replace("_top", "").replace("_left", "").replace("_right", "");
        
        // Spawn item for the partner
        try {
            dimension.spawnItem(new ItemStack(itemName, 1), block.location);
        } catch (e) {}

        // Remove partner block
        block.setType("minecraft:air");
        removeFromActiveCurtains(block.location);
         
         // Handle vertical counterpart of partner
         const isBottom = typeId.includes("_bottom") || typeId.includes("_lower");
         const otherVertical = isBottom ? block.above() : block.below();
         
         if (otherVertical && (otherVertical.typeId.includes("_top") || otherVertical.typeId.includes("_upper"))) {
             otherVertical.setType("minecraft:air");
             removeFromActiveCurtains(otherVertical.location);
         }
        
    } catch (e) {
        console.warn("Failed to destroy partner curtain:", e);
    }
    });
}

function removeFromActiveCurtains(location) {
    const index = activeCurtains.findIndex(d => d.location.x === location.x && d.location.y === location.y && d.location.z === location.z);
    if (index > -1) {
        activeCurtains.splice(index, 1);
    }
}

export function registerCurtainComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:curtain", {});

    initializeCurtainSystem();

    registerPlaceHandler({
        check: (block) => block.typeId.includes("_lower") || block.typeId.includes("_bottom"),
        execute: (event) => {
            const { block } = event;
            activeCurtains.push({ location: block.location, dimension: block.dimension, typeId: block.typeId });

            const blockAbove = block.above();
            if (blockAbove?.isAir) {
                const lowerPerm = block.permutation;
                const rotation = lowerPerm.getState("minecraft:cardinal_direction");
                
                let upperBlockId;
                if (block.typeId.includes("_lower")) {
                    upperBlockId = block.typeId.replace("_lower", "_upper");
                } else if (block.typeId.includes("_bottom")) {
                    upperBlockId = block.typeId.replace("_bottom", "_top");
                }
                
                try {
                    const upperPerm = BlockPermutation.resolve(upperBlockId, {
                        "minecraft:cardinal_direction": rotation
                    });
                    blockAbove.setPermutation(upperPerm);
                    activeCurtains.push({ location: blockAbove.location, dimension: blockAbove.dimension, typeId: upperBlockId });

                    // Double Curtain Logic
                    if ((block.typeId.includes("_bottom") || block.typeId.includes("_lower")) && 
                        !block.typeId.includes("_left") && !block.typeId.includes("_right")) {

                        const dirs = relativeDirs[rotation];
                        
                        if (dirs) {
                            // Try Right Neighbor (We become Left, They become Right)
                            const rightNeighbor = block[dirs.right]();
                            if (isValidNeighbor(rightNeighbor, block.typeId, rotation)) {
                                 updateToDouble(block, "left");
                                 updateToDouble(rightNeighbor, "right");
                            } else {
                                 // Try Left Neighbor (They become Left, We become Right)
                                 const leftNeighbor = block[dirs.left]();
                                 if (isValidNeighbor(leftNeighbor, block.typeId, rotation)) {
                                      updateToDouble(leftNeighbor, "left");
                                      updateToDouble(block, "right");
                                 }
                            }
                        }
                    }

                    // Original neighbor check (legacy support?)
                    // The previous code checked for 'gaiadimension:inverse' state. 
                    // This might interfere or be redundant if we are using separate blocks.
                    // But for non-double-curtain blocks, we might want to keep it?
                    // The user's request is specific to double curtains (implied by file generation).
                    // I'll leave it as fallback/legacy if not handled by above.
                    // Actually, if we transformed the block, typeId changed, so neighbor checks below might fail if they rely on old typeId.
                    // But below check uses 'block[dir]()' and checks 'neighbor.typeId === block.typeId'.
                    // If block type changed, block object might be stale?
                    // 'block' variable refers to the block object.
                    // If I called setType, does the 'block' variable update or point to old info?
                    // Usually in Script API, the Block object is a handle. It reflects current state.
                    // So if setType changed it, block.typeId should be new type.
                    // So the legacy loop might run on the new type.
                    // But new type ends with _left/_right.
                    // So it won't match standard neighbors.
                    // That seems fine.

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
                    console.error(`Could not resolve upper curtain permutation or double curtain logic for ${block.typeId}: ${e}`);
                }
            }
        }
    });

    registerBreakHandler({
        event: "before",
        check: (block) => block.typeId.includes('curtain') || block.typeId.includes('door'),
        execute: (event) => {
            const { block, player } = event;
            if (!block || !block.isValid) return;

            const location = block.location;
            const dimension = block.dimension;
            const brokenBlockTypeId = block.typeId;

            const index = activeCurtains.findIndex(d => d.location.x === location.x && d.location.y === location.y && d.location.z === location.z);
            if (index > -1) {
                activeCurtains.splice(index, 1);
            }
            
            // Double Curtain Reversion Logic
            if (brokenBlockTypeId.includes("_left") || brokenBlockTypeId.includes("_right")) {
                const rotation = block.permutation.getState("minecraft:cardinal_direction");
                const dirs = relativeDirs[rotation];
                const isLeft = brokenBlockTypeId.includes("_left");
                
                if (dirs) {
                    const partnerDir = isLeft ? dirs.right : dirs.left;
                    const partner = block[partnerDir]();
                    
                    const baseType = brokenBlockTypeId.replace("_left", "").replace("_right", "");
                    const partnerSuffix = isLeft ? "_right" : "_left";
                    const expectedPartnerType = baseType + partnerSuffix;
                    
                    if (partner && partner.typeId === expectedPartnerType && 
                        partner.permutation.getState("minecraft:cardinal_direction") === rotation) {
                        
                        destroyPartner(partner, dimension);
                    }
                }
            }

            const isLower = brokenBlockTypeId.includes("_lower") || brokenBlockTypeId.includes("_bottom");
            const otherBlockLocation = {
                x: location.x,
                y: location.y + (isLower ? 1 : -1),
                z: location.z
            };

            const otherIndex = activeCurtains.findIndex(d => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
            if (otherIndex > -1) {
                activeCurtains.splice(otherIndex, 1);
            }

            const otherBlock = dimension.getBlock(otherBlockLocation);
            if (otherBlock && (otherBlock.typeId.includes("curtain") || otherBlock.typeId.includes("door"))) {
                let expectedOtherBlockId;
                if (brokenBlockTypeId.includes("_lower")) {
                    expectedOtherBlockId = brokenBlockTypeId.replace("_lower", "_upper");
                } else if (brokenBlockTypeId.includes("_bottom")) {
                    expectedOtherBlockId = brokenBlockTypeId.replace("_bottom", "_top");
                } else if (brokenBlockTypeId.includes("_upper")) {
                    expectedOtherBlockId = brokenBlockTypeId.replace("_upper", "_lower");
                } else if (brokenBlockTypeId.includes("_top")) {
                    expectedOtherBlockId = brokenBlockTypeId.replace("_top", "_bottom");
                }

                if (otherBlock.typeId === expectedOtherBlockId) {
                    if (player.getGameMode() !== "creative") {
                        const itemName = otherBlock.typeId.replace("_lower", "").replace("_upper", "").replace("_bottom", "").replace("_top", "").replace("_left", "").replace("_right", "");
                        system.run(() => {
                            try {
                                dimension.spawnItem(new ItemStack(itemName, 1), otherBlock.location);
                            } catch (e) {
                            }
                        });
                    }
                    system.run(() => {
                        const blockToSet = dimension.getBlock(otherBlockLocation);
                        if(blockToSet && blockToSet.typeId === expectedOtherBlockId) {
                            blockToSet.setType('minecraft:air');
                        }
                    });
                }
            }
        }
    });

    // Interact Handler for Curtain/Trapdoor toggling
    registerInteractHandler({
        check: (block) => block.typeId.includes("curtain") || block.typeId.includes("door") || block.typeId.includes("trapdoor"),
        execute: (event) => {
             const { block, player } = event;
             system.run(() => {
                 if (block.typeId.includes("trapdoor")) {
                     toggleTrapdoor(block, player);
                 } else {
                     toggleCustomCurtain(block, player);
                 }
             });
        }
    });

    // Interact Handler for Levers
    registerInteractHandler({
        check: (block) => block.typeId.startsWith("minecraft:") && block.typeId.includes("lever"),
        execute: (event) => {
            const { block } = event;
            system.run(() => {
                updateCustomCurtainsFromLever(block);
            });
        }
    });
};