import { system, BlockPermutation, Direction, GameMode } from "@minecraft/server";
import { registerForBlockUpdates } from "../systems/BlockUpdate.js";
import { registerPlaceHandler, registerBreakHandler, registerInteractHandler } from "../systems/event_manager.js";
import { trackBlock, untrackBlock } from "../systems/destruction_handler.js";

const INVISIBLE_BLOCK_ID = "gaiadimension:invisible";

/**
 * Checks if a block is a valid, solid block that a wall can connect to.
 * @param {import("@minecraft/server").Block} block The block to check.
 * @returns {boolean} True if the block is connectable, otherwise false.
 */
function isConnectable(block) {
    if (!block) return false;
    if (block.isAir || block.isLiquid) return false;
    const typeId = block.typeId;
    // An expanded list of non-connectable blocks for better accuracy.
    const nonConnectableKeywords = [
        "snow", "mushroom", "grass", "fern", "flower", "sapling",
        "vine", "crop", "dead_bush", "leaves", "scaffolding", "sign",
        "banner", "torch", "lantern", "button", "lever", "invisible",
        "door", "trapdoor", "leaf_litter"
    ];
    // Walls should also connect to other walls and fences
    if (typeId.includes("wall") || typeId.includes("fence")) return true;

    for (const keyword of nonConnectableKeywords) {
        if (typeId.includes(keyword)) return false;
    }
    return true;
}

/**
 * Updates the visual connections of a wall block based on its neighbors.
 * @param {import("@minecraft/server").Block} block The wall block to update.
 */
export function updateWallConnections(block) {
    if (!block || !block.typeId.includes("wall")) return;
    try {
        let permutation = block.permutation;
        const blockAbove = block.above();
        const isWallAbove = blockAbove?.typeId.includes("wall");

        // North
        let northConnect = isConnectable(block.north());
        if (!northConnect && isWallAbove && isConnectable(blockAbove.north())) {
            northConnect = true;
        }
        permutation = permutation.withState("gaiadimension:north", northConnect);

        // South
        let southConnect = isConnectable(block.south());
        if (!southConnect && isWallAbove && isConnectable(blockAbove.south())) {
            southConnect = true;
        }
        permutation = permutation.withState("gaiadimension:south", southConnect);

        // East
        let eastConnect = isConnectable(block.east());
        if (!eastConnect && isWallAbove && isConnectable(blockAbove.east())) {
            eastConnect = true;
        }
        permutation = permutation.withState("gaiadimension:east", eastConnect);

        // West
        let westConnect = isConnectable(block.west());
        if (!westConnect && isWallAbove && isConnectable(blockAbove.west())) {
            westConnect = true;
        }
        permutation = permutation.withState("gaiadimension:west", westConnect);

        // Above
        permutation = permutation.withState("gaiadimension:above", isConnectable(block.above()));

        block.setPermutation(permutation);
    } catch (e) {
        // Suppress errors if the state doesn't exist on the block
    }
}

/**
 * Manages the invisible barrier block above walls.
 * @param {import("@minecraft/server").Block} block The wall block.
 */
function updateInvisibleBlock(block) {
    if (!block) return;
    const blockAbove = block.above();
    if (!blockAbove) return;

    if (blockAbove.isAir) {
        blockAbove.setType(INVISIBLE_BLOCK_ID);
    } else if (blockAbove.typeId === INVISIBLE_BLOCK_ID) {
        if (!blockAbove.isAir && !blockAbove.isLiquid) {
            blockAbove.setType("minecraft:air");
        }
    }
}

/**
 * Triggers a connection update for all adjacent wall blocks.
 * @param {import("@minecraft/server").Vector3} location The location around which to update neighbors.
 * @param {import("@minecraft/server").Dimension} dimension The dimension of the blocks.
 */
function updateNeighborsAt(location, dimension) {
    const { x, y, z } = location;
    const directNeighbors = [
        dimension.getBlock({ x, y, z: z - 1 }), // North
        dimension.getBlock({ x, y, z: z + 1 }), // South
        dimension.getBlock({ x: x + 1, y, z }), // East
        dimension.getBlock({ x: x - 1, y, z })  // West
    ];

    for (const block of directNeighbors) {
        if (block) updateWallConnections(block);
    }

    // Also update the neighbors of the block below the location of change.
    const belowLocation = { x, y: y - 1, z };
    const belowNeighbors = [
        dimension.getBlock({ x: belowLocation.x, y: belowLocation.y, z: belowLocation.z - 1 }), // North
        dimension.getBlock({ x: belowLocation.x, y: belowLocation.y, z: belowLocation.z + 1 }), // South
        dimension.getBlock({ x: belowLocation.x + 1, y: belowLocation.y, z: belowLocation.z }), // East
        dimension.getBlock({ x: belowLocation.x - 1, y: belowLocation.y, z: belowLocation.z })  // West
    ];

    for (const block of belowNeighbors) {
        if (block) updateWallConnections(block);
    }
}

/**
 * Registers all components, handlers, and systems for custom walls.
 */
export function registerWallComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:wall", {});

    registerForBlockUpdates({
        check: (block) => block.typeId.includes("wall") && !block.typeId.startsWith("minecraft:"),
        update: updateWallConnections
    });

    registerPlaceHandler({
        check: (block) => block.typeId.includes("wall"),
        execute: (event) => {
            const { block } = event;
            updateWallConnections(block);
            updateInvisibleBlock(block);
            updateNeighborsAt(block.location, block.dimension);
        }
    });

    registerBreakHandler({
        event: "after",
        check: (event) => true, // Handle all block breaks to update neighbors
        execute: (event) => {
            const { dimension } = event;
            const location = event.block.location;

            // Remove invisible block above the broken block (if any)
            const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
            if (blockAbove && blockAbove.typeId === INVISIBLE_BLOCK_ID) {
                untrackBlock(blockAbove.location);
                blockAbove.setType("minecraft:air");
            }

            const blockBelow = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
            if (blockBelow && blockBelow.typeId.includes("wall") && !blockBelow.typeId.startsWith("minecraft:")) {
                const wallTop = dimension.getBlock({ x: location.x, y: location.y, z: location.z });
                if (wallTop && wallTop.isAir) {
                    wallTop.setType(INVISIBLE_BLOCK_ID);
                }
            }

            // Update neighbors of the broken block's location
            updateNeighborsAt(location, dimension);
        }
    });

    registerInteractHandler({
        check: (block) => block.typeId.includes("wall") || block.typeId === INVISIBLE_BLOCK_ID,
        execute: (event) => {
            const { player, block, blockFace, itemStack } = event;

            // Handle item placement on top of walls
            if (itemStack) {
                // Case 1: Placing a block into the invisible block space
                if (block.typeId === INVISIBLE_BLOCK_ID) {
                    const blockBelow = block.below();
                    if (blockBelow && blockBelow.typeId.includes("wall")) {
                        event.cancel = true;
                        system.run(() => {
                            block.setType(itemStack.typeId);
                            player.playSound("dig.stone", { location: block.location });

                            // Update the wall below to connect to the new block
                            updateWallConnections(blockBelow);

                            if (player.gameMode !== GameMode.creative) {
                                const inventory = player.getComponent("inventory");
                                const container = inventory.container;
                                const item = container.getItem(player.selectedSlot);
                                if (item.amount === 1) {
                                    container.setItem(player.selectedSlot);
                                } else {
                                    item.amount--;
                                    container.setItem(player.selectedSlot, item);
                                }
                            }
                            // Update the newly placed block and its neighbors
                            const newBlock = block;
                            updateWallConnections(newBlock);
                            updateInvisibleBlock(newBlock);
                            updateNeighborsAt(newBlock.location, newBlock.dimension);
                        });
                    }
                // Case 2: Sneaking or clicking the top face to place a block above a wall
                } else if (blockFace === Direction.Up || player.isSneaking) {
                    event.cancel = true;
                    system.run(() => {
                        const blockAbove = block.above();
                        if (blockAbove && (blockAbove.isAir || blockAbove.typeId === INVISIBLE_BLOCK_ID)) {
                            try {
                                blockAbove.setType(itemStack.typeId);
                            } catch (e) {}
                            player.playSound("dig.stone", { location: blockAbove.location });

                            if (player.gameMode !== GameMode.creative) {
                                const inventory = player.getComponent("inventory");
                                const container = inventory.container;
                                const item = container.getItem(player.selectedSlot);
                                if (item.amount === 1) {
                                    container.setItem(player.selectedSlot);
                                } else {
                                    item.amount--;
                                    container.setItem(player.selectedSlot, item);
                                }
                            }

                            // Update the newly placed block and its neighbors
                            const newBlock = block.above();
                            updateWallConnections(newBlock);
                            updateInvisibleBlock(newBlock);
                            updateNeighborsAt(newBlock.location, newBlock.dimension);
                        }
                    });
                }
            }
        }
    });
}
