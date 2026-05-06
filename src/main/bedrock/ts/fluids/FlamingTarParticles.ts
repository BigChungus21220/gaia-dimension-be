import { BlockCustomComponent, BlockComponentTickEvent, system } from "@minecraft/server";
import { createTrackedFire } from "@burnt-core/utils/BurnRuntimePublicApi.js";
import {
    getLocalParityHorizontalSpread,
    getLocalParityVerticalSpread,
    getLocalParityWindSample,
    getLocalParityYOffset,
    resolveLocalParityParticleCount,
} from "@burnt-core/data/events/LocalSmokeParity.js";
import { getWindSample, spawnWindAwareParticle } from "@modules/WindSystem.js";

const BUBBLE_CHANCE_PER_JAVA_TICK = 0.025;
const POP_SOUND_DELAY_TICKS = 21;
const POP_SOUND_ID = "bubble.pop";
const PRIMARY_SURFACE_FLAMING_TAR_BLOCK = "pu_bn:flaming_tar";

const FLUID_IDS = new Set([
    "pu_bn:flaming_tar", "pu_bn:flaming_tar1", "pu_bn:flaming_tar2", "pu_bn:flaming_tar3", "pu_bn:flaming_tar_down",
    "pu_bn:liquid_magma", "pu_bn:liquid_magma1", "pu_bn:liquid_magma2", "pu_bn:liquid_magma3", "pu_bn:liquid_magma_down"
]);

export class FlamingTarParticles implements BlockCustomComponent {
    onTick(event: BlockComponentTickEvent) {
        const { dimension, block } = event;
        const { location: l } = block;

        // 1. Bubbles (From Tar)
        if (block.typeId === PRIMARY_SURFACE_FLAMING_TAR_BLOCK) {
            const above = block.above();
            if (above && above.isAir) {
                if (Math.random() <= BUBBLE_CHANCE_PER_JAVA_TICK) {
                    const spawnLocation = {
                        x: l.x + (0.3 + Math.random() * 0.4),
                        y: l.y + 1,
                        z: l.z + (0.3 + Math.random() * 0.4),
                    };

                    dimension.spawnParticle("pu_bn:tar_bubbles", spawnLocation);

                    system.runTimeout(() => {
                        try {
                            dimension.playSound(POP_SOUND_ID, spawnLocation, {
                                volume: 0.75,
                                pitch: 0.78 + Math.random() * 0.08,
                            });
                        } catch {}
                    }, POP_SOUND_DELAY_TICKS);
                }
            }
        }

        // 2. Setting Fire (From Liquid Magma)
        if (Math.random() < 0.05) {
            for (let i = 0; i < 5; i++) {
                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                const dz = Math.floor(Math.random() * 3) - 1;

                if (dx === 0 && dy === 0 && dz === 0) continue;

                const nx = l.x + dx, ny = l.y + dy, nz = l.z + dz;
                const neighbor = dimension.getBlock({ x: nx, y: ny, z: nz });
                
                if (neighbor && neighbor.isValid && !neighbor.isAir && !FLUID_IDS.has(neighbor.typeId)) {
                    createTrackedFire(neighbor);
                }
            }
        }

        // 3. Smoke Particles
        if (Math.random() < 0.05) {
            const windSample = getWindSample(dimension, l);
            const particleCount = resolveLocalParityParticleCount(windSample, "light");
            const horizontalSpread = getLocalParityHorizontalSpread("light");
            const yBase = getLocalParityYOffset("light");
            const ySpread = getLocalParityVerticalSpread("light");
            const paritySample = getLocalParityWindSample(windSample, "light");

            for (let index = 0; index < particleCount; index += 1) {
                spawnWindAwareParticle(dimension, "pu_bn:small_fire_smoke", {
                    x: l.x + 0.5 + (Math.random() * 2 - 1) * horizontalSpread,
                    y: l.y + yBase + (Math.random() * 2 - 1) * ySpread,
                    z: l.z + 0.5 + (Math.random() * 2 - 1) * horizontalSpread,
                }, {
                    profile: "smoke",
                    sourceLocation: l,
                    sample: paritySample,
                });
            }
        }
        
        // 4. Lava pop sound (Randomly)
        if (Math.random() < 0.005) {
             dimension.playSound("liquid.lavapop", l);
        }
    }
}
