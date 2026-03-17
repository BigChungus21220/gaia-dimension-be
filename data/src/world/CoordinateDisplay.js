import { world, system } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";

/**
 * Universal Toggleable Coordinate Display
 * Ties into the native 'showcoordinates' gamerule button.
 * Shows relative coordinates for custom dimensions and absolute for vanilla.
 */
export function updateAllCoordinateDisplays() {
    // Check if coordinates should be shown globally
    // We don't force-disable the gamerule anymore; we just listen to its state.
    const showCoords = world.gameRules.showCoordinates;

    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        if (!showCoords) {
            // Ensure action bar is cleared if coordinates are toggled off
            if (player.hasTag("gaiadimension:showing_coords")) {
                player.onScreenDisplay.setActionBar("");
                player.removeTag("gaiadimension:showing_coords");
            }
            continue;
        }

        const location = player.location;
        const currentDimId = player.dimension.id;
        
        // Find if player is in a ModDimension (Custom)
        const modDim = ModDimension.getAll().find(dim => 
            dim.inheritance.id === currentDimId && dim.isInDimension(location)
        );

        let x, y, z;
        if (modDim) {
            const offset = modDim.offset(location);
            x = Math.floor(offset.x);
            y = Math.floor(offset.y);
            z = Math.floor(offset.z);
        } else {
            x = Math.floor(location.x);
            y = Math.floor(location.y);
            z = Math.floor(location.z);
        }

        player.onScreenDisplay.setActionBar(`Position: ${x}, ${y}, ${z}`);
        if (!player.hasTag("gaiadimension:showing_coords")) player.addTag("gaiadimension:showing_coords");
    }
}

// Tick-based smooth update
system.runInterval(() => {
    try {
        updateAllCoordinateDisplays();
    } catch(e) {}
}, 1);
