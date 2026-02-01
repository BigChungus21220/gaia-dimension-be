import { world, system, ItemStack } from "@minecraft/server";
import { AdvancedMachine } from "../API/lib/AdvancedMachine.js";
import blockEntityManager from "../API/lib/BlockEntity.js";

export class ArcaneLibrary extends AdvancedMachine {
    static get NAME() { return "arcane_library"; }

    static get UI_CONFIG() {
        return {
            classicProfile: {
                // Slots 0-17 are the Virtual Display (Page View)
                // Slot 18: Prev Page
                // Slot 26: Next Page
                // Slot 22: Input (Deposit)
                
                // We mark 0-17 as "inputSlots" so the base Machine class doesn't auto-fill them with placeholders.
                inputSlots: [
                    0, 1, 2, 3, 4, 5, 6, 7, 8,
                    9, 10, 11, 12, 13, 14, 15, 16, 17,
                    22
                ],
                
                buttons: {
                    // Icons for navigation are handled dynamically by AdvancedMachine, 
                    // but we can define defaults here if we wanted.
                }
            },
            pocketProfile: {}
        };
    }

    /**
     * Configuration for the paged view managed by AdvancedMachine.
     */
    getPageViewConfig() {
        return {
            startSlot: 0,
            count: 18, // 2 Rows of 9
            prevSlot: 18,
            nextSlot: 26,
            prevIcon: "minecraft:arrow", // Vanilla Arrow
            nextIcon: "minecraft:arrow"
        };
    }

    /**
     * Allow players to withdraw items from the virtual list.
     */
    canTakeItems() {
        return true;
    }

    /**
     * Custom Tick Logic: Handle Depositing items from Slot 22.
     */
    onTick(dt) {
        super.onTick(dt);

        // Deposit Logic
        // Check if there is an item in the input slot (22)
        const inputItem = this.inventory.getItem(22);
        if (inputItem) {
            this.depositItem(inputItem);
        }
    }

    /**
     * Moves an item from physical input to virtual storage.
     * @param {ItemStack} item 
     */
    depositItem(item) {
        // 1. Add to virtual storage
        // We clone it effectively by creating a new ItemStack record in our array
        // (AdvancedMachine stores ItemStacks, or plain objects if serializing)
        
        // Since AdvancedMachine uses Structure storage, it expects ItemStacks.
        // We push it to the end of the list.
        this.virtualItems.push(item);
        
        // 2. Save Storage
        this.saveStorage();
        
        // 3. Clear Input Slot
        this.inventory.setItem(22, undefined);
        
        // 4. Feedback
        this.block.dimension.playSound("random.orb", this.block.location);
        
        // 5. Refresh View if we are on the last page or it affects current view
        this.renderPage();
    }
}

// Register
blockEntityManager.register(ArcaneLibrary);