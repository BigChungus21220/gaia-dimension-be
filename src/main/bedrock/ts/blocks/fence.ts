import { system, BlockPermutation, Direction, GameMode, Block, Dimension, Vector3, Player, PlayerPlaceBlockAfterEvent, PlayerBreakBlockAfterEvent, PlayerInteractWithBlockBeforeEvent, BlockComponentRegistry, EntityInventoryComponent } from "@minecraft/server";
import { updateWallNeighborsAt } from './wall.js';
import { registerForBlockUpdates } from "../systems/BlockUpdate.js";
import { registerPlaceHandler, registerBreakHandler, registerInteractHandler } from "../systems/event_manager.js";
import { trackBlock, untrackBlock } from "../systems/destruction_handler.js";

const INVISIBLE_BLOCK_ID = "gaiadimension:invisible";

/**
 * Checks if a block is a valid, solid block that a fence can connect to.
 * @param {Block} block The block to check.
 * @returns {boolean} True if the block is connectable, otherwise false.
 */
function isConnectable(block: Block | undefined): boolean {
    if (!block) return false;
    if (block.isAir || block.isLiquid) return false;
    const typeId: string = block.typeId;
    // An expanded list of non-connectable blocks for better accuracy.
    const nonConnectableKeywords: string[] = [
        "snow", "mushroom", "grass", "fern", "flower", "sapling",
        "vine", "crop", "dead_bush", "leaves", "scaffolding", "sign",
        "banner", "torch", "lantern", "button", "lever", "invisible",
        "door", "trapdoor", "leaf_litter"
    ];
    for (const keyword of nonConnectableKeywords) {
        if (typeId.includes(keyword)) return false;
    }
    return true;
}

/**
 * Updates the visual connections of a fence block based on its neighbors.
 * @param {Block} block The fence block to update.
 */
export function updateFenceConnections(block: Block): void {
    if (!block || !block.isValid || !block.typeId.includes("fence") || block.typeId.includes("fence_gate")) return;
    try {
        let permutation = block.permutation;
        permutation = permutation.withState("gaiadimension:north" as any, isConnectable(block.north()));
        permutation = permutation.withState("gaiadimension:south" as any, isConnectable(block.south()));
        permutation = permutation.withState("gaiadimension:east" as any, isConnectable(block.east()));
        permutation = permutation.withState("gaiadimension:west" as any, isConnectable(block.west()));
        block.setPermutation(permutation);
    } catch (e) {
        // Suppress errors if the state doesn't exist on the block
    }
}

/**
 * Manages the invisible barrier block above fences and fence gates.
 * @param {Block} block The fence or fence gate block.
 */
function updateInvisibleBlock(block: Block): void {
    if (!block || !block.isValid) return;
    const blockAbove = block.above();
    if (!blockAbove) return;

    const typeId: string = block.typeId;
    const isOpen: boolean = typeId.includes("fence_gate") ? block.permutation.getState("gaiadimension:open" as any) as boolean : false;

    if (blockAbove.isAir) {
        // Place an invisible block if it's a closed gate or a regular fence.
        if ((typeId.includes("fence_gate") && !isOpen) || (typeId.includes("fence") && !typeId.includes("fence_gate"))) {
            blockAbove.setType(INVISIBLE_BLOCK_ID);
        }
    } else if (blockAbove.typeId === INVISIBLE_BLOCK_ID) {
        // Remove the invisible block if the gate is opened or a solid block is placed on top.
        if ((typeId.includes("fence_gate") && isOpen) || (!blockAbove.isAir && !blockAbove.isLiquid)) {
            blockAbove.setType("minecraft:air");
        }
    }
}

/**
 * Triggers a connection update for all adjacent fence blocks.
 * @param {Vector3} location The location around which to update neighbors.
 * @param {Dimension} dimension The dimension of the blocks.
 */
function updateNeighborsAt(location: Vector3, dimension: Dimension): void {
    const { x, y, z } = location;
    const north = dimension.getBlock({ x, y, z: z - 1 });
    const south = dimension.getBlock({ x, y, z: z + 1 });
    const east = dimension.getBlock({ x: x + 1, y, z });
    const west = dimension.getBlock({ x: x - 1, y, z });

    if (north) updateFenceConnections(north);
    if (south) updateFenceConnections(south);
    if (east) updateFenceConnections(east);
    if (west) updateFenceConnections(west);
}

/**
 * CORRECTED: Determines the cardinal direction for a fence gate based on player's view.
 * @param {Vector3} playerFacing The player's view direction vector.
 * @returns {string} The cardinal direction ("north", "south", "east", "west").
 */
function getGateDirectionFromPlayerFacing(playerFacing: Vector3): string {
    if (Math.abs(playerFacing.x) > Math.abs(playerFacing.z)) {
        return playerFacing.x > 0 ? "west" : "east";
    } else {
        return playerFacing.z > 0 ? "north" : "south";
    }
}

/**
 * Handles the interaction logic for custom fence gates (opening/closing).
 * @param {Player} player The player interacting.
 * @param {Block} block The fence gate block.
 */
function handleFenceGateInteract(player: Player, block: Block): void {
    // Only handle custom fence gates, ignore vanilla ones
    if (block.typeId.startsWith("minecraft:")) {
        return;
    }

    const isOpen = block.permutation.getState("gaiadimension:open" as any) as boolean;

    // Only toggle the 'open' state. Do not change the direction.
    let newPermutation = block.permutation
        .withState("gaiadimension:open" as any, !isOpen);

    block.setPermutation(newPermutation);
    updateInvisibleBlock(block);
    player.playSound(isOpen ? "close.fence_gate" : "open.fence_gate", { location: block.location });
}

/**
 * Registers all components, handlers, and systems for custom fences.
 */
export function registerFenceComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:fence", {});

    registerForBlockUpdates({
        check: (block: Block) => block.typeId.includes("fence") && !block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:"),
        update: updateFenceConnections
    });

    registerPlaceHandler({
        check: (block: Block) => block.typeId.includes("fence"),
        execute: (event: PlayerPlaceBlockAfterEvent) => {
            const { block, player } = event;

            // If the placed block is a custom fence gate, set its initial direction.
            if (block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:")) {
                const gateDirection = getGateDirectionFromPlayerFacing(player.getViewDirection());
                const newPermutation = block.permutation.withState("minecraft:cardinal_direction" as any, gateDirection);
                block.setPermutation(newPermutation);
            }

            // Run standard updates for all fence types.
            updateFenceConnections(block);
            updateInvisibleBlock(block);
            updateNeighborsAt(block.location, block.dimension);
        }
    });

    registerBreakHandler({
        event: "after",
        check: () => true, // Handle all block breaks to update neighbors
        execute: (event: PlayerBreakBlockAfterEvent) => {
            const { dimension } = event;
            const location = event.block.location;

            // Remove invisible block above the broken block (if any)
            const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
            if (blockAbove && blockAbove.typeId === INVISIBLE_BLOCK_ID) {
                blockAbove.setType("minecraft:air");
            }

            const blockBelow = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
            if (blockBelow && blockBelow.typeId.includes("fence") && !blockBelow.typeId.startsWith("minecraft:")) {
                const fenceTop = dimension.getBlock({ x: location.x, y: location.y, z: location.z });
                if (fenceTop && fenceTop.isAir) {
                    fenceTop.setType(INVISIBLE_BLOCK_ID);
                }
            }

            // Update neighbors of the broken block's location
            updateNeighborsAt(location, dimension);
            updateWallNeighborsAt(location, dimension);
        }
    });

    registerInteractHandler({
        check: (block: Block) => block.typeId.includes("fence") || block.typeId === INVISIBLE_BLOCK_ID,
        execute: (event: PlayerInteractWithBlockBeforeEvent) => {
            const { player, block, blockFace, itemStack } = event;

            // Handle fence gate opening/closing
            if (block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:")) {
                if (!(player.isSneaking && blockFace === Direction.Up)) {
                    event.cancel = true;
                    system.run(() => handleFenceGateInteract(player, block));
                    return;
                }
            }

            // Handle item placement on top of fences
            if (itemStack) {
                // Case 1: Placing a block into the invisible block space
                if (block.typeId === INVISIBLE_BLOCK_ID) {
                    const blockBelow = block.below();
                    if (blockBelow && blockBelow.typeId.includes("fence")) {
                        event.cancel = true;
                        system.run(() => {
                            if (!block.isValid) return;
                            block.setType(itemStack.typeId);
                            player.playSound("dig.wood", { location: block.location });
                            if (player.gameMode !== GameMode.Creative) {
                                const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
                                const container = inventory.container;
                                const item = container.getItem(player.selectedSlot);
                                if (item) {
                                    if (item.amount === 1) {
                                        container.setItem(player.selectedSlot, undefined);
                                    } else {
                                        item.amount--;
                                        container.setItem(player.selectedSlot, item);
                                    }
                                }
                            }
                            // Update the newly placed block and its neighbors
                            const newBlock = block;
                            updateFenceConnections(newBlock);
                            updateInvisibleBlock(newBlock);
                            updateNeighborsAt(newBlock.location, newBlock.dimension);
                        });
                    }
                    // Case 2: Sneaking or clicking the top face to place a block above a fence
                } else if (blockFace === Direction.Up || player.isSneaking) {
                    event.cancel = true;
                    system.run(() => {
                        if (!block.isValid) return;
                        const blockAbove = block.above();
                        if (blockAbove && (blockAbove.isAir || blockAbove.typeId === INVISIBLE_BLOCK_ID)) {
                            try {
                                blockAbove.setType(itemStack.typeId);
                            } catch (e) {}
                            player.playSound("dig.wood", { location: blockAbove.location });

                            if (player.gameMode !== GameMode.Creative) {
                                const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
                                const container = inventory.container;
                                const item = container.getItem(player.selectedSlot);
                                if (item) {
                                    if (item.amount === 1) {
                                        container.setItem(player.selectedSlot, undefined);
                                    } else {
                                        item.amount--;
                                        container.setItem(player.selectedSlot, item);
                                    }
                                }
                            }

                            // Update the newly placed block and its neighbors
                            const newBlock = block.above();
                            if (newBlock) {
                                updateFenceConnections(newBlock);
                                updateInvisibleBlock(newBlock);
                                updateNeighborsAt(newBlock.location, newBlock.dimension);
                            }
                        }
                    });
                }
            }
        }
    });
}


