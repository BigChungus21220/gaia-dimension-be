import { system, world } from "@minecraft/server";

system.beforeEvents.watchdogTerminate.subscribe((eventData) => {
  eventData.cancel = true;
});

function createGP(player, inventory, heldItem) {
  if (heldItem?.typeId == "gaia:gem_pouch" && heldItem.getLore().length == 0) {
    let GPID = `GP:${Math.floor(Math.random() * 9999)}`;
    heldItem.setLore([GPID]);
    inventory.setItem(player.selectedSlot, heldItem);
    let gpContainer = player.dimension.spawnEntity("gaia:gem_pouch_container", player.location);
    gpContainer.nameTag = "gemPouch_ui";
    gpContainer.addTag(GPID);
  }
  player.runCommand(`tp @e[type=gaia:gem_pouch_container,name="gemPouch_ui"] ^-6 ^6 ^`);
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
      let inventory = player.getComponent("inventory").container;
      let selectedSlot = player.selectedSlot;
      let heldItem = inventory.getItem(selectedSlot);
      let itemProperties = {
        slot: selectedSlot,
        item: heldItem?.typeId,
        id: heldItem?.getLore()[0],
      };

      let heldItemProperty = player.getDynamicProperty(`III`);
      if (heldItemProperty != JSON.stringify(itemProperties)) {
        createGP(player, inventory, heldItem);
        player.setDynamicProperty(`III`, JSON.stringify(itemProperties));
      }

      if (heldItem?.typeId == "gaia:gem_pouch" && heldItem.getLore().length > 0) {
        openPouch(player, itemProperties);
      } else {
        player.runCommand(`tp @e[type=gaia:gem_pouch_container,name="gemPouch_ui"] ^-6 ^6 ^`);
      }
    });
  }, 1);
}, 60);
