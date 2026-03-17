import { system, world } from "@minecraft/server";
import { Vec3 } from '../Vec3.js';
import { sleep } from '../utils.js';

/**
 * Applies velocity to entities near the geyser.
 * @param {import("@minecraft/server").Dimension} dimension 
 * @param {import("@minecraft/server").Vector3} spawnPos 
 * @param {number} duration Ticks to continue pushing
 */
function pushEntities(dimension, spawnPos, duration) {
    let elapsed = 0;
    const intervalTicks = 4;
    
    const runId = system.runInterval(() => {
        if (elapsed >= duration) {
            system.clearRun(runId);
            return;
        }

        const entities = dimension.getEntities({
            location: spawnPos,
            maxDistance: 5
        });

        for (const entity of entities) {
            const pos = entity.location;
            const dx = Math.abs(pos.x - spawnPos.x);
            const dz = Math.abs(pos.z - spawnPos.z);
            const dy = pos.y - (spawnPos.y - 1.1); // relative to block top

            // Check if entity is roughly above the geyser
            if (dx < 0.7 && dz < 0.7 && dy > 0 && dy < 6) {
                try {
                    // Apply upward impulse
                    entity.applyImpulse({ x: 0, y: 0.5, z: 0 });
                } catch (e) {
                    // Some entities might not support impulse
                }
            }
        }
        
        elapsed += intervalTicks;
    }, intervalTicks);
}

/**
 * Triggers the geyser eruption logic.
 * @param {import("@minecraft/server").Block} block 
 */
async function eruptGeyser(block) {
    if (!block || !block.isValid) return;

    const dimension = block.dimension;
    const blockCenter = {
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

export function initializeGeyser() {
    system.afterEvents.scriptEventReceive.subscribe((event) => {
        if (event.id === "gaiadimension:geyser.erupt" || event.id === "gaiadimension:geyser.erupt") {
             if (event.sourceBlock) {
                 eruptGeyser(event.sourceBlock);
             }
        }
    });
}

export function registerGeyserComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:geyser", {
        onRandomTick: ({ block }) => {
            eruptGeyser(block);
        },
        onPlayerInteract: ({ block }) => {
            eruptGeyser(block);
        }
    });
}