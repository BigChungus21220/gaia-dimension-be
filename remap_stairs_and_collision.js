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

async function processStructure(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    
    const value = parsed.value;
    const structure = value.structure.value;
    const blockIndicesLayer0 = structure.block_indices.value.value[0].value;
    const blockIndicesLayer1 = structure.block_indices.value.value[1].value;
    const palette = structure.palette.value.default.value.block_palette.value.value;
    
    // 1. Map top_slot_bit to vertical_half for any gaiadimension stair
    palette.forEach(block => {
        if (block.name.value.includes(':') && block.name.value.includes('_stairs')) {
            const states = block.states.value;
            if (states.top_slot_bit !== undefined) {
                const isTop = states.top_slot_bit.value === 1 || states.top_slot_bit.value === true;
                states['minecraft:vertical_half'] = { type: 'string', value: isTop ? 'top' : 'bottom' };
                delete states.top_slot_bit;
            }
        }
    });

    // 2. Add collision blocks to palette and Layer 1
    const collisionPaletteMap = new Map();

    const getCollisionPaletteIndex = (stairBlock) => {
        const stairStates = stairBlock.states.value;
        const cardinal = stairStates['minecraft:cardinal_direction']?.value || 'north';
        const vertical = stairStates['minecraft:vertical_half']?.value || 'bottom';
        
        const key = `${cardinal}_${vertical}`;
        if (collisionPaletteMap.has(key)) return collisionPaletteMap.get(key);

        const index = palette.length;
        palette.push({
            name: { type: 'string', value: 'gaiadimension:stairs_collision' },
            states: {
                type: 'compound',
                value: {
                    'minecraft:cardinal_direction': { type: 'string', value: cardinal },
                    'minecraft:vertical_half': { type: 'string', value: vertical },
                    'gaiadimension:corner': { type: 'byte', value: 0 },
                    'gaiadimension:perm_dim': { type: 'int', value: 0 }
                }
            },
            version: { type: 'int', value: 17959425 }
        });
        collisionPaletteMap.set(key, index);
        return index;
    };

    let collisionCount = 0;
    for (let i = 0; i < blockIndicesLayer0.length; i++) {
        const paletteIndex = blockIndicesLayer0[i];
        if (paletteIndex === -1) continue; 
        
        const block = palette[paletteIndex];
        if (block && block.name.value.includes('_stairs')) {
            const collisionIndex = getCollisionPaletteIndex(block);
            blockIndicesLayer1[i] = collisionIndex;
            collisionCount++;
        }
    }

    if (collisionCount > 0) {
        const newBuffer = nbt.writeUncompressed(parsed);
        fs.writeFileSync(filePath, newBuffer);
    }
    
    return collisionCount;
}

async function main() {
    console.log('Injecting Stair Collisions...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            const count = await processStructure(filePath);
            console.log(`- ${file}: Injected ${count} collisions.`);
        } catch (error) {
            console.error(`Error processing ${file}:`, error.message);
        }
    }
    console.log('\nInjection complete.');
}

main();
