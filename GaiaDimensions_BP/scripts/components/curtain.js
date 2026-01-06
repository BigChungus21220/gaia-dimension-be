import { system, BlockPermutation, GameMode, ItemStack, world } from "@minecraft/server";
import { registerBreakHandler, registerInteractHandler, registerPlaceHandler } from "../systems/event_manager.js";

const activeCurtains = [];

function initializeCurtainSystem() {
    system.runInterval(() => {
        for (let i = activeCurtains.length - 1; i >= 0; i--) {
            const curtainInfo = activeCurtains[i];
            try {
                const block = curtainInfo.dimension.getBlock(curtainInfo.location);

                if (!block || block.typeId !== curtainInfo.typeId) {
                    // Curtain was destroyed or changed
                    const isLower = curtainInfo.typeId.includes("_lower");
                    const otherBlockLocation = {
                        x: curtainInfo.location.x,
                        y: curtainInfo.location.y + (isLower ? 1 : -1),
                        z: curtainInfo.location.z
                    };
                    const otherBlock = curtainInfo.dimension.getBlock(otherBlockLocation);

                    const expectedOtherTypeId = isLower
                        ? curtainInfo.typeId.replace("_lower", "_upper")
                        : curtainInfo.typeId.replace("_upper", "_lower");

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
                                checkBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", checkBlock.location, { volume: 1, pitch: 1 });
                                
                                if (checkBlock.typeId.includes("_lower")) {
                                    const upperBlock = checkBlock.above();
                                    if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                                        const upperPerm = upperBlock.permutation;
                                        if (upperPerm.getState("gaiadimension:open") !== undefined) {
                                            upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
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
    player.playSound(newState ? "random.door_open" : "random.door_close", { location: curtainBlock.location, volume: 1, pitch: 1 });

    const isLower = curtainBlock.typeId.includes("_lower");
    const otherBlock = isLower ? curtainBlock.above() : curtainBlock.below();
    
    const expectedOtherTypeId = isLower 
        ? curtainBlock.typeId.replace("_lower", "_upper") 
        : curtainBlock.typeId.replace("_upper", "_lower");

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

export function registerCurtainComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:curtain", {});

    initializeCurtainSystem();

    registerPlaceHandler({
        check: (block) => block.typeId.includes("_lower"),
        execute: (event) => {
            const { block } = event;
            activeCurtains.push({ location: block.location, dimension: block.dimension, typeId: block.typeId });

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
                    activeCurtains.push({ location: blockAbove.location, dimension: blockAbove.dimension, typeId: upperBlockId });

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
                    console.error(`Could not resolve upper curtain permutation for ${block.typeId}: ${e}`);
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

            const isLower = brokenBlockTypeId.includes("_lower");
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
