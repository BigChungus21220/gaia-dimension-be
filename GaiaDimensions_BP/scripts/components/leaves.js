import { system } from "@minecraft/server";
import { leafParticles } from "../config/leaves_particles_config.js";

class LeavesComponent {
    constructor() {
        this.onRandomTick = this.onRandomTick.bind(this);
    }

    onRandomTick(event) {
        // Make particle spawning 10x rarer
        if (Math.random() < 0.1) {
            const { block, dimension } = event;
            const particle = leafParticles[block.typeId];

            if (particle) {
                // Spawning particles is a world edit, so it should be done in a system.run
                system.run(() => {
                    dimension.spawnParticle(particle, block.center());
                });
            }
        }
    }
}

export function registerLeavesComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:leaves", new LeavesComponent());
}