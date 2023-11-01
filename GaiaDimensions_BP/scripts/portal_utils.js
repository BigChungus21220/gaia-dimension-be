import { Vector, BlockPermutation } from "@minecraft/server"
import { log, vectorToString } from './utils.js'

export function isUnlitPortal(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "minecraft:air"){
                isValid = false
                break
            }
        }
    }
    return isValid
}

export function isLitPortal(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "gaia:gaia_portal"){
                isValid = false
                break
            }
        }
    }
    return isValid
}

export function placePortal(corner, dimension, x_oriented){
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge){
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
            } else {
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:gaia_portal", {"gaia:x_oriented": x_oriented}))
            }
        }
    }
}

export function breakPortal(corner, dimension, x_oriented){
    let start = Vector.add(corner, new Vector(x_oriented ? 0 : 1, 1, x_oriented ? 1 : 0))
    let end = Vector.add(corner, new Vector(x_oriented ? 0 : 2, 3, x_oriented ? 2 : 0))
    log("[ " + vectorToString(start) + " ] - [ " + vectorToString(end) + " ]")
    dimension.fillBlocks(end, start, BlockPermutation.resolve("minecraft:air"))
}