import { system, world } from "@minecraft/server";

const fluids = [
"gaia:liquid_bismuth",
"gaia:liquid_bismuth_down",
"gaia:liquid_bismuth1",
"gaia:liquid_bismuth2",
"gaia:liquid_bismuth3",

"gaia:liquid_aura",
"gaia:liquid_aura_down",
"gaia:liquid_aura1",
"gaia:liquid_aura2",
"gaia:liquid_aura3",

"gaia:mineral_water",
"gaia:mineral_water_down",
"gaia:mineral_water1",
"gaia:mineral_water2",
"gaia:mineral_water3",

"gaia:superhot_magma",
"gaia:superhot_magma_down",
"gaia:superhot_magma1",
"gaia:superhot_magma2",
"gaia:superhot_magma3",

"gaia:sweet_muck",
"gaia:sweet_muck_down",
"gaia:sweet_muck1",
"gaia:sweet_muck2",
"gaia:sweet_muck3"
]

const hot_fluids = [
    "gaia:superhot_magma",
    "gaia:superhot_magma_down",
    "gaia:superhot_magma1",
    "gaia:superhot_magma2",
    "gaia:superhot_magma3",

    "gaia:liquid_bismuth",
    "gaia:liquid_bismuth_down",
    "gaia:liquid_bismuth1",
    "gaia:liquid_bismuth2",
    "gaia:liquid_bismuth3",
]

system.runInterval(() => {
    const players = world.getPlayers();
  
    /*for (const entity of world.getDimension("overworld").getEntities()) { // Activate to let fluids effect entities (Causes some lag)
      if (
        hot_fluids.includes(world.getDimension(entity.dimension.id).getBlock({ ...entity.location, y: entity.location.y + 1 }).typeId) ||
        hot_fluids.includes(world.getDimension(entity.dimension.id).getBlock(entity.location).typeId)
      ) {
        entity.setOnFire(10, true);
      }

      if (
        fluids.includes(world.getDimension(entity.dimension.id).getBlock({ ...entity.location, y: entity.location.y + 1 }).typeId) ||
        fluids.includes(world.getDimension(entity.dimension.id).getBlock(entity.location).typeId)
      ) {
        entity.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
      }
    }*/

    for (const player of players) {
      const dimension = world.getDimension(player.dimension.id)
      if (
        fluids.includes(dimension.getBlock({ ...player.location, y: player.location.y + 1 }).typeId) ||
        fluids.includes(dimension.getBlock(player.location).typeId)
      ) {
        player.addEffect("slow_falling", 4, { amplifier: player.isSneaking ? 1 : 2, showParticles: false });
        if (player.isJumping) {
          player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
        }

        if (
          hot_fluids.includes(dimension.getBlock({ ...player.location, y: player.location.y + 1 }).typeId) ||
          hot_fluids.includes(dimension.getBlock(player.location).typeId)
        ) {
          player.setOnFire(10, true);
        } else {
          player.extinguishFire(true);
        }
      }

      if (fluids.includes(dimension.getBlock({ ...player.location, y: player.location.y + 1.63 }).typeId)) {
        player.runCommand("fog @s push fluid:water_fog fluid_fog");
      } else {
        player.runCommand("fog @s remove fluid_fog");
      }
    }
  });
