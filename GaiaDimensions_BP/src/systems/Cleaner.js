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
const CLUTTER_TYPES = ["minecraft:deadbush", "minecraft:sugar_cane", "minecraft:bamboo", "minecraft:kelp", "minecraft:seagrass"];

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
    const yMin = 85 + (t.s * 32); // Increased to 32 block vertical increments for better throughput
    const yMax = Math.min(yMin + 31, 200);

    SHARED_VOL.from = { x: t.x, y: yMin, z: t.z };
    SHARED_VOL.to = { x: t.x + 15, y: yMax, z: t.z + 15 };

    try {
        DIM.fillBlocks(SHARED_VOL, AIR, FILTER);
    } catch(e) {}

    t.s++;
    if (yMax >= 200) {
        QUEUE.shift();
    }
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // Kill block instantly
            block.setPermutation(AIR);
            
            const loc = block.location;
            const cx = (Math.floor(loc.x) >> 4) << 4;
            const cz = (Math.floor(loc.z) >> 4) << 4;
            const key = (cx * 1000000) + cz;

            if (CACHE.has(key)) return;
            CACHE.add(key);

            if (GaiaDimension && GaiaDimension.isInDimension(loc)) {
                QUEUE.push({ x: cx, z: cz, s: 0 });
            }
        }
    })
})
