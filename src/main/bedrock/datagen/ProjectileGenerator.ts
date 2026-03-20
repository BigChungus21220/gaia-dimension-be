import path from "path";
import fs from "fs-extra";
import sharp from "sharp";

const RP_PATH = "src/main/bedrock/resources";
const TEXTURE_OUT = path.join(RP_PATH, "textures/gaiadimension/androsa/entity/gen/projectiles");
const ITEM_TEXTURE_JSON = path.join(RP_PATH, "textures/item_texture.json");

const PROJECTILE_BASE = "src/main/resources/assets/gaiadimension/textures/entity/staff_projectile.png";

interface Element {
    id: string;
    color: string;
}

const ELEMENTS: Element[] = [
    { id: "physical", color: "#FFFFFF" },
    { id: "fire", color: "#FF6666" },
    { id: "electric", color: "#FFFF66" },
    { id: "poison", color: "#99FF33" },
    { id: "frost", color: "#66CCFF" },
    { id: "magic", color: "#FF99FF" },
    { id: "energy", color: "#9966CC" }
];

export class ProjectileGenerator {
    public static async generate() {
        console.log("[INFO] Generating Magic Staff Projectiles...");
        await fs.ensureDir(TEXTURE_OUT);

        const texDataExists = await fs.pathExists(ITEM_TEXTURE_JSON);
        let texData: any = texDataExists ? await fs.readJson(ITEM_TEXTURE_JSON) : { texture_data: {} };

        for (const element of ELEMENTS) {
            const fileName = `staff_projectile_${element.id}.png`;
            const outPath = path.join(TEXTURE_OUT, fileName);
            const textureId = `staff_projectile_${element.id}`;

            // Physical (#FFFFFF) means no tinting needed, but .tint() handles it fine too
            await sharp(PROJECTILE_BASE)
                .tint(element.color)
                .toFile(outPath);

            texData.texture_data[textureId] = {
                textures: `textures/gaiadimension/androsa/entity/gen/projectiles/staff_projectile_${element.id}`
            };
        }

        await fs.writeJson(ITEM_TEXTURE_JSON, texData, { spaces: 4 });
        console.log("[INFO] Projectile Generation Complete.");
    }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    ProjectileGenerator.generate().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
