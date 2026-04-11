import { Dimension, world } from "@minecraft/server";
import { MinecraftDimensionTypes } from "@minecraft/vanilla-data";
import { ProceduralRandom } from "../utils";
import { ChunkGenerator } from "./generator";
import { DEFINITION_MANAGER } from "../definitions/index";

export class SessionManager {
    public generators: Map<Dimension, ChunkGenerator>;
    public seed: number;
    public procedural: ProceduralRandom;
    public definition: any;

    constructor(seed: number) {
        this.generators = new Map();
        this.seed = Math.ceil(seed);
        this.procedural = new ProceduralRandom(this.seed);
        this.definition = DEFINITION_MANAGER;

        const dims = [
            MinecraftDimensionTypes.Overworld,
            MinecraftDimensionTypes.Nether,
            MinecraftDimensionTypes.TheEnd
        ];

        for (const dimensionId of dims) {
            const dimension = world.getDimension(dimensionId);
            this.generators.set(dimension, new ChunkGenerator(this as any, dimension, this.procedural));
        }
    }

    /**@param {Dimension} dimension @returns {ChunkGenerator}  */
    get(dimension: Dimension): ChunkGenerator | undefined { 
        return this.generators.get(dimension); 
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
