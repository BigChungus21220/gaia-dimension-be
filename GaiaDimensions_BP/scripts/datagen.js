const fs = require('fs').promises;
const path = require('path');

// A simple function to strip JSON comments
function stripJsonComments(data) {
    return data.replace(/\/\/.*/g, '');
}

async function* getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        } else {
            if (res.endsWith('.json')) {
                yield res;
            }
        }
    }
}

(async () => {
    const blocksDir = path.resolve(__dirname, '../blocks');
    let updatedCount = 0;
    let errorCount = 0;

    for await (const file of getFiles(blocksDir)) {
        try {
            const content = await fs.readFile(file, 'utf8');
            const strippedContent = stripJsonComments(content);
            
            // Attempt to parse the cleaned JSON
            const json = JSON.parse(strippedContent);

            if (json["minecraft:block"] && json["minecraft:block"].components) {
                const components = json["minecraft:block"].components;
                let componentKeyToReplace = null;

                for (const key in components) {
                    if (key.startsWith('gaia:')) {
                        if (key !== 'gaia:interaction_handler') {
                            componentKeyToReplace = key;
                            break;
                        }
                    }
                }

                if (componentKeyToReplace) {
                    console.log(`Updating component in: ${path.basename(file)}`);
                    
                    delete components[componentKeyToReplace];
                    components['gaia:interaction_handler'] = {};

                    const newContent = JSON.stringify(json, null, 2);
                    await fs.writeFile(file, newContent, 'utf8');
                    updatedCount++;
                }
            }
        } catch (e) {
            console.error(`Could not process file ${path.basename(file)}. Reason: ${e.message}`);
            errorCount++;
        }
    }

    if (updatedCount > 0) {
        console.log(`\nSuccessfully updated ${updatedCount} block JSON files.`);
    } else {
        console.log(`\nNo block JSON files required updating.`);
    }

    if (errorCount > 0) {
        console.log(`\nEncountered errors in ${errorCount} files. Please review the logs above.`);
    }
})();