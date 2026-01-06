import { world, system, BlockPermutation, GameMode, Direction } from "@minecraft/server";

/**
 * Handles the creation of double slabs.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").ItemStack | undefined} mainhandItem
 */
function handleDoubleSlab(player, block, mainhandItem) {
    let plankId = block.typeId.replace("_slab", "_planks");
    try {
        // Try setting to planks first
        block.setType(plankId);
    } catch (e) {
        // If planks don't exist, try tiles
        try {
            plankId = block.typeId.replace("_slab", "_tiles");
            block.setType(plankId);
        } catch (e2) {
             console.warn(`Failed to find plank or tile type for ${block.typeId}`);
             return; // Stop here if both fail
        }
    }

    // Common logic after successful setType
    try {
        player.playSound("dig.wood");

        if (player.getGameMode() !== "creative") {
            const equippable = player.getComponent("equippable");
            if (mainhandItem.amount > 1) {
                mainhandItem.amount--;
                equippable.setEquipment("Mainhand", mainhandItem);
            } else {
                equippable.setEquipment("Mainhand");
            }
        }
    } catch (e) {
        console.warn(`Error in handleDoubleSlab post-placement: ${e}`);
    }
}


export function registerWoodComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:wood", {});

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        const { player, block, itemStack, blockFace } = event;

        // --- Double Slab Logic ---
                if (block.typeId.includes("_slab") && !block.typeId.includes("sandstone") && itemStack?.typeId === block.typeId) {
            const slabState = block.permutation.getState("minecraft:vertical_half");
            const isPlacingOnTop = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom = blockFace === Direction.Down && slabState === "top";

            if (isPlacingOnTop || isPlacingOnBottom) {
                event.cancel = true;
                system.run(() => {
                    if (block.isValid) {
                        handleDoubleSlab(player, block, itemStack);
                    }
                });
            }
        }
        // --- Axe Stripping Logic ---
        else if (itemStack?.hasTag('minecraft:is_axe')) {
            event.cancel = true;
            system.run(() => {
                const blockId = block.typeId;
                if (blockId.includes("stripped") || blockId.includes("_thin_branches")) return;

                let strippedId;
                (blockId.includes("_log") || blockId.includes("_wood")); {
                    const parts = blockId.split(':');
                    strippedId = `${parts[0]}:stripped_${parts[1]}`;
                }
    
                if (strippedId) {
                    if (block.isValid) {
                        if (blockId.startsWith("minecraft:")) {
                            const blockState = block.permutation.getState("pillar_axis");
                            if (blockState) {
                                const strippedLog = BlockPermutation.resolve(strippedId, {"pillar_axis": blockState});
                                block.setPermutation(strippedLog);
                            }
                        } else {
                            const blockState = block.permutation.getState("minecraft:block_face");
                            if (blockState) {
                                const strippedLog = BlockPermutation.resolve(strippedId, {"minecraft:block_face": blockState});
                                block.setPermutation(strippedLog);
                            }
                        }
                        player.playSound('step.wood');
                    }
                }
            });
        }
    });
}