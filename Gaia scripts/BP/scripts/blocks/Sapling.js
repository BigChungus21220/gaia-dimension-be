import { Entity, Block, Player, system } from "@minecraft/server"

function loadStructure( blockLocation) {
    const block = world.getBlock(block.location);
    if (block) {
        const treeTypeId = block.typeId ;  
        // Construct the command string
        const command = `structure load ${treeTypeId} ${block.location.x} ${block.location.y} ${block.location.z}`;
        entity.runCommandAsync(command);
    }
}

world.beforeEvents.worldInitialize.subscribe(eventData => {
    eventData.blockTypeRegistry.registerCustomComponent('gaia:sapling', {
        onRandomTick(block) {
         loadStructure(block.location);
        }
    });
});