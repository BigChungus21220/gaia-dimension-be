const fs = require('fs');
const path = require('path');

const ROOT = 'd:/Users/OS/Documents/GitHub/Gaia-Dimension-be/src/main/bedrock/data';

function findFiles(dir, ext) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) results = results.concat(findFiles(full, ext));
        else if (full.endsWith(ext)) results.push(full);
    }
    return results;
}

// 1. Delete broken recipes
const recipesToDelete = [
    'recipes/pink_geode_slice.json',
    'recipes/pink_sludge_block.json',
    'recipes/purifier.json',
    'recipes/purple_geode_slice.json',
    'recipes/reinforced_bricks.json',
    'recipes/reinforced_bricks_2.json',
    'recipes/restructurer.json',
    'recipes/saltstone.json',
    'recipes/smelting/celestine_smelt.json',
    'recipes/smelting/foggy_glass.json',
    'recipes/smelting/gaia_stone.json',
    'recipes/smelting/thick_glitter_block.json',
    'recipes/storage_blocks/aura_block.json',
    'recipes/storage_blocks/aura_cluster_block_item.json',
    'recipes/storage_blocks/celestine_block.json',
    'recipes/storage_blocks/celestine_block_item.json',
    'recipes/storage_blocks/goldstone_block.json',
    'recipes/storage_blocks/goldstone_block_item.json',
    'recipes/storage_blocks/opalite_block.json',
    'recipes/storage_blocks/opalite_block_item.json'
];

recipesToDelete.forEach(file => {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('Deleted', file);
    }
});

// 2. Fix typos in recipes
const recipeFixes = {
    'recipes/malachite_crusted_bricks.json': ['malachite_crusted_bricks', 'crusted_malachite_bricks'],
    'recipes/malachite_crusted_brick_slab.json': ['malachite_crusted_brick_slab', 'crusted_malachite_brick_slab'],
    'recipes/malachite_crusted_brick_stairs.json': ['malachite_crusted_brick_stairs', 'crusted_malachite_brick_stairs'],
    'recipes/malachite_pulsing_brick_stairs.json': ['malachite_pulsing_brick_stairs', 'pulsing_malachite_brick_stairs'],
    'recipes/malachite_pulsing_chisel_stairs.json': ['malachite_pulsing_chisel_stairs', 'pulsing_chiselled_malachite_brick_stairs'],
    'recipes/malachite_pulsing_tile_stairs.json': ['malachite_pulsing_tile_stairs', 'pulsing_malachite_tile_stairs'],
    'recipes/plagued_tiliey.json': ['corrupted_varloom', 'corrupt_varloom']
};

for (const [file, [from, to]] of Object.entries(recipeFixes)) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.split(from).join(to);
        fs.writeFileSync(fullPath, content);
        console.log('Fixed typo in', file);
    }
}

// 3. Fix malachite__tiles in block
const slabFile = path.join(ROOT, 'blocks/gaiadimension/ores/malachite/malachite_tile_slab.json');
if (fs.existsSync(slabFile)) {
    let content = fs.readFileSync(slabFile, 'utf8');
    content = content.replace('gaiadimension:malachite__tiles', 'gaiadimension:malachite_tiles');
    fs.writeFileSync(slabFile, content);
    console.log('Fixed malachite__tiles in slab');
}

// 4. Fix malachite_guard repair_items
const itemsFiles = findFiles(path.join(ROOT, 'items'), '.json');
for (const file of itemsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('"gaiadimension:malachite_guard"')) {
        let json = JSON.parse(content);
        if (json["minecraft:item"] && json["minecraft:item"].components && json["minecraft:item"].components["minecraft:repairable"]) {
            const repairItems = json["minecraft:item"].components["minecraft:repairable"].repair_items;
            if (repairItems) {
                for (let i=0; i<repairItems.length; i++) {
                    repairItems[i].items = repairItems[i].items.filter(id => id !== "gaiadimension:malachite_guard");
                }
            }
            fs.writeFileSync(file, JSON.stringify(json, null, 4));
            console.log('Fixed malachite_guard repair in', path.basename(file));
        }
    }
}

// 5. Fix pickaxe digger blocks
for (const file of itemsFiles) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('gaiadimension:brick3')) {
        let json = JSON.parse(content);
        if (json["minecraft:item"] && json["minecraft:item"].components && json["minecraft:item"].components["minecraft:digger"]) {
            let destroySpeeds = json["minecraft:item"].components["minecraft:digger"].destroy_speeds;
            if (destroySpeeds) {
                const badBlocks = ["gaiadimension:pillar1", "gaiadimension:brick3", "gaiadimension:green_brick3", "gaiadimension:brick1", "gaiadimension:brick2"];
                json["minecraft:item"].components["minecraft:digger"].destroy_speeds = destroySpeeds.filter(ds => !badBlocks.includes(ds.block));
            }
            fs.writeFileSync(file, JSON.stringify(json, null, 4));
            console.log('Fixed pickaxe digger blocks in', path.basename(file));
        }
    }
}

// 6. Fix stale grasses in features
const featureGrassMap = {
    "gaiadimension:corrupted_grass": "gaiadimension:goldstone_lands_corrupted_grass",
    "gaiadimension:pale_green_glitter_grass": "gaiadimension:fossil_woodland_glitter_grass",
    "gaiadimension:purple_glitter_grass": "gaiadimension:purple_agate_swamp_glitter_grass",
    "gaiadimension:murky_grass": "gaiadimension:smoldering_bog_murky_grass",
    "gaiadimension:green_glitter_grass": "gaiadimension:green_agate_jungle_glitter_grass",
    "gaiadimension:charred_grass": "gaiadimension:vanilla_grass_plains", // fallback
    "gaiadimension:pink_glitter_grass": "gaiadimension:pink_agate_forest_glitter_grass",
    "gaiadimension:orange_glitter_grass": "gaiadimension:mookaite_mesa_glitter_grass",
    "gaiadimension:blue_glitter_grass": "gaiadimension:blue_agate_taiga_glitter_grass",
    "gaiadimension:peach_glitter_grass": "gaiadimension:crystal_plains_glitter_grass",
    "gaiadimension:soft_grass": "gaiadimension:shining_grove_soft_grass",
    "gaiadimension:gilded_grass": "gaiadimension:golden_forest_gilded_grass",
    "gaiadimension:glitter_grass": "gaiadimension:pink_agate_forest_glitter_grass"
};

const featureFiles = findFiles(path.join(ROOT, 'features'), '.json');
for (const file of featureFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of Object.entries(featureGrassMap)) {
        if (content.includes(from)) {
            content = content.split(from).join(to);
            changed = true;
        }
    }
    if (changed) {
        fs.writeFileSync(file, content);
        console.log('Fixed stale grass in feature', path.basename(file));
    }
}

console.log('Done.');
