import { world, system } from "@minecraft/server";

export function getDimensions() {
    return [
        world.getDimension("overworld"),
        world.getDimension("the_end"),
        world.getDimension("nether")
    ];
}

/**
 * Plays a door, trapdoor, or gate sound based on the block type and state.
 * It intelligently selects the correct sound (wood, iron, etc.) and
 * whether to play the open or close sound.
 *
 * @param {import("@minecraft/server").Block} block The interactive block instance (e.g., a door, gate).
 * @param {boolean} isOpen True if the block is opening, false if it is closing.
 * @param {object} [options] Optional sound options.
 * @param {number} [options.volume=1.0] The volume of the sound.
 * @param {number} [options.pitch=1.0] The pitch of the sound.
 */
export function playDoorSound(block, isOpen, options = {}) {
    if (!block || !block.location || !block.dimension) {
        console.warn("Invalid block provided to playDoorSound.");
        return;
    }

    const typeId = block.typeId.toLowerCase();
    let soundId;

    // Determine sound type based on block material
    if (typeId.includes("iron_door")) {
        soundId = isOpen ? "open.iron_door" : "close.iron_door";
    } else if (typeId.includes("wooden_door") || typeId.includes("door")) { // Catches custom doors named "door"
        soundId = isOpen ? "open.wooden_door" : "close.wooden_door";
    } else if (typeId.includes("iron_trapdoor")) {
        soundId = isOpen ? "open.iron_trapdoor" : "close.iron_trapdoor";
    } else if (typeId.includes("trapdoor")) {
        soundId = isOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor";
    } else if (typeId.includes("fence_gate")) {
        soundId = isOpen ? "open.fence_gate" : "close.fence_gate";
    } else {
        // As a fallback, use a generic click sound if type is unknown
        soundId = isOpen ? "random.click" : "random.click";
    }

    const soundOptions = {
        volume: options.volume ?? 1.0,
        pitch: options.pitch ?? 1.0,
    };

    block.dimension.playSound(soundId, block.location, soundOptions);
}


export function isSheltered(player) {
    try {
        const loc = player.location;
        const dim = player.dimension;
        let roofBlockCount = 0;
        let wallBlockCount = 0;

        // Roof check (3x3x3 volume 2 blocks above the player)
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

        // Wall check (a ring of 3x3 at player's head level)
        for (let x = -1; x <= 1; x++) {
            for (let z = -1; z <= 1; z++) {
                if (x === 0 && z === 0) continue; // Skip the block the player is in
                const block = dim.getBlock({ x: loc.x + x, y: loc.y + 1, z: loc.z + z });
                if (block && !block.isAir) {
                    wallBlockCount++;
                }
            }
        }

        const hasRoof = roofBlockCount > 10; // More than 10 blocks in a 27 block volume
        const hasWalls = wallBlockCount > 3; // More than 3 blocks in the ring of 8 blocks

        return hasRoof && hasWalls;
    } catch (e) {
        return false; // To be safe, let's just...assume not sheltered if chunks are unloaded
    }
}

export function isUnderground(player) {
    try {
        // Get the topmost block at the player's location
        let block = player.dimension.getTopmostBlock(player.location);
        
        // If the player's Y position is above or at the block's Y position, they're not underground
        if (player.location.y >= block.y) return false;

        // Traverse downward until a solid block is found or we reach the height limit
        while (block.y > player.dimension.heightRange.min && !block.isSolid) {
            // If the player is above the current block, they're not underground
            if (player.location.y >= block.y) return false;
            block = block.below(); // Move to the block directly below
        }

        // If we exit the loop, we found a solid block below the player
        return block.isSolid;
    } catch (e) {
        return false; // Assume not underground if chunks are unloaded
    }
}

/**
 * Gets the adjacent block in a given direction.
 * @param {import("@minecraft/server").Block} block 
 * @param {string} direction - Direction to get neighbor: 'north', 'south', 'east', 'west', 'up', 'down'
 * @returns {import("@minecraft/server").Block | null} The adjacent block or null if not available
 */
export function getNeighbor(block, direction) {
    if (!block) return null;

    switch (direction) {
        case 'north': return block.north();
        case 'south': return block.south();
        case 'east': return block.east();
        case 'west': return block.west();
        case 'up': return block.above();
        case 'down': return block.below();
        default: return null;
    }
}



const REDSTONE_COMPONENTS = ['redstone_wire', 'repeater', 'comparator', 'redstone_torch'];

export function getRedstonePower(block) {
    // Direct power check
    let power = block.getRedstonePower() ?? 0;
    if (power > 0) return power;

    // Check surrounding blocks
    const faces = ['north', 'south', 'east', 'west', 'below', 'above'];
    
    for (const face of faces) {
        const neighbor = block[face](); // e.g. block.north()
        if (!neighbor) continue;
        
        const neighborPower = neighbor.getRedstonePower() ?? 0;
        
        // If neighbor has power, we need to verify if it connects/transmits to us
        if (neighborPower > 0) {
            // Some blocks don't transmit power directly in all directions or are specifically ignored
            const isSpecialComponent = REDSTONE_COMPONENTS.some(c => neighbor.typeId.includes(c));
            
            if (!isSpecialComponent) {
                // Standard block transmitting power
                return neighborPower;
            }
        }

        // Specific check for redstone torches on walls
        if (neighbor.typeId.includes('redstone_torch')) {
            const torchFacing = neighbor.permutation.getState('torch_facing_direction');
            // If torch is NOT facing the opposite of where we are looking (i.e. attached to the block), it might power it
            if (torchFacing !== invertFace[face]) {
                return neighborPower;
            }
        }
    }

    // Daylight detector check (specifically from above)
    const above = block.above();
    if (above?.typeId === 'minecraft:daylight_detector') {
        return above.getRedstonePower() ?? 0;
    }

    return 0;
}

/**
 * Returns a promise that resolves after a specified number of ticks.
 * @param {number} ticks 
 * @returns {Promise<void>}
 */
export function sleep(ticks) {
    return new Promise(resolve => system.runTimeout(resolve, ticks));
}

export const invertFace = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'above': 'below',
    'below': 'above'
};
