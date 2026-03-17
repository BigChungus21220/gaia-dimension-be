/**
 * --- Base Machine Class Library ---
 * Created by Luminiae Federation
 */
import { world, system, ItemStack } from "@minecraft/server";


// Getting segment from a value (0-based index)
function getSegment(initialValue, currentValue, parts) {
    if (parts === 0 || initialValue === 0) return 0;
    // Map 0..initialValue to 0..(parts-1)
    // If currentValue is 0, return 0.
    // If currentValue is initialValue, return parts - 1.
    const ratio = Math.max(0, Math.min(1, currentValue / initialValue));
    return Math.floor(ratio * (parts - 1)); // -1 to keep it within 0..parts-1 bounds? 
    // Wait, if parts is 12 (frames 0-11).
    // ratio 1 * 11 = 11. ratio 0 = 0.
    // If ratio is 0.99 * 11 = 10.89 -> 10.
    // This seems correct for 0-based frames where 0 is empty/start and max is full.
    // However, for flame (burn down), we might want 0 to be empty (or 0 index) and max to be full (11 index).
    // Yes.
}

/**
 * Manages scoreboard-based timers for a specific entity.
 */
class TimerManager {
    entity;
    timers = new Map();

    constructor(entity, timerConfig) {
        this.entity = entity;
        if (!timerConfig) return;
        
        for (const timerName in timerConfig) {
            const scoreboardId = `gaiadimension:${timerName}`;
            let objective = world.scoreboard.getObjective(scoreboardId);
            if (!objective) {
                objective = world.scoreboard.addObjective(scoreboardId, timerName);
            }
            
            // Allow max to be dynamic (default to config)
            let currentMax = timerConfig[timerName].max;

            // Define the property to return a helper object, not just a number
            Object.defineProperty(this, timerName, {
                get: () => {
                    return {
                        get value() {
                            try {
                                return objective.getScore(entity) ?? 0;
                            } catch (e) { return 0; }
                        },
                        set value(val) {
                            try {
                                objective.setScore(entity, val);
                            } catch (e) {}
                        },
                        get max() {
                            return currentMax;
                        },
                        set max(val) {
                            currentMax = val;
                        },
                        add: (amount) => {
                            try {
                                objective.addScore(entity, amount);
                            } catch (e) {}
                        }
                    };
                },
                enumerable: true
            });
        }
    }
}

/**
 * The base class for all custom machines.
 * Handles inventory management, UI rendering, timers, and processing logic.
 */
export class Machine {
    static get NAME() { throw new Error("Machine class must override static getter 'NAME'."); }
    static get TIMERS() { return {}; }
    static get UI_CONFIG() { return { classicProfile: {}, pocketProfile: {} }; }
    static get RECIPES() { return {}; }
    static get INVENTORY_SIZE() { return 27; }

    /**
     * Initializes a new machine instance.
     * @param {Entity} entity - The entity representing the machine.
     * @param {Block} block - The block associated with the machine.
     */
    constructor(entity, block) {
        this.entity = entity;
        this.block = block;
        this.config = this.constructor;
        this.inventory = this.entity.getComponent('minecraft:inventory').container;
        this.timers = new TimerManager(this.entity, this.config.TIMERS);
        
        // Optimization State
        this.tickCount = 0;
        this.uiTickCount = 0;
        this.cachedPlayers = [];
        this.locKey = null; // Set by BlockEntityManager for O(1) lookups
        this.cachedUiProfile = null;
        this.isViewed = false; // Gated by BlockEntityManager for prioritized 20TPS updates
        this.lastTickTime = system.currentTick; // Basis for delta-time (dt) logic compensation
        
        this.dynamicButtons = new Map();

        // Slot Protection State
        this.lastResultSnapshots = new Map();
        this.initResultSnapshots();

        // Initial Render
        this.cachedUiProfile = this.getCurrentUiProfile();
        this.renderStaticUI(this.cachedUiProfile);
    }

    /**
     * Dynamically adds a button to the machine instance.
     * @param {number} slot 
     * @param {string} icon - Item Type ID
     * @param {string} callback - Name of the method to call on interaction
     */
    setButton(slot, icon, callback) {
        this.dynamicButtons.set(slot, { icon, callback });
    }

    /**
     * Initializes snapshot of result slots to prevent ejecting existing items on load.
     */
    initResultSnapshots() {
        const uiProfile = this.getCurrentUiProfile();
        if (!uiProfile) return;
        
        const resultSlots = [
            ...(uiProfile.resultSlots || []),
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined);

        for (const slot of resultSlots) {
            const item = this.inventory.getItem(slot);
            if (item) {
                this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
            } else {
                this.lastResultSnapshots.delete(slot);
            }
        }
    }

    /**
     * Main tick loop for the machine.
     * Logic processing is consistent via dt. UI and interaction checks are gated by isViewed.
     * @param {number} dt - Delta time (ticks elapsed since last update).
     */
    tick(dt = 1) {
        const prevTick = this.tickCount;
        this.tickCount += dt;

        const isCheckTick = Math.floor(prevTick / 5) < Math.floor(this.tickCount / 5);

        // Security: Check for invalid inputs every 5 ticks.
        if (isCheckTick) {
            this.monitorStrictSlots();
        }

        if (this.canProcess()) {
            this.processTick(dt);
        }
        this.onTick(dt);

        // Optimization: Hopper interactions run every 8 ticks.
        if (Math.floor(prevTick / 8) < Math.floor(this.tickCount / 8)) {
            this.handleHopperInteractions();
        }

        // --- UI & Interaction Logic (Only when viewed) ---
        // isViewed is managed externally by the centralized manager to optimize physics checks
        if (this.isViewed) {
             // Spatial scan for nearby players; only occurs when the machine is verified active
            if (Math.floor(prevTick / 10) < Math.floor(this.tickCount / 10) || this.cachedPlayers.length === 0) {
                this.cachedPlayers = this.getNearbyPlayers();
            }

            this.uiTickCount += dt;
            
            // Refresh Profile (Block state might have changed in onTick)
            this.cachedUiProfile = this.getCurrentUiProfile();
            const uiProfile = this.cachedUiProfile;

            // UI Refresh & Inventory Enforcement
            this.enforceCursor(this.cachedPlayers);
            this.enforcePlayerInventory(this.cachedPlayers);
            this.handleInteractions(uiProfile);
            this.renderStaticUI(uiProfile);
            this.renderAnimatedUI(uiProfile);
            this.updateUI();

            // Low-Frequency Snapshots (Every 20 ticks / 1s)
            if (this.uiTickCount % 20 === 0) {
                this.updateResultSnapshots(); 
            }
        } else {
            // Memory cleanup when machine exits active viewing state
            if (this.cachedPlayers.length > 0) this.cachedPlayers = [];
        }
    }

    /**
     * Handles "fake button" interactions.
     * Detects if a button slot is empty or has a swapped item, triggers the action, and resets the button.
     * @param {Object} uiProfile - The current UI configuration.
     */
    handleInteractions(uiProfile) {
        const buttons = uiProfile && uiProfile.buttons ? { ...uiProfile.buttons } : {};
        
        for (const [slot, btn] of this.dynamicButtons) {
            buttons[slot] = btn;
        }

        if (Object.keys(buttons).length === 0) return;

        for (const [slotStr, btnConfig] of Object.entries(buttons)) {
            const slot = parseInt(slotStr);
            const currentItem = this.inventory.getItem(slot);
            const expectedId = btnConfig.icon;

            // Trigger Condition: Item is missing OR Item is different from the button icon
            if (!currentItem || currentItem.typeId !== expectedId) {
                
                // 1. Handle Swapped Item (Player put something in the button slot)
                if (currentItem) {
                    this.ejectItem(currentItem);
                }

                // 2. Reset Button Immediately
                this.setInventoryItem(slot, new ItemStack(expectedId, 1), uiProfile);

                // 3. Feedback
                try {
                    this.block.dimension.playSound('random.click', this.block.location);
                } catch(e) {}

                // 4. Execute Action
                if (typeof this[btnConfig.callback] === 'function') {
                    this[btnConfig.callback](this.cachedPlayers[0]); // Pass a player (approximate)
                }
            }
        }
    }

    /**
     * Safely sets an item in the machine's inventory, updating security snapshots.
     */
    setInventoryItem(slot, item, cachedUiProfile = null) {
        try {
            this.inventory.setItem(slot, item);
            
            const uiProfile = cachedUiProfile || this.cachedUiProfile || this.getCurrentUiProfile();
            if (uiProfile) {
                const resultSlots = [
                    ...(uiProfile.resultSlots || []),
                    uiProfile.secondaryResultSlot
                ];
                if (resultSlots.includes(slot)) {
                    if (item) {
                        this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
                    } else {
                        this.lastResultSnapshots.delete(slot);
                    }
                }
            }
        } catch (e) {}
    }

    /**
     * strict checks for Fuel and Result slots.
     */
    monitorStrictSlots() {
        const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
        if (!uiProfile) return;

        // 1. Fuel Slot Validation
        if (uiProfile.fuelSlot !== undefined) {
            const item = this.inventory.getItem(uiProfile.fuelSlot);
            if (item && !this.isValidFuel(item)) {
                this.setInventoryItem(uiProfile.fuelSlot, undefined, uiProfile);
                this.ejectItem(item);
            }
        }

        // 2. Result Slot Protection
        const resultSlots = [
            ...(uiProfile.resultSlots || []),
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined);

        for (const slot of resultSlots) {
            const currentItem = this.inventory.getItem(slot);
            const lastSnapshot = this.lastResultSnapshots.get(slot);

            if (!currentItem) continue;

            let isPlayerAction = false;
            let amountToEject = 0;

            if (!lastSnapshot) {
                isPlayerAction = true;
                amountToEject = currentItem.amount;
            } else if (currentItem.typeId !== lastSnapshot.typeId) {
                isPlayerAction = true;
                amountToEject = currentItem.amount;
            } else if (currentItem.amount > lastSnapshot.amount) {
                isPlayerAction = true;
                amountToEject = currentItem.amount - lastSnapshot.amount;
            }

            if (isPlayerAction) {
                if (amountToEject >= currentItem.amount) {
                    this.setInventoryItem(slot, undefined, uiProfile);
                    this.ejectItem(currentItem);
                } else {
                    currentItem.amount -= amountToEject;
                    this.setInventoryItem(slot, currentItem, uiProfile);
                    
                    const ejectedStack = new ItemStack(currentItem.typeId, amountToEject);
                    this.ejectItem(ejectedStack);
                }
            }
        }
    }

    /**
     * Updates the snapshot of result slots. 
     */
    updateResultSnapshots() {
        const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
        if (!uiProfile) return;
        
        const resultSlots = [
            ...(uiProfile.resultSlots || []),
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined);

        for (const slot of resultSlots) {
            const item = this.inventory.getItem(slot);
            if (item) {
                this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
            } else {
                this.lastResultSnapshots.delete(slot);
            }
        }
    }

    /**
     * Checks if an item is valid fuel for this machine.
     * @param {ItemStack} item 
     */
    isValidFuel(item) {
        if (!this.config.FUEL_ITEMS) return true; // No restriction defined
        return !!this.config.FUEL_ITEMS[item.typeId];
    }

    /**
     * Called every tick, regardless of processing state.
     * Useful for updating visual states (like 'on' status), fuel timers, or other continuous logic.
     * @param {number} dt - Ticks elapsed.
     */
    onTick(dt) { }

    /**
     * Called every tick when players are viewing the machine, after renderUI.
     * Override this to update dynamic UI elements using setItemDisplay.
     */
    updateUI() { }

    /**
     * Updates the display properties (Name, Lore) of an item in a specific slot.
     * @param {number} slot - The inventory slot index.
     * @param {string} name - The new name for the item.
     * @param {string[]} lore - The new lore strings for the item.
     * @param {Object} cachedUiProfile - Optional cached profile.
     */
    setItemDisplay(slot, name, lore = [], cachedUiProfile = null) {
        const item = this.inventory.getItem(slot);
        if (!item) return;

        const currentLore = item.getLore();
        const loreChanged = lore.length !== currentLore.length || lore.some((l, i) => l !== currentLore[i]);
        const nameChanged = name !== undefined && item.nameTag !== name;

        if (!loreChanged && !nameChanged) return;

        if (name !== undefined) item.nameTag = name;
        if (lore !== undefined) item.setLore(lore);
        
        this.setInventoryItem(slot, item, cachedUiProfile);
    }

    /**
     * Safely consumes a specified amount of items from a slot.
     * Handles decrementing stack size or removing the item if depleted.
     * @param {number} slot - The inventory slot index.
     * @param {number} amount - Amount to consume (default 1).
     * @returns {boolean} True if items were consumed, false if slot was empty or had insufficient items.
     */
    consumeItem(slot, amount = 1) {
        const item = this.inventory.getItem(slot);
        if (!item || item.amount < amount) return false;

        const newAmount = item.amount - amount;
        if (newAmount > 0) {
            item.amount = newAmount;
            this.setInventoryItem(slot, item);
        } else {
            this.setInventoryItem(slot, undefined);
        }
        return true;
    }

    /**
     * Determines if the machine has valid inputs, fuel, and space for outputs.
     * @returns {boolean} True if processing can proceed.
     */
    canProcess() { return false; }

    /**
     * Executed when 'canProcess' returns true.
     * Handles timer increments, item consumption, and product creation.
     */
    processTick() { }

    /**
     * Gets players near the machine for UI interactions.
     * Only called when the machine is marked as 'viewed' by the central manager.
     */
    getNearbyPlayers() {
        return this.block.dimension.getPlayers({ 
            maxDistance: 6, 
            location: this.block.location 
        });
    }

    /**
     * Checks if the machine is currently active (processing items).
     * @returns {boolean} True if the 'cook' timer is greater than 0 or if the machine can start processing.
     */
    isRunning() {
        return (this.timers.cook && this.timers.cook.value > 0) || this.canProcess();
    }

    /**
     * Prevents players from interacting with UI-only slots (placeholders, static icons, animated bars).
     * Also clears cursor if they picked up a UI item.
     * @param {Player[]} players - List of players to enforce inventory rules on.
     */
    enforceCursor(players) {
        for (const player of players) {
            // A. Check Cursor
            const cursorComp = player.getComponent('minecraft:cursor_inventory');
            if (cursorComp && cursorComp.item) {
                if (this.isUiItem(cursorComp.item)) {
                    cursorComp.clear();
                }
            }
        }
    }

    /**
     * Strict cleanup of player inventory and machine functional slots.
     */
    enforcePlayerInventory(players) {
        const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
        if (!uiProfile) return;

        for (const player of players) {
            // B. Check Main Inventory
            const inventory = player.getComponent('minecraft:inventory');
            if (!inventory) continue;
            const container = inventory.container;
            
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (this.isUiItem(item)) {
                    // Instantly remove any UI item found in player inventory
                    container.setItem(i, undefined);
                }
            }
        }

        // 2. Enforce Machine Inventory (Self-Cleaning & Stack Limits)
        const functionalSlots = new Set([
            ...(uiProfile.inputSlots || []),
            ...(uiProfile.resultSlots || []),
            uiProfile.fuelSlot,
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined));

        for (let slot = 0; slot < this.inventory.size; slot++) {
            const item = this.inventory.getItem(slot);
            if (!item) continue;

            const isUiItem = this.isUiItem(item);

            if (functionalSlots.has(slot)) {
                if (isUiItem) {
                    this.setInventoryItem(slot, undefined, uiProfile);
                }
            } else {
                if (isUiItem && item.amount > 1) {
                    item.amount = 1;
                    this.setInventoryItem(slot, item, uiProfile);
                }
            }
        }
    }

    /**
     * Renders static UI elements and placeholders.
     */
    renderStaticUI(uiProfile) {
        if (!uiProfile) return;

        const userSlots = [
            ...(uiProfile.inputSlots || []),
            ...(uiProfile.resultSlots || []),
            uiProfile.fuelSlot,
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined);

        for (let slot = 0; slot < this.inventory.size; slot++) {
            if (userSlots.includes(slot)) continue;

            let desiredId = 'gaiadimension:placeholder_invisible';
            
            if (uiProfile.staticUI && uiProfile.staticUI[slot]) {
                desiredId = uiProfile.staticUI[slot];
            }

            if (uiProfile.buttons && uiProfile.buttons[slot]) {
                desiredId = uiProfile.buttons[slot].icon;
            }

            if (this.dynamicButtons.has(slot)) {
                desiredId = this.dynamicButtons.get(slot).icon;
            }

            let isAnimatedAndRunning = false;
            if (uiProfile.animatedUI) {
                const animPart = uiProfile.animatedUI.find(part => part.slot === slot);
                if (animPart) {
                    const timer = this.timers[animPart.timer];
                    if (timer && timer.value > 0) {
                        isAnimatedAndRunning = true;
                    }
                }
            }

            if (isAnimatedAndRunning) continue;

            const currentItem = this.inventory.getItem(slot);

            if (!currentItem || currentItem.typeId !== desiredId) {
                if (currentItem && currentItem.typeId !== "minecraft:air") {
                    this.ejectItem(currentItem);
                    try {
                        this.inventory.setItem(slot, undefined); // Force clear to prevent duplication
                    } catch (e) {}
                }

                try {
                    this.setInventoryItem(slot, new ItemStack(desiredId, 1), uiProfile);
                } catch (e) { }
            }
        }
    }

    /**
     * Renders animated UI elements based on machine state.
     */
    renderAnimatedUI(uiProfile) {
        if (!uiProfile) return;
        if (uiProfile.animatedUI) {
            for (const part of uiProfile.animatedUI) {
                const timer = this.timers[part.timer];
                if (timer === undefined) continue;

                if (timer.value <= 0) continue; // Skip if timer is inactive

                const remainingTime = timer.value;
                let maxTime = timer.max; // Default to config max
                
                if (part.maxTimer && this.timers[part.maxTimer]) {
                    maxTime = this.timers[part.maxTimer].value;
                }

                const offset = part.segmentOffset || 0;

                const segment = getSegment(maxTime, remainingTime, part.steps) + offset;
                const frameId = `${part.baseId}_${Math.max(0, segment)}`;

                const currentItem = this.inventory.getItem(part.slot);
                
                if (!currentItem || currentItem.typeId !== frameId) {
                    try {
                        this.setInventoryItem(part.slot, new ItemStack(frameId, 1), uiProfile);
                    } catch (e) { }
                }
            }
        }
    }

    /**
     * Checks if an item is a protected UI element (static or animated).
     * @param {ItemStack} item 
     */
    isUiItem(item) {
        if (!item) return false;
        
        // Global ban list check
        if (BANNED_ITEMS.has(item.typeId)) return true;
        for (const prefix of BANNED_PREFIXES) {
            if (item.typeId.startsWith(prefix)) return true;
        }

        const uiProfile = this.getCurrentUiProfile();
        if (!uiProfile) return false;

        const bannedItems = new Set(['gaiadimension:placeholder_invisible']);
        
        if (uiProfile.staticUI) {
            Object.values(uiProfile.staticUI).forEach(id => bannedItems.add(id));
        }

        if (uiProfile.buttons) {
                Object.values(uiProfile.buttons).forEach(btn => bannedItems.add(btn.icon));
            }

            for (const btn of this.dynamicButtons.values()) {
                bannedItems.add(btn.icon);
            }

        if (bannedItems.has(item.typeId)) return true;
        if (uiProfile.animatedUI) {
            for (const part of uiProfile.animatedUI) {
                if (item.typeId.startsWith(part.baseId)) return true;
            }
        }
        return false;
    }

    /**
     * Ejects an item from the machine's inventory, attempting to return it to a player
     * or dropping it in the world if no player can take it.
     * @param {ItemStack} itemStack - The item to eject.
     */
    ejectItem(itemStack) {
        if (!itemStack || itemStack.amount === 0) return;

        // Security: Never eject UI items to the world or player
        if (this.isUiItem(itemStack)) return;

        // Try to give to nearest player
        const player = this.cachedPlayers[0];
        if (player) {
            const inventory = player.getComponent("inventory");
            if (inventory) {
                const remainder = inventory.container.addItem(itemStack);
                if (!remainder) return; // All items added
                itemStack = remainder; // Update itemStack to be the remainder
            }
        }

        // If we still have items (no player or full inventory), drop them
        if (itemStack.amount > 0) {
            const dim = this.block.dimension;
             try {
                // Spawn slightly above the block to ensure visibility
                const dropLoc = { x: this.block.location.x + 0.5, y: this.block.location.y + 1.2, z: this.block.location.z + 0.5 };
                dim.spawnItem(itemStack, dropLoc);
            } catch (e) {}
        }
    }

    /**
     * Retrieves the current UI configuration based on block state.
     */
    getCurrentUiProfile() {
        const pocketUi = this.block.permutation.getState('gaiadimension:pocket_ui');
        return this.config.UI_CONFIG[pocketUi ? 'pocketProfile' : 'classicProfile'];
    }

    handleHopperInteractions() {
        const uiProfile = this.getCurrentUiProfile();
        if (!uiProfile) return;

        // Output to Hopper Below (Push)
        try {
            const hopperBelow = this.block.below();
            if (hopperBelow && hopperBelow.typeId === "minecraft:hopper") {
                const outputSlots = [
                    ...(uiProfile.resultSlots || []),
                    uiProfile.secondaryResultSlot
                ].filter(s => s !== undefined);
                
                if (outputSlots.length > 0) {
                    this.pushToHopper(hopperBelow, outputSlots);
                }
            }
        } catch (e) {}

        // Input from Hopper Above (Pull)
        try {
            const hopperAbove = this.block.above();
            if (hopperAbove && hopperAbove.typeId === "minecraft:hopper") {
                // Check if hopper is facing DOWN (0) and not locked
                const facing = hopperAbove.permutation.getState("facing_direction");
                const isLocked = hopperAbove.permutation.getState("toggle_bit");
                
                if (facing === 0 && !isLocked && uiProfile.inputSlots) {
                    this.pullFromHopper(hopperAbove, uiProfile.inputSlots);
                }
            }
        } catch (e) {}

        // Input from Side Hoppers (Fuel/Catalyst) (Pull)
        if (uiProfile.fuelSlot !== undefined) {
            const directions = {
                north: 3, // Hopper at North must face South (3)
                east: 4,  // Hopper at East must face West (4)
                south: 2, // Hopper at South must face North (2)
                west: 5   // Hopper at West must face East (5)
            };

            for (const [dir, requiredFacing] of Object.entries(directions)) {
                try {
                    const hopperSide = this.block[dir](); // e.g., block.north()
                    if (hopperSide && hopperSide.typeId === "minecraft:hopper") {
                        const facing = hopperSide.permutation.getState("facing_direction");
                        const isLocked = hopperSide.permutation.getState("toggle_bit");

                        if (facing === requiredFacing && !isLocked) {
                            this.pullFromHopper(hopperSide, [uiProfile.fuelSlot]);
                        }
                    }
                } catch (e) {}
            }
        }
    }

    /**
     * Pushes items from specific machine slots into a target hopper.
     */
    pushToHopper(hopperBlock, sourceSlots) {
        if (hopperBlock.permutation.getState("toggle_bit")) return; // Hopper is locked

        const hopperInventory = hopperBlock.getComponent("inventory")?.container;
        if (!hopperInventory) return;

        // Find first available output item
        for (const slot of sourceSlots) {
            const item = this.inventory.getItem(slot);
            if (!item) continue;

            // Try to add one item to hopper
            const itemToMove = new ItemStack(item.typeId, 1);
            const remainder = hopperInventory.addItem(itemToMove);
            
            if (!remainder || remainder.amount === 0) {
                // Success: Remove 1 from machine
                if (item.amount > 1) {
                    item.amount--;
                    this.setInventoryItem(slot, item);
                } else {
                    this.setInventoryItem(slot, undefined);
                }
                return; // Move only 1 item per tick per operation type
            }
        }
    }

    /**
     * Pulls items from a source hopper into specific machine slots.
     */
    pullFromHopper(hopperBlock, targetSlots) {
        const hopperInventory = hopperBlock.getComponent("inventory")?.container;
        if (!hopperInventory) return;

                
        // Find the first item in the hopper
        let hopperSlot = -1;
        let itemToMove = null;

        for (let i = 0; i < hopperInventory.size; i++) {
            const item = hopperInventory.getItem(i);
            if (item) {
                hopperSlot = i;
                itemToMove = item;
                break;
            }
        }

        if (!itemToMove) return;

        // Try to fit it into one of the target slots
        for (const slot of targetSlots) {
            const currentItem = this.inventory.getItem(slot);

            if (!currentItem) {
                // Slot is empty, we can move it
                const newItem = new ItemStack(itemToMove.typeId, 1);
                this.setInventoryItem(slot, newItem);
                
                // Remove from hopper
                if (itemToMove.amount > 1) {
                    itemToMove.amount--;
                    hopperInventory.setItem(hopperSlot, itemToMove);
                } else {
                    hopperInventory.setItem(hopperSlot, undefined);
                }
                return;
            } else if (currentItem.typeId === itemToMove.typeId && currentItem.amount < currentItem.maxStackSize) {
                // Slot has same item and space
                currentItem.amount++;
                this.setInventoryItem(slot, currentItem);

                 // Remove from hopper
                 if (itemToMove.amount > 1) {
                    itemToMove.amount--;
                    hopperInventory.setItem(hopperSlot, itemToMove);
                } else {
                    hopperInventory.setItem(hopperSlot, undefined);
                }
                return;
            }
        }
    }

    /**
     * Called when the machine is destroyed/removed.
     * Ejects all valid player items (inputs, outputs, fuel) to the world.
     */
    destroy() {
        if (!this.inventory) return;

        const uiProfile = this.getCurrentUiProfile();
        if (!uiProfile) return;

        // Collect all functional slots that might contain player items
        const functionalSlots = [
            ...(uiProfile.inputSlots || []),
            ...(uiProfile.resultSlots || []),
            uiProfile.fuelSlot,
            uiProfile.secondaryResultSlot
        ].filter(s => s !== undefined);

        const itemsToDrop = [];
        const dim = this.entity.dimension; // Capture dimension reference
        const dropLoc = { 
            x: this.entity.location.x, 
            y: this.entity.location.y + 0.5, 
            z: this.entity.location.z 
        };

        // 1. Synchronous Collection (using cached inventory)
        for (const slot of functionalSlots) {
            const item = this.inventory.getItem(slot);
            if (item) {
                itemsToDrop.push(new ItemStack(item.typeId, item.amount));
                try {
                    this.inventory.setItem(slot, undefined);
                } catch(e) {}
            }
        }

        // 2. Asynchronous Spawning (Safe Context)
        if (itemsToDrop.length > 0) {
            system.run(() => {
                for (const stack of itemsToDrop) {
                    try {
                        dim.spawnItem(stack, dropLoc);
                    } catch (e) {
                        console.warn(`[Machine] Failed to spawn dropped item: ${e}`);
                    }
                }
            });
        }
    }

    /**
     * Registers UI items from a machine config to be strictly managed (banned from drop/player inv).
     * @param {Object} config - The machine's UI_CONFIG
     */
    static processUiConfig(config) {
        if (!config) return;
        
        BANNED_ITEMS.add("gaiadimension:placeholder_invisible");

        const profiles = [config.classicProfile, config.pocketProfile];
        for (const profile of profiles) {
            if (!profile) continue;

            if (profile.staticUI) {
                Object.values(profile.staticUI).forEach(id => BANNED_ITEMS.add(id));
            }
            if (profile.animatedUI) {
                profile.animatedUI.forEach(part => {
                    if (part.baseId) BANNED_PREFIXES.add(part.baseId);
                });
            }
        }
    }
}

// --- Global UI Item Protection ---
const BANNED_ITEMS = new Set(["gaiadimension:placeholder_invisible"]);
const BANNED_PREFIXES = new Set();

world.afterEvents.entitySpawn.subscribe((event) => {
    const { entity } = event;
    if (entity.typeId !== "minecraft:item") return;

    try {
        const itemComp = entity.getComponent("minecraft:item");
        if (!itemComp || !itemComp.itemStack) return;

        const typeId = itemComp.itemStack.typeId;

        if (BANNED_ITEMS.has(typeId)) {
            system.run(() => {
                try { if (entity.isValid) entity.remove(); } catch (e) {}
            });
            return;
        }

        for (const prefix of BANNED_PREFIXES) {
            if (typeId.startsWith(prefix)) {
                system.run(() => {
                    try { if (entity.isValid) entity.remove(); } catch (e) {}
                });
                return;
            }
        }
    } catch (e) {
    }
});