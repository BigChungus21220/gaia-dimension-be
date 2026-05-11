import { world, Entity as VanillaEntity } from "@minecraft/server";
import { getDimensions } from "../ts/utils.js";
import { Entity } from "./net/minecraft/world/entity/Entity.js";
import { PartEntity } from "./net/neoforged/neoforge/entity/PartEntity.js";
import { Level } from "./net/minecraft/world/level/Level.js";

export class MultipartEntityUtil {
    public static readonly PARENT_ID_PROP = "twilightforest:parent_id";
    public static readonly PART_INDEX_PROP = "twilightforest:part_index";

    public static init(): void {
        world.afterEvents.entityHurt.subscribe((event) => {
            const hurtEntity = event.hurtEntity;
            const parentId = hurtEntity.getDynamicProperty(this.PARENT_ID_PROP) as string;
            
            if (parentId) {
                const parent = world.getEntity(parentId);
                if (parent) {
                    parent.applyDamage(event.damage);
                }
            }
        });
    }

    public static initializeParts(parent: Entity, partTypeId: string): void {
        const p = parent as any;
        if (!p.getParts) return;

        const parts: PartEntity<any>[] = p.getParts();
        if (!parts) return;

        const existingBedrockParts = this.getAllLinkedParts(p.entity.id);

        parts.forEach((part, index) => {
            const existing = existingBedrockParts.find(bp => 
                bp.getDynamicProperty(this.PART_INDEX_PROP) === index
            );

            if (existing) {
                part._setInternalEntity(existing);
            } else if (p.entity && (p.entity as any).isValid) {
                // Use the wrapped spawnEntity
                const spawned = Level.spawnEntity(p.entity.dimension, partTypeId, p.entity.location);
                part._setInternalEntity(spawned);
            }
        });

        existingBedrockParts.forEach(bp => {
            const idx = bp.getDynamicProperty(this.PART_INDEX_PROP) as number;
            if (idx >= parts.length) {
                bp.remove();
            }
        });
    }

    private static getAllLinkedParts(parentId: string): VanillaEntity[] {
        const parts: VanillaEntity[] = [];
        for (const d of getDimensions()) {
            try {
                // Manual filter as propertyFilters is not standard in stable yet
                const found = d.getEntities().filter(e => e.getDynamicProperty(this.PARENT_ID_PROP) === parentId);
                parts.push(...found);
            } catch {
                // Dimension not available
            }
        }
        return parts;
    }
}
