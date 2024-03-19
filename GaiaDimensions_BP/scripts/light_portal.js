import { world, system } from "@minecraft/server";
import Portal from "./api/Portal";
import { vec3 } from "./Vec3";

world.afterEvents.itemUseOn.subscribe(
  ({ source, itemStack, block, blockFace }) => {
    try {
      if (
        itemStack.typeId === "gaia:glint_and_gold" &&
        block.typeId === "gaia:keystone_block"
      ) {
        const pos = vec3(block.location).add(
          vec3(blockFace.toLowerCase())
        )
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
  { blockTypes: ["gaia:keystone_block", "gaia:gaia_portal"] }
);
