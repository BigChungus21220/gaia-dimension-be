import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const DATAGEN_RES = path.join(ROOT, 'datagen/resources/grass');

const INPUT_SIDE = path.join(DATAGEN_RES, 'grass_side_carried.png');

const FRINGE_MASK_OUT = path.join(DATAGEN_RES, 'grass_side_fringe_mask.png');
const DIRT_PIECE_OUT = path.join(DATAGEN_RES, 'vanilla_dirt_base.png');

async function prepare() {
    const side = await sharp(INPUT_SIDE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data, info } = side;

    const fringeMask = Buffer.alloc(data.length);
    const dirtPiece = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const y = Math.floor((i / 4) / info.width);
        
        // Identify grass pixels
        const isGrass = g > b && g > (r - 20) && y < 10;

        if (isGrass && a > 0) {
            // Fringe Mask (Greyscale)
            const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            fringeMask[i] = grey;
            fringeMask[i + 1] = grey;
            fringeMask[i + 2] = grey;
            fringeMask[i + 3] = a;
            
            // Transparent in the dirt piece
            dirtPiece[i] = 0;
            dirtPiece[i+1] = 0;
            dirtPiece[i+2] = 0;
            dirtPiece[i+3] = 0;
        } else {
            // Transparent in fringe mask
            fringeMask[i] = 0;
            fringeMask[i + 1] = 0;
            fringeMask[i + 2] = 0;
            fringeMask[i + 3] = 0;

            // KEEP ORIGINAL colors from side texture for the dirt part
            dirtPiece[i] = r;
            dirtPiece[i+1] = g;
            dirtPiece[i+2] = b;
            dirtPiece[i+3] = a;
        }
    }

    // 1. Save Fringe Mask (Greyscale)
    await sharp(fringeMask, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(FRINGE_MASK_OUT);

    // 2. Save Dirt Piece (Extracted directly from side texture)
    await sharp(dirtPiece, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(DIRT_PIECE_OUT);

    console.log("[INFO] Grass assets restored: Fringe Mask and Side Dirt Piece generated from side texture.");
}

prepare().catch(console.error);
