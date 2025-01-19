import {world, system, Player, Dimension, Entity} from "@minecraft/server";
import {delay, convertCoords, overworld, gaia} from './utils.js';
import { CoordinateDisplay } from "./world/CoordinateDisplay.js"
import Gaia from './world/Gaia.js';
import Portal from "./world/Portal.js";
import {Vec3} from "./Vec3.js";
import {playerChangeBlock, tick8} from "./world/Events.js";


const dimensions = world.getAllDimensions();

/**
 * @param {Dimension} dimension
 */
async function getTopBlock(location, dimension) {
      return dimension.getTopmostBlock(location);
}

function isMoving(entity) {
    if (!(entity instanceof Entity)) throw new TypeError('Parameter is not a Player');
    const {x, y, z} = entity.getVelocity();
    return [x, y, z].some(v => v !== 0);
}

async function tpToGaia(entity) {
    // Check if the entity is an instance of Entity
    if (!(entity instanceof Entity)) {
        console.error("The provided entity is not an instance of Entity.");
        return;
    }

    // Set a dynamic property on the entity
    entity.setDynamicProperty('enteredByPortal', true);
    
    // Backup the current location
    const backUpLoc = Vec3.round(entity.location);
    const initialTeleport = convertCoords(backUpLoc, entity);

    // Teleport the entity
    entity.teleport(initialTeleport, { dimension: gaia});

    // Convert coordinates after teleporting
    convertCoords();
    await delay(0.8);

    // Light the portal
    Portal.lightPortal(entity.location, gaia, true);
    await delay(0.8);

    // Get the top block location
    const topBlockVec = (await getTopBlock(entity.location, entity.dimension)) ?? entity.location;
    entity.teleport(topBlockVec, { dimension: entity.dimension });
    const existingLink = Portal.getLink('start', backUpLoc);
    if (!existingLink) {
        Portal.link(backUpLoc, topBlockVec);
    }
}

async function backToDimension(entity, coord = undefined) {
    try {
        let teleportLoc, dimension;

        // Check if entity is a Player instance
        if (entity instanceof Player) {
            dimension = entity.getSpawnPoint()?.dimension ?? overworld;
            teleportLoc = Portal.isEntityInLinked('end', entity)?.location ?? entity.location; // Use entity's location
        } else {
            dimension = overworld;
            teleportLoc = await getTopBlock(world.getDefaultSpawnLocation(), overworld);
        }

        // Ensure entity is an instance of Entity before the call
        if (!(entity instanceof Entity)) {
            throw new Error("The provided entity is not an instance of Entity.");
        }
        const targetLocation = await getTopBlock(teleportLoc, dimension) ?? coord;
        entity.teleport(convertCoords(targetLocation, entity), { dimension : overworld });
    } catch (error) {
        console.error("Error in backToDimension:", error);
    }
}


tick8.subscribe(() => {
    for (const dimension of dimensions) {
        for (const entity of dimension.getEntities()) {
            // Check if the entity is an instance of Entity
            if (!(entity instanceof Player)) {
                continue; // Skip if not an instance of Entity
            }

            const lastInPortal = entity.hasTag("inPortal");
            const inPortal = entity.isInPortal() || (dimension.getBlock({
                ...entity.location,
                y: 0
            }) === undefined && lastInPortal);

            inPortal ? entity.addTag('inPortal') : entity.removeTag('inPortal');

            if (entity instanceof Player) {
                if (Gaia.isInGaia(entity.location) && !entity.getDynamicProperty('enteredByPortal')) {
                    entity.teleport({x: 0, y: 76, z: 0});
                }

                if (inPortal && !lastInPortal) {
                    const coords = entity.coordinateDisplay.coord;
                    Gaia.isInGaia(entity.location) ? backToDimension(entity, coords) : tpToGaia(entity);
                }
            } else {
                if (inPortal && !lastInPortal) {
                    backToDimension(entity);
                }
            }
        }
    }
});

playerChangeBlock.subscribe(({ player }) => {
    if (player instanceof Player) {
        if (coordinateDisplay instanceof CoordinateDisplay) {
            coordinateDisplay.updateCoordinates();
        }
    }
});