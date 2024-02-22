import { world, system, Vector } from "@minecraft/server"
import { delay, convertCoords, overworld, the_end, isMoving, MathRound } from './utils.js'
import Gaia from './api/Gaia.js'
import Portal from "./api/Portal.js";


const dimensions = world.getAllDimensions()

function getTopBlock(location, dimension) {
    const loc = new Vector(Math.floor(location.x), 310, Math.floor(location.z));
    return Vector.add(dimension.getBlockFromRay(loc, new Vector(0, -1, 0)).block.location, new Vector(0, 1, 0));
}

async function tpToGaia(entity) {
    entity.typeId === 'minecraft:player' ? entity.setDynamicProperty('enteredByPortal', true) : undefined
    const backUpLoc = entity.location;
    const [backUpLocX, backUpLocY, backUpLocZ] = [Math.floor(MathRound(backUpLoc.x)), Math.floor(MathRound(backUpLoc.y)), Math.floor(MathRound(backUpLoc.z))]
    const initialTeleport = convertCoords(backUpLoc, entity)
    entity.teleport(initialTeleport, { dimension: the_end })
    entity.turnCoords()
    await delay(0.8)
    Portal.lightPortal(entity.location, the_end, true)
    await delay(0.8)
    const topBlockVec = getTopBlock(entity.location, entity.dimension)
    const [teleportX, teleportY, teleportZ] = [MathRound(topBlockVec.x), MathRound(topBlockVec.y), MathRound(topBlockVec.z)]
    entity.teleport({ x: teleportX, y: teleportY, z: teleportZ }, { dimension: entity.dimension })
    const existingLink = Portal.getLink('start', { x: backUpLocX, y: backUpLocY, z: backUpLocZ });
    if (!existingLink) {
        Portal.link({ x: backUpLocX, y: backUpLocY, z: backUpLocZ }, { x: teleportX, y: teleportY, z: teleportZ })
    }
}

function backToDimension(entity, coord) {
    try {
        if (entity.typeId == "minecraft:player") {
            const teleportLoc = Portal?.isEntityInLinked('end', entity)?.location
            const { x, y, z } = teleportLoc ?? coord
            const dimension = overworld ?? entity.getSpawnPoint()?.dimension
            entity.teleport(convertCoords(getTopBlock({ x: x, y: y, z: z }, overworld), entity), { dimension: dimension })
            entity.turnCoords(true)
        } else {
            entity.teleport(getTopBlock(world.getDefaultSpawnLocation(), overworld), { dimension: overworld })
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
            if (Gaia.isInGaia(entity) && entity.typeId === 'minecraft:player' && !entity.getDynamicProperty('enteredByPortal')) entity.teleport({ x: 0, y: 76, z: 0 });
            const coord = entity.coordinateDisplay.coordinates();
            if (entity.typeId === 'minecraft:player') {
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving && Gaia.isInGaia(entity)) {
                    entity.coordinateDisplay.setCoordinates(coord)
                }
            }
            if (inPortal && !lastInPortal) {
                Gaia.isInGaia(entity) ? backToDimension(entity, parseCoords(coord ?? entity.location)) : tpToGaia(entity);
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
