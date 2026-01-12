import { world, system, BlockPermutation, GameMode, Direction } from "@minecraft/server";

/**
 * Handles the creation of double slabs for ore/brick variants.
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Block} block
 * @param {import("@minecraft/server").ItemStack} mainhandItem
 */
function handleDoubleOreSlab(player, block, mainhandItem) {
    const baseId = block.typeId.replace("_slab", "");
    const possibleIds = [baseId, baseId + "s"];
    
    let success = false;

    for (const fullBlockId of possibleIds) {
        try {
            // Validate the block type before attempting to set it
            BlockPermutation.resolve(fullBlockId);
            block.setType(fullBlockId);
            success = true;
            break; 
        } catch (e) {
            // Continue to next possible ID
        }
    }

    if (success) {
        player.playSound("dig.stone");

        if (player.getGameMode() !== GameMode.Creative) {
            const equippable = player.getComponent("equippable");
            if (mainhandItem.amount > 1) {
                mainhandItem.amount--;
                equippable.setEquipment("Mainhand", mainhandItem);
            } else {
                equippable.setEquipment("Mainhand");
            }
        }
    } else {
        // Only warn if absolutely no matching block was found after checking all possibilities
        console.warn(`Failed to find full block type for ${block.typeId}. Tried: ${possibleIds.join(", ")}`);
    }
}

export function registerStoneSlabComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:stone_slab", {});

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        const { player, block, itemStack, blockFace } = event;

        // Check if it's a Gaia Dimension slab (excluding sandstone which is handled separately)
        if (block.typeId.startsWith("gaiadimension:") && 
            block.typeId.endsWith("_slab") && 
            !block.typeId.includes("sandstone") && 
            itemStack?.typeId === block.typeId) {

            const slabState = block.permutation.getState("minecraft:vertical_half");
            const isPlacingOnTop = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom = blockFace === Direction.Down && slabState === "top";

            if (isPlacingOnTop || isPlacingOnBottom) {
                event.cancel = true;
                system.run(() => {
                    if (block.isValid) {
                        handleDoubleOreSlab(player, block, itemStack);
                    }
                });
            }
        }
    });
}
