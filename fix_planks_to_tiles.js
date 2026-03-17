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
    'gaiadimension:blue_agate_planks': 'gaiadimension:blue_agate_tiles',
    'gaiadimension:green_agate_planks': 'gaiadimension:green_agate_tiles',
    'gaiadimension:burnt_agate_planks': 'gaiadimension:burnt_agate_tiles',
    'gaiadimension:fossilized_planks': 'gaiadimension:fossilized_tiles',
    'gaiadimension:malachite_planks': 'gaiadimension:malachite_tiles',
    'gaiadimension:pulsing_malachite_planks': 'gaiadimension:pulsing_malachite_tiles'
};

async function fixPlanks(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    const palette = parsed.value.structure.value.palette.value.default.value.block_palette.value.value;
    
    let changes = 0;
    palette.forEach(block => {
        const oldName = block.name.value;
        if (MAPPING[oldName]) {
            block.name.value = MAPPING[oldName];
            changes++;
        }
    });

    if (changes > 0) {
        const newBuffer = nbt.writeUncompressed(parsed, 'little');
        fs.writeFileSync(filePath, newBuffer);
    }
    
    return changes;
}

async function main() {
    console.log('Fixing Planks to Tiles in Towers...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            const changes = await fixPlanks(filePath);
            console.log(`- ${file}: ${changes} blocks remapped.`);
        } catch (error) {
            console.error(`Error fixing ${file}:`, error.message);
        }
    }
    console.log('\nFix complete.');
}

main();
