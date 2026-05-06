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
//  GRASS DEFINITIONS
//  Java uses BiomeColors.getAverageGrassColor() tintindex at runtime.
//  Bedrock has no tintindex — we pre-compose each variant at build time.
// ══════════════════════════════════════════════════

interface GaiaGrass {
    /** Block identifier suffix, e.g. "pink_glitter_grass" → gaiadimension:pink_glitter_grass */
    id: string;
    /** Display name */
    name: string;
    /** Soil texture key for the bottom face */
    soil: string;
    /** Source overlay basename (e.g. "glitter_grass") — null for pre-colored */
    overlay: string | null;
    /** Hex tint color — null for pre-colored grasses */
    tint: string | null;
    /** Map color for the block */
    mapColor: string;
}

// Glitter grass variants — 1:1 Java grassColorOverride per biome
// Java: createAmbience(grassColor, sky, fog) → grassColorOverride tints glitter_grass
const GLITTER_VARIANTS: GaiaGrass[] = [
    // pink_agate_forest / crystal_plains / salt_dunes / mookaite_mesa: grassColor = 15901620 = #F2A3B4
    { id: "pink_glitter_grass",       name: "Pink Glitter Grass",       soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#F2A3B4", mapColor: "#F2A3B4" },
    // blue_agate_taiga: grassColor = 6851272 = #6895C8
    { id: "blue_glitter_grass",       name: "Blue Glitter Grass",       soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#6895C8", mapColor: "#6895C8" },
    // green_agate_jungle: grassColor = 4961870 = #4BC24E
    { id: "green_glitter_grass",      name: "Green Glitter Grass",      soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#4BC24E", mapColor: "#4BC24E" },
    // purple_agate_swamp: grassColor = 8417209 = #807BB9
    { id: "purple_glitter_grass",     name: "Purple Glitter Grass",     soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#807BB9", mapColor: "#807BB9" },
    // fossil_woodland: grassColor = 12298105 = #BBB379
    { id: "fossil_glitter_grass",     name: "Fossil Glitter Grass",     soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#BBB379", mapColor: "#BBB379" },
    // mutant_agate_wildwood: grassColor = 13948848 = #D4D3B0
    { id: "mutant_glitter_grass",     name: "Mutant Glitter Grass",     soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#D4D3B0", mapColor: "#D4D3B0" },
    // volcanic_lands: grassColor = 2302755 = #232323
    { id: "volcanic_glitter_grass",   name: "Volcanic Glitter Grass",   soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#232323", mapColor: "#232323" },
    // static_wasteland: grassColor = 2837910 = #2B4F96 (but uses wasteland_stone surface, not glitter_grass — kept for completeness)
    { id: "static_glitter_grass",     name: "Static Glitter Grass",     soil: "gaiadimension:heavy_soil",  overlay: "glitter_grass", tint: "#2B4F96", mapColor: "#2B4F96" },
];

// Other grass types — tints from Java biome grassColorOverride
const OTHER_GRASSES: GaiaGrass[] = [
    // smoldering_bog: createAmbience(2500135, 1118482, 3287859, 8284598) → grass=2500135=#262627, foliage=1118482
    { id: "murky_grass",     name: "Murky Grass",     soil: "gaiadimension:boggy_soil",      overlay: "murky_grass",     tint: "#262627", mapColor: "#262627" },
    // shining_grove: createAmbience(7982765, 14546943, 15004627, 16764489) → grass=7982765=#79C2AD
    { id: "soft_grass",      name: "Soft Grass",      soil: "gaiadimension:light_soil",      overlay: "soft_grass",      tint: "#79C2AD", mapColor: "#79C2AD" },
    // goldstone_lands: pre-colored texture
    { id: "corrupted_grass", name: "Corrupted Grass",  soil: "gaiadimension:corrupted_soil",  overlay: null,              tint: null,      mapColor: "#232040" },
    // golden biomes: pre-colored texture
    { id: "gilded_grass",    name: "Gilded Grass",     soil: "gaiadimension:aurum_soil",      overlay: null,              tint: null,      mapColor: "#4C5B0B" },
];

// Generic alias — "glitter_grass" defaults to the pink variant (Java's default grassColor for most biomes)
const ALIASES: GaiaGrass[] = [
    { id: "glitter_grass", name: "Glitter Grass", soil: "gaiadimension:heavy_soil", overlay: "glitter_grass", tint: "#F2A3B4", mapColor: "#F2A3B4" },
];

const ALL_GRASSES: GaiaGrass[] = [...GLITTER_VARIANTS, ...OTHER_GRASSES, ...ALIASES];

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
                const srcTop = path.join(DATAGEN_RES, `${grass.id}_top.png`);
                const srcSide = path.join(DATAGEN_RES, `${grass.id}_side.png`);

                if (await fs.pathExists(srcTop)) await fs.copy(srcTop, topOut);
                if (await fs.pathExists(srcSide)) await fs.copy(srcSide, sideOut);
            }

            // 3. Block JSON — matches existing format exactly
            const blockJson = {
                format_version: "1.21.70",
                "minecraft:block": {
                    description: {
                        identifier: blockId,
                        menu_category: { category: "nature" },
                        states: { "gaiadimension:perm_dim": [0, 1, 2] }
                    },
                    components: {
                        "tag:is_shovelable": {}, "tag:dirt": {},
                        "minecraft:destructible_by_mining": { seconds_to_destroy: 1 },
                        "minecraft:destructible_by_explosion": { explosion_resistance: 1 },
                        "minecraft:light_emission": 15,
                        "minecraft:map_color": grass.mapColor,
                        "minecraft:geometry": "minecraft:geometry.full_block",
                        "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 16, 16] },
                        "minecraft:collision_box": { origin: [-8, 0, -8], size: [16, 16, 16] },
                        "minecraft:material_instances": {
                            "up":    { texture: `gaiadimension:${texName}_top`,  render_method: "opaque" },
                            "down":  { texture: grass.soil,                      render_method: "opaque" },
                            "north": { texture: `gaiadimension:${texName}_side`, render_method: "opaque" },
                            "south": { texture: `gaiadimension:${texName}_side`, render_method: "opaque" },
                            "east":  { texture: `gaiadimension:${texName}_side`, render_method: "opaque" },
                            "west":  { texture: `gaiadimension:${texName}_side`, render_method: "opaque" }
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

            // 4. Terrain texture entries
            terrainTexture.texture_data[`gaiadimension:${texName}_top`] = {
                textures: `textures/gaiadimension/gen/gaia_grass/${texName}_top`
            };
            terrainTexture.texture_data[`gaiadimension:${texName}_side`] = {
                textures: `textures/gaiadimension/gen/gaia_grass/${texName}_side`
            };

            // 5. blocks.json
            blocksJson[blockId] = { sound: "grass" };

            // 6. Lang
            const langKey = `tile.${blockId}.name=${grass.name}`;
            if (!langContent.includes(langKey)) langContent += `\n${langKey}`;
        }

        // Also register the glitter_grass identifier as an alias for the default pink variant
        // so that worldgen using "gaiadimension:glitter_grass" still works
        const defaultGlitter = "gaiadimension:pink_glitter_grass";
        if (!blocksJson["gaiadimension:glitter_grass"]) {
            // The block JSON for glitter_grass will point to the pink variant textures
            const aliasJson = {
                format_version: "1.21.70",
                "minecraft:block": {
                    description: {
                        identifier: "gaiadimension:glitter_grass",
                        menu_category: { category: "nature" },
                        states: { "gaiadimension:perm_dim": [0, 1, 2] }
                    },
                    components: {
                        "tag:is_shovelable": {}, "tag:dirt": {},
                        "minecraft:destructible_by_mining": { seconds_to_destroy: 1 },
                        "minecraft:destructible_by_explosion": { explosion_resistance: 1 },
                        "minecraft:light_emission": 15,
                        "minecraft:map_color": "#F2A3B4",
                        "minecraft:geometry": "minecraft:geometry.full_block",
                        "minecraft:selection_box": { origin: [-8, 0, -8], size: [16, 16, 16] },
                        "minecraft:collision_box": { origin: [-8, 0, -8], size: [16, 16, 16] },
                        "minecraft:material_instances": {
                            "up":    { texture: "gaiadimension:gaia_pink_glitter_grass_top",  render_method: "opaque" },
                            "down":  { texture: "gaiadimension:heavy_soil",                   render_method: "opaque" },
                            "north": { texture: "gaiadimension:gaia_pink_glitter_grass_side", render_method: "opaque" },
                            "south": { texture: "gaiadimension:gaia_pink_glitter_grass_side", render_method: "opaque" },
                            "east":  { texture: "gaiadimension:gaia_pink_glitter_grass_side", render_method: "opaque" },
                            "west":  { texture: "gaiadimension:gaia_pink_glitter_grass_side", render_method: "opaque" }
                        },
                        "minecraft:light_dampening": 0
                    },
                    permutations: [
                        { condition: "q.block_state('gaiadimension:perm_dim') == 1", components: { "minecraft:light_emission": 5 } },
                        { condition: "q.block_state('gaiadimension:perm_dim') == 2", components: { "minecraft:light_emission": 5 } }
                    ]
                }
            };
            await fs.writeJson(path.join(BLOCK_OUT, `glitter_grass.json`), aliasJson, { spaces: 4 });
            blocksJson["gaiadimension:glitter_grass"] = { sound: "grass" };
            const aliasLang = `tile.gaiadimension:glitter_grass.name=Glitter Grass`;
            if (!langContent.includes(aliasLang)) langContent += `\n${aliasLang}`;
        }

        await fs.writeJson(terrainTexturePath, terrainTexture, { spaces: 4 });
        await fs.writeJson(blocksJsonPath, blocksJson, { spaces: 4 });
        await fs.writeFile(langPath, langContent);

        console.log(`[INFO] Gaia Grass Generation Complete. Generated ${ALL_GRASSES.length + 1} grass blocks.`);
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    GaiaGrassGenerator.generate().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
