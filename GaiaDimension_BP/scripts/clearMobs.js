import { world, system, Vector } from "@minecraft/server"
import { log, inGaiaDimension } from 'utils.js'

system.runInterval(() => {
    let players = world.getPlayers()
    for (let player of players){
        if (inGaiaDimension(player)){
            let entities = player.dimension.getEntities({location: player.location, maxDistance: 500, type: "minecraft:shulker"})
            for (let entity of entities){
                entity.teleport(new Vector(0, -100, 0))
            }
        }
    }
},8)