import { 
    Player, 
    ItemComponentUseOnEvent, 
    ItemComponentRegistry, 
    Dimension, 
    Vector3, 
    ItemDurabilityComponent, 
    EntityEquippableComponent, 
    EquipmentSlot,
    Direction
} from "@minecraft/server";
import { PortalManager } from "../API/lib/PortalLib.js";
import { ModConfig } from "../config/mod_config.js";

export function registerFireStarterComponent({ itemComponentRegistry }: { itemComponentRegistry: ItemComponentRegistry }): void {
    itemComponentRegistry.registerCustomComponent("gaiadimension:fire_starter", {
        onUseOn: (event: ItemComponentUseOnEvent) => {
            const { source: player, block, blockFace, itemStack } = event;
            if (!(player instanceof Player)) return;
            if (!itemStack) return;

            const targetLocation = block.location;
            const placeLocation: Vector3 = {
                x: targetLocation.x + (blockFace === Direction.East ? 1 : blockFace === Direction.West ? -1 : 0),
                y: targetLocation.y + (blockFace === Direction.Up ? 1 : blockFace === Direction.Down ? -1 : 0),
                z: targetLocation.z + (blockFace === Direction.South ? 1 : blockFace === Direction.North ? -1 : 0)
            };

            const targetBlock = player.dimension.getBlock(placeLocation);
            if (!targetBlock) return;

            // Prevent placing fire on top of fire
            if (targetBlock.typeId === "gaiadimension:glittering_fire") return;
            if (block.typeId === "gaiadimension:glittering_fire" && blockFace === Direction.Up) return;

            // Only place if it's air or replaceable
            if (targetBlock.isAir || targetBlock.typeId.includes("minecraft:light_block") || targetBlock.typeId === "minecraft:tallgrass" || targetBlock.typeId === "minecraft:yellow_flower" || targetBlock.typeId === "minecraft:red_flower") {
                const dimension: Dimension = player.dimension;
                
                // Biome check
                if (dimension.id === "minecraft:overworld" && ModConfig.portalBiomeRestriction && !ModConfig.allowAllBiomes) {
                    const biome = dimension.getBiome(placeLocation);
                    const hotBiomes = ModConfig.hotBiomes;

                    if (!hotBiomes.includes(biome.id)) {
                        dimension.playSound("random.fizz", placeLocation);
                        return;
                    }
                }

                targetBlock.setType("gaiadimension:glittering_fire");
                dimension.playSound("fire.ignite", placeLocation);
                
                // Attempt to ignite portal
                PortalManager.tryIgnite(targetBlock);
                
                // Damage the item if not in creative
                if (player.getGameMode() !== "creative") {
                    const durability = itemStack.getComponent("minecraft:durability") as ItemDurabilityComponent;
                    if (durability) {
                        const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
                        if (durability.damage + 1 >= durability.maxDurability) {
                            equippable?.setEquipment(EquipmentSlot.Mainhand, undefined);
                            player.playSound("random.break");
                        } else {
                            durability.damage += 1;
                            equippable?.setEquipment(EquipmentSlot.Mainhand, itemStack);
                        }
                    }
                }
            }
        }
    });
}
