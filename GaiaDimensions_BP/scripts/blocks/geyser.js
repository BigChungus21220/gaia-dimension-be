import { system } from "@minecraft/server";
import { vec3 } from '../Vec3.js';

//applies velocity to entities that stand on an active geyser for duration ticks
export function push_entities(dimension, spawn_pos, duration) {
    let t = 0;
    const determinant_y = spawn_pos.y - 0.5;
    let tickdelay = 4; //how often to repeat
    system.runInterval(() => {
        //run only while geyser is active
        if (t < duration) {
            //loop through all entities
            dimension.getEntities().forEach(function (e) {
                const player_pos = e.location;
                const heightDelta = player_pos.y - determinant_y;
                //check if velocity should be applied
                if (
                    Math.floor(spawn_pos.x) == Math.floor(player_pos.x) &&
                    Math.floor(spawn_pos.z) == Math.floor(player_pos.z) &&
                    heightDelta > 0 && heightDelta < 5 &&
                    determinant_y + 0.2 >= dimension.getBlockFromRay(player_pos, vec3(0, -1, 0), { includeLiquidBlocks: false, includePassableBlocks: false, maxDistance: 15 }).block.location.y
                ) {
                    //apply velocity
                    try {
                        e.applyKnockback(0, 0, 0, 1 + e.getVelocity().y);
                    } catch (e) { }
                }
            });
            t += tickdelay;
        } else {
            //exit when geyser stops
            return;
        }
    }, tickdelay);
}

