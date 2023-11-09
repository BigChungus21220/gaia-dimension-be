import { world, system } from "@minecraft/server";
export function log(msg){
    world.sendMessage(msg.toString())
}

 export function delay(ticks) {
    return new Promise(res=>system.runTimeout(res,ticks*20));
}


