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

async function inspectStates(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    const palette = parsed.value.structure.value.palette.value.default.value.block_palette.value.value;
    
    console.log(`
--- ${path.basename(filePath)} ---`);
    palette.forEach((block, index) => {
        const name = block.name.value;
        const states = block.states.value;
        const stateKeys = Object.keys(states);
        
        if (stateKeys.length > 0) {
            console.log(`[${index}] ${name}:`);
            stateKeys.forEach(key => {
                console.log(`  - ${key}: ${JSON.stringify(states[key].value)}`);
            });
        }
    });
}

async function main() {
    for (const file of towerFiles) {
        try {
            await inspectStates(path.join(structuresDir, file));
        } catch (e) {
            console.error(e.message);
        }
    }
}

main();
