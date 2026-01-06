import { world, system } from "@minecraft/server";
import { PortalManager } from "../API/lib/PortalLib.js";

// Register the Gaia Dimension Portal
// Portal Block ID: gaiadimension:gaia_dimension_portal
// Frame Block ID: gaiadimension:keystone_block
PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");

/**
 * Registers the glittering fire component logic.
 * This handles the interaction with gaiadimension:glittering_fire to extinguish it,
 * and attempts to light the portal when placed.
 */
export function registerGlitteringFireComponent() {
    // Handle extinguishing the fire
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        const { block } = event;

        if (block.typeId === "gaiadimension:glittering_fire") {
            event.cancel = true;

            system.run(() => {
                if (block.isValid) {
                    block.setType("minecraft:air");
                    block.dimension.playSound("random.fizz", block.location, {
                        volume: 1,
                        pitch: 1,
                    });
                }
            });
        }
    });

    // Handle lighting the portal
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block } = event;

        if (block.typeId === "gaiadimension:glittering_fire") {
            // Attempt to ignite the portal
            // The PortalManager will handle checking the shape and placing portal blocks
            system.run(() => {
                const ignited = PortalManager.tryIgnite(block);
            });
        }
    });
}
