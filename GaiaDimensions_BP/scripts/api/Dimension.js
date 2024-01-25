import { Vector, BlockPermutation, Dimension, system, Block, world, BlockVolumeUtils, Entity, Player, Trigger } from "@minecraft/server"
import { delay } from "../utils";

const gaia_start = { x: 100000, z: 100000 };
const gaia_end = { x: 400000, z: 400000 };
const gaia_origin = { x: (gaia_start.x + gaia_end.x) / 2, z: (gaia_start.z + gaia_end.z) / 2 };

const biomes = [
    "mineral_river",
    "volcanic_lands",
    "shining_grove",
    "smoldering_bog",
    "static_wasteland",
    "green_agate_jungle",
    "crystal_plains",
    "goldstone_lands",
    "mutant_agate_wildwood",
    "purple_agate_swamp",
    "blue_agate_taiga",
    "pink_agate_forest",
    "salt_dunes",
    "fossil_woodland",
    "mineral_resevoir"
]

function floorEquals(a, b) {
    return Math.floor(a.x) == Math.floor(b.x) && Math.floor(a.z) == Math.floor(b.z)
}


/** 
 * Checks if a given position is in a given area bounded by start and end vectors (inclusive)
 * @warning y axis is ignored
 * @param point position to check
 * @param start bottom corner of bounding box
 * @param end top corner of bounding box
 * @returns {bool} Whether the vector is in the bounds
*/
function inAABB(point, start, end) {
    return (
        start.x <= point.x && point.x <= end.x &&
        start.z <= point.z && point.z <= end.z
    );
}

//collapse to hide jsdocs
// #region events

/**
* Generates a unique subscriber ID.
* @private
* @returns {string} A unique subscriber ID.
*/
function generateId() {
    return Math.random().toString(36).substring(2, 10);
}


/**
* @typedef PortalLink
* @property {Vector} location - The location of portal A.
* @property {Vector} linkedLocation - The location of portal B.
* @property {Dimension} dimension - The dimension in which the portal linking occurred.
*/

/**
 * @typedef PortalActivate
 * @property {Vector} location Where the portal was lit/activated
 * @property {Player} source The Player that lit the portal
 * @property {Dimension} dimension The dimension where the portal was lit
 */

/**
 * @typedef GeyserErupt
 * @property {Vector} location Where the Geyser Erupted
 * @property {function(): Entity[]} getAffectedEntities Returns a array of Entities that were pushed/effected by the Geyser
 * @property {Dimension} dimension The Dimension where the Geyser Erupted
 * @property {number} duration How long the Geyser Erupted
 * @property {number} height Height of the Geyser Eruption 
 */

/**
 * @typedef BiomeChange
 * @property {Vector} location - The location where the biome change occurred.
 * @property {Player} player - The player associated with the biome change.
 * @property {Dimension} dimension - The dimension in which the biome change occurred.
 * @property {string} oldBiome - The previous biome before the change.
 * @property {string} newBiome - The new biome after the change.
 */

/**
 * @typedef FogChange
 * @property {Player} player The player affected by the fog change.
 * @property {string} newFog The new fog conditions.
 */
/**
 * @typedef Events
 * @property {PortalLink} portalLink - Data for the portal linking event.
 * @property {PortalActivate} portalActivate - Data for the portal activation event.
 * @property {GeyserErupt} geyserErupt - Data for the geyser eruption event.
 * @property {BiomeChange} biomeChange - Data for the biome change event.
 * @property {FogChange} fogChange - Data for the fog change event.
 */
/**
 * Represents a furnace recipe.
 * @typedef {Object} FurnaceRecipe
 * @property {string} input - The item ID used as input in the furnace.
 * @property {string} output - The output item ID produced in the furnace.
 * @property {number} cookTimeMax - The maximum cooking time allowed for the recipe (in ticks).
 * @property {number} burnTimeMax - The maximum burn time allowed for the recipe (in ticks).
 */

/**
 * Represents data for furnace activation.
 * @typedef {Object} FurnaceActivate
 * @property {Player} player - The player activating the furnace.
 * @property {FurnaceRecipe} recipe - The recipe to be processed by the furnace.
 * @property {Vector} location - The location where the furnace is activated.
 */


/**
 * Represents an event that occurs before a furnace is activated.
 * @deprecated Have not added in event trigger, so this will not work
 */
class FurnaceActivateBeforeEvent {
    /**
     * @param {FurnaceActivate} data - Data for the furnace activation event.
     */
    constructor(data) {
        /**
         * The data for the furnace activation event.
         * @private
         * @readonly
         * @type {FurnaceActivate}
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         * @type {boolean}
         */
        this.cancel = data?.cancel || false;

        /**
         * The player activating the furnace.
         * @type {Player}
         */
        this.player = data.player;

        /**
         * Additional data specific to furnace activation.
         * @type {any}
         */
        this.activationData = data.activationData;

        /**
         * The recipe to be processed by the furnace.
         * @type {FurnaceRecipe}
         */
        this.recipe = data.recipe || null;
    }

    /**
     * Set the recipe for the furnace activation.
     * @param {FurnaceRecipe} recipe - The recipe to be set.
     */
    setRecipe(recipe) {
        this.recipe = recipe;
    }

    /**
     * Get the recipe for the furnace activation.
     * @returns {FurnaceRecipe} The recipe.
     */
    getRecipe() {
        return this.recipe;
    }
}

/**
 * Represents a signal for events occurring before a furnace is activated.
 */
class FurnaceActivateBeforeEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the FurnaceActivateBeforeEvent.
     * @param {function(FurnaceActivateBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:furnaceActivateBeforeEvent') {
                const eventData = new FurnaceActivateBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }

                if (eventData.cancel === true) {
                    this.sendCancel();
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the FurnaceActivateBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }

    /**
     * @private
     */
    sendCancel() {
        world.getDimension('the end').runCommand(`scriptevent gaia:furnaceActivateBeforeEventCanceled ${JSON.stringify({ cancel: true })}`);
    }
}



/**
 * Represents an event that occurs after a furnace is activated.
 * @deprecated Have not added in event trigger, so this will not work
 */
class FurnaceActivateAfterEvent {
    /**
     * @param {FurnaceActivate} data - Data for the furnace activation event.
     */
    constructor(data) {
        /**
         * The data for the furnace activation event.
         * @private
         * @readonly
         * @type {FurnaceActivate}
         */
        this.data = data;

        /**
         * The player activating the furnace.
         * @type {Player}
         */
        this.player = data.player;

        /**
         * The recipe that was processed by the furnace.
         * @type {FurnaceRecipe}
         */
        this.recipe = data.recipe;

        /**
         * The location where the furnace was activated.
         * @type {Vector}
         */
        this.location = data.location;
    }
}

/**
 * Represents a signal for events occurring after a furnace is activated.
 */
class FurnaceActivateAfterEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the FurnaceActivateAfterEvent.
     * @param {function(FurnaceActivateAfterEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:furnaceActivateAfterEvent') {
                const eventData = new FurnaceActivateAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['your_namespace'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the FurnaceActivateAfterEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

/**
 * Represents an event that occurs before two portals are linked.
 */
class PortalLinkBeforeEvent {
    /**
     * @param {PortalLink} data - Data for the portal linking event.
     */
    constructor(data) {
        /**
         * The data for the portal linking event.
         * @readonly
         * @private
         * @type {PortalLink}
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         * @type {boolean}
         */
        this.cancel = data.cancel || false;

        /**
         * The location of portal A.
         * @type {Vector}
         */
        this.location = data.location;

        /**
         * The location of portal B.
         * @type {Vector}
         */
        this.linkedLocation = data.linkedLocation;

        /**
         * The dimension in which the portal linking occurred.
         * @type {Dimension}
         */
        this.dimension = data.dimension;
    }
}

/**
 * Represents an event that occurs before a geyser erupts.
 */
class GeyserEruptBeforeEvent {
    /**
     * @param {GeyserErupt} data - Data for the geyser eruption event.
     */
    constructor(data) {
        /**
         * The data for the geyser eruption event.
         * @readonly
         * @private
         * @type {GeyserErupt}
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         * @type {boolean}
         */
        this.cancel = data.cancel || false;

        /**
         * Where the Geyser Erupted.
         * @type {Vector}
         */
        this.location = data.location;

        /**
         * Returns an array of Entities that were pushed/effected by the Geyser.
         * @type {function(): Entity[]}
         */
        this.getAffectedEntities = data.getAffectedEntities;

        /**
         * The Dimension where the Geyser Erupted.
         * @type {Dimension}
         */
        this.dimension = data.dimension;

        /**
         * How long the Geyser Erupted.
         * @type {number}
         */
        this.duration = data.duration;

        /**
         * Height of the Geyser Eruption.
         * @type {number}
         */
        this.height = data.height;
    }
}

/**
 * Represents an event that occurs before a portal is activated.
 */
class PortalActivateBeforeEvent {
    /**
     * @param {PortalActivate} data - Data for the portal activation event.
     */
    constructor(data) {
        /**
         * The data for the portal activation event.
         * @private
         * @readonly
         * @type {PortalActivate}
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         * @type {boolean}
         */
        this.cancel = data.cancel || false;

        /**
         * Where the portal was lit/activated.
         * @type {Vector}
         */
        this.location = data.location;

        /**
         * The Player that lit the portal.
         * @type {Player}
         */
        this.source = data.source;

        /**
         * The dimension where the portal was lit.
         * @type {Dimension}
         */
        this.dimension = data.dimension;
    }
}

/**
 * Represents an event that occurs before a fog change.
 */
class FogChangeBeforeEvent {
    /**
     * @param {FogChange} data - Data for the fog change event.
     */
    constructor(data) {
        /**
         * The data for the fog change event.
         * @private
         * @readonly
         * @type {FogChange}
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         * @type {boolean}
         */
        this.cancel = data.cancel || false;

        /**
         * The player affected by the fog change.
         * @type {Player}
         */
        this.player = data.player;

        /**
         * The new fog conditions.
         * @type {string}
         */
        this.newFog = data.newFog;
    }
}


/**
 * Represents an event that occurs before two portals are linked.
 */
class PortalLinkBeforeEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the PortalLinkBeforeEvent.
     * @param {function(PortalLinkBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:portalLinkBeforeEvent') {
                const eventData = new PortalLinkBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }

                if (eventData.cancel === true) {
                    this.sendCancel();
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the PortalLinkBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }

    /**
     * @param {string} responseType
     * @private
     */
    sendCancel() {
        world.getDimension('the end').runCommand(`scriptevent gaia:portalLinkBeforeEventCanceled ${JSON.stringify({ cancel: true })}`);
    }
}

/**
 * Represents an event that occurs before a geyser erupts.
 */
class GeyserEruptBeforeEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the GeyserEruptBeforeEvent.
     * @param {function(GeyserEruptBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:geyserEruptBeforeEvent') {
                const eventData = new GeyserEruptBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }

                if (eventData.cancel === true) {
                    this.sendCancel();
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the GeyserEruptBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }

    /**
     * @param {string} responseType
     * @private
     */
    sendCancel() {
        world.getDimension('the end').runCommand(`scriptevent gaia:geyserEruptBeforeEventCanceled ${JSON.stringify({ cancel: true })}`);
    }
}

/**
 * Represents an event that occurs before a portal is activated.
 */
class PortalActivateBeforeEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the PortalActivateBeforeEvent.
     * @param {function(PortalActivateBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:portalActivateBeforeEvent') {
                const eventData = new PortalActivateBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }

                if (eventData.cancel === true) {
                    this.sendCancel();
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the PortalActivateBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }

    /**
     * @param {string} responseType
     * @private
     */
    sendCancel() {
        world.getDimension('the end').runCommand(`scriptevent gaia:portalActivateBeforeEventCanceled ${JSON.stringify({ cancel: true })}`);
    }
}

/**
 * Represents an event that occurs before a fog change.
 */
class FogChangeBeforeEventSignal {
    constructor() {
        /**
         * @private
         * @readonly
         */
        this.subscribers = {};
    }

    /**
     * Subscribe to the FogChangeBeforeEvent.
     * @param {function(FogChangeBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:fogChangeBeforeEvent') {
                const eventData = new FogChangeBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }

                if (eventData.cancel === true) {
                    this.sendCancel();
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the FogChangeBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }

    /**
     * @param {string} responseType
     * @private
     */
    sendCancel() {
        world.getDimension('the end').runCommand(`scriptevent gaia:fogChangeBeforeEventCanceled ${JSON.stringify({ cancel: true })}`);
    }
}



class FogChangeAfterEvent {
    /**
     * @param {FogChange} data 
     */
    constructor(data) {
        /**
         * The player affected by the fog change.
         */
        this.player = data.player;
        /**
         * The new fog conditions.
         */
        this.newFog = data.newFog;
    }
}

class FogChangeAfterEventSignal {
    constructor() {
        /**
         * @readonly
         * @private
         */
        this.subscribers = {};
    }

    /**
     * @readonly
     * @param {function(FogChangeAfterEvent):void} callback 
     * @returns {string} The Subscriber ID of the Event
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:fogChangeAfterEvent') {
                const eventData = new FogChangeAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * @readonly
     * Unsubscribes from an event listener.
     * @param {string} subscriberId 
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}
class BiomeChangeAfterEvent {
    /**
     * @param {BiomeChange} data
     */
    constructor(data) {
        /**
         * The location where the biome change occurred.
         * @readonly
         */
        this.location = data.location;

        /**
         * The player associated with the biome change.
         * @readonly
         */
        this.player = data.player;

        /**
         * The dimension where the biome change occurred, This will always be Gaia
         * @readonly
         */
        this.dimension = data.dimension;

        /**
         * The previous biome before the change.
         * @readonly
         */
        this.oldBiome = data.oldBiome;

        /**
         * The new biome after the change.
         * @readonly
         */
        this.newBiome = data.newBiome;
    }
}

class BiomeChangeAfterEventSignal {
    constructor() {
        /**
     * @private
     * @readonly
     */
        this.subscribers = {};
    }

    /**
     * Subscribe to the BiomeChangeAfterEvent.
     * @param {function(BiomeChangeAfterEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:biomeChangeAfterEvent') {
                const eventData = new BiomeChangeAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the BiomeChangeAfterEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}
class PortalActivateAfterEvent {
    /**
     * 
     * @param {PortalActivate} data 
     */
    constructor(data) {
        /**
         * Where the portal was lit/activated
         */
        this.location = data.location
        /**
        * The dimension where the portal was lit
        */
        this.dimension = data.dimension
        /**
         * The Player that lit the portal
         */
        this.source = data.source
    }
}


class PortalActivateAfterEventSignal {
    constructor() {
        /**
         * @readonly
         * @private
         */
        this.subscribers = {}
    }
    /**
     * 
     * @param {function(PortalActivateAfterEvent):void} callback 
     * @returns {string} The Subsriber id of the Event
     */
    subscribe(callback) {
        const subscriberId = generateId()
        this.subscribers[subscriberId] = callback;
        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:portalActivateAfterEvent') {
                const eventData = new PortalActivateAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }
    /**
     * 
     * @param {string} subscriberId 
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId]
    }
}


class GeyserEruptAfterEvent {
    /**
     * @param {GeyserErupt} data 
     */
    constructor(data) {
        /**
         * Where the Geyser Erupted
         * @readonly
         */
        this.location = data.location
        /**
         * Height of the Geyser Eruption
         * @readonly
         */
        this.height = data.height,
            /**
             * The Dimension where the Geyser Erupted
             * @readonly
             */
            this.dimension = data.dimension,
            /**
             * How long the Geyser Erupted
             */
            this.duration = data.duration,
            /**
             * @readonly
             * @private
             */
            this.entities = data.getAffectedEntities
    }
    /**
     * Returns a array of Entities that were pushed/effected by the Geyser
    * @readonly
    */
    getAffectedEntities() {
        return this.entities()
    }
}


class GeyserEruptAfterEventSignal {
    constructor() {
        /**
         * @readonly
         * @private
         */
        this.subscribers = {}
    }
    /**
     * @readonly
     * @param {function(GeyserEruptAfterEvent):void} callback 
     * @returns {string} The Subsriber id of the Event
     */
    subscribe(callback) {
        const subscriberId = generateId()
        this.subscribers[subscriberId] = callback;
        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:geyserEruptAfterEvent') {
                const eventData = new GeyserEruptAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }
    /**
     * @readonly
     * Unsubsribes from a event listner 
     * @param {string} subscriberId 
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId]
    }
}



class PortalLinkAfterEvent {
    /**
     * @param {PortalLink} data
     */
    constructor(data) {
        /**
         * The location of portal A.
         * @readonly
         */
        this.portalALocation = data.location;

        /**
         * The location of portal B.
         * @readonly
         */
        this.portalBLocation = data.linkedLocation;

        /**
         * The dimension in which the portal linking occurred.
         * @readonly
         */
        this.dimension = data.dimension;
    }
}

class PortalLinkAfterEventSignal {
    constructor() {
        /**
     * @private
     * @readonly
     */
        this.subscribers = {};
    }

    /**
     * Subscribe to the PortalLinkEvent.
     * @param {function(PortalLinkAfterEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:portalLinkAfterEvent') {
                const eventData = new PortalLinkAfterEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.afterEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the PortalLinkEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

class GaiaAfterEvents {
    constructor() {
        this.portalActivate = new PortalActivateAfterEventSignal();
        this.geyserErupt = new GeyserEruptAfterEventSignal();
        this.biomeChange = new BiomeChangeAfterEventSignal();
        this.fogChange = new FogChangeAfterEventSignal();
        this.portalLink = new PortalLinkAfterEventSignal();
        /**
         * Have not added in event trigger so currently it does not work
         * Do NOT use
         * @deprecated
         */
        this.furnaceActivate = new FurnaceActivateAfterEventSignal();

    }
}

class GaiaBeforeEvents {
    constructor() {
        this.portalActivate = new PortalActivateBeforeEventSignal();
        this.geyserErupt = new GeyserEruptBeforeEventSignal();
        this.fogChange = new FogChangeBeforeEventSignal();
        this.portalLink = new PortalLinkBeforeEventSignal();
        /**
         * Not Finished
         * @deprecated Have not added in event trigger, so this will not work
         */
        this.furnaceActivate = new FurnaceActivateBeforeEventSignal();
    }
}
// #endregion

// #region Dimension & Systems
class GaiaFogSystem {
    constructor() {
        this.gaia
    };
    generateFog() {
        let playerData = {};
        system.runInterval(() => {
            let players = world.getPlayers();
            for (let player of players) {
                let playerId = player.id;
                let playerInArea = this.isInGaia(player);
                let playerLocation = player.location;
                if (
                    playerData[playerId] === undefined ||
                    playerData[playerId].lastInArea != playerInArea ||
                    (playerInArea && !floorEquals(playerLocation, playerData[playerId].lastLocation))
                ) {
                    this.updateFog(player);
                }
                playerData[playerId] = {
                    lastInArea: playerInArea,
                    lastLocation: playerLocation,
                };
            }
        }, 8);
    }

    clearFogs(player) {
        for (const biome of biomes) {
            player.runCommandAsync("fog @s remove " + biome)
        }
    }

    addFog(player, biome) {
        player.runCommand("fog @s push gaia:" + biome + "_fog " + biome)
    }

    async updateFog(player) {
        const eventData = { newFog: biome + '_fog' + biome, player: player}
        this.clearFogs(player)
        let biome = player.getCurrentBiome();
        player.runCommand(`scriptevent gaia:fogChangeBeforeEvent ${JSON.stringify(eventData)}`)
        const data = await this.listenFor('fogChange', 'Canceled', 'BeforeEvent')
        if (data && data.cancel === true) return;
        if (biome != "none") {
            this.addFog(player, biome)
        }
        player.runCommand(`scriptevent gaia:fogChangeAfterEvent ${JSON.stringify(eventData)}`)
    }

   

    /**
    * Listen for events with a specific name and type of response.
    * @private
    * @param {string} eventName - The name of the event to listen for.
    * @param {string} responseType - The type of response, e.g., 'Canceled', 'DataChanged', etc.
    * @param {string} eventType - The type of event, e.g., 'BeforeEvent' or 'AfterEvent'.
    * @returns {Promise<Object>} - A promise that resolves with the event data.
    */
    listenFor(eventName, responseType, eventType) {
        return new Promise((resolve) => {
            const callback = async (event) => {
                const { id, message } = event;
                if (id === `gaia:${eventName}${eventType}${responseType}`) {
                    const data = JSON.parse(message);
                    resolve(data);
                } else {
                    await delay(0.001)
                    resolve(undefined);
                }
            };

            system.afterEvents.scriptEventReceive.subscribe(callback, {
                namespaces: ['gaia']
            });
        }).catch(e => {
            return undefined;
        });
    }
}





/**
 * @typedef Link
 * @property {Vector} location
 * @property {Vector} linkedLocation
 * @property {Vector} size
 */

/**
 * @author Redux
 * @description Class that manages Portal structures and Portal Linking.
 */
class GaiaPortals extends GaiaFogSystem {
    /**
     * Create a Portal.
     */
    constructor() {
        super()
        /**
         * @type {Array<Link>}
         * @private
         */
        this.linked = JSON.parse(world.getDynamicProperty('PortalLinked') ?? "[]");
        /**
         * @private
         */
        this.serialize = JSON.stringify;
    }

    /**
     * Link two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @param {Vector} size - The size of the portal.
     */
    link(fromLocation, toLocation, size) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        const data = { location: fromLocation, linkedLocation: toLocation, size: size };
        if (!this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation)) {
            this.linked.push(data);
            world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
        }
    }

    /**
     * Unlinks a link between two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     */
    unlink(fromLocation, toLocation) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        this.linked = this.linked.filter(l => {
            l.location != fromLocation && l.linkedLocation != toLocation
        })
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
    }
    /**
   * Get the linked location from a given location.
   * @param {Vector} location - The location.
   * @param {string} from - Whether the location is the start or end of the linked location
   * @returns {Link} The linked object.
   */
    getLink(from, location) {
        if (typeof location !== 'object') {
            throw new Error('location must be an object');
        }
        let link;
        switch (from) {
            case 'start':
                link = this.linked.find(d => {
                    const volume = { from: d.location, to: { x: d.location.x + d.size.x, y: d.location.y + d.size.y, z: d.location.z + d.size.z } };
                    return BlockVolumeUtils.isInside(volume, location);
                });
                break;
            case 'end':
                link = this.linked.find(d => {
                    const volume = { from: d.linkedLocation, to: { x: d.linkedLocation.x + d.size.x, y: d.linkedLocation.y + d.size.y, z: d.linkedLocation.z + d.size.z } };
                    return BlockVolumeUtils.isInside(volume, location);
                });
                break;
            default:
                throw new Error(`Invalid value for 'from': ${from}`);
        }
        return link || undefined;
    }

    /**
     * Get all links.
     * @returns {Array<Link>} The array of all links.
     */
    getAllLinks() {
        return this.linked;
    }

    /**
     * Clear all links.
     */
    clearAllLinks() {
        this.linked = []
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked))
    }

    /**
     * Check if two locations are linked.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @returns {boolean} True if the locations are linked, false otherwise.
     */
    isLinked(fromLocation, toLocation) {
        return this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation);
    }

    /**
     * Get the count of links.
     * @returns {number} The count of links.
     */
    getCount() {
        return this.linked.length
    }

    /**
     * Check if a link exists.
     * @param {Link} link - The link to check.
     * @returns {boolean} True if the link exists, false otherwise.
     */
    hasLink(link) {
        return this.linked.includes(link)
    }
    /**
     * Check if an entity is within the bounds of a linked portal.
     * @param {Entity} entity - The entity to check.
     * @param {string} from - Whether the entity is at the start or end of the linked location
     * @returns {Link|undefined} The link that the entity is in, or undefined if the entity is not in any linked portal.
     */
    isEntityInLinked(from, entity) {
        if (typeof entity !== 'object') {
            throw new Error('entity must be an object');
        }
        let link;
        switch (from) {
            case 'start':
                link = this.linked.find(link => {
                    const volume = { from: link.location, to: { x: link.location.x + link.size.x, y: link.location.y + link.size.y, z: link.location.z + link.size.z } };
                    return BlockVolumeUtils.isInside(volume, entity.location);
                });
                break;

            case 'end':
                link = this.linked.find(link => {
                    const volume = { from: link.linkedLocation, to: { x: link.linkedLocation.x + link.size.x, y: link.linkedLocation.y + link.size.y, z: link.linkedLocation.z + link.size.z } };
                    return BlockVolumeUtils.isInside(volume, entity.location);
                });
                break;
            default:
                throw new Error(`Invalid value for 'from': ${from}`);
        }
        return link || undefined;
    }

    async lightPortal(corner, dimension, x_oriented) {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                if (!dimension.getBlock(blockpos)) await dimension.getBlock(blockpos) !== undefined
                if (is_edge) {
                    dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
                } else {
                    dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:gaia_portal", { "gaia:x_oriented": x_oriented }))
                }
            }
        }
    }

    breakPortal(corner, dimension, x_oriented) {
        for (let x = -3; x <= 3; x++) {
            for (let y = -3; y <= 3; y++) {
                let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let block = dimension.getBlock(blockpos);
                let adjacent = block.getAdjacent()
                if (block.type.id === 'gaia:gaia_portal') {
                    ['start', 'end'].forEach(position => {
                        const link = this.getLink(position, blockpos)
                        if (link) {
                            this.unlink(link.location, link.linkedLocation)
                        } else return;
                    });
                    block.setPermutation(BlockPermutation.resolve("minecraft:air"));
                }
                adjacent.filter(b => {
                    b.typeId === 'gaia:gaia_portal'
                }).forEach(b => {
                    ['start', 'end'].forEach(position => {
                        const link = this.getLink(position, b.location)
                        if (link) {
                            this.unlink(link.location, link.linkedLocation)
                        } else return
                    });
                    b.setPermutation(BlockPermutation.resolve("minecraft:air"));
                })
            }
        }
    }

    isLit(corner, dimension, x_oriented) {
        let isValid = true
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let blocktype = dimension.getBlock(blockpos).typeId
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                if (is_edge && blocktype != "gaia:keystone_block") {
                    isValid = false
                    break
                }
                if (!is_edge && blocktype != "gaia:gaia_portal") {
                    isValid = false
                    break
                }
            }
        }
        return isValid
    }

    isUnlit(corner, dimension, x_oriented) {
        let isValid = true
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let blocktype = dimension.getBlock(blockpos).typeId
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                if (is_edge && blocktype != "gaia:keystone_block") {
                    isValid = false
                    break
                }
                if (!is_edge && blocktype != "minecraft:air") {
                    isValid = false
                    break
                }
            }
        }
        return isValid
    }
    /**
     * Checks whether a portal can be lit and if so lights the portal
     * @param {Block} block 
     * @returns {boolean} Whether lighting this portal was a success or not
     */
    canLight(block) {
        let position = block.location
        let dimension = block.dimension
        let offset = Vector.zero
        let light_success = false
        let x_oriented = true
        for (let x = -2; x <= -1; x++) {
            for (let y = -3; y <= -1; y++) {
                let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (this.isUnlit(Vector.add(position, test_offset), dimension, true)) {
                    offset = test_offset
                    light_success = true
                    break
                }
            }
        }
        if (!light_success) {
            x_oriented = false
            for (let x = -2; x <= -1; x++) {
                for (let y = -3; y <= -1; y++) {
                    let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                    if (this.isUnlit(Vector.add(position, test_offset), dimension, false)) {
                        offset = test_offset
                        light_success = true
                        break
                    }
                }
            }
        }

        if (light_success) {
            this.lightPortal(Vector.add(position, offset), dimension, x_oriented)
        }
        return light_success
    }


    convertCoords(location, fromDimension, toDimension) {
        const scaleFactor = 4; // 1 block in 'gaia' is 4 blocks in 'overworld'
        switch (fromDimension) {
            case 'minecraft:overworld':
                switch (toDimension) {
                    case 'gaia:gaia':
                        //remaps area (-35700, -35700), (35700, 35700) in the overworld to (100000, 100000), (400000, 400000) in gaia
                        return {
                            x: Math.floor((location.x / scaleFactor) + gaia_origin.x),
                            y: location.y,
                            z: Math.floor((location.z / scaleFactor) + gaia_origin.z)
                        };
                    default:
                        throw new Error(`Unsupported conversion to ${toDimension}`);
                }
            case 'gaia:gaia':
                switch (toDimension) {
                    case 'minecraft:overworld':
                        //remaps area (100000, 100000), (400000, 400000) in gaia to (-35700, -35700), (35700, 35700) in the overworld
                        return {
                            x: Math.floor((location.x - gaia_origin.x) * scaleFactor),
                            y: location.y,
                            z: Math.floor((location.z - gaia_origin.z) * scaleFactor)
                        }
                    default:
                        throw new Error(`Unsupported conversion to ${toDimension}`);
                }
            default:
                throw new Error(`Unsupported conversion from ${fromDimension}`);
        }
    }
}

/**
 * A class that wraps the dimension of gaia
 * @this {Gaia}
 */
export class Gaia extends GaiaPortals {

    constructor() {
        super();
        /**
         * @private
         * @readonly
         */
        this.dimension = world.getDimension('the end')
        /**
         * @private
         * @readonly
         */
        this.playerBiomes = {};
        this.afterEvents = new GaiaAfterEvents()
        this.beforeEvents = new GaiaBeforeEvents();
    }
    /**
     * Get the entities within the Gaia Dimension
     * @readonly
     * @returns {Entity[]}
     */
    getEntities() {
        try {
            //gets up to 10k entities that are in gaia
            return world.getDimension('the end').getEntities({ location: { x: gaia_origin.x, y: 0, z: gaia_origin.z }, closest: 10000 }).filter((entity) => inAABB(entity.location, gaia_start, gaia_end))
        } catch (e) { }
    }

    /**
     * Returns Whether or not a player is in the Gaia Dimension
     * @readonly
     * @param {Player} player 
     * @returns {boolean}
     */
    isInGaia(player) {
        let playerLoc = player.location
        const inGaia = player.dimension.id == "minecraft:the_end" && inAABB(playerLoc.x, gaia_start, gaia_end)
        if (inGaia) {
            const currentBiome = player.getBiome(playerLoc)
            const previousBiome = player?.getLastBiome(player)
            if (currentBiome !== previousBiome) {
                player.setBiome(player, currentBiome);
                this.triggerEvent('biomeChange', { newBiome: currentBiome, oldBiome: previousBiome }, 'AfterEvent')
            }
        }
        return inGaia
    }
   
    /**
     * Listen for events with a specific name and type of response.
     * @param {string} eventName - The name of the event to listen for.
     * @param {string} responseType - The type of response, e.g., 'Canceled', 'DataChanged', etc.
     * @param {string} eventType - The type of event, e.g., 'BeforeEvent' or 'AfterEvent'.
     * @returns {Promise<Object>} - A promise that resolves with the event data.
     */
    listenFor(eventName, responseType, eventType) {
        return new Promise((resolve) => {
            const callback = async (event) => {
                const { id, message } = event;
                if (id === `gaia:${eventName}${eventType}${responseType}`) {
                    const data = JSON.parse(message);
                    resolve(data);
                } else {
                    await delay(0.001)
                    resolve(undefined);
                }
            };

            system.afterEvents.scriptEventReceive.subscribe(callback, {
                namespaces: ['gaia']
            });
        }).catch(e => {
            return undefined;
        });
    }

    /**
     * 
     * @param {string} eventName Name of the Event
     * @param {string} type The type of the event,before or after, must be AfterEvent, or BeforeEvent(Not Complete)
     * @param {Object} data A object containing the event of the data
     */
    triggerEvent(eventName, data, type) {
        this.runCommand(`scriptevent gaia:${eventName}${type} ${JSON.stringify(data)}`)
    }
    runCommand(command) {
        this.dimension.runCommand(command)
    }
}

