import { world } from "@minecraft/server";
import { StairsHelper } from "../utils/stairs_helper.js";

const GAIA_NAMESPACE = "gaiadimension";

/**
 * Registers all event handlers for custom stairs.
 */
export function registerStairsComponent({ blockComponentRegistry }) {
    // Register a custom component for identification purposes.
    // The tag is what's primarily used by the helper.
    blockComponentRegistry.registerCustomComponent(`gaiadimension:stairs`, {});

    // --- Register Event Handlers ---
    world.afterEvents.playerPlaceBlock.subscribe(StairsHelper.handlePlace.bind(StairsHelper));
    world.afterEvents.playerBreakBlock.subscribe(StairsHelper.handleBreak.bind(StairsHelper));
}
