import { world } from "@minecraft/server";

const doLogging = true;

/**
 * An event
 */
class GaiaEvent {
    /**
     * The list of subscribers for this event
     */
    subscribers; // # means private field

    /**
     * The message to send when the event fires
     */
    message;

    /**
     * Creates a new event
     * @param {string} message the message to send on fire
     */
    constructor(message){
        this.message = message;
        this.subscribers = [];
    }

    /**
     * Subscribes a function to this event
     * @param {function} fn The function to subscribe
     */
    subscribe(fn){
        this.subscribers.push(fn);
    }

    /**
     * Triggers this event
     * @param {object} eventData 
     */
    trigger(eventData = {}){
        if (doLogging) world.sendMessage(this.message);
        for (const fn of this.subscribers){
            (() => {fn(eventData)})();
        }
    }
}

//#region event definitions

/**
 * An event that fires once a tick
 */
export const tick1 = new GaiaEvent("tick1");

/**
 * An event that fires every other tick
 */
export const tick2 = new GaiaEvent("tick2");

/**
 * An event that fires every 8 ticks
 */
export const tick8 = new GaiaEvent("tick8");

/**
 * An event that fires when the block the player is standing on changes (only evaluates for x and z axis)
 */
export const playerChangeBlock = new GaiaEvent("player block changed");

/**
 * An event that fires when the biome the player is in changes (in Gaia)
 */
export const playerChangeBiome = new GaiaEvent("player biome changed");

/**
 * An event that fires when an InventoryBlock is placed
 */
export const inventoryBlockPlaced = new GaiaEvent("inventory block placed");

/**
 * An event that fires when an InventoryBlock is broken
 */
export const inventoryBlockBroken = new GaiaEvent("inventory block destoyed");

//#endregion