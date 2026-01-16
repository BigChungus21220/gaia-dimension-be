import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

/**
 * --- Custom Enchantment Library ---
 * Provides a framework for creating, applying, and managing custom enchantments.
 * Integrates with the vanilla Enchanting Table via Sneak + Interact.
 */

class EnchantmentManager {
    constructor() {
        this.registry = new Map();
        this.initEvents();
    }

    /**
     * Registers a new custom enchantment.
     * @param {string} id - Unique identifier (e.g., 'luminiae:lifesteal')
     * @param {Object} config - Configuration object
     * @param {string} config.name - Display name (e.g., 'Life Steal')
     * @param {number} config.maxLevel - Maximum level (default: 1)
     * @param {string[]} config.appliesTo - Array of item type substrings (e.g., ['sword', 'axe'])
     * @param {Function} [config.onHit] - Callback (event, level) for entity hits
     * @param {Function} [config.onMine] - Callback (event, level) for block breaking
     * @param {Function} [config.onTick] - Callback (player, itemStack, level) (Performance intensive)
     * @param {Object} [config.costPerLevel] - XP Levels cost function or constant (default: level * 3)
     */
    register(id, config) {
        this.registry.set(id, {
            id,
            name: config.name,
            maxLevel: config.maxLevel || 1,
            appliesTo: config.appliesTo || [],
            onHit: config.onHit,
            onMine: config.onMine,
            onTick: config.onTick,
            costPerLevel: config.costPerLevel || ((lvl) => lvl * 3)
        });
    }

    initEvents() {
        // 1. Table Interaction (UI)
        world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
            const { block, player, itemStack } = ev;
            if (block.typeId === "minecraft:enchanting_table" && player.isSneaking) {
                // Cancel vanilla interaction if we can serve a custom UI
                ev.cancel = true;
                
                // We need to run UI on the next tick because we are cancelling the beforeEvent
                system.run(() => {
                    this.openEnchantmentUI(player);
                });
            }
        });

        // 2. Combat Trigger
        world.afterEvents.entityHitEntity.subscribe((ev) => {
            const { damagingEntity, hitEntity } = ev;
            if (!damagingEntity || !damagingEntity.getComponent("minecraft:equippable")) return;
            
            const equippable = damagingEntity.getComponent("minecraft:equippable");
            const mainHand = equippable.getEquipment("Mainhand");
            
            if (mainHand) {
                this.triggerEnchants(mainHand, 'onHit', ev);
            }
        });

        // 3. Mining Trigger
        world.afterEvents.playerBreakBlock.subscribe((ev) => {
            const { player, itemStack } = ev;
            if (itemStack) {
                this.triggerEnchants(itemStack, 'onMine', ev);
            }
        });
    }

    /**
     * Triggers registered callbacks for an item's enchants.
     */
    triggerEnchants(itemStack, triggerType, eventData) {
        const enchants = this.getEnchantments(itemStack);
        for (const [id, level] of Object.entries(enchants)) {
            const config = this.registry.get(id);
            if (config && config[triggerType]) {
                config[triggerType](eventData, level);
            }
        }
    }

    /**
     * Opens the Enchanting UI for the player.
     * @param {import("@minecraft/server").Player} player 
     */
    async openEnchantmentUI(player) {
        const equippable = player.getComponent("minecraft:equippable");
        const itemStack = equippable.getEquipment("Mainhand");

        if (!itemStack) {
            player.sendMessage("§cHold an item to enchant.");
            return;
        }

        const validEnchants = [];
        const currentEnchants = this.getEnchantments(itemStack);

        // Filter applicable enchants
        for (const [id, config] of this.registry) {
            // Check compatibility
            const isCompatible = config.appliesTo.some(type => itemStack.typeId.includes(type));
            if (!isCompatible) continue;

            const currentLevel = currentEnchants[id] || 0;
            if (currentLevel >= config.maxLevel) continue;

            const nextLevel = currentLevel + 1;
            const cost = typeof config.costPerLevel === 'function' ? config.costPerLevel(nextLevel) : config.costPerLevel;

            validEnchants.push({ config, nextLevel, cost });
        }

        if (validEnchants.length === 0) {
            player.sendMessage("§cNo available enchantments for this item (or maxed out).");
            return;
        }

        const form = new ActionFormData()
            .title("Custom Enchanting")
            .body(`§7Item: ${itemStack.typeId.split(':')[1]}
§7XP Level: ${player.level}`);

        validEnchants.forEach(e => {
            const color = player.level >= e.cost ? "§2" : "§c";
            form.button(`${e.config.name} ${this.toRoman(e.nextLevel)}
${color}Cost: ${e.cost} Lvl`);
        });

        const response = await form.show(player);
        if (response.canceled) return;

        const selection = validEnchants[response.selection];
        this.applyEnchantmentTransaction(player, itemStack, selection);
    }

    /**
     * Handles the transaction of XP and applying the enchant.
     */
    applyEnchantmentTransaction(player, itemStack, selection) {
        const { config, nextLevel, cost } = selection;

        if (player.level < cost && player.getGameMode() !== 'creative') {
            player.sendMessage(`§cNot enough XP! Need ${cost} levels.`);
            player.playSound("note.bass");
            return;
        }

        // Apply Enchantment Logic
        const newItem = this.applyEnchantment(itemStack, config.id, nextLevel);
        
        // Update Inventory
        const equippable = player.getComponent("minecraft:equippable");
        equippable.setEquipment("Mainhand", newItem);

        // Deduct XP
        if (player.getGameMode() !== 'creative') {
            player.addLevels(-cost);
        }

        // FX
        player.dimension.playSound("random.levelup", player.location);
        player.sendMessage(`§aEnchanted with ${config.name} ${this.toRoman(nextLevel)}!`);
    }

    /**
     * Applies an enchantment to an item stack (Data + Lore).
     * @returns {ItemStack} The modified item stack.
     */
    applyEnchantment(itemStack, id, level) {
        const config = this.registry.get(id);
        if (!config) return itemStack;

        // 1. Update Data (Dynamic Properties)
        // Note: Using a single JSON property to avoid clutter
        const enchants = this.getEnchantments(itemStack);
        enchants[id] = level;
        itemStack.setDynamicProperty("luminiae:enchants", JSON.stringify(enchants));

        // 2. Update Lore (Visuals)
        const currentLore = itemStack.getLore() || [];
        const newLoreLine = `§7${config.name} ${this.toRoman(level)}`;
        
        // Remove old level of same enchant if exists
        const cleanLore = currentLore.filter(line => !line.includes(`§7${config.name}`));
        cleanLore.unshift(newLoreLine); // Add to top

        itemStack.setLore(cleanLore);

        // Apply visual glint via dummy vanilla enchantment
        this.updateGlint(itemStack);

        return itemStack;
    }

    /**
     * Toggles the dummy glint based on context.
     * @param {ItemStack} itemStack 
     * @param {boolean} shouldHaveGlint 
     */
    updateGlint(itemStack, shouldHaveGlint = true) {
        const enchantable = itemStack.getComponent("minecraft:enchantable");
        if (!enchantable) return;

        const hasDummy = itemStack.getDynamicProperty("luminiae:dummy_glint");
        const currentVanillas = enchantable.getEnchantments();

        if (shouldHaveGlint) {
            // Restore Glint: Only if no real enchants exist
            if (currentVanillas.length === 0) {
                try {
                    enchantable.addEnchantment({ type: "unbreaking", level: 0 });
                    itemStack.setDynamicProperty("luminiae:dummy_glint", true);
                } catch (e) {
                    try {
                        enchantable.addEnchantment({ type: "unbreaking", level: 1 });
                        itemStack.setDynamicProperty("luminiae:dummy_glint", true);
                    } catch (e2) {}
                }
            }
        } else {
            // Remove Glint: Only if it was our dummy
            if (hasDummy) {
                // Double check if it's still just Unbreaking (don't wipe real enchants if they got mixed somehow)
                const unbreaking = enchantable.getEnchantment("unbreaking");
                if (unbreaking && currentVanillas.length === 1) {
                    enchantable.removeAllEnchantments();
                    itemStack.setDynamicProperty("luminiae:dummy_glint", undefined);
                }
            }
        }
    }

    initEvents() {
        // Visual Management Loop (Cursor vs Inventory)
        system.runInterval(() => this.manageVisuals(), 5);

        // 1. Table Interaction (UI)
        world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
            const { block, player, itemStack } = ev;
            if (block.typeId === "minecraft:enchanting_table" && player.isSneaking) {
                // Cancel vanilla interaction if we can serve a custom UI
                ev.cancel = true;
                
                // We need to run UI on the next tick because we are cancelling the beforeEvent
                system.run(() => {
                    this.openEnchantmentUI(player);
                });
            }
        });

        // 2. Combat Trigger
        world.afterEvents.entityHitEntity.subscribe((ev) => {
            const { damagingEntity, hitEntity } = ev;
            if (!damagingEntity || !damagingEntity.getComponent("minecraft:equippable")) return;
            
            const equippable = damagingEntity.getComponent("minecraft:equippable");
            const mainHand = equippable.getEquipment("Mainhand");
            
            if (mainHand) {
                this.triggerEnchants(mainHand, 'onHit', ev);
            }
        });

        // 3. Mining Trigger
        world.afterEvents.playerBreakBlock.subscribe((ev) => {
            const { player, itemStack } = ev;
            if (itemStack) {
                this.triggerEnchants(itemStack, 'onMine', ev);
            }
        });
    }

    /**
     * Scans players to toggle glint state (Clean in cursor, Glint in inventory).
     */
    manageVisuals() {
        for (const player of world.getAllPlayers()) {
            // A. Check Cursor (Remove Glint)
            const cursorComp = player.getComponent("minecraft:cursor_inventory");
            if (cursorComp && cursorComp.item) {
                const item = cursorComp.item;
                if (this.hasCustomEnchants(item) && item.getDynamicProperty("luminiae:dummy_glint")) {
                    this.updateGlint(item, false);
                    cursorComp.item = item;
                }
            }

            // B. Check Inventory (Restore Glint)
            // Optimization: Checking full inventory every 5 ticks per player is acceptable (36 slots)
            const invComp = player.getComponent("minecraft:inventory");
            if (invComp && invComp.container) {
                const container = invComp.container;
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("luminiae:dummy_glint")) {
                        // Only restore if it lacks vanilla enchants (handled in updateGlint)
                        this.updateGlint(item, true);
                        if (item.getDynamicProperty("luminiae:dummy_glint")) {
                            container.setItem(i, item);
                        }
                    }
                }
            }
            
            // C. Check Equipment (Mainhand/Offhand/Armor)
            const equipComp = player.getComponent("minecraft:equippable");
            if (equipComp) {
                const slots = ["Mainhand", "Offhand", "Head", "Chest", "Legs", "Feet"];
                for (const slot of slots) {
                    const item = equipComp.getEquipment(slot);
                    if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("luminiae:dummy_glint")) {
                        this.updateGlint(item, true);
                        if (item.getDynamicProperty("luminiae:dummy_glint")) {
                            equipComp.setEquipment(slot, item);
                        }
                    }
                }
            }
        }
    }

    hasCustomEnchants(item) {
        return !!item.getDynamicProperty("luminiae:enchants");
    }

    /**
     * Triggers registered callbacks for an item's enchants.
     */
