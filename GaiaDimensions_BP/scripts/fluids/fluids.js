import { system, world, BlockPermutation } from "@minecraft/server";

// --- Fluid Definitions ---
const FLUID_DEFINITIONS = {
    "liquid_aura": { isHot: false, suffix: "aura" },
    "liquid_bismuth": { isHot: true, suffix: "bismuth" },
    "mineral_water": { isHot: false, suffix: "mineral_water" },
    "superhot_magma": { isHot: true, suffix: "superhot_magma" },
    "sweet_muck": { isHot: false, suffix: "sweet_muck" },
};

// --- Generate Full Fluid ID Sets and Flow Mappings ---
const ALL_FLUID_IDS = new Set();
const HOT_FLUID_IDS = new Set();
const FLOW_MAP = {}; // Maps a fluid state to the next one

for (const baseId in FLUID_DEFINITIONS) {
    const def = FLUID_DEFINITIONS[baseId];
    const sourceId = `gaia:${baseId}`;
    const downId = `gaia:${baseId}_down`;
    const flowIds = [
        `gaia:liquid${def.suffix}1`,
        `gaia:liquid${def.suffix}2`,
        `gaia:liquid${def.suffix}3`,
    ];

    // Add to sets
    ALL_FLUID_IDS.add(sourceId).add(downId);
    if (def.isHot) HOT_FLUID_IDS.add(sourceId).add(downId);

    flowIds.forEach(id => {
        ALL_FLUID_IDS.add(id);
        if (def.isHot) HOT_FLUID_IDS.add(id);
    });

    // Create flow mappings
    FLOW_MAP[sourceId] = { down: downId, side: flowIds[0] };
    FLOW_MAP[downId] = { down: downId, side: flowIds[0] }; // Downward flow also spreads sideways
    FLOW_MAP[flowIds[0]] = { next: flowIds[1] };
    FLOW_MAP[flowIds[1]] = { next: flowIds[2] };
    FLOW_MAP[flowIds[2]] = { next: "minecraft:air" };
}


/**
 * Manages all fluid logic, including flow and player effects,
 * using a modern script-based approach.
 */
class FluidManager {
    static initialize() {
        system.runInterval(() => {
            try {
                for (const player of world.getAllPlayers()) {
                    this.handlePlayerEffects(player);
                    this.handleFluidFlow(player);
                }
            } catch (error) {
                console.error(`[FluidManager] Error in main loop: ${error}`)
            }
        }, 5); // Run every 5 ticks for responsiveness
    }

    static handlePlayerEffects(player) {
        const headBlock = player.dimension.getBlock(player.getHeadLocation());
        const bodyBlock = player.dimension.getBlock(player.location);
        const headBlockId = headBlock?.typeId;
        const bodyBlockId = bodyBlock?.typeId;

        const isInFluid = ALL_FLUID_IDS.has(headBlockId) || ALL_FLUID_IDS.has(bodyBlockId);
        if (isInFluid) {
            player.addEffect("slow_falling", 6, { amplifier: player.isSneaking ? 1 : 2, showParticles: false });
            if (player.isJumping) player.addEffect("levitation", 4, { amplifier: 2, showParticles: false });

            const isInHotFluid = HOT_FLUID_IDS.has(headBlockId) || HOT_FLUID_IDS.has(bodyBlockId);
            if (isInHotFluid) player.setOnFire(2, true);
            else player.extinguishFire(true);
        }

        if (ALL_FLUID_IDS.has(headBlockId)) player.runCommandAsync("fog @s push fluid:water_fog fluid_fog");
        else player.runCommandAsync("fog @s remove fluid_fog");
    }

    static handleFluidFlow(player) {
        const dimension = player.dimension;
        const center = player.location;
        const radius = 8;

        for (let x = -radius; x <= radius; x++) {
            for (let y = -radius; y <= radius; y++) {
                for (let z = -radius; z <= radius; z++) {
                    const block = dimension.getBlock({ x: Math.floor(center.x + x), y: Math.floor(center.y + y), z: Math.floor(center.z + z) });
                    if (block && ALL_FLUID_IDS.has(block.typeId)) {
                        this.flow(block);
                    }
                }
            }
        }
    }

    static flow(block) {
        const flowRule = FLOW_MAP[block.typeId];
        if (!flowRule) return;

        // Handle decay of flowing blocks
        if (flowRule.next) {
            block.setType(flowRule.next);
            return;
        }

        // Handle spread from source blocks
        const dimension = block.dimension;
        const downBlock = dimension.getBlock({ x: block.x, y: block.y - 1, z: block.z });
        if (downBlock?.isAir) {
            downBlock.setType(flowRule.down);
            return; // Prioritize flowing down
        }

        const directions = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
        for (const dir of directions) {
            const adjacentBlock = dimension.getBlock({ x: block.x + dir.x, y: block.y, z: block.z + dir.z });
            if (adjacentBlock?.isAir) {
                const blockBelowAdjacent = dimension.getBlock({ x: adjacentBlock.x, y: adjacentBlock.y - 1, z: adjacentBlock.z });
                if (blockBelowAdjacent && !blockBelowAdjacent.isAir && !ALL_FLUID_IDS.has(blockBelowAdjacent.typeId)) {
                    adjacentBlock.setType(flowRule.side);
                }
            }
        }
    }
}

FluidManager.initialize();