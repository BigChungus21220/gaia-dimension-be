import { world, Vector } from "@minecraft/server";
import Portal from './api/Portal'


world.afterEvents.itemUseOn.subscribe(({ source, itemStack, block, blockFace }) => {
  try {
    if (itemStack.typeId === "gaia:glint_and_gold" && block.typeId === 'gaia:keystone_block') {
      const pos = Vector.add(Vector.convertDirection(blockFace), block.location);
      const lit = Portal.canLight(block.dimension.getBlock(pos));
      if (lit) {
        source.playSound('block.end_portal.spawn', { location: block.location });
      }
    }
  } catch (error) {

  }
});

world.afterEvents.playerBreakBlock.subscribe(({block,player}) => {
  Portal.breakPortal(block.location, block.dimension, true);
  player.playSound('break.amethyst_block', { location: block.location });
}, { blockTypes: ['gaia:keystone_block', 'gaia:gaia_portal'] });

