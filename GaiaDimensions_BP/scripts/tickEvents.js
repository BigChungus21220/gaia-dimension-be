import { BlockPermutation, system, world } from "@minecraft/server"
import Gaia from './api/Gaia'
import { vec3 } from './Vector'
import * as Events from "./api/Events"
import { isSame } from './utils'

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
            Gaia.getEntities({ location: player.location, maxDistance: 500, type: "minecraft:shulker" }).forEach((entity) => entity.remove())
        }
    }
})

//endstone clear
Events.tick30.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players) {
        if (player) {
            const { x, y, z } = player.location
            player.dimension.fillBlocks(player.location, { x: x + 500, y: y + 500, z: z + 500 }, BlockPermutation.resolve('minecraft:air'), { matchingBlock: BlockPermutation.resolve('minecraft:endstone') })
        }
    }
})

//update biomes/fog
let playerLocations = {}

Events.tick2.subscribe(() => {
    const players = Gaia.getPlayers();
    for (const player of players) {
        if (player) {
            const { x, y, z } = player.location
            // Account for only x and z
            const floorpos = vec3(x, 0, z).floor();
            if (!isSame(floorpos, playerLocations[player.id])) {
                Events.playerChangeBlock.trigger({ player: player });
            }
            playerLocations[player.id] = { x, y: 0, z }
        }
    }
})
