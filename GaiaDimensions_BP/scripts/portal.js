import { world, system, Vector, Player, Entity } from "@minecraft/server"
import { delay, convertCoords, overworld, the_end } from './utils.js'
import Gaia from './api/Gaia.js'
import Portal from "./api/Portal.js";
import { vec3 } from "./Vector.js";

const dimensions = world.getAllDimensions();

async function getTopBlock(location, dimension) {
    const loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z));
    const block = await new Promise((resolve) => { const block = dimension?.getBlockFromRay(loc, new Vector(0, -1, 0))?.block; if (block) { resolve(block) } })
    return Vector.add(block.location, new Vector(0, 1, 0));
}

/**
 * Returns `true` if entity is movings
 * @param {Entity} entity 
 */

function isMoving(entity) {
    if (!(entity instanceof Player) && !(entity instanceof Entity)) throw new TypeError('Parameter is not Entity or Player');
    const { x, y, z } = entity.getVelocity();
    return [x, y, z].every(v => v != 0)
}

async function tpToGaia(entity) {
    if (entity instanceof Player) entity.setDynamicProperty('enteredByPortal', true);
    const backUpLoc = vec3(entity.location)?.round();
    const { x: backUpLocX, y: backUpLocY, z: backUpLocZ } = backUpLoc;

    // Gets them into the dimension
    const initialTeleport = convertCoords(backUpLoc, entity)
    entity.teleport(initialTeleport, { dimension: the_end })
    entity.turnCoords()
    await delay(0.8);

    // Lights the portal after they enter the dimension
    Portal.lightPortal(entity.location, the_end, true)
    await delay(0.8)

    // Teleports them to the top left of the portal struct
    const topBlockVec = await getTopBlock(entity.location, entity.dimension);
    const { x: teleportX, y: teleportY, z: teleportZ } = topBlockVec
    entity.teleport({ x: teleportX, y: teleportY, z: teleportZ }, { dimension: entity.dimension })
    const existingLink = Portal.getLink('start', { x: backUpLocX, y: backUpLocY, z: backUpLocZ });
    if (!existingLink) {
        Portal.link({ x: backUpLocX, y: backUpLocY, z: backUpLocZ }, { x: teleportX, y: teleportY, z: teleportZ })
    }
}


async function backToDimension(entity, coord) {
    try {
        if (entity.typeId == "minecraft:player") {
            const teleportLoc = Portal.isEntityInLinked('end', entity)?.location
            const { x, y, z } = teleportLoc ?? coord
            const dimension = overworld ?? entity.getSpawnPoint()?.dimension
            entity.teleport(convertCoords(await getTopBlock({ x: x, y: y, z: z }, dimension), entity), { dimension: dimension })
            entity.turnCoords(true)
        } else {
            entity.teleport(await getTopBlock(world.getDefaultSpawnLocation(), overworld), { dimension: overworld })
        }
    } catch (e) {
    }
}


system.runInterval(() => {
    for (const dimension of dimensions) {
        for (const entity of dimension.getEntities()) {
            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock(new Vector(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');
            const coord = entity.coordinateDisplay.coordinates();
            if (entity instanceof Player) {
                if (Gaia.isInGaia(entity) && !entity.getDynamicProperty('enteredByPortal')) entity.teleport({ x: 0, y: 76, z: 0 });
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving && Gaia.isInGaia(entity)) {
                    entity.coordinateDisplay.setCoordinate(coord)
                }
            }
            if (inPortal && !lastInPortal) {
                Gaia.isInGaia(entity) ? backToDimension(entity, parseCoords(coord)) : tpToGaia(entity);
            }
        };
    };
}, 6);

function parseCoords(coord) {

    switch (typeof coord) {
        case "string":
            const parts = coord.split(':').map(part => parseInt(part));
            return {
                x: parts[1],
                y: parts[2],
                z: parts[3]
            };

        case "object":
            return coord
    }
}

