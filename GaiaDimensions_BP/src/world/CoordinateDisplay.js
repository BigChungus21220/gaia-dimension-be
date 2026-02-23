import { world, system } from "@minecraft/server";
import { DimensionSystem, GaiaDimension } from "./Gaia.js";

export class CoordinateDisplay {
    constructor(player) {
        this.player = player;
    }

    updateCoordinates() {
        if (!this.player || !this.player.isValid) return;

        const inGaia = DimensionSystem.isInGaia(this.player);
        const hiddenTag = "gaiadimension:coords_hidden";

        // Only display if in Gaia Dimension
        if (inGaia) {
            if (!this.player.hasTag(hiddenTag)) {
                this.player.runCommand("gamerule showcoordinates false");
                this.player.addTag(hiddenTag);
            }

            const center = GaiaDimension.getCenter();
            const location = this.player.location;
            
            // Calculate relative coordinates
            const relX = Math.floor(location.x - center.x);
            const relY = Math.floor(location.y);
            const relZ = Math.floor(location.z - center.z);
            
            const coordString = `Position: ${relX}, ${relY}, ${relZ}`;
            this.player.onScreenDisplay.setActionBar(coordString);
        } else {
            if (this.player.hasTag(hiddenTag)) {
                this.player.runCommand("gamerule showcoordinates true");
                this.player.removeTag(hiddenTag);
                this.player.onScreenDisplay.setActionBar("");
            }
        }
    }
}

// System to update displays
system.runInterval(() => {
    const players = world.getPlayers();
    for (const player of players) {
        const display = new CoordinateDisplay(player);
        display.updateCoordinates();
    }
}, 5); // Update every 5 ticks