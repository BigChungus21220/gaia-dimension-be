import { world, BlockVolume, system } from "@minecraft/server"
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import { GaiaDimension } from "../world/Gaia.js"

const cleaningQueue = [];
const pendingChunks = new Set();

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

let clearFilter = [];

// Initialize filter with a broad "includes" strategy to catch EVERYTHING (roots, leaves, logs, etc.)
system.run(() => {
    const targets = [
        "log", "leaves", "wood", "lichen", "grass", "flower", "plant", "fern", "bush", 
        "vine", "sapling", "mushroom", "bamboo", "sugar_cane", "lily_pad", "kelp", 
        "seagrass", "coral", "roots", "hanging", "spore", "moss", "azalea", "mangrove"
    ];

    const filterSet = new Set();
    Object.values(MinecraftBlockTypes).forEach(typeId => {
        if (!typeId.startsWith("minecraft:")) return;
        const lower = typeId.toLowerCase();
        
        // Match if the block ID contains any of our target keywords
        if (targets.some(t => lower.includes(t))) {
            // Protect essential terrain
            if (!["minecraft:air", "minecraft:bedrock", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:sand", "minecraft:gravel", "minecraft:deepslate", "minecraft:tuff"].includes(lower)) {
                filterSet.add(typeId);
            }
        }
    });
    clearFilter = Array.from(filterSet);
});

// Optimized Background Processor: Strictly respects a 2ms time budget per tick
system.runInterval(() => {
    if (cleaningQueue.length === 0) return;
    
    const startTime = Date.now();
    const BUDGET = 2; // 2ms per tick limit to ensure zero lag

    while (cleaningQueue.length > 0) {
        if (Date.now() - startTime >= BUDGET) break;

        const loc = cleaningQueue.shift();
        const {x, z} = chunk_corner(loc);
        pendingChunks.delete(`${x},${z}`);

        if (GaiaDimension && GaiaDimension.isInDimension(loc)) {
            const overworld = world.getDimension('overworld');
            try {
                // Range Y=30 to Y=115 (Safe single pass)
                overworld.fillBlocks(
                    new BlockVolume({x, y: 30, z}, {x: x + 15, y: 115, z: z + 15}), 
                    'minecraft:air', 
                    { blockFilter: { includeTypes: clearFilter } }
                );
            } catch(e) {}
        }
    }
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // KILL RECURSION IMMEDIATELY
            block.setType("minecraft:air");

            const {x, z} = chunk_corner(block.location);
            const key = `${x},${z}`;

            if (!pendingChunks.has(key)) {
                pendingChunks.add(key);
                cleaningQueue.push(block.location);
            }
        }
    })
})