import { system } from "@minecraft/server"
import Gaia from './api/Gaia'
import {vec3, Vec3} from './Vector'
import * as Events from "./api/Events"

//event triggers
system.runInterval(Events.tick1.trigger(),1);
system.runInterval(Events.tick2.trigger(),2);
system.runInterval(Events.tick8.trigger(),8);


//clear entities
Events.tick8.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        Gaia.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"}).forEach((entity) => entity.remove())
    }
})


//update biomes/fog
let playerLocations = []

Events.tick2.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        const floorpos = Vec3.floor(player.location);
        if (floorpos = playerLocations[player.id]){
            Events.playerChangeBlockEvent.trigger({player:player});
        }
    }
})