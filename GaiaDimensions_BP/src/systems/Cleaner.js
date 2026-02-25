import { world, BlockVolume, system } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";

const queue = [];
const handledThisTick = new Set();

// Periodically clear to keep memory efficient
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
        const targets = [
            "log", "leaves", "wood", "lichen", "grass", "flower", "plant", "fern", "bush", 
            "vine", "sapling", "mushroom", "bamboo", "sugar_cane", "lily_pad", "kelp", 
            "seagrass", "coral", "roots", "hanging", "spore", "moss", "azalea", "mangrove",
            "dripleaf", "glow_berry", "pumpkin", "melon", "cactus", "berry", "sea_pickle",
            "turtle_egg", "pink_petals", "propule", "cherry", "sculk", "snow", "ice", "mud",
            "dripstone", "sunflower", "lilac", "rose", "peony", "reeds", "waterlily", "web"
        ];

        const filterSet = new Set();
        Object.values(MinecraftBlockTypes).forEach(id => {
            // CRITICAL: Only include vanilla Minecraft blocks
            // This guarantees gaiadimension: blocks are NEVER in the deletion list
            if (!id.startsWith("minecraft:")) return;

            const l = id.toLowerCase();
            if (targets.some(t => l.includes(t))) {
                // Protect essential vanilla terrain blocks
                const essentials = ["minecraft:air", "minecraft:bedrock", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:sand", "minecraft:gravel", "minecraft:tuff", "minecraft:water", "minecraft:lava", "minecraft:deepslate"];
                if (!essentials.includes(l) && !l.includes("brick") && !l.includes("ore")) {
                    filterSet.add(id);
                }
            }
        });
        clearFilter = Array.from(filterSet);
    } catch(e) {}
});

// Throttled Processor: Respects 2ms budget per tick
system.runInterval(() => {
    if (queue.length === 0) return;
    
    const startTime = Date.now();
    const BUDGET = 2; 

    while (queue.length > 0) {
        if (Date.now() - startTime >= BUDGET) break;

        const task = queue.shift();
        const overworld = world.getDimension('minecraft:overworld');
        
        try {
            // Safe single-pass clearing from Y=30 to Y=115
            // This range is far above the bedrock markers at Y=0 and Y=-64
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
            // KILL RECURSION IMMEDIATELY
            block.setType("minecraft:air");

            const loc = block.location;
            if (!GaiaDimension || !GaiaDimension.isInDimension(loc)) return;

            const {x, z} = chunk_corner(loc);
            const key = `${x},${z}`;

            if (!handledThisTick.has(key)) {
                handledThisTick.add(key);
                queue.push({x, z});
            }
        }
    })
})