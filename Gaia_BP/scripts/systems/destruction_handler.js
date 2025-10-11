import { world, system } from "@minecraft/server";

// --- Constants ---
const STAIRS_TAG = "gaiadimension:stairs";


// --- State Management (inspired by door.js) ---
// We will track all active collision/invisible blocks in this map.
const trackedBlocks = new Map(); // Key: location string, Value: { typeId: string }

/**
 * Adds a block to the tracking list. Exported for use in other component files.
 * @param {import("@minecraft/server").Block} block The block to track.
 */
export function trackBlock(block) {
    if (!block || !block.location) return;
    const locationStr = `${block.location.x},${block.location.y},${block.location.z}`;
    if (!trackedBlocks.has(locationStr)) {
        trackedBlocks.set(locationStr, { typeId: block.typeId });
    }
}

/**
 * Removes a block from the tracking list. Exported for use in other component files.
 * @param {import("@minecraft/server").BlockLocation} location The location of the block to untrack.
 */
export function untrackBlock(location) {
    if (!location) return;
    const locationStr = `${location.x},${location.y},${location.z}`;
    trackedBlocks.delete(locationStr);
}

/**
 * Initializes the cleanup interval.
 */
export function initializeDestructionHandlers() {

    system.runInterval(() => {
        // Iterate over a copy of the values, as the map can be modified during the loop.
        for (const [locationStr, blockData] of [...trackedBlocks.entries()]) {
            try {
                // The dimension is not stored, so we must assume the overworld.
                // This is a limitation but is often sufficient.
                const dimension = world.getDimension("overworld");
                const location = {
                    x: parseInt(locationStr.split(',')[0]),
                    y: parseInt(locationStr.split(',')[1]),
                    z: parseInt(locationStr.split(',')[2])
                };

                const block = dimension.getBlock(location);

                // If the block at the location is not what we are tracking, it's an orphan or gone.
                if (!block || block.typeId !== blockData.typeId) {
                    trackedBlocks.delete(locationStr);
                    continue; // Stop processing this one
                }

                let isOrphan = false;

                // --- Check for Invisible Block Orphan ---
                if (block.typeId.includes("_invisible")) { // Generic check
                    const parentBlock = block.below();
                    if (!parentBlock || !parentBlock.typeId.includes("_fence")) { // Generic check
                        isOrphan = true;
                    }
                }

                // --- Check for Stair Collision Orphan ---
                if (block.typeId.includes("_stairs_collision")) { // Generic check
                    const verticalHalf = block.permutation.getState("minecraft:vertical_half");
                    const parentBlock = (verticalHalf === "top") ? block.above() : block.below();
                    if (!parentBlock || !parentBlock.hasTag(STAIRS_TAG)) {
                        isOrphan = true;
                    }
                }

                if (isOrphan) {
                    block.setType("minecraft:air");
                    trackedBlocks.delete(locationStr); // Untrack it after deleting
                }

            } catch (e) {
                // If block is in an unloaded chunk, this will error. Remove it from tracking.
                trackedBlocks.delete(locationStr);
            }
        }
    }, 100);
}