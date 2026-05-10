import { FastNoiseLite } from "../utils";

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
        this.blendedNoise.SetNoiseType(FastNoiseLite.NoiseType.Perlin);
        this.blendedNoise.SetFrequency(0.01); 
    }

    public getDensity(
        x: number, 
        y: number, 
        z: number, 
        getBiomeDepth: (bx: number, bz: number) => number,
        getBiomeScale: (bx: number, bz: number) => number
    ): number {
        let f = 0.0;
        let f1 = 0.0;
        let f2 = 0.0;
        
        // Use a broader 5x5 sampling for smooth transitions
        for (let offX = -2; offX <= 2; ++offX) {
            for (let offZ = -2; offZ <= 2; ++offZ) {
                const offD = getBiomeDepth(x + offX * 4, z + offZ * 4);
                const offS = getBiomeScale(x + offX * 4, z + offZ * 4);

                const weight = BIOME_WEIGHTS[offX + 2 + (offZ + 2) * 5];
                f += offS * weight;
                f1 += offD * weight;
                f2 += weight;
            }
        }

        const avgDepth = f1 / f2;
        const avgScale = f / f2;

        const noise = this.blendedNoise.GetNoise(x, y, z);
        
        // Ported Java Density Math
        // Density decreases as Y increases
        const heightGradient = 1.0 - (y * 2.0) / 128.0;
        let density = heightGradient + noise * 0.5;
        
        // Apply biome factors
        density = (density + avgDepth) * avgScale;
        
        // Final shaping
        return density * (density > 0 ? 4 : 1);
    }
}
