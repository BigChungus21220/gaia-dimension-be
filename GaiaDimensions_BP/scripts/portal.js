import { world, system, Vector, Entity,Player, Dimension } from "@minecraft/server"
import {delay } from './utils.js'
import { Gaia } from './api/Dimension.js'
system
const gaia = new Gaia();
const prevLocationMap = new Map();
const locMap = new Map();
const dimensions = ['overworld', 'nether', 'the_end'].map(dimensionStr => world.getDimension(dimensionStr));
const overworld = dimensions.find(d => d.id === 'minecraft:overworld');
const the_end = dimensions.find(d => d.id === 'minecraft:the_end');

function getTopBlock(location, dimension) {
    const loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z));
    return Vector.add(dimension.getBlockFromRay(loc, new Vector(0, -1, 0)).block.location, new Vector(0, 1, 0));
}

async function tpToGaia(entity) {
    entity.typeId === 'minecraft:player' ? entity.setDynamicProperty('enteredByPortal',true): undefined
    const save = entity.location
    const initialTeleport = gaia.convertCoords(new Vector(save.x,save.y,save.z),'minecraft:overworld','gaia:gaia')
    entity.teleport(initialTeleport, {dimension: the_end})
    entity.turnCoords()
    await delay(0.8)
    gaia.lightPortal(new Vector(entity.location.x,entity.location.y,entity.location.z), the_end, true)
    await delay(0.8)
    let teleport = getTopBlock(entity.location,entity.dimension)
    entity.teleport({x:MathRound(teleport.x),y:MathRound(teleport.y),z:MathRound(teleport.z)},{dimension:entity.dimension})
    const existingLink = gaia.getLink('start',{x:Math.floor(MathRound(save.x)),y:Math.floor(MathRound(save.y)),z:Math.floor(MathRound(save.z))});
    if (!existingLink) {
        gaia.triggerEvent('portalLink',{location:save,linkedLocation:teleport,dimension:entity.dimension},'BeforeEvent')
        const data = await gaia.listenFor('portalLink','Canceled','BeforeEvent')
        if (data && data.cancel === true) return;
        gaia.link({x:Math.floor(MathRound(save.x)),y:Math.floor(MathRound(save.y)),z:Math.floor(MathRound(save.z))},{x:MathRound(teleport.x),y:MathRound(teleport.y-2),z:MathRound(teleport.z+1)},{x:0,y:3,z:2})
        gaia.triggerEvent('portalLink',{location:save,linkedLocation:teleport,dimension:entity.dimension},'AfterEvent')
    }
}



/**
 * 
 * @param {number} x 
 */
function MathRound(x) {
    return Math.round(x * 1000) / 1000;
}

/**
 * Returns `true` if entity is movings
 * @param {Entity} entity 
 */

function isMoving(entity) {
    if (!(entity instanceof Player) && !(entity instanceof Entity)) throw new TypeError('Parameter is not Entity or Player');

    const velocity = entity.getVelocity();
    const vector = {
        x: MathRound(velocity.x),
        y: MathRound(velocity.y),
        z: MathRound(velocity.z)
    };

    return vector.x !== 0 || vector.y !== 0 || vector.z !== 0;
}

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
    } catch (e) {
    } 
}


system.runInterval(() => {
    for (const dimension of dimensions) {
        for (const entity of dimension.getEntities()) {
             const coord = `x:${locMap?.get(entity.nameTag)?.x} y:${Math.round(entity.location.y)} z:${locMap?.get(entity.nameTag)?.z}`
            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            const currentLocation = entity.location;
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');
           if (gaia.isInGaia(entity)  && entity.typeId === 'minecraft:player' && !entity.getDynamicProperty('enteredByPortal') ) entity.teleport({x:0,y:76,z:0});
            if (entity.typeId === 'minecraft:player') {  
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving && gaia.isInGaia(entity)) {
                    calCoords(entity,currentLocation)
                    }
                prevLocationMap.set(entity.nameTag, currentLocation);
            }
            if (inPortal && !lastInPortal) {
                gaia.isInGaia(entity) ? backToDimension(entity,parseCoords(coord)) : tpToGaia(entity);
            }
        };
    };
}, 6);

function parseCoords(coord){
return {
    x: parseInt(coord.split(':')[1]),
    y:parseInt(coord.split(':')[2]),
    z: parseInt(coord.split(':')[3])
};
}
function calCoords(entity, currentLocation) {
    const prevLocation = prevLocationMap?.get(entity.nameTag);
    const deltaX = Math.round(currentLocation.x - (prevLocation?.x || 0));
    const deltaZ = Math.round(currentLocation.z - (prevLocation?.z || 0));

    let loc = entity.location;
    const calVector = new Vector(Math.round(((loc.x - 100000) / 1000) + deltaX), loc.y, Math.round(((loc.z - 100000) / 1000) + deltaZ));

    if (!locMap.has(entity.nameTag)) {
        locMap.set(entity.nameTag, calVector);
        delete loc.x;
        delete loc.y;
        delete loc.z;
    }
    if (deltaX > 0 || deltaZ > 0) {
        locMap.set(entity.nameTag, new Vector((locMap?.get(entity.nameTag)?.x || 0) + 1, locMap?.get(entity.nameTag)?.y, locMap?.get(entity.nameTag)?.z + 1)); // Add 1 to the movement when moving forward
    } else if (deltaX < 0 || deltaZ < 0) {
        locMap.set(entity.nameTag, new Vector((locMap?.get(entity.nameTag)?.x || 0) - 1, locMap?.get(entity.nameTag)?.y, locMap?.get(entity.nameTag)?.z - 1)); // Subtract 1 from the movement when moving backward
    }
    const coord = `x:${MathRound(calVector.x)} y:${Math.round(entity.location.y)} z:${MathRound(calVector.z)}`;
    gaia.isInGaia(entity) ? entity?.onScreenDisplay?.setActionBar(coord ?? "Loading Coords...") : undefined;
}


