import {system} from "@minecraft/server"
import { level, ModDimension  } from "./world/ModDimension";
import {Vec3} from './Vec3'
import * as Events from "./world/Events"
import SkyboxRenderer from "./renderers/Skybox";



//clear entities
Events.tick8.subscribe(() => {
    const gaia = level.getDimension("gaia_dimension");
    const players = gaia.getPlayers()
    for (const player of players) {
        if (player) {
            gaia.getEntities({
                location: player.location,
                maxDistance: 500,
                type: "minecraft:shulker"
            }).forEach((entity) => entity?.remove())
        }
    }
})


let playerLocations = {};

Events.tick2.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players) {
        // Account for only x and z
        const floorpos = Vec3.from({...player.location, y: 0}).floor();
        if (!floorpos.equals(playerLocations[player.id] ?? floorpos)) {
            Events.playerChangeBlock.trigger({player: player});
        }
        playerLocations[player.id] = floorpos; // Update player location after trigger
    }
});

