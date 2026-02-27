import { world, system, BlockVolume, BlockPermutation } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

/**
 * OPTIMIZATION: NATIVE TAG FILTERING
 * Tags are bitmask-based in the engine (O(1) lookup).
 * This eliminates the overhead of string comparisons for 99% of clutter.
 */
const CLUTTER_TAGS = ["flower", "grass", "leaves", "log", "plant", "bush", "vine", "snow", "mushroom", "coral", "waterlily", "reeds"];
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
        // Pre-instantiate exactly ONE volume to eliminate horrd allocation overhead
        SHARED_VOL = new BlockVolume({x:0, y:0, z:0}, {x:0, y:0, z:0});
    } catch(e) {}
});

/**
 * LAG-FREE CHAINED RUNNER
 * Processes small 16-block slices and yields to the engine.
 */
function runNext() {
    if (QUEUE.length === 0 || !SHARED_VOL) return;
    
    // PRIORITY SORT: Every so often, sort queue by distance to nearest player
    if (system.currentTick % 20 === 0) {
        const players = world.getAllPlayers().filter(p => p.dimension.id === "minecraft:overworld");
        if (players.length > 0) {
            QUEUE.sort((a, b) => {
                let distA = Infinity;
                let distB = Infinity;
                for (const p of players) {
                    const loc = p.location;
                    const dA = Math.abs(a.x - loc.x) + Math.abs(a.z - loc.z);
                    const dB = Math.abs(b.x - loc.x) + Math.abs(b.z - loc.z);
                    if (dA < distA) distA = dA;
                    if (dB < distB) distB = dB;
                }
                return distA - distB;
            });
        }
    }

    const t = QUEUE[0];
    const yMin = 85 + (t.s << 4); // 16 block vertical increments
    const yMax = Math.min(yMin + 15, 200);

    SHARED_VOL.from = { x: t.x, y: yMin, z: t.z };
    SHARED_VOL.to = { x: t.x + 15, y: yMax, z: t.z + 15 };

    try {
        DIM.fillBlocks(SHARED_VOL, AIR, FILTER);
    } catch(e) {}

    t.s++;
    if (yMax >= 200) {
        QUEUE.shift();
    }
    
    if (QUEUE.length > 0) system.run(runNext);
}

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // Kill block instantly with pre-resolved permutation
            block.setPermutation(AIR);
            
            const loc = block.location;
            const cx = (Math.floor(loc.x) >> 4) << 4;
            const cz = (Math.floor(loc.z) >> 4) << 4;
            
            // Numeric bit-mask key for ultra-fast lookup (cx/cz are multiples of 16)
            const key = (cx * 1000000) + cz;

            if (CACHE.has(key)) return;
            CACHE.add(key);

            if (GaiaDimension && GaiaDimension.isInDimension(loc)) {
                const idle = QUEUE.length === 0;
                QUEUE.push({ x: cx, z: cz, s: 0 });
                if (idle) system.run(runNext);
            }
        }
    })
})
