import { Machine } from "../../API/lib/Machine.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

class CrudeStorageCrate extends Machine {
    static get NAME() { return "crude_storage_crate"; }
    
    static get INVENTORY_SIZE() { return 27; }

    static get UI_CONFIG() {
        return {
            uiPath: "crude_storage_crate_ui", 
            inventorySize: this.INVENTORY_SIZE,
            slots: [] 
        };
    }

    onLoad() {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = "Crude Storage Crate";
        }
    }
}

blockEntityManager.register(CrudeStorageCrate);

export function registerCrudeStorageCrateComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:crude_storage_crate", {
        onPlace: ({ block, dimension }) => {
            const location = block.location;
            const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
            
            try {
                const entity = dimension.spawnEntity("gaiadimension:crude_storage_crate", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn crude storage crate entity", e);
            }
        },
        onPlayerDestroy: ({ block, dimension }) => {
        }
    });
}
