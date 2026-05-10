import { 
    EquipmentSlot, 
    world, 
    system, 
    GameMode, 
    Direction, 
    Player, 
    Block, 
    ItemStack, 
    BlockComponentRegistry, 
    EntityEquippableComponent,
    PlayerInteractWithBlockBeforeEvent 
} from "@minecraft/server";

/**
 * Handles the creation of double sandstone slabs.
 * @param {Player} player
 * @param {Block} block
 * @param {ItemStack} mainhandItem
 */
function handleDoubleSandstoneSlab(player: Player, block: Block, mainhandItem: ItemStack): void {
    const fullBlockId: string = block.typeId.replace("_slab", "");
    try {
        block.setType(fullBlockId);
        player.playSound("dig.stone");

        if (player.getGameMode() !== GameMode.Creative) {
            const equippable = player.getComponent("equippable") as EntityEquippableComponent;
            if (mainhandItem.amount > 1) {
                mainhandItem.amount--;
                equippable.setEquipment(EquipmentSlot.Mainhand, mainhandItem);
            } else {
                equippable.setEquipment(EquipmentSlot.Mainhand);
            }
        }
    } catch (e: unknown) {
        console.warn(`Failed to find full block type for ${block.typeId}. Error: ${e}`);
    }
}

export function registerSandstoneComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sandstone_slab", {});

    world.beforeEvents.playerInteractWithBlock.subscribe((event: PlayerInteractWithBlockBeforeEvent) => {
        const { player, block, itemStack, blockFace } = event;

        if (itemStack && block.typeId.includes("sandstone_slab") && itemStack.typeId === block.typeId) {
            const slabState = block.permutation.getState("minecraft:vertical_half") as string | undefined;
            const isPlacingOnTop: boolean = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom: boolean = blockFace === Direction.Down && slabState === "top";

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
