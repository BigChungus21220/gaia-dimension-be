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

async function fixEndianness(filePath) {
    const buffer = fs.readFileSync(filePath);
    // prismarine-nbt parses and detects endianness
    const { parsed } = await nbt.parse(buffer);
    
    // Explicitly write as Little Endian (Bedrock standard)
    const newBuffer = nbt.writeUncompressed(parsed, 'little');
    fs.writeFileSync(filePath, newBuffer);
}

async function main() {
    console.log('Fixing Tower NBT Endianness (Converting to Little Endian)...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            await fixEndianness(filePath);
            console.log(`- ${file}: Fixed.`);
        } catch (error) {
            console.error(`Error fixing ${file}:`, error.message);
        }
    }
    console.log('\nFix complete.');
}

main();
