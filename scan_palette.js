const nbt = require('prismarine-nbt');
const fs = require('fs');
const path = require('path');

const structuresDir = path.join(__dirname, 'GaiaDimensions_BP/structures');
const towerFiles = [
    'amethyst_tower.mcstructure',
    'copal_tower.mcstructure',
    'jade_tower.mcstructure',
    'jet_tower.mcstructure',
    'malachite_tower.mcstructure'
];

async function scanForBrokenBlocks(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    const palette = parsed.value.structure.value.palette.value.default.value.block_palette.value.value;
    
    console.log(`--- ${path.basename(filePath)} ---`);
    palette.forEach((block, index) => {
        const name = block.name.value;
        // Looking for suspicious names or placeholder names like 'update', 'unknown', etc.
        if (name.includes('update') || name.includes('unknown') || !name.includes(':')) {
            console.log(`Potential broken block at index ${index}: ${name}`);
        } else {
            // Check if it's a 'gaiadimension:' block but maybe misspelled or old
            console.log(`[${index}] ${name}`);
        }
    });
}

async function main() {
    for (const file of towerFiles) {
        try {
            await scanForBrokenBlocks(path.join(structuresDir, file));
        } catch (e) {
            console.error(e.message);
        }
    }
}

main();
