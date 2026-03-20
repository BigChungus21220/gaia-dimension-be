const fs = require('fs-extra');
const path = require('path');

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'src/main/bedrock/data');
const ITEMS_PATH = path.join(DATA_PATH, 'items');
const BLOCKS_PATH = path.join(DATA_PATH, 'blocks');
const LOOT_TABLES_PATH = path.join(DATA_PATH, 'loot_tables');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.json')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

async function fixLootTables() {
    console.log("[INFO] Starting Loot Table Cleanup...");

    // 1. Build set of valid IDs
    const validIds = new Set();
    
    // Add IDs from files
    const itemFiles = getAllFiles(ITEMS_PATH);
    const blockFiles = getAllFiles(BLOCKS_PATH);

    for (const f of itemFiles) {
        try {
            const content = fs.readJsonSync(f);
            const id = content['minecraft:item']?.description?.identifier;
            if (id) validIds.add(id);
        } catch (e) {}
    }

    for (const f of blockFiles) {
        try {
            const content = fs.readJsonSync(f);
            const id = content['minecraft:block']?.description?.identifier;
            if (id) validIds.add(id);
        } catch (e) {}
    }

    console.log(`[INFO] Found ${validIds.size} valid gaiadimension IDs.`);

    // 2. Scan Loot Tables
    const lootFiles = getAllFiles(LOOT_TABLES_PATH);
    let totalRemoved = 0;

    for (const f of lootFiles) {
        let loot;
        try {
            loot = fs.readJsonSync(f);
        } catch (e) {
            continue;
        }

        const originalString = JSON.stringify(loot);
        
        if (loot.pools) {
            for (const pool of loot.pools) {
                if (pool.entries) {
                    pool.entries = pool.entries.filter(entry => {
                        if (entry.type === 'item') {
                            const itemName = entry.name;
                            if (itemName.startsWith('gaiadimension:') && !validIds.has(itemName)) {
                                console.log(`[REMOVE] Missing item '${itemName}' in ${path.relative(LOOT_TABLES_PATH, f)}`);
                                totalRemoved++;
                                return false;
                            }
                        }
                        return true;
                    });
                }
            }
        }

        const newString = JSON.stringify(loot);
        if (originalString !== newString) {
            fs.writeJsonSync(f, loot, { spaces: 4 });
        }
    }

    console.log(`[INFO] Loot Table Cleanup Complete. Removed ${totalRemoved} invalid entries.`);
}

fixLootTables().catch(err => {
    console.error(err);
    process.exit(1);
});
