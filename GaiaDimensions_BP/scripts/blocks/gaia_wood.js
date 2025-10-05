import { world, system, BlockPermutation, GameMode, Direction } from "@minecraft/server";

const GAIA_NAMESPACE = "gaiadimension";

/**
 * A helper class for managing all logic related to custom wood blocks.
 */
class WoodHelper {

    /**
     * Handles the player interacting with a wood block.
     * This acts as a dispatcher to the correct logic based on the interaction.
     * @param {import("@minecraft/server").PlayerInteractWithBlockBeforeEvent} event
     */
    static handleInteract(event) {
        const { player, block, itemStack, blockFace } = event;

        // --- Double Slab Logic ---
        if (block.typeId.includes("_slab") && itemStack?.typeId === block.typeId) {
            const slabState = block.permutation.getState("minecraft:vertical_half");
            const isPlacingOnTop = blockFace === Direction.Up && slabState === "bottom";
            const isPlacingOnBottom = blockFace === Direction.Down && slabState === "top";

            if (isPlacingOnTop || isPlacingOnBottom) {
                event.cancel = true;
                system.run(() => this.createDoubleSlab(player, block, itemStack));
            }
        }
        // --- Axe Stripping Logic ---
        else if (itemStack?.hasTag('minecraft:is_axe')) {
            event.cancel = true;
            system.run(() => this.stripLog(player, block));
        }
    }

    /**
     * Creates a full block from two slabs.
     * @param {import("@minecraft/server").Player} player
     * @param {import("@minecraft/server").Block} block
     * @param {import("@minecraft/server").ItemStack} mainhandItem
     */
    static createDoubleSlab(player, block, mainhandItem) {
        if (!block.isValid) return;
        
        const plankId = block.typeId.replace("_slab", "_planks");
        try {
            block.setType(plankId);

            if (player.gameMode !== GameMode.Creative) {
                const equippable = player.getComponent("equippable");
                if (mainhandItem.amount > 1) {
                    mainhandItem.amount--;
                    equippable.setEquipment("Mainhand", mainhandItem);
                } else {
                    equippable.setEquipment("Mainhand");
                }
            }
        } catch (e) {
            console.warn(`[WoodHelper] Failed to find plank type for ${block.typeId}: ${e}`);
        }
    }

    /**
     * Strips a log or wood block when a player uses an axe on it.
     * @param {import("@minecraft/server").Player} player
     * @param {import("@minecraft/server").Block} block
     */
    static stripLog(player, block) {
        if (!block.isValid) return;

        const blockId = block.typeId;
        if (blockId.includes("stripped")) return;

        let strippedId;
        if (blockId.includes("_log") || blockId.includes("_wood")) {
            const parts = blockId.split(':');
            strippedId = `${parts[0]}:stripped_${parts[1]}`;
        }

        if (strippedId) {
            try {
                const oldPermutation = block.permutation;
                let newPermutation;

                // Preserve the orientation of the log/wood
                const axis = oldPermutation.getState("pillar_axis") ?? oldPermutation.getState("minecraft:block_face");
                if (axis) {
                    const stateName = oldPermutation.getState("pillar_axis") ? "pillar_axis" : "minecraft:block_face";
                    newPermutation = BlockPermutation.resolve(strippedId, { [stateName]: axis });
                } else {
                    newPermutation = BlockPermutation.resolve(strippedId);
                }
                
                block.setPermutation(newPermutation);
                player.playSound('use.wood', block.location);
            } catch (e) {
                console.warn(`[WoodHelper] Failed to create stripped permutation for ${strippedId}: ${e}`);
            }
        }
    }
}

/**
 * Registers all event handlers for custom wood blocks.
 */
export function registerWoodComponent({ blockComponentRegistry }) {
    // Register a custom component for identification if needed by other systems.
    blockComponentRegistry.registerCustomComponent(`gaiadimension:wood`, {});

    // Subscribe to the player interaction event.
    world.beforeEvents.playerInteractWithBlock.subscribe(WoodHelper.handleInteract.bind(WoodHelper));
}
