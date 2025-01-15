import { world, Entity, Block, Player, system } from "@minecraft/server"

function loadStructure(blockTypeId, dimension, blockLocation) {
    if (block.typeId && dimension && block.location) {
         world.structureManager.place(blockTypeId, dimension, blockLocation)
    }
}
world.beforeEvents.worldInitialize.subscribe(eventData => {
    eventData.blockTypeRegistry.registerCustomComponent('gaia:sapling', {
        onRandomTick(block) {
         loadStructure(block.location);
        }
    });
});