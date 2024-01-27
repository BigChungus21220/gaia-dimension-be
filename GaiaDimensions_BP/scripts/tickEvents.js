import { system } from "@minecraft/server"
import Gaia from './api/Gaia'
import {Vec3} from './Vector'
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
let playerLocations = {}

Events.tick2.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        const {x,y,z} = player.location
        // Account for only x and z
        const floorpos = new Vec3(x,0,z).floor();
        if (!isSame(floorpos,playerLocations[player.id])){
            Events.playerChangeBlock.trigger({player:player});
        }
        playerLocations[player.id] = {x,y:0,z}
    }
})

// Checks if the objects are the same(have the same properties with the same value);
const isSame = (obj, obj1) => 
    JSON.stringify(obj) === JSON.stringify(obj1);
