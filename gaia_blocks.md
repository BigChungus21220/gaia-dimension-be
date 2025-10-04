{
  "utility_blocks": [
    {
      "id": "gaia_portal",
      "class": "GaiaPortalBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": -1.0, "resistance": -1.0, "sound": "stone", "requiresTool": false, "other": ["noCollission", "randomTicks", "lightLevel(15)", "noLootTable"] }
    },
    {
      "id": "keystone_block",
      "class": "Block",
      "properties": { "handler": "PropertiesHandler.basicProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true }
    },
    {
      "id": "gold_fire",
      "class": "GoldFireBlock",
      "properties": { "handler": "Properties.of", "hardness": 0.0, "resistance": 0.0, "other": ["noCollission", "randomTicks", "lightLevel(15)", "noLootTable"] }
    },
    {
      "id": "pyrite_torch",
      "class": "PyriteTorchBlock",
      "properties": { "handler": "PropertiesHandler.torchProps", "hardness": 0.0, "resistance": 0.0, "lightLevel": 14, "other": ["noCollission"] }
    },
    {
      "id": "pyrite_wall_torch",
      "class": "PyriteWallTorchBlock",
      "properties": { "handler": "PropertiesHandler.torchProps", "hardness": 0.0, "resistance": 0.0, "lightLevel": 14, "other": ["noCollission", "lootFrom(pyrite_torch)"] }
    },
    {
      "id": "agate_crafting_table",
      "class": "AgateCraftingTableBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone", "requiresTool": false }
    },
    {
      "id": "crude_storage_crate",
      "class": "SmallCrateBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone", "other": ["pushReaction(DESTROY)"] }
    },
    {
      "id": "mega_storage_crate",
      "class": "LargeCrateBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 10.0, "resistance": 300.0, "sound": "stone", "other": ["pushReaction(DESTROY)"] }
    },
    {
      "id": "gaia_stone_furnace",
      "class": "GaiaStoneFurnaceBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 20.0, "resistance": 300.0, "sound": "stone", "requiresTool": true, "lightLevel": "conditional" }
    },
    {
      "id": "restructurer",
      "class": "RestructurerBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 20.0, "resistance": 300.0, "sound": "stone", "requiresTool": true, "lightLevel": "conditional" }
    },
    {
      "id": "purifier",
      "class": "PurifierBlock",
      "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 20.0, "resistance": 300.0, "sound": "stone", "requiresTool": true, "lightLevel": "conditional" }
    }
  ],
  "fluids": [
    { "id": "mineral_water", "class": "GaiaFluidBlock", "properties": { "handler": "PropertiesHandler.liquidProps" } },
    { "id": "superhot_magma", "class": "GaiaFluidBlock", "properties": { "handler": "PropertiesHandler.liquidProps", "lightLevel": 15, "other": ["randomTicks"] } },
    { "id": "sweet_muck", "class": "GaiaFluidBlock", "properties": { "handler": "PropertiesHandler.liquidProps" } },
    { "id": "liquid_bismuth", "class": "GaiaFluidBlock", "properties": { "handler": "PropertiesHandler.liquidProps", "lightLevel": 3, "other": ["randomTicks"] } },
    { "id": "liquid_aura", "class": "GaiaFluidBlock", "properties": { "handler": "PropertiesHandler.liquidProps" } }
  ],
  "natural_blocks": {
    "soil": [
      { "id": "heavy_soil", "class": "GaiaSoilBlock", "properties": { "handler": "PropertiesHandler.soilProps", "hardness": 0.9, "resistance": 0.0, "sound": "gravel" } },
      { "id": "corrupted_soil", "class": "GaiaSoilBlock", "properties": { "handler": "PropertiesHandler.soilProps", "hardness": 0.9, "resistance": 0.0, "sound": "gravel" } },
      { "id": "boggy_soil", "class": "GaiaSoilBlock", "properties": { "handler": "PropertiesHandler.soilProps", "hardness": 0.9, "resistance": 0.0, "sound": "gravel" } },
      { "id": "light_soil", "class": "GaiaSoilBlock", "properties": { "handler": "PropertiesHandler.soilProps", "hardness": 0.9, "resistance": 0.0, "sound": "gravel" } },
      { "id": "aurum_soil", "class": "GaiaSoilBlock", "properties": { "handler": "PropertiesHandler.soilProps", "hardness": 0.9, "resistance": 0.0, "sound": "gravel" } }
    ],
    "grass": [
      { "id": "glitter_grass", "class": "GlitterGrassBlock", "properties": { "handler": "PropertiesHandler.grassProps", "hardness": 0.9, "resistance": 0.0, "sound": "grass" } },
      { "id": "corrupted_grass", "class": "CorruptGrassBlock", "properties": { "handler": "PropertiesHandler.grassProps", "hardness": 0.9, "resistance": 0.0, "sound": "grass" } },
      { "id": "murky_grass", "class": "MurkyGrassBlock", "properties": { "handler": "PropertiesHandler.grassProps", "hardness": 0.9, "resistance": 0.0, "sound": "grass" } },
      { "id": "soft_grass", "class": "SoftGrassBlock", "properties": { "handler": "PropertiesHandler.grassProps", "hardness": 0.9, "resistance": 0.0, "sound": "grass" } },
      { "id": "gilded_grass", "class": "GildedGrassBlock", "properties": { "handler": "PropertiesHandler.grassProps", "hardness": 0.9, "resistance": 0.0, "sound": "grass" } }
    ],
    "stone_and_variants": [
      { "id": "salt", "class": "ColoredFallingBlock", "properties": { "handler": "PropertiesHandler.sandProps", "hardness": 0.9, "resistance": 0.0, "sound": "sand" } },
      { "id": "saltstone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.5, "resistance": 10.0, "sound": "stone", "requiresTool": true } },
      { "id": "pebbles", "class": "ColoredFallingBlock", "properties": { "handler": "PropertiesHandler.sandProps", "hardness": 1.3, "resistance": 0.0, "sound": "gravel" } },
      { "id": "gaia_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 15.0, "sound": "stone", "requiresTool": true } },
      { "id": "gaia_cobblestone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 15.0, "sound": "stone", "requiresTool": true } },
      { "id": "wasteland_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 15.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "static_stone", "class": "StaticStoneBlock", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 50.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "charged_mineral", "class": "ChargedMineralBlock", "properties": { "handler": "Properties.of", "hardness": 4.0, "resistance": 15.0, "sound": "glass", "other": ["noOcclusion"] } },
      { "id": "volcanic_rock", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 15.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "searing_rock", "class": "SearingRockBlock", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 20.0, "resistance": 600.0, "sound": "stone", "requiresTool": true, "lightLevel": 7 } },
      { "id": "primal_mass", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 5.0, "resistance": 45.0, "sound": "stone", "requiresTool": true } },
      { "id": "nexustone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 10.0, "resistance": 100.0, "sound": "stone", "requiresTool": true } },
      { "id": "impure_rock", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 20.0, "resistance": 300.0, "sound": "stone", "requiresTool": true } },
      { "id": "active_rock", "class": "ActiveRockBlock", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 15.0, "resistance": 250.0, "sound": "stone", "requiresTool": true, "lightLevel": 7 } },
      { "id": "geyser_block", "class": "GeyserBlock", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 5.0, "resistance": 10.0, "sound": "stone", "requiresTool": true } },
      { "id": "sparkling_rock", "class": "Block", "properties": { "handler": "Properties.of", "hardness": 10.0, "resistance": 150.0, "sound": "amethyst", "requiresTool": true } },
      { "id": "golden_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 15.0, "sound": "stone", "requiresTool": true } },
      { "id": "tough_golden_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 3.0, "resistance": 30.0, "sound": "stone", "requiresTool": true } },
      { "id": "brilliant_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 5.0, "resistance": 35.0, "sound": "stone", "requiresTool": true } },
      { "id": "gilded_brilliant_stone", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 5.0, "resistance": 35.0, "sound": "stone", "requiresTool": true, "lightLevel": 5 } },
      { "id": "golden_sand", "class": "ColoredFallingBlock", "properties": { "handler": "PropertiesHandler.sandProps", "hardness": 1.0, "resistance": 0.0, "sound": "sand" } }
    ],
    "muck_and_sludge": [
      { "id": "impure_sludge", "class": "SlowingBlock", "properties": { "handler": "PropertiesHandler.muckyProps", "hardness": 0.6, "resistance": 0.0, "sound": "mud", "speedFactor": 0.4, "jumpFactor": 0.8 } },
      { "id": "aurum_mud", "class": "Block", "properties": { "handler": "PropertiesHandler.muckyProps", "hardness": 0.6, "resistance": 0.0, "sound": "mud", "speedFactor": 0.3, "jumpFactor": 0.4 } }
    ],
    "glitter_and_sludge": [
      { "id": "frail_glitter_block", "class": "GlassBlock", "properties": { "handler": "PropertiesHandler.glassProps", "hardness": 1.0, "resistance": 0.0, "sound": "glass" } },
      { "id": "thick_glitter_block", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.5, "resistance": 7.5, "sound": "stone", "requiresTool": true } },
      { "id": "gummy_glitter_block", "class": "SlimeBlock", "properties": { "handler": "Properties.of", "sound": "slime" } },
      { "id": "pink_sludge_block", "class": "SlimeBlock", "properties": { "handler": "Properties.of", "sound": "slime" } }
    ],
    "mookaite": [
        { "id": "scarlet_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } },
        { "id": "auburn_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } },
        { "id": "gold_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } },
        { "id": "mauve_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } },
        { "id": "beige_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } },
        { "id": "ivory_mookaite", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 1.8, "resistance": 12.0, "sound": "stone" } }
    ]
  },
  "plants": {
    "crystal_growths": [
      { "id": "crystal_growth", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "crystal_growth_red", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "crystal_growth_black", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "crystal_growth_seared", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "crystal_growth_mutant", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "crystal_growth_aura", "class": "CrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "glass" } }
    ],
    "grass_and_vines": [
      { "id": "golden_grass", "class": "GoldenGrassBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "tall_golden_grass", "class": "DoubleCrystalGrowthBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "golden_vine", "class": "VineBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } }
    ],
    "blooms": [
      { "id": "thiscus", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "ouzium", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "agathum", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "varloom", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "corrupted_varloom", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "glamelea", "class": "GlameleaBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "missingno_plant", "class": "CrystalBloomBlock", "properties": { "handler": "PropertiesHandler.bloomProps", "hardness": 0.0, "sound": "grass" } }
    ],
    "fungi": [
      { "id": "spotted_kersei", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "thorny_wiltha", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "roofed_agaric", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "bulbous_hobina", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "stickly_cupsir", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "mystical_murgni", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "corrupted_gaia_eye", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "twinkling_gilsri", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "elder_imklia", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "gold_orb_tucher", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "missingno_fungus", "class": "CrystalFungusBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } }
    ],
    "shrubs_and_cacti": [
      { "id": "sombre_cacti", "class": "SombreCactiBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } },
      { "id": "sombre_shrub", "class": "SombreShrubBlock", "properties": { "handler": "PropertiesHandler.plantProps", "hardness": 0.0, "sound": "grass" } }
    ],
    "shoots": [
        { "id": "aura_shoot", "class": "AuraShootBlock", "properties": { "handler": "Properties.of", "sound": "amethyst_cluster", "other": ["randomTicks"] } }
    ]
  },
  "tree_blocks": {
    "leaves": [
      { "id": "pink_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "blue_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "green_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "purple_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "fossilized_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "corrupted_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "burnt_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "fire_agate_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass", "lightLevel": 3, "burnTime": 200 } },
      { "id": "aura_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } },
      { "id": "golden_leaves", "class": "LeavesBlock", "properties": { "handler": "PropertiesHandler.leavesProps", "hardness": 0.3, "resistance": 0.0, "sound": "glass" } }
    ],
    "logs": [
      { "id": "pink_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "blue_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "green_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "purple_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "fossilized_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "corrupted_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "burnt_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "fire_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone", "lightLevel": 3, "burnTime": 1600 } },
      { "id": "aura_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "golden_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } }
    ],
    "stripped_logs": [
      { "id": "stripped_pink_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_blue_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_green_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_purple_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_fossilized_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_corrupted_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_burnt_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_fire_agate_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone", "lightLevel": 3, "burnTime": 1600 } },
      { "id": "stripped_aura_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
      { "id": "stripped_golden_log", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } }
    ],
    "wood": [
        { "id": "pink_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "blue_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "green_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "purple_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "fossilized_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "corrupted_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "burnt_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "fire_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone", "lightLevel": 3, "burnTime": 1600 } },
        { "id": "aura_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "golden_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } }
    ],
    "stripped_wood": [
        { "id": "stripped_pink_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_blue_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_green_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_purple_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_fossilized_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_corrupted_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_burnt_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_fire_agate_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone", "lightLevel": 3, "burnTime": 1600 } },
        { "id": "stripped_aura_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } },
        { "id": "stripped_golden_wood", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.logProps", "hardness": 1.5, "resistance": 2.0, "sound": "stone" } }
    ],
    "saplings": [
      { "id": "pink_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "blue_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "green_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "purple_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "fossilized_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "corrupted_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "burnt_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "fire_agate_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass", "burnTime": 100 } },
      { "id": "aura_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } },
      { "id": "golden_sapling", "class": "GaiaSaplingBlock", "properties": { "handler": "PropertiesHandler.saplingProps", "hardness": 0.0, "sound": "glass" } }
    ]
  },
  "manufactured_blocks": {
    "tiles": [
      { "id": "pink_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "blue_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "green_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "purple_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fossilized_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "corrupted_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "burnt_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fire_agate_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone", "lightLevel": 3, "burnTime": 400 } },
      { "id": "aura_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "golden_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } }
    ],
    "tile_slabs": [
      { "id": "pink_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "blue_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "green_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "purple_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fossilized_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "corrupted_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "burnt_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fire_agate_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone", "lightLevel": 3, "burnTime": 200 } },
      { "id": "aura_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "golden_tile_slab", "class": "SlabBlock", "properties": { "handler": "PropertiesHandler.tileProps", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } }
    ],
    "tile_stairs": [
      { "id": "pink_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "blue_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "green_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "purple_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fossilized_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "corrupted_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "burnt_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "fire_agate_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone", "lightLevel": 3, "burnTime": 300 } },
      { "id": "aura_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } },
      { "id": "golden_tile_stairs", "class": "StairBlock", "properties": { "handler": "makeStairs", "hardness": 10.0, "resistance": 150.0, "sound": "stone" } }
    ],
    "curtains": [
      { "id": "pink_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "blue_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "green_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "purple_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "fossilized_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "corrupted_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "burnt_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "fire_agate_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass", "lightLevel": 3 } },
      { "id": "aura_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } },
      { "id": "golden_curtain", "class": "CurtainBlock", "properties": { "handler": "PropertiesHandler.curtainProps", "hardness": 1.0, "sound": "glass" } }
    ],
    "glass": [
      { "id": "cloudy_glass", "class": "GlassBlock", "properties": { "handler": "PropertiesHandler.glassProps", "hardness": 0.7, "resistance": 0.0, "sound": "glass" } },
      { "id": "foggy_glass", "class": "GlassBlock", "properties": { "handler": "PropertiesHandler.glassProps", "hardness": 0.7, "resistance": 0.0, "sound": "glass" } }
    ],
    "bricks": [
      { "id": "gaia_stone_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.gaiaBrickProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "cracked_gaia_stone_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.gaiaBrickProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "crusted_gaia_stone_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.gaiaBrickProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "reinforced_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 10.0, "resistance": 100.0, "sound": "stone", "requiresTool": true } },
      { "id": "bolstered_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 30.0, "resistance": 400.0, "sound": "stone", "requiresTool": true } }
    ],
    "gem_bricks": [
      { "id": "raw_jade", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "jade_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jadeProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "cracked_jade_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jadeProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "crusted_jade_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jadeProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "raw_copal", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "copal_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.copalProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "cracked_copal_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.copalProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "crusted_copal_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.copalProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "raw_jet", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "jet_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jetProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "cracked_jet_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jetProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "crusted_jet_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.jetProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "raw_amethyst", "class": "Block", "properties": { "handler": "PropertiesHandler.stoneProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "amethyst_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.amethystProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "cracked_amethyst_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.amethystProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } },
      { "id": "crusted_amethyst_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.amethystProps", "hardness": 2.0, "resistance": 20.0, "sound": "stone", "requiresTool": true } }
    ],
    "malachite": [
      { "id": "malachite_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_cracked_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_crusted_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_chisel_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_pulsing_bricks", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_pulsing_tiles", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_pulsing_chisel", "class": "Block", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } },
      { "id": "malachite_pillar", "class": "RotatedPillarBlock", "properties": { "handler": "PropertiesHandler.malachiteProps", "hardness": 20.0, "resistance": 200.0, "sound": "stone", "requiresTool": true } }
    ]
  },
  "storage_blocks": [
    { "id": "sugilite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "hematite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "cinnabar_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "labradorite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "moonstone_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "red_opal_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "blue_opal_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "green_opal_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "white_opal_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "pyrite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true, "lightLevel": 15 } },
    { "id": "tektite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "goldstone_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "aura_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "bismuth_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "opalite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "stibnite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "proustite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "euclase_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "albite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "carnelian_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "benitoite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "diopside_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "goshenite_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } },
    { "id": "celestine_block", "class": "Block", "properties": { "handler": "PropertiesHandler.storageProps", "hardness": 5.0, "resistance": 10.0, "sound": "metal", "requiresTool": true } }
  ],
  "ores": [
    { "id": "sugilite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "hematite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "cinnabar_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "labradorite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "moonstone_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "red_opal_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "blue_opal_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "green_opal_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "white_opal_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "pyrite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true, "lightLevel": 3 } },
    { "id": "speckled_rock", "class": "Block", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "coarse_rock", "class": "Block", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "precious_rock", "class": "Block", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "scarlet_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "auburn_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "gold_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "mauve_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "beige_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "ivory_opalite_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } },
    { "id": "celestine_ore", "class": "DropExperienceBlock", "properties": { "handler": "PropertiesHandler.oreProps", "hardness": 4.0, "resistance": 25.0, "sound": "stone", "requiresTool": true } }
  ],
  "spawners": [
    {
      "id": "malachite_guard_spawner",
      "class": "BossSpawnerBlock",
      "properties": { "handler": "PropertiesHandler.spawnerProps", "hardness": -1.0, "sound": "metal", "other": ["noOcclusion"] }
    }
  ]
}
