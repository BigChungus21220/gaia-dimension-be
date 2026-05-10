import { Block, BlockComponentRegistry, Player, PlayerInteractWithBlockBeforeEvent, system } from "@minecraft/server";
import { RedstoneControl } from "../systems/Redstone.js";
import { registerInteractHandler } from "../systems/event_manager.js";

const BUTTON_SUFFIX: string = "_button";
const PRESS_DURATION: number = 1.5 * 20; // 1.5 seconds in ticks
const VANILLA_BUTTON_DURATION: number = 1.5 * 20; // 1.5 seconds for vanilla buttons too

class ButtonComponent {
    // Logic moved to handlers
}

function isCustomButton(blockTypeId: string): boolean {
    return blockTypeId.endsWith(BUTTON_SUFFIX);
}

function isVanillaButton(blockTypeId: string): boolean {
    return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("button");
}

function getSoundName(blockTypeId: string, isPressing: boolean): string {
    if (isCustomButton(blockTypeId)) {
        // Using a generic sound name that should work for all wood types
        return isPressing ? 
            "click_on.bamboo_wood_button" : 
            "click_off.bamboo_wood_button";
    }
    return "";
}

function findSolidBlock(buttonBlock: Block): Block | undefined {
    const blockFace = buttonBlock.permutation.getState("minecraft:block_face") as string | undefined;
    switch (blockFace) {
        case "down": return buttonBlock.above();
        case "up": return buttonBlock.below();
        case "north": return buttonBlock.south();
        case "south": return buttonBlock.north();
        case "west": return buttonBlock.east();
        case "east": return buttonBlock.west();
        default: return undefined;
    }
}

function updateCustomDoorsOnly(buttonBlock: Block, newState: boolean): void {
    const dimension = buttonBlock.dimension;
    const center = buttonBlock.location;
    const checkedDoors: Set<string> = new Set<string>(); // To avoid toggling the same door twice

    // Scan a 3x3x3 cube around the button
    for (let x: number = -1; x <= 1; x++) {
        for (let y: number = -1; y <= 1; y++) {
            for (let z: number = -1; z <= 1; z++) {
                const checkLocation = { x: center.x + x, y: center.y + y, z: center.z + z };
                const block: Block | undefined = dimension.getBlock(checkLocation);

                if (block && block.typeId.includes("door") && !block.typeId.includes("trapdoor")) {
                    
                    let lowerHalf: Block | undefined, upperHalf: Block | undefined;
                    if (block.typeId.includes("_lower")) {
                        lowerHalf = block;
                        upperHalf = block.above();
                    } else if (block.typeId.includes("_upper")) {
                        upperHalf = block;
                        lowerHalf = block.below();
                    } else {
                        continue;
                    }

                    if (!lowerHalf || !upperHalf || !lowerHalf.typeId.includes("_lower") || !upperHalf.typeId.includes("_upper")) {
                        continue;
                    }
                    
                    const lowerKey: string = `${lowerHalf.location.x},${lowerHalf.location.y},${lowerHalf.location.z}`;
                    if (checkedDoors.has(lowerKey)) {
                        continue;
                    }
                    checkedDoors.add(lowerKey);

                    const blocksToToggle: Block[] = [lowerHalf, upperHalf];
                    for (const doorBlock of blocksToToggle) {
                        const perm = doorBlock.permutation;
                        const isOpen = perm.getState("gaiadimension:open") as boolean | undefined;
                        if (isOpen !== undefined && isOpen !== newState) {
                            doorBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                            
                            doorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", doorBlock.location, { volume: 1, pitch: 1 });
                            
                            if (newState) {
                                RedstoneControl.openAndTrackDoor(doorBlock, buttonBlock);
                            } else {
                                RedstoneControl.updateDoorTracker(doorBlock, buttonBlock);
                            }
                        }
                    }
                }
            }
        }
    }
}

function handleCustomButtonPress(player: Player, block: Block): void {
    const currentState = block.permutation.getState("gaiadimension:pressed") as boolean | undefined;
    if (currentState === false) {
        // Visual state change
        block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
        
        // Sound
        const pressSound: string = getSoundName(block.typeId, true);
        if (pressSound) {
            player.playSound(pressSound, { location: block.location, volume: 1, pitch: 1 });
        }

        // Custom button logic: behave like a redstone source
        const attachedBlock: Block | undefined = findSolidBlock(block);
        if (attachedBlock) {
             RedstoneControl.updateRedstonePower(block);
        }
            
        // Schedule the button to release
        system.runTimeout(() => {
            // Check if the block is still valid before proceeding
            if (block.isValid) {
                try {
                    // Visual state change
                    block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
                } catch (e: unknown) {
                    // Ignore error if block is no longer valid
                }

                // Sound
                const releaseSound: string = getSoundName(block.typeId, false);
                if (releaseSound) {
                    player.playSound(releaseSound, { location: block.location, volume: 1, pitch: 1 });
                }
            }
        }, PRESS_DURATION);
    }
}

export function registerButtonComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:button", {});

    // Vanilla Button & Lever Interaction
    registerInteractHandler({
        check: (block: Block): boolean => (block.typeId.startsWith("minecraft:") && (block.typeId.includes("button") || block.typeId.includes("lever"))),
        execute: (event: PlayerInteractWithBlockBeforeEvent): void => {
            system.run(() => {
                const { player, block } = event;
                if (block.typeId.includes("button")) {
                    updateCustomDoorsOnly(block, true);
                    const foundDoors: { block: Block }[] = RedstoneControl.traceNetworkForDoors(block);
                    for (const doorInfo of foundDoors) {
                        RedstoneControl.openAndTrackDoor(doorInfo.block, block);
                    }
                    system.runTimeout(() => {
                        updateCustomDoorsOnly(block, false);
                    }, VANILLA_BUTTON_DURATION);
                }
                 else if (block.typeId.includes("lever")) {
                    updateCustomDoorsOnly(block, true);
                    const foundDoors: { block: Block }[] = RedstoneControl.traceNetworkForDoors(block);
                    for (const doorInfo of foundDoors) {
                        RedstoneControl.openAndTrackDoor(doorInfo.block, block);
                    }
                }
            });
        }
    });
    
    // Custom Button Interaction
    registerInteractHandler({
        check: (block: Block): boolean => isCustomButton(block.typeId),
        execute: (event: PlayerInteractWithBlockBeforeEvent): void => {
             system.run(() => handleCustomButtonPress(event.player, event.block));
        }
    });
}
