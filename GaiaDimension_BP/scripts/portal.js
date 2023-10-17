import { world, system, Vector } from "@minecraft/server"
import { getBiome, log, inGaiaDimension, delay } from 'utils.js'
import { placePortal} from 'portal_utils.js'

const overworld = world.getDimension("overworld")
const nether = world.getDimension("nether")
const the_end = world.getDimension("the_end")
const dimensions = [overworld, nether, the_end]

function isInPortal(entity){
    if (entity === undefined){
        return false
    }
    let isPortal = false
    try {
        isPortal = entity.dimension.getBlock(entity.location).typeId == "gaia:gaia_portal"
    } catch (e) {}
    return isPortal
}

function getTopBlock(location, dimension){
    let loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z))
    return Vector.add(dimension.getBlockFromRay(loc, new Vector(0,-1,0)).block.location, new Vector(0,1,0))
}

async function tpToGaia(entity){
    log(entity.typeId + " sent to Gaia Dimension")
    entity.teleport(new Vector(150000, 32000, 150000), {dimension: the_end})
    await delay(1);
    let topBlock = getTopBlock(new Vector(150000, 256, 150000), the_end) //warning: any entities other than players will not spawn correctly on the other side
    entity.teleport(topBlock, {dimension: the_end})
    placePortal(new Vector(150000, 70, 150000), the_end, true)
}

async function backToSpawn(entity){
    if (entity.typeid == "minecraft:player"){
        let spawn = entity.getSpawnPoint()
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
            let inPortal = isInPortal(entity) || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            if (inPortal && !lastInPortal){
                if (inGaiaDimension(entity)){
                    backToSpawn(entity)
                    //log("to spawn")
                } else {
                    tpToGaia(entity)
                    //log("to gaia")
                }
            }
            if (inPortal){
                entity.addTag("inPortal")
            } else {
                entity.removeTag("inPortal")
            }
        }
    }
}, 8)