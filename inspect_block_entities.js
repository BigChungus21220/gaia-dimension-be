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

async function inspectBlockEntities(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);

    const structure = parsed.value.structure.value;
    const blockEntities = structure.block_entity_data ? structure.block_entity_data.value.value : [];

    console.log(`\n--- ${path.basename(filePath)} ---`);
    if (blockEntities.length === 0) {
        console.log("No block entities found.");
        return;
    }

    blockEntities.forEach((be, index) => {
        const id = be.id ? be.id.value : "unknown";
        console.log(`[${index}] ID: ${id}`);
        Object.keys(be).forEach(key => {
            if (key !== 'id') {
                console.log(`  - ${key}: ${JSON.stringify(be[key].value)}`);
            }
        });
    });
}

async function main() {
    for (const file of towerFiles) {
        try {
            await inspectBlockEntities(path.join(structuresDir, file));
        } catch (e) {
            console.error(e.message);
        }
    }
}

main();
