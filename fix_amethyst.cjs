const fs = require('fs');
const path = require('path');

const amethystDir = 'd:/Users/OS/Documents/GitHub/Gaia-Dimension-be/src/main/bedrock/data/blocks/gaiadimension/ores/amethyst';

const stairsFiles = [
    'amethyst_brick_stairs.json',
    'cracked_amethyst_brick_stairs.json',
    'crusted_amethyst_brick_stairs.json',
];

for (const file of stairsFiles) {
    const fullPath = path.join(amethystDir, file);
    if (!fs.existsSync(fullPath)) { console.log('Not found:', file); continue; }
    
    const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const components = json["minecraft:block"].components;
    
    // Add minecraft:geometry at top-level components if missing
    if (!components["minecraft:geometry"]) {
        // Use the same geometry from the item_visual component
        const itemVisualGeo = components["minecraft:item_visual"]?.geometry;
        if (itemVisualGeo) {
            components["minecraft:geometry"] = {
                "identifier": itemVisualGeo.identifier,
                "bone_visibility": itemVisualGeo.bone_visibility
            };
            console.log('Added minecraft:geometry to', file);
        }
    }
    
    fs.writeFileSync(fullPath, JSON.stringify(json, null, 4) + '\n');
}

console.log('Done!');
