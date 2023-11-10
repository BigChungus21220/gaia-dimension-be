import { world, system } from "@minecraft/server"
import gaia from './api/Dimension.js'

system.runInterval(() => {
    let players = world.getPlayers()
    for (let player of players){
        if (gaia.isInGaia(player)){
            let entities = player.dimension.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"})
            for (let entity of entities){
                entity.remove()
            }
        }
    }
},8)