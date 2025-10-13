import { world, GameMode, system } from "@minecraft/server";
import { saplingConfig } from "../config/sapling_config.js";
import { registerInteractHandler } from "../systems/event_manager.js";

class SaplingComponent {
    constructor() {
        this.onPlace = this.onPlace.bind(this);
    }

    onPlace(event) {
        const { block } = event;
        const blockBelow = block.below();
        const config = saplingConfig[block.typeId];

        if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
            block.setType("minecraft:air");
        }
    }
}

export function registerSaplingComponent({ blockComponentRegistry }) {
    const saplingComponent = new SaplingComponent();
    blockComponentRegistry.registerCustomComponent("gaiadimension:sapling", {
        onPlace: saplingComponent.onPlace
    });

    const saplingInteractHandler = {
        check: (block) => {
            return block.typeId in saplingConfig;
        },
        execute: (event) => {
            system.run(() => {
                const { block, player, itemStack } = event;

                if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
                    const config = saplingConfig[block.typeId];

                    if (config && Math.random() < 0.25) { // 25% chance to grow
                        block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
                        const structureName = config.structures[Math.floor(Math.random() * config.structures.length)];
                        block.setType("minecraft:air");
                        // Replace StructureManager with runCommand
                        const offset = config.offset || { x: 0, y: 0, z: 0 };
                        const location = {
                            x: block.location.x + offset.x,
                            y: block.location.y + offset.y,
                            z: block.location.z + offset.z
                        };
                        block.dimension.runCommand(`structure load ${structureName} ${location.x} ${location.y} ${location.z}`);
                        
                        // Consume bone meal
                        if (player.gameMode === GameMode.survival) {
                            itemStack.amount--;
                            player.getComponent("minecraft:equippable").setEquipment("Mainhand", itemStack);
                        }
                    }
                }
            });
        }
    };

    registerInteractHandler(saplingInteractHandler);
}