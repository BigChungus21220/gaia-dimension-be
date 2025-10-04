import { system, world, BlockPermutation, GameMode, ItemStack } from "@minecraft/server";

const GAIA_NAMESPACE = "gaiadimension:";
const OPEN_STATE_SUFFIX = ":open";
const GAIA_OPEN_STATE = GAIA_NAMESPACE + "open";

const TOGGLEABLE_SUFFIXES = ["_door", "_curtain", "_trapdoor"];

/**
 * A helper class for managing interactions with various types of toggleable blocks like doors and curtains.
 */
export class ToggleableBlocks {

    /**
     * Checks if a given block is a toggleable type (door, curtain, etc.).
     * @param {import("@minecraft/server").Block} block The block to check.
     * @returns {boolean} True if the block is a toggleable type.
     */
    static isToggleable(block) {
        if (!block) return false;
        const typeId = block.typeId;
        return TOGGLEABLE_SUFFIXES.some(suffix => typeId.endsWith(suffix));
    }

    /**
     * Gets the open state of a toggleable block.
     * @param {import("@minecraft/server").Block} block The block.
     * @returns {boolean | undefined} The open state, or undefined if not applicable.
     */
    static getOpenState(block) {
        if (!this.isToggleable(block)) return undefined;
        const permutation = block.permutation;
        // Check for gaiadimension:open, cc_wild:open, etc.
        const openState = permutation.getAllStates()[GAIA_OPEN_STATE] ?? permutation.getState("open_bit") ?? permutation.getState("open");
        return typeof openState === 'boolean' ? openState : undefined;
    }

    /**
     * Sets the open state for a toggleable block, automatically handling multi-part blocks.
     * @param {import("@minecraft/server").Block} block The block to change.
     * @param {boolean} isOpen The desired open state.
     * @param {boolean} playSound Whether to play a sound.
     */
    static setOpenState(block, isOpen, playSound = true) {
        if (!this.isToggleable(block)) return;

        const parts = this.getParts(block);
        if (!parts) return;

        for (const part of Object.values(parts)) {
            if (part && part.isValid) {
                const currentState = this.getOpenState(part);
                if (currentState === isOpen) continue;

                const permutation = part.permutation;
                let newState = null;
                if (permutation.getState(GAIA_OPEN_STATE) !== undefined) newState = permutation.withState(GAIA_OPEN_STATE, isOpen);
                else if (permutation.getState("open_bit") !== undefined) newState = permutation.withState("open_bit", isOpen);
                else if (permutation.getState("open") !== undefined) newState = permutation.withState("open", isOpen);
                
                if(newState) part.setPermutation(newState);
            }
        }

        if (playSound) {
            const soundId = isOpen ? "random.door_open" : "random.door_close";
            block.dimension.playSound(soundId, block.location, { volume: 1, pitch: 1 });
        }
    }

    /**
     * Toggles the state of a toggleable block.
     * @param {import("@minecraft/server").Block} block The block to toggle.
     * @param {boolean} playSound Whether to play a sound.
     */
    static toggleState(block, playSound = true) {
        const currentState = this.getOpenState(block);
        if (currentState !== undefined) {
            this.setOpenState(block, !currentState, playSound);
        }
    }

    /**
     * Finds all parts of a multi-part block (e.g., upper and lower halves).
     * @param {import("@minecraft/server").Block} block A block that is part of a multi-part structure.
     * @returns {{upper: import("@minecraft/server").Block, lower: import("@minecraft/server").Block} | null}
     */
    static getParts(block) {
        if (!this.isToggleable(block) || block.typeId.includes("trapdoor")) return { lower: block, upper: null };

        const typeId = block.typeId;
        if (typeId.includes("_lower")) {
            const upper = block.above();
            if (upper && upper.typeId.replace("_upper", "") === typeId.replace("_lower", "")) {
                return { lower: block, upper: upper };
            }
        } else if (typeId.includes("_upper")) {
            const lower = block.below();
            if (lower && lower.typeId.replace("_lower", "") === typeId.replace("_upper", "")) {
                return { lower: lower, upper: block };
            }
        }
        return null; // Not a valid multi-part block
    }

    /**
     * Handles placing the top half of a multi-part block when the bottom is placed.
     * @param {import("@minecraft/server").BlockPlaceEvent} event The block place event.
     */
    static handlePlace(event) {
        const { block } = event;
        if (!this.isToggleable(block) || !block.typeId.includes("_lower")) return;

        const blockAbove = block.above();
        if (blockAbove?.isAir) {
            const upperBlockId = block.typeId.replace("_lower", "_upper");
            const permutation = block.permutation;
            const newPermutation = BlockPermutation.resolve(upperBlockId, permutation.getAllStates());
            blockAbove.setPermutation(newPermutation);
        }
    }

    /**
     * Handles breaking the other half of a multi-part block.
     * @param {import("@minecraft/server").PlayerBreakBlockBeforeEvent} event The block break event.
     */
    static handleBreak(event) {
        const { block, player } = event;
        if (!this.isToggleable(block)) return;

        const parts = this.getParts(block);
        if (!parts) return;

        const otherPart = block.typeId.includes("_lower") ? parts.upper : parts.lower;

        if (otherPart && otherPart.isValid) {
            // Use system.run to avoid blocking the event thread
            system.run(() => {
                otherPart.dimension.breakBlock(otherPart.location, player);
            });
        }
    }
     /**
     * Finds and sets the state of all adjacent toggleable blocks.
     * @param {import("@minecraft/server").Block} sourceBlock The block that initiates the action (e.g., a button or lever).
     * @param {boolean} isOpen The desired open state for the adjacent blocks.
     */
    static operateNearby(sourceBlock, isOpen) {
        const attachedBlock = this.getAttachedBlock(sourceBlock); // Assuming a getAttachedBlock for buttons/levers
        if (!attachedBlock) return;

        const directions = ["north", "south", "east", "west", "above", "below"];
        const checkedLocations = new Set();

        for (const dir of directions) {
            const neighbor = attachedBlock[dir]();
            if (this.isToggleable(neighbor)) {
                const parts = this.getParts(neighbor);
                const mainPart = parts?.lower ?? neighbor;
                const locKey = `${mainPart.location.x},${mainPart.location.y},${mainPart.location.z}`;
                if (!checkedLocations.has(locKey)) {
                    this.setOpenState(mainPart, isOpen);
                    checkedLocations.add(locKey);
                }
            }
        }
    }

    // Helper to find what a button/lever is attached to. Should be in a separate helper eventually.
    static getAttachedBlock(block) {
        const face = block.permutation.getState("minecraft:block_face") ?? block.permutation.getState("minecraft:facing_direction");
        switch (face) {
            case "down": case 0: return block.above();
            case "up": case 1: return block.below();
            case "north": case 2: return block.south();
            case "south": case 3: return block.north();
            case "west": case 4: return block.east();
            case "east": case 5: return block.west();
            default: return null;
        }
    }
}