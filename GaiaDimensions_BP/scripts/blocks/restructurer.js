import blockEntityManager from "../API/lib/BlockEntity.js";
import { Machine } from "../API/lib/Machine.js";

export class Restructurer extends Machine {
    static get NAME() { return "restructurer"; }
    static get INVENTORY_SIZE() { return 54; }

    static get UI_CONFIG() {
        return {
            classicProfile: {
                staticUI: {
                    9: "gaiadimension:restructurer_part_one_up",
                    36: "gaiadimension:restructurer_part_one_down",
                    17: "gaiadimension:restructurer_part_two_up",
                    44: "gaiadimension:restructurer_part_two_down"
                }
            },
            pocketProfile: {
                staticUI: {
                    9: "gaiadimension:restructurer_part_one_up",
                    36: "gaiadimension:restructurer_part_one_down",
                    17: "gaiadimension:restructurer_part_two_up",
                    44: "gaiadimension:restructurer_part_two_down"
                }
            }
        };
    }

    /**
     * Called every tick.
     * @param {number} dt 
     */
    onTick(dt) {
        super.onTick(dt);

        // Handle Block State (Lit/Unlit)
        try {
            const isRunning = this.isRunning();
            const currentState = this.block.permutation.getState("gaiadimension:restructurer_on");
            if (isRunning !== currentState) {
                this.block.setPermutation(this.block.permutation.withState("gaiadimension:restructurer_on", isRunning));
            }
        } catch (e) {}
    }

    /**
     * Determines if the restructurer is currently active.
     */
    isRunning() {
        return this.inventory.getItem(0) !== undefined;
    }
}

blockEntityManager.register(Restructurer);

export function registerRestructurerComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:restructurer", {
        onPlace: ({ block, dimension }) => {
            const location = block.location;
            const center = { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
            
            try {
                const entity = dimension.spawnEntity("luminiae_generic:block_entity_large", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn restructurer entity", e);
            }
        }
    });
}