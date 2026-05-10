import path from "path";
import fs from "fs-extra";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DATA = path.join(ROOT, 'src/main/bedrock/data');
const SRC_RESOURCES = path.join(ROOT, 'src/main/bedrock/resources');

const TEXTURE_GEN_DIR = path.join(SRC_RESOURCES, 'textures/gaiadimension/gen/gaia_grass');
const BLOCK_OUT = path.join(SRC_DATA, 'blocks/gen/gaia_grass');

const DATAGEN_RES = path.join(ROOT, 'src/main/bedrock/datagen/resources/gaia_grass');

// ══════════════════════════════════════════════════
//  GRASS DEFINITIONS — Named by BIOME, 1:1 Java parity
//  Java uses BiomeColors.getAverageGrassColor() tintindex at runtime.
//  Bedrock has no tintindex — we pre-compose each biome's variant at build time.
//  grassColorOverride values extracted from GaiaBiomeMaker.java createAmbience() calls.
// ══════════════════════════════════════════════════

interface GaiaGrass {
    /** Block identifier suffix → gaiadimension:{id} */
    id: string;
    /** Display name */
    name: string;
    /** Soil block for the bottom/side base */
    soil: string;
    /** Source overlay basename (e.g. "glitter_grass") — null for pre-colored */
    overlay: string | null;
    /** Hex tint color — null for pre-colored grasses */
    tint: string | null;
    /** Map color for the block */
    mapColor: string;
    /** Source texture basename for pre-colored grasses (e.g. "corrupted_grass") */
    srcBase?: string;
}

// ── GLITTER GRASS — one per biome that uses glitter_grass surface ──
// From GaiaSurfaceRuleData.java: default surface = GLITTER_GRASS
// Each biome tints it via its grassColorOverride (1st param of createAmbience)
const GLITTER_VARIANTS: GaiaGrass[] = [
    // pink_agate_forest: createAmbience(15901620, 13016408, 15381216) → 15901620 = #F2A3B4
    { id: "pink_agate_forest_glitter_grass",       name: "Pink Agate Forest Grass",       soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#F2A3B4", mapColor: "#F2A3B4" },
    // crystal_plains: createAmbience(15901620, 13016408, 15381216) → same tint
    { id: "crystal_plains_glitter_grass",           name: "Crystal Plains Grass",           soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#F2A3B4", mapColor: "#F2A3B4" },
    // blue_agate_taiga: createAmbience(6851272, 9815527, 15381216) → 6851272 = #688AC8
    { id: "blue_agate_taiga_glitter_grass",         name: "Blue Agate Taiga Grass",         soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#688AC8", mapColor: "#688AC8" },
    // green_agate_jungle: createAmbience(4961870, 8437662, 15381216) → 4961870 = #4BB64E
    { id: "green_agate_jungle_glitter_grass",       name: "Green Agate Jungle Grass",       soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#4BB64E", mapColor: "#4BB64E" },
    // purple_agate_swamp: createAmbience(8417209, 11234801, 15381216) → 8417209 = #806FB9
    { id: "purple_agate_swamp_glitter_grass",       name: "Purple Agate Swamp Grass",       soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#806FB9", mapColor: "#806FB9" },
    // fossil_woodland: createAmbience(12298105, 13016408, 15381216) → 12298105 = #BBA779
    { id: "fossil_woodland_glitter_grass",          name: "Fossil Woodland Grass",          soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#BBA779", mapColor: "#BBA779" },
    // mutant_agate_wildwood: createAmbience(13948848, 15833793, 15381216) → 13948848 = #D4D7B0
    { id: "mutant_agate_wildwood_glitter_grass",    name: "Mutant Agate Wildwood Grass",    soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#D4D7B0", mapColor: "#D4D7B0" },
    // mookaite_mesa: createAmbience(14646073, 16165141, 12793637) → 14646073 = #DF7B39
    { id: "mookaite_mesa_glitter_grass",            name: "Mookaite Mesa Grass",            soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#DF7B39", mapColor: "#DF7B39" },
];

// ── SPECIAL GRASSES — biomes with unique grass blocks (not glitter_grass) ──
// From GaiaSurfaceRuleData.java: goldstone→CORRUPT, bog→MURKY, grove→SOFT, golden→GILDED
const OTHER_GRASSES: GaiaGrass[] = [
    // smoldering_bog: createAmbience(2500135, 1118482, 3287859, 8284598) → grass=2500135=#262627
    { id: "smoldering_bog_murky_grass",    name: "Smoldering Bog Murky Grass",    soil: "gaiadimension:boggy_soil",     overlay: "murky_grass",  tint: "#262627", mapColor: "#262627" },
    // shining_grove: createAmbience(7982765, 14546943, 15004627, 16764489) → grass=7982765=#79CEAD
    { id: "shining_grove_soft_grass",      name: "Shining Grove Soft Grass",      soil: "gaiadimension:light_soil",     overlay: "soft_grass",   tint: "#79CEAD", mapColor: "#79CEAD" },
    // goldstone_lands: createAmbience(2302755, 2236962, 12352044) → pre-colored corrupted texture
    { id: "goldstone_lands_corrupted_grass", name: "Goldstone Corrupted Grass",   soil: "gaiadimension:corrupted_soil", overlay: null,           tint: null,      mapColor: "#232323", srcBase: "corrupted_grass" },
    // golden biomes: createAmbience(4997150, 3415307, 13801728) → pre-colored gilded texture
    { id: "golden_forest_gilded_grass",    name: "Golden Forest Gilded Grass",    soil: "gaiadimension:aurum_soil",     overlay: null,           tint: null,      mapColor: "#4C401E", srcBase: "gilded_grass" },
    { id: "golden_hills_gilded_grass",     name: "Golden Hills Gilded Grass",     soil: "gaiadimension:aurum_soil",     overlay: null,           tint: null,      mapColor: "#4C401E", srcBase: "gilded_grass" },
    { id: "golden_plains_gilded_grass",    name: "Golden Plains Gilded Grass",    soil: "gaiadimension:aurum_soil",     overlay: null,           tint: null,      mapColor: "#4C401E", srcBase: "gilded_grass" },
    { id: "golden_marsh_gilded_grass",     name: "Golden Marsh Gilded Grass",     soil: "gaiadimension:aurum_soil",     overlay: null,           tint: null,      mapColor: "#4C401E", srcBase: "gilded_grass" },
];

const ALL_GRASSES: GaiaGrass[] = [...GLITTER_VARIANTS, ...OTHER_GRASSES];


export class GaiaGrassGenerator {

    /**
     * Manually tint an RGBA buffer: multiply RGB by tint color, PRESERVE alpha.
     * sharp's multiply blend destroys alpha — this does it correctly.
     */
    private static tintBuffer(raw: Buffer, tintHex: string): Buffer {
        const tr = parseInt(tintHex.slice(1, 3), 16) / 255;
        const tg = parseInt(tintHex.slice(3, 5), 16) / 255;
        const tb = parseInt(tintHex.slice(5, 7), 16) / 255;
        const out = Buffer.from(raw); // clone
        for (let i = 0; i < out.length; i += 4) {
            out[i]     = Math.round(out[i]     * tr); // R
            out[i + 1] = Math.round(out[i + 1] * tg); // G
            out[i + 2] = Math.round(out[i + 2] * tb); // B
            // out[i + 3] unchanged — preserve alpha
        }
        return out;
    }

    public static async generate() {
        console.log("[INFO] Initializing Gaia Grass Registry...");

        // Clean old generated files to prevent stale variants
        await fs.emptyDir(TEXTURE_GEN_DIR);
        await fs.emptyDir(BLOCK_OUT);

        const terrainTexturePath = path.join(SRC_RESOURCES, 'textures/terrain_texture.json');
        const blocksJsonPath = path.join(SRC_RESOURCES, 'blocks.json');
        const langPath = path.join(SRC_RESOURCES, 'texts/en_US.lang');

        const terrainTexture = await fs.readJson(terrainTexturePath);
        const blocksJson = await fs.readJson(blocksJsonPath);
        let langContent = await fs.readFile(langPath, 'utf-8');

        for (const grass of ALL_GRASSES) {
            const blockId = `gaiadimension:${grass.id}`;
            const texName = `gaia_${grass.id}`;

            const topOut = path.join(TEXTURE_GEN_DIR, `${texName}_top.png`);
            const sideOut = path.join(TEXTURE_GEN_DIR, `${texName}_side.png`);

            if (grass.overlay && grass.tint) {
                // ── TINTED GRASS ──
                // Step 1: tint the overlay pixels (RGB × color, alpha preserved)
                // Step 2: composite tinted overlay OVER untinted soil
                const overlayTopPath = path.join(DATAGEN_RES, `${grass.overlay}_top.png`);
                const overlaySidePath = path.join(DATAGEN_RES, `${grass.overlay}_overlay.png`);
                const soilBasePath = path.join(DATAGEN_RES, `${grass.soil.replace('gaiadimension:', '')}.png`);

                // ── TOP: tint the grayscale top overlay ──
                const topImg = sharp(overlayTopPath).ensureAlpha();
                const topMeta = await topImg.metadata();
                const tw = topMeta.width || 16, th = topMeta.height || 16;
                const topRaw = await topImg.raw().toBuffer();
                const tintedTop = this.tintBuffer(topRaw, grass.tint);
                await sharp(tintedTop, { raw: { width: tw, height: th, channels: 4 } })
                    .toFile(topOut);

                // ── SIDE: tint ONLY the overlay fringe, then composite over soil ──
                const sideOverlay = sharp(overlaySidePath).ensureAlpha();
                const sideMeta = await sideOverlay.metadata();
                const sw = sideMeta.width || 16, sh = sideMeta.height || 16;
                const sideRaw = await sideOverlay.raw().toBuffer();
                const tintedFringe = this.tintBuffer(sideRaw, grass.tint);

                // Soil base — resize to match overlay, fully opaque
                const soilBuf = await sharp(soilBasePath).resize(sw, sh).ensureAlpha().raw().toBuffer();

                // Manual alpha composite: soil underneath, tinted fringe on top
                const composed = Buffer.alloc(sw * sh * 4);
                for (let i = 0; i < composed.length; i += 4) {
                    const fa = tintedFringe[i + 3] / 255; // fringe alpha
                    const ba = 1.0; // soil is fully opaque
                    composed[i]     = Math.round(tintedFringe[i]     * fa + soilBuf[i]     * (1 - fa));
                    composed[i + 1] = Math.round(tintedFringe[i + 1] * fa + soilBuf[i + 1] * (1 - fa));
                    composed[i + 2] = Math.round(tintedFringe[i + 2] * fa + soilBuf[i + 2] * (1 - fa));
                    composed[i + 3] = 255; // final is opaque
                }
                await sharp(composed, { raw: { width: sw, height: sh, channels: 4 } })
                    .toFile(sideOut);

            } else {
                // ── PRE-COLORED GRASS (copy directly from Java textures) ──
                // srcBase maps biome-named IDs back to the actual source texture name
                const base = grass.srcBase ?? grass.id;
                const srcTop = path.join(DATAGEN_RES, `${base}_top.png`);
                const srcSide = path.join(DATAGEN_RES, `${base}_side.png`);

                if (await fs.pathExists(srcTop)) await fs.copy(srcTop, topOut);
                else console.warn(`[WARN] Missing source texture: ${srcTop}`);
                if (await fs.pathExists(srcSide)) await fs.copy(srcSide, sideOut);
                else console.warn(`[WARN] Missing source texture: ${srcSide}`);
            }

            // 3. Block JSON — matches vanilla_grass format EXACTLY
            const blockJson = {
                format_version: "1.21.70",
                "minecraft:block": {
                    description: {
                        identifier: blockId,
                        states: { "gaiadimension:perm_dim": [0, 1, 2] }
                    },
                    components: {
                        "tag:is_shovelable": {}, "tag:dirt": {},
                        "minecraft:destructible_by_mining": { seconds_to_destroy: 1 },
                        "minecraft:destructible_by_explosion": { explosion_resistance: 1 },
                        "minecraft:light_emission": 0,
                        "minecraft:map_color": grass.mapColor,
                        "minecraft:geometry": "minecraft:geometry.full_block",
                        "minecraft:material_instances": {
                            "*":    { texture: `${texName}_side`, render_method: "opaque" },
                            "up":   { texture: `${texName}_top`,  render_method: "opaque" },
                            "down": { texture: grass.soil, render_method: "opaque" }
                        },
                        "minecraft:light_dampening": 0
                    },
                    permutations: [
                        { condition: "q.block_state('gaiadimension:perm_dim') == 1", components: { "minecraft:light_emission": 5 } },
                        { condition: "q.block_state('gaiadimension:perm_dim') == 2", components: { "minecraft:light_emission": 5 } }
                    ]
                }
            };

            await fs.writeJson(path.join(BLOCK_OUT, `${grass.id}.json`), blockJson, { spaces: 4 });

            // 4. Terrain texture entries — NO gaiadimension: prefix, matches vanilla grass format
            terrainTexture.texture_data[`${texName}_top`] = {
                textures: `textures/gaiadimension/gen/gaia_grass/${texName}_top`
            };
            terrainTexture.texture_data[`${texName}_side`] = {
                textures: `textures/gaiadimension/gen/gaia_grass/${texName}_side`
            };

            // 5. blocks.json
            blocksJson[blockId] = { sound: "grass" };

            // 6. Lang
            const langKey = `tile.${blockId}.name=${grass.name}`;
            if (!langContent.includes(langKey)) langContent += `\n${langKey}`;
        }

        await fs.writeJson(terrainTexturePath, terrainTexture, { spaces: 4 });
        await fs.writeJson(blocksJsonPath, blocksJson, { spaces: 4 });
        await fs.writeFile(langPath, langContent);

        console.log(`[INFO] Gaia Grass Generation Complete. Generated ${ALL_GRASSES.length} grass blocks.`);
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    GaiaGrassGenerator.generate().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
