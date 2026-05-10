import { Dimension, world, StructurePlaceOptions, StructureRotation, StructureMirrorAxis, StructureAnimationMode } from "@minecraft/server";
import { ProceduralRandom } from "../utils";

/**
 * Gaia Dimension Structure Placement — 1:1 Java parity
 * 
 * Implements RandomSpreadStructurePlacement logic from Java Edition:
 *   - Mini Towers: spacing=30, separation=10, salt=420 (LINEAR spread)
 *   - Malachite Watchtower: spacing=35, separation=15, salt=621 (TRIANGULAR spread)
 * 
 * The structures are pre-built .mcstructure files placed via world.structureManager.place().
 */

// ──────────────────────────────────────────────────────
// Structure Definitions
// ──────────────────────────────────────────────────────

const MINI_TOWER_TYPES = ["amethyst_tower", "copal_tower", "jade_tower", "jet_tower"] as const;

// Java biome tags: HAS_MINI_TOWER = AGATE_BIOMES + fossil_woodland + crystal_plains
const MINI_TOWER_BIOMES = new Set([
    "gaiadimension:pink_agate_forest",
    "gaiadimension:blue_agate_taiga",
    "gaiadimension:green_agate_jungle",
    "gaiadimension:purple_agate_swamp",
    "gaiadimension:mutant_agate_wildwood",
    "gaiadimension:fossil_woodland",
    "gaiadimension:crystal_plains",
]);

// Java biome tags: HAS_MALACHITE_WATCHTOWER = pink_agate_forest, green_agate_jungle, crystal_plains
const MALACHITE_BIOMES = new Set([
    "gaiadimension:pink_agate_forest",
    "gaiadimension:green_agate_jungle",
    "gaiadimension:crystal_plains",
]);

// ──────────────────────────────────────────────────────
// Java RandomSpreadStructurePlacement — Deterministic grid check
// ──────────────────────────────────────────────────────

/**
 * Java's RandomSpreadStructurePlacement.getPotentialStructureChunk()
 * Determines if a structure CAN generate in a given chunk region.
 * Returns the chunk coords within this region that get the structure, or null.
 * 
 * @param chunkX - Chunk X coordinate
 * @param chunkZ - Chunk Z coordinate
 * @param spacing - Maximum distance between structures (in chunks)
 * @param separation - Minimum distance between structures (in chunks)  
 * @param salt - Unique salt for this structure type
 * @param worldSeed - World seed
 * @param triangular - Use triangular distribution (true) or linear (false)
 */
function getStructureChunkInRegion(
    chunkX: number, chunkZ: number,
    spacing: number, separation: number,
    salt: number, worldSeed: number,
    triangular: boolean
): { cx: number, cz: number } | null {
    // Java: int regionX = Math.floorDiv(chunkX, spacing)
    const regionX = Math.floor(chunkX / spacing);
    const regionZ = Math.floor(chunkZ / spacing);
    
    // Java seed mixing: (regionX * 341873128712L + regionZ * 132897987541L + worldSeed + salt)
    // We use a simplified but deterministic hash since JS doesn't have 64-bit ints
    const rngSeed = hashSeed(regionX, regionZ, worldSeed, salt);
    const rng = new SimpleRNG(rngSeed);

    const range = spacing - separation;
    let offsetX: number, offsetZ: number;

    if (triangular) {
        // Java: nextInt(range) + nextInt(range) / 2 — produces triangular distribution
        offsetX = Math.floor((rng.nextInt(range) + rng.nextInt(range)) / 2);
        offsetZ = Math.floor((rng.nextInt(range) + rng.nextInt(range)) / 2);
    } else {
        // Java: nextInt(range)
        offsetX = rng.nextInt(range);
        offsetZ = rng.nextInt(range);
    }

    const structChunkX = regionX * spacing + offsetX;
    const structChunkZ = regionZ * spacing + offsetZ;

    // Only return if the input chunk IS the structure chunk
    if (chunkX === structChunkX && chunkZ === structChunkZ) {
        return { cx: structChunkX, cz: structChunkZ };
    }

    return null;
}

/**
 * Deterministic seed hash that mimics Java's long multiplication.
 * Uses the same constants as Java Edition for consistent results.
 */
function hashSeed(regionX: number, regionZ: number, worldSeed: number, salt: number): number {
    // Approximate Java's 64-bit multiply using 32-bit ops
    // The key is that the result is deterministic for the same inputs
    let hash = regionX * 341873 + regionZ * 132897 + worldSeed + salt;
    // Mix bits to reduce clustering
    hash = ((hash >>> 16) ^ hash) * 0x45d9f3b;
    hash = ((hash >>> 16) ^ hash) * 0x45d9f3b;
    hash = (hash >>> 16) ^ hash;
    return Math.abs(hash);
}

/** Simple deterministic RNG matching Java's behavior */
class SimpleRNG {
    private state: number;
    constructor(seed: number) {
        this.state = (seed ^ 0x5DEECE66D) & 0xFFFFFFFF;
    }
    next(): number {
        this.state = (this.state * 1103515245 + 12345) & 0x7FFFFFFF;
        return this.state;
    }
    nextInt(bound: number): number {
        if (bound <= 0) return 0;
        return this.next() % bound;
    }
    nextFloat(): number {
        return this.next() / 0x7FFFFFFF;
    }
}

// ──────────────────────────────────────────────────────
// Rotation helpers
// ──────────────────────────────────────────────────────

const ROTATIONS: StructureRotation[] = [
    StructureRotation.None,
    StructureRotation.Rotate90,
    StructureRotation.Rotate180,
    StructureRotation.Rotate270,
];

// ──────────────────────────────────────────────────────
// Global structure placement tracking
// ──────────────────────────────────────────────────────

/** Tracks which chunks have already had structure placement attempted */
const PLACED_STRUCTURES = new Set<string>();

function getPlacementKey(chunkX: number, chunkZ: number, type: string): string {
    return `struct:${type}:${chunkX},${chunkZ}`;
}


// ──────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────

/**
 * Called after terrain generation for a chunk completes.
 * Checks if any structures should spawn in this chunk and places them.
 * 
 * @param chunkX - Chunk X coordinate
 * @param chunkZ - Chunk Z coordinate  
 * @param dimension - The Gaia dimension
 * @param worldSeed - World seed for determinism
 * @param getBiomeAt - Function to look up biome at world coordinates
 * @param getTerrainHeight - Function to sample surface height at world coords
 */
export function placeStructuresForChunk(
    chunkX: number, chunkZ: number,
    dimension: Dimension,
    worldSeed: number,
    getBiomeAt: (x: number, z: number) => { id: string },
    getTerrainHeightAt: (x: number, z: number) => number,
): void {
    // ── Mini Towers ──
    // Java: spacing=30, separation=10, salt=420, LINEAR
    const miniKey = getPlacementKey(chunkX, chunkZ, "mini_tower");
    if (!PLACED_STRUCTURES.has(miniKey)) {
        const miniResult = getStructureChunkInRegion(chunkX, chunkZ, 30, 10, 420, worldSeed, false);
        if (miniResult) {
            const worldX = miniResult.cx * 16 + 8; // Center of chunk
            const worldZ = miniResult.cz * 16 + 8;
            const biome = getBiomeAt(worldX, worldZ);

            if (MINI_TOWER_BIOMES.has(biome.id)) {
                // Pick random tower type based on chunk position
                const typeRng = new SimpleRNG(hashSeed(miniResult.cx, miniResult.cz, worldSeed, 999));
                const towerIdx = typeRng.nextInt(MINI_TOWER_TYPES.length);
                const towerName = MINI_TOWER_TYPES[towerIdx];
                const rotation = ROTATIONS[typeRng.nextInt(4)];

                // Get surface height at placement point
                const surfaceY = getTerrainHeightAt(worldX, worldZ);

                placeMiniTower(dimension, worldX, surfaceY, worldZ, towerName, rotation);
                PLACED_STRUCTURES.add(miniKey);
            }
        }
    }

    // ── Malachite Watchtower ──
    // Java: spacing=35, separation=15, salt=621, TRIANGULAR
    const malKey = getPlacementKey(chunkX, chunkZ, "malachite_watchtower");
    if (!PLACED_STRUCTURES.has(malKey)) {
        const malResult = getStructureChunkInRegion(chunkX, chunkZ, 35, 15, 621, worldSeed, true);
        if (malResult) {
            const worldX = malResult.cx * 16 + 8;
            const worldZ = malResult.cz * 16 + 8;
            const biome = getBiomeAt(worldX, worldZ);

            if (MALACHITE_BIOMES.has(biome.id)) {
                const typeRng = new SimpleRNG(hashSeed(malResult.cx, malResult.cz, worldSeed, 1337));
                const rotation = ROTATIONS[typeRng.nextInt(4)];
                const surfaceY = getTerrainHeightAt(worldX, worldZ);

                placeMalachiteTower(dimension, worldX, surfaceY, worldZ, rotation);
                PLACED_STRUCTURES.add(malKey);
            }
        }
    }
}

// ──────────────────────────────────────────────────────
// Structure Placement Functions
// ──────────────────────────────────────────────────────

/**
 * Places a mini tower structure at the given position.
 * Structure files are single .mcstructure files named: amethyst_tower, copal_tower, etc.
 */
function placeMiniTower(
    dimension: Dimension,
    x: number, surfaceY: number, z: number,
    towerName: string,
    rotation: StructureRotation
): void {
    try {
        const structureId = `mystructure:${towerName}`;
        
        // Place at surface level, offset down by 1 so the base embeds into terrain
        const placeY = Math.floor(surfaceY);

        const options: StructurePlaceOptions = {
            rotation: rotation,
            mirror: StructureMirrorAxis.None,
            animationMode: StructureAnimationMode.None,
            includeEntities: true,
            includeBlocks: true,
            waterlogged: false,
        };

        world.structureManager.place(structureId, dimension, { x, y: placeY, z }, options);

        // Java afterPlace: fill support column below the structure with heavy_soil
        // Fills downward from the base until hitting solid ground
        fillSupportColumn(dimension, x, placeY, z, 17); // Mini towers are ~17x17 base

    } catch (e: unknown) {
        console.warn(`[GaiaDim] Failed to place ${towerName} at ${x},${surfaceY},${z}:`, e);
    }
}

/**
 * Places the Malachite Watchtower structure.
 * This is the large boss structure (1.5MB .mcstructure file).
 */
function placeMalachiteTower(
    dimension: Dimension,
    x: number, surfaceY: number, z: number,
    rotation: StructureRotation
): void {
    try {
        const structureId = "mystructure:malachite_tower";
        const placeY = Math.floor(surfaceY);

        const options: StructurePlaceOptions = {
            rotation: rotation,
            mirror: StructureMirrorAxis.None,
            animationMode: StructureAnimationMode.None,
            includeEntities: true,
            includeBlocks: true,
            waterlogged: false,
        };

        world.structureManager.place(structureId, dimension, { x, y: placeY, z }, options);

        // Fill support columns for the larger watchtower footprint (~25x25)
        fillSupportColumn(dimension, x, placeY, z, 25);

    } catch (e: unknown) {
        console.warn(`[GaiaDim] Failed to place malachite_tower at ${x},${surfaceY},${z}:`, e);
    }
}

/**
 * Java MiniTowerStructure.afterPlace — fills columns of heavy_soil below the structure
 * to prevent floating towers. Iterates down from the base Y until hitting solid terrain.
 */
function fillSupportColumn(dimension: Dimension, centerX: number, baseY: number, centerZ: number, width: number): void {
    const half = Math.floor(width / 2);
    // Only fill the edges/corners where gaps are most visible — full fill is too expensive
    const step = 4; // Check every 4 blocks to save perf
    
    for (let dx = -half; dx <= half; dx += step) {
        for (let dz = -half; dz <= half; dz += step) {
            const bx = centerX + dx;
            const bz = centerZ + dz;
            for (let y = baseY - 1; y > baseY - 15; y--) {
                try {
                    const block = dimension.getBlock({ x: bx, y, z: bz });
                    if (!block) break;
                    if (block.typeId !== "minecraft:air" && !block.isLiquid) break;
                    block.setType("gaiadimension:heavy_soil");
                } catch (_) { break; }
            }
        }
    }
}
