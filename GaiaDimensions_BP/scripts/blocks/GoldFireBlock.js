import { system, world } from "@minecraft/server";
import { randomFloat, randomInt } from "../utils/math";

class GoldFire {
  constructor() {
    this.initialize();
  }

  initialize() {
    world.beforeEvents.worldInitialize.subscribe(({ blockTypeRegistry }) => {
      blockTypeRegistry.registerCustomComponent("gaia:gold_fire", {
        onPlace({ block, dimension }) {
          if (block.below().isAir) {
            block.setType("air");
          }
          dimension.playSound("fire.ignite", block.location, { pitch: randomFloat(0.8, 1.2), volume: 1 });
          system.runTimeout(() => {
            block.setType("air");
          }, randomInt(250, 450));
        },

        onTick({ block, dimension }) {
          if (world.gameRules.doFireTick) {
            if (dimension.getWeather() == "Rain") {
              block.setType("air");
            }
          }
        },
      });
    });

    world.afterEvents.playerBreakBlock.subscribe(({ block }) => {
      if (block.above().typeId == "gaia:gold_fire") {
        block.above().setType("air");
      }
    });
  }
}

const GoldFireBlock = new GoldFire();
export default GoldFireBlock;
