import { ItemStack, BlockComponentRegistry, Block, Dimension, Vector3, Entity, BlockPermutation } from "@minecraft/server";
import { Machine, UIProfile, UIConfig } from "../../API/lib/Machine.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

declare module "@minecraft/server" {
    interface BlockPermutation {
        withState(stateName: string, value: string | number | boolean): BlockPermutation;
    }
    interface Block {
        setPermutation(permutation: BlockPermutation): void;
    }
}

// --- Fuel Data (shared with Restructurer) ---
const GLITTERING_FUELS: Record<string, number> = {
    "minecraft:gold_nugget": 20,
    "minecraft:gold_ingot": 200,
    "minecraft:golden_axe": 150, "minecraft:golden_hoe": 150,
    "minecraft:golden_pickaxe": 150, "minecraft:golden_shovel": 150, "minecraft:golden_sword": 150,
    "minecraft:golden_helmet": 500, "minecraft:golden_chestplate": 500,
    "minecraft:golden_leggings": 500, "minecraft:golden_boots": 500,
    "minecraft:golden_horse_armor": 1000,
    "minecraft:gold_block": 2000, "minecraft:gold_ore": 150,
    "gaiadimension:pyrite": 500, "gaiadimension:pyrite_block": 5000,
    "gaiadimension:sweet_muckball": 250,
    "gaiadimension:frail_glitter_block": 1000,
    "gaiadimension:thick_glitter_block": 2000,
    "gaiadimension:gummy_glitter_block": 4000,
    "minecraft:blaze_powder": 1200, "minecraft:blaze_rod": 2400
};

const SHINING_FUELS: Record<string, number> = {
    "gaiadimension:pink_essence": 100,
    "gaiadimension:pink_goo": 900,
    "gaiadimension:pink_sludge_block": 8100,
    "gaiadimension:aura_residue": 200,
    "gaiadimension:aura_cluster": 1800,
    "gaiadimension:aura_block": 16200
};

const NULLING_FUELS: Record<string, number> = {
    "gaiadimension:bismuth_residue": 200,
    "gaiadimension:bismuth_crystal": 1800,
    "gaiadimension:bismuth_block": 16200,
    "gaiadimension:black_residue": 100,
    "gaiadimension:tektite": 900,
    "gaiadimension:tektite_block": 8100
};

// --- Purifier Recipes ---
const PURIFIER_RECIPES: Record<string, { output: string; outputCount: number; byproduct: string; byproductCount: number; time: number }> = {
    "gaiadimension:corrupted_grass":           { output: "gaiadimension:glitter_grass",           outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_soil":            { output: "gaiadimension:heavy_soil",              outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_leaves":          { output: "gaiadimension:pink_agate_leaves",       outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_log":             { output: "gaiadimension:pink_agate_log",          outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 2, time: 200 },
    "gaiadimension:stripped_corrupted_log":     { output: "gaiadimension:stripped_pink_agate_log", outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 2, time: 200 },
    "gaiadimension:corrupted_wood":            { output: "gaiadimension:pink_agate_wood",         outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 2, time: 200 },
    "gaiadimension:stripped_corrupted_wood":    { output: "gaiadimension:stripped_pink_agate_wood",outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 2, time: 200 },
    "gaiadimension:corrupted_tiles":           { output: "gaiadimension:pink_agate_tiles",        outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_tile_stairs":      { output: "gaiadimension:pink_agate_tile_stairs",  outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_tile_slab":        { output: "gaiadimension:pink_agate_tile_slab",    outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_sapling":         { output: "gaiadimension:pink_agate_sapling",      outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 },
    "gaiadimension:corrupted_varloom":         { output: "gaiadimension:varloom",                 outputCount: 1, byproduct: "gaiadimension:goldstone_residue", byproductCount: 1, time: 200 }
};

export class Purifier extends Machine {
    static get NAME(): string { return "purifier"; }
    static get INVENTORY_SIZE(): number { return 8; } // 6 real + 2 UI

    static get TIMERS(): { [key: string]: { max: number } } {
        return {
            cook: { max: 200 },
            burn: { max: 0 },
            max_burn: { max: 0 }
        };
    }

    static get UI_CONFIG(): UIConfig {
        return {
            classicProfile: {
                inputSlots: [0, 2, 3],
                fuelSlot: 1, // glittering (also 2=shining, 3=nulling)
                resultSlots: [4],
                secondaryResultSlot: 5
            },
            pocketProfile: {
                inputSlots: [0, 2, 3],
                fuelSlot: 1,
                resultSlots: [4],
                secondaryResultSlot: 5
            }
        };
    }

    constructor(entity: Entity, block: Block) {
        super(entity, block);
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Purifier.UI_ROUTING_NAME;
        }
    }

    onLoad(): void {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Purifier.UI_ROUTING_NAME;
        }
    }

    onTick(dt: number): void {
        if (this.timers.burn.value > 0) {
            this.timers.burn.value = Math.max(0, this.timers.burn.value - dt);
        }

        if (!this.canProcess() && this.timers.cook.value > 0) {
            this.timers.cook.value = Math.max(0, this.timers.cook.value - 2 * dt);
        }

        try {
            const isBurning = this.timers.burn.value > 0;
            const currentState = this.block.permutation.getState("gaiadimension:lit");
            if (isBurning !== currentState) {
                this.block.setPermutation(this.block.permutation.withState("gaiadimension:lit", isBurning));
            }
        } catch (e) {}
    }

    updateUI(): void {
        // Burn bar (slot 6) - vertical, max 20px
        const burnPercent = this.timers.max_burn.value > 0
            ? this.timers.burn.value / this.timers.max_burn.value
            : 0;
        const burnFill = Math.ceil(burnPercent * 22);
        this.setUiDisplay(6, `§6Fuel: ${Math.ceil(burnPercent * 100)}%`, burnFill);

        // Cook progress (slot 7) - horizontal, max 47px
        const cookPercent = this.timers.cook.max > 0
            ? this.timers.cook.value / this.timers.cook.max
            : 0;
        const cookFill = Math.floor(cookPercent * 24);
        this.setUiDisplay(7, `§eProgress: ${Math.floor(cookPercent * 100)}%`, cookFill);
    }

    canProcess(): boolean {
        const inputItem = this.inventory.getItem(0);
        if (!inputItem) return false;

        const recipe = PURIFIER_RECIPES[inputItem.typeId];
        if (!recipe) return false;

        if (this.timers.burn.value <= 0) {
            const glitterFuel = this.inventory.getItem(1);
            const shineFuel = this.inventory.getItem(2);
            const nullFuel = this.inventory.getItem(3);
            if (!glitterFuel || !shineFuel || !nullFuel) return false;
            if (!GLITTERING_FUELS[glitterFuel.typeId] || !SHINING_FUELS[shineFuel.typeId] || !NULLING_FUELS[nullFuel.typeId]) return false;
        }

        const outputItem = this.inventory.getItem(4);
        if (outputItem) {
            if (outputItem.typeId !== recipe.output || outputItem.amount + recipe.outputCount > outputItem.maxStackSize) return false;
        }

        const byproductItem = this.inventory.getItem(5);
        if (byproductItem) {
            if (byproductItem.typeId !== recipe.byproduct || byproductItem.amount + recipe.byproductCount > byproductItem.maxStackSize) return false;
        }

        return true;
    }

    processTick(dt: number = 1): void {
        const profile: UIProfile = this.cachedUiProfile || this.getCurrentUiProfile();

        if (this.timers.burn.value <= 0) {
            const glitterFuel = this.inventory.getItem(1);
            const shineFuel = this.inventory.getItem(2);
            const nullFuel = this.inventory.getItem(3);
            if (!glitterFuel || !shineFuel || !nullFuel) return;

            const glitterBurn = GLITTERING_FUELS[glitterFuel.typeId] || 0;
            const shineBurn = SHINING_FUELS[shineFuel.typeId] || 0;
            const nullBurn = NULLING_FUELS[nullFuel.typeId] || 0;

            if (glitterBurn <= 0 || shineBurn <= 0 || nullBurn <= 0) return;

            // Averaged from THREE fuels (Java behavior)
            const averageBurn = Math.floor((glitterBurn + shineBurn + nullBurn) / 3);

            this.consumeItem(1, 1);
            this.consumeItem(2, 1);
            this.consumeItem(3, 1);

            this.timers.burn.value = averageBurn;
            this.timers.max_burn.value = averageBurn;
        }

        const inputItem = this.inventory.getItem(0);
        if (!inputItem) {
            this.timers.cook.value = 0;
            return;
        }

        const recipe = PURIFIER_RECIPES[inputItem.typeId];
        if (!recipe) {
            this.timers.cook.value = 0;
            return;
        }

        this.timers.cook.max = recipe.time;
        this.timers.cook.add(dt);

        if (this.timers.cook.value >= this.timers.cook.max) {
            this.timers.cook.value = 0;
            this.consumeItem(0, 1);
            this.addToSlot(4, new ItemStack(recipe.output, recipe.outputCount), profile);
            this.addToSlot(5, new ItemStack(recipe.byproduct, recipe.byproductCount), profile);
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
}

blockEntityManager.register(Purifier as any);

export function registerPurifierComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:purifier", {
        onPlayerDestroy: () => {}
    });
}
