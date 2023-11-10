import { world, Vector} from "@minecraft/server"
import gaia from './world'

world.afterEvents.itemUseOn.subscribe((event) => {
    if (event.itemStack.typeId == "gaia:glint_and_gold"){
        let pos = Vector.add(Vector.convertDirection(event.blockFace), event.block.location)
        gaia.canLight(event.block.dimension.getBlock(pos))
        gaia.triggerEvent('portalActivate',{location:pos,dimension:event.block.dimension,source:event.source})
        event.source.playSound('block.end_portal.spawn',{location:event.block.location})
    }
})




world.afterEvents.playerBreakBlock.subscribe(ev=>{
    const {block,player} = ev
    gaia.breakPortal(block.location,block.dimension,true)
    player.playSound('break.amethyst_block',{location:block.location})
},{blockTypes:['gaia:keystone_block','gaia:gaia_portal']})

