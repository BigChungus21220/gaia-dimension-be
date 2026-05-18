const fs = require('fs');
const path = require('path');

const ROOT = 'd:/Users/OS/Documents/GitHub/Gaia-Dimension-be/src/main/bedrock/data';

// ═══════════════════════════════════════════════════
// 1. Delete broken recipes with missing items/blocks
// ═══════════════════════════════════════════════════
const recipesToDelete = [
    'recipes/blue_geode_slice.json',
    'recipes/bolstered_bricks.json',
    'recipes/bolstered_bricks_2.json',
    'recipes/cloudy_glass.json',
    'recipes/construct_charm.json',
    'recipes/corrupted_grass.json',
    'recipes/crusted_gaia_stone_bricks.json',
    'recipes/elixir_drink.json',
    'recipes/blank_kit.json',
    'recipes/armor/albite_legs.json',
    'recipes/armor/carnelian_legs.json',
    'recipes/armor/diopside_legs.json',
    'recipes/armor/goshenite_legs.json',
    'recipes/armor/proustite_legs.json',
    'recipes/armor/sugilite_legs.json',
    // Malachite recipes that reference blocks that aren't resolving as items
    'recipes/malachite_chisel_bricks.json',
    'recipes/malachite_chisel_stairs.json',
    'recipes/malachite_cracked_brick_slab.json',
    'recipes/malachite_cracked_brick_stairs.json',
    'recipes/malachite_pulsing_brick_stairs.json',
    'recipes/malachite_pulsing_chisel_stairs.json',
    'recipes/malachite_pulsing_tile_stairs.json',
];

let deleted = 0;
recipesToDelete.forEach(file => {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted:', file);
        deleted++;
    }
});
console.log(`Deleted ${deleted} broken recipes.\n`);

// ═══════════════════════════════════════════════════
// 2. Remove invalid feature files (.molang and .txt)
// ═══════════════════════════════════════════════════
const invalidFeatureFiles = [
    'features/decorations/crystal_determinant.molang',
    'features/decorations/crystal_x.molang',
    'features/decorations/geysers.txt',
];
invalidFeatureFiles.forEach(file => {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Removed invalid feature file:', file);
    }
});

console.log('\nDone!');
