const fs = require('fs');
const path = require('path');

const ROOT = 'd:/Users/OS/Documents/GitHub/Gaia-Dimension-be/src/main/bedrock/data';

// ═══════════════════════════════════════════════════
// 1. Delete recipes referencing items/blocks that don't exist
// ═══════════════════════════════════════════════════
const recipesToDelete = [
    'recipes/frail_glitter_block.json',
    'recipes/furnace.json',
    'recipes/gaia_stone_bricks.json',
    'recipes/gemstone_pouch.json',
    'recipes/green_geode_ale.json',
    'recipes/green_geode_slice.json',
    'recipes/gummy_glitter_block.json',
    // All large_chest recipes reference thick_glitter_block which doesn't exist
    'recipes/large_chest_from_aura_tiles.json',
    'recipes/large_chest_from_blue_agate_tiles.json',
    'recipes/large_chest_from_burnt_agate_tiles.json',
    'recipes/large_chest_from_corrupted_tiles.json',
    'recipes/large_chest_from_fire_agate_tiles.json',
    'recipes/large_chest_from_fossilized_tiles.json',
    'recipes/large_chest_from_golden_tiles.json',
    'recipes/large_chest_from_green_agate_tiles.json',
    'recipes/large_chest_from_pink_agate_tiles.json',
    'recipes/large_chest_from_purple_agate_tiles.json',
    'recipes/large_chest_2_from_aura_tiles.json',
    'recipes/large_chest_2_from_blue_agate_tiles.json',
    'recipes/large_chest_2_from_burnt_agate_tiles.json',
    'recipes/large_chest_2_from_corrupted_tiles.json',
    'recipes/large_chest_2_from_fire_agate_tiles.json',
    'recipes/large_chest_2_from_fossilized_tiles.json',
    'recipes/large_chest_2_from_golden_tiles.json',
    'recipes/large_chest_2_from_green_agate_tiles.json',
    'recipes/large_chest_2_from_pink_agate_tiles.json',
    'recipes/large_chest_2_from_purple_agate_tiles.json',
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
// 2. Fix malachite recipe naming mismatches
//    Recipe results/ingredients use old Java naming convention
//    but Bedrock blocks use different naming.
//    Actual block IDs from blocks/gaiadimension/ores/malachite/:
//      chiselled_malachite_brick, chiselled_malachite_brick_slab, chiselled_malachite_brick_stairs
//      cracked_malachite_brick, cracked_malachite_brick_slab, cracked_malachite_brick_stairs
//      crusted_malachite_bricks, crusted_malachite_brick_slab, crusted_malachite_brick_stairs
//      malachite_bricks, malachite_brick_slab, malachite_brick_stairs
//      pulsing_chiselled_malachite_brick, pulsing_chiselled_malachite_brick_slab, pulsing_chiselled_malachite_brick_stairs
//      pulsing_malachite_brick, pulsing_malachite_brick_stairs
//      pulsing_malachite_planks, pulsing_malachite_tile_stairs
// ═══════════════════════════════════════════════════

// Map of old incorrect ID → correct block ID
const malachiteFixMap = {
    'gaiadimension:malachite_chisel_bricks': 'gaiadimension:chiselled_malachite_brick',
    'gaiadimension:malachite_chisel_stairs': 'gaiadimension:chiselled_malachite_brick_stairs',
    'gaiadimension:malachite_cracked_brick_slab': 'gaiadimension:cracked_malachite_brick_slab',
    'gaiadimension:malachite_cracked_brick_stairs': 'gaiadimension:cracked_malachite_brick_stairs',
    'gaiadimension:malachite_crusted_bricks': 'gaiadimension:crusted_malachite_bricks',
    'gaiadimension:malachite_crusted_brick_slab': 'gaiadimension:crusted_malachite_brick_slab',
    'gaiadimension:malachite_crusted_brick_stairs': 'gaiadimension:crusted_malachite_brick_stairs',
    'gaiadimension:malachite_pulsing_bricks': 'gaiadimension:pulsing_malachite_brick',
    'gaiadimension:malachite_pulsing_chisel': 'gaiadimension:pulsing_chiselled_malachite_brick',
    'gaiadimension:malachite_pulsing_tiles': 'gaiadimension:pulsing_malachite_planks',
};

const recipeDir = path.join(ROOT, 'recipes');
const recipeFiles = fs.readdirSync(recipeDir).filter(f => f.endsWith('.json'));

let fixedCount = 0;
for (const file of recipeFiles) {
    const fullPath = path.join(recipeDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;
    
    for (const [from, to] of Object.entries(malachiteFixMap)) {
        if (content.includes(from)) {
            content = content.split(from).join(to);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed malachite refs in:', file);
        fixedCount++;
    }
}
console.log(`Fixed ${fixedCount} recipe files.\n`);

console.log('Done!');
