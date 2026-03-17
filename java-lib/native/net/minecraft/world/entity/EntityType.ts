import { AttributeSupplier } from "./ai/attributes/AttributeSupplier.js";

export enum MovementMode {
    NATIVE,
    SCRIPTED
}

export interface ClientEntityData {
    materials?: Record<string, string>;
    textures?: Record<string, string>;
    geometry?: Record<string, string>;
    animations?: Record<string, string>;
    scripts?: {
        pre_animation?: string[];
        animate?: (string | Record<string, string>)[];
    };
    render_controllers?: (string | Record<string, string>)[];
}

export class EntityType<T> {
    public readonly name: string;
    public readonly factory: new (entity: any) => T;
    public readonly width: number;
    public readonly height: number;
    public readonly movementMode: MovementMode;
    public readonly clientData?: ClientEntityData;
    public readonly states: Record<string, any>;
    public readonly xpReward?: number;
    public readonly spawnEvent?: string;
    public readonly deathEvent?: string;
    public readonly attributes?: AttributeSupplier;
    public readonly spawnCategory?: string;

    constructor(
        name: string, 
        factory: new (entity: any) => T,
        width: number, 
        height: number, 
        movementMode: MovementMode,
        clientData?: ClientEntityData,
        states: Record<string, any> = {},
        xpReward?: number,
        spawnEvent?: string,
        deathEvent?: string,
        attributes?: AttributeSupplier,
        spawnCategory?: string
    ) {
        this.name = name;
        this.factory = factory;
        this.width = width;
        this.height = height;
        this.movementMode = movementMode;
        this.clientData = clientData;
        this.states = states;
        this.xpReward = xpReward;
        this.spawnEvent = spawnEvent;
        this.deathEvent = deathEvent;
        this.attributes = attributes;
        this.spawnCategory = spawnCategory;
    }

    public static readonly Builder = class Builder {
        private _factory: any;
        private _width: number = 1;
        private _height: number = 1;
        private _mode: MovementMode = MovementMode.NATIVE;
        private _clientData?: ClientEntityData;
        private _states: Record<string, any> = {};
        private _xpReward?: number;
        private _spawnEvent?: string;
        private _deathEvent?: string;
        private _attributes?: AttributeSupplier;
        private _spawnCategory: string = "monster";

        public static of<T>(factory: new (entity: any) => T, category: any): Builder {
            const builder = new Builder();
            builder._factory = factory;
            return builder;
        }

        public sized(width: number, height: number): this {
            this._width = width;
            this._height = height;
            return this;
        }

        public movementMode(mode: MovementMode): this {
            this._mode = mode;
            return this;
        }

        public clientData(data: ClientEntityData): this {
            this._clientData = data;
            return this;
        }

        public defineState(stateName: string, components: any): this {
            this._states[stateName] = components;
            return this;
        }

        public xpReward(xp: number): this {
            this._xpReward = xp;
            return this;
        }

        public spawnEvent(event: string): this {
            this._spawnEvent = event;
            return this;
        }

        public deathEvent(event: string): this {
            this._deathEvent = event;
            return this;
        }

        public attributes(supplier: AttributeSupplier): this {
            this._attributes = supplier;
            return this;
        }

        public spawnCategory(category: string): this {
            this._spawnCategory = category;
            return this;
        }

        public eyeHeight(h: number): this { return this; }
        public clientTrackingRange(r: number): this { return this; }

        public build(name: string): EntityType<any> {
            return new EntityType(
                name, 
                this._factory,
                this._width, 
                this._height, 
                this._mode, 
                this._clientData, 
                this._states,
                this._xpReward,
                this._spawnEvent,
                this._deathEvent,
                this._attributes,
                this._spawnCategory
            );
        }
    };
}

export enum MobCategory {
    MONSTER, CREATURE, AMBIENT, WATER_CREATURE, MISC
}
