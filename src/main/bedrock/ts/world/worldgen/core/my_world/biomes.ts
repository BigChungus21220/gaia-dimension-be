import { BlockPermutation, system } from "@minecraft/server";
import { BiomeDefinition } from "../definitions/definition-biome";
import { DEFINITION_MANAGER } from "../definitions/index";
import { PalettedBrush } from "../utils";
import { CuttedSpruceTreeDefinition, PillarTreeDefinition, SpruceTreeDefinition, TreePalette } from "../definitions/definition-tree";

/**
 * GAIA DIMENSION BIOMES
 * 
 * Layer structure (like vanilla Minecraft):
 *   groundPaletted   = 1 block on TOP  (grass)
 *   underGroundPaletted = 4 blocks BELOW (soil)
 *   below that       = gaia_stone (auto-filled by generator)
 * 
 * ALL block IDs verified against behavior pack JSON definitions.
 */

// Crystal Plains
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:crystal_plains")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil"))
    .setVegetationPalette(new PalettedBrush().add("gaiadimension:aura_crystal_growth", 5).add("gaiadimension:thiscus", 1))
    .setTemperature(0.5, 0.8)
    .setHumidity(0.3, 0.6)
    .setDepth(0.125).setScale(0.05)
);

// Pink Agate Forest
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:pink_agate_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setTemperature(0.6, 0.9)
    .setHumidity(0.6, 0.9)
    .setDepth(0.2).setScale(0.2)
);

// Blue Agate Taiga
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:blue_agate_taiga")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setTemperature(0.1, 0.4)
    .setHumidity(0.4, 0.7)
    .setDepth(0.3).setScale(0.4)
);

// Green Agate Jungle
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:green_agate_jungle")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil"))
    .setTemperature(0.8, 1.0)
    .setHumidity(0.8, 1.0)
    .setDepth(0.1).setScale(0.4)
);

// Purple Agate Swamp
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:purple_agate_swamp")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_soil"))
    .setTemperature(0.5, 0.8)
    .setHumidity(0.7, 1.0)
    .setDepth(-0.2).setScale(0.1)
);

// Volcanic Lands
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:volcanic_lands")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:cinder"))
    .setTemperature(0.9, 1.0)
    .setHumidity(0.0, 0.2)
    .setDepth(0.4).setScale(0.5)
);

// Static Wasteland
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:static_wasteland")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:wasteland_stone"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:static_stone"))
    .setTemperature(0.2, 0.5)
    .setHumidity(0.0, 0.3)
    .setDepth(0.1).setScale(0.1)
);

// Salt Dunes
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:salt_dunes")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:salt"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:salt_rock"))
    .setTemperature(0.8, 1.0)
    .setHumidity(0.0, 0.1)
    .setDepth(0.5).setScale(0.6)
);

// Mookaite Mesa
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:mookaite_mesa")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:precious_rock"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:impure_rock"))
    .setTemperature(0.7, 1.0)
    .setHumidity(0.1, 0.4)
    .setDepth(0.4).setScale(0.3)
);

// Shining Grove
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:shining_grove")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil"))
    .setTemperature(0.4, 0.7)
    .setHumidity(0.5, 0.8)
    .setDepth(0.125).setScale(0.05)
);

// Smoldering Bog
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:smoldering_bog")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:murky_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:boggy_soil"))
    .setTemperature(0.6, 0.9)
    .setHumidity(0.7, 1.0)
    .setDepth(-0.1).setScale(0.1)
);

// Golden Forest
DEFINITION_MANAGER.biomeManager.addBiome(
    new BiomeDefinition("gaiadimension:golden_forest")
    .setGroundPalette(new PalettedBrush().add("gaiadimension:charred_grass"))
    .setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil"))
    .setTemperature(0.7, 1.0)
    .setHumidity(0.5, 0.8)
    .setDepth(0.2).setScale(0.2)
);
