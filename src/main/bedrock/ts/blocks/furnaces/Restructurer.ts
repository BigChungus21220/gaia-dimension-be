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

// --- Fuel Data ---
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

// --- Recipes ---
// input → { output, byproduct, time }
const RESTRUCTURER_RECIPES: Record<string, { output: string; byproduct: string; time: number }> = {
    "gaiadimension:blue_opal":       { output: "gaiadimension:benitoite",   byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:red_opal":        { output: "gaiadimension:carnelian",   byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:white_opal":      { output: "gaiadimension:goshenite",   byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:green_opal":      { output: "gaiadimension:diopside",    byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:labradorite":     { output: "gaiadimension:euclase",     byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:hematite":        { output: "gaiadimension:stibnite",    byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:moonstone":       { output: "gaiadimension:albite",      byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:cinnabar":        { output: "gaiadimension:proustite",   byproduct: "gaiadimension:black_residue", time: 200 },
    "gaiadimension:blue_opal_block": { output: "gaiadimension:benitoite_block",  byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:red_opal_block":  { output: "gaiadimension:carnelian_block",  byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:white_opal_block":{ output: "gaiadimension:goshenite_block",  byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:green_opal_block":{ output: "gaiadimension:diopside_block",   byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:labradorite_block":{ output: "gaiadimension:euclase_block",   byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:hematite_block":  { output: "gaiadimension:stibnite_block",   byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:moonstone_block": { output: "gaiadimension:albite_block",     byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:cinnabar_block":  { output: "gaiadimension:proustite_block",  byproduct: "gaiadimension:tektite", time: 200 },
    "gaiadimension:pyrite_block":    { output: "gaiadimension:aura_cluster",     byproduct: "gaiadimension:bismuth_crystal", time: 200 },
    "gaiadimension:pyrite":          { output: "gaiadimension:aura_residue",     byproduct: "gaiadimension:bismuth_residue", time: 200 },
    "gaiadimension:bismuth_crystal": { output: "minecraft:diamond",              byproduct: "gaiadimension:pink_essence", time: 200 },
    "gaiadimension:scaynyx_ingot":   { output: "minecraft:gold_ingot",           byproduct: "gaiadimension:pink_essence", time: 200 },
    "gaiadimension:benitoite":       { output: "gaiadimension:crystallized_lapis_lazuli", byproduct: "gaiadimension:pink_essence", time: 200 },
    "gaiadimension:carnelian":       { output: "gaiadimension:crystallized_redstone",     byproduct: "gaiadimension:pink_essence", time: 200 }
};

export class Restructurer extends Machine {
    static get NAME(): string { return "restructurer"; }
    static get INVENTORY_SIZE(): number { return 7; } // 5 real + 2 UI

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
                inputSlots: [0, 2],
                fuelSlot: 1, // glittering fuel slot (also need slot 2 for shining)
                resultSlots: [3],
                secondaryResultSlot: 4
            },
            pocketProfile: {
                inputSlots: [0, 2],
                fuelSlot: 1,
                resultSlots: [3],
                secondaryResultSlot: 4
            }
        };
    }

    constructor(entity: Entity, block: Block) {
        super(entity, block);
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Restructurer.UI_ROUTING_NAME;
        }
    }

    onLoad(): void {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Restructurer.UI_ROUTING_NAME;
        }
    }

    onTick(dt: number): void {
        if (this.timers.burn.value > 0) {
            this.timers.burn.value = Math.max(0, this.timers.burn.value - dt);
        }

        if (!this.canProcess() && this.timers.cook.value > 0) {
            // Decay cook time by 2 per tick when not burning (Java behavior)
            this.timers.cook.value = Math.max(0, this.timers.cook.value - 2 * dt);
        }

        // Handle Block State
        try {
            const isBurning = this.timers.burn.value > 0;
            const currentState = this.block.permutation.getState("gaiadimension:lit");
            if (isBurning !== currentState) {
                this.block.setPermutation(this.block.permutation.withState("gaiadimension:lit", isBurning));
            }
        } catch (e) {}
    }

    updateUI(): void {
        // Burn bar (slot 5) - vertical, max 14px
        const burnPercent = this.timers.max_burn.value > 0
            ? this.timers.burn.value / this.timers.max_burn.value
            : 0;
        const burnFill = Math.ceil(burnPercent * 56);
        this.setUiDisplay(5, `§6Fuel: ${Math.ceil(burnPercent * 100)}%`, burnFill);

        // Cook progress (slot 6) - vertical, max 24px
        const cookPercent = this.timers.cook.max > 0
            ? this.timers.cook.value / this.timers.cook.max
            : 0;
        const cookFill = Math.floor(cookPercent * 24);
        this.setUiDisplay(6, `§eProgress: ${Math.floor(cookPercent * 100)}%`, cookFill);

    }

    canProcess(): boolean {
        const inputItem = this.inventory.getItem(0);
        if (!inputItem) return false;

        const recipe = RESTRUCTURER_RECIPES[inputItem.typeId];
        if (!recipe) {
            return false;
        }

        // Check fuel state: if not burning, need BOTH fuels
        if (this.timers.burn.value <= 0) {
            const glitterFuel = this.inventory.getItem(1);
            const shineFuel = this.inventory.getItem(2);
            if (!glitterFuel || !shineFuel) {
                return false;
            }
            if (!GLITTERING_FUELS[glitterFuel.typeId] || !SHINING_FUELS[shineFuel.typeId]) {
                return false;
            }
        }

        // Check output slots
        const outputItem = this.inventory.getItem(3);
        if (outputItem) {
            if (outputItem.typeId !== recipe.output || outputItem.amount + 1 > outputItem.maxStackSize) {
                if (this.tickCount % 40 === 0) console.warn(`[RESTRUCT] canProcess FAIL: output slot 3 full or wrong type`);
                return false;
            }
        }

        const byproductItem = this.inventory.getItem(4);
        if (byproductItem) {
            if (byproductItem.typeId !== recipe.byproduct || byproductItem.amount + 1 > byproductItem.maxStackSize) {
                if (this.tickCount % 40 === 0) console.warn(`[RESTRUCT] canProcess FAIL: byproduct slot 4 full or wrong type`);
                return false;
            }
        }
        return true;
    }

    processTick(dt: number = 1): void {
        const profile: UIProfile = this.cachedUiProfile || this.getCurrentUiProfile();

        // Consume fuel if needed
        if (this.timers.burn.value <= 0) {
            const glitterFuel = this.inventory.getItem(1);
            const shineFuel = this.inventory.getItem(2);
            if (!glitterFuel || !shineFuel) return;

            const glitterBurn = GLITTERING_FUELS[glitterFuel.typeId] || 0;
            const shineBurn = SHINING_FUELS[shineFuel.typeId] || 0;

            if (glitterBurn <= 0 || shineBurn <= 0) return;

            // Averaged burn time from both fuels (Java behavior)
            const averageBurn = Math.floor((glitterBurn + shineBurn) / 2);

            // Consume both fuels
            this.consumeItem(1, 1);
            this.consumeItem(2, 1);

            this.timers.burn.value = averageBurn;
            this.timers.max_burn.value = averageBurn;
        }

        const inputItem = this.inventory.getItem(0);
        if (!inputItem) {
            this.timers.cook.value = 0;
            return;
        }

        const recipe = RESTRUCTURER_RECIPES[inputItem.typeId];
        if (!recipe) {
            this.timers.cook.value = 0;
            return;
        }

        this.timers.cook.max = recipe.time;
        this.timers.cook.add(dt);

        if (this.timers.cook.value >= this.timers.cook.max) {
            this.timers.cook.value = 0;
            this.consumeItem(0, 1);
            this.addToSlot(3, new ItemStack(recipe.output, 1), profile);
            this.addToSlot(4, new ItemStack(recipe.byproduct, 1), profile);
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

blockEntityManager.register(Restructurer as any);

export function registerRestructurerComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:restructurer", {
        onPlayerDestroy: () => {}
    });
}
