import { system, world,BlockPermutation } from "@minecraft/server";

system.beforeEvents.watchdogTerminate.subscribe(
  (events) => (events.cancel = true)
);

const blockEntities = {
  'gaia:purifier': {
    entityId: 'gaia:purifier_container',
    nametag: 'purifier_ui'
  },
  'gaia:restructurer': {
    entityId: 'gaia:restructer_container',
    nametag: 'restructer_ui'
  },
  'gaiadimension:gaia_stone_furnace': {
    entityId: 'gaiadimension:furnace_entity',
    nametag: 'gaia_furnace'
  },
  'gaia:crate': {
    entityId: 'gaia:crate_container',
    nametag: 'crate_ui'
  },
  'gaia:gem_pouch': {
    entityId: 'gaia:purifier_container',
    nametag: 'gem_pouch_ui'
  },
  'gaia:large_crate': {
    entityId: 'gaia:large_crate_container',
    nametag: 'large_crate_ui'
  }
};

world.afterEvents.playerPlaceBlock.subscribe(({ player, block, dimension }) => {
  if (player) {
    const { entityId, nametag } = blockEntities[block.typeId];
    if (!entityId) return;
    const entity = dimension.spawnEntity(entityId, block.center());
    entity.nameTag = nametag;
    const property = block.permutation.getState('gaiadimension:entity');
    if (!property) {
      block.setPermutation(BlockPermutation.resolve(block.typeId, { "gaiadimension:entity": true }));
    }
  }
}, { blockTypes: Object.keys(blockEntities) });
