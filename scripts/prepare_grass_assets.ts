import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const VANILLA_DIR = path.join(ROOT, 'src/main/bedrock/resources/textures/vanilla');
const GEN_DIR = path.join(ROOT, 'src/main/bedrock/resources/textures/gaiadimension/gen/grass');

const INPUT = path.join(VANILLA_DIR, 'grass_side_carried.png');
const OVERLAY_OUT = path.join(GEN_DIR, 'vanilla_grass_side_overlay.png');
const DIRT_OUT = path.join(GEN_DIR, 'vanilla_dirt_base.png');

async function prepare() {
    await fs.ensureDir(GEN_DIR);
    
    const { data, info } = await sharp(INPUT)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const overlay = Buffer.alloc(data.length);
    const dirt = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Simple heuristic: if it's green-ish, it's grass
        // Grass pixels in vanilla usually have G > R and G > B
        const isGrass = g > r && g > b;

        if (isGrass) {
            // Greyscale grass for tinting
            const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            overlay[i] = grey;
            overlay[i + 1] = grey;
            overlay[i + 2] = grey;
            overlay[i + 3] = a;

            // Dirt is transparent here
            dirt[i] = 0;
            dirt[i + 1] = 0;
            dirt[i + 2] = 0;
            dirt[i + 3] = 0;
        } else {
            // Dirt part
            overlay[i] = 0;
            overlay[i + 1] = 0;
            overlay[i + 2] = 0;
            overlay[i + 3] = 0;

            dirt[i] = r;
            dirt[i + 1] = g;
            dirt[i + 2] = b;
            dirt[i + 3] = a;
        }
    }

    await sharp(overlay, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(OVERLAY_OUT);

    await sharp(dirt, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(DIRT_OUT);

    console.log("[INFO] Created grass side overlay and dirt base.");
}

prepare().catch(console.error);
