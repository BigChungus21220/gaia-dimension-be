import { Dimension, world } from "@minecraft/server";
import { ProceduralRandom } from "../utils";
import { ChunkGenerator } from "./generator";
import { DEFINITION_MANAGER } from "../definitions/index";
import { DefinitionManager } from "../definitions/definition-manager";
import { BiomeDefinition } from "../definitions/definition-biome";

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

        // Initialize Gaia dimension generator only
        this.getOrCreateGenerator("gaiadimension:gaia_dimension");
    }

    public getOrCreateGenerator(dimensionId: string): ChunkGenerator | undefined {
        if (this.generators.has(dimensionId)) return this.generators.get(dimensionId);
        
        try {
            const dimension = world.getDimension(dimensionId);
            const gen = new ChunkGenerator(this, dimension, this.procedural);
            this.generators.set(dimensionId, gen);
            return gen;
        } catch (e: unknown) {
            return undefined;
        }
    }

    get(dimension: Dimension): ChunkGenerator | undefined { 
        return this.getOrCreateGenerator(dimension.id);
    }

    isGenerated(hash: string): boolean | string | number | undefined { 
        return world.getDynamicProperty(hash); 
    }

    setGenerated(hash: string): void { 
        world.setDynamicProperty(hash, true); 
    }

    getBiome(temp: number, humi: number): BiomeDefinition {
        return this.definition.biomeManager.getBiome(temp, humi);
    }
}
