const nbt = require('prismarine-nbt');
const fs = require('fs');
const path = require('path');

const structuresDir = path.join(__dirname, 'data/structures');
const towerFiles = [
    'amethyst_tower.mcstructure',
    'copal_tower.mcstructure',
    'jade_tower.mcstructure',
    'jet_tower.mcstructure',
    'malachite_tower.mcstructure'
];

const MAPPING = {
    // Amethyst
    'gaia:amethyst_brick': 'gaiadimension:amethyst_bricks',
    'gaia:amethyst_stair': 'gaiadimension:amethyst_brick_stairs',
    'gaia:cracked_amethyst_bricks': 'gaiadimension:cracked_amethyst_bricks',
    'gaia:cracked_amethyst_brick_slab': 'gaiadimension:cracked_amethyst_brick_slab',
    'gaia:crusted_amethyst_bricks': 'gaiadimension:crusted_amethyst_bricks',
    'gaia:crusted_amethyst_brick_slab': 'gaiadimension:crusted_amethyst_brick_slab',
    'gaia:raw_amethyst': 'gaiadimension:raw_amethyst',

    // Copal
    'gaia:copal_bricks': 'gaiadimension:copal_bricks',
    'gaia:copal_brick_slab': 'gaiadimension:copal_brick_slab',
    'gaia:copal_brick_stair': 'gaiadimension:copal_brick_stairs',
    'gaia:cracked_copal_bricks': 'gaiadimension:cracked_copal_bricks',
    'gaia:cracked_copal_brick_slab': 'gaiadimension:cracked_copal_brick_slab',
    'gaia:cracked_copal_brick_stair': 'gaiadimension:cracked_copal_brick_stairs',
    'gaia:crusted_copal_bricks': 'gaiadimension:crusted_copal_bricks',
    'gaia:crusted_copal_brick_slab': 'gaiadimension:crusted_copal_brick_slab',
    'gaia:crusted_copal_brick_stair': 'gaiadimension:crusted_copal_brick_stairs',
    'gaia:raw_copal': 'gaiadimension:raw_copal',

    // Jade
    'gaia:jade_bricks': 'gaiadimension:jade_bricks',
    'gaia:jade_brick_slab': 'gaiadimension:jade_brick_slab',
    'gaia:jade_brick_stair': 'gaiadimension:jade_brick_stairs',
    'gaia:cracked_jade_bricks': 'gaiadimension:cracked_jade_bricks',
    'gaia:cracked_jade_brick_slab': 'gaiadimension:cracked_jade_brick_slab',
    'gaia:crusted_jade_bricks': 'gaiadimension:crusted_jade_bricks',
    'gaia:crusted_jade_brick_slab': 'gaiadimension:crusted_jade_brick_slab',
    'gaia:raw_jade': 'gaiadimension:raw_jade',

    // Jet
    'gaia:jet_brick': 'gaiadimension:jet_bricks', // Assuming brick -> bricks
    'gaia:jet_brick_slab': 'gaiadimension:jet_brick_slab',
    'gaia:jet_brick_stair': 'gaiadimension:jet_brick_stairs',
    'gaia:cracked_jet_bricks': 'gaiadimension:cracked_jet_bricks',
    'gaia:cracked_jet_brick_slab': 'gaiadimension:cracked_jet_brick_slab',
    'gaia:crusted_jet_bricks': 'gaiadimension:crusted_jet_bricks',
    'gaia:crusted_jet_brick_slab': 'gaiadimension:crusted_jet_brick_slab',
    'gaia:raw_jet': 'gaiadimension:raw_jet',

    // Malachite
    'gaia:malachite_bricks': 'gaiadimension:malachite_bricks',
    'gaia:malachite_brick_slab': 'gaiadimension:malachite_brick_slab',
    'gaia:malachite_brick_stair': 'gaiadimension:malachite_brick_stairs',
    'gaia:cracked_malachite_brick': 'gaiadimension:cracked_malachite_bricks',
    'gaia:cracked_malachite_brick_stair': 'gaiadimension:cracked_malachite_brick_stairs',
    'gaia:crusted_malachite_bricks': 'gaiadimension:crusted_malachite_bricks',
    'gaia:crusted_malachite_brick_slab': 'gaiadimension:crusted_malachite_brick_slab',
    'gaia:crusted_malachite_brick_stair': 'gaiadimension:crusted_malachite_brick_stairs',
    'gaia:malachite_pillar': 'gaiadimension:malachite_pillar',
    'gaia:malachite_pillar_stair': 'gaiadimension:malachite_pillar_stairs',
    'gaia:malachite_planks': 'gaiadimension:malachite_planks',
    'gaia:malachite_tile_stair': 'gaiadimension:malachite_tile_stairs',
    'gaia:chiselled_malachite_brick': 'gaiadimension:chiselled_malachite_bricks',
    'gaia:chiselled_malachite_brick_slab': 'gaiadimension:chiselled_malachite_brick_slab',
    'gaia:chiselled_malachite_brick_stair': 'gaiadimension:chiselled_malachite_brick_stairs',
    'gaia:pulsing_malachite_brick': 'gaiadimension:pulsing_malachite_bricks',
    'gaia:pulsing_malachite_brick_stair': 'gaiadimension:pulsing_malachite_brick_stairs',
    'gaia:pulsing_malachite_planks': 'gaiadimension:pulsing_malachite_planks',

    // Foliage/General
    'gaia:blue_agate_planks': 'gaiadimension:blue_agate_planks',
    'gaia:blue_agate_slab': 'gaiadimension:blue_agate_slab',
    'gaia:blue_agate_stair': 'gaiadimension:blue_agate_stairs',
    'gaia:green_agate_planks': 'gaiadimension:green_agate_planks',
    'gaia:green_agate_slab': 'gaiadimension:green_agate_slab',
    'gaia:green_agate_stair': 'gaiadimension:green_agate_stairs',
    'gaia:burnt_agate_planks': 'gaiadimension:burnt_agate_planks',
    'gaia:burnt_agate_stair': 'gaiadimension:burnt_agate_stairs',
    'gaia:burnt_agate_tile_slab': 'gaiadimension:burnt_agate_slab', // Mapping tile slab to regular slab if not found
    'gaia:fossilized_planks': 'gaiadimension:fossilized_planks',
    'gaia:fossilized_slab': 'gaiadimension:fossilized_slab',
    'gaia:fossilized_stair': 'gaiadimension:fossilized_stairs',
    'gaia:crate': 'gaiadimension:crude_storage_crate'
};

async function remapStructure(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    
    const structure = parsed.value.structure.value;
    const palette = structure.palette.value.default.value.block_palette.value.value;
    
    let changes = 0;
    palette.forEach(block => {
        const oldName = block.name.value;
        if (MAPPING[oldName]) {
            block.name.value = MAPPING[oldName];
            changes++;
        } else if (oldName.startsWith('gaia:')) {
            // Fallback: just change namespace if no specific mapping
            const newName = oldName.replace('gaia:', 'gaiadimension:');
            block.name.value = newName;
            changes++;
        }
    });

    if (changes > 0) {
        const newBuffer = nbt.writeUncompressed(parsed);
        fs.writeFileSync(filePath, newBuffer);
    }
    
    return changes;
}

async function main() {
    console.log('Remapping Gaia Tower Blocks...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            const changes = await remapStructure(filePath);
            console.log(`- ${file}: ${changes} blocks remapped.`);
        } catch (error) {
            console.error(`Error remapping ${file}:`, error.message);
        }
    }
    console.log('\nRemapping complete.');
}

main();
