const nbt = require('prismarine-nbt');
const fs = require('fs');

async function debug() {
    const buffer = fs.readFileSync('data/structures/amethyst_tower.mcstructure');
    const { parsed } = await nbt.parse(buffer);
    
    const structure = parsed.value.structure.value;
    const entities = structure.entities.value.value;
    
    console.log(`Found ${entities.length} entities in amethyst_tower`);
    entities.forEach((ent, i) => {
        // Bedrock entities usually have a 'block_entity_data' inside or it's a raw entity
        console.log(`[${i}] Entity data keys:`, Object.keys(ent));
        if (ent.block_entity_data) {
            console.log(`  - Block Entity ID:`, ent.block_entity_data.value.id.value);
            // Log everything inside block_entity_data
            Object.keys(ent.block_entity_data.value).forEach(k => {
                console.log(`    * ${k}: ${JSON.stringify(ent.block_entity_data.value[k].value)}`);
            });
        }
    });
}

debug();
