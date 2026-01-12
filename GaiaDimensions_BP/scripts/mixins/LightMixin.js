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

        // --- Perpetual Glow System ---
        // Place light sources around the newly placed block if in Gaia
        if (player && DimensionSystem.isInGaia(player) && block.typeId !== "gaiadimension:glittering_fire") {
             const { x, y, z } = block.location;
             placeLight(dimension, { x: x + 1, y: y, z: z });
             placeLight(dimension, { x: x - 1, y: y, z: z });
             placeLight(dimension, { x: x, y: y + 1, z: z });
             placeLight(dimension, { x: x, y: y - 1, z: z });
             placeLight(dimension, { x: x, y: y, z: z + 1 });
             placeLight(dimension, { x: x, y: y, z: z - 1 });
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
            } else if (dimId === "minecraft:overworld" || dimId === "minecraft:the_end") {
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
             // Fill the broken spot with light
             placeLight(dimension, block.location);
        }
    });
}