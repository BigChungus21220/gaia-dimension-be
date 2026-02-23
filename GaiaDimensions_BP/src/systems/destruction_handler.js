import { world, system } from "@minecraft/server";

// @Constants 
const STAIRS_TAG = "gaiadimension:stairs";


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
        trackedBlocks.set(locationStr, {
            typeId: block.typeId,
            dimensionId: block.dimension.id // Cache the dimension ID
        });
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
                // Use the cached dimension ID to get the dimension directly.
                const dimension = world.getDimension(blockData.dimensionId);
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

                // @ Check for Invisible Block Orphan ---
                if (block.typeId.includes("_invisible")) { // Generic check
                    const parentBlock = block.below();
                    if (!parentBlock || !parentBlock.typeId.includes("_fence")) { // Generic check
                        isOrphan = true;
                    }
                }

                // @ Check for Stair Collision Orphan ---
                if (block.typeId.includes("stairs_collision")) { // Generic check
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
                // If block is in an unloaded chunk, or dimensionId is invalid, this will error.
                // In either case, we should remove it from tracking.
                trackedBlocks.delete(locationStr);
            }
        }
    }, 100);
}

// @ Untracked Block Scanner (Safety Net) ---
const UNTRACKED_SCAN_INTERVAL = 149; // Approx 7.5 seconds, prime number to avoid sync with other intervals
const UNTRACKED_SCAN_DISTANCE = 5;   // How far in front of the player to check

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const headLoc = player.getHeadLocation();
        const direction = player.getViewDirection();
        const dimension = player.dimension;

        // Check a few blocks in a line in front of the player
        for (let i = 1; i <= UNTRACKED_SCAN_DISTANCE; i++) {
            const checkLoc = {
                x: Math.floor(headLoc.x + direction.x * i),
                y: Math.floor(headLoc.y + direction.y * i),
                z: Math.floor(headLoc.z + direction.z * i)
            };
            const locStr = `${checkLoc.x},${checkLoc.y},${checkLoc.z}`;

            // Don't check blocks we are already tracking.
            if (trackedBlocks.has(locStr)) continue;

            try {
                const block = dimension.getBlock(checkLoc);
                if (block && (block.typeId.includes("_invisible") || block.typeId.includes("stairs_collision"))) {
                    // Found an untracked special block. Check if it's an orphan.
                    let isOrphan = false;
                    if (block.typeId.includes("_invisible")) {
                        const parentBlock = block.below();
                        if (!parentBlock || !parentBlock.typeId.includes("_fence")) { 
                            isOrphan = true;
                        }
                    }
                    if (block.typeId.includes("stairs_collision")) {
                        const verticalHalf = block.permutation.getState("minecraft:vertical_half");
                        const parentBlock = (verticalHalf === "top") ? block.above() : block.below();
                        if (!parentBlock || !parentBlock.hasTag(STAIRS_TAG)) {
                            isOrphan = true;
                        }
                    }

                    if (isOrphan) {
                        block.setType("minecraft:air");
                    }
                    
                    // Since we found and processed one, we can stop scanning for this player this interval.
                    break; 
                }
            } catch(e) {
                // Block is probably in an unloaded chunk, stop scanning, catch error here
                break;
            }
        }
    }
}, UNTRACKED_SCAN_INTERVAL);