import { world, BlockVolume, system } from "@minecraft/server"
import { GaiaDimension } from "../world/Gaia.js"

function chunk_corner({x, z}) {
    return {
        x: Math.floor(x / 16) * 16,
        z: Math.floor(z / 16) * 16,
    }
}

// this removes the overworld clutter in Gaia dimension area
system.beforeEvents.startup.subscribe(({blockComponentRegistry}) => {
    blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
        onTick({block}) {
            const overworld = world.getDimension('overworld');
            const location = block.location;
            
            // Only run if inside Gaia Dimension boundaries
            if (!GaiaDimension || !GaiaDimension.isInDimension(location)) return;

            const {x, z} = chunk_corner(location);
            
            // Optimized Filter: Target only the most common clutter
            const clearTargets = [
                'minecraft:oak_log', 'minecraft:spruce_log', 'minecraft:birch_log', 'minecraft:jungle_log', 'minecraft:acacia_log', 'minecraft:dark_oak_log', 'minecraft:mangrove_log', 'minecraft:cherry_log',
                'minecraft:oak_leaves', 'minecraft:spruce_leaves', 'minecraft:birch_leaves', 'minecraft:jungle_leaves', 'minecraft:acacia_leaves', 'minecraft:dark_oak_leaves', 'minecraft:mangrove_leaves', 'minecraft:cherry_leaves',
                'minecraft:grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:bush', 'minecraft:vine', 'minecraft:glow_lichen', 'minecraft:moss_carpet',
                'minecraft:brown_mushroom', 'minecraft:red_mushroom', 'minecraft:sugar_cane', 'minecraft:bamboo', 'minecraft:kelp', 'minecraft:seagrass', 'minecraft:tall_seagrass'
            ];

            // Clearing from Y=30 to Y=200
            // Split into 2 slices to stay under the 32,767 block limit (Total: 43,776 blocks)
            try {
                // Slice 1: Y=30 to Y=115
                overworld.fillBlocks(
                    new BlockVolume({x, y: 30, z}, {x: x + 15, y: 115, z: z + 15}), 
                    'minecraft:air', 
                    { blockFilter: { includeTypes: clearTargets } }
                );
                // Slice 2: Y=116 to Y=200
                overworld.fillBlocks(
                    new BlockVolume({x, y: 116, z}, {x: x + 15, y: 200, z: z + 15}), 
                    'minecraft:air', 
                    { blockFilter: { includeTypes: clearTargets } }
                );
            } catch(e) {}
            
            // Replace cleaner block with block below to stop ticking
            try {
                overworld.setBlockType(location, block.below().type);
            } catch(e) {
                overworld.setBlockType(location, 'minecraft:air');
            }
        }
    })
})