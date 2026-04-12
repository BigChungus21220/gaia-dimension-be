import { EasingType, GameMode, Player, system, TicksPerSecond, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { ClientChunk } from "./local-chunks";
import { SESSION_MANAGER } from "../world_gen/index";
import { delay, Vec3 } from "../utils";
import { DEFINITION_MANAGER } from "../definitions/index";

world.afterEvents.worldLoad.subscribe(e=>{ for(const p of world.getAllPlayers()){ playerInitialize(p).catch(e=>console.error(e,e.stack)); } });
world.beforeEvents.playerLeave.subscribe(e=>{ ClientChunk.open(SESSION_MANAGER, e.player).stop(); })
world.afterEvents.worldLoad.subscribe(()=>(async ()=>{
    await null;
    DEFINITION_MANAGER.triggerFinialize(SESSION_MANAGER.procedural);
})().catch(e=>console.error(e,e.stack)));

/**@param {Player} player  */
async function playerInitialize(player: Player){
    await null;
    const local = ClientChunk.open(SESSION_MANAGER as any, player);
    local.start();
    
    // Simple teleport to surface on load if in a scripted dimension
    const {x, z} = player.location;
    const gen = local.currentGenerator;
    if (gen) {
        const y = gen.getHeight(x, z);
        player.teleport({x, y: y + 1, z});
    }

    player.sendMessage("§7World generation initialized.");
    player.sendMessage("§7Type §r§l!debug§r§7 to show debug stats.");
}

world.beforeEvents.chatSend.subscribe(async e=>{
    const msg = e.message.toLowerCase();
    const player = e.sender;
    if(msg === "!stats") {
        while(!player.isSneaking) await delay(1);
        const form = new ModalFormData();
        form.title("§t§lWorld Gen Settings");
        form.textField("\nSeed", Date.now() + "", "" + SESSION_MANAGER.seed);
        form.toggle("Precomputed Features", DEFINITION_MANAGER.IsPrecalculatedVariable);
        form.slider("Precomputed Samples", 5, 30, 1, DEFINITION_MANAGER.IsPrecalculatedSamplesVariable);
        const data = await form.show(player);
        if(!data.canceled){
            DEFINITION_MANAGER.IsPrecalculated = data.formValues[1] as boolean;
            DEFINITION_MANAGER.PrecalculatedSamples = data.formValues[2] as number;
            let newSeed = parseInt(data.formValues[0] as string);
            if(isFinite(newSeed)) world.setDynamicProperty("seed", newSeed);
            player.sendMessage("Successfully Updated\nRejoin to active these changes.");
        }
    }
    else if(msg === "!debug"){ (player as any)._debug = !(player as any)._debug; }
});
