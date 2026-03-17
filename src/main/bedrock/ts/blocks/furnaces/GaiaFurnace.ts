import { ItemStack } from "@minecraft/server";
import { Machine } from "../../API/lib/Machine.js";
import { nativeFuels, nativeRecipes } from "../../furnace_recipes/furnace/NativeFurnaceData.js";
import { recipeDiscovery } from "../../furnace_recipes/furnace/RecipeDiscovery.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

export class GaiaFurnace extends Machine {
    static get NAME() { return "gaia_furnace"; }

    static get TIMERS() {
        return {
            cook: { max: 200 },
            burn: { max: 0 },
            max_burn: { max: 0 }
        };
    }

    static get UI_CONFIG() {
        const staticUI = {
            11: "gaiadimension:furnace_flame_empty",
            13: "gaiadimension:generic_progress_arrow_empty",
            9: "gaiadimension:gaia_stone_furnace_part_1",
            17: "gaiadimension:gaia_stone_furnace_part_2",
            4: "gaiadimension:gaia_stone_furnace_name"
        };

        const animatedUI = [
            { slot: 11, timer: "burn", maxTimer: "max_burn", baseId: "gaiadimension:furnace_flame", steps: 12 },
            { slot: 13, timer: "cook", baseId: "gaiadimension:generic_progress_arrow", steps: 22 }
        ];

        return {
            classicProfile: {
                inputSlots: [2],
                fuelSlot: 20,
                resultSlots: [15],
                staticUI: { ...staticUI },
                animatedUI: animatedUI
            },
            pocketProfile: {
                inputSlots: [2],
                fuelSlot: 20,
                resultSlots: [15],
                staticUI: { ...staticUI },
                animatedUI: animatedUI
            }
        };
    }

    onTick(dt) {
        if (this.timers.burn.value > 0) {
            this.timers.burn.value = Math.max(0, this.timers.burn.value - dt);
        }

        if (!this.canProcess() && this.timers.cook.value > 0) {
             this.timers.cook.value = 0;
        }
        
        // Handle Block State
        try {
            const isBurning = this.timers.burn.value > 0;
            const currentState = this.block.permutation.getState("gaiadimension:furnace_on" as any);
            if (isBurning !== currentState) {
                this.block.setPermutation(this.block.permutation.withState("gaiadimension:furnace_on" as any, isBurning));
            }
        } catch (e) {}
    }

    updateUI() {
        const profile = this.cachedUiProfile || this.getCurrentUiProfile();
        
        const burnPercent = this.timers.max_burn.value > 0 
            ? Math.ceil((this.timers.burn.value / this.timers.max_burn.value) * 100) 
            : 0;
        this.setItemDisplay(11, "§6Furnace Heat", [`§7Intensity: ${burnPercent}%`], profile);

        const cookPercent = Math.floor((this.timers.cook.value / this.timers.cook.max) * 100);
        this.setItemDisplay(13, "§eRefining Progress", [`§7Status: ${cookPercent}%`], profile);

        // Nameplate
        this.setItemDisplay(4, "§l§bGaia Furnace", ["§7Smelting"], profile);

        // Label all fillers
        for (let i = 0; i < this.inventory.size; i++) {
            const item = this.inventory.getItem(i);
            if (item && item.typeId === "gaiadimension:placeholder_invisible") {
                this.setItemDisplay(i, "§8Gaia Furnace", [], profile);
            }
        }
    }

    canProcess() {
        const inputItem = this.inventory.getItem(2);
        
        if (!inputItem) return false;

        const recipe = this.getRecipe(inputItem);
        if (!recipe) return false;

        if (this.timers.burn.value <= 0) {
            const fuelItem = this.inventory.getItem(20);
            if (!fuelItem || !this.getFuelValue(fuelItem)) return false;
        }

        const outputItem = this.inventory.getItem(15);
        if (outputItem) {
            if (outputItem.typeId !== recipe.output || outputItem.amount + 1 > outputItem.maxStackSize) return false;
        }

        return true;
    }

    processTick(dt = 1) {
        const profile = this.cachedUiProfile || this.getCurrentUiProfile();

        if (this.timers.burn.value <= 0) {
            const fuelItem = this.inventory.getItem(20);
            const burnTime = this.getFuelValue(fuelItem);
            if (burnTime > 0) {
                this.consumeItem(20, 1);
                this.timers.burn.value = burnTime;
                this.timers.max_burn.value = burnTime;
            } else return;
        }

        const inputItem = this.inventory.getItem(2);
        const recipe = this.getRecipe(inputItem);
        
        if (!recipe) {
            this.timers.cook.value = 0;
            return;
        }

        this.timers.cook.max = 200;
        this.timers.cook.add(dt);

        if (this.timers.cook.value >= this.timers.cook.max) {
            this.timers.cook.value = 0;
            this.consumeItem(2, 1);

            this.addToSlot(15, new ItemStack(recipe.output, 1), profile);
        }
    }

    addToSlot(slot, itemStack, profile) {
        const current = this.inventory.getItem(slot);
        if (!current) {
            this.setInventoryItem(slot, itemStack, profile);
        } else if (current.typeId === itemStack.typeId) {
            const maxStack = current.maxStackSize ?? 64;
            if (current.amount < maxStack) {
                const space = maxStack - current.amount;
                const add = Math.min(space, itemStack.amount);
                if (add > 0) {
                    current.amount += add;
                    this.setInventoryItem(slot, current, profile);
                }
            }
        }
    }

    getRecipe(input) {
        if (!input) return null;

        if (nativeRecipes[input.typeId]) {
            return { output: nativeRecipes[input.typeId].output, time: 200 };
        }

        // Trigger dynamic discovery if unknown
        recipeDiscovery.discover(input.typeId, this.block.location, this.block.dimension);

        return null;
    }

    getFuelValue(item) {
        if (!item) return 0;
        
        // 1. Exact Match
        if (nativeFuels[item.typeId]) {
            const val = nativeFuels[item.typeId];
            return typeof val === 'object' ? val.burnTime : val;
        }

        // 2. Tag Match (Iterate through nativeFuels to find tag keys)
        for (const [key, val] of Object.entries(nativeFuels)) {
            if (key.startsWith("tag:")) {
                let tagName = key.replace("tag:", "");
                if (tagName.startsWith("item:")) tagName = tagName.replace("item:", "");
                if (tagName.startsWith("block:")) tagName = tagName.replace("block:", "");

                if (item.hasTag(tagName)) {
                    return typeof val === 'object' ? val.burnTime : val;
                }
            }
        }
        
        return 0;
    }
}

blockEntityManager.register(GaiaFurnace);

export function registerGaiaFurnaceComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:gaia_furnace", {
        onPlace: ({ block, dimension }) => {
            const location = block.location;
            const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
            
            try {
                const entity = dimension.spawnEntity("luminiae_generic:block_entity", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn gaia furnace entity", e);
            }
        },
        onPlayerDestroy: ({ block, dimension }) => {
        }
    });
}


