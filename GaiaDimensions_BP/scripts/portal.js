import { world, system, Vector, Entity, Dimension, Block, World } from "@minecraft/server"
import {log, inGaiaDimension, delay } from './utils.js'
import { placePortal,decode} from './portal_utils.js'
const dimensions = ['overworld','nether','the_end'].map(dimensionStr=>world.getDimension(dimensionStr))
Entity.prototype.isInPortal = function (){
    try {
	return this.dimension.getBlock(this.location).typeId === "gaia:gaia_portal";
    } catch (e){}
};

function getTopBlock(location, dimension){
    let loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z))
    return Vector.add(dimension.getBlockFromRay(loc, new Vector(0,-1,0)).block.location, new Vector(0,1,0))
}


async function tpToGaia(entity){
    log(entity.typeId + " sent to Gaia Dimension")
    entity.teleport(new Vector(decode('cfffcccdff'), decode('qkuk'), decode('cfffcccdff')), {dimension: the_end})
    await delay(1);
    let topBlock = getTopBlock(new Vector(decode('cfffcccdff'), decode('qq'), decode('cfffcccdff')), the_end) //warning: any entities other than players will not spawn correctly on the other side
    entity.teleport(topBlock, {dimension: the_end})
    placePortal(new Vector(decode('cfffcccdff'), decode('kh'), decode('cfffcccdff')), the_end, true)
}

async function backToDimension(entity){
    if (entity.typeId == "minecraft:player"){
        const teleport = entity.getTag
        entity.teleport(spawn.location, {dimension: spawn.dimension})
        await delay(1);
        entity.teleport(getTopBlock(spawn.location, spawn.dimension), {dimension: spawn.dimension})
    } else {
        entity.teleport(world.getDefaultSpawnLocation(), {dimension: overworld})
        await delay(1);
        entity.teleport(getTopBlock(world.getDefaultSpawnLocation(), overworld), {dimension: overworld})
    }
    log(entity.typeId + " sent to overworld")
}

system.runInterval(() => {
    for (let dimension of dimensions){
        let entities = dimension.getEntities()
        for (let entity of entities){
            let lastInPortal = entity.hasTag("inPortal");
            let inPortal = entity.isInPortal() || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            if (inPortal && !lastInPortal){
                inGaiaDimension(entity) ? backToSpawn(entity) : tpToGaia(entity)
            }
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal')
        }
    }
}, 8)

world.afterEvents.