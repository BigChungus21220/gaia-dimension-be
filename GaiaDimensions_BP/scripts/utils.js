import { system, world,Player,Entity } from "@minecraft/server";
import Gaia from './api/Gaia'
export function delay(ticks) {
    return new Promise(res => system.runTimeout(res, ticks * 20));
}
export function convertCoords(location, entity) {
    let fromDimension, toDimension;
    const dimensionId = entity.dimension.id.split(':').pop()
    console.warn(entity.dimension.id)
    const inGaia = Gaia.isInGaia(entity.location);

    // Determine source and target dimensions based on the entity's current dimension
    
    if (dimensionId === 'overworld') {
        fromDimension = 'overworld';
        toDimension = 'gaia';
    } else if (dimensionId === 'the_end' && inGaia) {
        fromDimension = 'gaia';
        toDimension = 'overworld';
    }  else {
        throw new Error(`Unsupported dimension: ${dimensionId}`);
    }

    /* else if (dimensionId === 'the_end') {
        fromDimension = 'the_end';
        toDimension = 'overworld'
            
        }
        */

    const scaleFactor = 4

    switch (fromDimension) {
        case 'overworld':
            switch (toDimension) {
                case 'gaia':
                    // Remaps area (-35700, -35700), (35700, 35700) in the overworld to (100000, 100000), (400000, 400000) in gaia
                    return {
                        x: Math.floor((location.x / scaleFactor) + Gaia.origin.x),
                        y: location.y,
                        z: Math.floor((location.z / scaleFactor) + Gaia.origin.z)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        case 'gaia':
            switch (toDimension) {
                case 'overworld':
                    // Remaps area (100000, 100000), (400000, 400000) in gaia to (-35700, -35700), (35700, 35700) in the overworld
                    return {
                        x: Math.floor((location.x - Gaia.origin.x) * scaleFactor),
                        y: location.y,
                        z: Math.floor((location.z - Gaia.origin.z) * scaleFactor)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }

            case 'the_end':
                switch (toDimension) {
                    case 'overworld':
                        return {
                            x: Math.floor((location.x - Gaia.origin.x) * scaleFactor),
                            y: location.y,
                            z: Math.floor((location.z - Gaia.origin.z) * scaleFactor)
                        };
                    default:
                        throw new Error(`Unsupported conversion to ${toDimension}`);
                }

        default:
            throw new Error(`Unsupported conversion from ${fromDimension}`);
    }
}



/**
 * 
 * @param {number} x 
 */
export function MathRound(x) {
    return Math.round(x);
}

export function isSame(targetObj,compareObj){
    return JSON.stringify(targetObj) === JSON.stringify(compareObj)
}

export const the_end = world.getDimension('the_end');
export const overworld = world.getDimension('overworld')

