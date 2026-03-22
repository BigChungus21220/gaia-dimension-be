import { world } from "@minecraft/server";
import { DataSystem } from "../systems/DataSystem.js";

const CONFIG_KEY = "mod_config";

const DEFAULT_HOT_BIOMES = [
    "minecraft:desert", "minecraft:desert_hills", "minecraft:mutated_desert",
    "minecraft:jungle", "minecraft:jungle_hills", "minecraft:jungle_edge", "minecraft:mutated_jungle", "minecraft:mutated_jungle_edge",
    "minecraft:bamboo_jungle", "minecraft:bamboo_jungle_hills",
    "minecraft:savanna", "minecraft:savanna_plateau", "minecraft:mutated_savanna", "minecraft:mutated_savanna_rocky",
    "minecraft:badlands", "minecraft:eroded_badlands", "minecraft:badlands_plateau", "minecraft:mutated_badlands_plateau",
    "minecraft:wooded_badlands_plateau", "minecraft:mutated_wooded_badlands_plateau"
];

export class ModConfig {
    /**
     * Portal Biome Restriction Setting
     */
    static get portalBiomeRestriction(): boolean {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        return root.portalBiomeRestriction ?? true;
    }

    static set portalBiomeRestriction(value: boolean) {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        root.portalBiomeRestriction = value;
        DataSystem.saveRoot(world, root, CONFIG_KEY);
    }

    /**
     * Allow All Biomes Setting
     */
    static get allowAllBiomes(): boolean {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        return root.allowAllBiomes ?? false;
    }

    static set allowAllBiomes(value: boolean) {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        root.allowAllBiomes = value;
        DataSystem.saveRoot(world, root, CONFIG_KEY);
    }

    /**
     * List of biomes where the portal can be ignited
     */
    static get hotBiomes(): string[] {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        return root.hotBiomes ?? [...DEFAULT_HOT_BIOMES];
    }

    static set hotBiomes(value: string[]) {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        root.hotBiomes = value;
        DataSystem.saveRoot(world, root, CONFIG_KEY);
    }

    /**
     * Comprehensive list of all biomes encountered by players
     */
    static get discoveredBiomes(): string[] {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        // Initialize with default hot biomes so they are always manageable
        const discovered = root.discoveredBiomes ?? [...DEFAULT_HOT_BIOMES];
        return discovered;
    }

    static set discoveredBiomes(value: string[]) {
        const root = DataSystem.getRoot(world, CONFIG_KEY);
        root.discoveredBiomes = value;
        DataSystem.saveRoot(world, root, CONFIG_KEY);
    }

    static registerDiscoveredBiome(biomeId: string) {
        const discovered = this.discoveredBiomes;
        if (!discovered.includes(biomeId)) {
            discovered.push(biomeId);
            discovered.sort();
            this.discoveredBiomes = discovered;
        }
    }

    static addHotBiome(biomeId: string) {
        this.registerDiscoveredBiome(biomeId); // Ensure it's in discovered too
        const biomes = this.hotBiomes;
        if (!biomes.includes(biomeId)) {
            biomes.push(biomeId);
            this.hotBiomes = biomes;
        }
    }

    static removeHotBiome(biomeId: string) {
        const biomes = this.hotBiomes.filter(id => id !== biomeId);
        this.hotBiomes = biomes;
    }

    static getAll() {
        return {
            portalBiomeRestriction: this.portalBiomeRestriction,
            allowAllBiomes: this.allowAllBiomes,
            hotBiomes: this.hotBiomes,
            discoveredBiomes: this.discoveredBiomes
        };
    }
}
