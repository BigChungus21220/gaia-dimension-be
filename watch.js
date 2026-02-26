const esbuild = require('esbuild');
const { spawn } = require('child_process');

/**
 * Simple plugin to run deploy.py after each build
 */
let deployPlugin = {
    name: 'deploy',
    setup(build) {
        build.onEnd(result => {
            if (result.errors.length > 0) {
                console.error('Build failed, skipping deployment');
                return;
            }
            console.log('Build succeeded, generating staves and deploying...');
            const gen = spawn('python', ['magic_staff_gen.py'], { stdio: 'inherit' });
            gen.on('close', (genCode) => {
                if (genCode !== 0) {
                    console.error(`Staff generation failed with code ${genCode}`);
                    return;
                }
                const deploy = spawn('python', ['deploy.py'], { stdio: 'inherit' });
                deploy.on('close', (code) => {
                    if (code === 0) {
                        console.log('Deployment complete!');
                    } else {
                        console.error(`Deployment failed with code ${code}`);
                    }
                });
            });
        });
    },
};

async function watch() {
    let ctx = await esbuild.context({
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
        plugins: [deployPlugin],
    });

    await ctx.watch();
    console.log('Watching for changes...');
}

watch().catch(() => process.exit(1));
