/**
 * GAIA BIOME LAYER SYSTEM — 1:1 port of Java's layer-based biome generation
 * 
 * Java source files ported:
 *   IslandLayer.java, AddIslandLayer.java, ZoomLayer.java,
 *   GaiaBiomesLayer.java, GoldIslandLayer.java, OceanLayer.java,
 *   RemoveTooMuchOceanLayer.java, SmoothLayer.java,
 *   MineralRiverLayer.java, OceanMixerLayer.java, MineralRiverMixLayer.java,
 *   GaiaLayerUtil.java
 *
 * This replaces the temperature/humidity biome manager with the actual
 * Minecraft-style layer system the Java mod uses.
 */

// ══════════════════════════════════════════════════
//  BIOME IDS — simple numeric IDs like Java's registry IDs
// ══════════════════════════════════════════════════
export const BIOME_IDS = {
    OCEAN:              0,  // mineral_reservoir
    LAND:               1,  // generic land marker
    // Common (5)
    PINK_AGATE_FOREST:  2,
    BLUE_AGATE_TAIGA:   3,
    GREEN_AGATE_JUNGLE: 4,
    CRYSTAL_PLAINS:     5,
    FOSSIL_WOODLAND:    6,
    // Uncommon (6)
    VOLCANIC_LANDS:     7,
    STATIC_WASTELAND:   8,
    SALT_DUNES:         9,
    SMOLDERING_BOG:     10,
    SHINING_GROVE:      11,
    MOOKAITE_MESA:      12,
    // Rare (3)
    PURPLE_AGATE_SWAMP: 13,
    GOLDSTONE_LANDS:    14,
    MUTANT_WILDWOOD:    15,
    // Gold (5)
    GOLDEN_FOREST:      16,
    GOLDEN_PLAINS:      17,
    GOLDEN_HILLS:       18,
    GOLDEN_SANDS:       19,
    GOLDEN_MARSH:       20,
    // Water
    MINERAL_RIVER:      21,
    // Gold marker
    GOLD_ISLAND:        22,
} as const;

export type BiomeId = typeof BIOME_IDS[keyof typeof BIOME_IDS];

const B = BIOME_IDS;

const COMMON: readonly BiomeId[] = [B.PINK_AGATE_FOREST, B.BLUE_AGATE_TAIGA, B.GREEN_AGATE_JUNGLE, B.CRYSTAL_PLAINS, B.FOSSIL_WOODLAND];
const UNCOMMON: readonly BiomeId[] = [B.VOLCANIC_LANDS, B.STATIC_WASTELAND, B.SALT_DUNES, B.SMOLDERING_BOG, B.SHINING_GROVE, B.MOOKAITE_MESA];
const RARE: readonly BiomeId[] = [B.PURPLE_AGATE_SWAMP, B.GOLDSTONE_LANDS, B.MUTANT_WILDWOOD];
const GOLD: readonly BiomeId[] = [B.GOLDEN_SANDS, B.GOLDEN_MARSH, B.GOLDEN_HILLS, B.GOLDEN_FOREST, B.GOLDEN_PLAINS];

// ══════════════════════════════════════════════════
//  SEEDED RNG — matches Java's LinearCongruentialGenerator
// ══════════════════════════════════════════════════
class LayerRNG {
    private state: number;
    constructor(seed: number) { this.state = seed | 0; }

    public initRandom(x: number, z: number): void {
        let s = this.state;
        s = Math.imul(s, s * 6364136223846793005 + 1442695040888963407 | 0);
        s = (s + x) | 0;
        s = Math.imul(s, s * 6364136223846793005 + 1442695040888963407 | 0);
        s = (s + z) | 0;
        s = Math.imul(s, s * 6364136223846793005 + 1442695040888963407 | 0);
        s = (s + x) | 0;
        s = Math.imul(s, s * 6364136223846793005 + 1442695040888963407 | 0);
        s = (s + z) | 0;
        this.state = s;
    }

    public nextRandom(bound: number): number {
        let r = ((this.state >> 24) % bound) | 0;
        if (r < 0) r += bound;
        this.state = Math.imul(this.state, 6364136223846793005) + 1442695040888963407 | 0;
        return r;
    }

    public random2<T>(a: T, b: T): T {
        return this.nextRandom(2) === 0 ? a : b;
    }

    public random4<T>(a: T, b: T, c: T, d: T): T {
        const r = this.nextRandom(4);
        return r === 0 ? a : r === 1 ? b : r === 2 ? c : d;
    }
}

// ══════════════════════════════════════════════════
//  LAYER CACHE — 2D grid that stores biome IDs
// ══════════════════════════════════════════════════
type LayerFn = (x: number, z: number) => BiomeId;

function cachedLayer(fn: LayerFn, cacheSize: number = 1024): LayerFn {
    const cache = new Map<number, BiomeId>();
    return (x: number, z: number): BiomeId => {
        const key = ((x & 0xFFFF) << 16) | (z & 0xFFFF);
        const v = cache.get(key);
        if (v !== undefined) return v;
        const res = fn(x, z);
        if (cache.size > cacheSize) cache.clear();
        cache.set(key, res);
        return res;
    };
}

// ══════════════════════════════════════════════════
//  LAYER IMPLEMENTATIONS (from Java)
// ══════════════════════════════════════════════════

function islandLayer(seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        rng.initRandom(x, z);
        if (x === 0 && z === 0) return B.LAND;
        return rng.nextRandom(10) === 0 ? B.LAND : B.OCEAN;
    });
}

function zoomLayer(parent: LayerFn, seed: number, fuzzy: boolean): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const px = x >> 1, pz = z >> 1;
        const first = parent(px, pz);
        rng.initRandom(px << 1, pz << 1);
        const rx = x & 1, rz = z & 1;

        if (rx === 0 && rz === 0) return first;

        const south = parent(px, pz + 1);
        const randFS = rng.random2(first, south);
        if (rx === 0) return randFS;

        const east = parent(px + 1, pz);
        const randFE = rng.random2(first, east);
        if (rz === 0) return randFE;

        const se = parent(px + 1, pz + 1);
        if (fuzzy) return rng.random4(first, south, east, se);
        return modeOrRandom(rng, first, south, east, se);
    });
}

function modeOrRandom(rng: LayerRNG, a: BiomeId, b: BiomeId, c: BiomeId, d: BiomeId): BiomeId {
    if (b === c && c === d) return b;
    if (a === b && a === c) return a;
    if (a === b && a === d) return a;
    if (a === c && a === d) return a;
    if (a === b && c !== d) return a;
    if (a === c && b !== d) return a;
    if (a === d && b !== c) return a;
    if (b === c && a !== d) return b;
    if (b === d && a !== c) return b;
    if (c === d && a !== b) return c;
    return rng.random4(a, b, c, d);
}

function isOcean(v: BiomeId): boolean { return v === B.OCEAN; }
function isGold(v: BiomeId): boolean { return v === B.GOLD_ISLAND || GOLD.includes(v); }

function addIslandLayer(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        // Bishop neighbors (diagonals)
        const sw = parent(x - 1, z - 1);
        const se = parent(x + 1, z - 1);
        const ne = parent(x + 1, z + 1);
        const nw = parent(x - 1, z + 1);
        const center = parent(x, z);
        rng.initRandom(x, z);

        if (!isOcean(center) || (isOcean(nw) && isOcean(ne) && isOcean(sw) && isOcean(se))) {
            if (!isOcean(center) && (isOcean(nw) || isOcean(sw) || isOcean(ne) || isOcean(se)) && rng.nextRandom(5) === 0) {
                if (isOcean(nw)) return center === B.LAND ? B.LAND : nw;
                if (isOcean(sw)) return center === B.LAND ? B.LAND : sw;
                if (isOcean(ne)) return center === B.LAND ? B.LAND : ne;
                if (isOcean(se)) return center === B.LAND ? B.LAND : se;
            }
            return center;
        } else {
            let i = 1, j: BiomeId = B.LAND;
            if (!isOcean(nw) && rng.nextRandom(i++) === 0) j = nw;
            if (!isOcean(ne) && rng.nextRandom(i++) === 0) j = ne;
            if (!isOcean(sw) && rng.nextRandom(i++) === 0) j = sw;
            if (!isOcean(se) && rng.nextRandom(i++) === 0) j = se;
            return (rng.nextRandom(3) === 0 ? j : (j === B.LAND ? B.LAND : center));
        }
    });
}

function removeTooMuchOcean(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const n = parent(x, z - 1), e = parent(x + 1, z);
        const s = parent(x, z + 1), w = parent(x - 1, z);
        const c = parent(x, z);
        rng.initRandom(x, z);
        if (isOcean(c) && isOcean(n) && isOcean(e) && isOcean(w) && isOcean(s)) {
            return rng.nextRandom(2) === 0 ? c : B.LAND;
        }
        return B.LAND;
    });
}

function goldIslandLayer(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const sw = parent(x - 1, z - 1), se = parent(x + 1, z - 1);
        const ne = parent(x + 1, z + 1), nw = parent(x - 1, z + 1);
        const c = parent(x, z);
        rng.initRandom(x, z);
        if (isOcean(sw) && isOcean(se) && isOcean(ne) && isOcean(nw) && isOcean(c)) {
            if (rng.nextRandom(3) === 0) return B.GOLD_ISLAND;
        }
        return c;
    });
}

function gaiaBiomesLayer(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const c = parent(x, z);
        rng.initRandom(x, z);
        if (isOcean(c)) return c;
        if (isGold(c)) return GOLD[rng.nextRandom(GOLD.length)];
        if (rng.nextRandom(16) === 0) return RARE[rng.nextRandom(RARE.length)];
        if (rng.nextRandom(8) === 0) return UNCOMMON[rng.nextRandom(UNCOMMON.length)];
        return COMMON[rng.nextRandom(COMMON.length)];
    });
}

function smoothLayer(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const c = parent(x, z);
        const n = parent(x, z - 1), e = parent(x + 1, z);
        const s = parent(x, z + 1), w = parent(x - 1, z);
        rng.initRandom(x, z);
        if (n === s && w === e) return rng.nextRandom(2) === 0 ? n : w;
        if (n === s) return n;
        if (w === e) return w;
        return c;
    });
}

function riverLayer(parent: LayerFn, seed: number): LayerFn {
    const rng = new LayerRNG(seed);
    return cachedLayer((x: number, z: number): BiomeId => {
        const c = parent(x, z);
        const n = parent(x, z - 1), e = parent(x + 1, z);
        const s = parent(x, z + 1), w = parent(x - 1, z);
        if (c !== n || c !== e || c !== s || c !== w) return B.MINERAL_RIVER;
        return B.OCEAN; // no river marker
    });
}

function riverMixLayer(biomesParent: LayerFn, riverParent: LayerFn, seed: number): LayerFn {
    return cachedLayer((x: number, z: number): BiomeId => {
        const biome = biomesParent(x, z);
        const river = riverParent(x, z);
        if (isOcean(biome)) return biome;
        if (river === B.MINERAL_RIVER) return B.MINERAL_RIVER;
        return biome;
    });
}

function oceanMixLayer(biomesParent: LayerFn, oceanParent: LayerFn, seed: number): LayerFn {
    return cachedLayer((x: number, z: number): BiomeId => {
        const biome = biomesParent(x, z);
        // const ocean = oceanParent(x, z); // unused in original
        if (!isOcean(biome)) return biome;
        return B.OCEAN; // mineral_reservoir
    });
}

// ══════════════════════════════════════════════════
//  BUILD LAYER STACK — matches GaiaLayerUtil.makeLayers()
// ══════════════════════════════════════════════════
export function buildGaiaLayers(worldSeed: number): LayerFn {
    let islands: LayerFn = islandLayer(worldSeed + 1);
    islands = zoomLayer(islands, worldSeed + 2000, true);  // FUZZY
    islands = addIslandLayer(islands, worldSeed + 1);
    islands = zoomLayer(islands, worldSeed + 2001, false);  // NORMAL
    islands = addIslandLayer(islands, worldSeed + 2);
    islands = addIslandLayer(islands, worldSeed + 50);
    islands = addIslandLayer(islands, worldSeed + 70);
    islands = removeTooMuchOcean(islands, worldSeed + 2);

    let ocean: LayerFn = islandLayer(worldSeed + 2); // All ocean
    ocean = cachedLayer((_x: number, _z: number): BiomeId => B.OCEAN); // OceanLayer always returns ocean
    ocean = zoomLayer(ocean, worldSeed + 2001, true);
    for (let i = 2002; i <= 2005; i++) ocean = zoomLayer(ocean, worldSeed + i, false);
    ocean = smoothLayer(ocean, worldSeed + 1003);

    islands = addIslandLayer(islands, worldSeed + 3);
    islands = zoomLayer(islands, worldSeed + 2002, false);
    islands = zoomLayer(islands, worldSeed + 2003, false);
    islands = addIslandLayer(islands, worldSeed + 4);
    islands = goldIslandLayer(islands, worldSeed + 5);
    islands = zoomLayer(islands, worldSeed + 1000, false);

    let biomes: LayerFn = gaiaBiomesLayer(islands, worldSeed + 1);
    for (let i = 1000; i <= 1005; i++) biomes = zoomLayer(biomes, worldSeed + i, false);

    // River generation — Java: exactly 1 smooth pass (GaiaLayerUtil.java L52)
    let river: LayerFn = riverLayer(biomes, worldSeed + 1);
    river = smoothLayer(river, worldSeed + 1000);

    biomes = smoothLayer(biomes, worldSeed + 1000);
    biomes = riverMixLayer(biomes, river, worldSeed + 100);
    biomes = oceanMixLayer(biomes, ocean, worldSeed + 100);

    return biomes;
}

// ══════════════════════════════════════════════════
//  BIOME ID → BIOME DEFINITION LOOKUP
// ══════════════════════════════════════════════════
const ID_TO_NAME: Partial<Record<BiomeId, string>> = {
    [B.OCEAN]:              "gaiadimension:crystal_plains",
    [B.PINK_AGATE_FOREST]:  "gaiadimension:pink_agate_forest",
    [B.BLUE_AGATE_TAIGA]:   "gaiadimension:blue_agate_taiga",
    [B.GREEN_AGATE_JUNGLE]: "gaiadimension:green_agate_jungle",
    [B.CRYSTAL_PLAINS]:     "gaiadimension:crystal_plains",
    [B.FOSSIL_WOODLAND]:    "gaiadimension:fossil_woodland",
    [B.VOLCANIC_LANDS]:     "gaiadimension:volcanic_lands",
    [B.STATIC_WASTELAND]:   "gaiadimension:static_wasteland",
    [B.SALT_DUNES]:         "gaiadimension:salt_dunes",
    [B.SMOLDERING_BOG]:     "gaiadimension:smoldering_bog",
    [B.SHINING_GROVE]:      "gaiadimension:shining_grove",
    [B.MOOKAITE_MESA]:      "gaiadimension:mookaite_mesa",
    [B.PURPLE_AGATE_SWAMP]: "gaiadimension:purple_agate_swamp",
    [B.GOLDSTONE_LANDS]:    "gaiadimension:goldstone_lands",
    [B.MUTANT_WILDWOOD]:    "gaiadimension:mutant_agate_wildwood",
    [B.GOLDEN_FOREST]:      "gaiadimension:golden_forest",
    [B.GOLDEN_PLAINS]:      "gaiadimension:golden_plains",
    [B.GOLDEN_HILLS]:       "gaiadimension:golden_hills",
    [B.GOLDEN_SANDS]:       "gaiadimension:golden_sands",
    [B.GOLDEN_MARSH]:       "gaiadimension:golden_marsh",
    [B.MINERAL_RIVER]:      "gaiadimension:mineral_river",
    [B.GOLD_ISLAND]:        "gaiadimension:golden_forest",
    [B.LAND]:               "gaiadimension:crystal_plains",
};

export function getBiomeNameFromId(id: BiomeId): string {
    return ID_TO_NAME[id] ?? "gaiadimension:crystal_plains";
}
