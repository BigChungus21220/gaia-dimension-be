import { 
    BlockComponentRandomTickEvent, 
    BlockComponentRegistry, 
    BlockCustomComponent, 
    system,
    Vector3
} from "@minecraft/server";
import { leafParticles } from "../config/leaves_particles_config.js";

// Module augmentation for methods that might be missing in some type definitions
declare module "@minecraft/server" {
    interface Block {
        /**
         * Returns the center point of the block.
         */
        center(): Vector3;
    }
}

/**
 * Custom component for leaf blocks that handles ambient particle effects.
 */
class LeavesComponent implements BlockCustomComponent {
    constructor() {
        this.onRandomTick = this.onRandomTick.bind(this);
    }

    /**
     * Spawns leaf particles randomly during a block tick.
     * @param {BlockComponentRandomTickEvent} event The block component random tick event.
     */
    onRandomTick(event: BlockComponentRandomTickEvent): void {
        // Make particle spawning 10x rarer than a typical random tick
        if (Math.random() < 0.1) {
            const { block, dimension } = event;
            const particle: string | undefined = leafParticles[block.typeId];

            if (particle) {
                // Spawning particles is a world edit, so it should be done in a system.run
                // to ensure it's executed in a safe timing context.
                system.run(() => {
                    if (!block.isValid) return;
                    dimension.spawnParticle(particle, block.center());
                });
            }
        }
    }
}

/**
 * Registers the custom leaves component to the block component registry.
 * @param {Object} param0 - Object containing the block component registry.
 * @param {BlockComponentRegistry} param0.blockComponentRegistry - The registry instance.
 */
export function registerLeavesComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:leaves", new LeavesComponent());
}
