import { world, system, BlockVolume, BlockPermutation } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

/**
 * OPTIMIZATION: NATIVE TAG FILTERING
 * Using native bitmask tags is O(1) in the engine.
 */
const CLUTTER_TAGS = [
    "grass", "plant", "leaves", "log", "wood",
    "acacia", "birch", "dark_oak", "jungle", "oak", "spruce",
    "minecraft:is_shears_item_destructible", 
    "minecraft:is_hoe_item_destructible",
    "minecraft:crop", "flower", "bush", "vine", "mushroom", "coral", "waterlily", "reeds"
];
const CLUTTER_TYPES = ["minecraft:deadbush", "minecraft:snow_layer", "minecraft:sugar_cane", "minecraft:bamboo", "minecraft:kelp", "minecraft:glow_lichen"];

const FILTER = {
    blockFilter: {
        includeTags: CLUTTER_TAGS,
        includeTypes: CLUTTER_TYPES
    },
    ignoreChunkBoundErrors: true
};

let AIR, DIM, SHARED_VOL;
const QUEUE = [];
const CACHE = new Set();
const QUEUED = new Set();

system.run(() => {
    try {
        AIR = BlockPermutation.resolve("minecraft:air");
        DIM = world.getDimension("minecraft:overworld");
        SHARED_VOL = new BlockVolume({x:0, y:0, z:0}, {x:0, y:0, z:0});
    } catch(e) {}
});

/**
 * PRIORITY SORTING (Infrequent)
 */
system.runInterval(() => {
    if (QUEUE.length < 2) return;
    const players = world.getAllPlayers().filter(p => p.dimension.id === "minecraft:overworld");
    if (players.length === 0) return;

    const pLoc = players[0].location;
    QUEUE.sort((a, b) => {
        const dA = Math.abs(a.x - pLoc.x) + Math.abs(a.z - pLoc.z);
        const dB = Math.abs(b.x - pLoc.x) + Math.abs(b.z - pLoc.z);
        return dA - dB;
    });
}, 100);

/**
 * ROCK-SOLID RUNNER
 */
system.runInterval(() => {
    if (QUEUE.length === 0 || !SHARED_VOL || !DIM) return;
    
    // Always work on the first item in the queue
    const t = QUEUE[0];
    
    // Proximity check: If no players are near this chunk, move it to the back
    // This prevents trying to fill blocks in unloaded chunks.
    const players = world.getAllPlayers();
    const isAnyPlayerNear = players.some(p => {
        if (p.dimension.id !== "minecraft:overworld") return false;
        const loc = p.location;
        return Math.abs(loc.x - (t.x + 8)) < 128 && Math.abs(loc.z - (t.z + 8)) < 128;
    });

    if (!isAnyPlayerNear) {
        QUEUE.push(QUEUE.shift());
        return;
    }

    const yMin = 85 + (t.s * 32);
    const yMax = Math.min(yMin + 31, 200);

    SHARED_VOL.from = { x: t.x, y: yMin, z: t.z };
    SHARED_VOL.to = { x: t.x + 15, y: yMax, z: t.z + 15 };

    try {
        DIM.fillBlocks(SHARED_VOL, AIR, FILTER);
        
        t.s++;
        if (yMax >= 200) {
            CACHE.add(t.key);
            QUEUED.delete(t.key);
            QUEUE.shift();
        }
    } catch(e) {
        // If it fails (likely chunk became unloaded mid-process), rotate to back
        QUEUE.push(QUEUE.shift());
    }
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            const {x, z} = block.location;
            const cx = (Math.floor(x) >> 4) << 4;
            const cz = (Math.floor(z) >> 4) << 4;
            const key = (cx * 1000000) + cz;

            // If this chunk is already cleared, remove the cleaner block
            if (CACHE.has(key)) {
                block.setPermutation(AIR);
                return;
            }

            // Skip if already in the processing queue
            if (QUEUED.has(key)) return;

            // Add to queue if within Gaia range
            if (GaiaDimension && GaiaDimension.isInDimension({x, z})) {
                QUEUED.add(key);
                QUEUE.push({ x: cx, z: cz, s: 0, key: key });
            }
        }
    })
})
