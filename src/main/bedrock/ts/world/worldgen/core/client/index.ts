import { Player, system, world } from "@minecraft/server";
import { ClientChunk } from "./local-chunks";
import { SESSION_MANAGER } from "../world_gen/index";
import { DEFINITION_MANAGER } from "../definitions/index";

// Track initialized players to avoid double-init
const initializedPlayers = new Set<string>();

// Initialize session manager finalization once ready
world.afterEvents.worldLoad.subscribe(() => (async () => {
    await SESSION_MANAGER.ready;
    DEFINITION_MANAGER.triggerFinialize(SESSION_MANAGER.procedural!);
    // Init any players already in world (handles /reload case)
    for (const p of world.getAllPlayers()) {
        playerInitialize(p).catch(e => console.error(e));
    }
})().catch(e => console.error(e, e.stack)));

// Handle players joining after world load (new joins, respawns)
world.afterEvents.playerSpawn.subscribe(e => {
    if (e.initialSpawn) {
        playerInitialize(e.player).catch(err => console.error(err));
    }
});

// Cleanup on leave
world.beforeEvents.playerLeave.subscribe(e => {
    initializedPlayers.delete(e.player.id);
    ClientChunk.open(SESSION_MANAGER, e.player).stop();
});

async function playerInitialize(player: Player) {
    if (initializedPlayers.has(player.id)) return;
    initializedPlayers.add(player.id);
    await SESSION_MANAGER.ready;
    const local = ClientChunk.open(SESSION_MANAGER, player);
    local.start();
}

