import { world, system, BlockPermutation } from "@minecraft/server";
import { gravityBlocks } from "../config/gravity-config.js";

/**
 * Checks the block above a given location to see if it should start falling.
 * @param {import("@minecraft/server").Vector3} location The location of the block that was just updated.
 */
function checkAndTriggerFall(location) {
    const dimension = world.getDimension("overworld");
    const blockAboveLocation = { x: location.x, y: location.y + 1, z: location.z };
    const blockAbove = dimension.getBlock(blockAboveLocation);

    if (blockAbove && gravityBlocks.has(blockAbove.typeId)) {
        const blockBelow = dimension.getBlock(location);
        if (blockBelow && blockBelow.isAir) {
            triggerFall(blockAbove);
        }
    }
}

/**
 * Checks all blocks in a column above a location and triggers a chain reaction if they are unsupported.
 * @param {import("@minecraft/server").Vector3} location The starting location to check from.
 */
function checkAllAbove(location) {
    const dimension = world.getDimension("overworld");
    let y = location.y;

    while (y < dimension.heightRange.max) {
        const checkLocation = { x: location.x, y: y, z: location.z };
        const block = dimension.getBlock(checkLocation);

        if (block && gravityBlocks.has(block.typeId)) {
            const blockBelow = dimension.getBlock({ x: location.x, y: y - 1, z: location.z });
            if (blockBelow && blockBelow.isAir) {
                triggerFall(block);
                // Since triggerFall is now instant and handles the next check, we can stop this loop.
                // The next check will be initiated from within triggerFall.
                return; 
            }
        } else if (block && !block.isAir) {
            // Hit a non-gravity, solid block, so the chain is broken.
            break;
        }
        y++;
    }
}

/**
 * Begins the falling process for a specific block.
 * This is now an instantaneous process.
 * @param {import("@minecraft/server").Block} block The block that should "fall".
 */
function triggerFall(block) {
    const dimension = block.dimension;
    const originalLocation = block.location;
    const typeId = block.typeId;

    if (block.isAir) {
        return; // Block is already gone, do nothing.
    }

    // Set original block to air
    block.setPermutation(BlockPermutation.resolve('minecraft:air'));

    // Find the final landing position by checking downwards
    let landingY = dimension.heightRange.min; // Default to bottom of the world
    for (let y = originalLocation.y - 1; y >= dimension.heightRange.min; y--) {
        const pos = { x: originalLocation.x, y: y, z: originalLocation.z };
        const blockBelow = dimension.getBlock(pos);
        if (blockBelow && !blockBelow.isAir) {
            landingY = y + 1;
            break;
        }
    }

    const finalLocation = { x: originalLocation.x, y: landingY, z: originalLocation.z };

    // Place the block at its final destination
    try {
        dimension.getBlock(finalLocation).setPermutation(BlockPermutation.resolve(typeId));
        // After placing the block, check if the block that was originally above it needs to fall.
        checkAllAbove({ x: originalLocation.x, y: originalLocation.y + 1, z: originalLocation.z });
    } catch (e) {
        console.warn(`[Gravity] Failed to place block ${typeId} at destination. ${e}`);
    }
}


export function initializeGravitySystem() {
    // The animation loop is no longer needed.

    // --- EVENT LISTENERS ---
    // These listeners trigger the initial gravity check.

    world.afterEvents.playerPlaceBlock.subscribe(event => {
        const { block } = event;
        
        // Case 1: A gravity block is placed in the air.
        if (gravityBlocks.has(block.typeId)) {
            const blockBelow = block.dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
            if (blockBelow && blockBelow.isAir) {
                // The fall is now instant, so no timeout is needed.
                triggerFall(block);
                return; 
            }
        }

        // Case 2: A normal block was placed, check if the block ABOVE it should fall.
        checkAndTriggerFall(block.location);
    });

    world.afterEvents.playerBreakBlock.subscribe(event => {
        // When a block is broken, check the block that was above it to start a potential chain reaction.
        checkAllAbove({ x: event.block.location.x, y: event.block.location.y + 1, z: event.block.location.z });
    });
}
