//#region event definitions

/**
 * An event that fires once a tick
 */
export const tick1 = new GaiaEvent();

/**
 * An event that fires every other tick
 */
export const tick2 = new GaiaEvent();

/**
 * An event that fires every 8 ticks
 */
export const tick8 = new GaiaEvent();

/**
 * An event that fires when the block the player is standing on changes (only evaluates for x and z axis)
 */
export const playerChangeBlock = new GaiaEvent();

/**
 * An event that fires when the biome the player is in changes (in Gaia)
 */
export const playerChangeBiome = new GaiaEvent();

//#endregion

class GaiaEvent {
    #subscribers = []; // # means private field

    subscribe(fn) {
        this.#subscribers.push(fn);
    }

    trigger(eventData) {
        this.#subscribers.forEach((fn) => fn(eventData));
    }
}