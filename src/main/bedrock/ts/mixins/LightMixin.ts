import { world, system, BlockPermutation, Dimension, Vector3, Player, Block } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

let lightBlockPermutation: BlockPermutation | undefined;
system.run(() => {
    try {
        lightBlockPermutation = BlockPermutation.resolve("minecraft:light_block", { "minecraft:block_light_level": 15 });
    } catch (e) {}
});

function placeLight(dimension: Dimension, location: Vector3): void {
    // Disabled as requested
}

export function initializeLightMixin(): void {
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
        // Disabled as requested
        /*
        if (player && DimensionSystem.isInGaia(player) && !isExcluded) {
            // ... (light placement logic removed)
        }
        */

        // --- Custom Block State Logic ---
        // Check if the block has the dimension permutation property
        try {
            const currentState = block.permutation.getState("gaiadimension:perm_dim" as any);
            if (currentState === undefined) return; // Not a supported block

            const inGaia = DimensionSystem.isInGaia({ 
                location: block.location, 
                dimension: dimension, 
                isValid: true 
            } as any);

            if (inGaia) {
                stateVal = 0;
            } else if (dimId === "minecraft:overworld" && !inGaia) {
                stateVal = 1;
            } else if (dimId === "minecraft:nether") {
                stateVal = 2;
            }

            if (currentState !== stateVal) {
                const newPerm = block.permutation.withState("gaiadimension:perm_dim" as any, stateVal);
                block.setPermutation(newPerm);
            }
        } catch (e) {
            // Block doesn't have the state or other error
        }
    });

    world.afterEvents.playerBreakBlock.subscribe((event) => {
        // --- Perpetual Glow System ---
        // Disabled as requested
    });
}

