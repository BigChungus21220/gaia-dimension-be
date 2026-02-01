import { world, system, ItemStack } from "@minecraft/server";
import { Machine } from "../API/lib/Machine.js";
import blockEntityManager from "../API/lib/BlockEntity.js";

export class MineralCentrifuge extends Machine {
    static get NAME() { return "mineral_centrifuge"; }

    static get TIMERS() {
        return {
            spin: { max: 200 }, // 10 seconds per operation
            fuel: { max: 100 }
        };
    }

    static get UI_CONFIG() {
        return {
            classicProfile: {
                // Defines which slots are what. 
                // We will use a cross pattern for inputs.
                // 13 = Center (Fuel)
                // 4 = Left, 22 = Right, 13-9=4 (Wait, 27 slots is 3 rows of 9)
                // Row 0: 0-8. Row 1: 9-17. Row 2: 18-26.
                // Center is 13.
                // Top: 4. Bottom: 22. Left: 12. Right: 14.
                // Output: let's put it at 26 (Bottom Right)
                
                inputSlots: [4, 12, 14, 22],
                fuelSlot: 13,
                resultSlots: [26],
                
                animatedUI: [
                    // Progress Bar growing from slot 15 -> 16 -> 17 -> 26?
                    // Let's keep it simple: Slot 25 indicates progress.
                    { slot: 25, timer: "spin", baseId: "gaiadimension:generic_progress_arrow", steps: 22 }
                ]
            },
            pocketProfile: {} // Fallback
        };
    }

    /**
     * @param {number} dt 
     */
    onTick(dt) {
        // Visuals: Spin particles
        if (this.isRunning()) {
            this.spawnSpinParticles();
        }
    }

    spawnSpinParticles() {
        if (system.currentTick % 2 !== 0) return; // Every other tick

        const dim = this.block.dimension;
        const center = { 
            x: this.block.location.x + 0.5, 
            y: this.block.location.y + 0.5, 
            z: this.block.location.z + 0.5 
        };

        const radius = 0.6;
        const speed = 0.5;
        const time = system.currentTick * speed;
        
        // Circular motion on XZ plane
        const px = center.x + Math.cos(time) * radius;
        const pz = center.z + Math.sin(time) * radius;
        
        try {
            dim.spawnParticle("minecraft:basic_flame_particle", { x: px, y: center.y, z: pz });
            // dim.spawnParticle("minecraft:electric_spark_particle", { x: px, y: center.y + 0.2, z: pz });
        } catch(e) {}
    }

    isRunning() {
        return (this.timers.spin && this.timers.spin.value > 0) || this.canProcess();
    }

    canProcess() {
        // 1. Check Fuel
        if (this.timers.fuel.value <= 0) {
            const fuelItem = this.inventory.getItem(13);
            if (fuelItem && (fuelItem.typeId === "minecraft:coal" || fuelItem.typeId === "minecraft:charcoal" || fuelItem.typeId === "minecraft:blaze_powder")) {
                // Consume fuel
                this.consumeItem(13, 1);
                this.timers.fuel.value = this.timers.fuel.max;
            } else {
                return false; // No fuel
            }
        }

        // 2. Check Recipe
        // For demo: 1 Iron Ingot in ANY input slot -> 1 Gold Nugget
        // Real logic would require all 4 slots.
        const inputSlots = [4, 12, 14, 22];
        let foundInput = false;
        
        for (const slot of inputSlots) {
            const item = this.inventory.getItem(slot);
            if (item && item.typeId === "minecraft:iron_ingot") {
                foundInput = true;
                break;
            }
        }
        
        if (!foundInput) return false;

        // 3. Check Output Space
        const outItem = this.inventory.getItem(26);
        if (outItem) {
            if (outItem.typeId !== "minecraft:gold_nugget") return false;
            if (outItem.amount >= outItem.maxStackSize) return false;
        }

        return true;
    }

    processTick(dt) {
        // Burn fuel
        if (this.timers.fuel.value > 0) {
            this.timers.fuel.add(-dt);
        }

        // Advance Process
        this.timers.spin.add(dt);

        if (this.timers.spin.value >= this.timers.spin.max) {
            this.completeProcess();
            this.timers.spin.value = 0;
        }
    }

    completeProcess() {
        // Find input
        const inputSlots = [4, 12, 14, 22];
        let consumed = false;
        
        for (const slot of inputSlots) {
            const item = this.inventory.getItem(slot);
            if (item && item.typeId === "minecraft:iron_ingot") {
                this.consumeItem(slot, 1);
                consumed = true;
                break; // One per operation
            }
        }

        if (consumed) {
            // Output
            const outItem = this.inventory.getItem(26);
            if (outItem) {
                outItem.amount++;
                this.inventory.setItem(26, outItem);
            } else {
                this.inventory.setItem(26, new ItemStack("minecraft:gold_nugget", 1));
            }
            
            // FX
            this.block.dimension.playSound("random.levelup", this.block.location);
        }
    }
}

// Register with the system
blockEntityManager.register(MineralCentrifuge);
