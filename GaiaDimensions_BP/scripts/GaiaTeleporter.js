import { world, system, Player } from "@minecraft/server";
import { delay, convertCoords, overworld, the_end } from './utils.js';
import Gaia from './world/Gaia.js';
import Portal from "./world/Portal.js";
import { vec3 } from "./Vec3.js";

const dimensions = world.getAllDimensions();

async function getTopBlock(location, dimension) {
    const loc = vec3(location.x, dimension.heightRange.max, location.z).round();
    const block = await new Promise((resolve) => {
        const block = dimension?.getBlockFromRay(loc, vec3(0, -1, 0))?.block;
        if (block != undefined) {
            resolve(vec3(block.location).add(vec3(0, 1, 0)));
        }
    });
    return block;
}

function isMoving(entity) {
    if (!(entity instanceof Player)) throw new TypeError('Parameter is not a Player');
    const { x, y, z } = entity.getVelocity();
    return [x, y, z].some(v => v !== 0);
}

async function tpToGaia(entity) {
    if (entity instanceof Player) entity.setDynamicProperty('enteredByPortal', true);
    const backUpLoc = vec3(entity.location)?.round();
    const initialTeleport = convertCoords(backUpLoc, entity);
    entity.teleport(initialTeleport, { dimension: the_end });
    entity.turnCoords();
    await delay(0.8);

    Portal.lightPortal(entity.location, the_end, true);
    await delay(0.8);

    const topBlockVec = (await getTopBlock(entity.location, entity.dimension)) ?? entity.location;
    entity.teleport(topBlockVec, { dimension: entity.dimension });
    const existingLink = Portal.getLink('start', backUpLoc);
    if (!existingLink) {
        Portal.link(backUpLoc, topBlockVec);
    }
}

async function backToDimension(entity, coord = undefined) {
    try {
        let teleportLoc;
        if (entity instanceof Player) {
            teleportLoc = Portal.isEntityInLinked('end', entity)?.location ?? coord;
        } else {
            teleportLoc = await getTopBlock(world.getDefaultSpawnLocation(), overworld);
        }
        const dimension = (entity instanceof Player) ? (entity.getSpawnPoint()?.dimension ?? overworld) : overworld;
        entity.turnCoords(true);
        entity.teleport(convertCoords(await getTopBlock(teleportLoc, dimension) ?? coord, entity), { dimension });
    } catch (error) {

    }
}

system.runInterval(() => {
    for (const dimension of dimensions) {
        for (const entity of dimension.getEntities()) {
            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock(vec3(entity.location.x, 0, entity.location.z)) === undefined && lastInPortal);
            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');

            let coord;
            if (entity instanceof Player) {
                coord = entity.coordinateDisplay.updateCoordinates();
                if (Gaia.isInGaia(entity.location) && !entity.getDynamicProperty('enteredByPortal')) {
                    entity.teleport({ x: 0, y: 76, z: 0 });
                }
                const isPlayerMoving = isMoving(entity);
                if (isPlayerMoving && Gaia.isInGaia(entity.location)) {
                    entity.coordinateDisplay.setCoordinate(coord);
                }
            }

            if (inPortal && !lastInPortal) {
                if (entity instanceof Player) {
                    Gaia.isInGaia(entity.location) ? backToDimension(entity, parseCoords(coord)) : tpToGaia(entity);
                } else {
                    backToDimension(entity);
                }
            }
        }
    }
}, 6);

function parseCoords(coord) {
    switch (typeof coord) {
        case "string":
            const parts = coord.split(':').map(part => parseInt(part.trim()));
            return {
                x: parts[1],
                y: parts[2],
                z: parts[3]
            };
        case "object":
            return coord;
    }
}
