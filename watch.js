const esbuild = require('esbuild');
const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

/**
 * Runs a shell command and returns a promise
 */
function runCommand(command, args) {
    return new Promise((resolve) => {
        console.log(`> Running ${command} ${args.join(' ')}`);
        const proc = spawn(command, args, { stdio: 'inherit', shell: true });
        proc.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

let isBuilding = false;
let pendingBuild = false;

async function buildAndDeploy() {
    if (isBuilding) {
        pendingBuild = true;
        return;
    }

    isBuilding = true;
    console.log('\n--- Starting Build & Deploy ---');

    try {
        // 1. Generate staves
        const genSuccess = await runCommand('python', ['magic_staff_gen.py']);
        if (!genSuccess) throw new Error('Staff generation failed');

        // 2. Bundle JS
        await esbuild.build({
            entryPoints: ['GaiaDimensions_BP/src/GaiaDimensionAddon.js'],
            bundle: true,
            format: 'esm',
            external: [
                '@minecraft/server',
                '@minecraft/server-ui',
                '@minecraft/server-gametest',
                '@minecraft/server-admin',
                '@minecraft/server-editor',
                '@minecraft/server-net'
            ],
            outfile: 'GaiaDimensions_BP/scripts/GaiaDimensionAddon.js',
        });
        console.log('> JS Bundling complete');

        // 3. Deploy
        const deploySuccess = await runCommand('python', ['deploy.py']);
        if (!deploySuccess) throw new Error('Deployment failed');

        // 4. Package (.mcaddon)
        const packageSuccess = await runCommand('python', ['package.py']);
        if (!packageSuccess) throw new Error('Packaging failed');

        console.log('--- Build & Deploy Successful ---\n');
    } catch (err) {
        console.error(`\n!!! Build Error: ${err.message}\n`);
    }

    isBuilding = false;
    if (pendingBuild) {
        pendingBuild = false;
        buildAndDeploy();
    }
}

// Initialize watcher
const watcher = chokidar.watch([
    'GaiaDimensions_BP',
    'GaiaDimension_RP'
], {
    ignored: [
        '**/scripts/GaiaDimensionAddon.js', // Ignore the output file to prevent loops
        '**/.git/**',
        '**/node_modules/**',
        '**/textures/gaiadimension/androsa/item/gen/**', // Ignore generated textures
        '**/items/androsa/magic_staff/**', // Ignore generated items
        '**/textures/item_texture.json', // Ignore files modified by magic_staff_gen.py
        '**/texts/en_US.lang' // Ignore language file modified by magic_staff_gen.py
    ],
    persistent: true,
    ignoreInitial: true
});

console.log('Watching GaiaDimensions_BP and GaiaDimension_RP for changes...');

watcher.on('all', (event, filePath) => {
    const fileName = path.basename(filePath);
    console.log(`Change detected: ${fileName} (${event})`);
    buildAndDeploy();
});

// Run initial build
buildAndDeploy();
