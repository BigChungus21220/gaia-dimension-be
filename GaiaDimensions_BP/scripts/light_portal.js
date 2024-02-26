import { world, Vector, system, BlockPermutation } from "@minecraft/server";
import Portal from "./api/Portal";
import { Vec3, vec3 } from "./Vector";
world.afterEvents.itemUseOn.subscribe(
  ({ source, itemStack, block, blockFace }) => {
    try {
      if (
        itemStack.typeId === "gaia:glint_and_gold" &&
        block.typeId === "gaia:keystone_block"
      ) {
        const pos = Vector.add(
          Vector.convertDirection(blockFace),
          block.location
        );
        const lit = Portal.canLight(block.dimension.getBlock(pos));
        if (lit) {
          source.playSound("block.end_portal.spawn", {
            location: block.location,
          });
        }
      }
    } catch (error) {
      console.error(error, error.stack);
    }
  }
);

world.beforeEvents.playerBreakBlock.subscribe(
  ({ block, player }) => {
    system.runTimeout(() => {
      Portal.breakPortal(block);
      player.playSound("break.amethyst_block", { location: block.location });
    });
  },
  { blockTypes: ["gaia:keystone_block", "gaia:gaia_portal", "minecraft:grass"] }
);
