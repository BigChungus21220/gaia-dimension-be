import path from "path";
import fs from "fs-extra";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DATA = path.join(ROOT, 'src/main/bedrock/data');
const SRC_RESOURCES = path.join(ROOT, 'src/main/bedrock/resources');

const TEXTURE_GEN_DIR = path.join(SRC_RESOURCES, 'textures/gaiadimension/gen/grass');
const BLOCK_OUT = path.join(SRC_DATA, 'blocks/gen/grass');

const VANILLA_DIR = path.join(SRC_RESOURCES, 'textures/vanilla');
const BASE_TOP = path.join(VANILLA_DIR, 'grass_top.png');
const BASE_SIDE_OVERLAY = path.join(VANILLA_DIR, 'grass_side_overlay.png');
const BASE_DIRT_SIDE = path.join(VANILLA_DIR, 'vanilla_dirt_base.png');

interface BiomeColor {
    id: string;
    color: string; // Hex color
}

const VANILLA_GRASS_BIOMES: BiomeColor[] = [
    { id: "the_void", color: "#8eb971" },
    { id: "plains", color: "#91bd59" },
    { id: "beach", color: "#91bd59" },
    { id: "lush_caves", color: "#b9b75b" },
    { id: "dripstone_caves", color: "#8bd58a" },
    { id: "snowy_plains", color: "#80b497" },
    { id: "desert", color: "#bfb755" },
    { id: "badlands", color: "#90814d" },
    { id: "mesa", color: "#90814d" },
    { id: "savanna", color: "#bfb755" },
    { id: "savanna_plateau", color: "#bfb755" },
    { id: "windswept_savanna", color: "#bfb755" },
    { id: "swamp", color: "#6a7039" },
    { id: "mangrove_swamp", color: "#6a7039" },
    { id: "forest", color: "#79c05a" },
    { id: "flower_forest", color: "#79c05a" },
    { id: "dark_forest", color: "#507a32" },
    { id: "birch_forest", color: "#88bb67" },
    { id: "taiga", color: "#86b783" },
    { id: "old_growth_spruce_taiga", color: "#86b783" },
    { id: "old_growth_pine_taiga", color: "#86b87f" },
    { id: "cold_taiga", color: "#82be71" },
    { id: "windswept_hills", color: "#8ab689" },
    { id: "jungle", color: "#59c93c" },
    { id: "sparse_jungle", color: "#64c73f" },
    { id: "meadow", color: "#83bb6d" },
    { id: "cherry_grove", color: "#b6db61" },
    { id: "stony_peaks", color: "#9abe4b" },
    { id: "snowy_beach", color: "#83b593" },
    { id: "mushroom_fields", color: "#55c93f" },
    { id: "deep_dark", color: "#91bd59" },
    { id: "river", color: "#8eb971" },
    { id: "ocean", color: "#8eb971" },
    { id: "grove", color: "#80b497" },
    { id: "snowy_slopes", color: "#80b497" },
    { id: "frozen_peaks", color: "#80b497" },
    { id: "jagged_peaks", color: "#80b497" }
];

export class GrassGenerator {
    private static createColorBuffer(hex: string, width: number, height: number): Buffer {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const buffer = Buffer.alloc(width * height * 4);
        for (let i = 0; i < buffer.length; i += 4) {
            buffer[i] = r; buffer[i+1] = g; buffer[i+2] = b; buffer[i+3] = 255;
        }
        return buffer;
    }

    public static async generate() {
        console.log("[INFO] Initializing Clean Vanilla Grass Registry...");
        
        await fs.ensureDir(TEXTURE_GEN_DIR);
        await fs.ensureDir(BLOCK_OUT);

        const terrainTexturePath = path.join(SRC_RESOURCES, 'textures/terrain_texture.json');
        const blocksJsonPath = path.join(SRC_RESOURCES, 'blocks.json');
        const langPath = path.join(SRC_RESOURCES, 'texts/en_US.lang');

        const terrainTexture = await fs.readJson(terrainTexturePath);
        const blocksJson = await fs.readJson(blocksJsonPath);
        const langContent = await fs.readFile(langPath, 'utf-8');
        let newLangContent = langContent;

        terrainTexture.texture_data["dirt"] = { textures: "textures/vanilla/dirt" };

        for (const biome of VANILLA_GRASS_BIOMES) {
            const blockId = `gaiadimension:vanilla_grass_${biome.id}`;
            const textureName = `grass_vanilla_${biome.id}`;
            
            const topOut = path.join(TEXTURE_GEN_DIR, `${textureName}_top.png`);
            const sideOut = path.join(TEXTURE_GEN_DIR, `${textureName}_side.png`);

            const colorOverlay = this.createColorBuffer(biome.color, 16, 16);
            const rawMeta = { raw: { width: 16, height: 16, channels: 4 } };

            // 1. Top
            await sharp(BASE_TOP)
                .composite([{ input: colorOverlay, ...rawMeta, blend: 'multiply' }])
                .toFile(topOut);

            // 2. Side
            const tintedSideOverlay = await sharp(BASE_SIDE_OVERLAY)
                .composite([{ input: colorOverlay, ...rawMeta, blend: 'multiply' }])
                .toBuffer();

            await sharp(BASE_DIRT_SIDE)
                .composite([{ input: tintedSideOverlay, blend: 'over' }])
                .toFile(sideOut);

            // 3. Block JSON (Hidden from Creative)
            const blockJson = {
                format_version: "1.21.70",
                "minecraft:block": {
                    description: {
                        identifier: blockId,
                        // REMOVED menu_category to hide from creative inventory
                        states: { "gaiadimension:perm_dim": [0, 1, 2] }
                    },
                    components: {
                        "tag:is_shovelable": {},
                        "tag:dirt": {},
                        "minecraft:destructible_by_mining": { seconds_to_destroy: 1 },
                        "minecraft:destructible_by_explosion": { explosion_resistance: 1 },
                        "minecraft:light_emission": 0,
                        "minecraft:map_color": biome.color,
                        "minecraft:geometry": "minecraft:geometry.full_block",
                        "minecraft:material_instances": {
                            "*": { texture: `${textureName}_side`, render_method: "opaque" },
                            "up": { texture: `${textureName}_top`, render_method: "opaque" },
                            "down": { texture: "dirt", render_method: "opaque" }
                        },
                        "minecraft:light_dampening": 0
                    },
                    "permutations": [
                        { "condition": "q.block_state('gaiadimension:perm_dim') == 1", "components": { "minecraft:light_emission": 5 } },
                        { "condition": "q.block_state('gaiadimension:perm_dim') == 2", "components": { "minecraft:light_emission": 5 } }
                    ]
                }
            };
            await fs.writeJson(path.join(BLOCK_OUT, `vanilla_grass_${biome.id}.json`), blockJson, { spaces: 4 });

            terrainTexture.texture_data[`${textureName}_top`] = { textures: `textures/gaiadimension/gen/grass/${textureName}_top` };
            terrainTexture.texture_data[`${textureName}_side`] = { textures: `textures/gaiadimension/gen/grass/${textureName}_side` };
            blocksJson[blockId] = { sound: "grass" };

            const langKey = `tile.${blockId}.name=Grass`;
            if (!newLangContent.includes(langKey)) newLangContent += `\n${langKey}`;
        }

        await fs.writeJson(terrainTexturePath, terrainTexture, { spaces: 4 });
        await fs.writeJson(blocksJsonPath, blocksJson, { spaces: 4 });
        await fs.writeFile(langPath, newLangContent);
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    GrassGenerator.generate().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
