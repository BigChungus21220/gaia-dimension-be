import { 
    GameMode, 
    system, 
    Block, 
    ItemStack, 
    Player, 
    EntityEquippableComponent, 
    BlockComponentRegistry, 
    PlayerPlaceBlockAfterEvent, 
    PlayerInteractWithBlockBeforeEvent, 
    EquipmentSlot, 
    BlockCustomComponent 
} from "@minecraft/server";
import { saplingConfig } from "../config/sapling_config.js";
import { registerInteractHandler, registerPlaceHandler } from "../systems/event_manager.js";

class SaplingComponent implements BlockCustomComponent {
    // Component logic moved to handlers
}

/**
 * Registers the sapling component and associated event handlers.
 * @param {Object} param0 - The block component registry.
 */
export function registerSaplingComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sapling", new SaplingComponent());

    // Handle placement logic (ground check)
    registerPlaceHandler({
        check: (block: Block): boolean => block.typeId in saplingConfig,
        execute: (event: PlayerPlaceBlockAfterEvent): void => {
             const { block } = event;
             // Delay to ensure block updates have propagated
             system.run(() => {
                if (!block.isValid) return;
                
                const blockBelow = block.below();
                const config = saplingConfig[block.typeId];

                if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
                    // Invalid ground, break the sapling
                    block.dimension.spawnItem(new ItemStack(block.typeId, 1), block.location);
                    block.setType("minecraft:air");
                }
             });
        }
    });

    // Handle bone meal interaction
    registerInteractHandler({
        check: (block: Block): boolean => block.typeId in saplingConfig,
        execute: (event: PlayerInteractWithBlockBeforeEvent): void => {
            system.run(() => {
                const { block, player, itemStack } = event;

                if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
                    const config = saplingConfig[block.typeId];

                    if (config && Math.random() < 0.25) { // 25% chance to grow
                        block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
                        const structureName = config.structures[Math.floor(Math.random() * config.structures.length)];
                        
                        // Set to air before placing structure to avoid collision issues
                        block.setType("minecraft:air");
                        
                        const offset = config.offset || { x: 0, y: 0, z: 0 };
                        const location = {
                            x: block.location.x + offset.x,
                            y: block.location.y + offset.y,
                            z: block.location.z + offset.z
                        };
                        
                        try {
                            block.dimension.runCommand(`structure load "${structureName}" ${location.x} ${location.y} ${location.z}`);
                        } catch (e) {
                            console.warn(`Failed to load structure ${structureName}: ${e}`);
                        }
                        
                        // Consume bone meal
                        if (player.getGameMode() !== GameMode.Creative) {
                            // Logic to reduce item count
                             const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
                             if (itemStack.amount > 1) {
                                 itemStack.amount--;
                                 equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
                             } else {
                                 equippable.setEquipment(EquipmentSlot.Mainhand);
                             }
                        }
                    } else if (config) {
                         // Failed to grow (still consume bone meal if desired, vanilla behavior consumes it)
                         // For now, only consuming on success to be generous, or add fail particles
                         block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
                          if (player.getGameMode() !== GameMode.Creative) {
                             const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent;
                             if (itemStack.amount > 1) {
                                 itemStack.amount--;
                                 equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
                             } else {
                                 equippable.setEquipment(EquipmentSlot.Mainhand);
                             }
                        }
                    }
                }
            });
        }
    });
}
