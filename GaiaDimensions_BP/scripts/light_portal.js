import { world, Vector} from "@minecraft/server";
import { Gaia } from './api/Gaia';
import { vec3, Vec3 } from "Vector.js";

world.afterEvents.itemUseOn.subscribe(async (event) => {
    try {
        if (event.itemStack.typeId === "gaia:glint_and_gold" && event.block.typeId === 'gaia:keystone_block') {
            const pos = vec3(event.blockFace).add(vec3(event.block.location));

            const portalData = {
                location: pos,
                dimension: event.block.dimension,
                source: event.source
            };
            gaia.triggerEvent('portalActivate', portalData, 'BeforeEvent');

            const data = await gaia.listenFor('portalActivate', 'Canceled', 'BeforeEvent');
            if (data && data.cancel) {
                return;
            }

            const lit = gaia.canLight(event.block.dimension.getBlock(pos));

            if (lit) {
                gaia.triggerEvent('portalActivate', portalData, 'AfterEvent');
                event.source.playSound('block.end_portal.spawn', { location: event.block.location });
            }
        }
    } catch (error) {

    }
});

world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const { block, player } = ev;
    gaia.breakPortal(block.location, block.dimension, true);
    player.playSound('break.amethyst_block', { location: block.location });
}, { blockTypes: ['gaia:keystone_block', 'gaia:gaia_portal'] });

