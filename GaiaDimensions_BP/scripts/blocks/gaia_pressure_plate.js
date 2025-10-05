import { world } from "@minecraft/server";
import { PressurePlateHelper } from "../utils/pressure_plate_helper.js";
import { RedstoneControl } from "../systems/Redstone.js"; // Assuming path

const GAIA_NAMESPACE = "gaiadimension";

/**
 * Registers all event handlers for custom pressure plates.
 */
export function registerPressurePlateComponent({ blockComponentRegistry }) {
    // Register a custom component for identification purposes.
    blockComponentRegistry.registerCustomComponent(`gaiadimension:pressure_plate`, {});

    // Initialize the helper's loop
    PressurePlateHelper.initialize();

    // Register the main event handler
    world.events.entityInsideBlock.subscribe(
        PressurePlateHelper.handleEntityInside.bind(PressurePlateHelper)
    );

    // It's good practice to clean up redstone power if the plate is broken.
    if (typeof registerBreakHandler === 'function') { // Check if the handler system exists
        registerBreakHandler({
            event: "before",
            check: (block) => PressurePlateHelper.isCustomPlate(block),
            execute: (event) => {
                const { block } = event;
                const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
                RedstoneControl.removeRedstonePower(sourceId);
            }
        });
    }
}
