import { system, world, BlockPermutation } from "@minecraft/server";

const GAIA_NAMESPACE = "gaiadimension:";
const OPEN_STATE_SUFFIX = ":open";
const GAIA_OPEN_STATE = GAIA_NAMESPACE + "open";

// Updated to be more inclusive for multi-part identifiers
const TOGGLEABLE_IDENTIFIERS = ["_door", "_curtain", "_trapdoor"];

/**
 * A helper class for managing interactions with various types of toggleable blocks like doors and curtains.
 */
export class ToggleableBlocks {

    /**
     * Checks if a given block is a toggleable type.
     * @param {import("@minecraft/server").Block} block The block to check.
     * @returns {boolean} True if the block is a toggleable type.
     */
    static isToggleable(block) {
        if (!block || !block.typeId) return false;
        const typeId = block.typeId;
        // Check if the typeId contains any of the identifiers, not just ends with them
        return TOGGLEABLE_IDENTIFIERS.some(id => typeId.includes(id));
    }

    /**
     * Gets the open state of a toggleable block.
     * @param {import("@minecraft/server").Block} block The block.
     * @returns {boolean | undefined} The open state, or undefined if not applicable.
     */
    static getOpenState(block) {
        if (!this.isToggleable(block)) return undefined;
        const permutation = block.permutation;
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
            if (part && part.isValid()) {
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
     * Finds all parts of a multi-part block (e.g., upper/lower, or all four corners of a double curtain).
     * @param {import("@minecraft/server").Block} block A block that is part of a multi-part structure.
     * @returns {Object.<string, import("@minecraft/server").Block> | null} An object containing all parts of the block.
     */
    static getParts(block) {
        if (!this.isToggleable(block)) return null;
        if (block.typeId.includes("trapdoor")) return { lower: block };

        const typeId = block.typeId;
        const baseTypeId = typeId.substring(0, typeId.lastIndexOf("_curtain_") + 9);

        // Handle 4-part double curtains
        if (typeId.includes('_left') || typeId.includes('_right')) {
            let topLeft, topRight, bottomLeft, bottomRight;
            if (typeId.includes('_top_left')) topLeft = block;
            if (typeId.includes('_top_right')) topRight = block;
            if (typeId.includes('_bottom_left')) bottomLeft = block;
            if (typeId.includes('_bottom_right')) bottomRight = block;

            const dir = this.getFacingDirection(block);
            const right = this.getRight(dir);
            const left = this.getOpposite(right);

            const checkNeighbor = (current, side, suffix) => {
                const neighbor = current.getNeighbor(side);
                if (neighbor && neighbor.typeId === `${baseTypeId}${suffix}`) return neighbor;
                return null;
            }

            // Find all four corners based on the current part
            if (typeId.includes('_bottom_left')) {
                bottomRight = checkNeighbor(block, right, 'bottom_right');
                topLeft = checkNeighbor(block, 'up', 'top_left');
                if (topLeft) topRight = checkNeighbor(topLeft, right, 'top_right');
            } else if (typeId.includes('_bottom_right')) {
                bottomLeft = checkNeighbor(block, left, 'bottom_left');
                topRight = checkNeighbor(block, 'up', 'top_right');
                if (topRight) topLeft = checkNeighbor(topRight, left, 'top_left');
            } else if (typeId.includes('_top_left')) {
                topRight = checkNeighbor(block, right, 'top_right');
                bottomLeft = checkNeighbor(block, 'down', 'bottom_left');
                if (bottomLeft) bottomRight = checkNeighbor(bottomLeft, right, 'bottom_right');
            } else if (typeId.includes('_top_right')) {
                topLeft = checkNeighbor(block, left, 'top_left');
                bottomRight = checkNeighbor(block, 'down', 'bottom_right');
                if (bottomRight) bottomLeft = checkNeighbor(bottomRight, left, 'bottom_left');
            }
            
            if (topLeft && topRight && bottomLeft && bottomRight) {
                return { topLeft, topRight, bottomLeft, bottomRight };
            }
        }

        // Handle 2-part single curtains/doors
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
        
        return { lower: block }; // Fallback for single blocks
    }

    /**
     * Handles placing multi-part blocks and forming double curtains.
     * @param {import("@minecraft/server").BlockPlaceEvent} event The block place event.
     */
    static handlePlace(event) {
        const { block } = event;
        if (!this.isToggleable(block) || !block.typeId.includes("_lower")) return;

        // Place the upper part of the curtain
        const blockAbove = block.above();
        if (blockAbove?.isAir) {
            const upperBlockId = block.typeId.replace("_lower", "_upper");
            const permutation = block.permutation;
            const newPermutation = BlockPermutation.resolve(upperBlockId, permutation.getAllStates());
            blockAbove.setPermutation(newPermutation);

            // Defer the double curtain check to the next tick
            system.run(() => this.checkForDoubleCurtain(block, blockAbove));
        }
    }

    /**
     * Checks for and forms a double curtain.
     * @param {import("@minecraft/server").Block} lowerBlock The lower block of the newly placed curtain.
     * @param {import("@minecraft/server").Block} upperBlock The upper block of the newly placed curtain.
     */
    static checkForDoubleCurtain(lowerBlock, upperBlock) {
        const dir = this.getFacingDirection(lowerBlock);
        const right = this.getRight(dir);
        const left = this.getOpposite(right);

        const neighbor = lowerBlock.getNeighbor(left) || lowerBlock.getNeighbor(right);
        
        if (neighbor && this.isToggleable(neighbor) && neighbor.typeId.includes("_curtain")) {
            const neighborDir = this.getFacingDirection(neighbor);
            if (dir !== neighborDir) return;

            const baseTypeId = lowerBlock.typeId.substring(0, lowerBlock.typeId.lastIndexOf("_curtain_") + 9);
            if (!neighbor.typeId.startsWith(baseTypeId)) return;

            const neighborParts = this.getParts(neighbor);
            if (!neighborParts || !neighborParts.lower || !neighborParts.upper) return;

            const placedOnLeft = lowerBlock.getNeighbor(right) === neighbor;
            
            const leftCurtain = placedOnLeft ? lowerBlock : neighborParts.lower;
            const rightCurtain = placedOnLeft ? neighborParts.lower : lowerBlock;

            const newPerms = {
                tl: BlockPermutation.resolve(`${baseTypeId}top_left`, leftCurtain.permutation.getAllStates()),
                tr: BlockPermutation.resolve(`${baseTypeId}top_right`, rightCurtain.permutation.getAllStates()),
                bl: BlockPermutation.resolve(`${baseTypeId}bottom_left`, leftCurtain.permutation.getAllStates()),
                br: BlockPermutation.resolve(`${baseTypeId}bottom_right`, rightCurtain.permutation.getAllStates())
            };

            leftCurtain.above().setPermutation(newPerms.tl);
            rightCurtain.above().setPermutation(newPerms.tr);
            leftCurtain.setPermutation(newPerms.bl);
            rightCurtain.setPermutation(newPerms.br);
        }
    }

    /**
     * Handles breaking all parts of a multi-part block.
     * @param {import("@minecraft/server").PlayerBreakBlockBeforeEvent} event The block break event.
     */
    static handleBreak(event) {
        const { block, player } = event;
        if (!this.isToggleable(block)) return;

        const parts = this.getParts(block);
        if (!parts) return;

        system.run(() => {
            for (const part of Object.values(parts)) {
                if (part && part.isValid() && part.location.x !== block.location.x || part.location.y !== block.location.y || part.location.z !== block.location.z) {
                    part.dimension.breakBlock(part.location, player);
                }
            }
        });
    }

    /**
     * Finds and sets the state of all adjacent toggleable blocks.
     * @param {import("@minecraft/server").Block} sourceBlock The block that initiates the action.
     * @param {boolean} isOpen The desired open state.
     */
    static operateNearby(sourceBlock, isOpen) {
        const attachedBlock = this.getAttachedBlock(sourceBlock);
        if (!attachedBlock) return;

        const directions = ["north", "south", "east", "west", "above", "below"];
        const checkedLocations = new Set();

        for (const dir of directions) {
            const neighbor = attachedBlock.getNeighbor(dir);
            if (this.isToggleable(neighbor)) {
                const parts = this.getParts(neighbor);
                const mainPart = parts?.lower ?? parts?.bottomLeft ?? neighbor;
                if (mainPart) {
                    const locKey = `${mainPart.location.x},${mainPart.location.y},${mainPart.location.z}`;
                    if (!checkedLocations.has(locKey)) {
                        this.setOpenState(mainPart, isOpen);
                        checkedLocations.add(locKey);
                    }
                }
            }
        }
    }

    /**
     * Gets the cardinal direction a block is facing.
     * @param {import("@minecraft/server").Block} block The block.
     * @returns {string} The cardinal direction.
     */
    static getFacingDirection(block) {
        const state = block.permutation.getState("minecraft:cardinal_direction");
        return state;
    }

    static getRight(direction) {
        switch (direction) {
            case "north": return "east";
            case "east": return "south";
            case "south": return "west";
            case "west": return "north";
            default: return "east";
        }
    }

    static getOpposite(direction) {
        switch (direction) {
            case "north": return "south";
            case "east": return "west";
            case "south": return "north";
            case "west": return "east";
            default: return "south";
        }
    }

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