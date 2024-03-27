import { BlockPermutation, system} from "@minecraft/server"
import Gaia from './world/Gaia'
import { vec3 } from './Vec3'
import * as Events from "./world/Events"

//event triggers
system.runInterval(() => Events.tick1.trigger(), 1);
system.runInterval(() => Events.tick2.trigger(), 2);
system.runInterval(() => Events.tick8.trigger(), 8);
system.runInterval(() => Events.tick30.trigger(), 30);

//clear entities
Events.tick8.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players) {
        if (player) {
            Gaia.getEntities({ location: player.location, maxDistance: 500, type: "minecraft:shulker" }).forEach((entity) => entity?.remove())
        }
    }
})


let playerLocations = {};

Events.tick2.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players) {
            const { x, y, z } = player.location;
            // Account for only x and z
            const floorpos = vec3(x, 0, z).floor();
            if (!floorpos.compareWith(playerLocations[player.id] ?? floorpos)) {
                Events.playerChangeBlock.trigger({ player: player });
            }
            playerLocations[player.id] = floorpos; // Update player location after trigger
    }
});

