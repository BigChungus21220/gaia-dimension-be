import { Player, Entity, world, system, Dimension, Vector3, EntityQueryOptions } from "@minecraft/server";

export interface Range {
    start: { x: number, z: number };
    end: { x: number, z: number };
}

const ALL_MOD_DIMENSIONS: Record<string, ModDimension> = {};

/**
 * Class representing a ModDimension
 */
export class ModDimension {
    public type: string;
    public range: Range;
    public center: { x: number, z: number };
    private _inheritanceId: string;
    private _inheritance: Dimension | undefined;
    private eventsHandler: DimensionEvents;

    constructor({ type, range, inheritance }: { type: string, range: Range, inheritance: string }) {
        this.type = type;
        this.range = range;
        this.center = {
            x: (this.range.start.x + this.range.end.x) / 2,
            z: (this.range.start.z + this.range.end.z) / 2
        };
        this._inheritanceId = inheritance;
        this._inheritance = undefined;
        this.eventsHandler = new DimensionEvents(this);
    }

    get inheritance(): Dimension {
        if (!this._inheritance) {
            this._inheritance = world.getDimension(this._inheritanceId);
        }
        return this._inheritance;
    }

    getCenter(): { x: number, z: number } {
        return {
            x: this.center.x,
            z: this.center.z
        };
    }

    getEvents(): DimensionEvents {
        return this.eventsHandler;
    }

    isInDimension(location: Vector3): boolean {
        return (
            this.range.start.x <= location.x && location.x <= this.range.end.x &&
            this.range.start.z <= location.z && location.z <= this.range.end.z
        );
    }

    getEntities(entityQueryOptions?: EntityQueryOptions): Entity[] {
        return this.inheritance.getEntities(entityQueryOptions).filter(entity => 
            this.isInDimension(entity.location)
        );
    }

    getPlayers(entityQueryOptions?: EntityQueryOptions): Player[] {
        return this.inheritance.getPlayers(entityQueryOptions).filter(player => 
            this.isInDimension(player.location)
        );
    }

    offset(location: Vector3): Vector3 {
        return {
            x: location.x - this.getCenter().x,
            y: location.y, 
            z: location.z - this.getCenter().z
        };
    }

    static register(id: string, options: { range?: Range, inheritance?: string }): ModDimension {
        if (ModDimension.get(id) !== undefined) {
            throw new Error('Dimension with id "' + id + '" is already registered');
        }
        const range = options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } };
        const inheritance = options.inheritance || 'the_end';
        
        const dim = new ModDimension({
            type: id,
            range: range,
            inheritance: inheritance
        });
        ALL_MOD_DIMENSIONS[id] = dim;
        return dim;
    }

    static get(id: string): ModDimension | undefined {
        return ALL_MOD_DIMENSIONS[id];
    }

    static getAll(): ModDimension[] {
        return Object.values(ALL_MOD_DIMENSIONS);
    }
}

/**
 * Class to handle events related to dimensions
 */
export class DimensionEvents {
    private dimension: ModDimension;
    private players: Record<string, Player> = {};
    private events: Record<string, DimensionEvent> = {};

    constructor(dimension: ModDimension) {
        this.dimension = dimension;

        system.runInterval(() => {
            const currentPlayers = this.dimension.getPlayers();
            const newPlayers = currentPlayers.filter(player => !this.players[player.id]);
            const leavingPlayers = Object.keys(this.players).filter(id => !currentPlayers.some(player => player.id === id));

            // Handle player leaves
            leavingPlayers.forEach((id, index) => {
                const player = world.getEntity(id) as Player | undefined;
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

    addEvent(id: string, type: 'onJoin' | 'onLeave', callback: (event: DimensionEvent, player: Player) => void): DimensionEvent {
        if (this.events[id]) throw new Error('Event with ID ' + id + ' has already been registered');
        const event = new DimensionEvent(id, type, callback, this);
        this.events[id] = event;
        return event;
    }

    removeEvent(eventId: string): void {
        delete this.events[eventId];
    }

    getEvent(id: string): DimensionEvent | undefined {
        return this.events[id];
    }

    getAllEvents(): DimensionEvent[] {
        return Object.values(this.events);
    }

    onJoin(id: string, callback: (event: DimensionEvent, player: Player) => void): DimensionEvent {
        return this.addEvent(id, 'onJoin', callback);
    }

    onLeave(id: string, callback: (event: DimensionEvent, player: Player) => void): DimensionEvent {
        return this.addEvent(id, 'onLeave', callback);
    }

    triggerEvent(type: 'onJoin' | 'onLeave', player: Player): void {
        for (const event of this.getAllEvents()) {
            if (event.type === type) {
                event.callback(event, player);
            }
        }
    }
}

/**
 * Class representing an individual dimension event
 */
export class DimensionEvent {
    public id: string;
    public type: 'onJoin' | 'onLeave';
    public callback: (event: DimensionEvent, player: Player) => void;
    private handler: DimensionEvents;

    constructor(id: string, type: 'onJoin' | 'onLeave', callback: (event: DimensionEvent, player: Player) => void, handler: DimensionEvents) {
        this.id = id;
        this.type = type;
        this.callback = callback;
        this.handler = handler;
    }

    remove(): void {
        this.handler.removeEvent(this.id);
    }
}

/**
 * Level class to manage dimensions
 */
export class Level {
    public dimensions: Record<string, ModDimension>;
    constructor() {
        this.dimensions = ALL_MOD_DIMENSIONS;
    }

    /**
     * Gets a specific dimension by ID
     * @param {string} id - The ID of the dimension to retrieve
     * @returns {ModDimension|undefined} The dimension if found, otherwise undefined
     */
    getDimension(id: string): ModDimension | undefined {
        return ModDimension.get(id);
    }
}
