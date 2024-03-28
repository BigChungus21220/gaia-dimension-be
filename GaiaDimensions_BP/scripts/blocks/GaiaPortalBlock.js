import { world } from "@minecraft/server";
import { vec3 } from "../Vec3";
import Portal from "../api/Portal";

class GaiaPortal {
  constructor() {
    this.initialize();
  }

  initialize() {
    world.afterEvents.itemUseOn.subscribe(({ source, itemStack, block, blockFace }) => {
      try {
        if (itemStack.typeId === "gaia:glint_and_gold" && block.typeId === "gaia:keystone_block") {
          const pos = vec3(block.location).add(vec3(blockFace.toLowerCase()));
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
    });
  }
}

const GaiaPortalBlock = new GaiaPortal();
export default GaiaPortalBlock;
