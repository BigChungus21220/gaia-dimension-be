import { world, ItemStack, BlockPermutation, Container,system,Player } from '@minecraft/server'

Player.prototype.isGamemode = function (gamemode){
    return world.getPlayers({name:this.name,gameMode:gamemode}).length > 0
}
Container.prototype.decrementStack = function (amount = 1, slot = 0) {
    let itemStack = this.getItem(slot);
    if (itemStack.amount > 1) amount ? itemStack.amount -= amount : itemStack.amount--
    else itemStack = undefined;
    this.setItem(slot, itemStack)
}


const dyeMap = {
    "minecraft:black_dye": "b",
    "minecraft:red_dye": "r",
    "minecraft:green_dye": "gr",
    "minecraft:brown_dye": "br",
    "minecraft:blue_dye": "bl",
    "minecraft:purple_dye": "p",
    "minecraft:cyan_dye": "c",
    "minecraft:light_gray_dye": "lg",
    "minecraft:gray_dye": "g",
    "minecraft:pink_dye": "pi",
    "minecraft:lime_dye": "l",
    "minecraft:yellow_dye": "y",
    "minecraft:light_blue_dye": "lb",
    "minecraft:magenta_dye": "m",
    "minecraft:orange_dye": "or",
    "minecraft:white_dye": "w"
};
const deactivateStates = {
    "net:n": "o",
    "net:l": "f",
    "net:i": "a",
    "net:t": "o",
    "net:p": "o"
};

const timeMap = new Map()
world.afterEvents.playerInteractWithBlock.subscribe(ev => {
    const { block, itemStack, player } = ev;
    if (block.typeId === 'net:teleportation_pad') {
        const lastTimestamp = timeMap.get(player.name) ?? 0
        if (Date.now() - lastTimestamp < 500) {
            return;
        }
        timeMap.set(player.name, new Date())
        if (itemStack && itemStack.typeId === 'net:telepad_deactivator') {
            const permutation = block.permutation.getAllStates('net:t')
            const dyeType = Object.keys(dyeMap).find(key => dyeMap[key] === permutation);
            if (dyeType) block.dimension.spawnItem(new ItemStack(dyeType, 1), block.location);
            Object.keys(deactivateStates).forEach(key => {
                block.setPermutation(BlockPermutation.resolve(block.typeId, { [key]: deactivateStates[key] }))
            })
            block.dimension.runCommand('event entity @e[type=net:tp,c=1] net:despawn')
        } else if ((itemStack && itemStack.typeId.endsWith('dye')) && block.permutation.getState('net:i') == 'a') {
            const permValue = dyeMap[itemStack.typeId];
            block.setPermutation(BlockPermutation.resolve(block.typeId, { 'net:t': `${permValue}`, 'net:l': `t`, 'net:i': `b`, 'net:p': `${permValue}` }));
            const inv = player.getComponent('inventory').container;
            if (!player.isGamemode('creative')){
            inv.decrementStack(1, player.selectedSlot);
        }
        }
    }
})

world.beforeEvents.playerBreakBlock.subscribe(ev=>{
  const {block,player} = ev;
  const permutation = block.permutation.getState('net:t')
  const dyeType = Object.keys(dyeMap).find(key=>dyeMap[key] === permutation)
  system.runTimeout(()=>{
 dyeType === undefined ? undefined :  player.isGamemode('creative') === false ? block.dimension.spawnItem(new ItemStack(dyeType),block.location) :undefined
})
},{blockTypes:['net:teleportation_pad']})