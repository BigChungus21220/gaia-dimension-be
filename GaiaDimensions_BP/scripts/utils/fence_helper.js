import { system, world, BlockPermutation, GameMode, ItemStack, Direction } from "@minecraft/server";

const GAIA_NAMESPACE = "gaiadimension";
const INVISIBLE_BLOCK_ID = `${GAIA_NAMESPACE}:invisible`;

/**
 * A helper class for managing all logic related to custom fences and fence gates.
 */
export class FenceHelper {

    // --- Core Logic ---

    /**
     * Checks if a block is a valid, solid block that a fence can connect to.
     * @param {import("@minecraft/server").Block} block The block to check.
     * @returns {boolean}
     */
    static isConnectable(block) {
        if (!block || block.isAir || block.isLiquid) return false;
        if (block.typeId.includes("fence")) return true;
        return block.permutation.hasTag("solid");
    }

    /**
     * Updates the visual connections of a fence block based on its neighbors.
     * @param {import("@minecraft/server").Block} block The fence block to update.
     */
    static updateConnections(block) {
        if (!block || !block.typeId.includes("fence") || block.typeId.includes("fence_gate")) return;
        try {
            let perm = block.permutation;
            perm = perm.withState(`${GAIA_NAMESPACE}:north`, this.isConnectable(block.north()));
            perm = perm.withState(`${GAIA_NAMESPACE}:south`, this.isConnectable(block.south()));
            perm = perm.withState(`${GAIA_NAMESPACE}:east`, this.isConnectable(block.east()));
            perm = perm.withState(`${GAIA_NAMESPACE}:west`, this.isConnectable(block.west()));
            block.setPermutation(perm);
        } catch (e) { /* Suppress errors */ }
    }
    
    /**
     * Manages the invisible barrier block above fences and fence gates.
     * @param {import("@minecraft/server").Block} block The fence or fence gate block.
     */
    static manageInvisibleBarrier(block) {
        if (!block || !block.isValid) return;
        const blockAbove = block.above();
        if (!blockAbove) return;

        const typeId = block.typeId;
        const isGate = typeId.includes("fence_gate");
        const isOpen = isGate ? block.permutation.getState(`${GAIA_NAMESPACE}:open`) : false;

        const shouldHaveBarrier = !isGate || !isOpen;

        if (shouldHaveBarrier && blockAbove.isAir) {
            blockAbove.setType(INVISIBLE_BLOCK_ID);
        } else if (!shouldHaveBarrier && blockAbove.typeId === INVISIBLE_BLOCK_ID) {
            blockAbove.setType("minecraft:air");
        }
    }

    // --- Event Handlers ---

    /**
     * Handles placing fences and fence gates.
     * @param {import("@minecraft/server").BlockPlaceEvent} event
     */
    static handlePlace(event) {
        const { block, player } = event;
        if (!block.typeId.startsWith(GAIA_NAMESPACE) || !block.typeId.includes("fence")) return;

        if (block.typeId.includes("fence_gate")) {
            const view = player.getViewDirection();
            const direction = Math.abs(view.x) > Math.abs(view.z) ? "east" : "north";
            block.setPermutation(block.permutation.withState("minecraft:cardinal_direction", direction));
        }

        system.run(() => {
            this.updateConnections(block);
            this.manageInvisibleBarrier(block);
            this.updateNeighborConnections(block);
        });
    }

    /**
     * Handles breaking fences and other blocks.
     * @param {import("@minecraft/server").PlayerBreakBlockAfterEvent} event
     */
    static handleBreak(event) {
        const { brokenBlockPermutation, dimension, location } = event;
        
        if (brokenBlockPermutation.typeId === INVISIBLE_BLOCK_ID) return;

        const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
        if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
            blockAbove.setType("minecraft:air");
        }

        this.updateNeighborConnections(dimension.getBlock(location));
    }

    /**
     * Handles player interaction with fences and fence gates.
     * @param {import("@minecraft/server").PlayerInteractWithBlockBeforeEvent} event
     */
    static handleInteract(event) {
        const { player, block } = event;
        if (!block.typeId.startsWith(GAIA_NAMESPACE) || !block.typeId.includes("fence_gate")) return;

        event.cancel = true;
        system.run(() => {
            const isOpen = block.permutation.getState(`${GAIA_NAMESPACE}:open`);
            block.setPermutation(block.permutation.withState(`${GAIA_NAMESPACE}:open`, !isOpen));
            this.manageInvisibleBarrier(block);
            player.playSound(isOpen ? "close.fence_gate" : "open.fence_gate", block.location);
        });
    }

    // --- Utility ---

    /**
     * Triggers a connection update for all adjacent fence blocks.
     * @param {import("@minecraft/server").Block} block The block at the center.
     */
    static updateNeighborConnections(block) {
        if(!block) return;
        const { dimension } = block;
        const directions = ["north", "south", "east", "west"];
        for (const dir of directions) {
            this.updateConnections(block[dir]());
        }
    }
}
