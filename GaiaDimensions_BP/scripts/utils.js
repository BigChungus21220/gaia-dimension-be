import {system } from "@minecraft/server";
 export function delay(ticks) {
    return new Promise(res=>system.runTimeout(res,ticks*20));
}


