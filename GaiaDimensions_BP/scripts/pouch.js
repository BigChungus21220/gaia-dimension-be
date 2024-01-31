import { system, world } from "@minecraft/server";

system.beforeEvents.watchdogTerminate.subscribe((eventData) => {
  eventData.cancel = true;
});
function createGP(player, inventory, heldItem) {
  if (heldItem != undefined) {
    if (heldItem.typeId == "gaia:gem_pouch") {
      let lore = heldItem.getLore();
      if (lore.length == 0) {
        let GPID = `GP:${Math.floor(Math.random() * 9999)}`;
        heldItem.setLore([GPID]);
        inventory.setItem(player.selectedSlot, heldItem);
        let gpContainer = player.dimension.spawnEntity(
          "gaia:gem_pouch_container",
          player.location
        );
        gpContainer.nameTag = "gemPouch_ui";
        gpContainer.addTag(GPID);
      } else {
        player.runCommand(
          `tp @e[type=gaia:gem_pouch_container,name="gemPouch_ui"] ^-6 ^6 ^`
        );
      }
    }
  } else {
    player.runCommand(
      `tp @e[type=gaia:gem_pouch_container,name="gemPouch_ui"] ^-6 ^6 ^`
    );
  }
}
function openPouch(player, itemProperties) {
  let GPConatinerQuery = { tags: [itemProperties.id] };
  let conatiner = player.dimension.getEntities(GPConatinerQuery);
  conatiner.forEach((GPConatiner) => {
    let newLocation = player.location;
    newLocation.y = newLocation.y + 1;
    GPConatiner.teleport(newLocation);
  });
}
system.runTimeout(() => {
  system.runInterval(() => {
    let allPlayers = world.getAllPlayers();

    allPlayers.forEach((player) => {
      let heldItemProperty = player.getDynamicProperty(`III`);
      let inventory = player.getComponent("inventory").container;
      let selectedSlot = player.selectedSlot;
      let heldItem = inventory.getItem(selectedSlot);
      let itemProperties = {
        slot: undefined,
        item: undefined,
        id: undefined,
      };
      let changed = true;

      if (heldItem) {
        itemProperties.item = heldItem.typeId;
        if (heldItem.getLore().length > 0) {
          itemProperties.id = heldItem.getLore()[0];
        }
      }
      itemProperties.slot = selectedSlot;
      if (
        heldItemProperty != undefined &&
        JSON.stringify(itemProperties) != heldItemProperty
      ) {
        if (changed) {
          createGP(player, inventory, heldItem);
          player.setDynamicProperty(`III`, JSON.stringify(itemProperties));
        } else {
          player.setDynamicProperty(`III`, JSON.stringify(itemProperties));
        }
      } else {
        player.setDynamicProperty(`III`, JSON.stringify(itemProperties));
      }

      let lore = heldItem.getLore();
      if (heldItem.typeId == "gaia:gem_pouch" && lore.length > 0) {
        openPouch(player, itemProperties);
      } else {
        player.runCommand(
          `tp @e[type=gaia:gem_pouch_container,name="gemPouch_ui"] ^-6 ^6 ^`
        );
      }
    });
  }, 1);
}, 60);
