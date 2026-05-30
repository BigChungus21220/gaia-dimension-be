import { ItemStack, BlockComponentRegistry, Block, Dimension, Vector3, Entity } from "@minecraft/server";
import { Machine, UIProfile, UIConfig } from "../../API/lib/Machine.js";
import blockEntityManager from "../../API/lib/BlockEntity.js";

// --- Augmenter Maps ---
// Core Ingredient → Element
const ELEMENT_MAP: Record<string, string> = {
    "gaiadimension:tektite": "physical",
    "gaiadimension:crystal_core": "physical",
    "gaiadimension:spitfire_heart": "fire",
    "gaiadimension:shockshooter_soul": "electric",
    "gaiadimension:moss_agate_claw": "poison",
    "gaiadimension:howlite_fang": "frost",
    "gaiadimension:spellbound_core": "magic",
    "gaiadimension:bismuth_horn": "energy"
};

// Head Ingredient → Behavior
const BEHAVIOR_MAP: Record<string, string> = {
    "gaiadimension:tektite": "basic",
    "gaiadimension:stibnite": "scatter",
    "gaiadimension:euclase": "ricochet",
    "gaiadimension:carnelian": "blast",
    "gaiadimension:benitoite": "linger",
    "gaiadimension:goshenite": "burst"
};

// Rod Ingredient → Stat
const STAT_MAP: Record<string, string> = {
    "gaiadimension:tektite": "standard",
    "gaiadimension:scaynyx_ingot": "power",
    "gaiadimension:glitter_rod": "speed",
    "gaiadimension:shiny_bone": "recharge",
    "gaiadimension:magnetite_rod": "force",
    "gaiadimension:aura_rod": "sustain"
};

export class Augmenter extends Machine {
    static get NAME(): string { return "augmenter"; }
    static get INVENTORY_SIZE(): number { return 5; }

    static get UI_CONFIG(): UIConfig {
        return {
            classicProfile: {
                inputSlots: [0, 1, 2, 3],
                resultSlots: [4]
            },
            pocketProfile: {
                inputSlots: [0, 1, 2, 3],
                resultSlots: [4]
            }
        };
    }

    constructor(entity: Entity, block: Block) {
        super(entity, block);
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Augmenter.UI_ROUTING_NAME;
        }
    }

    onLoad(): void {
        if (this.entity && this.entity.isValid) {
            this.entity.nameTag = Augmenter.UI_ROUTING_NAME;
        }
    }

    onTick(dt: number): void {
        // Augmenter is instant-craft, no tick processing needed
        // Just check if we should update the output preview
        this.updateOutputPreview();
    }

    updateUI(): void {
        // No progress bars for Augmenter
    }

    updateOutputPreview(): void {
        try {
            const staffItem = this.inventory.getItem(0);
            const coreItem = this.inventory.getItem(1);
            const headItem = this.inventory.getItem(2);
            const rodItem = this.inventory.getItem(3);

            // Validate: staff must be a magic_staff
            if (!staffItem || !staffItem.typeId.includes("magic_staff")) {
                // Clear output if no valid staff
                const currentOutput = this.inventory.getItem(4);
                if (currentOutput) {
                    this.inventory.setItem(4, undefined);
                }
                return;
            }

            // Check if at least one ingredient is provided
            const hasCore = coreItem && ELEMENT_MAP[coreItem.typeId] !== undefined;
            const hasHead = headItem && BEHAVIOR_MAP[headItem.typeId] !== undefined;
            const hasRod = rodItem && STAT_MAP[rodItem.typeId] !== undefined;

            if (!hasCore && !hasHead && !hasRod) {
                const currentOutput = this.inventory.getItem(4);
                if (currentOutput) {
                    this.inventory.setItem(4, undefined);
                }
                return;
            }

            // Create the output preview (copy of input staff with modifications noted in lore)
            const outputPreview = new ItemStack(staffItem.typeId, 1);
            const loreLines: string[] = [];

            if (hasCore) loreLines.push(`§9Element: ${ELEMENT_MAP[coreItem!.typeId]}`);
            if (hasHead) loreLines.push(`§5Behavior: ${BEHAVIOR_MAP[headItem!.typeId]}`);
            if (hasRod) loreLines.push(`§6Stat: ${STAT_MAP[rodItem!.typeId]}`);

            outputPreview.setLore(loreLines);
            outputPreview.nameTag = staffItem.nameTag || "§dModified Magic Staff";

            this.inventory.setItem(4, outputPreview);
        } catch (e) {}
    }

    /**
     * Called when a player takes the output item.
     * Consume the ingredients.
     */
    canProcess(): boolean {
        return false; // Instant craft, handled in event
    }

    processTick(dt: number = 1): void {
        // No tick processing - Augmenter is instant craft
    }
}

blockEntityManager.register(Augmenter as any);

export function registerAugmenterComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:augmenter", {
        onPlace: (arg: { block: Block, dimension: Dimension }) => {
            const { block, dimension } = arg;
            const location: Vector3 = block.location;
            const center: Vector3 = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };

            try {
                const entity = dimension.spawnEntity("luminiae_generic:block_entity", center);
                blockEntityManager.registerEntityAsMachine(entity);
            } catch (e) {
                console.warn("Failed to spawn augmenter entity", e);
            }
        },
        onPlayerDestroy: () => {}
    });
}
