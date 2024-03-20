
class GaiaEvent {
    #subscribers = []; // # means private field

    subscribe(fn) {
        this.#subscribers.push(fn);
    }

    trigger(eventData) {
        this.#subscribers.forEach((fn) => fn(eventData));
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
 * An event that fires every 30 ticks
 */
export const tick30 = new GaiaEvent();

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
