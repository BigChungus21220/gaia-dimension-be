import { ItemStack, ItemEnchantableComponent, EnchantmentTypeUnknownIdError, EnchantmentType, EnchantmentLevelOutOfBoundsError, EnchantmentTypeNotCompatibleError } from "@minecraft/server";
export class EnchantmentWrapper {
    /**
     *
     * @param {ItemStack} item
     * @returns {ItemEnchantableComponent}
     */
    //Made By NotAPythonEnjoyer#8410
    static getComponent(item) {
        return item.getComponent("minecraft:enchantable");
    }
    /**
     * Example:
     * 
     * const inventory = player.getComponent("minecraft:inventory").container;
     * const item = inventory.getItem(0);
     * const enchantWrapper = new EnchantmentWrapper(item.clone()); // Cloning the item keeps the original item including NBT Data
     * 
     * @param {ItemStack} item
     */
    constructor(item) {
        this.item = item;
        this.enchantments = EnchantmentWrapper.getComponent(this.item);
        this.enchantments.removeAllEnchantments();
    }
    /**
     * 
     * @param {EnchantmentType | string} type 
     * @returns {boolean | EnchantmentTypeUnknownIdError}
     */
    hasEnchantment(type) {
        try {
            return this.enchantments.hasEnchantment(type);
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    getEnchantments() {
        try {
            return this.enchantments.getEnchantments().map((enchant) => ({
                type: enchant.type.id,
                level: enchant.level,
                maxLevel: enchant.type.maxLevel
            }))
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    /**
     * 
     * @param {EnchantmentType | string} type 
     * @param {number} level 
     * @returns {boolean | EnchantmentTypeUnknownIdError | EnchantmentLevelOutOfBoundsError | EnchantmentTypeNotCompatibleError}
     */
    addEnchantment(type, level) {
        try {
            if (!this.enchantments.canAddEnchantment({ type: type, level: level })) return false;


            this.enchantments.addEnchantment({ type: type, level: level });
            return true;
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    /**
     * 
     * Example:
     * const inventory = player.getComponent("minecraft:inventory").container;
     * const item = inventory.getItem(0);
     * const enchantWrapper = new EnchantmentWrapper(item.clone());
     * enchantWrapper.addEnchantments({type: EnchantmentTypes.get("sharpness").id, level: 1}, {type: EnchantmentTypes.get("unbreaking").id, level: 3});
     * @param  {...{type: EnchantmentType | string, level: number}} enchantments
     * @returns {boolean | EnchantmentTypeUnknownIdError}
     */
    addEnchantments(...enchantments) {
        try {
            this.enchantments.addEnchantments(enchantments);
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    /**
     * 
     * @param {EnchantmentType | string} type 
     * @returns {boolean | EnchantmentTypeUnknownIdError}
     */
    removeEnchantment(type) {
        try {
            this.enchantments.removeEnchantment(type);
            return true;
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    /**
     * Example:
     * const inventory = player.getComponent("minecraft:inventory").container;
     * const item = inventory.getItem(0);
     * const enchantWrapper = new EnchantmentWrapper(item.clone());
     * enchantWrapper.addEnchantments({type: EnchantmentTypes.get("sharpness").id, level: 1}, {type: EnchantmentTypes.get("unbreaking").id, level: 3});
     * 
     * Options:
     * 1 -> enchantWrapper.removeEnchantments(EnchantmentTypes.get("sharpness").id, EnchantmentTypes.get("unbreaking").id);
     * 2 -> enchantWrapper.removeEnchantments("sharpness", "unbreaking");
     * 
     * @type {EnchantmentType[] | string[]} types
     * @returns {boolean | EnchantmentTypeUnknownIdError}
     */
    removeEnchantments(...types) {
        try {
            for (const type of types) {
                if (!this.enchantments.hasEnchantment(type)) continue;
                this.enchantments.removeEnchantment(type);
            }
            return true;
        }
        catch (err) {
            throw new Error(err + err.stack);
        }
    }

    /**
     * Example:
     * const inventory = player.getComponent("minecraft:inventory").container;
     * const item = inventory.getItem(0);
     * const enchantWrapper = new EnchantmentWrapper(item.clone());
     * enchantWrapper.addEnchantment(EnchantmentTypes.get("sharpness").id, 3);
     * enchantWrapper.setEnchantments(player, i);
     * 
     * @param {Player} player 
     * @param {number} itemSlotIndex 
     */
    setEnchantments(player, itemSlotIndex) {
        player.getComponent("minecraft:inventory").container.setItem(itemSlotIndex, this.item);
    }
}