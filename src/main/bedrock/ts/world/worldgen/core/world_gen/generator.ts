import { Dimension, system } from "@minecraft/server";
import { easeOutQuad, FastNoiseLite, ProceduralRandom } from "../utils";
import { buildGaiaLayers, getBiomeNameFromId } from "./gaia-layers";
import { BiomeDefinition } from "../definitions/definition-biome";

// Java source: GaiaDimensions.java — sea level 63, minY -64
const SEA_LEVEL = 63;
const ENTRY = 0; // Shifted from -64 to 0 so terrain generates around Y=70, allowing rivers (Y=55) to fill with water up to Y=63
const STONE_DEPTH = 10;  // shallow shell — only fill what's visible
const SOIL_DEPTH = 4;

function setBlock(block: any, type: string): boolean {
    if (!block) return false;
    if (block.typeId !== type) {
        try { block.setType(type); } catch (_) { return false; }
    }
    return true;
}

export class ChunkGenerator {
    public seaLevel = SEA_LEVEL;
    public entry = ENTRY;
    public manager: any;
    public dimension: Dimension;
    public dimensionId: string;
    public range: any;
    public seed: ProceduralRandom;
    public isGenerating: Set<string> = new Set();

    // Java Edition 5x5 Parabolic Biome Weight Matrix
    private static biomeWeights: number[] = [];
    static {
        for (let rx = -2; rx <= 2; ++rx) {
            for (let rz = -2; rz <= 2; ++rz) {
                const weight = 10.0 / Math.sqrt((rx * rx + rz * rz) + 0.2);
                ChunkGenerator.biomeWeights[rx + 2 + (rz + 2) * 5] = weight;
            }
        }
    }

    // Noise layers for terrain shape
    private base: FastNoiseLite;
    private spikes: FastNoiseLite;
    private kind: FastNoiseLite;
    private overall: FastNoiseLite;
    private deep: FastNoiseLite;
    private trees: FastNoiseLite;

    // Layer-based biome lookup (ported from Java)
    private layerFn: (x: number, z: number) => number;

    // Biome cache: biome name → BiomeDefinition
    private biomeCache = new Map<string, BiomeDefinition>();

    constructor(sessionManager: any, dimension: Dimension, seed: ProceduralRandom) {
        this.manager = sessionManager;
        this.dimension = dimension;
        this.dimensionId = dimension.id;
        this.range = dimension.heightRange;
        this.seed = seed;

        // Build the Java-style layer stack
        this.layerFn = buildGaiaLayers(seed.seed);

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
    }

    /**
     * Get the biome at a world (block) coordinate using the Java layer system.
     * The layers operate on biome-grid coords (÷4), matching Java's getNoiseBiome(x/4, y, z/4).
     */
    getBiomeAt(x: number, z: number): BiomeDefinition {
        // Java biome source uses quarter-resolution
        const bx = x >> 2, bz = z >> 2;
        const biomeId = this.layerFn(bx, bz);
        const name = getBiomeNameFromId(biomeId);

        let cached = this.biomeCache.get(name);
        if (cached) return cached;

        // Look up from the registered biome definitions
        const bm = this.manager.definition?.biomeManager;
        if (bm) {
            cached = bm.biomes.find((b: BiomeDefinition) => b.id === name);
            if (cached) { this.biomeCache.set(name, cached); return cached; }
        }
        return bm?.default ?? new BiomeDefinition(name);
    }

    getTerrainHeight(x: number, z: number): number {
        const { base, spikes, kind, overall, deep } = this;
        const s = (spikes.GetNoise(x, z) * 0.7 + 1);
        const b = (base.GetNoise(x, z) + 1);
        const k = kind.GetNoise(x, z) / 2;
        const o = (overall.GetNoise(x, z) + 1) / 2;
        const d = (deep.GetNoise(x, z) + 1) / 2;

        const waterProp = Math.max(0, Math.min(1, d * 5));
        const height = (s * 2.5 * (0.8 + k) + b * Math.max(0, 0.5 + k) * 8 + o * (0.8 + k))
            * (waterProp / 2 + 0.5) + waterProp * 3.5;
        return height;
    }

    /**
     * 1:1 Java port of GaiaTerrainWarp.fillNoiseColumn lines 61-86.
     * Computes terrain height using the 5x5 parabolic biome weight matrix
     * with the exact depth/scale blending formula.
     */
    getHeight(x: number, z: number): number {
        const raw = this.getTerrainHeight(x, z);
        const centerBiome = this.getBiomeAt(x, z);
        const centerDepth = centerBiome.depth;

        // Java 5x5 biome interpolation with EXACT weight formula:
        //   weight = (depthPenalty) * BIOME_WEIGHTS[i] / (neighborDepth + 2.0)
        let scaleSum = 0;
        let depthSum = 0;
        let weightSum = 0;

        for (let rx = -2; rx <= 2; rx++) {
            for (let rz = -2; rz <= 2; rz++) {
                const b = this.getBiomeAt(x + rx * 4, z + rz * 4);
                const offD = b.depth;
                const offS = b.scale;

                // Java: penalize when neighbor is deeper than center (0.5x)
                const depthPenalty = offD > centerDepth ? 0.5 : 1.0;
                // Java: divide by (depth + 2.0) — this is what creates smooth slopes
                const w = depthPenalty * ChunkGenerator.biomeWeights[rx + 2 + (rz + 2) * 5] / (offD + 2.0);

                scaleSum += offS * w;
                depthSum += offD * w;
                weightSum += w;
            }
        }

        const avgDepth = depthSum / weightSum;
        const avgScale = scaleSum / weightSum;

        // Java: GaiaTerrainWarp.java L83-86
        // d6 = avgDepth * 0.5 - 0.125
        // d8 = avgScale * 0.9 + 0.1
        // offset = d6 * 0.265625
        // factor = 96.0 / d8
        const depthOffset = (avgDepth * 0.5 - 0.125) * 0.265625;
        const scaleFactor = 96.0 / (avgScale * 0.9 + 0.1);

        // Apply noise with Java's density equation, then map to world height
        // computeInitialDensity: base = 1.0 - y*2/32 + density(-0.46875)
        // We approximate the density→surface intersection at:
        //   terrain = SEA_LEVEL + depthOffset * scaleFactor + noise * scaleInfluence
        let terrain = Math.floor(SEA_LEVEL + depthOffset * scaleFactor + raw * 10 * (avgScale * 0.9 + 0.1));
        if (isNaN(terrain) || !isFinite(terrain)) terrain = SEA_LEVEL;
        terrain = Math.max(this.range.min, Math.min(this.range.max - 1, terrain));
        return terrain;
    }

    buildChunk(X: number, Z: number, hash: string): Promise<boolean> {
        if (this.isGenerating.has(hash)) return Promise.resolve(true);
        if (this.isGenerated(hash)) return Promise.resolve(true);
        this.isGenerating.add(hash);

        return new Promise<boolean>((resolve) => {
            const failRef = { count: 0 };
            (system as any).runJob(this.generate(X, Z, failRef, () => {
                this.isGenerating.delete(hash);
                if (failRef.count === 0) {
                    this.setGenerated(hash);
                    resolve(true);
                } else {
                    resolve(false);
                }
            }));
        });
    }

    isGenerated(hash: string) { return this.manager.isGenerated(hash + this.dimensionId); }
    setGenerated(hash: string) { this.manager.setGenerated(hash + this.dimensionId); }

    /**
     * Single-pass chunk generator: stone → soil → surface grass → vegetation → trees.
     * Yields every X-row to prevent watchdog timeout.
     */
    *generate(X: number, Z: number, failRef: { count: number }, done: () => void) {
        const { dimension: dim } = this;
        const random = this.seed.getSeqence(X, Z);
        const worldX = X * 16, worldZ = Z * 16;
        const placedTrees: {x: number, z: number}[] = [];

        try {
            // Java cell-based terrain interpolation (GaiaChunkGenerator.doFill + GaiaNoiseInterpolator)
            // Java computes density at cell corners (every cellWidth=4 blocks) and
            // bilinearly interpolates between them. This creates smooth slopes instead
            // of 4x4 tetris stepping at biome boundaries.
            const CELL = 4;
            const CELLS_X = 16 / CELL; // 4 cells per chunk axis
            const CELLS_Z = 16 / CELL;
            // Pre-compute heights at 5x5 cell corners (0,4,8,12,16 on each axis)
            const corners: number[][] = [];
            for (let cx = 0; cx <= CELLS_X; cx++) {
                corners[cx] = [];
                for (let cz = 0; cz <= CELLS_Z; cz++) {
                    corners[cx][cz] = this.getHeight(worldX + cx * CELL, worldZ + cz * CELL);
                }
            }

            for (let x = 0; x < 16; x++) {
                for (let z = 0; z < 16; z++) {
                    const xx = worldX + x, zz = worldZ + z;
                    
                    // Domain warp (jitter) for biome boundaries to prevent cubical blending
                    const jitterX = Math.round(this.spikes.GetNoise(xx * 2, zz * 2) * 5);
                    const jitterZ = Math.round(this.spikes.GetNoise(xx * 2 + 1000, zz * 2 + 1000) * 5);
                    const biome = this.getBiomeAt(xx + jitterX, zz + jitterZ);

                    // Bilinear interpolation between cell corners (Java: Mth.lerp3)
                    const cellX = Math.floor(x / CELL);
                    const cellZ = Math.floor(z / CELL);
                    const fracX = (x - cellX * CELL) / CELL;
                    const fracZ = (z - cellZ * CELL) / CELL;
                    const h00 = corners[cellX][cellZ];
                    const h10 = corners[cellX + 1][cellZ];
                    const h01 = corners[cellX][cellZ + 1];
                    const h11 = corners[cellX + 1][cellZ + 1];
                    // bilerp: lerp(lerp(h00,h10,fx), lerp(h01,h11,fx), fz)
                    let terrain = Math.floor(h00 + (h10 - h00) * fracX + (h01 - h00) * fracZ + (h00 - h10 - h01 + h11) * fracX * fracZ);
                    if (isNaN(terrain) || !isFinite(terrain)) terrain = ENTRY;
                    terrain = Math.max(this.range.min, Math.min(this.range.max - 1, terrain));

                    const groundId = biome.groundPaletted?.permutations?.[0] as string ?? "gaiadimension:crystal_plains_glitter_grass";
                    const underId = biome.underGroundPaletted?.permutations?.[0] as string ?? "gaiadimension:heavy_soil";
                    const isUnderwater = terrain < SEA_LEVEL;

                    // 1. Stone shell
                    const stoneStart = Math.max(this.range.min, terrain - (STONE_DEPTH + SOIL_DEPTH));
                    for (let y = stoneStart; y < terrain - SOIL_DEPTH; y++) {
                        if (!setBlock(dim.getBlock({ x: xx, y, z: zz }), "gaiadimension:gaia_stone")) failRef.count++;
                    }

                    // 2. Soil
                    for (let y = terrain - SOIL_DEPTH; y < terrain; y++) {
                        if (!setBlock(dim.getBlock({ x: xx, y, z: zz }), underId)) failRef.count++;
                    }

                    // 3. Surface block
                    try {
                        const surfaceBlock = dim.getBlock({ x: xx, y: terrain, z: zz });
                        if (surfaceBlock) {
                            if (isUnderwater && groundId.includes("grass")) surfaceBlock.setType(underId);
                            else surfaceBlock.setType(groundId);
                        }
                    } catch (_) { /* block ID not registered — skip */ }
                    
                    // Water Fill
                    if (isUnderwater) {
                        for (let y = terrain + 1; y <= SEA_LEVEL; y++) {
                            const waterBlock = dim.getBlock({ x: xx, y, z: zz });
                            if (waterBlock) {
                                try { waterBlock.setType("gaiadimension:mineral_water"); } catch (_) {}
                            }
                        }
                    }

                    // 4. Vegetation — non-fatal
                    if (!isUnderwater && biome.vegetationPalette?.permutations?.length > 0) {
                        if (random.nextFloat() < biome.vegetationChance) {
                            const idx = Math.floor(random.nextFloat() * biome.vegetationPalette.permutations.length);
                            const vegId = biome.vegetationPalette.permutations[idx] as string;
                            if (vegId) {
                                const vBlock = dim.getBlock({ x: xx, y: terrain + 1, z: zz });
                                if (vBlock && vBlock.typeId === "minecraft:air") {
                                    try { vBlock.setType(vegId); } catch (_) {}
                                }
                            }
                        }
                    }

                    // 5. Trees
                    if (!isUnderwater && biome.hasTrees) {
                        if (random.nextFloat() < biome.treesChance &&
                            easeOutQuad((this.trees.GetNoise(xx, zz) + 1) / 2) < biome.treeAreaChance) {
                            
                            // Prevent tree fusion: enforce minimum spacing
                            let tooClose = false;
                            for (const pt of placedTrees) {
                                if (Math.abs(pt.x - xx) < 3 && Math.abs(pt.z - zz) < 3) {
                                    tooClose = true; break;
                                }
                            }

                            if (!tooClose) {
                                const treeDef = biome.trees.get(random.nextFloat());
                                if (treeDef) {
                                    const above = dim.getBlock({ x: xx, y: terrain + 1, z: zz });
                                    if (above && above.typeId === "minecraft:air") {
                                        try { 
                                            yield* this.placeTree(dim, xx, terrain + 1, zz, treeDef, random); 
                                            placedTrees.push({x: xx, z: zz});
                                        } catch (_) {}
                                    }
                                }
                            }
                        }
                    }
                }
                yield; // yield per X-row
            }
            done();
        } catch (e) {
            console.error(`[GaiaDim] Chunk ${X},${Z} error:`, e);
            done();
        }
    }

    *placeTree(dim: Dimension, x: number, baseY: number, z: number, treeDef: any, random: ProceduralRandom) {
        const logId = treeDef.logPaletted?.permutations?.[0] as string;
        const leafId = treeDef.leavesPaletted?.permutations?.[0] as string ?? treeDef.carpetPaletted?.permutations?.[0] as string;
        if (!logId) return;

        const minH = treeDef.height?.[0] ?? 4;
        const maxH = treeDef.height?.[1] ?? 8;
        const h = minH + Math.floor(random.nextFloat() * (maxH - minH + 1));

        for (let i = 0; i < h; i++) {
            setBlock(dim.getBlock({ x, y: baseY + i, z }), logId);
        }

        if (!leafId) return;
        const topY = baseY + h - 1;

        for (let ox = -2; ox <= 2; ox++) {
            for (let oz = -2; oz <= 2; oz++) {
                if (Math.abs(ox) === 2 && Math.abs(oz) === 2) continue;
                const leaf = dim.getBlock({ x: x + ox, y: topY, z: z + oz });
                if (leaf && leaf.typeId === "minecraft:air") {
                    try { leaf.setType(leafId); } catch (_) {}
                }
            }
        }
        for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
                const leaf = dim.getBlock({ x: x + ox, y: topY + 1, z: z + oz });
                if (leaf && leaf.typeId === "minecraft:air") {
                    try { leaf.setType(leafId); } catch (_) {}
                }
            }
        }
        yield;
    }
}

