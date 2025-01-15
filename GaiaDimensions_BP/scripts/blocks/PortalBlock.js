import {world} from "@minecraft/server";

world.beforeEvents.worldInitialize.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent("gaia:gaia_portal", {
        onTick({block}) {
           block.dimension.spawnParticle('gaia:portal',block.location)
        },
    });
});
