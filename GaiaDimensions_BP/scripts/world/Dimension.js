import { Player, Entity, world, ScreenDisplay, system } from "@minecraft/server";
export { CustomDimension };


class CustomDimension {
    constructor({ type, range, parentDimension }) {
        this.type = type;
        this.range = range;
        this.center = {
            x: (this.range.start.x + this.range.end.x) / 2,
            z: (this.range.start.z + this.range.end.z) / 2
        };
        this.parentDimension = world.getDimension(parentDimension);
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
        return this.parentDimension.getEntities(entityQueryOptions).filter(entity => 
            this.isInDimension(entity.location)
        );
    }

    getPlayers(entityQueryOptions) {
        return this.parentDimension.getPlayers(entityQueryOptions).filter(entity => 
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
        if (CustomDimension.get(id) !== undefined) {
            throw new Error('Dimension with id "' + id + '" is already registered');
        }
        options = {
            range: options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } },
            parentDimension: options.parentDimension || 'the_end'
        };
        ALL_CUSTOM_DIMENSIONS[id] = new CustomDimension({
            type: id,
            range: options.range,
            parentDimension: options.parentDimension
        });
        return CustomDimension.get(id);
    }

    static get(id) {
        return ALL_CUSTOM_DIMENSIONS[id];
    }

    static getAll() {
        return Object.keys(ALL_CUSTOM_DIMENSIONS).map(id => this.get(id));
    }
}

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
                if (player && player.isValid()) {
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