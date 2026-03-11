import { WorldgenPipeline, Biome, q, v, t, Mth, loop } from './scripts/lib/worldgen.js';

const gaia = new WorldgenPipeline('gaiadimension', 'GaiaDimensions_BP');

// --- 1. COORDINATES & BASE NOISE ---
gaia.addLogic(() => {
    v.x = v.originx / 256;
    v.z = v.originz / 256;
    
    t.rivernoise = Mth.abs(q.noise(0.5 * v.x + 3167, 0.5 * v.z + 2396) * 0.25 + q.noise(0.05 * v.x - 1279, 0.05 * v.z - 1279));
    t.mountainnoise = Mth.pow(q.noise(v.x * 0.1 + 3812, v.z * 0.1 + 4598), 2.0) * 4 + q.noise(v.x * 0.5 + t.rivernoise * 0.5 + 7843, v.x * 0.5 + t.rivernoise * 0.5 + 2364) * 0.5;
    t.oceannoise = q.noise(0.05 * v.x - 1279, 0.05 * v.z - 2342) * 0.5 + 0.5;
    t.heightmap = Mth.lerp(t.rivernoise - 0.05, t.mountainnoise * 0.7 - t.oceannoise * 0.25, t.rivernoise);
});

// --- 2. VORONOI CELL NOISE (BIOME DISTRIBUTION) ---
gaia.addLogic(() => {
    t.biometyperivermin = -0.05; t.biometyperivermax = 0;
    t.biometypemountainmin = 0.95; t.biometypemountainmax = 999;
    t.biometypeplainmin = 0.1; t.biometypeplainmax = 0.7;
    t.biometypetaigamin = 0.7; t.biometypetaigamax = 0.95;
    t.biometypeoceanmin = -2.0; t.biometypeoceanmax = -0.05;
    t.biometypeswampmin = 0.01; t.biometypeswampmax = 0.1;
    t.biometypebeachmin = 0; t.biometypebeachmax = 0.01;

    t.d1 = 999; t.d2 = 999; v.c1 = 0;
    v.r = q.noise(v.originx / 16, v.originz / 16);
    v.px = v.x + v.r * 0.05 + t.rivernoise;
    v.pz = v.z + v.r * 0.05 + t.rivernoise;
    v.i = 0;

    loop(4, () => {
        v.p2x = Mth.floor(v.px) + Mth.mod(v.i, 2);
        v.p2z = Mth.floor(v.pz) + Mth.floor(v.i / 2);
        v.rx = v.p2x * 127.1 + v.p2z * 311.7;
        v.rz = v.p2z * 269.5 + v.p2x * 183.3;
        v.rx = (2 * Mth.abs(v.rx / 3.14 - 2 * Mth.floor(v.rx / 6.28) - 1.0) - 1.0) * 43758.5453123;
        v.rz = (2 * Mth.abs(v.rz / 3.14 - 2 * Mth.floor(v.rz / 6.28) - 1.0) - 1.0) * 43758.5453123;
        v.rx = (v.rx - Mth.floor(v.rx)) / 2;
        v.rz = (v.rz - Mth.floor(v.rz)) / 2;
        v.d = Mth.pow(v.p2x + v.rx - v.px, 2) + Mth.pow(v.p2z + v.rz - v.pz, 2);
        
        if (v.d < t.d1) {
            t.d2 = t.d1;
            t.d1 = v.d;
            v.c1 = v.rx;
        } else {
            if (v.d < t.d2) {
                t.d2 = v.d;
            }
        }
        v.i = v.i + 1;
    });

    t.d1 = Mth.sqrt(t.d1);
    v.dist = Mth.abs(Mth.sqrt(t.d2) - t.d1);
    v.dh = t.heightmap >= 0 ? t.heightmap + 0.005 * (2 - v.r) / (2 * v.r + 2) : t.heightmap;
});

// --- 3. NESTED BIOME SELECTION ---
gaia.addLogic(() => {
    t.biome = 'mineral_resevoir'; t.biome_id = 14;

    if (t.biometyperivermin <= v.dh && v.dh < t.biometyperivermax) {
        t.biome = 'mineral_river'; t.biome_id = 1;
    } else {
        if (t.biometypemountainmin <= v.dh && v.dh < t.biometypemountainmax) {
            v.index = Mth.floor(v.c1 * 2);
            if (v.index == 0) { t.biome = 'volcanic_lands'; t.biome_id = 2; }
            if (v.index == 1) { t.biome = 'static_wasteland'; t.biome_id = 5; }
        } else {
            if (t.biometypeplainmin <= v.dh && v.dh < t.biometypeplainmax) {
                v.index = Mth.floor(v.c1 * 6);
                if (v.index == 0) { t.biome = 'fossil_woodland'; t.biome_id = 12; }
                if (v.index == 1) { t.biome = 'goldstone_lands'; t.biome_id = 13; }
                if (v.index == 2) { t.biome = 'pink_agate_forest'; t.biome_id = 10; }
                if (v.index == 3) { t.biome = 'green_agate_jungle'; t.biome_id = 6; }
                if (v.index == 4) { t.biome = 'crystal_plains'; t.biome_id = 7; }
                if (v.index == 5) { t.biome = 'salt_dunes'; t.biome_id = 15; }
            } else {
                if (t.biometypetaigamin <= v.dh && v.dh < t.biometypetaigamax) {
                    v.index = Mth.floor(v.c1 * 3);
                    if (v.index == 0) { t.biome = 'blue_agate_taiga'; t.biome_id = 11; }
                    if (v.index == 1) { t.biome = 'shining_grove'; t.biome_id = 3; }
                    if (v.index == 2) { t.biome = 'mutant_agate_wildwood'; t.biome_id = 8; }
                } else {
                    if (t.biometypeoceanmin <= v.dh && v.dh < t.biometypeoceanmax) {
                        t.biome = 'mineral_resevoir'; t.biome_id = 14;
                    } else {
                        if (t.biometypeswampmin <= v.dh && v.dh < t.biometypeswampmax) {
                            v.index = Mth.floor(v.c1 * 3);
                            if (v.index == 0) { t.biome = 'purple_agate_swamp'; t.biome_id = 9; }
                            if (v.index == 1) { t.biome = 'smoldering_bog'; t.biome_id = 4; }
                            if (v.index == 2) { t.biome = 'salt_dunes'; t.biome_id = 15; }
                        } else {
                            if (t.biometypebeachmin <= v.dh && v.dh < t.biometypebeachmax) {
                                t.biome = 'salt_dunes'; t.biome_id = 15;
                            }
                        }
                    }
                }
            }
        }
    }
});

// --- 4. TERRAIN SHAPING ---
gaia.addLogic(() => {
    t.heightmap = t.heightmap <= 0 ? (t.heightmap > -0.05 ? -0.25 * Mth.sqrt(-t.heightmap) : -Mth.sqrt(-t.heightmap - 0.05) - 0.055901) : t.heightmap * t.heightmap * 2;
    v.noise1 = q.noise(0.01 * v.originx + 2354, 0.01 * v.originz + 3798);
    v.noise2 = q.noise(0.005 * v.originx - 1279 + v.noise1, 0.005 * v.originz - 1279 + v.noise1);
    v.dist = Mth.abs(t.d1 - t.d2);
    v.k = t.biome == 'static_wasteland' ? Mth.lerp(240, 160, v.dist) : 240;
    v.n = 50;
    t.height = t.heightmap * 40 + 90 + v.noise2 * 6 * t.heightmap;
    v.h = Mth.max(Mth.min(0.5 + (t.height - v.k) / (2 * v.n), 1), 0);
    t.height = t.height * (1 - v.h) + v.k * v.h - v.n * v.h * (1 - v.h);
    t.layer = 90 > Mth.floor(t.height) ? Mth.floor(t.height) - 90 : 0;
    
    if (t.biome == 'salt_dunes') {
        t.height = t.height + Mth.lerp(0, v.noise1 * 16, Mth.clamp(v.dist * t.heightmap * 30, 0, 1));
    }
});

// --- 5. HEIGHT OUTPUT ---
gaia.setHeight(() => t.height);

// --- 6. BIOME REGISTRATION ---
const biomes = [
    { id: 1,  name: 'mineral_river',      surface: 'salt',            dirt: 'salt_rock' },
    { id: 2,  name: 'volcanic_lands',     surface: 'charred_grass',    dirt: 'volcanic_rock' },
    { id: 3,  name: 'shining_grove',      surface: 'soft_grass',       dirt: 'light_soil' },
    { id: 4,  name: 'smoldering_bog',     surface: 'murky_grass',      dirt: 'boggy_soil' },
    { id: 5,  name: 'static_wasteland',   surface: 'wasteland_stone',  dirt: 'impure_rock' },
    { id: 6,  name: 'green_agate_jungle', surface: 'green_glitter_grass', dirt: 'heavy_soil' },
    { id: 7,  name: 'crystal_plains',     surface: 'pink_glitter_grass', dirt: 'heavy_soil' },
    { id: 8,  name: 'mutant_agate_wildwood', surface: 'orange_glitter_grass', dirt: 'heavy_soil' },
    { id: 9,  name: 'purple_agate_swamp', surface: 'purple_glitter_grass', dirt: 'heavy_soil' },
    { id: 10, name: 'pink_agate_forest',  surface: 'peach_glitter_grass', dirt: 'heavy_soil' },
    { id: 11, name: 'blue_agate_taiga',   surface: 'blue_glitter_grass', dirt: 'heavy_soil' },
    { id: 12, name: 'fossil_woodland',    surface: 'pale_green_glitter_grass', dirt: 'heavy_soil' },
    { id: 13, name: 'goldstone_lands',    surface: 'corrupt_grass',    dirt: 'corrupt_soil' },
    { id: 14, name: 'mineral_resevoir',   surface: 'salt',            dirt: 'salt_rock' },
    { id: 15, name: 'salt_dunes',         surface: 'salt',            dirt: 'salt_rock' }
];

biomes.forEach(b => {
    const biome = new Biome(b.name, b.id)
        .addLayer(`gaiadimension:gen/gaia_blocks/${b.surface}`, 1)
        .addLayer(`gaiadimension:gen/gaia_blocks/${b.dirt}`, 4)
        .addLayer('gaiadimension:gen/gaia_blocks/gaia_stone', 8)
        .addLayer(`gaiadimension:gen/gaia_blocks/bedrock_${b.name}`, 999);
    
    biome.when(() => t.biome_id == b.id);
    gaia.registerBiome(biome);
});

gaia.build();
console.log("-> Gaia Worldgen 1:1 Port Complete.");
