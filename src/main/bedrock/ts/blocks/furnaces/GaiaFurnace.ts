import { ItemStack, BlockComponentRegistry, BlockPermutation, Dimension, Vector3, Block } from "@minecraft/server";
import { Machine, UIProfile, UIConfig } from "../../API/lib/Machine.js";
import { nativeFuels, nativeRecipes } from "../../furnace_recipes/furnace/NativeFurnaceData.js";
import { recipeDiscovery } from "../../furnace_recipes/furnace/RecipeDiscovery.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

// Extend BlockPermutation to include withState if not already present in the base declarations
declare module "@minecraft/server" {
    interface BlockPermutation {
        withState(stateName: string, value: string | number | boolean): BlockPermutation;
    }
    interface Block {
        setPermutation(permutation: BlockPermutation): void;
    }
}

export class GaiaFurnace extends Machine {
    static get NAME(): string { return "gaia_furnace"; }

    static get TIMERS(): TimerConfig {
        return {
            burn: { value: 0, max: 0, save: true },
            max_burn: { value: 0, max: 0, save: true },
            cook: { value: 0, max: 200, save: true }
        };
    }

    constructor(entity: Entity, block: Block) {
        super(entity, block);
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = GaiaFurnace.UI_ROUTING_NAME;
        }
    }

    onLoad(): void {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = GaiaFurnace.UI_ROUTING_NAME;
        }
    }

    static get UI_CONFIG(): UIConfig {
        return {
            classicProfile: {
                inputSlots: [0],
                fuelSlot: 1,
                resultSlots: [2]
            },
            pocketProfile: {
                inputSlots: [0],
                fuelSlot: 1,
                resultSlots: [2]
            }
        };
    }

    onTick(dt: number): void {
        if (this.timers.burn.value > 0) {
            this.timers.burn.value = Math.max(0, this.timers.burn.value - dt);
        }

        if (!this.canProcess() && this.timers.cook.value > 0) {
             this.timers.cook.value = 0;
        }
        
        // Handle Block State
        try {
            const isBurning = this.timers.burn.value > 0;
            const currentState = this.block.permutation.getState("gaiadimension:furnace_on");
            if (isBurning !== currentState) {
                this.block.setPermutation(this.block.permutation.withState("gaiadimension:furnace_on", isBurning));
            }
        } catch (e) {}
    }

    updateUI(): void {
        const burnPercent = this.timers.max_burn.value > 0 
            ? Math.ceil((this.timers.burn.value / this.timers.max_burn.value) * 100) 
            : 0;
        const fillBurn = this.timers.max_burn.value > 0
            ? Math.ceil((this.timers.burn.value / this.timers.max_burn.value) * 14)
            : 0;
        this.setUiDisplay(3, `§6Furnace Heat\n§7Intensity: ${burnPercent}%`, fillBurn);

        const cookPercent = Math.floor((this.timers.cook.value / this.timers.cook.max) * 100);
        const fillCook = Math.ceil((this.timers.cook.value / this.timers.cook.max) * 24);
        this.setUiDisplay(4, `§eRefining Progress\n§7Status: ${cookPercent}%`, fillCook);
    }

    canProcess(): boolean {
        const inputItem = this.inventory.getItem(0);
        
        if (!inputItem) return false;

        const recipe = this.getRecipe(inputItem);
        if (!recipe) return false;

        if (this.timers.burn.value <= 0) {
            const fuelItem = this.inventory.getItem(1);
            if (!fuelItem || !this.getFuelValue(fuelItem)) return false;
        }

        const outputItem = this.inventory.getItem(2);
        if (outputItem) {
            if (outputItem.typeId !== recipe.output || outputItem.amount + 1 > outputItem.maxStackSize) return false;
        }

        return true;
    }

    processTick(dt: number = 1): void {
        const profile: UIProfile = this.cachedUiProfile || this.getCurrentUiProfile();

        if (this.timers.burn.value <= 0) {
            const fuelItem = this.inventory.getItem(1);
            const burnTime = this.getFuelValue(fuelItem);
            if (burnTime > 0) {
                this.consumeItem(1, 1);
                this.timers.burn.value = burnTime;
                this.timers.max_burn.value = burnTime;
            } else return;
        }

        const inputItem = this.inventory.getItem(0);
        const recipe = this.getRecipe(inputItem);
        
        if (!recipe) {
            this.timers.cook.value = 0;
            return;
        }

        this.timers.cook.max = 200;
        this.timers.cook.add(dt);

        if (this.timers.cook.value >= this.timers.cook.max) {
            this.timers.cook.value = 0;
            this.consumeItem(0, 1);

            this.addToSlot(2, new ItemStack(recipe.output, 1), profile);
        }
    }

    addToSlot(slot: number, itemStack: ItemStack, profile: UIProfile | null): void {
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

    getRecipe(input: ItemStack | undefined): { output: string, time: number } | null {
        if (!input) return null;

        if (nativeRecipes[input.typeId]) {
            const recipe = nativeRecipes[input.typeId];
            if (recipe.output) {
                return { output: recipe.output, time: 200 };
            }
        }

        // Trigger dynamic discovery if unknown
        recipeDiscovery.discover(input.typeId, this.block.location, this.block.dimension);

        return null;
    }

    getFuelValue(item: ItemStack | undefined): number {
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

blockEntityManager.register(GaiaFurnace as any);

export function registerGaiaFurnaceComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:gaia_furnace", {
        onPlayerDestroy: () => {
        }
    });
}
