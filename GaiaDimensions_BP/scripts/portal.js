import { world, system, Vector, Entity, Dimension, Block, World, Player } from "@minecraft/server"
import {log, inGaiaDimension, delay } from './utils.js'
import { placePortal,decode,ConvertCoords, findGround} from './portal_utils.js'
const locMap = new Map()
const dimensions = ['overworld','nether','the_end'].map(dimensionStr=>world.getDimension(dimensionStr))
const overworld = dimensions.find(d=>d.id === 'minecraft:overworld')
const the_end = dimensions.find(d=>d.id === 'minecraft:the_end')
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
    entity.teleport(ConvertCoords(new Vector(entity.location.x,entity.location.y,entity.location.z),'minecraft:overworld','gaia:gaia'), {dimension: the_end})
   await delay(2)
    await entity.isOnGround
    placePortal(new Vector(entity.location.x,entity.location.y,entity.location.z), the_end, true)
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
 
async function backToDimension(entity){
    if (entity.typeId == "minecraft:player"){
        console.warn(entity.getTags()[0])
        const teleport = JSON.parse(entity.getTags()[0])
        let dimension = overworld  ?? entity.getSpawnPoint().dimension
        entity.teleport({x:teleport.x+2,y:teleport.y,z:teleport.z+2}, {dimension:dimension})
        await delay(1);
        entity.teleport(getTopBlock({x:teleport.x,y:teleport.y,z:teleport.z}, overworld), {dimension: dimension})
    } else {
        entity.teleport(world.getDefaultSpawnLocation(), {dimension: overworld})
        await delay(1);
        entity.teleport(getTopBlock(world.getDefaultSpawnLocation(), overworld), {dimension: overworld})
    }
    log(entity.typeId + " sent to overworld")
}

const prevLocationMap = new Map();

system.runInterval(() => {
    dimensions.forEach(dimension => {
        dimension.getEntities().forEach(entity => {
            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            const currentLocation = entity.location;
            if (inPortal && !lastInPortal) {
                inGaiaDimension(entity) ? backToDimension(entity) : tpToGaia(entity);
            }
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');

            if (entity.typeId === 'minecraft:player') {  
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving) {
                    const prevLocation = prevLocationMap.get(entity.nameTag);
                        const deltaX = Math.floor(currentLocation.x - prevLocation.x);
                        const deltaZ = Math.floor(currentLocation.z - prevLocation.z);

                        let loc = entity.location;
                        const calVector = new Vector(Math.floor(((loc.x - 200000) / 1000) + deltaX), loc.y, Math.floor(((loc.z - 200000) / 1000) + deltaZ));

                        if (!locMap.has(entity.nameTag)) {
                            locMap.set(entity.nameTag, calVector);
                            delete loc.x;
                            delete loc.y;
                            delete loc.z;
                        }

                        if (deltaX > 0 || deltaZ > 0) {
                            locMap.set(entity.nameTag, new Vector(locMap.get(entity.nameTag).x + 1, locMap.get(entity.nameTag).y, locMap.get(entity.nameTag).z + 1)); // Add 1 to the movement when moving forward
                        } else if (deltaX < 0 || deltaZ < 0) {
                            locMap.set(entity.nameTag, new Vector(locMap.get(entity.nameTag).x - 1, locMap.get(entity.nameTag).y, locMap.get(entity.nameTag).z - 1)); // Subtract 1 from the movement when moving backward
                        }

                      
                        inGaiaDimension(entity) ? entity?.onScreenDisplay?.setActionBar(`x:${locMap.get(entity.nameTag).x} z:${locMap.get(entity.nameTag).z}`): undefined;
                       
                    }
                prevLocationMap.set(entity.nameTag, currentLocation);
            }
        });
    });
}, 6);



world.afterEvents.playerDimensionChange.subscribe(ev=>{
    const {fromLocation,toDimension:{id},player} = ev

    switch (id) {
        case 'minecraft:the_end':
   player.addTag(JSON.stringify({x:fromLocation.x,y:fromLocation.y,z:fromLocation.z})); 

        break;
        case 'minecraft:overworld':
            if (player.hasTag(player.getTags()[0])){ player.removeTag(player.getTags()[0])}; 
        break;
    }
})