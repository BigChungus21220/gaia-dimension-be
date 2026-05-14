import { Dimension, system, Block, NumberRange } from "@minecraft/server";
import { FastNoiseLite, ProceduralRandom } from "../utils";
import { buildGaiaLayers, getBiomeNameFromId } from "./gaia-layers";
import { BiomeDefinition } from "../definitions/definition-biome";
import { placeStructuresForChunk } from "./structures";
import type { SessionManager } from "./session-manager";

// Java source: GaiaDimensions.java — sea level 63, minY -64
const SEA_LEVEL = 63;
const ENTRY = 0; // Shifted from -64 to 0 so terrain generates around Y=70, allowing rivers (Y=55) to fill with water up to Y=63
const STONE_DEPTH = 10;  // shallow shell — only fill what's visible
const SOIL_DEPTH = 4;

function setBlock(block: Block | undefined | null, type: string): boolean {
    if (!block) return false;
    if (block.typeId !== type) {
        try { block.setType(type); } catch (_) { return false; }
    }
    return true;
}

export class ChunkGenerator {
    public seaLevel: number = SEA_LEVEL;
    public entry: number = ENTRY;
    public manager: SessionManager;
    public dimension: Dimension;
    public dimensionId: string;
    public range: NumberRange;
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

    // Biome cache: biome name -> BiomeDefinition
    private biomeCache = new Map<string, BiomeDefinition>();

    constructor(sessionManager: SessionManager, dimension: Dimension, seed: ProceduralRandom) {
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
     * The layers operate on biome-grid coords (Ã·4), matching Java's getNoiseBiome(x/4, y, z/4).
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
                // Java: divide by (depth + 2.0) â€” this is what creates smooth slopes
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

    isGenerated(hash: string): boolean { return this.manager.isGenerated(hash + this.dimensionId); }
    setGenerated(hash: string): void { this.manager.setGenerated(hash + this.dimensionId); }

    /**
     * Single-pass chunk generator: stone -> soil -> surface grass -> vegetation -> trees.
     * Yields every X-row to prevent watchdog timeout.
     */
    *generate(X: number, Z: number, failRef: { count: number }, done: () => void): Generator<void, void, unknown> {
        const { dimension: dim } = this;
        const random = this.seed.getSeqence(X, Z);
        const worldX = X * 16, worldZ = Z * 16;
        const placedTrees: { x: number, z: number }[] = [];
        // Pre-allocate lookup arrays for the tree placement pass (filled during terrain loop)
        const terrainMap = new Array<number>(256);
        const biomeMap = new Array<BiomeDefinition>(256);
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
            const corners: { depthOffset: number, scaleFactor: number, avgScale: number }[][] = [];
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

                    // Exact mathematical collapse of Java's 3D DensityFunction to a 2D surface 
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
                                try { waterBlock.setType("gaiadimension:mineral_water"); } catch (_) { }
                            }
                        }
                    }

                    // 4. Vegetation — non-fatal
                    if (!isUnderwater && (biome.vegetationPalette?.permutations?.length ?? 0) > 0) {
                        if (random.nextFloat() < biome.vegetationChance) {
                            const idx = Math.floor(random.nextFloat() * (biome.vegetationPalette.permutations.length));
                            const vegId = biome.vegetationPalette.permutations[idx] as string;
                            if (vegId) {
                                const vBlock = dim.getBlock({ x: xx, y: terrain + 1, z: zz });
                                if (vBlock && vBlock.typeId === "minecraft:air") {
                                    try { vBlock.setType(vegId); } catch (_) { }
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

                let placed = 0;
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
                                yield* this.placeTree(dim, txx, terrain + 1, tzz, treeDef as any, random);
                                placedTrees.push({ x: txx, z: tzz });
                                placed++;
                            } catch (treeErr) {
                                console.warn(`[GaiaDim] Tree place failed at ${txx},${terrain+1},${tzz}: ${treeErr}`);
                            }
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


    *placeTree(dim: Dimension, x: number, baseY: number, z: number, treeDef: any, random: ProceduralRandom): Generator<void, void, unknown> {
        const logId = treeDef.logPaletted?.permutations?.[0] as string;
        const leafId = treeDef.leavesPaletted?.permutations?.[0] as string ?? treeDef.carpetPaletted?.permutations?.[0] as string;
        if (!logId) return;

        const minH = treeDef.height?.[0] ?? 5;
        const maxH = treeDef.height?.[1] ?? 11;
        const h = minH + Math.floor(random.nextFloat() * (maxH - minH + 1));
        const treeId = treeDef.id || "";

        // ── Trunk placement → returns foliage attachment points ──
        let attachments: { x: number; y: number; z: number }[];

        if (treeId === "green_agate") {
            attachments = placeThickTrunk(dim, x, baseY, z, h, logId);
        } else if (treeId === "purple_agate") {
            attachments = placeCardinalTrunk(dim, x, baseY, z, h, logId);
        } else if (treeId === "aura") {
            attachments = placeFourBranchTrunk(dim, x, baseY, z, h, logId);
        } else if (treeId === "golden_small" || treeId === "golden_big") {
            attachments = placeVaryingFourBranchTrunk(dim, x, baseY, z, h, logId, random);
        } else if (treeId === "green_agate_bush") {
            setBlock(dim.getBlock({ x, y: baseY, z }), logId);
            attachments = [{ x, y: baseY + 1, z }];
        } else {
            // StraightTrunkPlacer â€” simple column (pink, blue, corrupted, burnt, fire, etc.)
            for (let i = 0; i < h; i++) {
                setBlock(dim.getBlock({ x, y: baseY + i, z }), logId);
            }
            attachments = [{ x, y: baseY + h, z }];
        }

        if (!leafId) return;

        // â”€â”€ Foliage at each attachment point â”€â”€
        for (const att of attachments) {
            placeFoliageForTree(dim, att.x, att.y, att.z, treeId, leafId, random);
        }
        yield;
    }
}

// ── TRUNK PLACERS (1:1 Java ports) ──────────────────────────────────────────

/** Java ThickTrunkPlacer — 2×2 cross core + corner buttresses + root extensions */
function placeThickTrunk(dim: Dimension, x: number, baseY: number, z: number, h: number, logId: string): { x: number, y: number, z: number }[] {
    for (let y = 0; y < h; y++) {
        const wy = baseY + y;
        // Y=0: root logs extending 2 blocks in each cardinal
        if (y === 0) {
            setBlock(dim.getBlock({ x, y: wy, z: z - 2 }), logId);
            setBlock(dim.getBlock({ x, y: wy, z: z + 2 }), logId);
            setBlock(dim.getBlock({ x: x + 2, y: wy, z }), logId);
            setBlock(dim.getBlock({ x: x - 2, y: wy, z }), logId);
        }
        // Lower quarter: corner buttress
        if (y < Math.floor(h / 4)) {
            setBlock(dim.getBlock({ x: x + 1, y: wy, z: z + 1 }), logId);
            setBlock(dim.getBlock({ x: x + 1, y: wy, z: z - 1 }), logId);
            setBlock(dim.getBlock({ x: x - 1, y: wy, z: z + 1 }), logId);
            setBlock(dim.getBlock({ x: x - 1, y: wy, z: z - 1 }), logId);
        }
        // Core cross: center + 4 cardinal
        setBlock(dim.getBlock({ x, y: wy, z }), logId);
        setBlock(dim.getBlock({ x, y: wy, z: z - 1 }), logId);
        setBlock(dim.getBlock({ x, y: wy, z: z + 1 }), logId);
        setBlock(dim.getBlock({ x: x + 1, y: wy, z }), logId);
        setBlock(dim.getBlock({ x: x - 1, y: wy, z }), logId);
    }
    return [{ x, y: baseY + h, z }];
}

/** Java CardinalTrunkPlacer — straight trunk + 4 L-shaped cardinal branches */
function placeCardinalTrunk(dim: Dimension, x: number, baseY: number, z: number, h: number, logId: string): { x: number, y: number, z: number }[] {
    const atts: { x: number, y: number, z: number }[] = [];
    // Main trunk to height-2
    for (let y = 0; y <= h - 2; y++) {
        setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
    }
    // 4 cardinal branches: NORTH(0,-1), SOUTH(0,1), EAST(1,0), WEST(-1,0)
    const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    for (const [sx, sz] of dirs) {
        let bx = sx, bz = sz;
        // 1 step out at h-2
        setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 2, z: z + bz }), logId);
        // 1 step out at h-1
        setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 1, z: z + bz }), logId);
        // 2 steps out at h-1
        bx += sx; bz += sz;
        setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 1, z: z + bz }), logId);
        // 3 steps out at h
        bx += sx; bz += sz;
        setBlock(dim.getBlock({ x: x + bx, y: baseY + h, z: z + bz }), logId);
        // 4 steps out at h
        bx += sx; bz += sz;
        setBlock(dim.getBlock({ x: x + bx, y: baseY + h, z: z + bz }), logId);
        // Foliage attachment 5 steps out at h
        bx += sx; bz += sz;
        atts.push({ x: x + bx, y: baseY + h, z: z + bz });
    }
    return atts;
}

/** Java FourBranchTrunkPlacer — straight trunk + 4 branches stepping out from mid-height */
function placeFourBranchTrunk(dim: Dimension, x: number, baseY: number, z: number, h: number, logId: string): { x: number, y: number, z: number }[] {
    const atts: { x: number, y: number, z: number }[] = [];
    // Main trunk
    for (let y = 0; y < h; y++) {
        setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
    }
    // 4 cardinal branches from height/2 to height, stepping out every 2 blocks
    const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    for (const [sx, sz] of dirs) {
        let bx = sx, bz = sz;
        const startY = Math.floor(h / 2);
        for (let y = startY; y < h; y++) {
            setBlock(dim.getBlock({ x: x + bx, y: baseY + y, z: z + bz }), logId);
            if (y === h - 1) {
                atts.push({ x: x + bx, y: baseY + y + 1, z: z + bz });
            }
            if (y % 2 === 0) { bx += sx; bz += sz; }
        }
    }
    // Top attachment
    atts.push({ x, y: baseY + h, z });
    return atts;
}

/** Java VaryingFourBranchTrunkPlacer — half trunk + 4 random-offset branches */
function placeVaryingFourBranchTrunk(dim: Dimension, x: number, baseY: number, z: number, h: number, logId: string, random: ProceduralRandom): { x: number, y: number, z: number }[] {
    const atts: { x: number, y: number, z: number }[] = [];
    const halfH = Math.floor(h / 2);
    // Half trunk
    for (let y = 0; y <= halfH; y++) {
        setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
    }
    // 4 cardinal branches with random offset
    const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    for (const [sx, sz] of dirs) {
        let bx = 0, bz = 0;
        const offset = Math.floor(random.nextFloat() * 3);
        const startY = halfH - offset;
        // Horizontal branch: 2-4 logs outward
        const branchLen = Math.floor(random.nextFloat() * 3) + 2;
        for (let i = 0; i < branchLen; i++) {
            bx += sx; bz += sz;
            setBlock(dim.getBlock({ x: x + bx, y: baseY + startY, z: z + bz }), logId);
        }
        // Vertical part up to height-offset
        for (let y = startY; y <= h - offset; y++) {
            setBlock(dim.getBlock({ x: x + bx, y: baseY + y, z: z + bz }), logId);
        }
        atts.push({ x: x + bx, y: baseY + h - offset, z: z + bz });
    }
    return atts;
}

// ── FOLIAGE DISPATCH ──────────────────────────────────────────────────────────

function placeFoliageForTree(dim: Dimension, cx: number, cy: number, cz: number, treeId: string, leafId: string, random: ProceduralRandom): void {
    if (treeId === "green_agate") {
        // ThickFoliagePlacer(radius=3, offset=1) — 5 layers
        placeLeavesRowThick(dim, cx, cy, cz, 1, -4, leafId, random);
        placeLeavesRowThick(dim, cx, cy, cz, 2, -3, leafId, random);
        placeLeavesRowThick(dim, cx, cy, cz, 3, -2, leafId, random);
        placeLeavesRowThick(dim, cx, cy, cz, 3, -1, leafId, random);
        placeLeavesRowThick(dim, cx, cy, cz, 2, 0, leafId, random);
    } else if (treeId === "purple_agate") {
        // BulbFoliagePlacer(radius=1, offset=1) — 3 layers
        for (let y = 1; y >= -1; y--) {
            placeLeavesRowBulb(dim, cx, cy, cz, 1, -y, leafId);
        }
    } else if (treeId === "blue_agate") {
        // SpruceFoliagePlacer(radius=2-3, offset=0-2, crownHeight=1-2)
        const crownHeight = 1 + Math.floor(random.nextFloat() * 2);
        const foliageH = 4 + Math.floor(random.nextFloat() * 3);
        let r = 0;
        for (let y = foliageH; y >= 0; y--) {
            placeLeavesRowDefault(dim, cx, cy - (foliageH - y), cz, r, 0, leafId, random);
            if (r >= 1 && y > 0 && y < crownHeight) r--;
            else if (r < (2 + Math.floor(random.nextFloat() * 2))) r++;
        }
    } else if (treeId === "corrupted") {
        // PineFoliagePlacer(radius=1, offset=1, crownHeight=3-4)
        const crownH = 3 + Math.floor(random.nextFloat() * 2);
        for (let y = 0; y <= crownH; y++) {
            const lr = (y === 0 || y === crownH) ? 0 : 1;
            placeLeavesRowDefault(dim, cx, cy, cz, lr, -y, leafId, random);
        }
    } else if (treeId === "golden_small") {
        // CubeFoliagePlacer(radius=1, offset=1) — full cube
        for (let y = 1; y >= -1; y--) placeLeavesRowCube(dim, cx, cy, cz, 1, -y, leafId);
    } else if (treeId === "golden_big") {
        // CubeFoliagePlacer(radius=2, offset=1) — larger cube
        for (let y = 2; y >= -2; y--) placeLeavesRowCube(dim, cx, cy, cz, 2, -y, leafId);
    } else if (treeId === "green_agate_bush") {
        // BushFoliagePlacer(radius=2, offset=1, height=2) — 3 layers, random corner skip
        for (let y = 2; y >= 0; y--) placeLeavesRowBush(dim, cx, cy, cz, 2, -y, leafId, random);
    } else if (treeId === "pink_agate" || treeId === "fossilized") {
        // CappedFoliagePlacer(radius=3, offset=1) — proper multi-layer canopy
        // Java generates layers scaling outward then inward, like a rounded cap
        placeLeavesRowCapped(dim, cx, cy, cz, 1, -5, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 2, -4, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 3, -3, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 3, -2, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
    } else if (treeId === "aura") {
        // CappedFoliagePlacer(radius=2, offset=1)
        placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
    } else {
        // Default CappedFoliagePlacer(radius=2, offset=1) — burnt, fire, fossilized, etc.
        placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
        placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
    }
}

// ── Java FoliagePlacer.placeLeavesRow ports ──────────────────────────────────

/** CappedFoliagePlacer.shouldSkipLocation */
function placeLeavesRowCapped(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string, random: ProceduralRandom): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const ax = Math.abs(dx), az = Math.abs(dz);
            if (yOff === 0) {
                if ((ax > 1 || az > 1) && ax !== 0 && az !== 0) continue;
            } else {
                if (ax === radius && az === radius && radius > 0) continue;
            }
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

/** ThickFoliagePlacer.shouldSkipLocation */
function placeLeavesRowThick(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string, random: ProceduralRandom): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const ax = Math.abs(dx), az = Math.abs(dz);
            if (yOff === 0) {
                if ((ax > 1 || az > 1) && ax !== 0 && az !== 0) continue;
            } else if (yOff <= -4) {
                // no skip
            } else {
                if (ax === radius && az === radius && radius > 0) continue;
            }
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

/** BulbFoliagePlacer.shouldSkipLocation */
function placeLeavesRowBulb(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            if (Math.abs(dx) === radius && Math.abs(yOff) === radius && Math.abs(dz) === radius) continue;
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

/** CubeFoliagePlacer.shouldSkipLocation — always false */
function placeLeavesRowCube(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

/** BushFoliagePlacer.shouldSkipLocation — skip corners randomly */
function placeLeavesRowBush(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string, random: ProceduralRandom): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            if (Math.abs(dx) === radius && Math.abs(dz) === radius && random.nextFloat() < 0.5) continue;
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

/** Default vanilla shouldSkipLocation (PineFoliagePlacer etc) */
function placeLeavesRowDefault(dim: Dimension, cx: number, cy: number, cz: number, radius: number, yOff: number, leafId: string, random: ProceduralRandom): void {
    const y = cy + yOff;
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            if (Math.abs(dx) === radius && Math.abs(dz) === radius && radius > 0) continue;
            setLeaf(dim, cx + dx, y, cz + dz, leafId);
        }
    }
}

function setLeaf(dim: Dimension, x: number, y: number, z: number, leafId: string): void {
    const block = dim.getBlock({ x, y, z });
    if (block && block.typeId === "minecraft:air") {
        try { block.setType(leafId); } catch (_) { }
    }
}
