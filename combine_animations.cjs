const fs = require('fs');
const path = require('path');

const scratchDir = path.join(__dirname, 'scratch');
const targetFile = path.join(__dirname, 'src', 'main', 'bedrock', 'resources', 'animations', 'malachite_guard.poses.animation.json');

function combine() {
    let finalData = {
        "format_version": "1.8.0",
        "animations": {}
    };

    if (fs.existsSync(targetFile)) {
        try {
            const currentData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
            if (currentData.animations) {
                finalData.animations = currentData.animations;
            }
            if (currentData.format_version) {
                finalData.format_version = currentData.format_version;
            }
        } catch (e) {
            console.error("Error reading target file, starting fresh:", e);
        }
    }

    if (!fs.existsSync(scratchDir)) {
        console.error(`Directory ${scratchDir} does not exist yet.`);
        process.exit(1);
    }

    const files = fs.readdirSync(scratchDir);
    let count = 0;

    for (const file of files) {
        if (file.endsWith('.json')) {
            const filePath = path.join(scratchDir, file);
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data.animations) {
                    for (const key in data.animations) {
                        finalData.animations[key] = data.animations[key];
                    }
                }
                count++;
            } catch (e) {
                console.error(`Error reading ${file}:`, e);
            }
        }
    }

    fs.writeFileSync(targetFile, JSON.stringify(finalData, null, '\t') + '\n');
    console.log(`Successfully combined ${count} scratch animations into ${targetFile}`);
}

combine();
