import { world, ItemStack } from '@minecraft/server';
export { GAIA_SLAB }

class SlabRegistry {
    constructor(prefix) {
        this.prefix = prefix;
    }
    
    register(slabIdentifier) {
        world.beforeEvents.worldInitialize.subscribe(eventData => {
            eventData.blockComponentRegistry.registerCustomComponent(slabIdentifier, {
                onPlayerInteract: (e) => {
                    const { block, player, face } = e;
                    console.warn(`Interacted face: ${face}`);
                    const equipment = player.getComponent('equippable');
                    const selectedItem = equipment.getEquipment('Mainhand');

                    // Check if interacting with the slab and if it's not already double
                    if (selectedItem?.typeId === slabIdentifier && !block.permutation.getState(`kai:double`)) {
                        const verticalHalf = block.permutation.getState('minecraft:vertical_half');
                        const isBottomUp = verticalHalf === 'bottom' && face === 'Up';
                        const isTopDown = verticalHalf === 'top' && face === 'Down';

                        if (isBottomUp || isTopDown) {
                            if (player.getGameMode() !== "creative") {
                                selectedItem.amount -= 1;
                                if (selectedItem.amount === 0) {
                                    equipment.setEquipment('Mainhand', undefined);
                                } else {
                                    equipment.setEquipment('Mainhand', selectedItem);
                                }
                            }
                            block.setPermutation(block.permutation.withState(`kai:double`, true));
                            block.setWaterlogged(false);
                            player.playSound('use.stone');
                        }
                    }
                },
                onPlayerDestroy: (e) => {
                    const { block, player } = e;
                    if (!player || !player.getComponent('equippable')) return;

                    const selectedItem = player.getComponent('equippable').getEquipment('Mainhand');
                    const isPickaxe = selectedItem && selectedItem.hasTag('minecraft:is_pickaxe');

                    if (isPickaxe) {
                        const slabItem = new ItemStack(slabIdentifier, 1);
                        e.dimension.spawnItem(slabItem, block.location);
                    }
                }
            });
        });
    }
}

const GAIA_SLAB = new SlabRegistry('gaia');
