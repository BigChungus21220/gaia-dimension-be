import { world, system, Block, BlockComponentRegistry, PlayerPlaceBlockAfterEvent, PlayerBreakBlockAfterEvent, PistonActivateAfterEvent } from "@minecraft/server";
import { registerBreakHandler, registerPlaceHandler } from "../systems/event_manager.js";
import { trackBlock, untrackBlock } from "../systems/destruction_handler.js";

const INVISIBLE_BLOCK_ID = "gaiadimension:invisible";

class InvisibleComponent {}

export function registerInvisibleComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent(INVISIBLE_BLOCK_ID, new InvisibleComponent());

    registerPlaceHandler({
        check: (block: Block) => block.typeId.startsWith("gaiadimension:") && (block.typeId.includes("_fence") || block.typeId.includes("_wall")),
        execute: (event: PlayerPlaceBlockAfterEvent) => {
            // Use a short delay to ensure the invisible block has been created by the game engine.
            system.run(() => {
                const blockAbove = event.block.above();
                if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
                    trackBlock(blockAbove);
                }
            });
        }
    });

    registerBreakHandler({
        event: "after",
        check: (event: PlayerBreakBlockAfterEvent) => {
            try {
                const typeId = event.brokenBlockPermutation.type.id;
                return typeId.startsWith("gaiadimension:") && (typeId.includes("_fence") || typeId.includes("_wall"));
            } catch (e) {
                return false;
            }
        },
        execute: (event: PlayerBreakBlockAfterEvent) => {
            const blockAbove = event.dimension.getBlock(event.block.location)?.above();
            if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
                untrackBlock(blockAbove.location);
                blockAbove.setType("minecraft:air");
            }
        }
    });

    world.afterEvents.pistonActivate.subscribe((event: PistonActivateAfterEvent) => {
        const { piston, dimension } = event;
        for (const location of piston.getAttachedBlocks()) {
            const block = dimension.getBlock(location);
            if (block && block.typeId.startsWith("gaiadimension:") && (block.typeId.includes("_fence") || block.typeId.includes("_wall"))) {
                const blockAbove = block.above();
                if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
                    untrackBlock(blockAbove.location);
                    blockAbove.setType("minecraft:air");
                }
            }
        }
    });
}
