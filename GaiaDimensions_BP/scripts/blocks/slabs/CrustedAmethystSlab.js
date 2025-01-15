import { world, ItemStack } from '@minecraft/server';

// Subscribe to the 'worldInitialize' event to register custom components
world.beforeEvents.worldInitialize.subscribe(eventData => {
    // Register a custom component named 'kai:on_interact' for slab interaction 
    eventData.blockComponentRegistry.registerCustomComponent('gaia:crusted_amethyst_slab', {
        // Define the behavior when a player interacts with the slab
        onPlayerInteract(e) {
            // Destructure event data for easier access
            const { block, player, face } = e;

            // Log the face of the block that was interacted with
            console.warn(`Interacted face: ${face}`);

            // Get the equipment component for the player
            const equipment = player.getComponent('equippable');

            // Get the selected item from the player's mainhand
            const selectedItem = equipment.getEquipment('Mainhand');

            // Check if the selected item is a slab and the block is not already double
            if (selectedItem?.typeId === 'gaia:crusted_amethyst_slab' && !block.permutation.getState('kai:double')) {
                // Check if the interaction is valid based on vertical half and face
                const verticalHalf = block.permutation.getState('minecraft:vertical_half');
                const isBottomUp = verticalHalf === 'bottom' && face === 'Up';
                const isTopDown = verticalHalf === 'top' && face === 'Down';

                if (isBottomUp || isTopDown) {
                    // Reduce item count if not in creative mode
                    if (player.getGameMode() !== "creative") {
                        selectedItem.amount -= 1;
                        // Clear or update selected slot based on item count
                        if (selectedItem.amount === 0) {
                            equipment.setEquipment('Mainhand', undefined);
                        } else {
                            equipment.setEquipment('Mainhand', selectedItem);
                        }
                    }
                    // Set block to double and remove water if present
                    block.setPermutation(block.permutation.withState('kai:double', true));
                    block.setWaterlogged(false);
                    // Play sound effect
                    player.playSound('use.stone');
                }
            }

            // Check if the selected item is a water bucket and the block is not waterlogged or double
            if (selectedItem?.typeId === 'minecraft:water_bucket' && !block.permutation.getState('block:waterlogged') && !block.permutation.getState('kai:double')) {
                // If not in creative mode, replace water bucket with empty bucket
                if (player.getGameMode() !== "creative") {
                    equipment.setEquipment('Mainhand', new ItemStack('minecraft:bucket', 1));
                }
                // Set block to waterlogged and place corresponding structure
                block.setPermutation(block.permutation.withState('block:waterlogged', true));
                const verticalHalf = block.permutation.getState('minecraft:vertical_half');
                const structureName = (verticalHalf === 'bottom') ? 'mystructure:CrustedAmethystBottomSlab' : 'mystructure:CrustedAmethystTopSlab'; // These structures contain your slab waterlogged, made with an NBT editor
                const { x, y, z } = block.location; // Use block.location to get coordinates
                world.structureManager.place(structureName, e.dimension, { x, y, z });
            }
        },

        // Define behavior when a player destroys the slab
        onPlayerDestroy(e) {
            // Destructure event data for easier access
            const { block, player } = e;

            // Check if player and equipment are valid
            if (!player || !player.getComponent('equippable')) {
                return;
            }

            // Get the item in the player's main hand
            const selectedItem = player.getComponent('equippable').getEquipment('Mainhand');

            // Check if the selected item is a pickaxe
            const isPickaxe = selectedItem && selectedItem.hasTag('minecraft:is_pickaxe');

            // If the item is a pickaxe, spawn one slab in the block's position
            if (isPickaxe) {
                const slabItem = new ItemStack('gaia:crusted_amethyst_slab', 1);
                e.dimension.spawnItem(slabItem, block.location);
            }
        }
    });
});