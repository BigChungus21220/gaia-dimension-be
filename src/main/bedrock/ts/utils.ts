import { world, system, Block, Dimension, Player, Vector3 } from "@minecraft/server";

// ── Dimension Registry ──────────────────────────────────────────────
// Vanilla dimensions are always present. Custom dimensions register
// themselves at startup via registerDimension().
const VANILLA_DIMENSION_IDS: string[] = ["overworld", "the_end", "nether"];
const registeredDimensionIds: string[] = [];

/**
 * Registers a custom dimension ID so it is included in getDimensions().
 * Call this during startup for every custom dimension you register.
 * @param id The dimension identifier (e.g. "myaddon:my_dimension").
 */
export function registerDimension(id: string): void {
    if (!registeredDimensionIds.includes(id)) {
        registeredDimensionIds.push(id);
    }
}

/**
 * Gets all dimensions of the world (vanilla + any registered custom).
 * Silently skips any dimension that fails to resolve.
 * @returns An array of Dimension objects.
 */
export function getDimensions(): Dimension[] {
    const dims: Dimension[] = [];
    for (const id of [...VANILLA_DIMENSION_IDS, ...registeredDimensionIds]) {
        try {
            dims.push(world.getDimension(id));
        } catch {
            // Dimension not available (not registered, or world not ready)
        }
    }
    return dims;
}

interface DoorSoundOptions {
    volume?: number;
    pitch?: number;
}

/**
 * Plays a door, trapdoor, or gate sound based on the block type and state.
 * @param block The interactive block instance.
 * @param isOpen True if the block is opening, false if it is closing.
 * @param options Optional sound options.
 */
export function playDoorSound(block: Block, isOpen: boolean, options: DoorSoundOptions = {}): void {
    if (!block || !block.location || !block.dimension) {
        console.warn("Invalid block provided to playDoorSound.");
        return;
    }

    const typeId = block.typeId.toLowerCase();
    let soundId: string;

    if (typeId.includes("iron_door")) {
        soundId = isOpen ? "open.iron_door" : "close.iron_door";
    } else if (typeId.includes("wooden_door") || typeId.includes("door")) {
        soundId = isOpen ? "open.wooden_door" : "close.wooden_door";
    } else if (typeId.includes("iron_trapdoor")) {
        soundId = isOpen ? "open.iron_trapdoor" : "close.iron_trapdoor";
    } else if (typeId.includes("trapdoor")) {
        soundId = isOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor";
    } else if (typeId.includes("fence_gate")) {
        soundId = isOpen ? "open.fence_gate" : "close.fence_gate";
    } else {
        soundId = "random.click";
    }

    const soundOptions = {
        volume: options.volume ?? 1.0,
        pitch: options.pitch ?? 1.0,
    };

    block.dimension.playSound(soundId, block.location, soundOptions);
}

/**
 * Checks if a player is sheltered by roof and walls.
 * @param player The player to check.
 * @returns True if sheltered, false otherwise.
 */
export function isSheltered(player: Player): boolean {
    try {
        const loc = player.location;
        const dim = player.dimension;
        let roofBlockCount = 0;
        let wallBlockCount = 0;

        for (let y = 2; y <= 4; y++) {
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    const block = dim.getBlock({ x: loc.x + x, y: loc.y + y, z: loc.z + z });
                    if (block && !block.isAir) {
                        roofBlockCount++;
                    }
                }
            }
        }

        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && z === 0) continue;
                const block = dim.getBlock({ x: loc.x + x, y: loc.y + 1, z: loc.z + z });
                if (block && !block.isAir) {
                    wallBlockCount++;
                }
            }
        }

        const hasRoof = roofBlockCount > 10;
        const hasWalls = wallBlockCount > 3;

        return hasRoof && hasWalls;
    } catch (e) {
        return false;
    }
}

/**
 * Checks if a player is underground.
 * @param player The player to check.
 * @returns True if underground, false otherwise.
 */
export function isUnderground(player: Player): boolean {
    try {
        let block = player.dimension.getTopmostBlock(player.location);
        if (block && player.location.y >= block.y) return false;

        while (block && block.y > player.dimension.heightRange.min && !block.isSolid) {
            if (player.location.y >= block.y) return false;
            block = block.below();
        }

        return block?.isSolid ?? false;
    } catch (e) {
        return false;
    }
}

/**
 * Gets the adjacent block in a given direction.
 * @param block The origin block.
 * @param direction Direction to get neighbor.
 * @returns The adjacent block or undefined.
 */
export function getNeighbor(block: Block, direction: string): Block | undefined {
    if (!block) return undefined;

    switch (direction) {
        case 'north': return block.north();
        case 'south': return block.south();
        case 'east': return block.east();
        case 'west': return block.west();
        case 'up': return block.above();
        case 'down': return block.below();
        default: return undefined;
    }
}

const REDSTONE_COMPONENTS: string[] = ['redstone_wire', 'repeater', 'comparator', 'redstone_torch'];

export const invertFace: Record<string, string> = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'above': 'below',
    'below': 'above'
};

/**
 * Calculates the redstone power level at a given block.
 * @param block The block to check.
 * @returns The redstone power level (0-15).
 */
export function getRedstonePower(block: Block): number {
    let power = block.getRedstonePower() ?? 0;
    if (power > 0) return power;

    const faces = ['north', 'south', 'east', 'west', 'below', 'above'] as const;
    
    for (const face of faces) {
        let neighbor: Block | undefined;
        if (face === 'north') neighbor = block.north();
        else if (face === 'south') neighbor = block.south();
        else if (face === 'east') neighbor = block.east();
        else if (face === 'west') neighbor = block.west();
        else if (face === 'above') neighbor = block.above();
        else if (face === 'below') neighbor = block.below();

        if (!neighbor) continue;
        
        const neighborPower = neighbor.getRedstonePower() ?? 0;
        
        if (neighborPower > 0) {
            const isSpecialComponent = REDSTONE_COMPONENTS.some(c => neighbor!.typeId.includes(c));
            if (!isSpecialComponent) {
                return neighborPower;
            }
        }

        if (neighbor.typeId.includes('redstone_torch')) {
            const torchFacing = neighbor.permutation.getState('torch_facing_direction');
            if (torchFacing !== invertFace[face]) {
                return neighborPower;
            }
        }
    }

    const above = block.above();
    if (above?.typeId === 'minecraft:daylight_detector') {
        return above.getRedstonePower() ?? 0;
    }

    return 0;
}

/**
 * Returns a promise that resolves after a specified number of ticks.
 * @param ticks Number of ticks to wait.
 */
export function sleep(ticks: number): Promise<void> {
    return new Promise(resolve => system.runTimeout(resolve, ticks));
}
