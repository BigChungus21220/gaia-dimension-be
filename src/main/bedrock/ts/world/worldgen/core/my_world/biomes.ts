import { BlockPermutation, system } from "@minecraft/server";
import { BiomeDefinition } from "../definitions/definition-biome";
import { DEFINITION_MANAGER } from "../definitions/index";
import { PalettedBrush } from "../utils";
import { CuttedSpruceTreeDefinition, PillarTreeDefinition, SpruceTreeDefinition, TreePalette } from "../definitions/definition-tree";

/**
 * GAIA DIMENSION BIOMES
 * 
 * Layer structure (like vanilla Minecraft):
 *   groundPaletted      = 1 block on TOP  (grass)
 *   underGroundPaletted  = fill BELOW (soil)
 *   below that           = gaia_stone (auto-filled by generator)
 * 
 * ALL block IDs verified against behavior pack JSON definitions.
 * Vegetation IDs verified against data/blocks/gaiadimension/flower/ directory
 * Tree log/leaf IDs verified against data/blocks/gaiadimension/tree/ directories
 */

// ── Pink Agate Tree ──
const pinkAgateTree = new SpruceTreeDefinition();
pinkAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:pink_agate_log"));
pinkAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:pink_agate_leaves"));
pinkAgateTree.setHeight(5, 9);

// ── Blue Agate Tree ──
const blueAgateTree = new SpruceTreeDefinition();
blueAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:blue_agate_log"));
blueAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:blue_agate_leaves"));
blueAgateTree.setHeight(6, 10);

// ── Green Agate Tree ──
const greenAgateTree = new SpruceTreeDefinition();
greenAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:green_agate_log"));
greenAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:green_agate_leaves"));
greenAgateTree.setHeight(7, 12);

// ── Purple Agate Tree ──
const purpleAgateTree = new SpruceTreeDefinition();
purpleAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:purple_agate_log"));
purpleAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:purple_agate_leaves"));
purpleAgateTree.setHeight(5, 8);

// ── Corrupted Tree ──
const corruptedTree = new SpruceTreeDefinition();
corruptedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:corrupted_log"));
corruptedTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:corrupted_leaves"));
corruptedTree.setHeight(4, 7);

// ── Burnt Agate Tree (Volcanic) ──
const burntAgateTree = new PillarTreeDefinition("burnt_agate");
burntAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:burnt_agate_log"));
burntAgateTree.setHeight(3, 6);

// ── Golden Tree ──
const goldenTree = new SpruceTreeDefinition();
goldenTree.setLogPaletted(new PalettedBrush().add("gaiadimension:golden_log"));
goldenTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:golden_leaves"));
goldenTree.setHeight(5, 9);

// ── Aura Tree (Shining Grove) ──
const auraTree = new SpruceTreeDefinition();
auraTree.setLogPaletted(new PalettedBrush().add("gaiadimension:aura_log"));
auraTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:aura_leaves"));
auraTree.setHeight(4, 8);

// ── Fire Agate Tree (Smoldering Bog) ──
const fireAgateTree = new PillarTreeDefinition("fire_agate");
fireAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fire_agate_log"));
fireAgateTree.setHeight(3, 5);

// ── Fossilized Tree (Static Wasteland) ──
const fossilizedTree = new CuttedSpruceTreeDefinition();
fossilizedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fossilized_log"));
fossilizedTree.setCarpetPaletted(new PalettedBrush().add("gaiadimension:fossilized_leaves"));
fossilizedTree.setHeight(3, 6);

// ══════════════════════════════════════════════════
//  BIOME DEFINITIONS
// ══════════════════════════════════════════════════

// Crystal Plains
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:crystal_plains")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:aura_crystal_growth", 5)
        .add("gaiadimension:thiscus", 3)
        .add("gaiadimension:pink_crystal_growth", 2)
        .add("gaiadimension:blue_crystal_growth", 2)
    )
    .setVegetationChance(0.12)
    .setTemperature(0.5, 0.8)
    .setHumidity(0.3, 0.6)
    .setDepth(0.125).setScale(0.05)
);

// Pink Agate Forest
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:pink_agate_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:pink_crystal_growth", 4)
        .add("gaiadimension:peach_crystal_growth", 3)
        .add("gaiadimension:spotted_kersei", 2)
        .add("gaiadimension:bulbous_hobina", 1)
    )
    .setVegetationChance(0.15)
    .setTrees(new TreePalette().add(pinkAgateTree))
    .setTreesChance(0.06)
    .setTreesAreaChance(0.6)
    .setTemperature(0.6, 0.9)
    .setHumidity(0.6, 0.9)
    .setDepth(0.2).setScale(0.2)
);

// Blue Agate Taiga
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:blue_agate_taiga")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:blue_crystal_growth", 4)
        .add("gaiadimension:mystical_murgni", 2)
        .add("gaiadimension:thorny_wiltha", 1)
    )
    .setVegetationChance(0.10)
    .setTrees(new TreePalette().add(blueAgateTree))
    .setTreesChance(0.05)
    .setTreesAreaChance(0.55)
    .setTemperature(0.1, 0.4)
    .setHumidity(0.4, 0.7)
    .setDepth(0.3).setScale(0.4)
);

// Green Agate Jungle
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:green_agate_jungle")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:green_crystal_growth", 4)
        .add("gaiadimension:agathum", 2)
        .add("gaiadimension:stickly_cupsir", 2)
        .add("gaiadimension:ouzium", 1)
    )
    .setVegetationChance(0.20)
    .setTrees(new TreePalette().add(greenAgateTree))
    .setTreesChance(0.08)
    .setTreesAreaChance(0.7)
    .setTemperature(0.8, 1.0)
    .setHumidity(0.8, 1.0)
    .setDepth(0.1).setScale(0.4)
);

// Purple Agate Swamp
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:purple_agate_swamp")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:purple_crystal_growth", 4)
        .add("gaiadimension:corrupted_gaia_eye", 2)
        .add("gaiadimension:corrupt_varloom", 2)
        .add("gaiadimension:roofed_agaric", 1)
    )
    .setVegetationChance(0.18)
    .setTrees(new TreePalette().add(purpleAgateTree).add(corruptedTree))
    .setTreesChance(0.04)
    .setTreesAreaChance(0.45)
    .setTemperature(0.5, 0.8)
    .setHumidity(0.7, 1.0)
    .setDepth(-0.2).setScale(0.1)
);

// Volcanic Lands
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:volcanic_lands")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:cinder"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:singed_crystal_growth", 3)
        .add("gaiadimension:red_crystal_growth", 2)
    )
    .setVegetationChance(0.04)
    .setTrees(new TreePalette().add(burntAgateTree))
    .setTreesChance(0.01)
    .setTreesAreaChance(0.2)
    .setTemperature(0.9, 1.0)
    .setHumidity(0.0, 0.2)
    .setDepth(0.4).setScale(0.5)
);

// Static Wasteland
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:static_wasteland")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:wasteland_stone"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:static_stone"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:mutant_crystal_growth", 3)
        .add("gaiadimension:black_crystal_growth", 2)
    )
    .setVegetationChance(0.03)
    .setTrees(new TreePalette().add(fossilizedTree))
    .setTreesChance(0.01)
    .setTreesAreaChance(0.15)
    .setTemperature(0.2, 0.5)
    .setHumidity(0.0, 0.3)
    .setDepth(0.1).setScale(0.1)
);

// Salt Dunes
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:salt_dunes")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:salt"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:salt_rock"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:yellow_crystal_growth", 3)
        .add("gaiadimension:gold_orb_tucher", 1)
    )
    .setVegetationChance(0.02)
    .setTemperature(0.8, 1.0)
    .setHumidity(0.0, 0.1)
    .setDepth(0.5).setScale(0.6)
);

// Mookaite Mesa
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:mookaite_mesa")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:precious_rock"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:impure_rock"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:red_crystal_growth", 2)
        .add("gaiadimension:gold_orb_tucher", 1)
    )
    .setVegetationChance(0.03)
    .setTemperature(0.7, 1.0)
    .setHumidity(0.1, 0.4)
    .setDepth(0.4).setScale(0.3)
);

// Shining Grove
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:shining_grove")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:aura_crystal_growth", 5)
        .add("gaiadimension:thiscus", 3)
        .add("gaiadimension:spotted_kersei", 2)
    )
    .setVegetationChance(0.15)
    .setTrees(new TreePalette().add(auraTree))
    .setTreesChance(0.05)
    .setTreesAreaChance(0.5)
    .setTemperature(0.4, 0.7)
    .setHumidity(0.5, 0.8)
    .setDepth(0.125).setScale(0.05)
);

// Smoldering Bog
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:smoldering_bog")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:murky_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:boggy_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:singed_crystal_growth", 3)
        .add("gaiadimension:roofed_agaric", 2)
        .add("gaiadimension:corrupt_varloom", 1)
    )
    .setVegetationChance(0.12)
    .setTrees(new TreePalette().add(fireAgateTree))
    .setTreesChance(0.03)
    .setTreesAreaChance(0.35)
    .setTemperature(0.6, 0.9)
    .setHumidity(0.7, 1.0)
    .setDepth(-0.1).setScale(0.1)
);

// Golden Forest
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:golden_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:charred_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setVegetationPalette(new PalettedBrush()
        .add("gaiadimension:yellow_crystal_growth", 4)
        .add("gaiadimension:gold_orb_tucher", 3)
        .add("gaiadimension:bulbous_hobina", 1)
    )
    .setVegetationChance(0.14)
    .setTrees(new TreePalette().add(goldenTree))
    .setTreesChance(0.06)
    .setTreesAreaChance(0.6)
    .setTemperature(0.7, 1.0)
    .setHumidity(0.5, 0.8)
    .setDepth(0.2).setScale(0.2)
);
