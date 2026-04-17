import { BlockPermutation, BlockVolume, Dimension, ListBlockVolume, system, Vector3 } from "@minecraft/server";
import { easeOutQuad, proximityEaseing, FastNoiseLite, PalettedPlacer, ProceduralRandom, Vec3 } from "../utils";

let air: BlockPermutation;
let water: BlockPermutation;
system.run(() => {
    air = BlockPermutation.resolve("air");
    water = BlockPermutation.resolve("water");
});

const seaLevel = -40;
const entry = -60;
const SOIL_DEPTH = 4;

interface ConceptBlock extends Vector3 {
    underGroundPaletted: any;
    y: number;
}

interface VegetationProcess extends Vector3 {
    vegetationPalette: any;
    vegetationValidation: boolean;
}

interface TreeProcess extends Vector3 {
    treePalete: any;
    dimension: Dimension;
}

// CACHE STATS GLOBALLY PER COORDINATE TO PREVENT CORRUPTION ACROSS ASYNC TASKS
const STATS_CACHE = new Map<string, any>();

export class ChunkGenerator {
    public seaLevel: number;
    public entry: number;
    public manager: any;
    public dimension: Dimension;
    public dimensionId: string;
    public range: any;
    public building: Set<any>;
    public seed: ProceduralRandom;
    public isGenerating: Set<string> = new Set();

    private base: FastNoiseLite;
    private spikes: FastNoiseLite;
    private kind: FastNoiseLite;
    private overall: FastNoiseLite;
    private deep: FastNoiseLite;
    private trees: FastNoiseLite;
    private temp: FastNoiseLite;
    private humi: FastNoiseLite;

    constructor(sessionManager: any, dimension: Dimension, seed: ProceduralRandom) {
        this.seaLevel = seaLevel;
        this.entry = entry;
        this.manager = sessionManager;
        this.dimension = dimension;
        this.dimensionId = dimension.id;
        this.range = dimension.heightRange;
        this.building = new Set();
        this.seed = seed;

        const biomeFactor = (1 / (this.manager.definition.biomeManager.biomes.length * 2 + 10)) / 200;
        
        this.base = new FastNoiseLite(seed.nextInt());
        this.base.SetNoiseType(FastNoiseLite.NoiseType.Perlin);
        this.base.SetFractalType(FastNoiseLite.FractalType.FBm);
        this.base.SetFractalOctaves(2);
        this.base.SetFrequency(0.01);

        this.spikes = new FastNoiseLite(seed.nextInt());
        this.spikes.SetNoiseType(FastNoiseLite.NoiseType.Cellular);
        this.spikes.SetCellularJitter(1.2);
        this.spikes.SetFrequency(0.02);

        this.kind = new FastNoiseLite(seed.nextInt());
        this.kind.SetFrequency(0.0008);

        this.overall = new FastNoiseLite(seed.nextInt());
        this.overall.SetFrequency(0.02);

        this.deep = new FastNoiseLite(seed.nextInt());
        this.deep.SetFrequency(0.0004);

        this.trees = new FastNoiseLite(seed.nextInt());
        this.trees.SetFrequency(0.003);

        this.temp = new FastNoiseLite(seed.nextInt());
        this.temp.SetFrequency(biomeFactor * 0.5);

        this.humi = new FastNoiseLite(seed.nextInt());
        this.humi.SetFrequency(biomeFactor * 0.75);
    }

    getStats(x: number, z: number) {
        const key = `${this.dimensionId}:${x},${z}`;
        if (STATS_CACHE.has(key)) return STATS_CACHE.get(key);

        const { base, spikes, kind, overall, deep, temp, humi } = this;
        const s = ((spikes.GetNoise(x, z) * 0.7 + 1)),
            b = ((base.GetNoise(x, z) + 1)),
            k = kind.GetNoise(x, z) / 2,
            o = ((overall.GetNoise(x, z) + 1) / 2),
            d = ((deep.GetNoise(x, z) + 1) / 2);

        const waterPropriety = proximityEaseing(d, 20);
        const temperature = (temp.GetNoise(x, z) + 1) / 2;
        const humidity = (humi.GetNoise(x, z) + 1) / 2;

        const height = (s * 2.5 * (0.8 + k) + b * proximityEaseing(0.5 + k, 10) * 8 + proximityEaseing(o, 7) * (0.8 + k)) * (waterPropriety / 2 + 0.5) + waterPropriety * 3.5;
        
        const stats = { s, b, k, o, d, waterPropriety, temperature, humidity, height };
        if (STATS_CACHE.size > 10000) STATS_CACHE.clear();
        STATS_CACHE.set(key, stats);
        return stats;
    }

    getHeight(x: number, z: number) {
        const stats = this.getStats(x, z);
        const biome = this.getBiome(stats.temperature, stats.humidity);
        const h = stats.height * 10 * (1 + biome.scale) + biome.depth * 40 + this.entry;
        return Math.max(Math.floor(h), this.seaLevel + 1);
    }

    buildChunk(X: number, Z: number, hash: string) {
        if (this.isGenerating.has(hash)) return Promise.resolve();
        if (this.isGenerated(hash)) return Promise.resolve();
        const task = new Promise<void>((r, j) => {
            const timeoutId = system.runTimeout(() => {
                j(new Error(`Chunk generation timeout: ${hash}`));
            }, 600); // 30 seconds max bound

            (system as any).runJob(this.generate(X, Z, 
                () => { system.clearRun(timeoutId); r(); },
                (err: any) => { system.clearRun(timeoutId); j(err); }
            ));
        });
        this.isGenerating.add(hash);
        task.then(() => this.setGenerated(hash))
            .catch(e => console.warn(`[GaiaDim] Timeout or error for chunk ${X},${Z}:`, e))
            .finally(() => this.isGenerating.delete(hash));
        return task;
    }

    isGenerated(hash: string) { return this.manager.isGenerated(hash + this.dimensionId); }
    setGenerated(hash: string) { this.manager.setGenerated(hash + this.dimensionId); }

    /**
     * DETERMINISTIC column-by-column terrain generator.
     * 
     * Each column ALWAYS gets:
     *   Y = terrain:                  1 block of groundPalette (grass)
     *   Y = terrain-1 to terrain-4:   4 blocks of underGroundPalette (soil)
     *   Y = terrain-5 to globalFloor: gaia_stone (filled per-column)
     *   Y < globalFloor:              gaia_stone (filled chunk-wide)
     *
     * Uses only BlockVolume (AABB) fills — the most reliable Bedrock API.
     * No ListBlockVolume for terrain. No probabilistic layer selection.
     */
    *generate(X: number, Z: number, res: () => void, rej: (reason: any) => void) {
        if (!air || !water) {
            system.run(() => (system as any).runJob(this.generate(X, Z, res, rej)));
            return;
        }

        const { seaLevel, entry, dimension: d } = this;
        
        try {
            let theLowest = Infinity;
            const random = this.seed.getSeqence(X, Z);
            const worldX = X * 16, worldZ = Z * 16;

            // Pre-compute column data (PASS 1 — pure math, zero API calls)
            const terrainHeights: number[] = new Array(256);
            const biomeData: any[] = new Array(256);

            for (let x = 0; x < 16; x++) {
                for (let z = 0; z < 16; z++) {
                    const idx = x * 16 + z;
                    const xx = worldX + x, zz = worldZ + z;

                    const stats = this.getStats(xx, zz);
                    const biome = this.getBiome(stats.temperature, stats.humidity);

                    let terrain = Math.floor(stats.height * 10 * (1 + biome.scale) + biome.depth * 40 + entry);
                    if (isNaN(terrain) || !isFinite(terrain)) terrain = entry;
                    terrain = Math.max(this.range.min, Math.min(this.range.max - 1, terrain));

                    if (terrain < theLowest) theLowest = terrain;
                    terrainHeights[idx] = terrain;
                    biomeData[idx] = biome;
                }
                yield; // Yield once per row (16 times total instead of 256)
            }

            // Shared floor: everything is solid from every column's surface down to this Y
            const globalFloor = Math.max(this.range.min, theLowest - SOIL_DEPTH);
            const trees: any[] = [];

            // PASS 2: Per-column deterministic block placement
            // Every single column gets: grass + soil + stone gap. No exceptions. No randomness.
            for (let x = 0; x < 16; x++) {
                for (let z = 0; z < 16; z++) {
                    const idx = x * 16 + z;
                    const xx = worldX + x, zz = worldZ + z;
                    const terrain = terrainHeights[idx];
                    const biome = biomeData[idx];
                    const underSea = terrain < seaLevel;

                    // Get block IDs — deterministic (first entry in palette, no random)
                    const groundId = biome.groundPaletted.toPermutation(0);
                    const underId = biome.underGroundPaletted.toPermutation(0);

                    // 1. Surface — ALWAYS grass (or ground palette for underwater)
                    const surfaceId = underSea ? underId : groundId;
                    try {
                        d.fillBlocks(
                            new BlockVolume(
                                { x: xx, y: terrain, z: zz },
                                { x: xx, y: terrain, z: zz }
                            ),
                            surfaceId,
                            { ignoreChunkBoundErrors: true }
                        );
                    } catch(e: any) { console.warn(`[Gaia] Surface fail:`, String(e)) }

                    // 2. Soil layer — ALWAYS 4 blocks below surface
                    const soilBottom = Math.max(globalFloor, terrain - SOIL_DEPTH);
                    if (terrain - 1 >= soilBottom) {
                        try {
                            d.fillBlocks(
                                new BlockVolume(
                                    { x: xx, y: soilBottom, z: zz },
                                    { x: xx, y: terrain - 1, z: zz }
                                ),
                                underId,
                                { ignoreChunkBoundErrors: true }
                            );
                        } catch(e: any) { console.warn(`[Gaia] Soil fail:`, String(e)) }
                    }

                    // 3. Stone gap — from soil bottom to globalFloor
                    if (soilBottom - 1 >= globalFloor) {
                        try {
                            d.fillBlocks(
                                new BlockVolume(
                                    { x: xx, y: globalFloor, z: zz },
                                    { x: xx, y: soilBottom - 1, z: zz }
                                ),
                                "gaiadimension:gaia_stone",
                                { ignoreChunkBoundErrors: true }
                            );
                        } catch(e: any) { console.warn(`[Gaia] Stone Gap fail:`, String(e)) }
                    }

                    // 4. Vegetation (only above sea level, uses random)
                    if (!underSea && biome.vegetationPalette.permutations.length > 0) {
                        if (random.nextFloat() < biome.vegetationChance) {
                            const vegId = biome.vegetationPalette.toPermutation(random.nextFloat());
                            const vegY = Math.min(this.range.max - 1, terrain + 1);
                            try {
                                d.fillBlocks(
                                    new BlockVolume(
                                        { x: xx, y: vegY, z: zz },
                                        { x: xx, y: vegY, z: zz }
                                    ),
                                    vegId,
                                    { ignoreChunkBoundErrors: true }
                                );
                            } catch(e: any) { console.warn(`[Gaia] Veg fail:`, String(e)) }
                        }
                    }

                    // 5. Trees (only above sea level, uses random + noise)
                    if (!underSea && biome.hasTrees) {
                        if (random.nextFloat() < biome.treesChance &&
                            easeOutQuad((this.trees.GetNoise(xx, zz) + 1) / 2) < biome.treeAreaChance) {
                            trees.push({
                                x: xx, y: Math.min(this.range.max - 1, terrain + 1), z: zz,
                                treePalete: biome.trees, dimension: d
                            });
                        }
                    }
                }
                yield; // Yield once per row to minimize context-switching lag
            }
            yield;

            // PASS 3: Trees
            const treePlacer = new PalettedPlacer();
            if (this.manager.definition.IsPrecalculated) {
                for (let loc of trees) {
                    const treedDef = loc.treePalete.get(random.nextFloat());
                    const offSetCalculator = (v: Vector3) => Vec3.add(loc, v);
                    try {
                        if (treedDef.canPlaceValidator(loc)) {
                            const sample = treedDef.getCompiledSample(random.nextFloat());
                            for (const [permutation, list] of sample) {
                                treePlacer.setPaletteLocations(permutation,
                                    (treePlacer.getPaletteLocations(permutation)).concat(list.map(offSetCalculator)));
                            }
                        }
                    } catch(_) {}
                    yield;
                }
            } else {
                for (const loc of trees) {
                    const treedDef = loc.treePalete.get(random.nextFloat());
                    try {
                        if (treedDef.canPlaceValidator(loc)) yield * treedDef.place(loc, random, treePlacer);
                    } catch(_) {}
                }
            }
            yield;

            // PASS 4: Flush trees
            yield * treePlacer.flush(d, { ignoreChunkBoundErrors: true, blockFilter: { includePermutations: [air] } });
            yield;

            // PASS 5: Deep stone filler (chunk-wide, ONLY below globalFloor)
            if (theLowest !== Infinity) {
                const stoneBottom = Math.max(this.range.min, globalFloor - 15);
                let currY = globalFloor - 1;
                while (currY > stoneBottom) {
                    const nextY = Math.max(stoneBottom, currY - 16);
                    try {
                        d.fillBlocks(
                            new BlockVolume(
                                { x: worldX, y: nextY, z: worldZ },
                                { x: worldX + 15, y: currY, z: worldZ + 15 }
                            ),
                            "gaiadimension:gaia_stone",
                            {
                                blockFilter: { includePermutations: [air] },
                                ignoreChunkBoundErrors: true
                            }
                        );
                    } catch(e: any) { console.warn(`[Gaia] Deepstone fail:`, String(e)) }
                    currY = nextY;
                    yield;
                }
            }
            yield;

            // PASS 6: Water fill
            if (theLowest !== Infinity && theLowest < seaLevel) {
                try {
                    d.fillBlocks(
                        new BlockVolume(
                            { x: worldX, y: theLowest, z: worldZ },
                            { x: worldX + 15, y: seaLevel, z: worldZ + 15 }
                        ),
                        water,
                        {
                            blockFilter: { includePermutations: [air], includeTags: ["water"] },
                            ignoreChunkBoundErrors: true
                        }
                    );
                } catch(e: any) { console.warn(`[Gaia] Water fail:`, String(e)) }
            }

            res();
        } catch (e) {
            console.error(`[GaiaDim] Chunk ${X},${Z} error:`, e);
            res(); // Always resolve — partial beats stuck
        }
    }

    getBiome(temp: number, humi: number) { return this.manager.getBiome(temp, humi); }
}
