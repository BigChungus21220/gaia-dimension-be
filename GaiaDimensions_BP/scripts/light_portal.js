import { world, Vector, Dimension } from "@minecraft/server";
import gaia from './world';

world.afterEvents.itemUseOn.subscribe(async (event) => {
    try {
        if (event.itemStack.typeId === "gaia:glint_and_gold" && event.block.typeId === 'gaia:keystone_block') {
            const pos = Vector.add(Vector.convertDirection(event.blockFace), event.block.location);

            const portalData = {
                location: { x: pos.x, y: pos.y, z: pos.z },
                dimension: event.block.dimension,
                source: event.source,
                cancel: false
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
        console.error('Error in itemUseOn event:', error);
    }
});

world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const { block, player } = ev;

    gaia.breakPortal(block.location, block.dimension, true);
    player.playSound('break.amethyst_block', { location: block.location });
}, { blockTypes: ['gaia:keystone_block', 'gaia:gaia_portal'] });
