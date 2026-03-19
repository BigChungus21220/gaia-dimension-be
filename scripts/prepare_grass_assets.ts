import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const VANILLA_DIR = path.join(ROOT, 'src/main/bedrock/resources/textures/vanilla');

const INPUT = path.join(VANILLA_DIR, 'grass_side_carried.png');
const GRASS_MASK_OUT = path.join(VANILLA_DIR, 'grass_side_overlay.png');
const DIRT_BASE_OUT = path.join(VANILLA_DIR, 'vanilla_dirt_base.png');

async function prepare() {
    const { data, info } = await sharp(INPUT)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const grassMask = Buffer.alloc(data.length);
    const dirtBase = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const pixelIndex = i / 4;
        const y = Math.floor(pixelIndex / info.width);

        // Positional + Color check
        const isGreenish = g > b && g > (r - 30);
        const isGrassArea = y < 10 && isGreenish;

        if (isGrassArea && a > 0) {
            // Grass Mask (Greyscale)
            const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grassMask[i] = grey;
            grassMask[i + 1] = grey;
            grassMask[i + 2] = grey;
            grassMask[i + 3] = a;

            // Dirt Base is transparent here
            dirtBase[i] = 0;
            dirtBase[i + 1] = 0;
            dirtBase[i + 2] = 0;
            dirtBase[i + 3] = 0;
        } else {
            // Grass Mask is transparent
            grassMask[i] = 0;
            grassMask[i + 1] = 0;
            grassMask[i + 2] = 0;
            grassMask[i + 3] = 0;

            // Dirt Base (Original colors)
            dirtBase[i] = r;
            dirtBase[i + 1] = g;
            dirtBase[i + 2] = b;
            dirtBase[i + 3] = a;
        }
    }

    await sharp(grassMask, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(GRASS_MASK_OUT);

    await sharp(dirtBase, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toFile(DIRT_BASE_OUT);

    console.log("[INFO] Grass assets prepared: Mask and Dirt Base separated.");
}

prepare().catch(console.error);
