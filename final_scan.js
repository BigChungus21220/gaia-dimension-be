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

async function finalScan(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    const palette = parsed.value.structure.value.palette.value.default.value.block_palette.value.value;
    
    console.log(`--- ${path.basename(filePath)} ---`);
    palette.forEach((block, index) => {
        const name = block.name.value;
        if (name.startsWith('gaia:') || name.includes('unknown') || name.includes('update')) {
            console.log(`[${index}] FOUND OLD/BROKEN ID: ${name}`);
        }
    });
}

async function main() {
    for (const file of towerFiles) {
        try {
            await finalScan(path.join(structuresDir, file));
        } catch (e) {
            console.error(e.message);
        }
    }
}

main();
