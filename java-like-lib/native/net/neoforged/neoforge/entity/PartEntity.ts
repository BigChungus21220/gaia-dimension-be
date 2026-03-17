import { Entity as VanillaEntity } from "@minecraft/server";
import { Entity } from "../../../minecraft/world/entity/Entity.js";

export abstract class PartEntity<T extends Entity> extends Entity {
    public readonly parent: T;
    public readonly index: number;

    constructor(parent: T, index: number) {
        // We pass parent's entity as a temporary placeholder
        super((parent as any).entity);
        this.parent = parent;
        this.index = index;
    }

    /**
     * Internal method to link this part to a real Bedrock entity.
     */
    public _setInternalEntity(entity: VanillaEntity): void {
        (this as any).entity = entity;
        entity.setDynamicProperty("twilightforest:parent_id", (this.parent as any).entity.id);
        entity.setDynamicProperty("twilightforest:part_index", this.index);
    }

    public hurt(amount: number): void {
        (this.parent as any).hurt(amount * 0.5); 
    }
}
