import { system, world } from "@minecraft/server";
export function delay(ticks) {
    return new Promise(res=>system.runTimeout(res,ticks*20));
}

export function convertCoords(location, fromDimension, toDimension) {
    const scaleFactor = 4; // 1 block in 'gaia' is 4 blocks in 'overworld'

    switch (fromDimension) {
        case 'overworld':
            switch (toDimension) {
                case 'gaia':
                    //remaps area (-35700, -35700), (35700, 35700) in the overworld to (100000, 100000), (400000, 400000) in gaia
                    return {
                        x: Math.floor(location.x/scaleFactor + Gaia.origin.x),
                        y: location.y,
                        z: Math.floor(location.z/scaleFactor + Gaia.origin.z)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        case 'gaia':
            switch (toDimension) {
                case 'overworld':
                    //remaps area (100000, 100000), (400000, 400000) in gaia to (-35700, -35700), (35700, 35700) in the overworld
                    return {
                        x: Math.floor((location.x - Gaia.origin.x)*scaleFactor),
                        y: location.y,
                        z: Math.floor((location.z - Gaia.origin.z)*scaleFactor)
                    }
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        default:
            throw new Error(`Unsupported conversion from ${fromDimension}`);
    }
}

export const the_end = world.getDimension('the_end');
export const overworld = world.getDimension('overworld')
