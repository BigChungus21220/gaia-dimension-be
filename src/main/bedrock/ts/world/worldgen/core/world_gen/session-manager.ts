import { Dimension, world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { ProceduralRandom } from "../utils";
import { ChunkGenerator } from "./generator";
import { DEFINITION_MANAGER } from "../definitions/index";

export class SessionManager {
    public generators: Map<string, ChunkGenerator>;
    public seed: number;
    public procedural: ProceduralRandom;
    public definition: any;

    constructor(seed: number) {
        this.generators = new Map();
        this.seed = Math.ceil(seed);
        this.procedural = new ProceduralRandom(this.seed);
        this.definition = DEFINITION_MANAGER;

        // Initialize standard dimensions
        [
            MinecraftDimensionTypes.Overworld,
            MinecraftDimensionTypes.Nether,
            MinecraftDimensionTypes.TheEnd
        ].forEach(id => this.getOrCreateGenerator(id));
    }

    public getOrCreateGenerator(dimensionId: string): ChunkGenerator | undefined {
        if (this.generators.has(dimensionId)) return this.generators.get(dimensionId);
        
        try {
            const dimension = world.getDimension(dimensionId);
            const gen = new ChunkGenerator(this as any, dimension, this.procedural);
            this.generators.set(dimensionId, gen);
            return gen;
        } catch (e) {
            return undefined;
        }
    }

    get(dimension: Dimension): ChunkGenerator | undefined { 
        return this.getOrCreateGenerator(dimension.id);
    }

    isGenerated(hash: string): any { 
        return world.getDynamicProperty(hash); 
    }

    setGenerated(hash: string): void { 
        world.setDynamicProperty(hash, true); 
    }

    getBiome(temp: number, humi: number): any {
        return this.definition.biomeManager.getBiome(temp, humi);
    }
}
