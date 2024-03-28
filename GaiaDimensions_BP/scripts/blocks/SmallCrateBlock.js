import { system, world } from "@minecraft/server";

class SmallCrate {
  constructor() {
    this.initialize();
  }

  initialize() {
    world.beforeEvents.worldInitialize.subscribe(({ blockTypeRegistry }) => {
      blockTypeRegistry.registerCustomComponent("gaia:small_crate", {
        beforeOnPlayerPlace(e) {
          let entity = e.dimension.spawnEntity("gaia:crude_storage_crate", e.block.center());
          entity.nameTag = "crude_storage_crate_ui";
        },
      });
    });

    system.runInterval(() => {
      const players = world.getAllPlayers();
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const block = player.getBlockFromViewDirection({ maxDistance: 6 })?.block;
        if (block?.typeId.startsWith("gaia:crude_storage_crate")) {
          const entity = block.dimension
            .getEntitiesAtBlockLocation(block.location)
            .filter((v) => v.typeId === "gaia:crude_storage_crate")[0];
          if (player.isSneaking) {
            if (entity.getProperty("gaia:can_interact")) {
              entity.setProperty("gaia:can_interact", false);
            }
          } else {
            if (!entity.getProperty("gaia:can_interact")) {
              entity.setProperty("gaia:can_interact", true);
            }
          }
        }
      }
    }, 10);

    world.afterEvents.entityHitEntity.subscribe(({ hitEntity }) => {
      const dimension = hitEntity.dimension;
      const location = hitEntity.location;
      const block = dimension.getBlock(location);
      if (hitEntity.typeId == "gaia:crude_storage_crate") {
        if (block?.typeId.startsWith("gaia:crude_storage_crate")) {
          dimension.runCommand(`setblock ${location.x} ${location.y} ${location.z} air destroy`);
        }
        hitEntity.remove();
        return;
      }
    });
  }
}

const SmallCrateBlock = new SmallCrate();
export default SmallCrateBlock;
