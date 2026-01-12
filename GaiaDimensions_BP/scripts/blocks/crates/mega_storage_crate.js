import { Machine } from "../../API/lib/Machine.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

class MegaStorageCrate extends Machine {
    static get NAME() { return "mega_storage_crate"; }
    
    static get INVENTORY_SIZE() { return 54; }

    static get UI_CONFIG() {
        return {
            uiPath: "mega_storage_crate_ui",
            inventorySize: this.INVENTORY_SIZE,
            slots: []
        };
    }

    onLoad() {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = "Mega Storage Crate";
        }
    }
}

blockEntityManager.register(MegaStorageCrate);

export function registerMegaStorageCrateComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:mega_storage_crate", {
        onPlace: ({ block, dimension }) => {
            const location = block.location;
            const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
            
            try {
                const entity = dimension.spawnEntity("gaiadimension:mega_storage_crate", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn mega storage crate entity", e);
            }
        }
    });
}
