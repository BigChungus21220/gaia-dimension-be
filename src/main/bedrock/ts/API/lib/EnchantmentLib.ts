import { world, system, ItemStack, Player, EntityHitEntityAfterEvent, PlayerBreakBlockAfterEvent, Entity } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

/**
 * --- Custom Enchantment Library ---
 * Provides a framework for creating, applying, and managing custom enchantments.
 * Integrates with the vanilla Enchanting Table via Sneak + Interact.
 */

interface EnchantmentConfig {
    name: string;
    maxLevel?: number;
    appliesTo?: string[];
    onHit?: (event: EntityHitEntityAfterEvent, level: number) => void;
    onMine?: (event: PlayerBreakBlockAfterEvent, level: number) => void;
    onTick?: (player: Player, itemStack: ItemStack, level: number) => void;
    costPerLevel?: number | ((level: number) => number);
}

interface RegisteredEnchantment extends EnchantmentConfig {
    id: string;
    maxLevel: number;
    appliesTo: string[];
    costPerLevel: number | ((level: number) => number);
}

class EnchantmentManager {
    private registry: Map<string, RegisteredEnchantment>;

    constructor() {
        this.registry = new Map();
        this.initEvents();
    }

    /**
     * Registers a new custom enchantment.
     * @param id - Unique identifier (e.g., 'luminiae:lifesteal')
     * @param config - Configuration object
     */
    register(id: string, config: EnchantmentConfig): void {
        this.registry.set(id, {
            id,
            name: config.name,
            maxLevel: config.maxLevel || 1,
            appliesTo: config.appliesTo || [],
            onHit: config.onHit,
            onMine: config.onMine,
            onTick: config.onTick,
            costPerLevel: config.costPerLevel || ((lvl: number) => lvl * 3)
        });
    }

    initEvents(): void {
        // Visual Management Loop (Cursor vs Inventory)
        system.runInterval(() => this.manageVisuals(), 5);

        // 1. Table Interaction (UI)
        world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
            const { block, player } = ev;
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
            const { damagingEntity } = ev;
            if (!damagingEntity || !damagingEntity.getComponent("minecraft:equippable")) return;
            
            const equippable = damagingEntity.getComponent("minecraft:equippable") as any;
            const mainHand = equippable.getEquipment("Mainhand");
            
            if (mainHand) {
                this.triggerEnchants(mainHand, 'onHit', ev);
            }
        });

        // 3. Mining Trigger
        world.afterEvents.playerBreakBlock.subscribe((ev) => {
            const { itemStack } = ev;
            if (itemStack) {
                this.triggerEnchants(itemStack, 'onMine', ev);
            }
        });
    }

    /**
     * Triggers registered callbacks for an item's enchants.
     */
    triggerEnchants(itemStack: ItemStack, triggerType: 'onHit' | 'onMine' | 'onTick', eventData: any): void {
        const enchants = this.getEnchantments(itemStack);
        for (const [id, level] of Object.entries(enchants)) {
            const config = this.registry.get(id);
            if (config && config[triggerType]) {
                (config[triggerType] as Function)(eventData, level);
            }
        }
    }

    /**
     * Opens the Enchanting UI for the player.
     * @param player 
     */
    async openEnchantmentUI(player: Player): Promise<void> {
        const equippable = player.getComponent("minecraft:equippable") as any;
        const itemStack = equippable?.getEquipment("Mainhand");

        if (!itemStack) {
            player.sendMessage("§cHold an item to enchant.");
            return;
        }

        const validEnchants: { config: RegisteredEnchantment, nextLevel: number, cost: number }[] = [];
        const currentEnchants = this.getEnchantments(itemStack);

        // Filter applicable enchants
        for (const [id, config] of this.registry) {
            // Check compatibility
            const isCompatible = config.appliesTo.some(type => itemStack.typeId.includes(type));
            if (!isCompatible) continue;

            const currentLevel = (currentEnchants[id] as number) || 0;
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
            form.button(`${e.config.name} ${this.toRoman(e.nextLevel)}\n${color}Cost: ${e.cost} Lvl`);
        });

        const response = await form.show(player);
        if (response.canceled || response.selection === undefined) return;

        const selection = validEnchants[response.selection];
        this.applyEnchantmentTransaction(player, itemStack, selection);
    }

    /**
     * Handles the transaction of XP and applying the enchant.
     */
    applyEnchantmentTransaction(player: Player, itemStack: ItemStack, selection: { config: RegisteredEnchantment, nextLevel: number, cost: number }): void {
        const { config, nextLevel, cost } = selection;

        if (player.level < cost && player.getGameMode() !== 'creative') {
            player.sendMessage(`§cNot enough XP! Need ${cost} levels.`);
            player.playSound("note.bass");
            return;
        }

        // Apply Enchantment Logic
        const newItem = this.applyEnchantment(itemStack, config.id, nextLevel);
        
        // Update Inventory
        const equippable = player.getComponent("minecraft:equippable") as any;
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
     * @returns The modified item stack.
     */
    applyEnchantment(itemStack: ItemStack, id: string, level: number): ItemStack {
        const config = this.registry.get(id);
        if (!config) return itemStack;

        // 1. Update Data (Dynamic Properties)
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
     * @param itemStack 
     * @param shouldHaveGlint 
     */
    updateGlint(itemStack: ItemStack, shouldHaveGlint = true): void {
        const enchantable = itemStack.getComponent("minecraft:enchantable") as any;
        if (!enchantable) return;

        const hasDummy = itemStack.getDynamicProperty("luminiae:dummy_glint") as boolean;
        const currentVanillas = enchantable.getEnchantments();

        if (shouldHaveGlint) {
            // Restore Glint: Only if no real enchants exist
            if (currentVanillas.length === 0) {
                try {
                    enchantable.addEnchantment({ typeId: "unbreaking", level: 0 });
                    itemStack.setDynamicProperty("luminiae:dummy_glint", true);
                } catch (e) {
                    try {
                        enchantable.addEnchantment({ typeId: "unbreaking", level: 1 });
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

    /**
     * Scans players to toggle glint state (Clean in cursor, Glint in inventory).
     */
    manageVisuals(): void {
        for (const player of world.getAllPlayers()) {
            // A. Check Cursor (Remove Glint)
            const cursorComp = player.getComponent("minecraft:cursor_inventory") as any;
            if (cursorComp && cursorComp.item) {
                const item = cursorComp.item;
                if (this.hasCustomEnchants(item) && item.getDynamicProperty("luminiae:dummy_glint")) {
                    this.updateGlint(item, false);
                    cursorComp.item = item;
                }
            }

            // B. Check Inventory (Restore Glint)
            const invComp = player.getComponent("minecraft:inventory") as any;
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
            const equipComp = player.getComponent("minecraft:equippable") as any;
            if (equipComp) {
                const slots = ["Mainhand", "Offhand", "Head", "Chest", "Legs", "Feet"] as const;
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

    hasCustomEnchants(item: ItemStack): boolean {
        return !!item.getDynamicProperty("luminiae:enchants");
    }

    /**
     * Helper to retrieve custom enchantments object from item dynamic property.
     * @param itemStack 
     * @returns Key-value map of enchants
     */
    getEnchantments(itemStack: ItemStack): Record<string, number> {
        if (!itemStack) return {};
        const data = itemStack.getDynamicProperty("luminiae:enchants") as string;
        if (!data) return {};
        try {
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }

    /**
     * Converts a number to Roman numeral.
     * @param num 
     */
    toRoman(num: number): string {
        const roman: Record<string, number> = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
        let str = '';
        for (let i of Object.keys(roman)) {
            let q = Math.floor(num / roman[i]);
            num -= q * roman[i];
            str += i.repeat(q);
        }
        return str;
    }
}

export const enchantmentManager = new EnchantmentManager();
