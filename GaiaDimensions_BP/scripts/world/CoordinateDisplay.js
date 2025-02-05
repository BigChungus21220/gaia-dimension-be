import { ScreenDisplay, world, system } from "@minecraft/server";
import { ModDimension } from "./ModDimension";

/**
 * Class to manage player coordinates relative to a planet's coordinates
 */
export class CoordinateManager {
    /**
     * Creates an instance of CoordinateManager for a player
     * @param {Player} player - The player object
     */
    constructor(player) {
        this.player = player;
        
        // Bind the player's display to the custom action bar logic
        this.bindDisplay();
    }

    /**
     * Binds the action bar to display coordinates
     */
    bindDisplay() {
        const oldSetActionBar = ScreenDisplay.prototype.setActionBar;
        const actionbars = new WeakMap();
        const displayBind = new WeakMap();

        ScreenDisplay.prototype.setActionBar = function(text) {
            let func = oldSetActionBar.bind(this);
            if (!world.gameRules.showCoordinates) {
                func(text);
                return;
            }

            let result = text === "COORDS" ? (actionbars.get(this) || { time: 0, text: '' }) : {
                time: system.currentTick + 100,
                text: text
            };

            if (text !== "COORDS") actionbars.set(this, result);
            let loc = this.getCoords(displayBind.get(this));
            result = ['x', 'y', 'z'].map(axis => Math.round(loc[axis])).join(' ') + (result.time > system.currentTick ? '\n' + result.text : '');

            func(result);
        };

        // Periodically update the action bar for all players
        system.runInterval(() => {
            if (!world.gameRules.showCoordinates) return;
            for (let player of world.getAllPlayers()) {
                displayBind.set(player.onScreenDisplay, player);
                player.onScreenDisplay.setActionBar('COORDS');
            }
        });
    }

    /**
     * Gets coordinates relative to the planet or regular coordinates
     * @param {Vector} entity - The player object to get the location from
     * @returns {Vector} The player's position relative to the planet's origin or regular coordinates
     */
    getCoords(entity) {
        if (entity.dimension.id !== 'minecraft:the_end') return entity.location;
        let gaia = ModDimension.getAll().find(pl => pl.isOnDimension(entity.location));
        return gaia?.offset(entity.location) || entity.location;
    }
}


