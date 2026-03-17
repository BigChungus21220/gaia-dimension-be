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

async function scanStructure(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    
    // Bedrock mcstructure files use a slightly different NBT structure than Java
    // They are usually little-endian and not gzipped (but prismarine-nbt handles auto-detection)
    
    const value = parsed.value;
    const size = value.size.value.value;
    const structure = value.structure.value;
    const blockIndices = structure.block_indices.value.value[0].value; // Layer 0
    const palette = structure.palette.value.default.value.block_palette.value.value;
    
    const uniqueBlocks = new Set();
    palette.forEach(block => {
        uniqueBlocks.add(block.name.value);
    });

    return {
        name: path.basename(filePath),
        size: `${size[0]}x${size[1]}x${size[2]}`,
        uniqueBlocks: Array.from(uniqueBlocks).sort()
    };
}

async function main() {
    console.log('Scanning Gaia Towers...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            const info = await scanStructure(filePath);
            console.log(`--- ${info.name} ---`);
            console.log(`Size: ${info.size}`);
            console.log(`Unique Blocks (${info.uniqueBlocks.length}):`);
            info.uniqueBlocks.forEach(b => console.log(` - ${b}`));
            console.log('\n');
        } catch (error) {
            console.error(`Error scanning ${file}:`, error.message);
        }
    }
}

main();
