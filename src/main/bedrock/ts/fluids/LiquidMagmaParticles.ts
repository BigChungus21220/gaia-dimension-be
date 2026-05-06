import { createTrackedFire } from "@burnt-core/utils/BurnRuntimePublicApi.js";
import { BlockComponentRandomTickEvent,BlockComponentTickEvent,BlockCustomComponent } from "@minecraft/server";
import {
    getLocalParityHorizontalSpread,
    getLocalParityVerticalSpread,
    getLocalParityWindSample,
    getLocalParityYOffset,
    resolveLocalParityParticleCount,
} from "@burnt-core/data/events/LocalSmokeParity.js";
import { getWindSample, spawnWindAwareParticle } from "@modules/WindSystem.js";

// Cache for neighbors to avoid get block calls
const FLUID_IDS = new Set([
    "pu_bn:liquid_magma", "pu_bn:liquid_magma1", "pu_bn:liquid_magma2", "pu_bn:liquid_magma3", "pu_bn:liquid_magma_down"
]);

export class LiquidMagmaParticles implements BlockCustomComponent {
    onTick(event: BlockComponentTickEvent) {
        const { dimension, block } = event;
        const { location: l } = block;
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

        const config = {number: 0.05}
        if (Math.random() < 1 - config.number) return;
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
    onRandomTick(event: BlockComponentRandomTickEvent) {
        const { dimension, block } = event;
        const { location: l } = block;
        dimension.spawnParticle("pu_bn:fragile_magma_pop", {
            x: l.x + 0.5, y: l.y + 1.25, z: l.z + 0.5
        });
        dimension.playSound("liquid.lavapop", l);
    }
}
