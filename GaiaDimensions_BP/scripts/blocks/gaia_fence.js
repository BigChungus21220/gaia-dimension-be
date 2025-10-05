import { world } from "@minecraft/server";
import { FenceHelper } from "../utils/fence_helper.js";

const GAIA_NAMESPACE = "gaiadimension";

/**
 * Registers all event handlers for custom fences and fence gates.
 */
export function registerFenceComponent({ blockComponentRegistry }) {
    // Register a custom component for identification purposes.
    blockComponentRegistry.registerCustomComponent(`${GAIA_NAMESPACE}:fence`, {});

    // --- Register Event Handlers ---
    world.afterEvents.playerPlaceBlock.subscribe(FenceHelper.handlePlace.bind(FenceHelper));
    world.afterEvents.playerBreakBlock.subscribe(FenceHelper.handleBreak.bind(FenceHelper));
    world.beforeEvents.playerInteractWithBlock.subscribe(FenceHelper.handleInteract.bind(FenceHelper));
    
    // The original script had a separate registration for the invisible block.
    // This is now handled implicitly by the main fence logic.
    // We just need to register a component for it so it's recognized.
    blockComponentRegistry.registerCustomComponent(`gaiadimension:invisible`, {});
}
