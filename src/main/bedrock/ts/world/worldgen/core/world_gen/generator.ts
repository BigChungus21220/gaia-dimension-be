import { Dimension, system } from "@minecraft/server";
import { easeOutQuad, FastNoiseLite, ProceduralRandom } from "../utils";
import { buildGaiaLayers, getBiomeNameFromId } from "./gaia-layers";
import { BiomeDefinition } from "../definitions/definition-biome";
import { placeStructuresForChunk } from "./structures";

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
     * Computes the low-frequency biome depth and scale blending.
     * This is sampled at 4-block cell corners and bilinearly interpolated
     * across the chunk to create smooth slopes at biome boundaries.
     */
    getBiomeBlend(x: number, z: number): { depthOffset: number, scaleFactor: number, avgScale: number } {
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

        return { depthOffset, scaleFactor, avgScale };
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

                    // Place structures after terrain is complete
                    try {
                        placeStructuresForChunk(
                            X, Z,
                            this.dimension,
                            this.seed.seed,
                            (x: number, z: number) => this.getBiomeAt(x, z),
                            (x: number, z: number) => {
                                const raw = this.getTerrainHeight(x, z);
                                const blend = this.getBiomeBlend(x, z);
                                return Math.floor(68.0 + 128.0 * blend.depthOffset + (128.0 * (raw * 10) / blend.scaleFactor));
                            },
                        );
                    } catch (e) {
                        console.warn(`[GaiaDim] Structure placement error in chunk ${X},${Z}:`, e);
                    }

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
        // Pre-allocate lookup arrays for the tree placement pass (filled during terrain loop)
        const terrainMap = new Array<number>(256);
        const biomeMap = new Array<any>(256);
        const underwaterMap = new Array<boolean>(256);

        try {
            // Java cell-based terrain interpolation (GaiaChunkGenerator.doFill + GaiaNoiseInterpolator)
            // Java computes density at cell corners (every cellWidth=4 blocks) and
            // bilinearly interpolates between them. This creates smooth slopes instead
            // of 4x4 tetris stepping at biome boundaries.
            const CELL = 4;
            const CELLS_X = 16 / CELL; // 4 cells per chunk axis
            const CELLS_Z = 16 / CELL;
            // Pre-compute low-frequency biome blending at 5x5 cell corners (0,4,8,12,16 on each axis)
            const corners: {depthOffset: number, scaleFactor: number, avgScale: number}[][] = [];
            for (let cx = 0; cx <= CELLS_X; cx++) {
                corners[cx] = [];
                for (let cz = 0; cz <= CELLS_Z; cz++) {
                    corners[cx][cz] = this.getBiomeBlend(worldX + cx * CELL, worldZ + cz * CELL);
                }
            }

            for (let x = 0; x < 16; x++) {
                for (let z = 0; z < 16; z++) {
                    const xx = worldX + x, zz = worldZ + z;
                    
                    // Domain warp (jitter) for biome boundaries to prevent cubical blending
                    const jitterX = Math.round(this.spikes.GetNoise(xx * 2, zz * 2) * 5);
                    const jitterZ = Math.round(this.spikes.GetNoise(xx * 2 + 1000, zz * 2 + 1000) * 5);
                    const biome = this.getBiomeAt(xx + jitterX, zz + jitterZ);

                    // Bilinear interpolation of low-frequency biome blend parameters
                    const cellX = Math.floor(x / CELL);
                    const cellZ = Math.floor(z / CELL);
                    const fracX = (x - cellX * CELL) / CELL;
                    const fracZ = (z - cellZ * CELL) / CELL;
                    const c00 = corners[cellX][cellZ];
                    const c10 = corners[cellX + 1][cellZ];
                    const c01 = corners[cellX][cellZ + 1];
                    const c11 = corners[cellX + 1][cellZ + 1];
                    
                    // bilerp: lerp(lerp(h00,h10,fx), lerp(h01,h11,fx), fz)
                    const depthOffset = c00.depthOffset + (c10.depthOffset - c00.depthOffset) * fracX + (c01.depthOffset - c00.depthOffset) * fracZ + (c00.depthOffset - c10.depthOffset - c01.depthOffset + c11.depthOffset) * fracX * fracZ;
                    const scaleFactor = c00.scaleFactor + (c10.scaleFactor - c00.scaleFactor) * fracX + (c01.scaleFactor - c00.scaleFactor) * fracZ + (c00.scaleFactor - c10.scaleFactor - c01.scaleFactor + c11.scaleFactor) * fracX * fracZ;
                    const avgScale = c00.avgScale + (c10.avgScale - c00.avgScale) * fracX + (c01.avgScale - c00.avgScale) * fracZ + (c00.avgScale - c10.avgScale - c01.avgScale + c11.avgScale) * fracX * fracZ;

                    // High-frequency surface noise is evaluated precisely at the 1x1 block coordinate
                    const raw = this.getTerrainHeight(xx, zz);
                    
                    // Exact mathematical collapse of Java's 3D DensityFunction to a 2D surface (where totaldensity = 0)
                    // Java: y_cell = 16 * (0.53125 + depthOffset + noise / scaleFactor)
                    // At cellHeight = 8, y_blocks = 128 * (0.53125 + depthOffset + noise / scaleFactor)
                    // Which simplifies to: 68.0 + 128 * depthOffset + 128 * noise / scaleFactor
                    // We scale our 'raw' noise (which is generally -1 to 1) to match Java's 128.0D blendedNoise amplitude.
                    let terrain = Math.floor(68.0 + 128.0 * depthOffset + (128.0 * (raw * 10) / scaleFactor));
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

                    // Store terrain heights for tree placement pass
                    terrainMap[x * 16 + z] = terrain;
                    biomeMap[x * 16 + z] = biome;
                    underwaterMap[x * 16 + z] = isUnderwater;
                }
                yield; // yield per X-row
            }

            // 5. Trees — Java countExtra(count, chance, extra) + InSquarePlacement
            // Java picks N random XZ positions per chunk, NOT per-block chance.
            // This prevents the noise-gated dead zones that caused treeless biomes.

            // Find dominant biome for tree count (Java uses per-biome feature placement)
            const centerBiome = biomeMap[8 * 16 + 8] || biomeMap[0];
            if (centerBiome && centerBiome.hasTrees && centerBiome.treesPerChunk >= 0) {
                // Java countExtra: count + (random < chance ? extra : 0)
                let totalTrees = centerBiome.treesPerChunk;
                if (random.nextFloat() < centerBiome.treesExtraChance) {
                    totalTrees += centerBiome.treesExtra;
                }

                for (let t = 0; t < totalTrees; t++) {
                    // InSquarePlacement.spread() — uniform random XZ within chunk
                    const tx = Math.floor(random.nextFloat() * 16);
                    const tz = Math.floor(random.nextFloat() * 16);
                    const tIdx = tx * 16 + tz;
                    
                    if (underwaterMap[tIdx]) continue;
                    const terrain = terrainMap[tIdx];
                    if (terrain === undefined) continue;

                    const txx = worldX + tx;
                    const tzz = worldZ + tz;

                    // Minimum spacing check (prevents tree fusion)
                    let tooClose = false;
                    for (const pt of placedTrees) {
                        if (Math.abs(pt.x - txx) < 3 && Math.abs(pt.z - tzz) < 3) {
                            tooClose = true; break;
                        }
                    }
                    if (tooClose) continue;

                    const biome = biomeMap[tIdx] || centerBiome;
                    const treeDef = biome.trees.get(random.nextFloat());
                    if (treeDef) {
                        const above = dim.getBlock({ x: txx, y: terrain + 1, z: tzz });
                        if (above && above.typeId === "minecraft:air") {
                            try { 
                                yield* this.placeTree(dim, txx, terrain + 1, tzz, treeDef, random); 
                                placedTrees.push({x: txx, z: tzz});
                            } catch (_) {}
                        }
                    }
                }
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

        const minH = treeDef.height?.[0] ?? 5;
        const maxH = treeDef.height?.[1] ?? 11;
        const h = minH + Math.floor(random.nextFloat() * (maxH - minH + 1));

        // Leaf-start offset: leaves begin from roughly the lower-third of the trunk
        // This matches the SpruceTreeDefinition.build() "add" parameter
        const leafStart = Math.max(1, Math.floor(h * 0.3));
        const totalHeight = h;

        for (let Y = 0; Y < totalHeight; Y++) {
            const yy = baseY + Y;
            // Trunk (all but the very top block which becomes a leaf tip)
            if (Y < totalHeight - 1) {
                setBlock(dim.getBlock({ x, y: yy, z }), logId);
            } else {
                // Top of trunk: leaf block (like SpruceTreeDefinition)
                if (leafId) {
                    const b = dim.getBlock({ x, y: yy, z });
                    if (b && b.typeId === "minecraft:air") {
                        try { b.setType(leafId); } catch (_) {}
                    }
                }
            }

            // Radial foliage layers (original polar-coordinate algorithm)
            // Leaves start at 'leafStart' height and get wider toward the bottom
            if (leafId && Y >= leafStart) {
                const max = totalHeight - Y + 1; // wider at bottom, narrower at top
                for (let i = 0.5; i < max; i += 0.8) {
                    const count = Math.floor(i * Math.PI);
                    for (let j = 0; j < count; j++) {
                        const distance = random.nextFloat() * i / 3 + 0.2;
                        const rot = random.nextFloat() * Math.PI * 2;
                        const lx = x + Math.floor(Math.sin(rot) * distance + 0.5);
                        const lz = z + Math.floor(Math.cos(rot) * distance + 0.5);
                        const leaf = dim.getBlock({ x: lx, y: yy, z: lz });
                        if (leaf && leaf.typeId === "minecraft:air") {
                            try { leaf.setType(leafId); } catch (_) {}
                        }
                    }
                }
            }
        }
        yield;
    }
}

