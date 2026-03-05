const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

const BP_PATH = "GaiaDimensions_BP";
const RP_PATH = "GaiaDimension_RP";
const BUILD_DIR = "build";
const ADDON_NAME = "GaiaDimension";

const MOJANG_PATH = path.join(process.env.LOCALAPPDATA, 'Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang');
const DEV_BP_PATH = path.join(MOJANG_PATH, 'development_behavior_packs', BP_PATH);
const DEV_RP_PATH = path.join(MOJANG_PATH, 'development_resource_packs', RP_PATH);

// Exclude non-essential files from the packs
const BP_EXCLUDES = ['src', '.git', '.gitignore', 'package.json', 'package-lock.json', 'node_modules', 'gen_recipes.js', 'convert_recipes.py', 'gen_machine_recipes.js'];
const RP_EXCLUDES = ['.git', '.gitignore'];

async function zipFolder(folderPath, outputPath, excludes = []) {
    const zip = new AdmZip();
    const files = await fs.readdir(folderPath);
    
    for (const file of files) {
        if (excludes.includes(file)) continue;
        
        const fullPath = path.join(folderPath, file);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            zip.addLocalFolder(fullPath, file, (name) => !excludes.includes(name));
        } else {
            zip.addLocalFile(fullPath);
        }
    }
    zip.writeZip(outputPath);
}

async function deploy() {
    console.log('--- Deploying to Minecraft ---');
    try {
        if (await fs.pathExists(DEV_BP_PATH)) await fs.remove(DEV_BP_PATH);
        if (await fs.pathExists(DEV_RP_PATH)) await fs.remove(DEV_RP_PATH);

        // Copy packs, excluding src from BP
        await fs.copy(BP_PATH, DEV_BP_PATH, {
            filter: (src) => !BP_EXCLUDES.some(ex => src.includes(path.sep + ex))
        });
        await fs.copy(RP_PATH, DEV_RP_PATH, {
            filter: (src) => !RP_EXCLUDES.some(ex => src.includes(path.sep + ex))
        });
        console.log('Deployment successful!');
    } catch (err) {
        console.error('Deployment failed:', err.message);
    }
}

async function packageAddon() {
    console.log('--- Packaging Addon ---');
    try {
        if (await fs.pathExists(BUILD_DIR)) await fs.remove(BUILD_DIR);
        await fs.ensureDir(BUILD_DIR);

        const bpMcpack = path.join(BUILD_DIR, `${BP_PATH}.mcpack`);
        const rpMcpack = path.join(BUILD_DIR, `${RP_PATH}.mcpack`);
        const addonFile = path.join(BUILD_DIR, `${ADDON_NAME}.mcaddon`);

        await zipFolder(BP_PATH, bpMcpack, BP_EXCLUDES);
        await zipFolder(RP_PATH, rpMcpack, RP_EXCLUDES);

        const finalZip = new AdmZip();
        finalZip.addLocalFile(bpMcpack);
        finalZip.addLocalFile(rpMcpack);
        finalZip.writeZip(addonFile);

        console.log(`Addon packaged: ${addonFile}`);
    } catch (err) {
        console.error('Packaging failed:', err.message);
    }
}

async function run() {
    const action = process.argv[2];
    if (action === 'deploy') await deploy();
    else if (action === 'package') await packageAddon();
    else if (action === 'all') {
        await deploy();
        await packageAddon();
    }
}

run();
