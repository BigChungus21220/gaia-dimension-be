import { world, ItemStack, GameMode, system, BlockPermutation, EntityComponentTypes } from "@minecraft/server";
import { CAULDRON_CONFIG } from "./cauldron_config.js";

function getBucketForCauldron(blockTypeId: string): string | undefined {
    for (const [bucketId, config] of Object.entries(CAULDRON_CONFIG)) {
        if (config.block === blockTypeId) return bucketId;
    }
    return undefined;
}

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack } = event;
    if (!itemStack) return;

    const lastInteractTick = player.getDynamicProperty("pu_bn:last_cauldron_interact") as number ?? 0;
    if (system.currentTick - lastInteractTick < 5) return;

    const typeId = itemStack.typeId;
    const isBottle = typeId === "pu_bn:tar_bottle"; // Only tar has bottle for now
    const isGlassBottle = typeId === "minecraft:glass_bottle";
    const config = CAULDRON_CONFIG[typeId];

    // --- Bottle Logic (Special Case for Tar) ---
    if (isBottle && (block.typeId === "minecraft:cauldron" || block.typeId === "pu_bn:tar_cauldron")) {
        if (block.typeId === "minecraft:cauldron") {
            const fillLevel = block.permutation.getState("fill_level") as number ?? 0;
            if (fillLevel !== 0) return;
        }
        
        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);

        system.run(() => {
            if (!block.isValid) return;
            const currentLevel = block.typeId === "pu_bn:tar_cauldron" ? (block.permutation.getState("pu_bn:level" as any) as number) : 0;
            if (currentLevel >= 3) return;

            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                const container = inventory.container;
                const slot = player.selectedSlotIndex;
                if (itemStack.amount === 1) {
                    container.setItem(slot, new ItemStack("minecraft:glass_bottle"));
                } else {
                    itemStack.amount--;
                    container.setItem(slot, itemStack);
                    const returnStack = new ItemStack("minecraft:glass_bottle");
                    if (!container.addItem(returnStack)) block.dimension.spawnItem(returnStack, player.location);
                }
            }
            block.setPermutation(BlockPermutation.resolve("pu_bn:tar_cauldron", { "pu_bn:level": currentLevel + 1 }));
            player.dimension.playSound("cauldron.fillwater", block.location);
            player.dimension.playSound("bottle.empty", block.location);
        });
        return;
    }

    if (isGlassBottle && block.typeId === "pu_bn:tar_cauldron") {
        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);

        system.run(() => {
            if (!block.isValid) return;
            const currentLevel = block.permutation.getState("pu_bn:level" as any) as number;
            
            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                const container = inventory.container;
                const slot = player.selectedSlotIndex;
                if (itemStack.amount === 1) {
                    container.setItem(slot, new ItemStack("pu_bn:tar_bottle"));
                } else {
                    itemStack.amount--;
                    container.setItem(slot, itemStack);
                    const returnStack = new ItemStack("pu_bn:tar_bottle");
                    if (!container.addItem(returnStack)) block.dimension.spawnItem(returnStack, player.location);
                }
            }

            if (currentLevel > 1) {
                block.setPermutation(BlockPermutation.resolve("pu_bn:tar_cauldron", { "pu_bn:level": currentLevel - 1 }));
            } else {
                block.setType("minecraft:cauldron");
            }
            player.dimension.playSound("cauldron.fillwater", block.location, { pitch: 1.2 });
            player.dimension.playSound("bottle.fill", block.location);
        });
        return;
    }

    // --- Bucket Logic (Generic) ---
    if (config && block.typeId === "minecraft:cauldron") {
        const fillLevel = block.permutation.getState("fill_level") as number ?? 0;
        if (fillLevel !== 0) return;

        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);

        system.run(() => {
            if (!block.isValid) return;
            block.setPermutation(BlockPermutation.resolve(config.block, { "pu_bn:level": config.maxLevel }));
            
            const isHot = typeId.includes("magma") || typeId.includes("bismuth");
            const sound = isHot ? "bucket.empty_lava" : "bucket.empty_water";
            player.dimension.playSound(sound, block.location);

            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                const container = inventory.container;
                const slot = player.selectedSlotIndex;
                if (itemStack.amount === 1) {
                    container.setItem(slot, new ItemStack(config.returnItem));
                } else {
                    itemStack.amount--;
                    container.setItem(slot, itemStack);
                    const returnStack = new ItemStack(config.returnItem);
                    if (!container.addItem(returnStack)) block.dimension.spawnItem(returnStack, player.location);
                }
            }
        });
        return;
    }

    const bucketId = getBucketForCauldron(block.typeId);

    // --- Special Fluid Interactions ---
    if (block.typeId === "pu_bn:liquid_magma_cauldron" && typeId === "minecraft:water_bucket") {
        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);
        system.run(() => {
            if (!block.isValid) return;
            block.setType("minecraft:cauldron");
            player.dimension.playSound("random.fizz", block.location);
            player.dimension.spawnParticle("pu_bn:burnt_smoke", { x: block.x + 0.5, y: block.y + 1, z: block.z + 0.5 });
            
            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                inventory.container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:bucket"));
            }
        });
        return;
    }

    if (block.typeId === "pu_bn:liquid_magma_cauldron" && typeId === "pu_bn:tar_bucket") {
        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);
        system.run(() => {
            if (!block.isValid) return;
            player.dimension.playSound("random.fizz", block.location);
            player.dimension.spawnParticle("pu_bn:burnt_smoke", { x: block.x + 0.5, y: block.y + 1, z: block.z + 0.5 });
            
            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                inventory.container.setItem(player.selectedSlotIndex, new ItemStack("minecraft:bucket"));
            }
        });
        return;
    }

    if (bucketId && typeId === "minecraft:bucket") {
        const cauldronConfig = CAULDRON_CONFIG[bucketId];
        const currentLevel = block.permutation.getState("pu_bn:level" as any) as number ?? 0;
        if (currentLevel < cauldronConfig.maxLevel) return;

        event.cancel = true;
        player.setDynamicProperty("pu_bn:last_cauldron_interact", system.currentTick);

        system.run(() => {
            if (!block.isValid) return;
            block.setType("minecraft:cauldron");

            const isHot = bucketId.includes("magma") || bucketId.includes("bismuth");
            const sound = isHot ? "bucket.fill_lava" : "bucket.fill_water";
            player.dimension.playSound(sound, block.location);

            if (player.getGameMode() !== GameMode.Creative) {
                const inventory = player.getComponent(EntityComponentTypes.Inventory) as any;
                const container = inventory.container;
                const slot = player.selectedSlotIndex;
                if (itemStack.amount === 1) {
                    container.setItem(slot, new ItemStack(bucketId));
                } else {
                    itemStack.amount--;
                    container.setItem(slot, itemStack);
                    const returnStack = new ItemStack(bucketId);
                    if (!container.addItem(returnStack)) block.dimension.spawnItem(returnStack, player.location);
                }
            }
        });
    }
});
