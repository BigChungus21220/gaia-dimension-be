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

const CARDINALS = ["north", "south", "west", "east"];
const VANILLA_CARDINALS = ["east", "west", "south", "north"]; // 0, 1, 2, 3 for rotation % 4

function mapStairs(block) {
    const states = block.states.value;
    let cardinal = "north";
    let vertical = "bottom";
    let type = 1;

    // Handle gaia:direction (0-11) + gaia:is_upside_down
    if (states['gaia:direction'] !== undefined) {
        const dir = states['gaia:direction'].value;
        cardinal = CARDINALS[dir % 4];
        type = Math.floor(dir / 4) + 1;
        
        if (states['gaia:is_upside_down'] !== undefined) {
            vertical = states['gaia:is_upside_down'].value === 1 ? "top" : "bottom";
        }
    } 
    // Handle stair:rotation (0-7 style)
    else if (states['stair:rotation'] !== undefined) {
        const rot = states['stair:rotation'].value;
        cardinal = VANILLA_CARDINALS[rot % 4];
        vertical = rot >= 4 ? "top" : "bottom";
        type = 1; // Default to straight
    }

    // Apply new states
    states['minecraft:cardinal_direction'] = { type: 'string', value: cardinal };
    states['minecraft:vertical_half'] = { type: 'string', value: vertical };
    states['gaiadimension:type'] = { type: 'int', value: type };

    // Cleanup old states
    for (const key of Object.keys(states)) {
        if (key.startsWith('gaia:') || key.startsWith('stair:')) delete states[key];
    }
}

function mapSlab(block) {
    const states = block.states.value;
    if (states['gaia:double'] !== undefined) delete states['gaia:double'];
    if (states['slab:interact'] !== undefined) delete states['slab:interact'];
    
    // Ensure vertical_half exists
    if (!states['minecraft:vertical_half']) {
        states['minecraft:vertical_half'] = { type: 'string', value: 'bottom' };
    }
}

function mapCrate(block) {
    const states = block.states.value;
    if (states['gaiadimension:direction'] !== undefined) {
        const dir = states['gaiadimension:direction'].value;
        const faces = ["down", "up", "north", "south", "west", "east"];
        states['minecraft:block_face'] = { type: 'string', value: faces[dir] || "north" };
        delete states['gaiadimension:direction'];
    }
    if (states['gaiadimension:entity'] !== undefined) delete states['gaiadimension:entity'];
    if (states['gaiadimension:lit'] !== undefined) delete states['gaiadimension:lit'];
}

async function fixStructure(filePath) {
    const buffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(buffer);
    const palette = parsed.value.structure.value.palette.value.default.value.block_palette.value.value;
    
    palette.forEach(block => {
        const name = block.name.value;
        const states = block.states.value;

        if (name.includes('_stairs')) {
            mapStairs(block);
        } else if (name.includes('_slab')) {
            mapSlab(block);
        } else if (name.includes('crate')) {
            mapCrate(block);
        }

        // Global: ensure perm_dim exists for gaiadimension blocks
        if (name.startsWith('gaiadimension:')) {
            if (states['gaiadimension:perm_dim'] === undefined) {
                states['gaiadimension:perm_dim'] = { type: 'int', value: 0 };
            }
        }

        // Cleanup any remaining gaia: states
        for (const key of Object.keys(states)) {
            if (key.startsWith('gaia:')) delete states[key];
        }
    });

    const newBuffer = nbt.writeUncompressed(parsed, 'little');
    fs.writeFileSync(filePath, newBuffer);
}

async function main() {
    console.log('Fixing Tower Block States...\n');
    for (const file of towerFiles) {
        const filePath = path.join(structuresDir, file);
        try {
            await fixStructure(filePath);
            console.log(`- ${file}: States remapped.`);
        } catch (error) {
            console.error(`Error fixing ${file}:`, error.message);
        }
    }
    console.log('\nProcessing complete.');
}

main();
