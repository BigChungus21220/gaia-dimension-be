const nbt = require('prismarine-nbt');
const fs = require('fs');

async function debug() {
    const buffer = fs.readFileSync('data/structures/amethyst_tower.mcstructure');
    const { parsed } = await nbt.parse(buffer);
    
    const structure = parsed.value.structure.value;
    const palette = structure.palette.value.default.value.block_palette.value.value;
    
    palette.forEach((p, i) => {
        if (p.name.value.includes('spawner') || p.name.value.includes('crate')) {
            console.log(`[${i}] Block in palette: ${p.name.value}`);
        }
    });

    const indices = structure.block_indices.value.value[0].value;
    const foundIndices = [];
    indices.forEach((val, i) => {
        if (val === 12 || val === 11) { // Assuming these indices based on earlier scans
            foundIndices.push(i);
        }
    });
    console.log(`Found ${foundIndices.length} instances of these blocks in the structure.`);
}

debug();
