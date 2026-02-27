import { world, BlockVolume, system } from "@minecraft/server"
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

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            const dim = block.dimension;
            const loc = block.location;
            
            // KILL RECURSION IMMEDIATELY
            block.setType("minecraft:air");

            if (!GaiaDimension || !GaiaDimension.isInDimension(loc)) return;

            const {x, z} = chunk_corner(loc);
            
            try {
                // HEIGHTMAP OPTIMIZATION: Skip air-only chunks entirely
                const maxTopY = dim.getHeight({x: x + 8, z: z + 8});
                if (maxTopY < 85) return;

                /**
                 * DIRECT EXECUTION: No queue, no scheduler.
                 * Because of the air-short-circuiting and heightmap skipping, 
                 * we can safely clear the entire chunk segment in a single call.
                 */
                dim.fillBlocks(
                    new BlockVolume({x, y: 85, z}, {x: x + 15, y: Math.min(maxTopY, 200), z: z + 15}), 
                    'minecraft:air', 
                    { blockFilter: { includeTypes: VANILLA_CLUTTER } }
                );
            } catch(e) {}
        }
    })
})
