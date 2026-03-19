import { execSync } from 'child_process';
import fs from 'fs-extra';
import * as path from 'path';
import * as esbuild from 'esbuild';

const MOJANG_PATHS = [
    path.join(process.env.APPDATA || '', '..', 'Local/Packages/Microsoft.MinecraftUWP_8wekyb3d8bbwe/LocalState/games/com.mojang'),
    "C:/Users/ADMIN/AppData/Roaming/Minecraft Bedrock/Users/Shared/games/com.mojang"
].filter(p => fs.existsSync(p));

const ROOT = process.cwd();
const SRC_BEDROCK = path.join(ROOT, 'src/main/bedrock');
const SRC_DATA = path.join(SRC_BEDROCK, 'data');
const SRC_RESOURCES = path.join(SRC_BEDROCK, 'resources');
const SRC_TS = path.join(SRC_BEDROCK, 'ts');

async function runCommand(cmd: string, description?: string) {
    if (description) console.log(`[INFO] ${description}...`);
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

async function build() {
    const startTime = Date.now();
    console.log('\x1b[32m> Task :compileJava\x1b[0m');
    console.log('[INFO] Scanning for projects...');
    console.log('[INFO] ------------------------------------------------------------------------');
    console.log('[INFO] Building Gaia Dimension Addon 1.0.0-SNAPSHOT');
    console.log('[INFO] ------------------------------------------------------------------------');

    // 1. Run Registries/Resources
    console.log('\x1b[32m> Task :processResources\x1b[0m');
    await runCommand('npx tsx src/main/bedrock/datagen/MagicStaffGenerator.ts');
    await runCommand('npx tsx src/main/bedrock/datagen/GrassGenerator.ts');
    await runCommand('node port_worldgen.js');

    // 2. Bundle Scripts
    console.log('\x1b[32m> Task :compileScripts\x1b[0m');
    console.log('[INFO] Compiling TypeScript sources...');
    const entryPoint = path.join(SRC_TS, 'GaiaDimensionAddon.ts');
    const outfile = path.join(SRC_DATA, 'scripts/GaiaDimensionAddon.js');

    await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        format: 'esm',
        minify: false,
        sourcemap: true,
        external: [
            '@minecraft/server',
            '@minecraft/server-ui',
            '@minecraft/server-gametest',
            '@minecraft/server-admin',
            '@minecraft/server-editor',
            '@minecraft/server-net'
        ],
        outfile: outfile,
    });
    console.log(`[INFO] Bundled artifact to: ${outfile}`);

    // 3. Deploy
    console.log('\x1b[32m> Task :compileAddon\x1b[0m');
    
    for (const mojangPath of MOJANG_PATHS) {
        const targetBP = path.join(mojangPath, 'development_behavior_packs/GaiaDimensions_BP');
        const targetRP = path.join(mojangPath, 'development_resource_packs/GaiaDimension_RP');

        console.log(`[INFO] Syncing to: ${mojangPath}`);
        
        // Clean and ensure directories
        await fs.emptyDir(targetBP);
        await fs.emptyDir(targetRP);

        // Sync BP (excluding src folder if it exists in data)
        await fs.copy(SRC_DATA, targetBP, {
            overwrite: true,
            filter: (src) => {
                const rel = path.relative(SRC_DATA, src);
                return !rel.split(path.sep).includes('src');
            }
        });

        // Sync RP
        await fs.copy(SRC_RESOURCES, targetRP, { overwrite: true });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log('[INFO] ------------------------------------------------------------------------');
    console.log('\x1b[32mBUILD SUCCESSFUL\x1b[0m in ' + duration + 's');
    console.log('[INFO] ------------------------------------------------------------------------');
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
