import { Dimension, world } from "@minecraft/server";
import { ProceduralRandom } from "../utils";
import { ChunkGenerator } from "./generator";
import { DEFINITION_MANAGER } from "../definitions/index";
import { DefinitionManager } from "../definitions/definition-manager";
import { BiomeDefinition } from "../definitions/definition-biome";
import { REALM_COUNT, REALM_PREFIX } from "../../../../systems/DimensionDestruction.js";

export class SessionManager {
    public generators: Map<string, ChunkGenerator>;
    public seed: number;
    public procedural: ProceduralRandom;
    public definition: DefinitionManager;

    constructor(seed: number) {
        this.generators = new Map();
        this.seed = Math.ceil(seed);
        this.procedural = new ProceduralRandom(this.seed);
        this.definition = DEFINITION_MANAGER;

        // Initialize Gaia dimension generator
        this.getOrCreateGenerator("gaiadimension:gaia_dimension");

        // Initialize realm dimension generators with unique seeds
        for (let i = 0; i < REALM_COUNT; i++) {
            const realmId = `${REALM_PREFIX}${i}`;
            this.getOrCreateGenerator(realmId, i);
        }
    }

    public getOrCreateGenerator(dimensionId: string, realmIndex?: number): ChunkGenerator | undefined {
        if (this.generators.has(dimensionId)) return this.generators.get(dimensionId);
        
        try {
            const dimension = world.getDimension(dimensionId);
            // Realm dims get unique seeds: base seed offset by large prime * index
            const genSeed = realmIndex !== undefined
                ? new ProceduralRandom(this.seed + (realmIndex + 1) * 7919)
                : this.procedural;
            const gen = new ChunkGenerator(this, dimension, genSeed);
            this.generators.set(dimensionId, gen);
            return gen;
        } catch (e: unknown) {
            return undefined;
        }
    }

    get(dimension: Dimension): ChunkGenerator | undefined { 
        return this.getOrCreateGenerator(dimension.id);
    }

    isGenerated(hash: string): boolean { 
        return !!world.getDynamicProperty(hash); 
    }

    setGenerated(hash: string): void { 
        world.setDynamicProperty(hash, true); 
    }

    getBiome(temp: number, humi: number): BiomeDefinition {
        return this.definition.biomeManager.getBiome(temp, humi);
    }
}
