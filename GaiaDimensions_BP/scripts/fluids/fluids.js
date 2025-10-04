import { system, world } from "@minecraft/server";

const fluids = [
"gaiadimension:liquid_bismuth",
"gaiadimension:liquid_bismuth_down",
"gaiadimension:liquid_bismuth1",
"gaiadimension:liquid_bismuth2",
"gaiadimension:liquid_bismuth3",

"gaiadimension:liquid_aura",
"gaiadimension:liquid_aura_down",
"gaiadimension:liquid_aura1",
"gaiadimension:liquid_aura2",
"gaiadimension:liquid_aura3",

"gaiadimension:mineral_water",
"gaiadimension:mineral_water_down",
"gaiadimension:mineral_water1",
"gaiadimension:mineral_water2",
"gaiadimension:mineral_water3",

"gaiadimension:superhot_magma",
"gaiadimension:superhot_magma_down",
"gaiadimension:superhot_magma1",
"gaiadimension:superhot_magma2",
"gaiadimension:superhot_magma3",

"gaiadimension:sweet_muck",
"gaiadimension:sweet_muck_down",
"gaiadimension:sweet_muck1",
"gaiadimension:sweet_muck2",
"gaiadimension:sweet_muck3"
]

const hot_fluids = [
    "gaiadimension:superhot_magma",
    "gaiadimension:superhot_magma_down",
    "gaiadimension:superhot_magma1",
    "gaiadimension:superhot_magma2",
    "gaiadimension:superhot_magma3",

    "gaiadimension:liquid_bismuth",
    "gaiadimension:liquid_bismuth_down",
    "gaiadimension:liquid_bismuth1",
    "gaiadimension:liquid_bismuth2",
    "gaiadimension:liquid_bismuth3",
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
        fluids.includes(dimension.getBlock({ ...player?.location, y: player?.location?.y + 1 })?.typeId) ||
        fluids.includes(dimension.getBlock(player?.location)?.typeId)
      ) {
        player.addEffect("slow_falling", 4, { amplifier: player.isSneaking ? 1 : 2, showParticles: false });
        if (player.isJumping) {
          player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
        }

        if (
          hot_fluids.includes(dimension.getBlock({ ...player.location, y: player.location.y + 1 })?.typeId) ||
          hot_fluids.includes(dimension.getBlock(player?.location)?.typeId)
        ) {
          player.setOnFire(10, true);
        } else {
          player.extinguishFire(true);
        }
      }

      if (fluids.includes(dimension.getBlock({ ...player?.location, y: player?.location?.y + 1.63 })?.typeId)) {
        player.runCommand("fog @s push fluid:water_fog fluid_fog");
      } else {
        player.runCommand("fog @s remove fluid_fog");
      }
    }
  });
