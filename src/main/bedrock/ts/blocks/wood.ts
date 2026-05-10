import {
    world,
    system,
    BlockPermutation,
    GameMode,
    Direction,
    Player,
    Block,
    ItemStack,
    BlockComponentRegistry,
    EntityEquippableComponent,
    PlayerInteractWithBlockBeforeEvent
} from "@minecraft/server";

// Module augmentation for methods used in this file that are not in the standard @minecraft/server types
declare module "@minecraft/server" {
    interface Block {
        /**
         * Custom method to set the block type.
         * Note: Official method is setByTypeId
         */
        setType(typeId: string): void;
    }
}

/**
 * Handles the creation of double slabs.
 * @param player The player performing the action
 * @param block The block being interacted with
 * @param mainhandItem The item in the player's main hand
 */
function handleDoubleSlab(player: Player, block: Block, mainhandItem: ItemStack): void {
    let plankId: string = block.typeId.replace("_slab", "_planks");
    try {
        // Try setting to planks first
        block.setType(plankId);
    } catch (e: unknown) {
        // If planks don't exist, try tiles
        try {
            plankId = block.typeId.replace("_slab", "_tiles");
            block.setType(plankId);
        } catch (e2: unknown) {
            console.warn(`Failed to find plank or tile type for ${block.typeId}`);
            return; // Stop here if both fail
        }
    }

    // Common logic after successful setType
    try {
        player.playSound("dig.wood");

        if (player.getGameMode() === GameMode.creative) {
            return;
        }

        const equippable: EntityEquippableComponent | undefined = player.getComponent("equippable") as EntityEquippableComponent | undefined;
        if (!equippable) {
            return;
        }

        if (mainhandItem.amount > 1) {
            mainhandItem.amount--;
            equippable.setEquipment("Mainhand", mainhandItem);
        } else {
            equippable.setEquipment("Mainhand");
        }
    } catch (e: unknown) {
        console.warn(`Error in handleDoubleSlab post-placement: ${e}`);
    }
}


export function registerWoodComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:wood", {});

    world.beforeEvents.playerInteractWithBlock.subscribe((event: PlayerInteractWithBlockBeforeEvent): void => {
        const { player, block, itemStack, blockFace } = event;

        // --- Double Slab Logic ---
        if (block.typeId.includes("_slab") && !block.typeId.includes("sandstone") && itemStack?.typeId === block.typeId) {
            const slabState: string | number | boolean | undefined = block.permutation.getState("minecraft:vertical_half");
            const isPlacingOnTop: boolean = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom: boolean = blockFace === Direction.Down && slabState === "top";

            if (isPlacingOnTop || isPlacingOnBottom) {
                event.cancel = true;
                system.run((): void => {
                    if (block.isValid && itemStack) {
                        handleDoubleSlab(player, block, itemStack);
                    }
                });
            }
        }
        // --- Axe Stripping Logic ---
        else if (itemStack?.hasTag('minecraft:is_axe')) {
            event.cancel = true;
            system.run((): void => {
                const blockId: string = block.typeId;
                if (blockId.includes("stripped") || blockId.includes("_thin_branches")) return;

                let strippedId: string | undefined;
                if (blockId.includes("_log") || blockId.includes("_wood")) {
                    const parts: string[] = blockId.split(':');
                    strippedId = `${parts[0]}:stripped_${parts[1]}`;
                }

                if (strippedId && block.isValid) {
                    if (blockId.startsWith("minecraft:")) {
                        const blockState: string | number | boolean | undefined = block.permutation.getState("pillar_axis");
                        if (typeof blockState === "string") {
                            const strippedLog: BlockPermutation = BlockPermutation.resolve(strippedId, { "pillar_axis": blockState });
                            block.setPermutation(strippedLog);
                        }
                    } else {
                        const blockState: string | number | boolean | undefined = block.permutation.getState("minecraft:block_face");
                        if (typeof blockState === "string") {
                            const strippedLog: BlockPermutation = BlockPermutation.resolve(strippedId, { "minecraft:block_face": blockState });
                            block.setPermutation(strippedLog);
                        }
                    }
                    player.playSound('step.wood');
                }
            });
        }
    });
}
