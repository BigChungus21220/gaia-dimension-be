// @ts-nocheck
import { world, system, ItemStack, Player, EquipmentSlot, GameMode } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

/**
 * --- Custom Enchantment Library ---
 * Uses a per-addon invisible "enchant_dummy" entity on enchanting tables
 * for cross-addon compatible custom enchantment UIs.
 * Namespace is auto-detected from the first registered enchantment ID.
 */

class EnchantmentManager {
    constructor() {
        this.registry = new Map();
        this.uiCooldowns = new Map();
        this.namespace = null;
        this.hitboxEntities = new Map(); // playerId -> entity
        this.isLeader = false; // Only the leader spawns dummies and opens UI
        this.initEvents();
    }

    /**
     * Registers a new custom enchantment.
     * Auto-detects addon namespace from the first enchantment ID (e.g. 'decayed:wither_shot' -> 'decayed').
     */
    register(id, config) {
        // Auto-detect namespace from the first registered enchantment
        if (!this.namespace && id.includes(':')) {
            this.namespace = id.split(':')[0];
        }

        this.registry.set(id, {
            id,
            name: config.name,
            bookId: config.bookId || `${id}_book`,
            maxLevel: config.maxLevel || 1,
            appliesTo: config.appliesTo || [],
            entityHitEntity: config.entityHitEntity,
            playerBreakBlock: config.playerBreakBlock,
            onHurt: config.onHurt,
            projectileHitBlock: config.projectileHitBlock,
            onTick: config.onTick,
            costPerLevel: config.costPerLevel || ((lvl) => lvl * 3),
            _costMultiplier: config.costMultiplier || 3
        });
    }

    get dummyEntityType() {
        return this.namespace ? `${this.namespace}:enchant_dummy` : null;
    }

    /**
     * Helper to find enchant ID from book item ID.
     */
    getEnchantFromBook(itemStack) {
        if (!itemStack) return null;
        for (const [id, config] of this.registry) {
            if (config.bookId === itemStack.typeId) {
                return id;
            }
        }
        return null;
    }

    initEvents() {
        // Visual Management Loop (Cursor vs Inventory Glint)
        system.runInterval(() => this.manageVisuals(), 5);

        // Dummy entity management — only leader spawns/manages dummies
        system.runInterval(() => this.manageDummies(), 10);

        // Leader election — determines which instance handles UI & dummies
        system.runInterval(() => this.electLeader(), 20);

        // Interact with the dummy entity to open custom enchantment UI
        // Only the elected leader instance responds
        world.afterEvents.playerInteractWithEntity.subscribe((ev) => {
            if (!this.isLeader) return;
            const { player, target } = ev;
            if (!target.hasTag("mirage_enchant_dummy")) return;

            const now = Date.now();
            if (this.uiCooldowns.has(player.id) && now - this.uiCooldowns.get(player.id) < 1000) {
                return;
            }
            this.uiCooldowns.set(player.id, now);

            // JIT Shared Registry Building
            world.setDynamicProperty("mirage:shared_registry", JSON.stringify({}));
            player.runCommand(`scriptevent mirage:broadcast_enchants`);

            system.runTimeout(() => {
                this.openEnchantmentUI(player);
            }, 3);
        });

        // Script Events for Cross-Addon Communication
        system.afterEvents.scriptEventReceive.subscribe((ev) => {
            if (ev.id === "mirage:broadcast_enchants") {
                let shared = {};
                try {
                    const data = world.getDynamicProperty("mirage:shared_registry");
                    if (data) shared = JSON.parse(data);
                } catch(e) {}

                for (const [id, config] of this.registry) {
                    shared[id] = {
                        id: config.id,
                        name: config.name,
                        maxLevel: config.maxLevel,
                        appliesTo: config.appliesTo,
                        _costMultiplier: config._costMultiplier
                    };
                }
                world.setDynamicProperty("mirage:shared_registry", JSON.stringify(shared));
            }

            if (ev.id === "mirage:apply_enchant") {
                try {
                    const data = JSON.parse(ev.message);
                    if (this.registry.has(data.enchantId)) {
                        const player = ev.sourceEntity;
                        if (!player) return;

                        const inventory = player.getComponent("minecraft:inventory").container;
                        const item = inventory.getItem(data.slot);
                        if (!item || item.typeId !== data.itemTypeId) return;

                        if (player.getGameMode() !== GameMode.Creative) {
                            player.addLevels(-data.cost);
                        }

                        this.applyEnchantment(item, data.enchantId, data.level);
                        inventory.setItem(data.slot, item);

                        player.dimension.spawnParticle("minecraft:enchanting_table_particle", player.location);
                        player.playSound("random.levelup");
                        const enchantName = this.registry.get(data.enchantId).name;
                        player.sendMessage(`§aSuccessfully enchanted with ${enchantName} ${data.level}!`);
                    }
                } catch(e) {}
            }
        });

        // Anvil — sneak + interact while holding a custom enchant book
        // Only the leader handles this to prevent double UI
        world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
            if (!this.isLeader) return;
            const { player, block } = ev;
            if (!player.isSneaking) return;
            if (this.registry.size === 0) return;
            if (!block.typeId.includes("anvil")) return;

            const now = Date.now();
            if (this.uiCooldowns.has(player.id) && now - this.uiCooldowns.get(player.id) < 1000) return;

            const equippable = player.getComponent("minecraft:equippable");
            const itemStack = equippable?.getEquipment(EquipmentSlot.Mainhand);
            const enchantId = this.getEnchantFromBook(itemStack);
            if (enchantId) {
                this.uiCooldowns.set(player.id, now);
                player.dimension.spawnParticle("minecraft:villager_happy", {
                    x: block.location.x + 0.5,
                    y: block.location.y + 1,
                    z: block.location.z + 0.5
                });
                player.playSound("random.anvil_use");
                this.openAnvilBookApplyUI(player, itemStack, enchantId);
            }
        });

        // Inform players about custom interactions
        world.afterEvents.playerPlaceBlock.subscribe((ev) => {
            const { block, player } = ev;
            if (block.typeId === "minecraft:enchanting_table") {
                player.sendMessage("§d[Enchantment] §eInteract with the table to access Custom Enchantments!");
            } else if (block.typeId.includes("anvil")) {
                player.sendMessage("§d[Anvil] §eSneak + Interact with a Custom Book to combine!");
            }
        });

        // Combat Trigger
        world.afterEvents.entityHitEntity.subscribe((ev) => {
            const { damagingEntity, hitEntity } = ev;
            if (!damagingEntity || !damagingEntity.isValid || !damagingEntity.getComponent("minecraft:equippable")) return;

            const equippable = damagingEntity.getComponent("minecraft:equippable");
            const mainHand = equippable.getEquipment("Mainhand");

            if (mainHand) {
                this.triggerEnchants(mainHand, 'entityHitEntity', ev);
            }
        });

        // Mining Trigger
        world.afterEvents.playerBreakBlock.subscribe((ev) => {
            const { player, itemStack } = ev;
            if (itemStack) {
                this.triggerEnchants(itemStack, 'playerBreakBlock', ev);
            }
        });

        world.afterEvents.entityHurt.subscribe((ev) => {
            const { hurtEntity } = ev;
            if (!hurtEntity || !hurtEntity.isValid || !hurtEntity.getComponent('minecraft:equippable')) return;
            const equippable = hurtEntity.getComponent('minecraft:equippable');
            const armorSlots = ['Head', 'Chest', 'Legs', 'Feet'];
            for (const slot of armorSlots) {
                const item = equippable.getEquipment(slot);
                if (item) this.triggerEnchants(item, 'onHurt', ev);
            }
        });

        world.afterEvents.projectileHitBlock.subscribe((ev) => {
            const { source } = ev;
            if (!source || !source.isValid || !source.getComponent('minecraft:equippable')) return;
            const equippable = source.getComponent('minecraft:equippable');
            const mainHand = equippable.getEquipment('Mainhand');
            if (mainHand) this.triggerEnchants(mainHand, 'projectileHitBlock', ev);
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
     * Leader Election — only ONE instance across all addons handles UI & dummies.
     * Each instance writes a heartbeat. The lowest alphabetical namespace wins.
     * Non-leaders deactivate dummy management and UI handling.
     */
    electLeader() {
        if (!this.namespace) return;

        const now = Date.now();

        // Write our heartbeat so other instances know we exist
        try {
            world.setDynamicProperty(`mirage:enchant_hb_${this.namespace}`, now);
        } catch(e) {}

        // Read the instance registry (list of all known namespaces)
        let instances = [];
        try {
            const data = world.getDynamicProperty("mirage:enchant_instances");
            if (data) instances = JSON.parse(data);
        } catch(e) {}

        // Register ourselves if not already in the list
        if (!instances.includes(this.namespace)) {
            instances.push(this.namespace);
            try {
                world.setDynamicProperty("mirage:enchant_instances", JSON.stringify(instances));
            } catch(e) {}
        }

        // Remove stale instances (no heartbeat in 5 seconds)
        const alive = instances.filter(ns => {
            try {
                const hb = world.getDynamicProperty(`mirage:enchant_hb_${ns}`);
                return hb && (now - hb) < 5000;
            } catch(e) { return false; }
        });

        // Update the alive list
        if (alive.length !== instances.length) {
            try {
                world.setDynamicProperty("mirage:enchant_instances", JSON.stringify(alive));
            } catch(e) {}
        }

        // Deterministic leader: lowest alphabetical namespace wins
        alive.sort();
        const wasLeader = this.isLeader;
        this.isLeader = alive.length > 0 && alive[0] === this.namespace;

        // If we just became leader, clean up any orphaned dummies from other instances
        if (this.isLeader && !wasLeader) {
            // We'll let manageDummies handle spawning fresh ones
        }
    }

    // --- Dummy Entity Management ---

    /**
     * For each player, checks if they're near an enchanting table.
     * Spawns/maintains a dummy entity on top of it for interaction.
     * Only runs if this instance is the elected leader.
     */
    manageDummies() {
        if (!this.namespace || this.registry.size === 0) return;
        if (!this.isLeader) return;

        const activePlayers = new Set();
        for (const player of world.getAllPlayers()) {
            if (!player.isValid) continue;
            activePlayers.add(player.id);
            this.updateHitboxDummy(player);
        }

        // Clean up dummies for disconnected players — only remove if WE own it
        for (const [pid, entity] of this.hitboxEntities) {
            if (!activePlayers.has(pid)) {
                try {
                    if (entity?.isValid && entity.typeId === this.dummyEntityType) {
                        entity.remove();
                    }
                } catch { }
                this.hitboxEntities.delete(pid);
            }
        }
    }

    updateHitboxDummy(player) {
        const existing = this.hitboxEntities.get(player.id);

        // Only show the dummy when sneaking — otherwise let the player break/use the table normally
        if (!player.isSneaking) {
            if (existing?.isValid && existing.typeId === this.dummyEntityType) {
                try { existing.remove(); } catch { }
            }
            this.hitboxEntities.delete(player.id);
            return;
        }

        const loc = player.location;
        const dim = player.dimension;
        let bestTablePos = null;
        let minDistanceSq = Infinity;

        // Scan nearby blocks for enchanting table
        const R = 4;
        for (let dx = -R; dx <= R; dx++) {
            for (let dz = -R; dz <= R; dz++) {
                for (let dy = -2; dy <= 2; dy++) {
                    try {
                        const block = dim.getBlock({
                            x: Math.floor(loc.x) + dx,
                            y: Math.floor(loc.y) + dy,
                            z: Math.floor(loc.z) + dz
                        });
                        if (block?.typeId === "minecraft:enchanting_table") {
                            const bLoc = block.location;
                            const distSq = Math.pow(bLoc.x + 0.5 - loc.x, 2) + Math.pow(bLoc.y - loc.y, 2) + Math.pow(bLoc.z + 0.5 - loc.z, 2);
                            if (distSq < minDistanceSq) {
                                minDistanceSq = distSq;
                                bestTablePos = bLoc;
                            }
                        }
                    } catch { }
                }
            }
        }

        if (bestTablePos) {
            if (existing?.isValid) {
                // Move dummy if table changed position
                const ep = existing.location;
                if (Math.abs(ep.x - (bestTablePos.x + 0.5)) > 0.5 ||
                    Math.abs(ep.z - (bestTablePos.z + 0.5)) > 0.5 ||
                    Math.abs(ep.y - bestTablePos.y) > 0.5) {
                    try {
                        existing.teleport({
                            x: bestTablePos.x + 0.5,
                            y: bestTablePos.y,
                            z: bestTablePos.z + 0.5
                        });
                    } catch { }
                }
            } else {
                // Check if another addon already placed a dummy at this table
                const tableCenter = {
                    x: bestTablePos.x + 0.5,
                    y: bestTablePos.y,
                    z: bestTablePos.z + 0.5
                };
                try {
                    const existingDummies = dim.getEntities({
                        location: tableCenter,
                        maxDistance: 1.5,
                        tags: ["mirage_enchant_dummy"]
                    });
                    if (existingDummies.length > 0) {
                        // Reuse the existing dummy from another addon
                        this.hitboxEntities.set(player.id, existingDummies[0]);
                    } else {
                        // No dummy exists yet — spawn ours and tag it
                        const entity = dim.spawnEntity(this.dummyEntityType, tableCenter);
                        entity.addTag("mirage_enchant_dummy");
                        this.hitboxEntities.set(player.id, entity);
                    }
                } catch (e) { }
            }
        } else {
            // No nearby table — only remove if we own it
            if (existing?.isValid && existing.typeId === this.dummyEntityType) {
                try { existing.remove(); } catch { }
            }
            this.hitboxEntities.delete(player.id);
        }
    }

    // --- Enchanting Table UI ---

    async openEnchantmentUI(player) {
        const inventory = player.getComponent("minecraft:inventory").container;

        // Fetch unified registry built via JIT broadcast
        let sharedRegistry = new Map();
        try {
            const data = world.getDynamicProperty("mirage:shared_registry");
            if (data) {
                const parsed = JSON.parse(data);
                for (const key in parsed) {
                    sharedRegistry.set(key, parsed[key]);
                }
            }
        } catch(e) {}

        // Fallback to local registry if JIT failed
        if (sharedRegistry.size === 0) {
            sharedRegistry = this.registry;
        }

        // Collect every inventory item that can receive at least one enchantment
        const candidates = []; // { slot, item }

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (!item) continue;
            if (this.hasAnyApplicableEnchant(item, player, sharedRegistry)) {
                candidates.push({ slot: i, item, source: 'inv' });
            }
        }

        if (candidates.length === 0) {
            player.sendMessage("§cNo enchantable items in your inventory. (" + sharedRegistry.size + " enchants registered)");
            return;
        }

        // Step 1 – item picker
        const itemForm = new ActionFormData()
            .title("Custom Enchanting")
            .body(`§7Select an item to enchant\n§7XP Level: ${player.level}`);

        candidates.forEach(c => {
            const label = c.item.nameTag || c.item.typeId.split(':')[1];
            itemForm.button(`${label}\n§8Slot ${c.slot}`);
        });

        system.runTimeout(async () => {
            try {
                const itemResp = await itemForm.show(player);
                if (itemResp.canceled) return;

                const chosen = candidates[itemResp.selection];

                // Step 2 – enchantment picker for the chosen item
                const validEnchants = [];
                const currentEnchants = this.getEnchantments(chosen.item);

                for (const [id, config] of sharedRegistry) {
                    const isCompatible = config.appliesTo.some(type => chosen.item.typeId.includes(type));
                    if (!isCompatible) continue;

                    const currentLevel = currentEnchants[id] || 0;
                    if (currentLevel >= config.maxLevel && player.getGameMode() !== GameMode.Creative) continue;

                    const nextLevel = currentLevel + 1;
                    const cost = config._costMultiplier ? nextLevel * config._costMultiplier : (typeof config.costPerLevel === 'function' ? config.costPerLevel(nextLevel) : config.costPerLevel);
                    validEnchants.push({ config, nextLevel, cost });
                }

                if (validEnchants.length === 0) {
                    player.sendMessage("§cNo available enchantments for this item (or maxed out).");
                    return;
                }

                const enchForm = new ActionFormData()
                    .title("Select Enchantment")
                    .body(`§7Item: ${chosen.item.typeId.split(':')[1]}\n§7Available Enchants:`);

                validEnchants.forEach(({ config, nextLevel, cost }) => {
                    enchForm.button(`§d${config.name} ${nextLevel}\n§2Cost: ${cost} levels`);
                });

                const enchResp = await enchForm.show(player);
                if (enchResp.canceled) return;

                const selected = validEnchants[enchResp.selection];
                
                // Final application logic via Script Event
                if (player.getGameMode() !== GameMode.Creative && player.level < selected.cost) {
                    player.sendMessage("§cNot enough experience levels!");
                    return;
                }

                const applyData = {
                    enchantId: selected.config.id,
                    level: selected.nextLevel,
                    cost: selected.cost,
                    slot: chosen.slot,
                    itemTypeId: chosen.item.typeId
                };

                player.runCommand(`scriptevent mirage:apply_enchant ${JSON.stringify(applyData)}`);

            } catch (e) {
                // Ignore UI overlap errors
            }
        });
    }

    /**
     * Returns true if the item can receive at least one registered enchant.
     */
    hasAnyApplicableEnchant(item, player, customRegistry = null) {
        const currentEnchants = this.getEnchantments(item);
        const reg = customRegistry || this.registry;
        for (const [id, config] of reg) {
            const isCompatible = config.appliesTo.some(type => item.typeId.includes(type));
            if (!isCompatible) continue;
            const currentLevel = currentEnchants[id] || 0;
            if (currentLevel < config.maxLevel || player?.getGameMode() === GameMode.Creative) return true;
        }
        return false;
    }

    applyEnchantmentTransaction(player, itemStack, selection) {
        const { config, nextLevel, cost } = selection;

        if (player.level < cost && player.getGameMode() !== GameMode.Creative) {
            player.sendMessage(`§cNot enough XP! Need ${cost} levels.`);
            player.playSound("note.bass");
            return;
        }

        const newItem = this.applyEnchantment(itemStack, config.id, nextLevel);

        const equippable = player.getComponent("minecraft:equippable");
        equippable.setEquipment("Mainhand", newItem);

        if (player.getGameMode() !== GameMode.Creative) {
            player.addLevels(-cost);
        }

        player.dimension.playSound("random.levelup", player.location);
        player.sendMessage(`§aEnchanted with ${config.name} ${this.toRoman(nextLevel)}!`);
    }

    // --- Anvil UI ---

    async openAnvilBookApplyUI(player, bookStack, enchantId) {
        const config = this.registry.get(enchantId);
        if (!config) return;

        const inventory = player.getComponent("minecraft:inventory").container;
        const validTargets = [];

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (!item) continue;

            const isCompatible = config.appliesTo.some(type => item.typeId.includes(type));
            const currentEnchants = this.getEnchantments(item);
            const currentLevel = currentEnchants[enchantId] || 0;

            if (isCompatible && (currentLevel < config.maxLevel || player.getGameMode() === GameMode.Creative)) {
                validTargets.push({
                    slot: i,
                    item,
                    nextLevel: currentLevel + 1,
                    cost: typeof config.costPerLevel === 'function' ? config.costPerLevel(currentLevel + 1) : config.costPerLevel
                });
            }
        }

        if (validTargets.length === 0) {
            player.sendMessage(`§cNo compatible items for ${config.name} found in your inventory.`);
            return;
        }

        const form = new ActionFormData()
            .title(`Combine: ${config.name}`)
            .body(`§7Select an item to apply the enchantment to:`);

        validTargets.forEach(t => {
            const color = player.level >= t.cost ? "§2" : "§c";
            const itemName = t.item.nameTag || t.item.typeId.split(':')[1];
            form.button(`${itemName} (Slot ${t.slot})\n${color}Cost: ${t.cost} Lvl`);
        });

        const response = await form.show(player);
        if (response.canceled) return;

        const selection = validTargets[response.selection];

        const currentInvItem = inventory.getItem(selection.slot);
        const currentHandItem = player.getComponent("minecraft:equippable").getEquipment("Mainhand");

        if (!currentHandItem || currentHandItem.typeId !== bookStack.typeId || !currentInvItem || currentInvItem.typeId !== selection.item.typeId) {
            player.sendMessage("§cInventory changed. Transaction cancelled.");
            return;
        }

        if (player.level < selection.cost && player.getGameMode() !== GameMode.Creative) {
            player.sendMessage(`§cNot enough XP! Need ${selection.cost} levels.`);
            player.playSound("note.bass");
            return;
        }

        const newItem = this.applyEnchantment(currentInvItem, config.id, selection.nextLevel);
        inventory.setItem(selection.slot, newItem);

        if (currentHandItem.amount > 1) {
            currentHandItem.amount--;
            player.getComponent("minecraft:equippable").setEquipment("Mainhand", currentHandItem);
        } else {
            player.getComponent("minecraft:equippable").setEquipment("Mainhand");
        }

        if (player.getGameMode() !== GameMode.Creative) {
            player.addLevels(-selection.cost);
        }

        player.playSound("random.anvil_use");
        player.dimension.spawnParticle("minecraft:villager_happy", player.location);
        player.sendMessage(`§aSuccessfully combined ${config.name} with your item!`);
    }

    // --- Helper Methods ---

    applyEnchantment(itemStack, id, level) {
        const config = this.registry.get(id);
        if (!config) return itemStack;

        const enchants = this.getEnchantments(itemStack);
        enchants[id] = level;
        itemStack.setDynamicProperty("mirage:enchants", JSON.stringify(enchants));

        const currentLore = itemStack.getLore() || [];
        const newLoreLine = `§7${config.name} ${this.toRoman(level)}`;
        const cleanLore = currentLore.filter(line => !line.includes(`§7${config.name}`));
        cleanLore.unshift(newLoreLine);

        itemStack.setLore(cleanLore);
        this.updateGlint(itemStack);

        return itemStack;
    }

    /**
     * Toggles the dummy glint based on context.
     */
    updateGlint(itemStack, shouldHaveGlint = true) {
        const enchantable = itemStack.getComponent("minecraft:enchantable");
        if (!enchantable) return;

        const hasDummy = itemStack.getDynamicProperty("mirage:dummy_glint");
        const currentVanillas = enchantable.getEnchantments();

        if (shouldHaveGlint) {
            if (currentVanillas.length === 0) {
                try {
                    enchantable.addEnchantment({ type: "unbreaking", level: 0 });
                    itemStack.setDynamicProperty("mirage:dummy_glint", true);
                } catch (e) {
                    try {
                        enchantable.addEnchantment({ type: "unbreaking", level: 1 });
                        itemStack.setDynamicProperty("mirage:dummy_glint", true);
                    } catch (e2) { }
                }
            }
        } else {
            if (hasDummy) {
                const unbreaking = enchantable.getEnchantment("unbreaking");
                if (unbreaking && currentVanillas.length === 1) {
                    enchantable.removeAllEnchantments();
                    itemStack.setDynamicProperty("mirage:dummy_glint", undefined);
                }
            }
        }
    }

    /**
     * Scans players to toggle glint state.
     */
    manageVisuals() {
        for (const player of world.getAllPlayers()) {
            const cursorComp = player.getComponent("minecraft:cursor_inventory");
            if (cursorComp && cursorComp.item) {
                const item = cursorComp.item;
                if (this.hasCustomEnchants(item) && item.getDynamicProperty("mirage:dummy_glint")) {
                    this.updateGlint(item, false);
                    cursorComp.item = item;
                }
            }

            const invComp = player.getComponent("minecraft:inventory");
            if (invComp && invComp.container) {
                const container = invComp.container;
                for (let i = 0; i < container.size; i++) {
                    const item = container.getItem(i);
                    if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("mirage:dummy_glint")) {
                        this.updateGlint(item, true);
                        if (item.getDynamicProperty("mirage:dummy_glint")) {
                            container.setItem(i, item);
                        }
                    }
                }
            }

            const equipComp = player.getComponent("minecraft:equippable");
            if (equipComp) {
                const slots = ["Mainhand", "Offhand", "Head", "Chest", "Legs", "Feet"];
                for (const slot of slots) {
                    const item = equipComp.getEquipment(slot);
                    if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("mirage:dummy_glint")) {
                        this.updateGlint(item, true);
                        if (item.getDynamicProperty("mirage:dummy_glint")) {
                            equipComp.setEquipment(slot, item);
                        }
                    }
                }
            }
        }
    }

    hasCustomEnchants(item) {
        return !!item.getDynamicProperty("mirage:enchants");
    }

    getEnchantments(itemStack) {
        if (!itemStack) return {};
        const data = itemStack.getDynamicProperty("mirage:enchants");
        if (!data) return {};
        try {
            return JSON.parse(data);
        } catch (e) {
            return {};
        }
    }

    toRoman(num) {
        const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
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
