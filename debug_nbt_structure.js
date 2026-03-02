const nbt = require('prismarine-nbt');
const fs = require('fs');

async function debug() {
    const buffer = fs.readFileSync('GaiaDimensions_BP/structures/amethyst_tower.mcstructure');
    const { parsed } = await nbt.parse(buffer);
    
    const structure = parsed.value.structure.value;
    console.log('Structure keys:', Object.keys(structure));
    
    if (structure.block_entity_data) {
        console.log('block_entity_data type:', structure.block_entity_data.type);
        // Sometimes it's a list, sometimes a compound if it's just one? (unlikely for list)
        console.log('block_entity_data value length:', structure.block_entity_data.value.value.length);
    } else {
        console.log('block_entity_data IS MISSING');
    }

    // Check if entities are in a different place?
    if (parsed.value.entities) {
        console.log('Entities found in root!');
    }
}

debug();
