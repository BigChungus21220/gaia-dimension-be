import { 
    system, 
    BlockPermutation, 
    Direction, 
    GameMode, 
    Block, 
    Dimension, 
    Vector3, 
    PlayerPlaceBlockAfterEvent, 
    PlayerInteractWithBlockBeforeEvent, 
    BlockComponentRegistry, 
    EntityInventoryComponent, 
    Container, 
    ItemStack,
    Player
} from "@minecraft/server";
import { registerForBlockUpdates } from "../systems/BlockUpdate.js";
import { registerPlaceHandler, registerInteractHandler } from "../systems/event_manager.js";

const INVISIBLE_BLOCK_ID: string = "gaiadimension:invisible";

/**
 * Checks if a block is a valid, solid block that a wall can connect to.
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
    // Walls should also connect to other walls and fences
    if (typeId.includes("wall") || typeId.includes("fence")) return true;

    for (const keyword of nonConnectableKeywords) {
        if (typeId.includes(keyword)) return false;
    }
    return true;
}

/**
 * Updates the visual connections of a wall block based on its neighbors.
 * @param {Block} block The wall block to update.
 */
export function updateWallConnections(block: Block): void {
    if (!block || !block.isValid || !block.typeId.includes("wall")) return;
    try {
        let permutation: BlockPermutation = block.permutation;
        const blockAbove: Block | undefined = block.above();
        const isWallAbove: boolean = blockAbove?.typeId.includes("wall") ?? false;

        // North
        let northConnect: boolean = isConnectable(block.north());
        if (!northConnect && isWallAbove && blockAbove && isConnectable(blockAbove.north())) {
            northConnect = true;
        }
        permutation = permutation.withState("gaiadimension:north", northConnect);

        // South
        let southConnect: boolean = isConnectable(block.south());
        if (!southConnect && isWallAbove && blockAbove && isConnectable(blockAbove.south())) {
            southConnect = true;
        }
        permutation = permutation.withState("gaiadimension:south", southConnect);

        // East
        let eastConnect: boolean = isConnectable(block.east());
        if (!eastConnect && isWallAbove && blockAbove && isConnectable(blockAbove.east())) {
            eastConnect = true;
        }
        permutation = permutation.withState("gaiadimension:east", eastConnect);

        // West
        let westConnect: boolean = isConnectable(block.west());
        if (!westConnect && isWallAbove && blockAbove && isConnectable(blockAbove.west())) {
            westConnect = true;
        }
        permutation = permutation.withState("gaiadimension:west", westConnect);

        // Above
        permutation = permutation.withState("gaiadimension:above", isConnectable(block.above()));

        block.setPermutation(permutation);
    } catch (e: unknown) {
        // Suppress errors if the state doesn't exist on the block
    }
}

/**
 * Manages the invisible barrier block above walls.
 * @param {Block} block The wall block.
 */
function updateInvisibleBlock(block: Block): void {
    if (!block || !block.isValid) return;
    const blockAbove: Block | undefined = block.above();
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
 * @param {Vector3} location The location around which to update neighbors.
 * @param {Dimension} dimension The dimension of the blocks.
 */
export function updateWallNeighborsAt(location: Vector3, dimension: Dimension): void {
    const { x, y, z } = location;
    const neighbors: (Block | undefined)[] = [
        dimension.getBlock({ x, y, z: z - 1 }), // North
        dimension.getBlock({ x, y, z: z + 1 }), // South
        dimension.getBlock({ x: x + 1, y, z }), // East
        dimension.getBlock({ x: x - 1, y, z }), // West
        dimension.getBlock({ x, y: y + 1, z }), // Above
        dimension.getBlock({ x, y: y - 1, z })  // Below
    ];

    for (const neighbor of neighbors) {
        if (neighbor) {
            updateWallConnections(neighbor);
        }
    }
}

/**
 * Registers all components, handlers, and systems for custom walls.
 */
export function registerWallComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:wall", {});

    registerForBlockUpdates({
        check: (block: Block): boolean => block.typeId.includes("wall") && !block.typeId.startsWith("minecraft:"),
        update: updateWallConnections
    });

    registerPlaceHandler({
        check: (block: Block): boolean => block.typeId.includes("wall") && !block.typeId.startsWith("minecraft:"),
        execute: (event: PlayerPlaceBlockAfterEvent): void => {
            const { block } = event;
            updateWallConnections(block);
            updateInvisibleBlock(block);
            updateWallNeighborsAt(block.location, block.dimension);
        }
    });

    registerInteractHandler({
        check: (block: Block): boolean => block.typeId.includes("wall") || block.typeId === INVISIBLE_BLOCK_ID,
        execute: (event: PlayerInteractWithBlockBeforeEvent): void => {
            const { player, block, blockFace, itemStack } = event;

            // Handle item placement on top of walls
            if (itemStack) {
                // Case 1: Placing a block into the invisible block space
                if (block.typeId === INVISIBLE_BLOCK_ID) {
                    const blockBelow: Block | undefined = block.below();
                    if (blockBelow && blockBelow.typeId.includes("wall")) {
                        event.cancel = true;
                        system.run(() => {
                            if (!block.isValid) return;
                            block.setType(itemStack.typeId);
                            player.playSound("dig.stone", { location: block.location });

                            // Update the wall below to connect to the new block
                            updateWallConnections(blockBelow);

                            if (player.getGameMode() !== GameMode.Creative) {
                                const inventory: EntityInventoryComponent | undefined = player.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
                                const container: Container | undefined = inventory?.container;
                                if (container) {
                                    const item: ItemStack | undefined = container.getItem(player.selectedSlot);
                                    if (item) {
                                        if (item.amount === 1) {
                                            container.setItem(player.selectedSlot, undefined);
                                        } else {
                                            item.amount--;
                                            container.setItem(player.selectedSlot, item);
                                        }
                                    }
                                }
                            }
                            // Update the newly placed block and its neighbors
                            const newBlock: Block = block;
                            updateWallConnections(newBlock);
                            updateInvisibleBlock(newBlock);
                            updateWallNeighborsAt(newBlock.location, newBlock.dimension);
                        });
                    }
                // Case 2: Sneaking or clicking the top face to place a block above a wall
                } else if (blockFace === Direction.Up || player.isSneaking) {
                    event.cancel = true;
                    system.run(() => {
                        if (!block.isValid) return;
                        const blockAbove: Block | undefined = block.above();
                        if (blockAbove && (blockAbove.isAir || blockAbove.typeId === INVISIBLE_BLOCK_ID)) {
                            try {
                                blockAbove.setType(itemStack.typeId);
                            } catch (e: unknown) {}
                            player.playSound("dig.stone", { location: blockAbove.location });

                            if (player.getGameMode() !== GameMode.Creative) {
                                const inventory: EntityInventoryComponent | undefined = player.getComponent("minecraft:inventory") as EntityInventoryComponent | undefined;
                                const container: Container | undefined = inventory?.container;
                                if (container) {
                                    const item: ItemStack | undefined = container.getItem(player.selectedSlot);
                                    if (item) {
                                        if (item.amount === 1) {
                                            container.setItem(player.selectedSlot, undefined);
                                        } else {
                                            item.amount--;
                                            container.setItem(player.selectedSlot, item);
                                        }
                                    }
                                }
                            }

                            // Update the newly placed block and its neighbors
                            const newBlock: Block | undefined = block.above();
                            if (newBlock) {
                                updateWallConnections(newBlock);
                                updateInvisibleBlock(newBlock);
                                updateWallNeighborsAt(newBlock.location, newBlock.dimension);
                            }
                        }
                    });
                }
            }
        }
    });
}
