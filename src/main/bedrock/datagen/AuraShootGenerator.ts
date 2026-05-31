import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const TEXTURE_DIR = path.resolve(process.cwd(), 'src/main/bedrock/resources/textures/gaiadimension/androsa/blocks');

const COLORS = ['#EA500D', '#FFC24C', '#C1ED26', '#67FFB9', '#265AEF', '#5C0AD7', '#5D3883', '#C330E8', '#FF6CAE'];

class AuraShootGenerator {
    private static tintBuffer(raw: Buffer, tintHex: string): Buffer {
        const tr = parseInt(tintHex.slice(1, 3), 16) / 255;
        const tg = parseInt(tintHex.slice(3, 5), 16) / 255;
        const tb = parseInt(tintHex.slice(5, 7), 16) / 255;
        const out = Buffer.from(raw); // clone
        for (let i = 0; i < out.length; i += 4) {
            out[i]     = Math.round(out[i]     * tr); // R
            out[i + 1] = Math.round(out[i + 1] * tg); // G
            out[i + 2] = Math.round(out[i + 2] * tb); // B
            // out[i + 3] unchanged ?" preserve alpha
        }
        return out;
    }

    public static async generate() {
        console.log("[INFO] Generating Aura Shoot tinted variations...");

        const baseFiles = ['aura_shoot', 'aura_shoot_tip'];

        for (const baseFile of baseFiles) {
            const basePath = path.join(TEXTURE_DIR, `${baseFile}.png`);
            if (!fs.existsSync(basePath)) {
                console.warn(`[WARN] Missing base texture: ${basePath}`);
                continue;
            }

            const img = sharp(basePath).ensureAlpha();
            const meta = await img.metadata();
            const w = meta.width || 16;
            const h = meta.height || 16;
            const raw = await img.raw().toBuffer();

            for (let i = 0; i < COLORS.length; i++) {
                const color = COLORS[i];
                const outPath = path.join(TEXTURE_DIR, `${baseFile}_${i}.png`);
                const tinted = this.tintBuffer(raw, color);
                
                await sharp(tinted, { raw: { width: w, height: h, channels: 4 } })
                    .toFile(outPath);
            }
        }
        
        console.log("[INFO] Aura Shoot Generation Complete.");
    }
}

AuraShootGenerator.generate().catch(console.error);
