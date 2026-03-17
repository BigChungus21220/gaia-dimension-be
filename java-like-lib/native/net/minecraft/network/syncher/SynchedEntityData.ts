import { Entity as VanillaEntity } from "@minecraft/server";

export type PropertyType = "bool" | "int" | "float" | "enum";

export interface EntityDataAccessor<T> {
    id: string;
    stateName?: string;
    // Bedrock Property Metadata
    isProperty?: boolean;
    propertyType?: PropertyType;
    defaultValue?: T;
    range?: [number, number];
    values?: string[];
    clientSync?: boolean;
}

export class SynchedEntityData {
    private readonly entity: VanillaEntity;
    private static readonly CLASS_REGISTRIES: Map<string, number> = new Map();

    constructor(entity: VanillaEntity) {
        this.entity = entity;
    }

    public get<T>(accessor: EntityDataAccessor<T>): T {
        if (accessor.isProperty) {
            return this.entity.getProperty(accessor.id) as T;
        }
        return this.entity.getDynamicProperty(accessor.id) as T;
    }

    public set<T>(accessor: EntityDataAccessor<T>, value: T) {
        if (accessor.isProperty) {
            this.entity.setProperty(accessor.id, value as any);
        } else {
            this.entity.setDynamicProperty(accessor.id, value as any);
        }
        
        // Handle Legacy State Mapping (Component Groups)
        if (accessor.stateName && typeof value === 'boolean') {
            const namespace = this.entity.typeId.split(":")[0];
            if (value) {
                this.entity.triggerEvent(`${namespace}:add_${accessor.stateName}`);
            } else {
                this.entity.triggerEvent(`${namespace}:remove_${accessor.stateName}`);
            }
        }
    }

    public static defineId<T>(clazz: any, serializer: any, stateName?: string): EntityDataAccessor<T> {
        const className = clazz.name || "Global";
        const index = (this.CLASS_REGISTRIES.get(className) || 0) + 1;
        this.CLASS_REGISTRIES.set(className, index);
        const id = `${className}_${index}`;
        return { id, stateName };
    }

    /**
     * Defines a unified Bedrock Entity Property.
     */
    public static defineProperty<T>(
        id: string, 
        type: PropertyType, 
        defaultValue: T, 
        clientSync: boolean = false,
        options: { range?: [number, number], values?: string[] } = {}
    ): EntityDataAccessor<T> {
        return {
            id,
            isProperty: true,
            propertyType: type,
            defaultValue,
            clientSync,
            range: options.range,
            values: options.values
        };
    }

    public static Builder = class {
        public define<T>(accessor: string, defaultValue: T): this {
            return this;
        }
        public build(): any {
            return {};
        }
    };
}

export class EntityDataSerializers {
    public static readonly BOOLEAN = "boolean";
}
