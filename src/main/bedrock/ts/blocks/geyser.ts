import {
    system,
    Dimension,
    Vector3,
    Block,
    BlockComponentRegistry,
    ScriptEventCommandMessageAfterEvent,
    BlockComponentRandomTickEvent,
    BlockComponentPlayerInteractEvent,
    Entity
} from "@minecraft/server";
import { sleep } from '../utils.js';

// Module augmentation for potential missing properties in the mock environment
declare module "@minecraft/server" {
    interface Block {
        readonly isValid: boolean;
    }
}

/**
 * Applies velocity to entities near the geyser.
 * @param dimension The dimension where the geyser is located.
 * @param spawnPos The position of the geyser blast.
 * @param duration Ticks to continue pushing.
 */
function pushEntities(dimension: Dimension, spawnPos: Vector3, duration: number): void {
    let elapsed: number = 0;
    const intervalTicks: number = 4;

    const runId: number = system.runInterval((): void => {
        if (elapsed >= duration) {
            system.clearRun(runId);
            return;
        }

        const entities: Entity[] = dimension.getEntities({
            location: spawnPos,
            maxDistance: 5
        });

        for (const entity of entities) {
            const pos: Vector3 = entity.location;
            const dx: number = Math.abs(pos.x - spawnPos.x);
            const dz: number = Math.abs(pos.z - spawnPos.z);
            const dy: number = pos.y - (spawnPos.y - 1.1); // relative to block top

            // Check if entity is roughly above the geyser
            if (dx < 0.7 && dz < 0.7 && dy > 0 && dy < 6) {
                try {
                    // Apply upward impulse
                    entity.applyImpulse({ x: 0, y: 0.5, z: 0 });
                } catch (e: unknown) {
                    // Some entities might not support impulse
                }
            }
        }

        elapsed += intervalTicks;
    }, intervalTicks);
}

/**
 * Triggers the geyser eruption logic.
 * @param block The geyser block.
 */
async function eruptGeyser(block: Block): Promise<void> {
    if (!block || !block.isValid) return;

    const dimension: Dimension = block.dimension;
    const blockCenter: Vector3 = {
        x: block.location.x + 0.5,
        y: block.location.y + 1.1,
        z: block.location.z + 0.5
    };

    // Initial blast sound
    dimension.playSound("geyser.blast", blockCenter);

    // Pre-steam particles
    dimension.spawnParticle("gaiadimension:geyser_pre_steam", blockCenter);

    await sleep(10);

    if (!block.isValid) return;

    // Start the physical push
    pushEntities(dimension, blockCenter, 60); // Blast for 3 seconds

    // Main steam and blast particles
    dimension.spawnParticle("gaiadimension:geyser_steam", blockCenter);
    dimension.spawnParticle("gaiadimension:geyser_blast", blockCenter);
}

/**
 * Initializes geyser event listeners.
 */
export function initializeGeyser(): void {
    system.afterEvents.scriptEventReceive.subscribe((event: ScriptEventCommandMessageAfterEvent): void => {
        if (event.id === "gaiadimension:geyser.erupt") {
             if (event.sourceBlock) {
                 eruptGeyser(event.sourceBlock);
             }
        }
    });
}

/**
 * Registers the geyser custom block component.
 * @param registry The block component registry.
 */
export function registerGeyserComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:geyser", {
        onRandomTick: (event: BlockComponentRandomTickEvent): void => {
            eruptGeyser(event.block);
        },
        onPlayerInteract: (event: BlockComponentPlayerInteractEvent): void => {
            eruptGeyser(event.block);
        }
    });
}
