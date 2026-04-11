import { Player, Entity, Dimension, Block } from "@minecraft/server";

export interface FluidInteraction {
    /** Block ID(s) to check for. */
    targetBlock: string | string[];
    /** Whether to transform the fluid block itself or the target block found. */
    action: "transformSelf" | "transformTarget";
    /** The block ID to transform into. */
    resultBlock: string;
    /** Where to check for the target block relative to the fluid. */
    directions: "adjacent" | "below" | "all"; 
    /** Optional sound to play when interaction occurs. */
    sound?: string;
}

export abstract class FluidTemplate {
    /**
     * List of all block type IDs considered part of this fluid (source, flowing, levels).
     */
    abstract get fluidIDs(): string[];

    /**
     * Defines interactions with other blocks (e.g. lava + water = stone).
     */
    abstract getInteractions(): FluidInteraction[];

    /**
     * Called every tick for a player interacting with this fluid.
     * @param player The player entity.
     * @param block The fluid block the player is interacting with.
     * @param isHeadInside Whether the player's head is inside this fluid.
     * @param isFeetInside Whether the player's feet are inside this fluid.
     */
    abstract onPlayerTick(player: Player, block: Block, isHeadInside: boolean, isFeetInside: boolean): void;

    /**
     * Called every tick for a non-player entity interacting with this fluid.
     */
    onEntityTick?(entity: Entity, block: Block): void;

    /**
     * Called for custom boat logic.
     * @param boat The boat entity.
     * @param dimension The dimension.
     * @param isDeep Whether the boat is in deep fluid (source/high level).
     */
    abstract processBoat(boat: Entity, dimension: Dimension, isDeep: boolean): void;

    /**
     * The amount the level decreases for each horizontal block spread.
     */
    get decayPerBlock(): number {
        return 1; // Vanilla Water default
    }

    /**
     * How far to search for a slope/hole when spreading horizontally.
     */
    get slopeFindDistance(): number {
        return 4; // Vanilla Water default
    }

    /**
     * The delay in ticks between each spread operation.
     * Higher values result in slower flow.
     */
    get spreadDelay(): number {
        return 5; // Default delay
    }
}
