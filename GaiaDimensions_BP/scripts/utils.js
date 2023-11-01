import { world, system, Vector } from "@minecraft/server";

export function getBiome(position, dimension){
    let blockId = dimension.getBlock(new Vector(position.x, 0, position.z)).typeId
    if (blockId.includes("gaia:bedrock_")){
        return blockId.replace("gaia:bedrock_","")
    } else {
        return "none"
    }
}

export function log(msg){
    world.sendMessage(msg.toString())
}

export function vectorToString(vector){
    return vector.x + " " + vector.y + " " + vector.z
}

export function inGaiaDimension(player){
    let playerLoc = player.location
    return player.dimension.id == "minecraft:the_end" && playerLoc.x <= 200000 && playerLoc.z <= 200000 && playerLoc.x >= 100000 && playerLoc.z >= 100000
}

export function directionToVector(direction){
    switch (direction){
        case "Up":
            return new Vector(0,1,0)
        case "Down":
            return new Vector(0,-1,0)
        case "North":
            return new Vector(0,0,-1)
        case "South":
            return new Vector(0,0,1)
        case "East":
            return new Vector(-1,0,0)
        case "West":
            return new Vector(1,0,0)
        default:
            return new Vector(0,0,0)
    }
}

export function delay(ticks) {
    return new Promise(res=>system.runTimeout(res,ticks));
}
