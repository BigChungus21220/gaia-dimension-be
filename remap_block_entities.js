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

function remapEntityIds(obj) {
    if (!obj || typeof obj !== 'object') return;

    for (const key in obj) {
        const val = obj[key];
        
        // Handle strings directly if they are values
        if (val && typeof val === 'object' && val.type === 'string') {
            if (val.value.startsWith('gaia:')) {
                val.value = val.value.replace('gaia:', 'gaiadimension:');
            }
        }
        
        // Special check for crate mapping in case it's missed by palette mapping
        if (key === 'id' && val.type === 'string' && val.value === 'gaia:crate') {
            val.value = 'gaiadimension:crude_storage_crate';
        }

        // Recurse
        if (val && typeof val === 'object') {
            if (val.value !== undefined && typeof val.value === 'object') {
                remapEntityIds(val.value);
            } else {
                remapEntityIds(val);
            }
        }
    }
}

async function fixStructure(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    
    // Remap everything in the NBT recursively
    remapEntityIds(parsed.value);

    const newBuffer = nbt.writeUncompressed(parsed, 'little');
    fs.writeFileSync(filePath, newBuffer);
}

async function main() {
    console.log('Remapping Tile Entity Identifiers (gaia: -> gaiadimension:)...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            await fixStructure(filePath);
            console.log(`- ${file}: Block entities remapped.`);
        } catch (error) {
            console.error(`Error remapping ${file}:`, error.message);
        }
    }
    console.log('\nRemapping complete.');
}

main();
