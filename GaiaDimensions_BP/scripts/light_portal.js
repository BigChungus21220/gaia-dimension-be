import { world, Vector} from "@minecraft/server"
import { directionToVector, log } from './utils.js'
import { isUnlitPortal, isLitPortal, placePortal, breakPortal } from './portal_utils.js'

function checklight(block){
    let position = block.location
    let dimension = block.dimension
    let offset = Vector.zero
    let light_success = false
    let x_oriented = true
    for (let x = -2; x <= -1; x++){
        for (let y = -3; y <= -1; y++){
            let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
            if (isUnlitPortal(Vector.add(position, test_offset), dimension, true)){
                offset = test_offset
                light_success = true
                break
            }
        }
    }
    if (!light_success){
        x_oriented = false
        for (let x = -2; x <= -1; x++){
            for (let y = -3; y <= -1; y++){
                let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (isUnlitPortal(Vector.add(position, test_offset), dimension, false)){
                    offset = test_offset
                    light_success = true
                    break
                }
            }
        }
    }

    if (light_success){
        placePortal(Vector.add(position, offset), dimension, x_oriented)
    }
}

world.afterEvents.itemUseOn.subscribe((event) => {
    if (event.itemStack.typeId == "gaia:glint_and_gold"){
        let pos = Vector.add(directionToVector(event.blockFace), event.block.location)
        checklight(event.block.dimension.getBlock(pos))
    }
})

world.afterEvents.blockBreak.subscribe((event) => {
    if (event.block.typeId == "gaia:gaia_portal"){
        let block = event.block;
        let position = block.location
        let dimension = block.dimension
        let offset = Vector.zero
        let is_lit = false
        let x_oriented = true
        for (let x = -2; x <= -1; x++){
            for (let y = -3; y <= -1; y++){
                let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (isLitPortal(Vector.add(position, test_offset), dimension, true)){
                    offset = test_offset
                    is_lit = true
                    break
                }
            }
        }
        if (!is_lit){
            x_oriented = false
            for (let x = -2; x <= -1; x++){
                for (let y = -3; y <= -1; y++){
                    let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                    if (isLitPortal(Vector.add(position, test_offset), dimension, false)){
                        offset = test_offset
                        is_lit = true
                        break
                    }
                }
            }
        }
    
        if (is_lit){
            breakPortal(Vector.add(position, offset), dimension, x_oriented)
        }
    }
})