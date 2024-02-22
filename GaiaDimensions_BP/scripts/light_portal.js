import { world, Vector} from "@minecraft/server";
import gaia from './world';

system.afterEvents.itemUseOn.subscribe(async (event) => {
    if (event.itemStack.typeId === "gaia:glint_and_gold" && event.block.typeId === 'gaia:keystone_block') {
      const pos = Vector.add(Vector.convertDirection(event.blockFace), event.block.location);
  
      const portalData = {
        location: { x: pos.x, y: pos.y, z: pos.z },
        dimension: event.block.dimension,
        source: event.source
      };
  
      gaia.triggerEvent('portalActivate', portalData, 'BeforeEvent');
  
      const data = await gaia.listenFor('portalActivate', 'Canceled', 'BeforeEvent');
      if (data?.cancel) {
        return;
      }
  
      if (gaia.canLight(event.block.dimension.getBlock(pos))) {
        gaia.triggerEvent('portalActivate', portalData, 'AfterEvent');
        event.source.playSound('block.end_portal.spawn', { location: event.block.location });
      }
    }
  });
  
  system.afterEvents.playerBreakBlock.subscribe((ev) => {
    const { block, player } = ev;
    if (['gaia:keystone_block', 'gaia:gaia_portal'].includes(block.typeId)) {
      gaia.breakPortal(block.location, block.dimension, true);
      player.playSound('break.amethyst_block', { location: block.location });
    }
  });
  