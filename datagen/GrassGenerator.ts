import path from "path";
import fs from "fs-extra";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_DATA = path.join(ROOT, 'src/main/bedrock/data');
const SRC_RESOURCES = path.join(ROOT, 'src/main/bedrock/resources');

const TEXTURE_OUT = path.join(SRC_RESOURCES, 'textures/gaiadimension/gen/grass');
const ITEM_OUT = path.join(SRC_DATA, 'items/gen/grass');
const BLOCK_OUT = path.join(SRC_DATA, 'blocks/gen/grass');

const BASE_TOP = path.join(SRC_RESOURCES, 'textures/vanilla/grass_top.png');
const BASE_SIDE = path.join(SRC_RESOURCES, 'textures/vanilla/grass_side_carried.png');

interface BiomeColor {
    id: string;
    name: string;
    color: string; // Hex color
}

const VANILLA_GRASS_BIOMES: BiomeColor[] = [
    { id: "plains", name: "Grass", color: "#91bd59" },
    { id: "forest", name: "Grass", color: "#79c05a" },
    { id: "jungle", name: "Grass", color: "#59c93c" },
    { id: "swamp", name: "Grass", color: "#6a7039" },
    { id: "desert", name: "Grass", color: "#be9442" },
    { id: "mesa", name: "Grass", color: "#90814d" },
    { id: "taiga", name: "Grass", color: "#86b783" },
    { id: "cold_taiga", name: "Grass", color: "#82be71" }
];

export class GrassGenerator {
    public static async generate() {
        console.log("[INFO] Initializing Vanilla Grass Registry...");
        
        await fs.ensureDir(TEXTURE_OUT);
        await fs.ensureDir(BLOCK_OUT);

        const terrainTexturePath = path.join(SRC_RESOURCES, 'textures/terrain_texture.json');
        const blocksJsonPath = path.join(SRC_RESOURCES, 'blocks.json');
        const langPath = path.join(SRC_RESOURCES, 'texts/en_US.lang');

        const terrainTexture = await fs.readJson(terrainTexturePath);
        const blocksJson = await fs.readJson(blocksJsonPath);
        const langContent = await fs.readFile(langPath, 'utf-8');
        let newLangContent = langContent;

        for (const biome of VANILLA_GRASS_BIOMES) {
            const blockId = `gaiadimension:vanilla_grass_${biome.id}`;
            const textureName = `grass_vanilla_${biome.id}`;
            
            // 1. Generate Tinted Textures
            const topOut = path.join(TEXTURE_OUT, `${textureName}_top.png`);
            const sideOut = path.join(TEXTURE_OUT, `${textureName}_side.png`);

            // Apply tint to top
            await sharp(BASE_TOP)
                .tint(biome.color)
                .toFile(topOut);

            // Apply tint to side (This is tricky because only the top part should be tinted in vanilla, 
            // but for "fake" grass blocks we can tint the whole top-side carried texture or just use a full tinted block)
            // For simplicity and matching the request "fake grass blocks", we tint the whole carried texture.
            await sharp(BASE_SIDE)
                .tint(biome.color)
                .toFile(sideOut);

            // 2. Generate Block JSON
            const blockJson = {
                format_version: "1.21.30",
                "minecraft:block": {
                    description: {
                        identifier: blockId,
                        menu_category: { category: "nature", group: "itemGroup.name.grass" }
                    },
                    components: {
                        "minecraft:destructible_by_mining": { seconds_to_destroy: 0.6 },
                        "minecraft:destructible_by_explosion": { explosion_resistance: 0.5 },
                        "minecraft:friction": 0.6,
                        "minecraft:map_color": biome.color,
                        "minecraft:material_instances": {
                            "*": { texture: `${textureName}_side`, render_method: "opaque" },
                            "up": { texture: `${textureName}_top`, render_method: "opaque" },
                            "down": { texture: "dirt", render_method: "opaque" }
                        }
                    }
                }
            };
            await fs.writeJson(path.join(BLOCK_OUT, `vanilla_grass_${biome.id}.json`), blockJson, { spaces: 4 });

            // 3. Update Resource Pack Registries
            terrainTexture.texture_data[`${textureName}_top`] = { textures: `textures/gaiadimension/gen/grass/${textureName}_top` };
            terrainTexture.texture_data[`${textureName}_side`] = { textures: `textures/gaiadimension/gen/grass/${textureName}_side` };
            
            blocksJson[blockId] = {
                sound: "grass"
            };

            // 4. Update Language
            const langKey = `tile.${blockId}.name=Grass`;
            if (!newLangContent.includes(langKey)) {
                newLangContent += `\n${langKey}`;
            }
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
