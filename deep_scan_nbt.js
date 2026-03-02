const nbt = require('prismarine-nbt');
const fs = require('fs');

async function debug() {
    const buffer = fs.readFileSync('GaiaDimensions_BP/structures/malachite_tower.mcstructure');
    const { parsed } = await nbt.parse(buffer);
    
    // Recursive search for ANY key that might contain 'gaia' or 'EntityIdentifier'
    function search(obj, path = '') {
        if (!obj || typeof obj !== 'object') return;
        
        for (const key in obj) {
            const val = obj[key];
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof val === 'string' && (val.includes('gaia') || val.includes('spawner'))) {
                console.log(`FOUND at ${currentPath}: ${val}`);
            } else if (val && typeof val === 'object') {
                if (val.value !== undefined && typeof val.value === 'string') {
                    if (val.value.includes('gaia')) {
                        console.log(`FOUND at ${currentPath}.value: ${val.value}`);
                    }
                }
                search(val, currentPath);
            }
        }
    }

    console.log('Searching all NBT for relevant strings...');
    search(parsed);
}

debug();
