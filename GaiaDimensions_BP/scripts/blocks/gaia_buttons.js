import { system, world } from "@minecraft/server";
import { RedstoneControl } from "../systems/Redstone.js";
import { registerBreakHandler } from "../systems/event_manager.js";
import { ToggleableBlocks } from "../utils/ToggleableBlocks.js";

const GAIA_NAMESPACE = "gaiadimension";
const BUTTON_SUFFIX = "_button";
const PRESSED_STATE = `${GAIA_NAMESPACE}:pressed`;

const CUSTOM_BUTTON_PRESS_DURATION = 1.5 * 20; // 1.5 seconds
const VANILLA_BUTTON_PRESS_DURATION = 1.5 * 20; // 1.5 seconds

class ButtonManager {
    isCustomButton(block) {
        return block.typeId.startsWith(GAIA_NAMESPACE) && block.typeId.endsWith(BUTTON_SUFFIX);
    }

    isVanillaButton(block) {
        return block.typeId.startsWith("minecraft:") && block.typeId.includes("button");
    }

    getAttachedBlock(buttonBlock) {
        const face = buttonBlock.permutation.getState("minecraft:block_face");
        switch (face) {
            case "down": return buttonBlock.above();
            case "up": return buttonBlock.below();
            case "north": return buttonBlock.south();
            case "south": return buttonBlock.north();
            case "west": return buttonBlock.east();
            case "east": return buttonBlock.west();
            default: return null;
        }
    }

    playSound(block, isPressing) {
        const soundId = isPressing ? "click_on.bamboo_wood_button" : "click_off.bamboo_wood_button";
        block.dimension.playSound(soundId, block.location, { volume: 1, pitch: 1 });
    }

    setButtonPressed(block, isPressed) {
        if (block.isValid) {
            try {
                block.setPermutation(block.permutation.withState(PRESSED_STATE, isPressed));
            } catch (e) {
                // Ignore errors
            }
        }
    }

    handleCustomButtonPress(player, block) {
        const currentState = block.permutation.getState(PRESSED_STATE);
        if (currentState === false) {
            this.setButtonPressed(block, true);
            this.playSound(block, true);

            const attachedBlock = this.getAttachedBlock(block);
            if (attachedBlock) {
                const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
                RedstoneControl.setRedstonePower(attachedBlock.location, 15, sourceId);
                ToggleableBlocks.operateNearby(block, true);
            }

            system.runTimeout(() => {
                this.setButtonPressed(block, false);
                this.playSound(block, false);

                if (attachedBlock) {
                    const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
                    RedstoneControl.setRedstonePower(attachedBlock.location, 0, sourceId);
                    ToggleableBlocks.operateNearby(block, false);
                }
            }, CUSTOM_BUTTON_PRESS_DURATION);
        }
    }

    handleVanillaButtonInteraction(block) {
        ToggleableBlocks.operateNearby(block, true);
        system.runTimeout(() => {
            ToggleableBlocks.operateNearby(block, false);
        }, VANILLA_BUTTON_PRESS_DURATION);
    }
}

export function registerButtonComponent({ blockComponentRegistry }) {
    const manager = new ButtonManager();

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        system.run(() => {
            const { player, block } = event;
            if (manager.isCustomButton(block)) {
                manager.handleCustomButtonPress(player, block);
            } else if (manager.isVanillaButton(block)) {
                manager.handleVanillaButtonInteraction(block);
            }
        });
    });

    blockComponentRegistry.registerCustomComponent(`${GAIA_NAMESPACE}:button`, {});

    registerBreakHandler({
        event: "before",
        check: (block) => manager.isCustomButton(block),
        execute: (event) => {
            const { block } = event;
            const attachedBlock = manager.getAttachedBlock(block);
            if (attachedBlock) {
                const sourceId = `button_${block.location.x}_${block.location.y}_${block.location.z}`;
                RedstoneControl.removeRedstonePower(sourceId);
            }
        }
    });
}