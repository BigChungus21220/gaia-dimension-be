import { world, BlockPermutation } from '@minecraft/server';
export { GAIA_LOG}

class CustomLogRegistry {
    constructor(prefix) {
        this.prefix = prefix;
    }

    register(logIdentifier) {
        const [prefix, identifier] = logIdentifier.split(':');
        const strippedLogIdentifier = `${prefix}:stripped_${identifier}`;
        
        world.beforeEvents.worldInitialize.subscribe(eventData => {
            eventData.blockTypeRegistry.registerCustomComponent(logIdentifier, {
                onPlayerInteract(e) {
                    const { block, player } = e;
                    const equipment = player.getComponent('equippable');
                    const selectedItem = equipment.getEquipment('Mainhand');

                    if (!selectedItem?.hasTag('minecraft:is_axe')) return;

                    const blockState = block.permutation.getState("minecraft:block_face");
                    
                    if (blockState) {
                        const strippedLog = BlockPermutation.resolve(strippedLogIdentifier, {"minecraft:block_face": blockState});
                        block.setPermutation(strippedLog);
                    }

                    player.playSound('step.wood');
                }
            });
        });
    }
}



const GAIA_LOG = new CustomLogRegistry('gaia');
