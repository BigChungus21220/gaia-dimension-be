import { Player, Entity, world, ScreenDisplay, system } from "@minecraft/server";
export { Level, ModDimension };
const ALL_MOD_DIMENSIONS = {};

/**
 * Class representing a ModDimension
 */
class ModDimension {
    constructor({ type, range, inheritance }) {
        this.type = type;
        this.range = range;
        this.center = {
            x: (this.range.start.x + this.range.end.x) / 2,
            z: (this.range.start.z + this.range.end.z) / 2
        };
        this.inheritance = world.getDimension(inheritance);
        this.eventsHandler = new DimensionEvents(this);
    }

    getCenter() {
        return {
            x: this.center.x,
            z: this.center.z
        };
    }

    getEvents() {
        return this.eventsHandler;
    }

    isInDimension(location) {
        return (
            this.range.start.x <= location.x && location.x <= this.range.end.x &&
            this.range.start.z <= location.z && location.z <= this.range.end.z
        );
    }

    getEntities(entityQueryOptions) {
        return this.inheritance.getEntities(entityQueryOptions).filter(entity => 
            this.isInDimension(entity.location)
        );
    }

    getPlayers(entityQueryOptions) {
        return this.inheritance.getPlayers(entityQueryOptions).filter(entity => 
            this.isInDimension(entity.location)
        );
    }

    offset(location) {
        return {
            x: location.x - this.getCenter().x,
            y: location.y, 
            z: location.z - this.getCenter().z
        };
    }

    static register(id, options) {
        if (ModDimension.get(id) !== undefined) {
            throw new Error('Dimension with id "' + id + '" is already registered');
        }
        options = {
            range: options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } },
            inheritance: options.inheritance || 'the_end'
        };
        ALL_MOD_DIMENSIONS[id] = new ModDimension({
            type: id,
            range: options.range,
            inheritance: options.inheritance
        });
        return ModDimension.get(id);
    }

    static get(id) {
        return ALL_MOD_DIMENSIONS[id];
    }

    static getAll() {
        return Object.keys(ALL_MOD_DIMENSIONS).map(id => this.get(id));
    }
}

/**
 * Class to handle events related to dimensions
 */
class DimensionEvents {
    constructor(dimension) {
        this.dimension = dimension;
        this.players = {};
        this.events = {};

        system.runInterval(() => {
            let currentPlayers = this.dimension.getPlayers();
            let newPlayers = currentPlayers.filter(player => !this.players[player.id]);
            let leavingPlayers = Object.keys(this.players).filter(id => !currentPlayers.some(player => player.id === id));

            // Handle player leaves
            leavingPlayers.forEach((id, index) => {
                let player = world.getEntity(id);
                if (player && player.isValid) {
                    delete this.players[id];
                    system.runTimeout(() => {
                        this.triggerEvent('onLeave', player);
                    }, index + 1);
                }
            });

            // Handle new players
            newPlayers.forEach((player, index) => {
                this.players[player.id] = player;
                system.runTimeout(() => {
                    this.triggerEvent('onJoin', player);
                }, leavingPlayers.length + index + 1);
            });
        }, 20);
    }

    addEvent(id, type, callback) {
        if (this.events[id]) throw new Error('Event with ID ' + id + ' has already been registered');
        this.events[id] = new DimensionEvent(id, type, callback, this);
        return this.events[id];
    }

    removeEvent(eventId) {
        delete this.events[eventId];
    }

    getEvent(id) {
        return this.events[id];
    }

    getAllEvents() {
        return Object.values(this.events);
    }

    onJoin(id, callback) {
        return this.addEvent(id, 'onJoin', callback);
    }

    onLeave(id, callback) {
        return this.addEvent(id, 'onLeave', callback);
    }

    triggerEvent(type, player) {
        for (let event of this.getAllEvents()) {
            if (event.type === type) {
                event.callback(event, player);
            }
        }
    }
}

/**
 * Class representing an individual dimension event
 */
class DimensionEvent {
    constructor(id, type, callback, handler) {
        this.id = id;
        this.type = type;
        this.callback = callback;
        this.handler = handler;
    }

    remove() {
        this.handler.removeEvent(this.id);
    }
}

/**
 * Level class to manage dimensions
 */
class Level {
    constructor() {
        this.dimensions = ALL_MOD_DIMENSIONS;
    }

    /**
     * Gets a specific dimension by ID
     * @param {string} id - The ID of the dimension to retrieve
     * @returns {ModDimension|undefined} The dimension if found, otherwise undefined
     */
    getDimension(id) {
        return ModDimension.get(id);
    }
}

