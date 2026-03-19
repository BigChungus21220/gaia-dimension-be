import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';

const ROOT = process.cwd();
const VANILLA_DIR = path.join(ROOT, 'src/main/bedrock/resources/textures/vanilla');
const DEBUG_DIR = path.join(ROOT, 'debug_grass');

const BASE_TOP = path.join(VANILLA_DIR, 'grass_top.png');
const BASE_SIDE_OVERLAY = path.join(VANILLA_DIR, 'grass_side_overlay.png');
const BASE_DIRT_SIDE = path.join(VANILLA_DIR, 'grass_side_dirt_base.png');

const COLOR = "#91bd59"; // Plains

async function debug() {
    await fs.ensureDir(DEBUG_DIR);
    
    const r = parseInt(COLOR.slice(1, 3), 16);
    const g = parseInt(COLOR.slice(3, 5), 16);
    const b = parseInt(COLOR.slice(5, 7), 16);
    const colorOverlay = Buffer.alloc(16 * 16 * 4);
    for (let i = 0; i < colorOverlay.length; i += 4) {
        colorOverlay[i] = r;
        colorOverlay[i+1] = g;
        colorOverlay[i+2] = b;
        colorOverlay[i+3] = 255;
    }
    const rawMeta = { raw: { width: 16, height: 16, channels: 4 } };

    // Mode 1: Multiply (current)
    await sharp(BASE_TOP)
        .composite([{ input: colorOverlay, ...rawMeta, blend: 'multiply' }])
        .toFile(path.join(DEBUG_DIR, 'top_multiply.png'));

    // Mode 2: Over (Tinted mask over nothing)
    const tintedMask = await sharp(BASE_TOP)
        .composite([{ input: colorOverlay, ...rawMeta, blend: 'multiply' }])
        .toBuffer();
    
    await sharp(tintedMask)
        .toFile(path.join(DEBUG_DIR, 'top_final.png'));

    // Mode 3: Built-in Tint (Grainy)
    await sharp(BASE_TOP)
        .tint(COLOR)
        .toFile(path.join(DEBUG_DIR, 'top_sharp_tint.png'));

    console.log("[INFO] Debug textures generated in ./debug_grass");
}

debug().catch(console.error);
