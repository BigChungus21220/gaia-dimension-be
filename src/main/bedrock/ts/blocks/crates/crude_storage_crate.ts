import { Machine, UIConfig } from "../../API/lib/Machine.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";
import { 
    BlockComponentRegistry, 
    BlockComponentOnPlaceEvent, 
    Vector3, 
    Entity, 
    Block 
} from "@minecraft/server";

class CrudeStorageCrate extends Machine {
    static override get NAME(): string { return "crude_storage_crate"; }
    
    static override get INVENTORY_SIZE(): number { return 27; }

    static override get UI_CONFIG(): UIConfig {
        const slots: number[] = Array.from({ length: 27 }, (_, i) => i);
        return {
            classicProfile: {
                inputSlots: slots
            },
            pocketProfile: {
                inputSlots: slots
            }
        };
    }

    constructor(entity: Entity, block: Block) {
        super(entity, block);
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = CrudeStorageCrate.UI_ROUTING_NAME;
        }
    }

    onLoad(): void {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = CrudeStorageCrate.UI_ROUTING_NAME;
        }
    }
}

blockEntityManager.register(CrudeStorageCrate as any);

export function registerCrudeStorageCrateComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:crude_storage_crate", {
        onPlace: (event: BlockComponentOnPlaceEvent) => {
            const { block, dimension } = event;
            const location: Vector3 = block.location;
            const center: Vector3 = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
            
            try {
                const entity = dimension.spawnEntity("gaiadimension:crude_storage_crate", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn crude storage crate entity", e);
            }
        }
    });
}
