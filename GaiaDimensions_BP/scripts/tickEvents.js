import { system, world } from "@minecraft/server"
import { Gaia } from './api/Gaia.js'
import {vec3, Vec3} from './Vector'
import * as Events from "./api/Events"

//event triggers
//system.runInterval(() => { Events.tick1.trigger() },1);
//system.runInterval(() => { Events.tick2.trigger() },2);
system.runInterval(() => { Events.tick8.trigger() },8);

//clear entities
Events.tick8.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        Gaia.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"}).forEach((entity) => entity.remove());
    }
})


//update biomes/fog
let playerLocations = []

Events.tick8.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        if(!playerLocations.hasOwnProperty(player.id)){
            playerLocations[player.id] = vec3(0,0,0);
        }
        const floorpos = vec3(player.location).floor();
        if (!floorpos.equals(playerLocations[player.id])){
            Events.playerChangeBlock.trigger({player:player});
        }
        playerLocations[player.id] = floorpos;
    }
})