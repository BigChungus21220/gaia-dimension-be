import { world, system } from '@minecraft/server';
import { vec3 } from './Vec3';
import { EnchantmentWrapper } from './data/EnchantWrapper';

class PouchManager {
    constructor() {
        this.forbiddenItems = ["shulker"];
        this.playerPropertiesCache = new Map();
    }

    setup() {
        system.beforeEvents.watchdogTerminate.subscribe((eventData) => {
            eventData.cancel = true;
        });
        system.runTimeout(() => {
            this.runIntervals();
        }, 60);
    }

    runIntervals() {
        system.runInterval(this.checkItemChanges.bind(this), 1);
        system.runInterval(this.manageInactiveBackpacks.bind(this), 60); // this line throws error because manageInactiveBackpacks doesn't exist fr
    }

    checkItemChanges() {
        const allPlayers = world.getAllPlayers();
        for (const player of allPlayers) {
            const propertyDataCurrent = this.getPropertyJson(player);
            const inventory = player.getComponent("inventory").container;
            const selectedSlot = player.selectedSlot;
            const itemHolding = inventory.getItem(selectedSlot);
            const propertyInterface = {
                item: itemHolding ? itemHolding.typeId : undefined,
                slot: selectedSlot,
                id: itemHolding ? (itemHolding.getLore().length > 0 ? itemHolding.getLore()[0] : undefined) : undefined
            };

            let changed = false;
            const currentHeldItemStatusProperty = player.getDynamicProperty(`playerHeldItemStatus`);
            if (currentHeldItemStatusProperty !== undefined && JSON.stringify(propertyInterface) !== currentHeldItemStatusProperty) {
                if (propertyDataCurrent.slot !== selectedSlot || (itemHolding && propertyDataCurrent.item !== itemHolding.typeId) || (!itemHolding && propertyDataCurrent.item !== undefined)) {
                    changed = true;
                }
                player.setDynamicProperty(`playerHeldItemStatus`, JSON.stringify(propertyInterface));
            } else {
                player.setDynamicProperty(`playerHeldItemStatus`, JSON.stringify(propertyInterface));
            }

            if (itemHolding && itemHolding.typeId.includes("gaia:gem_pouch") && propertyInterface.id !== undefined) {
                this.adjustPouchEntity(player, propertyInterface.id);
            }
        }
    }

    getPropertyJson(player) {
        if (this.playerPropertiesCache.has(player)) {
            return this.playerPropertiesCache.get(player);
        }
        const property = player.getDynamicProperty(`playerHeldItemStatus`);
        const parsedProperty = property !== undefined ? JSON.parse(property) : { item: undefined, slot: player.selectedSlot, id: undefined };
        this.playerPropertiesCache.set(player, parsedProperty);
        return parsedProperty;
    }

    adjustPouchEntity(player, pouchId) {
        const pouchEntities = player.dimension.getEntities({ tags: [pouchId] });
        for (const pouchEntity of pouchEntities) {
            const newLocation = vec3(pouchEntity.location);
            newLocation.y += 1.5;
            pouchEntity.teleport(newLocation);
        }
    }

    onChanged(player, playerInventory, propertyDataCurrent, propertyDataOld) {
        const currentItem = playerInventory.getItem(propertyDataCurrent.slot);
        if (currentItem !== undefined) {
            if (currentItem.typeId.includes("gaia:gem_pouch")) {
                this.adjustGemPouch(currentItem, player, propertyDataOld);
            } else {
                this.adjustNonPouchEntity(player, propertyDataOld);
            }
        } else {
            if (propertyDataOld.id !== undefined) {
                this.adjustNonPouchEntity(undefined, player, propertyDataOld);
            }
        }
    }

    adjustGemPouch(currentItem, player, propertyDataOld) {
        const lore = currentItem.getLore();
        if (lore.length === 0) {
            this.createPouch(currentItem, player);
        } else {
            const pouchEntities = player.dimension.getEntities({ tags: [`${propertyDataOld.id}`] });
            for (const pouchEntity of pouchEntities) {
                this.closePouch(pouchEntity, player, propertyDataOld);
            }
            this.openPouch(player, currentItem);
        }
    }

    createPouch(currentItem, player) {
        const inv =  player.getComponent("inventory").container
        const pouchId = `gempouch_id:${Math.floor(Math.random() * 9999)}`;
        currentItem.setLore([pouchId]);
       inv.setItem(player.selectedSlot, currentItem);
        const pouchEntity = player.dimension.spawnEntity("gaia:gem_pouch_container", player.location);
        pouchEntity.triggerEvent(pouchType(currentItem));
        pouchEntity.addTag(pouchId);
        pouchEntity.nameTag = pouchName(currentItem);
    }

    adjustNonPouchEntity(player, propertyDataOld) {
        const pouchEntities = player.dimension.getEntities({ tags: [`${propertyDataOld.id}`] });
        for (const pouchEntity of pouchEntities) {
            const pouchEntityInv = pouchEntity.getComponent("inventory").container;
            for (let slot = 0; slot < pouchEntityInv.size; slot++) {
                const item = pouchEntityInv.getItem(slot);
                if (!item) continue;
                if (this.forbiddenItems.find((itemName) => item.typeId.includes(itemName))) {
                    pouchEntity.dimension.spawnItem(item, pouchEntity.location);
                    pouchEntityInv.setItem(slot, undefined);
                }
            }
            this.closePouch(pouchEntity, player, propertyDataOld);
        }
    }

    closePouch(pouchEntity, player, propertyDataOld) {
        const newLocation = vec3(pouchEntity.location);
        newLocation.y = -64;
        pouchEntity.teleport(newLocation);
        const pouchOldEntityQuery = { tags: [`${propertyDataOld.id}`] };
        const pouchOldEntity = player.dimension.getEntities(pouchOldEntityQuery);
        let newLore = [];
        for (const pouchOldEntities of pouchOldEntity) {
            const pouchOldInventory = pouchOldEntities.getComponent("inventory").container;
            newLore = this.recordItems(propertyDataOld.id, pouchOldInventory);
        }
        const inv = player.getComponent("inventory").container;
        const playerHeldItem = inv.getItem(propertyDataOld.slot);
        playerHeldItem.setLore(newLore);
        inv.setItem(propertyDataOld.slot, playerHeldItem);
    }

    recordItems(id, inventory) {
        let count = 0;
        let countOverflow = 0;
        let backupItemList = [];
        let lore = [`${id}`];
        for (let slot = 0; slot < inventory.size; slot++) {
            const item = inventory.getItem(slot);
            if (!item) continue;
            if (this.forbiddenItems.find((itemName) => item.typeId.includes(itemName))) {
                inventory.setItem(slot, undefined);
                continue;
            }
            backupItemList.push(this.getItemProperties(item));
            let itemName = "";
            const itemNameArray = item.typeId.split(":",'')[1].split("_",'');
            for (const itemStr of itemNameArray) {
                itemName += itemStr.charAt(0).toUpperCase() + itemStr.slice(1) + " ";
            }
            if (count < 5) {
                lore.push(`§7${itemName}x${item.amount}`);
            } else {
                countOverflow++;
            }
            count++;
        }
        if (countOverflow > 0) {
            lore.push(`§7and ${countOverflow} more...`);
        }
        world.setDynamicProperty(`${id}`, JSON.stringify(backupItemList));
        return lore;
    }

    getItemProperties(item) {
        const Enchantments = new EnchantmentWrapper(item);
        const enchantList = Enchantments.getEnchantments().map(enchant => ({
            name: enchant.type,
            level: enchant.level
        }));

        const itemInterface = {
            id: item.typeId,
            amount: item.amount,
            durability: item.hasComponent("durability") ? item.getComponent("durability").damage : undefined,
            lore: item.getLore().length > 0 ? item.getLore() : undefined,
            enchant: enchantList.length > 0 ? enchantList : undefined,
            name: item.nameTag ? item.nameTag : undefined
        };

        return itemInterface;
    }
}

// Create new pouch manager
const pouchManager = new PouchManager();

pouchManager.setup()