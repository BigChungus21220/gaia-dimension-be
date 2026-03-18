export interface BiomeVisuals {
    surface: string;
    dirt: string;
    bedrock: string;
    foliage: string[];
    groundCover: string[];
}

export const BIOME_VISUALS: Record<string, BiomeVisuals> = {
    "mineral_river": {
        surface: "gaiadimension:salt",
        dirt: "gaiadimension:salt_rock",
        bedrock: "gaiadimension:bedrock_mineral_river",
        foliage: [],
        groundCover: []
    },
    "volcanic_lands": {
        surface: "gaiadimension:charred_grass",
        dirt: "gaiadimension:volcanic_rock",
        bedrock: "gaiadimension:bedrock_volcanic_lands",
        foliage: ["gaiadimension:burning_tree"],
        groundCover: []
    },
    "shining_grove": {
        surface: "gaiadimension:soft_grass",
        dirt: "gaiadimension:light_soil",
        bedrock: "gaiadimension:bedrock_shining_grove",
        foliage: ["gaiadimension:golden_tree"],
        groundCover: ["gaiadimension:gold_orb_tucher_patch"]
    },
    "smoldering_bog": {
        surface: "gaiadimension:murky_grass",
        dirt: "gaiadimension:boggy_soil",
        bedrock: "gaiadimension:bedrock_smoldering_bog",
        foliage: ["gaiadimension:burnt_tree"],
        groundCover: []
    },
    "static_wasteland": {
        surface: "gaiadimension:wasteland_stone",
        dirt: "gaiadimension:impure_rock",
        bedrock: "gaiadimension:bedrock_static_wasteland",
        foliage: [],
        groundCover: ["gaiadimension:static_stone_blob"]
    },
    "green_agate_jungle": {
        surface: "gaiadimension:green_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_green_agate_jungle",
        foliage: ["gaiadimension:green_agate_tree", "gaiadimension:green_bush"],
        groundCover: ["gaiadimension:agathum_patch", "gaiadimension:green_crystal_growth_patch"]
    },
    "crystal_plains": {
        surface: "gaiadimension:pink_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_crystal_plains",
        foliage: ["gaiadimension:pink_agate_tree"],
        groundCover: ["gaiadimension:pink_crystal_growth_patch"]
    },
    "mutant_agate_wildwood": {
        surface: "gaiadimension:orange_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_mutant_agate_wildwood",
        foliage: ["gaiadimension:pink_agate_tree_mutant"],
        groundCover: ["gaiadimension:mutant_crystal_growth_patch"]
    },
    "purple_agate_swamp": {
        surface: "gaiadimension:purple_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_purple_agate_swamp",
        foliage: ["gaiadimension:purple_tree_randomizer"],
        groundCover: ["gaiadimension:purple_crystal_growth_patch"]
    },
    "pink_agate_forest": {
        surface: "gaiadimension:peach_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_pink_agate_forest",
        foliage: ["gaiadimension:forest_pink_agate_tree"],
        groundCover: ["gaiadimension:peach_crystal_growth_patch"]
    },
    "blue_agate_taiga": {
        surface: "gaiadimension:blue_agate_taiga",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_blue_agate_taiga",
        foliage: ["gaiadimension:blue_agate_tree"],
        groundCover: ["gaiadimension:blue_crystal_growth_patch"]
    },
    "fossil_woodland": {
        surface: "gaiadimension:pale_green_glitter_grass",
        dirt: "gaiadimension:heavy_soil",
        bedrock: "gaiadimension:bedrock_fossil_woodland",
        foliage: ["gaiadimension:fossilized_tree"],
        groundCover: ["gaiadimension:agathum_patch"]
    },
    "goldstone_lands": {
        surface: "gaiadimension:corrupt_grass",
        dirt: "gaiadimension:corrupt_soil",
        bedrock: "gaiadimension:bedrock_goldstone_lands",
        foliage: ["gaiadimension:goldstone_tree"],
        groundCover: ["gaiadimension:corrupt_varloom_patch"]
    },
    "vanilla": {
        surface: "gaiadimension:vanilla_grass_plains",
        dirt: "minecraft:dirt",
        bedrock: "minecraft:bedrock",
        foliage: [],
        groundCover: []
    },
    "desert": {
        surface: "gaiadimension:vanilla_grass_desert",
        dirt: "minecraft:sand",
        bedrock: "minecraft:bedrock",
        foliage: [],
        groundCover: ["minecraft:cactus_feature"]
    },
    "mesa": {
        surface: "gaiadimension:vanilla_grass_mesa",
        dirt: "minecraft:hardened_clay",
        bedrock: "minecraft:bedrock",
        foliage: [],
        groundCover: []
    }
};
