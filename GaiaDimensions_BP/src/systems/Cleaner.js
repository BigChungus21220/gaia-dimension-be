import { BlockVolume, system } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

const VANILLA_CLUTTER = [
    "minecraft:tall_grass", "minecraft:grass", "minecraft:fern", "minecraft:large_fern",
    "minecraft:deadbush", "minecraft:double_plant", "minecraft:yellow_flower", "minecraft:red_flower",
    "minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid", "minecraft:allium",
    "minecraft:azure_bluet", "minecraft:red_tulip", "minecraft:orange_tulip", "minecraft:white_tulip",
    "minecraft:pink_tulip", "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley",
    "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:death_bush", "minecraft:dead_bush", "minecraft:peony",
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

const CLEAR_OPTIONS = { 
    blockFilter: { includeTypes: VANILLA_CLUTTER },
    ignoreChunkBoundErrors: true
};

const QUEUE = [];
const CACHE = new Set();

// Ultra-lightweight runner, perfectly mimicking TerrainPatching.js
system.runInterval(() => {
    if (QUEUE.length === 0) return;
    const task = QUEUE.shift();
    try {
        task.dim.fillBlocks(task.vol, "minecraft:air", CLEAR_OPTIONS);
    } catch(e) {}
}, 1);

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            // Instant termination of recursion
            block.setType("minecraft:air");

            const {x, z} = block.location;
            const cx = Math.floor(x / 16) * 16;
            const cz = Math.floor(z / 16) * 16;
            const key = cx + "," + cz;

            if (CACHE.has(key)) return;

            if (GaiaDimension && GaiaDimension.isInDimension({x, z})) {
                CACHE.add(key);
                const dim = block.dimension;
                
                // Pre-instantiate BlockVolumes to remove all logic from the runInterval
                for (let y = 85; y < 200; y += 24) {
                    QUEUE.push({
                        dim: dim,
                        vol: new BlockVolume({x: cx, y: y, z: cz}, {x: cx + 15, y: Math.min(y + 23, 200), z: cz + 15})
                    });
                }
            }
        }
    })
})
