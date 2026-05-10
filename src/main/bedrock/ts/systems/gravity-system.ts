import { world, BlockPermutation, Block, Vector3, PlayerPlaceBlockAfterEvent, PlayerBreakBlockAfterEvent, Dimension } from "@minecraft/server";

declare module "../config/gravity-config.js" {
    export const gravityBlocks: Set<string>;
}

import { gravityBlocks } from "../config/gravity-config.js";

/**
 * Checks the block above a given location to see if it should start falling.
 * @param {Vector3} location The location of the block that was just updated.
 */
function checkAndTriggerFall(location: Vector3): void {
    const dimension: Dimension = world.getDimension("overworld");
    const blockAboveLocation: Vector3 = { x: location.x, y: location.y + 1, z: location.z };
    const blockAbove: Block | undefined = dimension.getBlock(blockAboveLocation);

    if (blockAbove && gravityBlocks.has(blockAbove.typeId)) {
        const blockBelow: Block | undefined = dimension.getBlock(location);
        if (blockBelow && blockBelow.isAir) {
            triggerFall(blockAbove);
        }
    }
}

/**
 * Checks all blocks in a column above a location and triggers a chain reaction if they are unsupported.
 * @param {Vector3} location The starting location to check from.
 */
function checkAllAbove(location: Vector3): void {
    const dimension: Dimension = world.getDimension("overworld");
    let y: number = location.y;

    while (y < dimension.heightRange.max) {
        const checkLocation: Vector3 = { x: location.x, y: y, z: location.z };
        const block: Block | undefined = dimension.getBlock(checkLocation);

        if (block && gravityBlocks.has(block.typeId)) {
            const blockBelow: Block | undefined = dimension.getBlock({ x: location.x, y: y - 1, z: location.z });
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
 * @param {Block} block The block that should "fall".
 */
function triggerFall(block: Block): void {
    const dimension: Dimension = block.dimension;
    const originalLocation: Vector3 = block.location;
    const typeId: string = block.typeId;

    if (block.isAir) {
        return; // Block is already gone, do nothing.
    }

    // Set original block to air
    block.setPermutation(BlockPermutation.resolve('minecraft:air'));

    // Find the final landing position by checking downwards
    let landingY: number = dimension.heightRange.min; // Default to bottom of the world
    for (let y: number = originalLocation.y - 1; y >= dimension.heightRange.min; y--) {
        const pos: Vector3 = { x: originalLocation.x, y: y, z: originalLocation.z };
        const blockBelow: Block | undefined = dimension.getBlock(pos);
        if (blockBelow && !blockBelow.isAir) {
            landingY = y + 1;
            break;
        }
    }

    const finalLocation: Vector3 = { x: originalLocation.x, y: landingY, z: originalLocation.z };

    // Place the block at its final destination
    try {
        const landingBlock: Block | undefined = dimension.getBlock(finalLocation);
        if (landingBlock) {
            landingBlock.setPermutation(BlockPermutation.resolve(typeId));
        }
        // After placing the block, check if the block that was originally above it needs to fall.
        checkAllAbove({ x: originalLocation.x, y: originalLocation.y + 1, z: originalLocation.z });
    } catch (e: unknown) {
        console.warn(`[Gravity] Failed to place block ${typeId} at destination. ${e}`);
    }
}


export function initializeGravitySystem(): void {
    // The animation loop is no longer needed.

    // --- EVENT LISTENERS ---
    // These listeners trigger the initial gravity check.

    world.afterEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockAfterEvent) => {
        const { block } = event;
        
        // Case 1: A gravity block is placed in the air.
        if (gravityBlocks.has(block.typeId)) {
            const blockBelow: Block | undefined = block.dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
            if (blockBelow && blockBelow.isAir) {
                // The fall is now instant, so no timeout is needed.
                triggerFall(block);
                return; 
            }
        }

        // Case 2: A normal block was placed, check if the block ABOVE it should fall.
        checkAndTriggerFall(block.location);
    });

    world.afterEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockAfterEvent) => {
        // When a block is broken, check the block that was above it to start a potential chain reaction.
        checkAllAbove({ x: event.block.location.x, y: event.block.location.y + 1, z: event.block.location.z });
    });
}

