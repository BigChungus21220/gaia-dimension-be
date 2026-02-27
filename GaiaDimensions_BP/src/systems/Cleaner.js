import { world, BlockVolume, system, BlockPermutation } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

/**
 * PRE-CALCULATED VANILLA CLUTTER LIST
 * Static cache for zero startup lag. 
 * 'minecraft:air' at index 0 enables engine short-circuiting.
 */
const VANILLA_CLUTTER = [
    "minecraft:air",
    "minecraft:tall_grass", "minecraft:grass", "minecraft:fern", "minecraft:large_fern",
    "minecraft:deadbush", "minecraft:double_plant", "minecraft:yellow_flower", "minecraft:red_flower",
    "minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid", "minecraft:allium",
    "minecraft:azure_bluet", "minecraft:red_tulip", "minecraft:orange_tulip", "minecraft:white_tulip",
    "minecraft:pink_tulip", "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley",
    "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony",
    "minecraft:sugar_cane", "minecraft:reeds", "minecraft:cactus", "minecraft:vine",
    "minecraft:glow_lichen", "minecraft:hanging_roots", "minecraft:spore_blossom", "minecraft:moss_carpet",
    "minecraft:azalea", "minecraft:flowering_azalea", "minecraft:cave_vines", "minecraft:cave_vines_body_with_berries",
    "minecraft:big_dripleaf", "minecraft:small_dripleaf", "minecraft:sweet_berry_bush", "minecraft:bamboo",
    "minecraft:bamboo_sapling", "minecraft:sea_pickle", "minecraft:turtle_egg", "minecraft:pink_petals",
    "minecraft:cherry_sapling", "minecraft:mangrove_propagule", "minecraft:lily_pad", "minecraft:waterlily",
    "minecraft:kelp", "minecraft:seagrass", "minecraft:tall_seagrass", "minecraft:coral", "minecraft:coral_fan",
    "minecraft:brown_mushroom", "minecraft:red_mushroom", "minecraft:crimson_fungus", "minecraft:warped_fungus",
    "minecraft:crimson_roots", "minecraft:warped_roots", "minecraft:nether_sprouts", "minecraft:weeping_vines",
    "minecraft:twisting_vines", "minecraft:torchflower", "minecraft:pitcher_plant",
    "minecraft:oak_log", "minecraft:spruce_log", "minecraft:birch_log", "minecraft:jungle_log", "minecraft:acacia_log", "minecraft:dark_oak_log", "minecraft:cherry_log", "minecraft:mangrove_log",
    "minecraft:oak_leaves", "minecraft:spruce_leaves", "minecraft:birch_leaves", "minecraft:jungle_leaves", "minecraft:acacia_leaves", "minecraft:dark_oak_leaves", "minecraft:cherry_leaves", "minecraft:mangrove_leaves",
    "minecraft:snow", "minecraft:snow_layer", "minecraft:ice", "minecraft:packed_ice", "minecraft:blue_ice", "minecraft:powder_snow"
];

// PRE-CALCULATED CONSTANTS
let AIR_PERMUTATION;
let CLEAR_OPTIONS;

system.run(() => {
    try {
        AIR_PERMUTATION = BlockPermutation.resolve("minecraft:air");
        CLEAR_OPTIONS = { blockFilter: { includeTypes: VANILLA_CLUTTER } };
    } catch(e) {}
});

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

/**
 * FAST QUEUE SYSTEM
 * Processes strictly ONE slice per tick to ensure zero lag spikes.
 */
const CLEAR_QUEUE = [];

system.runInterval(() => {
    if (CLEAR_QUEUE.length === 0 || !AIR_PERMUTATION) return;
    
    const task = CLEAR_QUEUE.shift();
    try {
        task.dim.fillBlocks(
            task.volume, 
            AIR_PERMUTATION, 
            CLEAR_OPTIONS
        );
    } catch(e) {}
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            const dim = block.dimension;
            const loc = block.location;
            
            // DEFER IF CHUNK NOT LOADED
            if (!dim.isChunkLoaded(loc)) return;

            try {
                if (GaiaDimension && GaiaDimension.isInDimension(loc)) {
                    const {x, z} = chunk_corner(loc);
                    
                    // HEIGHTMAP OPTIMIZATION
                    const topBlock = dim.getTopmostBlock({ x: x + 8, z: z + 8 });
                    const maxTopY = topBlock ? topBlock.y : 0;

                    if (maxTopY >= 85) {
                        const targetMaxY = Math.min(maxTopY, 200);
                        const sliceSize = 16; // Smaller slices for smoother execution

                        for (let y = 85; y < targetMaxY; y += sliceSize) {
                            CLEAR_QUEUE.push({
                                dim,
                                volume: new BlockVolume(
                                    { x, y: y, z }, 
                                    { x: x + 15, y: Math.min(y + sliceSize - 1, targetMaxY), z: z + 15 }
                                )
                            });
                        }
                    }
                }
            } catch(e) {}

            // KILL RECURSION IMMEDIATELY
            block.setType("minecraft:air");
        }
    })
})
