/**
 * --- Advanced Machine Class Library ---
 * Created by Luminiae Federation
 * 
 * Extends the base Machine class to support:
 * 1. Virtual Inventory (Unlimited storage via QIDB/Structures)
 * 2. Pagination (View subsets of items)
 * 3. Advanced Slot Locking & Security
 */

import { world, system, ItemStack } from "@minecraft/server";
import { Machine } from "./Machine.js";

/**
 * Manages persistent item storage using Structures (QIDB Logic).
 */
class MachineStorage {
    constructor(machineId, dimension) {
        this.key = `adv_mach:${machineId}`;
        this.dimension = dimension;
        // Storage location for temp entities (swap space)
        // We use a fixed far location to avoid loading issues, assuming chunk is active.
        // In a real scenario, this might need a dedicated ticking area management system.
        this.storageLoc = { x: 0, y: 318, z: 0 }; 
    }

    /**
     * Loads items from structure storage.
     * @returns {Promise<ItemStack[]>}
     */
    async load() {
        // Check if structure exists
        const structure = world.structureManager.get(this.key);
        if (!structure) return [];

        // Load structure to world
        try {
            // Place structure at temp location
            world.structureManager.place(this.key, this.dimension, this.storageLoc, { includeEntities: true });
        } catch (e) {
            console.warn(`[AdvancedMachine] Failed to place structure for ${this.key}: ${e}`);
            return [];
        }

        // Extract items from temp entity
        const entities = this.dimension.getEntities({ location: this.storageLoc, type: "qidb:storage", maxDistance: 2 });
        const items = [];

        if (entities.length > 0) {
            const container = entities[0].getComponent("inventory").container;
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (item) items.push(item);
            }
            
            // Cleanup
            entities[0].remove();
        }

        // Clean up structure from memory if needed, but we keep it for now.
        return items;
    }

    /**
     * Saves items to structure storage.
     * @param {ItemStack[]} items 
     */
    async save(items) {
        // 1. Clean previous entities at location
        const existing = this.dimension.getEntities({ location: this.storageLoc, type: "qidb:storage", maxDistance: 2 });
        existing.forEach(e => { if (e.isValid) e.remove(); });

        if (items.length === 0) {
            // Delete structure if empty
            if (world.structureManager.get(this.key)) {
                world.structureManager.delete(this.key);
            }
            return;
        }

        // 2. Spawn temp entity
        const storageEntity = this.dimension.spawnEntity("qidb:storage", this.storageLoc);
        const container = storageEntity.getComponent("inventory").container;

        // 3. Fill inventory (Standard chest limit 27, assuming items fit in one structure/entity for now)
        // TODO: Support multi-entity chaining for > 27 items if needed.
        for (let i = 0; i < Math.min(items.length, 27); i++) {
            container.setItem(i, items[i]);
        }

        // 4. Create Structure
        // Delete old structure first
        if (world.structureManager.get(this.key)) {
            world.structureManager.delete(this.key);
        }

        world.structureManager.createFromWorld(this.key, this.dimension, this.storageLoc, this.storageLoc, { saveMode: "World", includeEntities: true });

        // 5. Cleanup
        if (storageEntity.isValid) storageEntity.remove();
    }
}

export class AdvancedMachine extends Machine {
    /**
     * @param {Entity} entity 
     * @param {Block} block 
     */
    constructor(entity, block) {
        super(entity, block);
        
        // Virtual Inventory State
        this.virtualItems = []; 
        this.storage = new MachineStorage(`${block.location.x}_${block.location.y}_${block.location.z}`, block.dimension);
        
        // Pagination State
        this.currentPage = 0;
        this.itemsPerPage = 1; // Default, override in subclass
        this.pageSlotStart = 0; // The starting slot index in physical inventory for the list
        
        // Load data asynchronously
        this.isLoaded = false;
        this.initStorage();
    }

    async initStorage() {
        this.virtualItems = await this.storage.load();
        this.isLoaded = true;
        // Trigger a refresh
        if (this.isViewed) this.renderPage();
    }

    /**
     * Saves current virtual inventory to disk.
     * Call this after modifying virtualItems.
     */
    saveStorage() {
        if (!this.isLoaded) return;
        this.storage.save(this.virtualItems);
    }

    /**
     * Configuration for the paged view.
     * @returns {Object} { startSlot: number, count: number, prevSlot?: number, nextSlot?: number, prevIcon?: string, nextIcon?: string }
     */
    getPageViewConfig() {
        // Override this in subclass
        return { startSlot: 0, count: 0 };
    }

    /**
     * Renders the current page of virtual items into the physical slots.
     */
    renderPage() {
        if (!this.isLoaded) return; // Show loading?

        const config = this.getPageViewConfig();
        const start = this.currentPage * config.count;
        const pageItems = this.virtualItems.slice(start, start + config.count);

        for (let i = 0; i < config.count; i++) {
            const physicalSlot = config.startSlot + i;
            const virtualItem = pageItems[i];

            if (virtualItem) {
                // We clone to ensure we aren't modifying the master array by ref accidentally
                this.inventory.setItem(physicalSlot, new ItemStack(virtualItem.typeId, virtualItem.amount));
                // Restore dynamic properties/lore if possible?
                // Note: ItemStack constructor loses NBT. 
                // In a real full implementation, we need to Clone the item properly.
                // However, the Script API doesn't support 'clone()' of ItemStack perfectly in all versions.
                // But since virtualItems[i] IS an ItemStack, we can just set it.
                // this.inventory.setItem(physicalSlot, virtualItem); 
                // BUT, if the player grabs it, they take the reference? No, setItem copies.
                this.inventory.setItem(physicalSlot, virtualItem);
            } else {
                this.inventory.setItem(physicalSlot, undefined);
            }
        }
        
        this.updateNavigationButtons();
    }

    /**
     * Handles interactions with the virtual list.
     * Override handleInteractions to catch clicks on list slots.
     */
    handleInteractions(uiProfile) {
        super.handleInteractions(uiProfile);

        if (!this.isLoaded) return;

        const config = this.getPageViewConfig();
        const slotsToCheck = [];
        for(let i=0; i<config.count; i++) slotsToCheck.push(config.startSlot + i);

        // Check if player took an item from the list
        for (let i = 0; i < config.count; i++) {
            const physicalSlot = config.startSlot + i;
            const virtualIndex = (this.currentPage * config.count) + i;
            
            // Current physical state
            const currentItem = this.inventory.getItem(physicalSlot);
            const storedItem = this.virtualItems[virtualIndex];

            // 1. Item Removed (Player picked it up)
            if (storedItem && !currentItem) {
                // Logic: Does this machine allow taking items?
                // If yes, remove from virtualItems and save.
                // If no, restore it.
                
                if (this.canTakeItems()) {
                    this.virtualItems.splice(virtualIndex, 1);
                    this.saveStorage();
                    this.renderPage(); // Re-render to shift items up
                    return; // Stop processing to avoid conflicts
                } else {
                    this.inventory.setItem(physicalSlot, storedItem); // Restore
                    // Clear cursor?
                    const player = this.cachedPlayers[0];
                    if (player) {
                        const cursor = player.getComponent('cursor_inventory');
                        if (cursor.item && cursor.item.typeId === storedItem.typeId) {
                            cursor.clear();
                        }
                    }
                }
            }
            
            // 2. Item Added (Player put something in)
            // Implementation depends on if we want to support adding via slots.
        }
    }

    canTakeItems() { return false; } // Default to read-only list

    nextPage() {
        const config = this.getPageViewConfig();
        const maxPage = Math.max(0, Math.ceil(this.virtualItems.length / config.count) - 1);
        if (this.currentPage < maxPage) {
            this.currentPage++;
            this.renderPage();
            this.playClickSound();
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPage();
            this.playClickSound();
        }
    }

    playClickSound() {
        try {
            this.block.dimension.playSound("random.click", this.block.location);
        } catch(e) {}
    }

    updateNavigationButtons() {
        const config = this.getPageViewConfig();
        // Return if slots are not defined in the config
        if (config.prevSlot === undefined || config.nextSlot === undefined) return;

        // Calculate Max Page
        if (config.count <= 0) return;
        const maxPage = Math.max(0, Math.ceil(this.virtualItems.length / config.count) - 1);

        // --- Previous Page Button ---
        if (this.currentPage > 0) {
            const icon = config.prevIcon || "minecraft:arrow"; 
            this.setButton(config.prevSlot, icon, "prevPage");
            this.setItemDisplay(config.prevSlot, "§ePrevious Page");
        } else {
            if (this.dynamicButtons.has(config.prevSlot)) {
                this.dynamicButtons.delete(config.prevSlot);
                this.setInventoryItem(config.prevSlot, new ItemStack("gaiadimension:placeholder_invisible", 1));
            }
        }

        // --- Next Page Button ---
        if (this.currentPage < maxPage) {
            const icon = config.nextIcon || "minecraft:arrow";
            this.setButton(config.nextSlot, icon, "nextPage");
            this.setItemDisplay(config.nextSlot, "§eNext Page");
        } else {
             if (this.dynamicButtons.has(config.nextSlot)) {
                this.dynamicButtons.delete(config.nextSlot);
                this.setInventoryItem(config.nextSlot, new ItemStack("gaiadimension:placeholder_invisible", 1));
            }
        }
    }
}