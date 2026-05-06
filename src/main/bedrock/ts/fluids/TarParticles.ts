import {BlockCustomComponent, BlockComponentTickEvent} from "@minecraft/server";

import {system} from "@minecraft/server";

const BUBBLE_CHANCE_PER_JAVA_TICK = 0.025;
const POP_SOUND_DELAY_TICKS = 21;
const POP_SOUND_ID = "bubble.pop";
const PRIMARY_SURFACE_TAR_BLOCK = "pu_bn:tar";

export class TarParticles implements BlockCustomComponent {
    onTick(event: BlockComponentTickEvent) {
        const {block} = event;
        if (block.typeId !== PRIMARY_SURFACE_TAR_BLOCK) return;

        const spawnY = block.location.y + 1;
        const above = block.above();
        if (!above || !above.isAir) return;

        if (Math.random() <= BUBBLE_CHANCE_PER_JAVA_TICK) {
            const spawnLocation = {
                x: block.location.x + (0.3 + Math.random() * 0.4),
                y: spawnY,
                z: block.location.z + (0.3 + Math.random() * 0.4),
            };

            block.dimension.spawnParticle("pu_bn:tar_bubbles", spawnLocation);

            const soundLocation = {
                x: spawnLocation.x,
                y: spawnLocation.y + 0.05,
                z: spawnLocation.z,
            };
            const dimension = block.dimension;

            system.runTimeout(() => {
                try {
                    dimension.playSound(POP_SOUND_ID, soundLocation, {
                        volume: 0.75,
                        pitch: 0.78 + Math.random() * 0.08,
                    });
                } catch {}
            }, POP_SOUND_DELAY_TICKS);
        }
    }
}
