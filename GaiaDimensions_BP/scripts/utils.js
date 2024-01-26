import { system, world } from "@minecraft/server";
 export function delay(ticks) {
    return new Promise(res=>system.runTimeout(res,ticks*20));
}

export const the_end = world.getDimension('the_end');
export const o0verworld = world.getDimension('overworld')
