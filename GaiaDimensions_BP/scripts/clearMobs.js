import { world, system } from "@minecraft/server"
import gaia from './world'

system.runInterval(() => {
    const players = world.getPlayers()
    for (const player of players){
        if (gaia.isInGaia(player)){
            const entities = player.dimension.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"})
            for (const entity of entities){
                entity.remove()
            }
        }
    }
},8)