import { world, system, BlockVolume, BlockPermutation } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

/**
 * OPTIMIZATION: NATIVE TAG FILTERING
 * Using native bitmask tags is O(1) in the engine.
 */
const CLUTTER_TAGS = [
    "grass", "plant", "snow", "leaves", "log", "wood",
    "acacia", "birch", "dark_oak", "jungle", "oak", "spruce",
    "minecraft:is_shears_item_destructible", 
    "minecraft:is_hoe_item_destructible",
    "minecraft:crop", "flower", "bush", "vine", "mushroom", "coral", "waterlily", "reeds"
];
const CLUTTER_TYPES = ["minecraft:deadbush", "minecraft:sugar_cane", "minecraft:bamboo", "minecraft:kelp", "minecraft:glow_lichen"];

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
    if (QUEUE.length === 0 || !SHARED_VOL) return;
    
    const t = QUEUE[0];
    const yMin = 85 + (t.s * 32);
    const yMax = Math.min(yMin + 31, 200);

    SHARED_VOL.from = { x: t.x, y: yMin, z: t.z };
    SHARED_VOL.to = { x: t.x + 15, y: yMax, z: t.z + 15 };

    try {
        t.dim.fillBlocks(SHARED_VOL, AIR, FILTER);
        
        t.s++;
        if (yMax >= 200) {
            CACHE.add(t.key);
            QUEUED.delete(t.key);
            QUEUE.shift();
        }
    } catch(e) {
        // If it fails (e.g. unloaded), move to back of queue to retry later
        // This ensures the chunk is NEVER lost if it's temporarily unloaded
        QUEUE.push(QUEUE.shift());
    }
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // Kill block instantly with pre-resolved permutation (fastest possible)
            block.setPermutation(AIR);
            
            const {x, z} = block.location;
            const cx = (Math.floor(x) >> 4) << 4;
            const cz = (Math.floor(z) >> 4) << 4;
            const key = (cx * 1000000) + cz;

            // Only skip if fully cleared or already in progress
            if (CACHE.has(key) || QUEUED.has(key)) return;

            if (GaiaDimension && GaiaDimension.isInDimension({x, z})) {
                QUEUED.add(key);
                QUEUE.push({ x: cx, z: cz, s: 0, key: key, dim: block.dimension });
            }
        }
    })
})
