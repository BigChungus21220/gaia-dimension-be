import { world, system, Player, PlayerPlaceBlockAfterEvent, ItemStack, Container } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

const GLITTER_GRASS_TYPES = [
    "gaiadimension:green_glitter_grass",
    "gaiadimension:pink_glitter_grass",
    "gaiadimension:orange_glitter_grass",
    "gaiadimension:purple_glitter_grass",
    "gaiadimension:peach_glitter_grass",
    "gaiadimension:blue_glitter_grass",
    "gaiadimension:pale_green_glitter_grass"
];

const BIOME_TO_GRASS: Record<string, string> = {
    "green_agate_jungle": "gaiadimension:green_glitter_grass",
    "crystal_plains": "gaiadimension:pink_glitter_grass",
    "mutant_agate_wildwood": "gaiadimension:orange_glitter_grass",
    "purple_agate_swamp": "gaiadimension:purple_glitter_grass",
    "pink_agate_forest": "gaiadimension:peach_glitter_grass",
    "blue_agate_taiga": "gaiadimension:blue_glitter_grass",
    "fossil_woodland": "gaiadimension:pale_green_glitter_grass"
};

function syncInventory(player: Player): void {
    const inventory = (player.getComponent("minecraft:inventory") as any)?.container as Container;
    if (!inventory) return;

    const biome = DimensionSystem.getBiome(player);
    const targetGrassId = BIOME_TO_GRASS[biome];
    if (!targetGrassId) return;

    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && GLITTER_GRASS_TYPES.includes(item.typeId) && item.typeId !== targetGrassId) {
            const newItem = new ItemStack(targetGrassId, item.amount);
            // Transfer dynamic properties or name if needed, but here we just want the block
            inventory.setItem(i, newItem);
        }
    }
}

export function initializeGlitterGrassSync(): void {
    // 1. Sync on Place (Using biome at placed location)
    world.afterEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockAfterEvent) => {
        const { block } = event;
        
        if (GLITTER_GRASS_TYPES.includes(block.typeId)) {
            const biome = DimensionSystem.getBiomeAt(block.dimension, block.location);
            const targetGrassId = BIOME_TO_GRASS[biome];

            if (targetGrassId && block.typeId !== targetGrassId) {
                system.run(() => {
                    if (block.isValid) {
                        block.setType(targetGrassId);
                    }
                });
            }
        }
    });

    // 2. Periodic Inventory Sync (Every 2 seconds)
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            if (DimensionSystem.isInGaia(player)) {
                syncInventory(player);
            }
        }
    }, 40);

    // 3. Immediate sync on inventory change
    world.afterEvents.playerInventoryItemChange.subscribe((event) => {
        const { player } = event;
        if (DimensionSystem.isInGaia(player)) {
            syncInventory(player);
        }
    });
}
