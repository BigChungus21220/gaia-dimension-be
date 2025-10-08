import { world, system, BlockPermutation, GameMode, Direction } from "@minecraft/server";

/**
 * Handles the creation of double slabs.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").ItemStack | undefined} mainhandItem
 */
function handleDoubleSlab(player, block, mainhandItem) {
    const plankId = block.typeId.replace("_slab", "_planks");
    try {
        block.setType(plankId);

        if (player.getGameMode() !== GameMode.Creative) {
            const equippable = player.getComponent("equippable");
            if (mainhandItem.amount > 1) {
                mainhandItem.amount--;
                equippable.setEquipment("Mainhand", mainhandItem);
            } else {
                equippable.setEquipment("Mainhand");
            }
        }
    } catch (e) {
        console.warn(`Failed to find plank type for ${block.typeId}`);
    }
}


export function registerWoodComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:wood", {});

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        const { player, block, itemStack, blockFace } = event;

        // --- Double Slab Logic ---
        if (block.typeId.includes("_slab") && itemStack?.typeId === block.typeId) {
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
                if (blockId.includes("stripped")) return;

                let strippedId;

                if (blockId.includes("hollowed")) {
                    strippedId = blockId.replace("hollowed", "stripped_hollowed");
                } else if (blockId.includes("_thin_branches")) {
                    strippedId = blockId.replace("gaiadimension:", "gaiadimension:stripped_");
                } else if (blockId.includes("_log") || blockId.includes("_wood")) {
                    const parts = blockId.split(':');
                    strippedId = `${parts[0]}:stripped_${parts[1]}`;
                }
    
                if (strippedId) {
                    if (block.isValid) {
                        if (blockId.includes("_thin_branches")) {
                            const oldPermutation = block.permutation;
                            const newPermutation = BlockPermutation.resolve(strippedId);
                                
                            const states = oldPermutation.getAllStates();
                            let newBlock = newPermutation;
                            for(const state in states){
                                newBlock = newBlock.withState(state, states[state]);
                            }
        
                            block.setPermutation(newBlock);
                        } else if (blockId.startsWith("minecraft:")) {
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