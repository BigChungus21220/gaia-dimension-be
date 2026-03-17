import { world, system, BlockPermutation, GameMode, Direction, Player, Block, ItemStack, BlockComponentRegistry, EntityEquippableComponent } from "@minecraft/server";

/**
 * Handles the creation of double sandstone slabs.
 * @param {Player} player
 * @param {Block} block
 * @param {ItemStack} mainhandItem
 */
function handleDoubleSandstoneSlab(player: Player, block: Block, mainhandItem: ItemStack): void {
    const fullBlockId = block.typeId.replace("_slab", "");
    try {
        block.setType(fullBlockId);
        player.playSound("dig.stone");

        if (player.getGameMode() !== GameMode.Creative) {
            const equippable = player.getComponent("equippable") as EntityEquippableComponent;
            if (mainhandItem.amount > 1) {
                mainhandItem.amount--;
                equippable.setEquipment("Mainhand", mainhandItem);
            } else {
                equippable.setEquipment("Mainhand");
            }
        }
    } catch (e) {
        console.warn(`Failed to find full block type for ${block.typeId}`);
    }
}

export function registerSandstoneComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sandstone_slab", {});

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        const { player, block, itemStack, blockFace } = event;

        if (block.typeId.includes("sandstone_slab") && itemStack?.typeId === block.typeId) {
            const slabState = block.permutation.getState("minecraft:vertical_half" as any);
            const isPlacingOnTop = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom = blockFace === Direction.Down && slabState === "top";

            if (isPlacingOnTop || isPlacingOnBottom) {
                event.cancel = true;
                system.run(() => {
                    if (block.isValid) {
                        handleDoubleSandstoneSlab(player, block, itemStack);
                    }
                });
            }
        }
    });
}
