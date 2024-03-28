import { world } from "@minecraft/server";

class Geyser {
  constructor() {
    this.initialize();
  }

  initialize() {
    world.beforeEvents.worldInitialize.subscribe(({ blockTypeRegistry }) => {
      blockTypeRegistry.registerCustomComponent("gaia:geyser_vent", {
        onTick({ block, dimension }) {
          dimension.spawnParticle("gaia:geyser_smoke", block.location);
        },
      });
    });
  }
}

const GeyserBlock = new Geyser();
export default GeyserBlock;
