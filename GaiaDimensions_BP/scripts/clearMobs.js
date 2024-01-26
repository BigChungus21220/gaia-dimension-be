import { system } from "@minecraft/server"
import Gaia from './api/Gaia'

system.runInterval(() => {
    const players = Gaia.getPlayers();
    for (const player of players){
        Gaia.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"}).forEach((entity) => entity.remove())
    }
},8)