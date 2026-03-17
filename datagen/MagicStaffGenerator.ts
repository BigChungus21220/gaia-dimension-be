import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import { MagicStaffRegistry } from "./MagicStaffRegistry";
import { StaffCore } from "./components/StaffCore";
import { StaffHead } from "./components/StaffHead";
import { StaffRod } from "./components/StaffRod";

const RP_PATH = "resources";
const BP_PATH = "data";

const TEXTURE_SRC = path.join(RP_PATH, "textures/gaiadimension/androsa/item/magic_staff");
const TEXTURE_OUT = path.join(RP_PATH, "textures/gaiadimension/androsa/item/gen/magic_staff");
const ITEM_OUT = path.join(BP_PATH, "items/androsa/magic_staff");

const ITEM_TEXTURE_JSON = path.join(RP_PATH, "textures/item_texture.json");
const LANG_FILE = path.join(RP_PATH, "texts/en_US.lang");

class MagicStaffGenerator {
    public static async generate() {
        console.log("--- Magic Staff Generator (TypeScript) ---");
        
        await fs.ensureDir(TEXTURE_OUT);
        await fs.ensureDir(ITEM_OUT);

        // Clean up old generated items (optional but recommended)
        // await fs.emptyDir(ITEM_OUT); 

        const generatedItems: string[] = [];

        for (const rod of MagicStaffRegistry.RODS) {
            for (const core of MagicStaffRegistry.CORES) {
                for (const head of MagicStaffRegistry.HEADS) {
                    const staffId = `magic_staff_${core.id}_${head.id}_${rod.id}`;
                    await this.generateStaff(core, head, rod, staffId);
                    generatedItems.push(staffId);
                }
            }
        }

        await this.updateMetadata(generatedItems);
        console.log(`-> Successfully generated ${generatedItems.length} magic staffs.`);
    }

    private static async generateStaff(core: StaffCore, head: StaffHead, rod: StaffRod, staffId: string) {
        const texFilename = `staff_${core.id}_${head.id}_${rod.id}.png`;
        const outTexPath = path.join(TEXTURE_OUT, texFilename);

        // 1. Texture Composition (Rod -> Core -> Head)
        await sharp(path.join(TEXTURE_SRC, rod.texturePath))
            .composite([
                { input: path.join(TEXTURE_SRC, core.texturePath) },
                { input: path.join(TEXTURE_SRC, head.texturePath) }
            ])
            .toFile(outTexPath);

        // 2. Item JSON
        const itemJson = {
            "format_version": "1.21.10",
            "minecraft:item": {
                "description": {
                    "identifier": `gaiadimension:${staffId}`,
                    "menu_category": {
                        "category": "equipment"
                    }
                },
                "components": {
                    "minecraft:max_stack_size": 1,
                    "minecraft:hand_equipped": true,
                    "minecraft:icon": staffId,
                    "minecraft:display_name": {
                        "value": `item.gaiadimension:${staffId}.name`
                    }
                }
            }
        };

        // Add dynamic stats if desired (example: cooldown)
        if (rod.stats.cooldown) {
            // @ts-ignore
            itemJson["minecraft:item"].components["minecraft:cooldown"] = {
                "category": "magic_staff",
                "duration": rod.stats.cooldown
            };
        }

        await fs.writeJson(path.join(ITEM_OUT, `${staffId}.json`), itemJson, { spaces: 4 });
    }

    private static async updateMetadata(generatedItems: string[]) {
        // Update item_texture.json
        if (await fs.pathExists(ITEM_TEXTURE_JSON)) {
            const texData = await fs.readJson(ITEM_TEXTURE_JSON);
            for (const staffId of generatedItems) {
                const shortName = staffId.replace("magic_staff_", "");
                texData.texture_data[staffId] = {
                    textures: `textures/gaiadimension/androsa/item/gen/magic_staff/staff_${shortName}`
                };
            }
            await fs.writeJson(ITEM_TEXTURE_JSON, texData, { spaces: 4 });
        }

        // Update en_US.lang
        if (await fs.pathExists(LANG_FILE)) {
            let langContent = await fs.readFile(LANG_FILE, "utf-8");
            let lines = langContent.split("\n");

            // Filter out old magic staff translations
            lines = lines.filter(line => !line.includes("item.gaiadimension:magic_staff_"));

            // Append new translations
            for (const staffId of generatedItems) {
                lines.push(`item.gaiadimension:${staffId}.name=Magic Staff`);
            }

            await fs.writeFile(LANG_FILE, lines.join("\n"));
        }
    }
}

MagicStaffGenerator.generate().catch(console.error);
