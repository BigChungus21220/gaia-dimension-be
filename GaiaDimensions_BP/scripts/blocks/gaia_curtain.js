import { world, system } from "@minecraft/server";
import { ToggleableBlocks } from "../utils/ToggleableBlocks.js";

const GAIA_NAMESPACE = "gaiadimension";

function onPlayerInteract({ player, block }) {
    if (ToggleableBlocks.isToggleable(block)) {
        ToggleableBlocks.toggleState(block, true);
    }
}

function onBlockPlace(event) {
    system.run(() => ToggleableBlocks.handlePlace(event));
}

function onBlockBreak(event) {
    ToggleableBlocks.handleBreak(event);
}

function onLeverInteract({ block }) {
    if (block.typeId === "minecraft:lever") {
        system.run(() => {
            const isLeverOn = block.permutation.getState("open_bit");
            ToggleableBlocks.operateNearby(block, isLeverOn);
        });
    }
}

export function registerToggleableBlocks() {
    world.beforeEvents.playerInteractWithBlock.subscribe(onPlayerInteract);
    world.afterEvents.playerPlaceBlock.subscribe(onBlockPlace);
    world.beforeEvents.playerBreakBlock.subscribe(onBlockBreak);
    world.beforeEvents.playerInteractWithBlock.subscribe(onLeverInteract);
}

export function registerCurtainComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent(`gaiadimension:curtain`, {});
    registerToggleableBlocks();
}
