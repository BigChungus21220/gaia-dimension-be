import { system, BlockPermutation } from "@minecraft/server";

const GAIA_NAMESPACE = "gaiadimension";
const STAIRS_TAG = `${GAIA_NAMESPACE}:stairs`;
const SHAPE_STATE = `${GAIA_NAMESPACE}:type`; // Assuming this state exists on the stair block
const COLLISION_BLOCK_ID = `${GAIA_NAMESPACE}:alder_stairs_collision`; // This should be generic

/**
 * A helper class for managing all logic related to custom stairs.
 */
export class StairsHelper {

    /**
     * Main update function for a stair block.
     * It updates both the shape and the collision blocker.
     * @param {import("@minecraft/server").Block} block
     */
    static updateStair(block) {
        if (!block?.isValid || !block.hasTag(STAIRS_TAG)) return;

        try {
            const shape = this.calculateShape(block);
            block.setPermutation(block.permutation.withState(SHAPE_STATE, shape));
            this.manageCollisionBlocker(block, shape);
        } catch (e) {
            console.warn(`[StairsHelper] Error updating stair at ${block.location.x},${block.location.y},${block.location.z}: ${e}`);
        }
    }

    /**
     * Calculates the shape of the stair based on its neighbors.
     * @param {import("@minecraft/server").Block} block
     * @returns {number} The shape value (1-5).
     */
    static calculateShape(block) {
        const direction = block.permutation.getState("minecraft:cardinal_direction");
        const stairHalf = block.permutation.getState("minecraft:vertical_half");

        const getNeighborShape = (neighbor) => {
            if (neighbor?.hasTag(STAIRS_TAG)) {
                return {
                    half: neighbor.permutation.getState("minecraft:vertical_half"),
                    direction: neighbor.permutation.getState("minecraft:cardinal_direction")
                };
            }
            // Basic support for vanilla stairs if needed, simplified
            if (neighbor?.typeId.includes("stairs")) {
                 return {
                    half: neighbor.permutation.getState("upside_down_bit") ? "top" : "bottom",
                    direction: ["east", "west", "south", "north"][neighbor.permutation.getState("weirdo_direction")]
                };
            }
            return {};
        };

        const isMatchingNeighbor = (neighbor, dir) => {
            const shape = getNeighborShape(neighbor);
            return shape.half === stairHalf && shape.direction === dir;
        };
        
        const neighbors = {
            north: block.north(),
            south: block.south(),
            east: block.east(),
            west: block.west()
        };

        // Outer and Inner Corner Logic
        if (direction === "north") {
            if (isMatchingNeighbor(neighbors.north, "west")) return 4; // inner left
            if (isMatchingNeighbor(neighbors.north, "east")) return 5; // inner right
            if (isMatchingNeighbor(neighbors.south, "west")) return 2; // outer left
            if (isMatchingNeighbor(neighbors.south, "east")) return 3; // outer right
        } else if (direction === "south") {
            if (isMatchingNeighbor(neighbors.north, "west")) return 3;
            if (isMatchingNeighbor(neighbors.north, "east")) return 2;
            if (isMatchingNeighbor(neighbors.south, "west")) return 4;
            if (isMatchingNeighbor(neighbors.south, "east")) return 5;
        } else if (direction === "west") {
            if (isMatchingNeighbor(neighbors.west, "north")) return 5;
            if (isMatchingNeighbor(neighbors.west, "south")) return 4;
            if (isMatchingNeighbor(neighbors.east, "north")) return 3;
            if (isMatchingNeighbor(neighbors.east, "south")) return 2;
        } else if (direction === "east") {
            if (isMatchingNeighbor(neighbors.west, "north")) return 2;
            if (isMatchingNeighbor(neighbors.west, "south")) return 3;
            if (isMatchingNeighbor(neighbors.east, "north")) return 5;
            if (isMatchingNeighbor(neighbors.east, "south")) return 4;
        }

        return 1; // Default straight shape
    }

    /**
     * Places or removes the collision blocker associated with a stair.
     * @param {import("@minecraft/server").Block} block The stair block.
     * @param {number} shape The calculated shape of the stair.
     */
    static manageCollisionBlocker(block, shape) {
        const stairHalf = block.permutation.getState("minecraft:vertical_half");
        const targetBlock = (stairHalf === "bottom") ? block.above() : block.below();

        // First, clear any existing blocker in the target space.
        if (targetBlock?.typeId === COLLISION_BLOCK_ID) {
            targetBlock.setType("minecraft:air");
        }

        // If it's a corner, place a new blocker.
        if (shape > 1 && targetBlock?.isAir) {
            try {
                // This logic for blocker direction seems overly complex, simplifying
                const direction = block.permutation.getState("minecraft:cardinal_direction");
                const blockerPerm = BlockPermutation.resolve(COLLISION_BLOCK_ID, {
                    "minecraft:cardinal_direction": direction,
                    "minecraft:vertical_half": stairHalf,
                    [`${GAIA_NAMESPACE}:corner`]: shape > 3
                });
                targetBlock.setPermutation(blockerPerm);
            } catch(e) {
                console.warn(`[StairsHelper] Could not place collision blocker: ${e}`);
            }
        }
    }

    /**
     * Updates the stair itself and any adjacent stairs.
     * @param {import("@minecraft/server").Block} block
     */
    static updateStairAndNeighbors(block) {
        system.run(() => {
            this.updateStair(block);
            const neighbors = [block.north(), block.south(), block.east(), block.west()];
            for (const neighbor of neighbors) {
                if (neighbor?.hasTag(STAIRS_TAG)) {
                    this.updateStair(neighbor);
                }
            }
        });
    }

    /**
     * Handles the placement of a stair block.
     * @param {import("@minecraft/server").BlockPlaceEvent} event
     */
    static handlePlace(event) {
        // Update the placed stair and its neighbors
        this.updateStairAndNeighbors(event.block);
    }

    /**
     * Handles the breaking of any block, updating adjacent stairs if necessary.
     * @param {import("@minecraft/server").PlayerBreakBlockAfterEvent} event
     */
    static handleBreak(event) {
        // When a block is broken, update all adjacent stairs.
        const { brokenBlockPermutation, dimension, location } = event;
        const neighbors = [
            dimension.getBlock({x: location.x + 1, y: location.y, z: location.z}),
            dimension.getBlock({x: location.x - 1, y: location.y, z: location.z}),
            dimension.getBlock({x: location.x, y: location.y, z: location.z + 1}),
            dimension.getBlock({x: location.x, y: location.y, z: location.z - 1}),
        ];
        system.run(() => {
            for (const neighbor of neighbors) {
                if (neighbor?.hasTag(STAIRS_TAG)) {
                    this.updateStair(neighbor);
                }
            }
            // Also, if the broken block was a stair, ensure its collision block is gone.
            if(brokenBlockPermutation.typeId.includes("stairs")){
                 const stairHalf = brokenBlockPermutation.getState("minecraft:vertical_half");
                 const targetBlock = (stairHalf === "bottom") ? dimension.getBlock(location).above() : dimension.getBlock(location).below();
                 if(targetBlock?.typeId === COLLISION_BLOCK_ID){
                     targetBlock.setType("minecraft:air");
                 }
            }
        });
    }
}
