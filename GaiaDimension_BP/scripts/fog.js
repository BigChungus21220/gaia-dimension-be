import { world, system, Vector } from "@minecraft/server"
import { getBiome, log, inGaiaDimension } from 'utils.js'

const biomes = [
    "mineral_river",
    "volcanic_lands",
    "shining_grove",
    "smoldering_bog",
    "static_wasteland",
    "green_agate_jungle",
    "crystal_plains",
    "goldstone_lands",
    "mutant_agate_wildwood",
    "purple_agate_swamp",
    "blue_agate_taiga",
    "pink_agate_forest",
    "salt_dunes",
    "fossil_woodland",
    "mineral_resevoir"
]

function clearFogs(player){
    for (const biome of biomes){
        player.runCommandAsync("fog @s remove " + biome)
    }
}

function addFog(player, biome){
    player.runCommandAsync("fog @s push gaia:" + biome + "_fog " + biome)
}

//run on enter / exit end dimension or when player changes x/z position in the end
function updateFog(player){
    clearFogs(player)
    let biome = getBiome(player.location, player.dimension);
    if (biome != "none"){
        addFog(player, biome)
    }
}

function floorEquals(a, b){
    return Math.floor(a.x) == Math.floor(b.x) && Math.floor(a.z) == Math.floor(b.z)
}

let playerData = {}

system.runInterval(() => {
    let players = world.getPlayers()
    for (let player of players){
        let playerId = player.id
        let playerInArea = inGaiaDimension(player)
        let playerLocation = player.location
        if (
            playerData[playerId] === undefined ||
            playerData[playerId].lastInArea != playerInArea ||
            (playerInArea && !floorEquals(playerLocation, playerData[playerId].lastLocation))
        ){
            updateFog(player)
        }
        playerData[playerId] = {
            lastInArea: playerInArea,
            lastLocation: playerLocation
        }
    }
}, 8)

