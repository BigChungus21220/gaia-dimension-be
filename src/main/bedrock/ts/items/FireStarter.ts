import { Player, ItemComponentUseOnEvent, ItemComponentRegistry } from "@minecraft/server";

export function registerFireStarterComponent({ itemComponentRegistry }: { itemComponentRegistry: any }): void {
    itemComponentRegistry.registerCustomComponent("gaiadimension:fire_starter", {
        onUseOn: (event: ItemComponentUseOnEvent) => {
            const { source: player, block, blockFace, itemStack } = event;
            if (!(player instanceof Player)) return;

            const targetLocation = block.location;
            const placeLocation = {
                x: targetLocation.x + (blockFace === "East" ? 1 : blockFace === "West" ? -1 : 0),
                y: targetLocation.y + (blockFace === "Up" ? 1 : blockFace === "Down" ? -1 : 0),
                z: targetLocation.z + (blockFace === "South" ? 1 : blockFace === "North" ? -1 : 0)
            };

            const targetBlock = player.dimension.getBlock(placeLocation);
            if (!targetBlock) return;

            // Prevent placing fire on top of fire
            if (targetBlock.typeId === "gaiadimension:glittering_fire") return;
            if (block.typeId === "gaiadimension:glittering_fire" && blockFace === "Up") return;

            // Only place if it's air or replaceable
            if (targetBlock.isAir || targetBlock.typeId === "minecraft:tallgrass" || targetBlock.typeId === "minecraft:yellow_flower" || targetBlock.typeId === "minecraft:red_flower") {
                targetBlock.setType("gaiadimension:glittering_fire");
                player.dimension.playSound("fire.ignite", placeLocation);
                
                // Damage the item if not in creative
                if (player.getGameMode() !== "creative") {
                    const durability = itemStack.getComponent("minecraft:durability") as any;
                    if (durability) {
                        if (durability.damage + 1 >= durability.maxDurability) {
                            const equippable = player.getComponent("minecraft:equippable") as any;
                            equippable?.setEquipment("Mainhand", undefined);
                            player.playSound("random.break");
                        } else {
                            durability.damage += 1;
                            const equippable = player.getComponent("minecraft:equippable") as any;
                            equippable?.setEquipment("Mainhand", itemStack);
                        }
                    }
                }
            }
        }
    });
}
