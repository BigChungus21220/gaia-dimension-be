import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const VANILLA_DIR = path.join(ROOT, 'src/main/bedrock/resources/textures/vanilla');

const INPUT_SIDE = path.join(VANILLA_DIR, 'grass_side_carried.png');
const INPUT_DIRT = path.join(VANILLA_DIR, 'dirt.png');

const FRINGE_MASK_OUT = path.join(VANILLA_DIR, 'grass_side_fringe_mask.png');
const DIRT_BASE_OUT = path.join(VANILLA_DIR, 'vanilla_dirt_base.png');

async function prepare() {
    const side = await sharp(INPUT_SIDE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = side;

    const fringeMask = Buffer.alloc(data.length);
    const dirtMask = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const y = Math.floor((i / 4) / info.width);
        const isGrass = g > b && g > (r - 20) && y < 10;

        if (isGrass && a > 0) {
            const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            fringeMask[i] = grey;
            fringeMask[i + 1] = grey;
            fringeMask[i + 2] = grey;
            fringeMask[i + 3] = a;
            
            dirtMask[i] = 0;
            dirtMask[i+1] = 0;
            dirtMask[i+2] = 0;
            dirtMask[i+3] = 0;
        } else {
            fringeMask[i] = 0;
            fringeMask[i + 1] = 0;
            fringeMask[i + 2] = 0;
            fringeMask[i + 3] = 0;

            dirtMask[i] = 255;
            dirtMask[i+1] = 255;
            dirtMask[i+2] = 255;
            dirtMask[i+3] = a;
        }
    }

    // 1. Save Fringe Mask (Greyscale)
    await sharp(fringeMask, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(FRINGE_MASK_OUT);

    // 2. Create Universal Dirt Base (Dirt carved with Dirt Mask)
    const dirtMaskBuffer = await sharp(dirtMask, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    
    await sharp(INPUT_DIRT)
        .composite([{ input: dirtMaskBuffer, blend: 'dest-in' }])
        .toFile(DIRT_BASE_OUT);

    console.log("[INFO] Grass assets carved and ready for slapping.");
}

prepare().catch(console.error);
