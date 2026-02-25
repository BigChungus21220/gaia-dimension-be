import { world, BlockVolume, system } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";

const queue = [];
const handledThisTick = new Set();

// Clean handled set periodically to keep memory low
system.runInterval(() => handledThisTick.clear(), 20);

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

let clearFilter = [];
system.run(() => {
    try {
        const targets = ["log", "leaves", "wood", "lichen", "grass", "flower", "plant", "fern", "bush", "vine", "sapling", "mushroom", "bamboo", "sugar_cane", "lily_pad", "kelp", "seagrass", "coral", "roots", "hanging", "spore", "moss", "azalea", "mangrove", "dripleaf", "glow_berry", "pumpkin", "melon", "cactus", "berry", "sea_pickle", "turtle_egg", "pink_petals", "propule", "cherry", "sculk", "snow", "ice", "mud", "dripstone", "sunflower", "lilac", "rose", "peony", "reeds", "waterlily", "web"];
        const filterSet = new Set();
        Object.values(MinecraftBlockTypes).forEach(id => {
            if (!id.startsWith("minecraft:")) return;
            const l = id.toLowerCase();
            if (targets.some(t => l.includes(t))) {
                if (!l.includes("brick") && !l.includes("ore") && !l.includes("deepslate") && 
                    !["minecraft:air", "minecraft:bedrock", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:sand", "minecraft:gravel", "minecraft:tuff", "minecraft:water", "minecraft:lava"].includes(l)) {
                    filterSet.add(id);
                }
            }
        });
        clearFilter = Array.from(filterSet);
    } catch(e) {}
});

// Throttled Processor: Strictly respects a 2ms time budget per tick
system.runInterval(() => {
    if (queue.length === 0) return;
    
    const startTime = Date.now();
    const BUDGET = 2; // 2ms per tick limit to ensure zero lag

    while (queue.length > 0) {
        // If we've spent more than our budget, stop and wait for the next tick
        if (Date.now() - startTime >= BUDGET) break;

        const task = queue.shift();
        const overworld = world.getDimension('minecraft:overworld');
        
        try {
            // Range Y=30 to Y=115 (Safe single pass)
            overworld.fillBlocks(
                new BlockVolume({x: task.x, y: 30, z: task.z}, {x: task.x + 15, y: 115, z: task.z + 15}), 
                'minecraft:air', 
                { blockFilter: { includeTypes: clearFilter } }
            );
        } catch(e) {}
    }
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // 1. KILL RECURSION IMMEDIATELY
            block.setType("minecraft:air");

            const loc = block.location;
            if (!GaiaDimension || !GaiaDimension.isInDimension(loc)) return;

            const {x, z} = chunk_corner(loc);
            const key = `${x},${z}`;

            // 2. STOP ITERATION LAG
            if (handledThisTick.has(key)) return;
            handledThisTick.add(key);

            // 3. QUEUE FOR BUDGETED EXECUTION
            queue.push({x, z});
        }
    })
})