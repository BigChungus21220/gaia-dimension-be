import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import { MagicStaffRegistry } from "./MagicStaffRegistry";
import { StaffCore } from "./components/StaffCore";
import { StaffHead } from "./components/StaffHead";
import { StaffRod } from "./components/StaffRod";

const RP_PATH = "src/main/bedrock/resources";
const BP_PATH = "src/main/bedrock/data";
const DATAGEN_RES = "src/main/bedrock/datagen/resources/magic_staff";

const TEXTURE_SRC = DATAGEN_RES;
const TEXTURE_OUT = path.join(RP_PATH, "textures/gaiadimension/androsa/item/gen/magic_staff");
const ITEM_OUT = path.join(BP_PATH, "items/androsa/magic_staff");

const ITEM_TEXTURE_JSON = path.join(RP_PATH, "textures/item_texture.json");
const LANG_FILE = path.join(RP_PATH, "texts/en_US.lang");

class MagicStaffGenerator {
    private static readonly ELEMENT_LORE: Record<string, string> = {
        "physical": "Physical", "fire": "Fire", "electric": "Electric",
        "poison": "Poison", "frost": "Frost", "magic": "Magic", "energy": "Energy"
    };

    private static readonly BEHAVIOR_LORE: Record<string, string> = {
        "basic": "Basic", "scatter": "Scatter", "ricochet": "Ricochet",
        "blast": "Blast", "linger": "Linger", "burst": "Burst"
    };

    private static readonly STAT_LORE: Record<string, string> = {
        "standard": "Standard", "power": "Power", "speed": "Speed",
        "recharge": "Recharge", "force": "Force", "sustain": "Sustain"
    };

    public static async generate() {
        console.log("[INFO] Initializing Magic Staff Registry with Standard Keys...");
        
        await fs.ensureDir(TEXTURE_OUT);
        await fs.ensureDir(ITEM_OUT);

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
    }

    private static async generateStaff(core: StaffCore, head: StaffHead, rod: StaffRod, staffId: string) {
        const texFilename = `staff_${core.id}_${head.id}_${rod.id}.png`;
        const outTexPath = path.join(TEXTURE_OUT, texFilename);

        await sharp(path.join(TEXTURE_SRC, rod.texturePath))
            .composite([
                { input: path.join(TEXTURE_SRC, core.texturePath) },
                { input: path.join(TEXTURE_SRC, head.texturePath) }
            ])
            .toFile(outTexPath);

        const element = this.ELEMENT_LORE[core.id] || "Unknown";
        const behavior = this.BEHAVIOR_LORE[head.id] || "Unknown";
        const stat = this.STAT_LORE[rod.id] || "Unknown";
        const lore = `Magic Staff\n§r§dElement: §7${element}\n§dBehavior: §7${behavior}\n§dStat: §7${stat}`;

        const itemJson = {
            "format_version": "1.21.30",
            "minecraft:item": {
                "description": { "identifier": `gaiadimension:${staffId}`, "menu_category": { "category": "equipment" } },
                "components": {
                    "minecraft:max_stack_size": 1,
                    "minecraft:hand_equipped": true,
                    "minecraft:icon": staffId, // Use the ID as key
                    "minecraft:display_name": { "value": lore },
                    "minecraft:use_animation": "bow",
                    "minecraft:use_modifiers": {
                        "use_duration": 0.1
                    },
                    "minecraft:custom_components": [
                        "gaiadimension:magic_staff"
                    ]
                }
            }
        };

        if (rod.stats.cooldown) {
            // @ts-ignore
            itemJson["minecraft:item"].components["minecraft:cooldown"] = {
                "category": "magic_staff", "duration": rod.stats.cooldown
            };
        }

        await fs.writeJson(path.join(ITEM_OUT, `${staffId}.json`), itemJson, { spaces: 4 });
    }

    private static async updateMetadata(generatedItems: string[]) {
        if (await fs.pathExists(ITEM_TEXTURE_JSON)) {
            const texData = await fs.readJson(ITEM_TEXTURE_JSON);
            
            // Cleanup old path-based keys
            for (const key of Object.keys(texData.texture_data)) {
                if (key.startsWith("textures/gaiadimension/androsa/item/gen/magic_staff/")) {
                    delete texData.texture_data[key];
                }
            }

            for (const staffId of generatedItems) {
                const shortName = staffId.replace("magic_staff_", "");
                texData.texture_data[staffId] = {
                    textures: `textures/gaiadimension/androsa/item/gen/magic_staff/staff_${shortName}`
                };
            }
            await fs.writeJson(ITEM_TEXTURE_JSON, texData, { spaces: 4 });
        }

        if (await fs.pathExists(LANG_FILE)) {
            let langContent = await fs.readFile(LANG_FILE, "utf-8");
            let lines = langContent.split("\n").filter(line => !line.includes("item.gaiadimension:magic_staff_"));
            for (const staffId of generatedItems) {
                lines.push(`item.gaiadimension:${staffId}.name=Magic Staff`);
            }
            await fs.writeFile(LANG_FILE, lines.join("\n"));
        }
    }
}

MagicStaffGenerator.generate().catch(err => {
    console.error(err);
    process.exit(1);
});
