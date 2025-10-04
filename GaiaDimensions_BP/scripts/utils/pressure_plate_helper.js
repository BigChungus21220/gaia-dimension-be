import { system, world } from "@minecraft/server";
import { ToggleableBlocks } from "./ToggleableBlocks.js";
import { RedstoneControl } from "../systems/Redstone.js"; // Assuming this path is correct

const GAIA_NAMESPACE = "gaiadimension";
const PRESSURE_PLATE_SUFFIX = "_pressure_plate";
const PRESSED_STATE = `${GAIA_NAMESPACE}:pressed`;

// A map to track which plates are currently active and when they should deactivate.
const activePlates = new Map();
const DEACTIVATION_DELAY = 10; // ticks (0.5 seconds)

/**
 * A helper class for managing all logic related to custom pressure plates.
 */
export class PressurePlateHelper {

    /**
     * Checks if a block is a custom pressure plate.
     * @param {import("@minecraft/server").Block} block
     * @returns {boolean}
     */
    static isCustomPlate(block) {
        return block?.typeId.startsWith(GAIA_NAMESPACE) && block.typeId.endsWith(PRESSURE_PLATE_SUFFIX);
    }

    /**
     * "Presses" a pressure plate.
     * @param {import("@minecraft/server").Block} block The pressure plate block.
     */
    static press(block) {
        if (!this.isCustomPlate(block) || block.permutation.getState(PRESSED_STATE) === true) {
            return; // Not a plate or already pressed
        }

        try {
            block.setPermutation(block.permutation.withState(PRESSED_STATE, true));
            block.dimension.playSound("random.click", block.location);

            // Operate nearby doors and redstone
            ToggleableBlocks.operateNearby(block, true);
            const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
            RedstoneControl.setRedstonePower(block.location, 15, sourceId);

        } catch (e) {
            console.warn(`Error pressing plate: ${e}`);
        }
    }

    /**
     * "Unpresses" a pressure plate.
     * @param {import("@minecraft/server").Block} block The pressure plate block.
     */
    static unpress(block) {
        if (!this.isCustomPlate(block) || !block.isValid || block.permutation.getState(PRESSED_STATE) === false) {
            return; // Not a plate, not valid, or already unpressed
        }

        try {
            block.setPermutation(block.permutation.withState(PRESSED_STATE, false));
            block.dimension.playSound("random.click", block.location);

            // Deactivate nearby doors and redstone
            ToggleableBlocks.operateNearby(block, false);
            const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
            RedstoneControl.removeRedstonePower(sourceId);

        } catch (e) {
            console.warn(`Error unpressing plate: ${e}`);
        }
    }

    /**
     * Handles the entityInsideBlock event.
     * @param {import("@minecraft/server").EntityInsideBlockEvent} event
     */
    static handleEntityInside(event) {
        const { block, entity } = event;
        if (this.isCustomPlate(block)) {
            // When an entity is inside, press the plate and schedule its deactivation check.
            this.press(block);
            const plateKey = `${block.dimension.id}|${block.location.x},${block.location.y},${block.location.z}`;
            activePlates.set(plateKey, system.currentTick + DEACTIVATION_DELAY);
        }
    }

    /**
     * Initializes the system that checks for plate deactivation.
     */
    static initialize() {
        system.runInterval(() => {
            const tick = system.currentTick;
            for (const [plateKey, deactivationTick] of activePlates.entries()) {
                if (tick >= deactivationTick) {
                    // Time to check if this plate should be unpressed.
                    const [dimensionId, coords] = plateKey.split('|');
                    const [x, y, z] = coords.split(',').map(Number);
                    const dimension = world.getDimension(dimensionId);
                    const block = dimension.getBlock({x, y, z});

                    if (block && this.isCustomPlate(block)) {
                        // Check if there are still entities on the plate. If not, unpress it.
                        const entities = dimension.getEntities({ location: block.location, maxDistance: 1 });
                        if (entities.length === 0) {
                            this.unpress(block);
                            activePlates.delete(plateKey);
                        } else {
                            // Entities are still on the plate, reset the timer.
                            activePlates.set(plateKey, tick + DEACTIVATION_DELAY);
                        }
                    } else {
                        // The block is no longer a valid plate, remove it.
                        activePlates.delete(plateKey);
                    }
                }
            }
        }, 5); // Check every 5 ticks.
    }
}
