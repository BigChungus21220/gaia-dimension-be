import { system, ItemStack, BlockPermutation } from '@minecraft/server';

// --- Define the logic for each block type in its own function ---

/**
 * Handles the interaction logic for all custom log blocks.
 * @param {import('@minecraft/server').BlockPlayerInteractEvent} event
 */
function handleLogInteraction(event) {
    const { block, player } = event;
    const equipment = player.getComponent('equippable');
    const selectedItem = equipment.getEquipment('Mainhand');

    // Check if the player is using an axe
    if (!selectedItem?.hasTag('minecraft:is_axe')) return;

    const strippedLogId = block.typeId.replace(':', ':stripped_');
    const blockState = block.permutation.getState("minecraft:block_face");

    try {
        const strippedLogPermutation = BlockPermutation.resolve(strippedLogId, { "minecraft:block_face": blockState });
        block.setPermutation(strippedLogPermutation);
        player.playSound('step.wood', { location: block.location });
    } catch (e) {
        console.error(`Failed to find stripped log permutation for ${block.typeId}. Ensure ${strippedLogId} exists.`);
    }
}

/**
 * Handles the interaction logic for all custom slab blocks.
 * @param {import('@minecraft/server').BlockPlayerInteractEvent} event
 */
function handleSlabInteraction(event) {
    const { block, player, face } = event;
    const equipment = player.getComponent('equippable');
    const selectedItem = equipment.getEquipment('Mainhand');

    // Check if player is using the same slab type on the block
    if (selectedItem?.typeId !== block.typeId) return;
    
    // Check if the slab is already a double slab
    if (block.permutation.getState(`kai:double`)) return;

    const verticalHalf = block.permutation.getState('minecraft:vertical_half');
    const isBottomUp = verticalHalf === 'bottom' && face === 'Up';
    const isTopDown = verticalHalf === 'top' && face === 'Down';

    if (isBottomUp || isTopDown) {
        if (player.gameMode !== "creative") {
            selectedItem.amount -= 1;
            equipment.setEquipment('Mainhand', selectedItem.amount === 0 ? undefined : selectedItem);
        }
        // The 'kai:double' state seems to be custom. Ensure it exists on your blocks.
        block.setPermutation(block.permutation.withState(`kai:double`, true));
        block.setWaterlogged(false);
        player.playSound('use.stone', { location: block.location });
    }
}

// --- The single component that routes logic based on block type ---

const unifiedInteractionHandler = {
    onPlayerInteract(event) {
        const { block } = event;

        // ** LOGIC ROUTER **
        // Check the block's ID and call the appropriate handler.
        if (block.typeId.includes('_log')) {
            handleLogInteraction(event);
        } else if (block.typeId.includes('_slab')) {
            handleSlabInteraction(event);
        }
        // Add more 'else if' conditions here for other block types like stairs, fences, etc.
    },

    onPlayerDestroy(event) {
        const { block, player, destroyedBlockPermutation } = event;

        // Handle custom drops for slabs
        if (destroyedBlockPermutation.type.id.includes('_slab')) {
            if (!player || !player.isValid()) return;
            const equippable = player.getComponent('equippable');
            if (!equippable) return;

            const selectedItem = equippable.getEquipment('Mainhand');
            const isPickaxe = selectedItem?.hasTag('minecraft:is_pickaxe');

            if (isPickaxe) {
                const slabItem = new ItemStack(destroyedBlockPermutation.type.id, 1);
                block.dimension.spawnItem(slabItem, block.location);
            }
        }
    }
};


// --- Subscribe ONCE to the startup event to register our single component ---

system.beforeEvents.startup.subscribe(event => {
    event.worldBuilder.registerBlockComponent('gaia:interaction_handler', unifiedInteractionHandler);
});
