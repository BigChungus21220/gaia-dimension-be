const fs = require('fs');
const path = require('path');

const spawnRulesDir = path.join(__dirname, 'src/main/bedrock/data/spawn_rules');
if (!fs.existsSync(spawnRulesDir)) {
    fs.mkdirSync(spawnRulesDir, { recursive: true });
}

// Block groups based on biomes
const blocks = {
    standard: ["gaiadimension:glitter_grass", "gaiadimension:heavy_soil"],
    wildwood: ["gaiadimension:soft_grass", "gaiadimension:light_soil"],
    swamp: ["gaiadimension:murky_grass", "gaiadimension:boggy_soil"],
    corrupt: ["gaiadimension:corrupted_grass", "gaiadimension:corrupted_soil"],
    golden: ["gaiadimension:gilded_grass", "gaiadimension:aurum_soil"],
    mookaite: ["gaiadimension:mookaite", "gaiadimension:mookaite_bricks", "gaiadimension:mookaite_tiles"],
    salt: ["gaiadimension:salt"],
    stone: ["gaiadimension:gaia_stone"],
    water: ["gaiadimension:mineral_water"]
};

// Map of entities to their spawning conditions derived from GaiaBiomeMaker.java
const entitySpawns = {
    // Global Surface/Various
    "nomadic_lagrahk": { weight: 15, herd: [1, 3], blocks: [...blocks.standard, ...blocks.wildwood, ...blocks.swamp] },
    "growth_sapper": { weight: 20, herd: [3, 5], blocks: [...blocks.standard, ...blocks.wildwood, ...blocks.swamp] },
    
    // Pink Agate Forest
    "agate_golem": { weight: 15, herd: [1, 3], blocks: blocks.standard },
    
    // Blue Agate Taiga
    "howlite_wolf": { weight: 15, herd: [2, 4], blocks: blocks.standard },
    "blue_howlite_wolf": { weight: 1, herd: [1, 1], blocks: blocks.standard },
    
    // Green Agate Jungle
    "markuzar_plant": { weight: 15, herd: [2, 4], blocks: blocks.standard },
    
    // Purple Agate Swamp
    "spellbound_elemental": { weight: 10, herd: [2, 4], blocks: blocks.swamp },
    
    // Fossil Woodland
    "ancient_lagrahk": { weight: 10, herd: [1, 2], blocks: blocks.standard },
    "rocky_luggeroth": { weight: 10, herd: [4, 5], blocks: blocks.standard },
    "rugged_lurmorus": { weight: 10, herd: [1, 3], blocks: blocks.standard },
    
    // Mutant Agate Wildwood
    "mutant_growth_extractor": { weight: 5, herd: [2, 4], blocks: blocks.wildwood },
    
    // Volcanic Lands
    "lesser_spitfire": { weight: 10, herd: [2, 4], blocks: blocks.wildwood },
    
    // Static Wasteland
    "lesser_shockshooter": { weight: 10, herd: [2, 4], blocks: blocks.wildwood },
    
    // Goldstone Lands
    "corrupt_sapper": { weight: 20, herd: [2, 4], blocks: blocks.corrupt },
    "contorted_naga": { weight: 10, herd: [2, 3], blocks: blocks.corrupt },
    
    // Crystal Plains
    "crystal_golem": { weight: 15, herd: [1, 3], blocks: blocks.standard },
    
    // Salt Dunes
    "saltion": { weight: 15, herd: [1, 3], blocks: [...blocks.standard, ...blocks.salt] },
    
    // Smoldering Bog
    "bismuth_uletrus": { weight: 20, herd: [2, 3], blocks: blocks.swamp },
    
    // Golden Realms
    "aureate_evraun": { weight: 20, herd: [1, 2], blocks: blocks.golden },
    "growth_grazer": { weight: 20, herd: [2, 4], blocks: blocks.golden },
    
    // Mookaite Mesa
    "mookaite_construct": { weight: 10, herd: [1, 2], blocks: blocks.mookaite },
    "opalite_construct": { weight: 10, herd: [1, 2], blocks: blocks.mookaite },
    
    // Global Caves/Stone
    "cavern_tick": { weight: 65, herd: [2, 4], blocks: blocks.stone, cave: true },
    "shalurker": { weight: 65, herd: [2, 4], blocks: blocks.stone, cave: true },
    "archaic_warrior": { weight: 65, herd: [2, 4], blocks: blocks.stone, cave: true },
    "muckling": { weight: 65, herd: [2, 4], blocks: blocks.stone, cave: true },
    "primal_beast": { weight: 15, herd: [1, 2], blocks: blocks.stone, cave: true },
    
    // Water
    "shallow_arenthis": { weight: 10, herd: [2, 4], blocks: blocks.water, water: true },
    "mineral_arenthis": { weight: 10, herd: [1, 4], blocks: blocks.water, water: true }
};

for (const [entityId, config] of Object.entries(entitySpawns)) {
    let namespace = "gaiadimension:";
    let name = entityId;
    if (entityId === "enderman") namespace = "minecraft:";

    const rules = {
        "format_version": "1.8.0",
        "minecraft:spawn_rules": {
            "description": {
                "identifier": `${namespace}${name}`,
                "population_control": "animal"
            },
            "conditions": [
                {
                    "minecraft:spawns_on_block_filter": {
                        "blocks": config.blocks
                    },
                    "minecraft:weight": {
                        "default": config.weight
                    },
                    "minecraft:herd": {
                        "min_size": config.herd[0],
                        "max_size": config.herd[1]
                    },
                    "minecraft:spawns_underground": {},
                    "minecraft:spawns_on_surface": {}
                }
            ]
        }
    };
    
    // Adjust spawning location based on type
    if (config.cave) {
        delete rules["minecraft:spawn_rules"].conditions[0]["minecraft:spawns_on_surface"];
        rules["minecraft:spawn_rules"].description.population_control = "monster";
        
        // Ensure they spawn in dark enough conditions
        rules["minecraft:spawn_rules"].conditions[0]["minecraft:brightness_filter"] = {
            "min": 0,
            "max": 7,
            "adjust_for_weather": false
        };
    } else if (config.water) {
        delete rules["minecraft:spawn_rules"].conditions[0]["minecraft:spawns_on_surface"];
        rules["minecraft:spawn_rules"].conditions[0]["minecraft:spawns_underwater"] = {};
        rules["minecraft:spawn_rules"].description.population_control = "water_animal";
    } else {
        delete rules["minecraft:spawn_rules"].conditions[0]["minecraft:spawns_underground"];
    }

    fs.writeFileSync(
        path.join(spawnRulesDir, `${name}.json`), 
        JSON.stringify(rules, null, 4)
    );
}

// Add enderman since it is globally defined in createSpawns()
const endermanRules = {
    "format_version": "1.8.0",
    "minecraft:spawn_rules": {
        "description": {
            "identifier": "minecraft:enderman",
            "population_control": "monster"
        },
        "conditions": [
            {
                "minecraft:spawns_on_block_filter": {
                    "blocks": blocks.stone
                },
                "minecraft:weight": {
                    "default": 5
                },
                "minecraft:herd": {
                    "min_size": 1,
                    "max_size": 2
                },
                "minecraft:spawns_underground": {},
                "minecraft:brightness_filter": {
                    "min": 0,
                    "max": 7,
                    "adjust_for_weather": false
                }
            }
        ]
    }
};
fs.writeFileSync(
    path.join(spawnRulesDir, `enderman_gaia.json`), 
    JSON.stringify(endermanRules, null, 4)
);

console.log(`Generated ${Object.keys(entitySpawns).length + 1} spawn rules in data/spawn_rules/`);
