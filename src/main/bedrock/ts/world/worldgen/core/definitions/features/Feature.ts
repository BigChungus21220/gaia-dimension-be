import { Dimension } from "@minecraft/server";
import { ProceduralRandom } from "../../utils";

export abstract class Feature {
    /**
     * Called by the chunk generator to place the feature.
     * @param dim The dimension.
     * @param random The procedural random source.
     * @param worldX The chunk's base X coordinate (X * 16).
     * @param worldZ The chunk's base Z coordinate (Z * 16).
     * @param terrainMap Lookup map of terrain surface heights (index: localX * 16 + localZ).
     * @param underwaterMap Lookup map of whether the terrain is underwater (index: localX * 16 + localZ).
     */
    abstract place(
        dim: Dimension, 
        random: ProceduralRandom, 
        worldX: number, 
        worldZ: number, 
        terrainMap: number[], 
        underwaterMap: boolean[]
    ): void;
}
