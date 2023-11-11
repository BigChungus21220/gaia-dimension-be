import { Vector, BlockPermutation,Dimension,system,Block, world, BlockVolumeUtils,Entity, Player, Trigger} from "@minecraft/server"
 
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

function floorEquals(a, b){
    return Math.floor(a.x) == Math.floor(b.x) && Math.floor(a.z) == Math.floor(b.z)
}

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


class PortalLinkBeforeEvent {
    /**
     * @param {PortalLink} data - The data for the portal linking event.
     */
    constructor(data) {
        /**
         * The data for the portal linking event.
         * @readonly
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         */
        this.cancel = false;
    }
}

class GeyserEruptBeforeEvent {
    /**
     * @param {GeyserErupt} data - The data for the geyser eruption event.
     */
    constructor(data) {
        /**
         * The data for the geyser eruption event.
         * @readonly
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         */
        this.cancel = false;
    }
}

class PortalActivateBeforeEvent {
    /**
     * @param {PortalActivate} data - The data for the portal activation event.
     */
    constructor(data) {
        /**
         * The data for the portal activation event.
         * @readonly
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         */
        this.cancel = false;
    }
}

class BiomeChangeBeforeEvent {
    /**
     * @param {BiomeChange} data - The data for the biome change event.
     */
    constructor(data) {
        /**
         * The data for the biome change event.
         * @readonly
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         */
        this.cancel = false;
    }
}

class FogChangeBeforeEvent {
    /**
     * @param {FogChange} data - The data for the fog change event.
     */
    constructor(data) {
        /**
         * The data for the fog change event.
         * @readonly
         */
        this.data = data;

        /**
         * Whether the event is canceled.
         */
        this.cancel = false;
    }
}

class FogChangeBeforeEventSignal {
    /**
     * @private
     * @readonly
     */
    constructor() {
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
            }
        };

        system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the FogChangeBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

class BiomeChangeBeforeEventSignal {
    /**
     * @private
     * @readonly
     */
    constructor() {
        this.subscribers = {};
    }

    /**
     * Subscribe to the BiomeChangeBeforeEvent.
     * @param {function(BiomeChangeBeforeEvent):void} callback - The callback function to be called when the event is triggered.
     * @returns {string} The subscriber id of the event.
     */
    subscribe(callback) {
        const subscriberId = generateId();
        this.subscribers[subscriberId] = callback;

        const eventCallback = (ev) => {
            const { id, message } = ev;
            if (id === 'gaia:biomeChangeBeforeEvent') {
                const eventData = new BiomeChangeBeforeEvent(JSON.parse(message));
                if (subscriberId in this.subscribers) {
                    this.subscribers[subscriberId](eventData);
                }
            }
        };

        system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the BiomeChangeBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

class PortalActivateBeforeEventSignal {
    /**
     * @private
     * @readonly
     */
    constructor() {
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
            }
        };

        system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the PortalActivateBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

class GeyserEruptBeforeEventSignal {
    /**
     * @private
     * @readonly
     */
    constructor() {
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
            }
        };

        system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the GeyserEruptBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}

class PortalLinkBeforeEventSignal {
    /**
     * @private
     * @readonly
     */
    constructor() {
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
            }
        };

        system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
        return subscriberId;
    }

    /**
     * Unsubscribe from the PortalLinkBeforeEvent.
     * @param {string} subscriberId - The subscriber id to be unsubscribed.
     */
    unsubscribe(subscriberId) {
        delete this.subscribers[subscriberId];
    }
}


class FogChangeAfterEvent {
    /**
     * @param {FogChange} data 
     */
    constructor(data){
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
    constructor () {
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
    subscribe(callback){
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
    unsubscribe(subscriberId){
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
 constructor (data){
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
    constructor () {
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
    subscribe(callback){
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

    system.afterEvents.scriptEventReceive.subscribe(eventCallback,{namespaces:['gaia']});
    return subscriberId;
        }
/**
 * 
 * @param {string} subscriberId 
 */
        unsubscribe(subscriberId){
            delete this.subscribers[subscriberId]
        }
    }

    
    class GeyserEruptAfterEvent {
        /**
         * @param {GeyserErupt} data 
         */
      constructor (data){
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
      getAffectedEntities(){
        return this.entities()
      }
    }


    class GeyserEruptAfterEventSignal {
        constructor () {
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
        subscribe(callback){
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
    
        system.afterEvents.scriptEventReceive.subscribe(eventCallback,{namespaces:['gaia']});
        return subscriberId;
            }
    /**
     * @readonly
     * Unsubsribes from a event listner 
     * @param {string} subscriberId 
     */
            unsubscribe(subscriberId){
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
    /**
     * @private
     * @readonly
     */
    constructor() {
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
    constructor (){
        this.portalActivate = new PortalActivateAfterEventSignal();
        this.geyserErupt = new GeyserEruptAfterEventSignal();
        this.biomeChange = new BiomeChangeAfterEventSignal();
        this.fogChange = new FogChangeAfterEventSignal();
        this.portalLink = new PortalLinkAfterEventSignal();
    }
}

class GaiaBeforeEvents {
    constructor (){
        this.portalActivate = new PortalActivateBeforeEventSignal();
        this.geyserErupt = new GeyserEruptBeforeEventSignal();
        this.biomeChange = new BiomeChangeBeforeEventSignal();
        this.fogChange = new FogChangeBeforeEventSignal();
        this.portalLink = new PortalLinkBeforeEventSignal();
    }
}


class Fog {
    constructor(){

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
    
    clearFogs(player){
        for (const biome of biomes){
            player.runCommandAsync("fog @s remove " + biome)
        }
    }

    addFog(player, biome){
        player.runCommandAsync("fog @s push gaia:" + biome + "_fog " + biome)
    }

    updateFog(player){
        this.clearFogs(player)
        let biome = this.getBiome(player.location, player.dimension);
        if (biome != "none"){
            this.addFog(player, biome)
        }
        this.triggerEvent('fogChange',{newFog:biome+'_fog'+biome,player:player},'AfterEvent')
    }

    /**
 * Returns Whether or not a player is in the Gaia Dimension
 * @private
 * @readonly
 * @param {Player} player 
 * @returns {boolean}
 */
    isInGaia(player){
        let playerLoc = player.location
        return player.dimension.id == "minecraft:the_end" && playerLoc.x <= 400000 && playerLoc.z <= 400000 && playerLoc.x >= 200000 && playerLoc.z >= 200000 
    }
/**
 * Returns the name of a biome in Gaia based of a location
 * @private
 * @param {Vector} position 
 * @param {Dimension} dimension 
 * @readonly
 * @returns {string} The biome name
 */
    getBiome(position){
        let blockId = this.dimension.getBlock(new Vector(position.x, 0, position.z))?.typeId
        if (blockId.includes("gaia:bedrock_")){
            return blockId.replace("gaia:bedrock_","")
        } else {
            return "none"
        }
    }
    /**
 * @private
 * @param {string} eventName Name of the Event
 * @param {string} type The type of the event,before or after, must be AfterEvent, or BeforeEvent(Not Complete)
 * @param {Object} data A object containing the event of the data
 */
   triggerEvent(eventName,data,type){
    this.runCommand(`scriptevent gaia:${eventName}${type} ${JSON.stringify(data)}`)
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
 * @description Class that manages Portals and Portal Linking.
 */
class Portal extends Fog {
    /**
     * Create a Portal.
     */
    constructor() {
        super ()
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
    link(fromLocation, toLocation,size) {
      if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
        throw new Error('Both fromLocation and toLocation must be objects');
      }
      const data = { location: fromLocation, linkedLocation: toLocation, size:size };
      if (!this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation)) {
        this.linked.push(data);
        console.warn(this.serialize(this.linked))
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
       this.linked = this.linked.filter(l=>{
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
getLink(from, location){
    if (typeof location !== 'object') {
        throw new Error('location must be an object');
    }
    let link;
    switch(from) {
        case 'start':
            link = this.linked.find(d => {
                const volume = {from: d.location, to: {x:d.location.x+d.size.x,y:d.location.y+d.size.y,z:d.location.z+d.size.z}};
                console.warn(BlockVolumeUtils.isInside(volume, location))
                return BlockVolumeUtils.isInside(volume, location);
            });
            break;
        case 'end':
            link = this.linked.find(d => {
                const volume = {from: d.linkedLocation,  to: {x:d.linkedLocation.x+d.size.x,y:d.linkedLocation.y+d.size.y,z:d.linkedLocation.z+d.size.z}} ;
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
    getAllLinks(){
        return this.linked;
    }

    /**
     * Clear all links.
     */
    clearAllLinks(){
        this.linked = []
        world.setDynamicProperty('PortalLinked',this.serialize(this.linked))
    }
    
    /**
     * Check if two locations are linked.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @returns {boolean} True if the locations are linked, false otherwise.
     */
    isLinked(fromLocation,toLocation){
        return this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation);
    }

    /**
     * Get the count of links.
     * @returns {number} The count of links.
     */
    getCount(){
        return this.linked.length
    }

    /**
     * Check if a link exists.
     * @param {Link} link - The link to check.
     * @returns {boolean} True if the link exists, false otherwise.
     */
    hasLink(link){
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
    switch(from){
        case 'start':
            link = this.linked.find(link => {
                const volume = {from: link.location, to: {x:link.location.x+link.size.x,y:link.location.y+link.size.y,z:link.location.z+link.size.z}};
                return BlockVolumeUtils.isInside(volume, entity.location);
            });
            break;

        case 'end':
            link = this.linked.find(link => {
                const volume = {from: link.linkedLocation, to: {x:link.linkedLocation.x+link.size.x,y:link.linkedLocation.y+link.size.y,z:link.linkedLocation.z+link.size.z}};
                return BlockVolumeUtils.isInside(volume, entity.location);
            });
            break;
        default:
            throw new Error(`Invalid value for 'from': ${from}`);
    }
    return link || undefined;
}

lightPortal (corner, dimension, x_oriented){
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge){
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
            } else {
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:gaia_portal", {"gaia:x_oriented": x_oriented}))
            }
        }
    }
}

breakPortal(corner, dimension, x_oriented){
    for (let x = -3; x <= 3; x++){
        for (let y = -3; y <= 3; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let block = dimension.getBlock(blockpos);
            let adjacent = block.getAdjacent()
            if (block.type.id === 'gaia:gaia_portal'){
                ['start', 'end'].forEach(position => {
                    const link = this.getLink(position, blockpos)
                    if(link){
                        this.unlink(link.location, link.linkedLocation)
                    } else return;
                });
                block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            }
            adjacent.filter(b=>{
                b.typeId === 'gaia:gaia_portal'
            }).forEach(b=>{
                ['start', 'end'].forEach(position => {
                    const link = this.getLink(position, b.location)
                    if(link){
                        this.unlink(link.location, link.linkedLocation)
                    } else return
                });
                b.setPermutation(BlockPermutation.resolve("minecraft:air"));
            })
        }
    }
}

isLit(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "gaia:gaia_portal"){
                isValid = false
                break
            }
        }
    }
    return isValid
}

isUnlit(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "minecraft:air"){
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
 */
canLight(block){
    let position = block.location
    let dimension = block.dimension
    let offset = Vector.zero
    let light_success = false
    let x_oriented = true
    for (let x = -2; x <= -1; x++){
        for (let y = -3; y <= -1; y++){
            let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
            if (this.isUnlit(Vector.add(position, test_offset), dimension, true)){
                offset = test_offset
                light_success = true
                break
            }
        }
    }
    if (!light_success){
        x_oriented = false
        for (let x = -2; x <= -1; x++){
            for (let y = -3; y <= -1; y++){
                let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (this.isUnlit(Vector.add(position, test_offset), dimension, false)){
                    offset = test_offset
                    light_success = true
                    break
                }
            }
        }
    }

    if (light_success){
        this.lightPortal(Vector.add(position, offset), dimension, x_oriented)
    }
}


convertCoords(location, fromDimension, toDimension) {
    const scaleFactor = 1 / 4; // 1 block in 'gaia' is 4 blocks in 'overworld'
    const xOffset = 300000; // Offset for the x-axis
    const zOffset = 300000; // Offset for the z-axis

    switch (fromDimension) {
        case 'minecraft:overworld':
            switch (toDimension) {
                case 'gaia:gaia':
                    return {
                        x: Math.floor((location.x + xOffset) * scaleFactor+200000),
                        y: location.y,
                        z: Math.floor((location.z + zOffset) * scaleFactor+200000)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        case 'gaia:gaia':
            switch (toDimension) {
                case 'minecraft:overworld':
                    return {
                        x: Math.floor(location.x / scaleFactor),
                        y: location.y,
                        z: Math.floor(location.z / scaleFactor)
                    };
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
export class Gaia extends Portal {
    
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
  * Get the Entities within the Gaia Dimension
  * @readonly
  * @returns {Entity[]}
  */
    getEntities(){
        try {
    return world.getDimension('the end').getEntities({location:{x:200000,y:0,z:200000},farthest:400000,closest:200000})
} catch (e) { }
    }
/**
 * Returns Whether or not a player is in the Gaia Dimension
 * @readonly
 * @param {Player} player 
 * @returns {boolean}
 */
    isInGaia(player){
        let playerLoc = player.location
        const currentBiome = this.getBiome(playerLoc)
        const previousBiome = this?.getLastBiome(player)
        if (currentBiome !== previousBiome) {
            this.setBiome(player, currentBiome);
            this.triggerEvent('biomeChange',{newBiome:currentBiome,oldBiome:previousBiome},'AfterEvent')
        }
        return player.dimension.id == "minecraft:the_end" && playerLoc.x <= 400000 && playerLoc.z <= 400000 && playerLoc.x >= 200000 && playerLoc.z >= 200000 
    }
/**
 * Returns the name of a biome in Gaia based of a location
 * @param {Vector} position 
 * @param {Dimension} dimension 
 * @readonly
 * @returns {string} The biome name
 */
    getBiome(position){
        let blockId = this.dimension.getBlock(new Vector(position.x, 0, position.z))?.typeId
        if (blockId.includes("gaia:bedrock_")){
            return blockId.replace("gaia:bedrock_","")
        } else {
            return "none"
        }
    }
/**
     * Update the current biome for a player.
     * @param {Player} player - The player.
     * @param {string} biome - The current biome.
     */
setBiome(player, biome) {
    this.playerBiomes[player.id] = biome;
}

/**
 * Get the previous biome for a player.
 * @param {Player} player - The player.
 * @returns {string | undefined} - The previous biome or undefined if not available.
 */
getLastBiome(player) {
    return this.playerBiomes[player.id];
}
   /**
    * @readonly
   * Starts the generation of fog in the Gaia dimension
   */
   pushFog(){
    this.generateFog()
}
/**
 * Listen for canceled events of any type.
 * @returns {Events|null} - The data of the canceled event, or null if no event was canceled.
 */
getEventCancelled() {
    let cancelledData = null;

    const eventCallback = (event) => {
        const { id, message } = event;
        if (id && id.endsWith('Canceled')) {
            cancelledData = JSON.parse(message);
            switch (cancelledData.type) {
                case 'PortalLink':
                    console.log('PortalLink event canceled:', cancelledData.data);
                    break;
                case 'BiomeChange':
                    console.log('BiomeChange event canceled:', cancelledData.data);
                    break;
                default:
                    console.log('Unknown event type canceled:', cancelledData.data);
            }
        }
    };

    const subscriberId = system.beforeEvents.scriptEventReceive.subscribe(eventCallback, { namespaces: ['gaia'] });
    const unsubscribe = () => {
        system.beforeEvents.scriptEventReceive.unsubscribe(subscriberId);
    };
    return {
        getCancelledData: () => cancelledData,
        unsubscribe: unsubscribe,
    }
}
/**
 * 
 * @param {string} eventName Name of the Event
 * @param {string} type The type of the event,before or after, must be AfterEvent, or BeforeEvent(Not Complete)
 * @param {Object} data A object containing the event of the data
 */
   triggerEvent(eventName,data,type){
   this.runCommand(`scriptevent gaia:${eventName}${type} ${JSON.stringify(data)}`)
   }
 runCommand(command){
    this.dimension.runCommand(command)
 }   
}

