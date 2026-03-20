import path from "path";
import fs from "fs-extra";
import { ITEM_REGISTRY, ItemDefinition } from "./ItemRegistry";

const ROOT = process.cwd();
const BP_PATH = path.join(ROOT, "src/main/bedrock/data");
const RP_PATH = path.join(ROOT, "src/main/bedrock/resources");

const ITEM_OUT = path.join(BP_PATH, "items/gen");
const ITEM_TEXTURE_JSON = path.join(RP_PATH, "textures/item_texture.json");
const LANG_FILE = path.join(RP_PATH, "texts/en_US.lang");

class ItemGenerator {
    public static async generate() {
        console.log("[INFO] Generating Items from Registry (Path-based Icons)...");
        
        await fs.ensureDir(ITEM_OUT);

        const itemTexture = await fs.readJson(ITEM_TEXTURE_JSON);
        let langContent = await fs.readFile(LANG_FILE, "utf-8");

        for (const item of ITEM_REGISTRY) {
            // Construct the appropriate path
            const texturePath = item.texture || `textures/gaiadimension/androsa/item/${item.id}`;
            
            // Register using the path as the key to ensure the icon component can use the path
            itemTexture.texture_data[texturePath] = {
                textures: texturePath
            };

            await this.generateItemJson(item, texturePath);

            // Update language
            const langKey = `item.gaiadimension:${item.id}.name=${item.name}`;
            if (!langContent.includes(`item.gaiadimension:${item.id}.name=`)) {
                langContent += `\n${langKey}`;
            } else {
                const regex = new RegExp(`item\\.gaiadimension:${item.id}\\.name=.*`, 'g');
                langContent = langContent.replace(regex, langKey);
            }
        }

        await fs.writeJson(ITEM_TEXTURE_JSON, itemTexture, { spaces: 4 });
        await fs.writeFile(LANG_FILE, langContent);
        console.log("[INFO] Item Generation Complete.");
    }

    private static async generateItemJson(item: ItemDefinition, texturePath: string) {
        const itemJson: any = {
            "format_version": "1.21.30",
            "minecraft:item": {
                "description": {
                    "identifier": `gaiadimension:${item.id}`,
                    "menu_category": {
                        "category": item.category
                    }
                },
                "components": {
                    "minecraft:icon": texturePath,
                    "minecraft:display_name": {
                        "value": `item.gaiadimension:${item.id}.name`
                    },
                    "minecraft:max_stack_size": item.stackSize || 64
                }
            }
        };

        await fs.writeJson(path.join(ITEM_OUT, `${item.id}.json`), itemJson, { spaces: 4 });
    }
}

ItemGenerator.generate().catch(err => {
    console.error(err);
    process.exit(1);
});
