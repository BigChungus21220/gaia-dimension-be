import { system, MolangVariableMap, Player } from "@minecraft/server";
import { vec3 } from './Vector.js';
import { delay } from './utils.js'
import gaia from './world'
let isCanceled = false
//applies velocity to entities that stand on an active geyser for duration ticks
function push_entities(dimension, spawn_pos, duration){
    let t = 0;
    let determinant_y = spawn_pos.y - 0.5;
    let tickdelay = 4; //how often to repeat
    let height;
let beforeEventTriggered = false;

   let geyserId = system.runInterval(async () => {
        //run only while geyser is active
        const data = await gaia.listenFor('geyserErupt','Canceled','BeforeEvent')
        if (t < duration){
            //loop through all entities
            dimension.getEntities().forEach(function (e){
                let player_pos = e.location;
                let heightDelta = player_pos.y - determinant_y;
                height = heightDelta

                if (!beforeEventTriggered) {
                    gaia.triggerEvent('geyserErupt',{dimension:dimension,duration:duration,location:spawn_pos,height:height,getAffectedEntities:dimension.getEntities({location:spawn_pos,maxDistance:1}),cancel:false},'BeforeEvent');
                    beforeEventTriggered = true;
                }
          if (data && data.cancel === true) isCanceled = true; system.clearRun(geyserId); 
                //check if velocity should be applied
                if (
                    Math.floor(spawn_pos.x) == Math.floor(player_pos.x) && 
                    Math.floor(spawn_pos.z) == Math.floor(player_pos.z) && 
                    heightDelta > 0 && heightDelta < 5 &&
                    determinant_y + 0.2 >= dimension.getBlockFromRay(player_pos,vec3(0,-1,0),{includeLiquidBlocks: false, includePassableBlocks: false, maxDistance: 15}).block.location.y
                ){
                    //apply velocity
                    try {
                        e.applyKnockback(0, 0, 0, 1 + e.getVelocity().y);
                    } catch (e){}
                }
            });
            t += tickdelay;
        } else {
            //exit when geyser stops
            //Sends the after event, after the geyser has stopped
            gaia.triggerEvent('geyserErupt',{dimension:dimension,duration:duration,location:spawn_pos,height:height,getAffectedEntities:dimension.getEntities({location:spawn_pos,maxDistance:1})},'AfterEvent')
            return;
        }
    }, tickdelay);
}

system.afterEvents.scriptEventReceive.subscribe(async (event) => {
    if (event.id == "gaia:geyser.erupt"){
        let block = event.sourceBlock;
        let dimension = block.dimension;
        let spawn_pos = vec3(block.location).add(vec3(0.5,1.1,0.5)).toObject();
        dimension.getPlayers().forEach(function (e){ e.playSound("geyser.blast", {location: spawn_pos}) });
        await delay(10);
        push_entities(dimension, spawn_pos, 120); //start blasting entities
        if (!isCanceled){
        dimension.spawnParticle("gaia:geyser_pre_steam", spawn_pos, new MolangVariableMap());

        await delay(20);
        dimension.spawnParticle("gaia:geyser_steam", spawn_pos, new MolangVariableMap());
        dimension.spawnParticle("gaia:geyser_blast", spawn_pos, new MolangVariableMap());
    } else isCanceled = false; return;
    
    }
});
