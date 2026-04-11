import { FastNoiseLite } from "../utils";
import { BlockPos } from "../definitions/base/BlockPos";

export interface TerrainPoint {
    depth: number;
    scale: number;
}

export interface BiomeTerrain {
    depth: number;
    scale: number;
}

const BIOME_WEIGHTS: number[] = new Array(25);
for (let x = -2; x <= 2; ++x) {
    for (let z = -2; z <= 2; ++z) {
        const weight = 10.0 / Math.sqrt((x * x + z * z) + 0.2);
        BIOME_WEIGHTS[x + 2 + (z + 2) * 5] = weight;
    }
}

export class GaiaTerrainWarp {
    private blendedNoise: FastNoiseLite;

    constructor(
        private cellWidth: number,
        private cellHeight: number,
        private cellCountY: number,
        private dimensionDensityFactor: number,
        private dimensionDensityOffset: number,
        seed: number
    ) {
        this.blendedNoise = new FastNoiseLite(seed);
        this.blendedNoise.SetNoiseType(FastNoiseLite.NoiseType.Perlin); // Approximation of Java's BlendedNoise
        this.blendedNoise.SetFrequency(0.0125); // Adjusted frequency
    }

    public fillNoiseColumn(
        adouble: number[], 
        x: number, 
        z: number, 
        seaLevel: number, 
        min: number, 
        max: number,
        getBiomeDepth: (bx: number, bz: number) => number,
        getBiomeScale: (bx: number, bz: number) => number
    ) {
        let f = 0.0;
        let f1 = 0.0;
        let f2 = 0.0;
        const depth = getBiomeDepth(x, z);

        for (let offX = -2; offX <= 2; ++offX) {
            for (let offZ = -2; offZ <= 2; ++offZ) {
                const offD = getBiomeDepth(x + offX, z + offZ);
                const offS = getBiomeScale(x + offX, z + offZ);

                const f8 = offD > depth ? 0.5 : 1.0;
                const f9 = f8 * BIOME_WEIGHTS[offX + 2 + (offZ + 2) * 5] / (offD + 2.0);
                f += offS * f9;
                f1 += offD * f9;
                f2 += f9;
            }
        }

        const f10 = f1 / f2;
        const f11 = f / f2;
        const d6 = f10 * 0.5 - 0.125;
        const d8 = f11 * 0.9 + 0.1;
        const d0 = d6 * 0.265625;
        const d1 = 96.0 / d8;
        const densityBase = -0.46875;

        for (let index = 0; index <= max; ++index) {
            const y = index + min;
            const noise = this.blendedNoise.GetNoise(x, y, z) * 128.0;
            let totaldensity = this.computeInitialDensity(y, d0, d1, densityBase) + noise;
            
            // Simplified slide logic for Bedrock
            totaldensity = this.applySlide(totaldensity, y, max);
            
            adouble[index] = totaldensity;
        }
    }

    protected computeInitialDensity(y: number, offset: number, factor: number, density: number): number {
        const base = 1.0 - (y * 2.0) / 32.0 + density;
        const factored = base * this.dimensionDensityFactor + this.dimensionDensityOffset;
        const total = (factored + offset) * factor;
        return total * (total > 0.0 ? 4 : 1);
    }

    protected applySlide(density: number, y: number, maxY: number): number {
        // Simple linear fade for top and bottom to ensure terrain doesn't clip
        if (y < 3) {
            const lerp = y / 3;
            density = density * lerp + (1 - lerp) * -10;
        }
        if (y > maxY - 3) {
            const lerp = (maxY - y) / 3;
            density = density * lerp + (1 - lerp) * -10;
        }
        return density;
    }
}
