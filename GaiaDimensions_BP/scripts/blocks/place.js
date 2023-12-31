import * as MC from "@minecraft/server";

MC.system.beforeEvents.watchdogTerminate.subscribe(
  (events) => (events.cancel = true)
);
MC.world.afterEvents.playerPlaceBlock.subscribe((events) => {
  let block = events.block;
  let player = events.player;
  if (player) {
    if (block.typeId == "gaia:purifier") {
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaia:purifier_container",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.nameTag = "purifier_ui";
    }
    if (block.typeId == "gaia:restructer") {
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaia:restructer_container",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.runCommand('scriptevent forge:restructurerProperties')
      isEntity.nameTag = "restructer_ui";
      const property = block.permutation.getState('gaiadimension:entity')
      if(property === false){
        block.setPermutation(MC.BlockPermutation.resolve(block.typeId,{"gaiadimension:entity":true}))
      }
    }

    if (block.typeId == "gaiadimension:gaia_stone_furnace"){
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaiadimension:furnace_entity",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.runCommand('scriptevent forge:furnaceProperties')
      isEntity.nameTag = "gaia_furnace";
      const property = block.permutation.getState('gaiadimension:entity')
      if(property === false){
        block.setPermutation(MC.BlockPermutation.resolve(block.typeId,{"gaiadimension:entity":true}))
      }
    }
    if (block.typeId == "gaia:crate") {
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaia:crate_container",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.nameTag = "crate_ui";
    }
    if (block.typeId == "gaia:gem_pouch") {
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaia:purifier_container",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.nameTag = "gem_pouch_ui";
    }
    if (block.typeId == "gaia:large_crate") {
      let position = block.location;
      let isEntity = events.dimension.spawnEntity(
        "gaia:large_crate_container",
        new MC.Vector(position.x + 0.5, position.y, position.z + 0.5)
      );
      isEntity.nameTag = "large_crate_ui";
    }
  }
});
