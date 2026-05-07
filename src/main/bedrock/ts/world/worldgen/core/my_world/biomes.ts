import { BiomeDefinition } from "../definitions/definition-biome";
import { DEFINITION_MANAGER } from "../definitions/index";
import { PalettedBrush } from "../utils";
import { CuttedSpruceTreeDefinition, PillarTreeDefinition, SpruceTreeDefinition, TreePalette } from "../definitions/definition-tree";

/**
 * GAIA DIMENSION BIOMES — Block data ported 1:1 from Java source
 * 
 * Biome SELECTION is now handled by gaia-layers.ts (Java layer system port).
 * This file only defines the block palettes, vegetation, and trees per biome.
 */

// ── TREE DEFINITIONS ──
// Heights match Java StraightTrunkPlacer(base, randA, randB): min=base, max=base+randA+randB

const pinkAgateTree = new SpruceTreeDefinition();
pinkAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:pink_agate_log"));
pinkAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:pink_agate_leaves"));
pinkAgateTree.setHeight(5, 11); // Java: StraightTrunkPlacer(5, 3, 3)

const blueAgateTree = new SpruceTreeDefinition();
blueAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:blue_agate_log"));
blueAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:blue_agate_leaves"));
blueAgateTree.setHeight(6, 9); // Java: StraightTrunkPlacer(6, 2, 1)

const greenAgateTree = new SpruceTreeDefinition();
greenAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:green_agate_log"));
greenAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:green_agate_leaves"));
greenAgateTree.setHeight(10, 16); // Java: ThickTrunkPlacer(10, 3, 3)

const purpleAgateTree = new SpruceTreeDefinition();
purpleAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:purple_agate_log"));
purpleAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:purple_agate_leaves"));
purpleAgateTree.setHeight(7, 13); // Java: CardinalTrunkPlacer(7, 3, 3)

const fossilizedTree = new CuttedSpruceTreeDefinition();
fossilizedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fossilized_log"));
fossilizedTree.setCarpetPaletted(new PalettedBrush().add("gaiadimension:fossilized_leaves"));
fossilizedTree.setHeight(5, 11); // Java: StraightTrunkPlacer(5, 3, 3)

const corruptedTree = new SpruceTreeDefinition();
corruptedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:corrupted_log"));
corruptedTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:corrupted_leaves"));
corruptedTree.setHeight(7, 11); // Java: StraightTrunkPlacer(7, 4, 0)

const burntAgateTree = new PillarTreeDefinition("burnt_agate");
burntAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:burnt_log"));
burntAgateTree.setHeight(5, 11); // Java: StraightTrunkPlacer(5, 3, 3)

const fireAgateTree = new PillarTreeDefinition("fire_agate");
fireAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fire_agate_log"));
fireAgateTree.setHeight(5, 11); // Java: StraightTrunkPlacer(5, 3, 3) (BURNING_TREE_CONFIG)

const auraTree = new SpruceTreeDefinition();
auraTree.setLogPaletted(new PalettedBrush().add("gaiadimension:aura_log"));
auraTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:aura_leaves"));
auraTree.setHeight(10, 16); // Java: FourBranchTrunkPlacer(10, 3, 3)

const goldenTree = new SpruceTreeDefinition();
goldenTree.setLogPaletted(new PalettedBrush().add("gaiadimension:golden_log"));
goldenTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:golden_leaves"));
goldenTree.setHeight(7, 11); // Java: VaryingFourBranchTrunkPlacer(7, 2, 2)

const mutantAgateTree = new SpruceTreeDefinition();
mutantAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:pink_agate_log"));
mutantAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:pink_agate_leaves"));
mutantAgateTree.setHeight(8, 14);

// ── BIOME REGISTRATION ──

const bm = DEFINITION_MANAGER.biomeManager;

// COMMON
bm.addBiome(new BiomeDefinition("gaiadimension:crystal_plains")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:crystal_plains_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 5).add("gaiadimension:crystal_growth_aura", 3).add("gaiadimension:thiscus", 2).add("gaiadimension:spotted_kersei", 1))
    .setVegetationChance(0.12).setDepth(0.05).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:pink_agate_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:pink_agate_forest_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:spotted_kersei", 2).add("gaiadimension:bulbous_hobina", 1))
    .setVegetationChance(0.15).setTrees(new TreePalette().add(pinkAgateTree)).setTreesPerChunk(4, 0.1, 1)
    .setDepth(0.1).setScale(0.1));

bm.addBiome(new BiomeDefinition("gaiadimension:blue_agate_taiga")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:blue_agate_taiga_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:mystical_murgni", 2).add("gaiadimension:thorny_wiltha", 1))
    .setVegetationChance(0.10).setTrees(new TreePalette().add(blueAgateTree)).setTreesPerChunk(1, 0.1, 1)
    .setDepth(0.1).setScale(0.2));

bm.addBiome(new BiomeDefinition("gaiadimension:green_agate_jungle")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:green_agate_jungle_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:agathum", 2).add("gaiadimension:stickly_cupsir", 2).add("gaiadimension:ouzium", 1))
    .setVegetationChance(0.20).setTrees(new TreePalette().add(greenAgateTree)).setTreesPerChunk(5, 0.1, 1)
    .setDepth(0.1).setScale(0.2));

bm.addBiome(new BiomeDefinition("gaiadimension:fossil_woodland")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:fossil_woodland_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 2).add("gaiadimension:sombre_shrub", 2))
    .setVegetationChance(0.08).setTrees(new TreePalette().add(fossilizedTree)).setTreesPerChunk(1, 0.1, 1)
    .setDepth(0.1).setScale(0.05));

// UNCOMMON
bm.addBiome(new BiomeDefinition("gaiadimension:volcanic_lands")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_seared", 3).add("gaiadimension:crystal_growth_red", 2))
    .setVegetationChance(0.04).setTrees(new TreePalette().add(burntAgateTree).add(fireAgateTree)).setTreesPerChunk(0, 0.1, 1)
    .setDepth(1.0).setScale(0.7));

bm.addBiome(new BiomeDefinition("gaiadimension:static_wasteland")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:wasteland_stone"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:static_stone"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_black", 3).add("gaiadimension:crystal_growth_mutant", 2))
    .setVegetationChance(0.03).setDepth(3.0).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:salt_dunes")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:salt"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:saltstone"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 2))
    .setVegetationChance(0.02).setDepth(0.2).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:smoldering_bog")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:smoldering_bog_murky_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:boggy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_seared", 3).add("gaiadimension:roofed_agaric", 2).add("gaiadimension:corrupted_varloom", 1))
    .setVegetationChance(0.12).setTrees(new TreePalette().add(fireAgateTree)).setTreesPerChunk(0, 0.1, 1)
    .setDepth(0.2).setScale(0.02));

bm.addBiome(new BiomeDefinition("gaiadimension:shining_grove")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:shining_grove_soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_aura", 5).add("gaiadimension:thiscus", 3).add("gaiadimension:spotted_kersei", 2))
    .setVegetationChance(0.15).setTrees(new TreePalette().add(auraTree)).setTreesPerChunk(2, 0.1, 1)
    .setDepth(0.4).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:mookaite_mesa")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:mookaite_mesa_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:auburn_mookaite"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_red", 2).add("gaiadimension:gold_orb_tucher", 1))
    .setVegetationChance(0.03).setDepth(2.0).setScale(0.075));

// RARE
bm.addBiome(new BiomeDefinition("gaiadimension:purple_agate_swamp")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:purple_agate_swamp_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:corrupted_gaia_eye", 2).add("gaiadimension:corrupted_varloom", 2).add("gaiadimension:roofed_agaric", 1))
    .setVegetationChance(0.18).setTrees(new TreePalette().add(purpleAgateTree).add(corruptedTree)).setTreesPerChunk(1, 0.1, 2)
    .setDepth(0.0).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:goldstone_lands")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:goldstone_lands_corrupted_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_black", 3).add("gaiadimension:corrupted_gaia_eye", 2))
    .setVegetationChance(0.06).setTrees(new TreePalette().add(corruptedTree)).setTreesPerChunk(1, 0.1, 1)
    .setDepth(0.125).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:mutant_agate_wildwood")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:mutant_agate_wildwood_glitter_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_mutant", 4).add("gaiadimension:crystal_growth", 2).add("gaiadimension:glamelea", 1))
    .setVegetationChance(0.18).setTrees(new TreePalette().add(mutantAgateTree)).setTreesPerChunk(2, 0.1, 1)
    .setDepth(0.1).setScale(0.1));

// GOLD
bm.addBiome(new BiomeDefinition("gaiadimension:golden_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:golden_forest_gilded_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 4).add("gaiadimension:twinkling_gilsri", 2).add("gaiadimension:elder_imklia", 1))
    .setVegetationChance(0.14).setTrees(new TreePalette().add(goldenTree)).setTreesPerChunk(2, 0.1, 1)
    .setDepth(0.35).setScale(0.15));

bm.addBiome(new BiomeDefinition("gaiadimension:golden_plains")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:golden_plains_gilded_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 5).add("gaiadimension:tall_golden_grass", 2))
    .setVegetationChance(0.16).setDepth(0.35).setScale(0.1));

bm.addBiome(new BiomeDefinition("gaiadimension:golden_hills")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:golden_hills_gilded_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 3))
    .setVegetationChance(0.06).setDepth(0.8).setScale(0.5));

bm.addBiome(new BiomeDefinition("gaiadimension:golden_sands")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:golden_sand"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:brilliant_stone"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 2))
    .setVegetationChance(0.03).setDepth(0.25).setScale(0.05));

bm.addBiome(new BiomeDefinition("gaiadimension:golden_marsh")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:golden_marsh_gilded_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 3).add("gaiadimension:twinkling_gilsri", 1))
    .setVegetationChance(0.10).setDepth(0.15).setScale(0.05));

// WATER
bm.addBiome(new BiomeDefinition("gaiadimension:mineral_reservoir")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:pebbles"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:saltstone"))
    .setVegetationPalette(new PalettedBrush()).setVegetationChance(0.0)
    .setDepth(-1.8).setScale(0.1));

// Rivers: Java uses pebbles on floor, gaia_stone on ceiling (GaiaSurfaceRuleData L134-138)
// Shallow channel so it appears as a slight depression between biomes
bm.addBiome(new BiomeDefinition("gaiadimension:mineral_river")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:pebbles"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:gaia_stone"))
    .setVegetationPalette(new PalettedBrush()).setVegetationChance(0.0)
    .setDepth(-0.8).setScale(0.0));
