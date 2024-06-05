import { vec3 } from '../Vec3.js';
import { world } from "@minecraft/server";
import { push_entities } from "./Geyser.js";

world.beforeEvents.worldInitialize.subscribe(eventData => {
    eventData.blockTypeRegistry.registerCustomComponent('gaia:geyser', {
        async OnStepOn(e) {
            let { block, player } = e;
            let spawn_pos = vec3(block.location).add(vec3(0.5, 1.1, 0.5)).toObject();
            dimension.getPlayers().forEach((e) => { e.playSound("geyser.blast", { location: spawn_pos }); });
            await new Promise(resolve => setTimeout(resolve, 10));
            push_entities(dimension, spawn_pos, 120); // start blasting entities
            dimension.spawnParticle("gaia:geyser_pre_steam", spawn_pos);
            await new Promise(resolve => setTimeout(resolve, 20));
            dimension.spawnParticle("gaia:geyser_steam", spawn_pos);
            dimension.spawnParticle("gaia:geyser_blast", spawn_pos);
        }
    });
});
