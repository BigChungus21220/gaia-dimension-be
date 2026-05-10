import { world, system, Block, Dimension, PistonActivateAfterEvent, ExplosionAfterEvent, Vector3 } from "@minecraft/server";

export interface BlockUpdateRegistration {
    check: (block: Block) => boolean;
    update: (block: Block) => void;
}

/**
 * A registry of functions to call when a block's neighbor is updated.
 */
const blockUpdateRegistry: BlockUpdateRegistration[] = [];

/**
 * Registers a component's update logic to be triggered by neighbor updates.
 * @param {BlockUpdateRegistration} registration - The registration object.
 */
export function registerForBlockUpdates(registration: BlockUpdateRegistration): void {
    blockUpdateRegistry.push(registration);
}

/**
 * This function is the core of the block update system.
 * It checks all neighbors of a given block and, if they match a registered checker,
 * it triggers their specific update function.
 *
 * @param {Block} block The block whose neighbors should be updated.
 */
function updateNeighboringBlocks(block: Block): void {
    if (!block || !block.dimension) return;

    const neighbors: (Block | undefined)[] = [
        block.north(),
        block.south(),
        block.east(),
        block.west(),
        block.above(),
        block.below()
    ];

    for (const neighbor of neighbors) {
        if (!neighbor) continue;

        // Check the registry to see if this neighbor block needs an update.
        for (const registration of blockUpdateRegistry) {
            if (registration.check(neighbor)) {
                registration.update(neighbor);
            }
        }
    }
}

// --- Event Subscriptions ---
// Listen to events that cause block changes without direct player interaction.

world.afterEvents.pistonActivate.subscribe((event: PistonActivateAfterEvent): void => {
    const { piston, dimension } = event;
    system.run(() => {
        const locations: Vector3[] = piston.getAttachedBlocks();
        for (const location of locations) {
            const block: Block | undefined = dimension.getBlock(location);
            if (block) {
                updateNeighboringBlocks(block);
            }
        }
    });
});

world.afterEvents.explosion.subscribe((event: ExplosionAfterEvent): void => {
    const { dimension } = event;
    const locations: Vector3[] = event.getImpactedBlocks();
    for (const location of locations) {
        const block: Block | undefined = dimension.getBlock(location); // This is now an air block
        if (block) {
            updateNeighboringBlocks(block);
        }
    }
});


