import { world, system } from "@minecraft/server";
import { saplingConfig } from "../config/sapling_config.js";

class SaplingComponent {
    constructor() {
        this.onPlace = this.onPlace.bind(this);
        this.onPlayerInteract = this.onPlayerInteract.bind(this);
    }

    onPlace(event) {
        const { block } = event;
        const blockBelow = block.below();
        const config = saplingConfig[block.typeId];

        if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
            block.setType("minecraft:air");
        }
    }

    onPlayerInteract(event) {
        const { block, player, itemStack } = event;

        if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
            const config = saplingConfig[block.typeId];

            if (config && Math.random() < 0.25) { // 25% chance to grow
                const structureName = config.structures[Math.floor(Math.random() * config.structures.length)];
                block.setType("minecraft:air");
                world.structureManager.place(structureName, block.dimension, block.location);
                
                // Consume bone meal
                if (player.gamemode === "survival") {
                    itemStack.amount--;
                    player.getComponent("minecraft:equippable").setEquipment("Mainhand", itemStack);
                }
            }
        }
    }
}

export function registerSaplingComponent({ blockComponentRegistry }) {
    const saplingComponent = new SaplingComponent();
    blockComponentRegistry.registerCustomComponent("gaiadimension:sapling", {
        onPlace: saplingComponent.onPlace,
        onPlayerInteract: saplingComponent.onPlayerInteract
    });
}