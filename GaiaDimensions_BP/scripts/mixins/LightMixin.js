import { world, BlockPermutation } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

export function initializeLightMixin() {
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block, dimension, player } = event;
        const dimId = dimension.id;
        let stateVal = 0; // Default / Gaia

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
}