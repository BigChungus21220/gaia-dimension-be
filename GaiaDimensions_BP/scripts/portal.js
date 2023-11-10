import { world, system, Vector, Entity,Player } from "@minecraft/server"
import {log, delay } from './utils.js'
import gaia from './api/Dimension.js'
const prevLocationMap = new Map();
const locMap = new Map()
const dimensions = ['overworld','nether','the_end'].map(dimensionStr=>world.getDimension(dimensionStr))
const overworld = dimensions.find(d=>d.id === 'minecraft:overworld')
const the_end = dimensions.find(d=>d.id === 'minecraft:the_end')

function getTopBlock(location, dimension){
    let loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z))
    return Vector.add(dimension.getBlockFromRay(loc, new Vector(0,-1,0)).block.location, new Vector(0,1,0))
}

async function tpToGaia(entity){
    if (!gaia.inGaia(entity) && entity.dimension.id === 'minecraft:the_end'){
        log(`Sending ${entity.nameTag} back to the End`)
        entity.teleport({x:0,y:65,z:0},{dimension:the_end})
        return;
    }
    const save = entity.location
    const initialTeleport = gaia.convertCoords(new Vector(entity.location.x,entity.location.y,entity.location.z),'minecraft:overworld','gaia:gaia')
    entity.teleport(initialTeleport, {dimension: the_end})
    entity.turnCoords()
    await delay(0.8)
    gaia.placePortal(new Vector(entity.location.x,entity.location.y,entity.location.z), the_end, true)
    await delay(0.8)
    let teleport = getTopBlock(entity.location,entity.dimension)
    entity.teleport({x:MathRound(teleport.x),y:MathRound(teleport.y-2),z:MathRound(teleport.z-1)},{dimension:entity.dimension})
    const existingLink = gaia.getLink('start',{x:Math.floor(MathRound(save.x)),y:Math.floor(MathRound(save.y)),z:Math.floor(MathRound(save.z))});
    if (!existingLink) {
        gaia.link({x:Math.floor(MathRound(save.x)),y:Math.floor(MathRound(save.y)),z:Math.floor(MathRound(save.z))},{x:MathRound(teleport.x),y:MathRound(teleport.y-2),z:MathRound(teleport.z+1)},{x:0,y:3,z:2})
    }

    log(entity.typeId + " sent to Gaia Dimension")
}



/**
 * 
 * @param {number} x 
 */
function MathRound (x) {
  return Math.round(x * 1000) / 1000;
};

/**
 * Returns `true` if entity is movings
 * @param {Entity} entity 
 */
function isMoving (entity) {
  if (!(entity instanceof Player) && !(entity instanceof Entity)) throw new TypeError('Parameter is not Entity or Player');
  
  /**
   * @type {import("@minecraft/server").Vector3}
   */
  const vector = {
    x: MathRound(entity.getVelocity().x),
    y: MathRound(entity.getVelocity().y),
    z: MathRound(entity.getVelocity().z)
  };

  if (vector.x === 0 && vector.y === 0 && vector.z === 0) return false;
  else return true;
};;

export default isMoving;

async function backToDimension(entity,coord){
    try{
        if (entity.typeId == "minecraft:player"){
            const teleport = gaia.isEntityInLinked('end',entity) ?? coord
            let dimension = overworld  ?? entity.getSpawnPoint().dimension
            if (teleport === coord) {
                entity.teleport(gaia.convertCoords({x:teleport.x+2,y:teleport.y,z:teleport.z+2},'gaia:gaia','minecraft:overworld'), {dimension:dimension})
                await delay(1);
                entity.teleport(gaia.convertCoords(getTopBlock({x:teleport.x,y:teleport.y,z:teleport.z}, overworld),'gaia:gaia','minecraft:overworld'), {dimension: dimension})
            } else {
                entity.teleport({x:teleport.location.x+2,y:teleport.location.y,z:teleport.location.z+2}, {dimension:dimension})
                await delay(1);
                entity.teleport(getTopBlock({x:teleport.location.x,y:teleport.y,z:teleport.location.z}, overworld), {dimension: dimension})
            }
            entity.turnCoords(true)
        } else {
            entity.teleport(world.getDefaultSpawnLocation(), {dimension: overworld})
            await delay(1);
            entity.teleport(getTopBlock(world.getDefaultSpawnLocation(), overworld), {dimension: overworld})
        }
        log(entity.typeId + " sent to overworld")
    } catch (e) {
    } 
}


system.runInterval(() => {
    dimensions.forEach(dimension => {
        dimension.getEntities().forEach(entity => {
            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            const currentLocation = entity.location;
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');
           
            if (entity.typeId === 'minecraft:player') {  
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving && gaia.isInGaia(entity)) {
                    const prevLocation = prevLocationMap?.get(entity.nameTag);
                        const deltaX = Math.floor(currentLocation.x - prevLocation?.x);
                        const deltaZ = Math.floor(currentLocation.z - prevLocation?.z);

                        let loc = entity.location;
                        const calVector = new Vector(Math.floor(((loc.x - 200000) / 1000) + deltaX), loc.y, Math.floor(((loc.z - 200000) / 1000) + deltaZ));

                        if (!locMap.has(entity.nameTag)) {
                            locMap.set(entity.nameTag, calVector);
                            delete loc.x;
                            delete loc.y;
                            delete loc.z;
                        }
                        const coord = `x:${locMap?.get(entity.nameTag)?.x} y:${Math.round(entity.location.y)} z:${locMap?.get(entity.nameTag)?.z}`
                        if (deltaX > 0 || deltaZ > 0) {
                            locMap.set(entity.nameTag, new Vector(locMap?.get(entity.nameTag)?.x + 1, locMap?.get(entity.nameTag)?.y, locMap?.get(entity.nameTag)?.z + 1)); // Add 1 to the movement when moving forward
                        } else if (deltaX < 0 || deltaZ < 0) {
                            locMap.set(entity.nameTag, new Vector(locMap?.get(entity.nameTag)?.x - 1, locMap?.get(entity.nameTag)?.y, locMap?.get(entity.nameTag)?.z - 1)); // Subtract 1 from the movement when moving backward
                        }

                        gaia.isInGaia(entity) ? entity?.onScreenDisplay?.setActionBar(coord): undefined;
                        
                    }
                prevLocationMap.set(entity.nameTag, currentLocation);
            }
            if (inPortal && !lastInPortal) {
                gaia.isInGaia(entity) ? backToDimension(entity,parseCoords(coord)) : tpToGaia(entity);
            }
        });
    });
}, 6);

function parseCoords(coord){
return {
    x: parseInt(coord.split(':')[1]),
    y:parseInt(coord.split(':')[2]),
    z: parseInt(coord.split(':')[3])
};
}
