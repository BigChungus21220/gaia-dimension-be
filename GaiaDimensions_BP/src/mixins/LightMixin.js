import { world, system, BlockPermutation } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

let lightBlockPermutation;
system.run(() => {
    try {
        lightBlockPermutation = BlockPermutation.resolve("minecraft:light_block", { "minecraft:block_light_level": 15 });
    } catch (e) {}
});

function placeLight(dimension, location) {
    if (!lightBlockPermutation) return;
    try {
        const block = dimension.getBlock(location);
        if (block && block.isAir) {
            block.setPermutation(lightBlockPermutation);
        }
    } catch (e) {}
}

export function initializeLightMixin() {
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block, dimension, player } = event;
        const dimId = dimension.id;
        let stateVal = 0; // Default / Gaia

        const typeId = block.typeId;
        const isExcluded = typeId === "gaiadimension:glittering_fire" || 
                           typeId === "gaiadimension:stairs_collision" ||
                           typeId.includes("curtain") || 
                           typeId.includes("door") ||
                           typeId.includes("fluid") ||
                           typeId.includes("liquid") ||
                           typeId.includes("water") ||
                           typeId.includes("magma") ||
                           typeId.includes("muck");

        // --- Perpetual Glow System ---
        // Place light sources around the newly placed block if in Gaia
        if (player && DimensionSystem.isInGaia(player) && !isExcluded) {
             const { x, y, z } = block.location;
             const possibleLightLocations = [
                { x: x + 1, y: y, z: z },
                { x: x - 1, y: y, z: z },
                { x: x, y: y + 1, z: z },
                { x: x, y: y - 1, z: z },
                { x: x, y: y, z: z + 1 },
                { x: x, y: y, z: z - 1 }
             ];

             for (const loc of possibleLightLocations) {
                const targetBlock = dimension.getBlock(loc);
                if (targetBlock && targetBlock.isAir) {
                    // Check if this air block is needed for a stair collision
                    const { x: tx, y: ty, z: tz } = loc;
                    const stairNeighbors = [
                        dimension.getBlock({ x: tx, y: ty + 1, z: tz }),
                        dimension.getBlock({ x: tx, y: ty - 1, z: tz })
                    ];
                    const isNeededForStair = stairNeighbors.some(n => n?.hasTag("gaiadimension:stairs"));
                    
                    if (!isNeededForStair) {
                        placeLight(dimension, loc);
                    }
                }
             }
        }

        // --- Custom Block State Logic ---
        // Check if the block has the dimension permutation property
        try {
            const currentState = block.permutation.getState("gaiadimension:perm_dim");
            if (currentState === undefined) return; // Not a supported block

            const inGaia = DimensionSystem.isInGaia({ 
                location: block.location, 
                dimension: dimension, 
                isValid: true 
            });

            if (inGaia) {
                stateVal = 0;
            } else if (dimId === "minecraft:overworld" && !inGaia) {
                stateVal = 1;
            } else if (dimId === "minecraft:nether") {
                stateVal = 2;
            }

            if (currentState !== stateVal) {
                const newPerm = block.permutation.withState("gaiadimension:perm_dim", stateVal);
                block.setPermutation(newPerm);
            }
        } catch (e) {
            // Block doesn't have the state or other error
        }
    });

    world.afterEvents.playerBreakBlock.subscribe((event) => {
        const { player, block, dimension } = event;
        if (player && DimensionSystem.isInGaia(player)) {
             // Check if there's a stair nearby that might want to place a collision block here
             const { x, y, z } = block.location;
             const neighbors = [
                dimension.getBlock({ x, y: y + 1, z }),
                dimension.getBlock({ x, y: y - 1, z })
             ];
             
             const isNearStair = neighbors.some(n => n?.hasTag("gaiadimension:stairs"));
             
             if (!isNearStair) {
                // Fill the broken spot with light if no stairs are nearby
                placeLight(dimension, block.location);
             }
        }
    });
}