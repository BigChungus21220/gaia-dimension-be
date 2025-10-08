import { world, system } from "@minecraft/server";
import { BUSHES_CONFIG } from "../config/bushes_config.js";

const SLOWNESS_EFFECT = "slowness";
// This halves the performance cost of a 1-tick interval,
// but should be frequent enough to avoid a "janky" feeling.
const CHECK_INTERVAL = 2;

// Create a Set for faster lookups.
const slownessBushes = new Set(
    BUSHES_CONFIG.filter(config => config.applySlowness).map(config => config.id)
);

function applySlownessEffect(player) {
    const block = player.dimension.getBlock(player.location);
    if (!block) return;

    // Use the Set for a much faster check.
    if (slownessBushes.has(block.typeId)) {
        // Apply effect for 1 tick to prevent the icon from showing in the UI.
        player.addEffect(SLOWNESS_EFFECT, 1, { amplifier: 10, showParticles: false });
    }
}

export function initializeBushEffectSystem() {
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            applySlownessEffect(player);
        }
    }, CHECK_INTERVAL);
}
