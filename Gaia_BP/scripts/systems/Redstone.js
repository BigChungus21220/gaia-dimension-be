import { system, world, BlockPermutation } from "@minecraft/server";

//Dear review team, this is my magnum opus
// Maps source IDs to their power info
const redstoneSources = new Map(); 
// Maps block keys to the network ID they belong to
const blockToNetwork = new Map(); 
// Maps network IDs to a Set of block keys in that network
const networkToBlocks = new Map(); 
let nextNetworkId = 0;

export const RedstoneControl = {
    /**
     * Sets redstone power level for a block at a specified location
     * Handles different redstone component types appropriately
     * @param {import("@minecraft/server").Vector3} location - The world location of the block
     * @param {number|boolean} power - Power level (0-15) for dust; boolean for repeaters/doors
     * @param {string} sourceId - Unique identifier for the power source
     * @returns {boolean} True if the operation was successful
     */
    setRedstonePower(location, power, sourceId) {
        if (!sourceId) {
            console.error("Redstone source ID is required");
            return false;
        }
        
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock(location);
        
        if (!block) return false;

        try {
            if (!this.isRedstoneConductor(block)) {
                if (power > 0) {
                    redstoneSources.set(sourceId, {
                        location: block.location,
                        power: power,
                        type: "generic_source"
                    });
                } else {
                    this.updateAdjacentComponents(block, false);
                    redstoneSources.delete(sourceId);
                }
                this.recalculateAllNetworks();
                return true;
            }

            const blockId = block.typeId;
            
            if (blockId === "minecraft:redstone_wire") {
                return this.setRedstoneDustSignal(block, power, sourceId);
            } else if (blockId.includes("repeater")) {
                return this.setRepeaterPowered(block, power > 0);
            } else if (blockId.includes("piston")) {
                if (power > 0) {
                    return this.PistonController.extend(block);
                } else {
                    return this.PistonController.retract(block);
                }
            }
            
            return false;
        } catch (e) {
            console.error(`Error setting redstone power: ${e}`);
            return false;
        }
    },

    /**
     * Checks adjacent blocks for doors and opens them when redstone is powered
     * @param {import("@minecraft/server").Block} redstoneBlock - The redstone block that is powered
     * @param {boolean} powered - Whether the redstone is powered or unpowered
     */
    updateAdjacentComponents(redstoneBlock, powered) {
        if (!redstoneBlock) return;
        
        const dimension = redstoneBlock.dimension;
        const { x, y, z } = redstoneBlock.location;
        
        // Check all adjacent blocks for doors
        const adjacentPositions = [
            { x: x + 1, y, z },
            { x: x - 1, y, z },
            { x, y, z: z + 1 },
            { x, y, z: z - 1 },
            { x, y: y + 1, z },
            { x, y: y - 1, z }
        ];
        
        for (const pos of adjacentPositions) {
            const adjacentBlock = dimension.getBlock(pos);
            if (adjacentBlock && !adjacentBlock.isAir) {
                if (adjacentBlock.typeId.includes("piston")) {
                    console.log(`Found piston at ${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`);
                    if (powered) {
                        this.PistonController.extend(adjacentBlock);
                    } else {
                        this.PistonController.retract(adjacentBlock);
                    }
                }
                // Handle custom doors
                else if (adjacentBlock.typeId.includes("gaiadimension:") && adjacentBlock.typeId.includes("curtain")) {
                    const perm = adjacentBlock.permutation;
                    if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== powered) {
                        adjacentBlock.setPermutation(perm.withState("gaiadimension:open", powered));
                    }
                    
                    // Special handling for custom doors - update both upper and lower halves
                    if (adjacentBlock.typeId.includes("curtain")) {
                        // If this is the lower half of a door, also update the upper half
                        if (adjacentBlock.typeId.includes("_lower")) {
                            const upperBlock = adjacentBlock.above();
                            if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                                const upperPerm = upperBlock.permutation;
                                if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== powered) {
                                    upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", powered));
                                }
                            }
                        }
                        // If this is the upper half of a door, also update the lower half
                        else if (adjacentBlock.typeId.includes("_upper")) {
                            const lowerBlock = adjacentBlock.below();
                            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                                const lowerPerm = lowerBlock.permutation;
                                if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== powered) {
                                    lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", powered));
                                }
                            }
                        }
                    }
                }
                // Handle vanilla doors
                else if (adjacentBlock.typeId.startsWith("minecraft:") && (adjacentBlock.typeId.includes("door") && !adjacentBlock.typeId.includes("trapdoor"))) {
                    let doorBlock = adjacentBlock;
                    const permutation = doorBlock.permutation;

                    // Check if this is the upper half of a door
                    if (permutation.getState("upper_block_bit")) {
                        const lowerHalf = doorBlock.below();
                        if (lowerHalf && lowerHalf.typeId === doorBlock.typeId) {
                            doorBlock = lowerHalf;
                        } else {
                            return;
                        }
                    }

                    let perm = doorBlock.permutation;
                    if (perm.getState("open_bit") !== undefined && perm.getState("open_bit") !== powered) {
                        doorBlock.setPermutation(perm.withState("open_bit", powered));
                    }
                }
                // Handle trapdoors and fence gates separately
                else if (adjacentBlock.typeId.startsWith("minecraft:") && 
                         (adjacentBlock.typeId.includes("trapdoor") ||
                          adjacentBlock.typeId.includes("fence_gate"))) {
                    let perm = adjacentBlock.permutation;
                    if (perm.getState("open_bit") !== undefined && perm.getState("open_bit") !== powered) {
                        adjacentBlock.setPermutation(perm.withState("open_bit", powered));
                    }
                }
            }
        }
    },

    /**
     * Removes redstone power from a source, triggering network recalculation
     * @param {string} sourceId - Unique identifier for the power source
     * @returns {boolean} True if the operation was successful
     */
    removeRedstonePower(sourceId) {
        if (!redstoneSources.has(sourceId)) {
            return false;
        }
        
        redstoneSources.delete(sourceId);
        this.recalculateAllNetworks();
        return true;
    },

    /**
     * Gets the redstone power level for a block at a specified location
     * @param {import("@minecraft/server").Vector3} location - The world location of the block
     * @returns {number} The power level (0-15) or -1 if not found
     */
    getRedstonePower(location) {
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock(location);
        
        if (!block) return -1;

        try {
            const blockId = block.typeId;
            
            if (blockId === "minecraft:redstone_wire") {
                return this.getRedstoneDustSignal(block);
            } else if (blockId.includes("repeater")) {
                return this.getRepeaterSignal(block);
            } else if (blockId.includes("piston")) {
                const pistonKey = this.getBlockKey(block.location);
                return this.PistonController.poweredPistons.has(pistonKey) ? 15 : 0;
            }
            
            return 0;
        } catch (e) {
            console.error(`Error getting redstone power: ${e}`);
            return 0;
        }
    },

    /**
     * Sets power level for redstone dust with proper propagation
     * @param {import("@minecraft/server").Block} block - The redstone dust block
     * @param {number} power - Power level (0-15)
     * @param {string} sourceId - Unique identifier for the power source
     */
    setRedstoneDustSignal(block, power, sourceId) {
        if (block.typeId !== "minecraft:redstone_wire") return false;
        
        power = Math.max(0, Math.min(15, Math.round(power)));
        
        redstoneSources.set(sourceId, {
            location: block.location,
            power: power,
            type: "redstone_dust"
        });
        
        // Update adjacent doors when redstone power changes
        this.updateAdjacentComponents(block, power > 0);
        
        this.recalculateAllNetworks();
        return true;
    },
   /**
 * Recalculates all redstone networks based on current sources.
 */
recalculateAllNetworks() {
    system.run(() => {
        const dimension = world.getDimension("overworld");
        const powerMap = new Map();
        const queue = [];

        // Get a list of all blocks that were part of any network before this update.
        const allPreviouslyKnownBlocks = new Set();
        for (const blockSet of networkToBlocks.values()) {
            for (const blockKey of blockSet) {
                allPreviouslyKnownBlocks.add(blockKey);
            }
        }

        // Rebuild the network map from scratch.
        this.buildNetworkMap();

        // Initialize powerMap and queue from all sources
        for (const source of redstoneSources.values()) {
            if (source.type === "generic_source") {
                // Power adjacent blocks in a 3x3x3 cube
                for (let x = -1; x <= 1; x++) {
                    for (let y = -1; y <= 1; y++) {
                        for (let z = -1; z <= 1; z++) {
                            const adjacentLocation = { x: source.location.x + x, y: source.location.y + y, z: source.location.z + z };
                            const adjacentBlock = dimension.getBlock(adjacentLocation);
                            if (adjacentBlock && adjacentBlock.typeId === 'minecraft:redstone_wire') {
                                const adjacentKey = this.getBlockKey(adjacentLocation);
                                if (source.power > (powerMap.get(adjacentKey) || 0)) {
                                    powerMap.set(adjacentKey, source.power);
                                    queue.push({ location: adjacentLocation, power: source.power });
                                }
                            }
                        }
                    }
                }
            } else if (source.type === "redstone_dust") {
                const sourceKey = this.getBlockKey(source.location);
                if (source.power > (powerMap.get(sourceKey) || 0)) {
                    powerMap.set(sourceKey, source.power);
                    queue.push({ location: source.location, power: source.power });
                }
            }
        }

        // Propagate power using BFS
        let head = 0;
        while (head < queue.length) {
            const { location, power } = queue[head++];
            if (power > 1) {
                this.getValidRedstoneConnections(location, dimension).forEach(neighborLocation => {
                    const neighborKey = this.getBlockKey(neighborLocation);
                    const neighborBlock = dimension.getBlock(neighborLocation);
                    if (neighborBlock && neighborBlock.typeId === 'minecraft:redstone_wire') {
                        const newPower = power - 1;
                        if (newPower > (powerMap.get(neighborKey) || 0)) {
                            powerMap.set(neighborKey, newPower);
                            queue.push({ location: neighborLocation, power: newPower });
                        }
                    }
                });
            }
        }

        // Create a final list of all blocks that need an update.
        const allBlocksToUpdate = new Set(allPreviouslyKnownBlocks);
        powerMap.forEach((_, key) => allBlocksToUpdate.add(key));

        // Apply changes to all affected blocks.
        for (const blockKey of allBlocksToUpdate) {
            const location = this.keyToLocation(blockKey);
            const block = dimension.getBlock(location);

            if (block && block.typeId === 'minecraft:redstone_wire') {
                const newPower = powerMap.get(blockKey) || 0;
                const currentPower = block.permutation.getState("redstone_signal") || 0;

                if (newPower !== currentPower) {
                    block.setPermutation(block.permutation.withState("redstone_signal", newPower));
                }
                this.updateAdjacentComponents(block, newPower > 0);
            }

            // NEW PISTON LOGIC
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const checkPos = { x: location.x + dx, y: location.y + dy, z: location.z + dz };
                        const checkBlock = dimension.getBlock(checkPos);

                        if (checkBlock && checkBlock.typeId.includes("piston")) {
                            const blockBelow = checkBlock.below();
                            if (blockBelow && !this.isRedstoneConductor(blockBelow)) {
                                const newPower = powerMap.get(blockKey) || 0;
                                if (newPower > 0) {
                                    this.PistonController.extend(checkBlock);
                                } else {
                                    this.PistonController.retract(checkBlock);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Handle components adjacent to generic sources
        for (const source of redstoneSources.values()) {
            if (source.type === "generic_source") {
                this.updateAdjacentComponents(dimension.getBlock(source.location), source.power > 0);
            }
        }
    });
},

    /**
     * Scans the world to build a map of all connected redstone dust networks.
     */
    buildNetworkMap() {
        blockToNetwork.clear();
        networkToBlocks.clear();
        nextNetworkId = 0;
        const dimension = world.getDimension("overworld");

        for (const source of redstoneSources.values()) {
            const startKey = this.getBlockKey(source.location);
            if (!blockToNetwork.has(startKey)) {
                const networkId = nextNetworkId++;
                const newNetwork = new Set();
                const queue = [source.location];
                const visited = new Set([startKey]);

                while (queue.length > 0) {
                    const currentLocation = queue.shift();
                    const currentKey = this.getBlockKey(currentLocation);
                    blockToNetwork.set(currentKey, networkId);
                    newNetwork.add(currentKey);
                    this.getValidRedstoneConnections(currentLocation, dimension).forEach(neighborLocation => {
                     const neighborKey = this.getBlockKey(neighborLocation);
                        if (!visited.has(neighborKey)) {
                            const neighborBlock = dimension.getBlock(neighborLocation);
                            if (neighborBlock && neighborBlock.typeId === 'minecraft:redstone_wire') {
                                visited.add(neighborKey);
                                queue.push(neighborLocation);
                            }
                        }
                    });
                }
                networkToBlocks.set(networkId, newNetwork);
            }
        }
    },
     /**
     * Gets an array of validly connected redstone wire neighbors.
     * This checks for flat, vertical (towers), and slope connections.
     * @param {import("@minecraft/server").Vector3} location The location of the starting block.
     * @param {import("@minecraft/server").Dimension} dimension The dimension the block is in.
     * @returns {import("@minecraft/server").Vector3[]}
     */
    getValidRedstoneConnections(location, dimension) {
        const { x, y, z } = location;
        const connections = [];

        // Check the full 3x3x3 cube around the block
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;

                    const neighborLoc = { x: x + dx, y: y + dy, z: z + dz };
                    const neighborBlock = dimension.getBlock(neighborLoc);

                    // We only care if the destination is actually redstone wire
                    if (!neighborBlock || neighborBlock.typeId !== 'minecraft:redstone_wire') {
                        continue;
                    }

                    // Now, validate the connection based on its type (flat, up, or down)
                    if (dy === 0) {
                        // Flat connections are always valid
                        connections.push(neighborLoc);
                    } else if (dy === 1) { // Connection is 1 block UP
                        // A straight-up tower connection is valid
                        if (dx === 0 && dz === 0) {
                            connections.push(neighborLoc);
                            continue;
                        }
                        // A diagonal-up connection (a slope) is valid only if
                        // there is a solid block for the wire to climb on.
                        // We use !isAir as a proxy for a solid block.
                        const stepBlock = dimension.getBlock({ x: x + dx, y: y, z: z + dz });
                        if (stepBlock && !stepBlock.isAir) {
                            connections.push(neighborLoc);
                        }
                    } else if (dy === -1) { // Connection is 1 block DOWN
                        // A straight-down tower connection is valid
                        if (dx === 0 && dz === 0) {
                            connections.push(neighborLoc);
                            continue;
                        }
                        // A diagonal-down connection is valid only if the block
                        // above the destination wire is air (allowing the signal to drop down).
                        const blockAboveNeighbor = dimension.getBlock({ x: x + dx, y: y, z: z + dz });
                        if (blockAboveNeighbor && blockAboveNeighbor.isAir) {
                            connections.push(neighborLoc);
                        }
                    }
                }
            }
        }
        return connections;
    },
    /**
     * Gets power level for redstone dust
     * @param {import("@minecraft/server").Block} block - The redstone dust block
     * @returns {number} Power level (0-15)
     */
    getRedstoneDustSignal(block) {
        if (block.typeId !== "minecraft:redstone_wire") return 0;
        return block.permutation.getState("redstone_signal") || 0;
    },

    /**
     * Powers/unpowers a repeater
     * @param {import("@minecraft/server").Block} block - The repeater block
     * @param {boolean} powered - Whether the repeater should be powered
     */
    setRepeaterPowered(block, powered) {
        if (!block.typeId.includes("repeater")) return false;
        
        const isCurrentlyPowered = block.typeId.includes("powered");
        if (powered === isCurrentlyPowered) return true; // No change needed

        const newTypeId = powered ? "minecraft:powered_repeater" : "minecraft:unpowered_repeater";
        
        try {
            const newPermutation = BlockPermutation.resolve(newTypeId, block.permutation.getAllStates());
            block.setPermutation(newPermutation);
            
            // Update adjacent doors when repeater power changes
            this.updateAdjacentComponents(block, powered);
            
            return true;
        } catch(e) {
            console.error(`Failed to set repeater state: ${e}`);
            return false;
        }
    },

    /**
     * Gets repeater power state
     * @param {import("@minecraft/server").Block} block - The repeater block
     * @returns {number} Power level (0 or 15)
     */
    getRepeaterSignal(block) {
        return block.typeId === "minecraft:powered_repeater" ? 15 : 0;
    },

    /**
     * Gets neighboring locations for a given block location.
     * @param {import("@minecraft/server").Vector3} location
     * @returns {import("@minecraft/server").Vector3[]}
     */
    getNeighbors(location) {
        const { x, y, z } = location;
        return [
            { x: x + 1, y, z }, { x: x - 1, y, z },
            { x, y: y + 1, z }, { x, y: y - 1, z },
            { x, y, z: z + 1 }, { x, y, z: z - 1 }
        ];
    },

    /**
     * Generates a unique key for a block location
     * @param {import("@minecraft/server").Vector3} location - The block location
     * @returns {string} Unique key for the location
     */
    getBlockKey(location) {
        return `${location.x},${location.y},${location.z}`;
    },

    /**
     * Collects all doors adjacent to a redstone block
     * @param {import("@minecraft/server").Block} redstoneBlock - The redstone block
     * @param {Set} doorsToOpen - Set to store door keys that should be open
     */
    collectAdjacentDoors(redstoneBlock, doorsToOpen) {
        if (!redstoneBlock) return;
        
        const dimension = redstoneBlock.dimension;
        const { x, y, z } = redstoneBlock.location;
        
        // Check all adjacent blocks for doors
        const adjacentPositions = [
            { x: x + 1, y, z },
            { x: x - 1, y, z },
            { x, y, z: z + 1 },
            { x, y, z: z - 1 },
            { x, y: y + 1, z },
            { x, y: y - 1, z }
        ];
        
        for (const pos of adjacentPositions) {
            const adjacentBlock = dimension.getBlock(pos);
            if (adjacentBlock && !adjacentBlock.isAir) {
                // Handle custom doors (gaiadimension: namespace)
                if (adjacentBlock.typeId.includes("gaiadimension:") && adjacentBlock.typeId.includes("curtain")) {
                    const doorKey = `${dimension.id},${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`;
                    doorsToOpen.add(doorKey);
                }
                // Handle vanilla doors
                else if (adjacentBlock.typeId.startsWith("minecraft:") && 
                         (adjacentBlock.typeId.includes("door") || 
                          adjacentBlock.typeId.includes("trapdoor") ||
                          adjacentBlock.typeId.includes("fence_gate"))) {
                    const doorKey = `${dimension.id},${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`;
                    doorsToOpen.add(doorKey);
                }
            }
        }
    },

    /**
     * Updates doors based on redstone power state
     * @param {Set} doorsToOpen - Set of door keys that should be open
     */
    updateDoorsBasedOnPower(doorsToOpen) {
        // This would need to be implemented to track door states
        // For now, we'll just open the doors that are powered
        for (const doorKey of doorsToOpen) {
            try {
                const [dimensionId, x, y, z] = doorKey.split(',').map((part, index) => index === 0 ? part : Number(part));
                const dimension = world.getDimension(dimensionId);
                const doorBlock = dimension.getBlock({ x, y, z });
                
                if (doorBlock && !doorBlock.isAir) {
                    // Handle custom doors
                    if (doorBlock.typeId.includes("gaiadimension:") && doorBlock.typeId.includes("curtain")) {
                        const perm = doorBlock.permutation;
                        if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== true) {
                            doorBlock.setPermutation(perm.withState("gaiadimension:open", true));
                        }
                        
                        // Special handling for custom doors - update both upper and lower halves
                        if (doorBlock.typeId.includes("curtain")) {
                            // If this is the lower half of a door, also update the upper half
                            if (doorBlock.typeId.includes("_lower")) {
                                const upperBlock = doorBlock.above();
                                if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                                    const upperPerm = upperBlock.permutation;
                                    if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== true) {
                                        upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", true));
                                    }
                                }
                            }
                            // If this is the upper half of a door, also update the lower half
                            else if (doorBlock.typeId.includes("_upper")) {
                                const lowerBlock = doorBlock.below();
                                if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                                    const lowerPerm = lowerBlock.permutation;
                                    if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== true) {
                                        lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", true));
                                    }
                                }
                            }
                        }
                    }
                    // Handle vanilla doors
                    else if (doorBlock.typeId.startsWith("minecraft:") && 
                             (doorBlock.typeId.includes("curtain") || 
                              doorBlock.typeId.includes("trapdoor") ||
                              doorBlock.typeId.includes("fence_gate"))) {
                        let perm = doorBlock.permutation;
                        if (perm.getState("open_bit") !== undefined && perm.getState("open_bit") !== true) {
                            doorBlock.setPermutation(perm.withState("open_bit", true));
                        }
                        // Also check for generic "open" state
                        else if (perm.getState("open") !== undefined && perm.getState("open") !== true) {
                            doorBlock.setPermutation(perm.withState("open", true));
                        }
                    }
                }
            } catch (e) {
                console.error(`Error updating door: ${e}`);
            }
        }
    },

    /**
     * Traces the redstone network to find custom doors without modifying anything
     * @param {import("@minecraft/server").Block} sourceBlock - The block that initiated the signal
     * @param {number} maxDepth - Maximum depth to trace (default: 15)
     * @returns {Array} Array of door locations found in the network
     */
    traceNetworkForDoors(sourceBlock, maxDepth = 15) {
        if (!sourceBlock) return [];
        
        const foundDoors = [];
        const visited = new Set();
        const queue = [{ block: sourceBlock, depth: 0 }];
        const dimension = sourceBlock.dimension;
        
        while (queue.length > 0 && queue[0].depth <= maxDepth) {
            const { block, depth } = queue.shift();
            const blockKey = this.getBlockKey(block.location);
            
            // Skip if we've already visited this block
            if (visited.has(blockKey)) continue;
            visited.add(blockKey);
            
            // Check adjacent blocks for custom doors
            const neighbors = this.getNeighbors(block.location);
            for (const neighborLoc of neighbors) {
                const neighborBlock = dimension.getBlock(neighborLoc);
                if (neighborBlock && !neighborBlock.isAir) {
                    // Check if this block is a custom door
                    if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
                        // Check if we've already found this door
                        const doorExists = foundDoors.some(door => 
                            door.location.x === neighborLoc.x && 
                            door.location.y === neighborLoc.y && 
                            door.location.z === neighborLoc.z
                        );
                        
                        if (!doorExists) {
                            // Exception: If the source block is a lever and it's within 3x3 area of the door,
                            // ignore this door since levers don't produce consistent redstone signals
                            if (sourceBlock.typeId.startsWith("minecraft:") && sourceBlock.typeId.includes("lever")) {
                                const dx = Math.abs(sourceBlock.location.x - neighborLoc.x);
                                const dy = Math.abs(sourceBlock.location.y - neighborLoc.y);
                                const dz = Math.abs(sourceBlock.location.z - neighborLoc.z);
                                
                                // If lever is within 3x3x3 area around the door, skip this door
                                if (dx <= 1 && dy <= 1 && dz <= 1) {
                                    continue;
                                }
                            }
                            
                            foundDoors.push({
                                block: neighborBlock,
                                location: neighborLoc,
                                dimension: dimension
                            });
                        }
                    }
                }
            }
            
            // Continue tracing if we haven't reached maximum depth
            if (depth < maxDepth) {
                // Check connected redstone components
                const redstoneNeighbors = this.getNeighbors(block.location);
                for (const neighborLoc of redstoneNeighbors) {
                    const neighborBlock = dimension.getBlock(neighborLoc);
                    if (neighborBlock && !neighborBlock.isAir) {
                        // Check if it's a redstone component that can conduct signals
                        if (this.isRedstoneConductor(neighborBlock)) {
                            const neighborKey = this.getBlockKey(neighborLoc);
                            if (!visited.has(neighborKey)) {
                                queue.push({ block: neighborBlock, depth: depth + 1 });
                            }
                        }
                    }
                }
            }
        }
        
        return foundDoors;
    },

    /**
     * Checks if a block can conduct redstone signals
     * @param {import("@minecraft/server").Block} block 
     * @returns {boolean}
     */
    isRedstoneConductor(block) {
        if (!block) return false;
        
        const typeId = block.typeId;
        // Redstone dust conducts signals
        if (typeId === "minecraft:redstone_wire") return true;
        // Repeaters conduct signals
        if (typeId.includes("repeater")) return true;
        // Redstone torches conduct signals
        if (typeId.includes("redstone_torch")) return true;
        // Redstone blocks conduct signals
        if (typeId === "minecraft:redstone_block") return true;
        // Pistons can conduct signals
        if (typeId.includes("piston")) return true;
        // Note blocks can conduct signals
        if (typeId === "minecraft:noteblock") return true;
        // Comparator can conduct signals
        if (typeId.includes("comparator")) return true;
        
        return false;
    },

    // Door tracking system
    doorTrackers: new Map(), // Maps door keys to tracker info
    
    /**
     * Adds a door to be tracked for signal timeout
     * @param {import("@minecraft/server").Block} doorBlock - The door block to track
     * @param {import("@minecraft/server").Block} sourceBlock - The source block that triggered the signal
     */
    trackDoor(doorBlock, sourceBlock) {
        if (!doorBlock || !sourceBlock) return;
        
        // For double doors, we always track the lower half as the primary door
        let primaryDoorBlock = doorBlock;
        if (doorBlock.typeId.includes("curtain") && doorBlock.typeId.includes("_upper")) {
            const lowerBlock = doorBlock.below();
            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                primaryDoorBlock = lowerBlock;
            }
        }
        
        const doorKey = `${primaryDoorBlock.dimension.id},${primaryDoorBlock.location.x},${primaryDoorBlock.location.y},${primaryDoorBlock.location.z}`;
        const sourceKey = this.getBlockKey(sourceBlock.location);
        
        // Create or update tracker
        let tracker = this.doorTrackers.get(doorKey);
        if (!tracker) {
            tracker = {
                doorBlock: primaryDoorBlock, // Always track the primary (lower) door block
                sourceKeys: new Set([sourceKey]),
                lastSignalTick: system.currentTick,
                checkInterval: null
            };
            this.doorTrackers.set(doorKey, tracker);
        } else {
            // Add source to existing tracker
            tracker.sourceKeys.add(sourceKey);
            tracker.lastSignalTick = system.currentTick;
        }
        
        // Start checking interval if not already running
        if (!tracker.checkInterval) {
            tracker.checkInterval = system.runInterval(() => {
                this.checkDoorTracker(doorKey);
            }, 10); // Check every 10 ticks
        }
    },

    /**
     * Checks a door tracker and handles redstone power logic
     * @param {string} doorKey - The key of the door to check
     */
    checkDoorTracker(doorKey) {
        const tracker = this.doorTrackers.get(doorKey);
        if (!tracker) return;
        
        // Check if the door block still exists
        if (!tracker.doorBlock.isValid) {
            if (tracker.checkInterval) {
                system.clearRun(tracker.checkInterval);
            }
            this.doorTrackers.delete(doorKey);
            return;
        }
        
        // Check a 3x3 area around the door for redstone power
        let hasActiveSignal = false;
        const { x, y, z } = tracker.doorBlock.location;
        const dimension = tracker.doorBlock.dimension;
        
        // Check all blocks in a 3x3 area around the door for redstone power
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    // Skip the door block itself
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    
                    const checkPos = { x: x + dx, y: y + dy, z: z + dz };
                    
                    try {
                        const checkBlock = dimension.getBlock(checkPos);
                        
                        // Special case: Check if the block is a pressure plate
                        if (checkBlock && (checkBlock.typeId.includes("pressure_plate") || checkBlock.typeId.includes("pressureplate"))) {
                            // Check if the pressure plate is pressed/active
                            const isPressed = checkBlock.permutation.getState("gaiadimension:pressed") === true || 
                                              checkBlock.permutation.getState("minecraft:pressed") === true;
                            if (isPressed) {
                                hasActiveSignal = true;
                                break;
                            }
                        }
                        
                        // Regular redstone power check
                        const redstonePower = this.getRedstonePower(checkPos);
                        if (redstonePower !== undefined && redstonePower > 0) {
                            hasActiveSignal = true;
                            break;
                        }
                    } catch (e) {
                        // Ignore errors when checking power
                    }
                }
                
                // Break outer loops if we found an active signal
                if (hasActiveSignal) break;
            }
            
            // Break outer loops if we found an active signal
            if (hasActiveSignal) break;
        }
        
        // If no active signal, close the door
        if (!hasActiveSignal) {
            try {
                const lowerDoorBlock = tracker.doorBlock;
                const upperDoorBlock = lowerDoorBlock.above();
                
                // Close both halves of double doors together
                let anyDoorClosed = false;
                
                // Check if this is a double door (lower half)
                if (lowerDoorBlock.typeId.includes("_lower")) {
                    const perm = lowerDoorBlock.permutation;
                    const isOpen = perm.getState("gaiadimension:open") || false;
                    
                    if (isOpen) {
                        lowerDoorBlock.setPermutation(perm.withState("gaiadimension:open", false));
                        anyDoorClosed = true;
                    }
                    
                    // Also close upper half if it exists
                    if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
                        const upperPerm = upperDoorBlock.permutation;
                        const upperIsOpen = upperPerm.getState("gaiadimension:open") || false;
                        
                        if (upperIsOpen) {
                            upperDoorBlock.setPermutation(upperPerm.withState("gaiadimension:open", false));
                            // Don't play sound again if we already played it for lower door
                            if (!anyDoorClosed) {
                                anyDoorClosed = true;
                            }
                        }
                    }
                } 
                // Single door or upper half
                else {
                    const perm = lowerDoorBlock.permutation;
                    const isOpen = perm.getState("gaiadimension:open") || false;
                    
                    if (isOpen) {
                        lowerDoorBlock.setPermutation(perm.withState("gaiadimension:open", false));
                        anyDoorClosed = true;
                    }
                }
                
                // Play close sound if any door was closed
                if (anyDoorClosed) {
                    lowerDoorBlock.dimension.playSound("close.wooden_trapdoor", lowerDoorBlock.location, { volume: 1, pitch: 1 });
                }
            } catch (e) {
                console.warn("Error closing door:", e);
            }
            
            // Remove tracker
            if (tracker.checkInterval) {
                system.clearRun(tracker.checkInterval);
            }
            this.doorTrackers.delete(doorKey);
        }
    },

    /**
     * Updates a door tracker with a new signal
     * @param {import("@minecraft/server").Block} doorBlock - The door block that received signal
     * @param {import("@minecraft/server").Block} sourceBlock - The source block that sent the signal
     */
    updateDoorTracker(doorBlock, sourceBlock) {
        if (!doorBlock || !sourceBlock) return;
        
        const doorKey = `${doorBlock.dimension.id},${doorBlock.location.x},${doorBlock.location.y},${doorBlock.location.z}`;
        const tracker = this.doorTrackers.get(doorKey);
        
        if (tracker) {
            // Update last signal time
            tracker.lastSignalTick = system.currentTick;
            
            // Add source key if not already present
            const sourceKey = this.getBlockKey(sourceBlock.location);
            tracker.sourceKeys.add(sourceKey);
        } else {
            // Create new tracker
            this.trackDoor(doorBlock, sourceBlock);
        }
    },

    /**
     * Opens a custom door and starts tracking it
     * @param {import("@minecraft/server").Block} doorBlock - The door to open
     * @param {import("@minecraft/server").Block} sourceBlock - The source that triggered the opening
     */
    openAndTrackDoor(doorBlock, sourceBlock) {
        if (!doorBlock || !sourceBlock) return;
        
        try {
            // Handle double doors properly - treat both halves as a single unit
            let lowerDoorBlock = null;
            let upperDoorBlock = null;
            
            // Determine which blocks are the lower and upper halves
            if (doorBlock.typeId.includes("curtain")) {
                if (doorBlock.typeId.includes("_lower")) {
                    lowerDoorBlock = doorBlock;
                    const upperBlock = doorBlock.above();
                    if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                        upperDoorBlock = upperBlock;
                    }
                } else if (doorBlock.typeId.includes("_upper")) {
                    upperDoorBlock = doorBlock;
                    const lowerBlock = doorBlock.below();
                    if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                        lowerDoorBlock = lowerBlock;
                    }
                }
            }
            
            // If we have a double door, use the lower half as the primary tracking key
            const primaryDoorBlock = lowerDoorBlock || doorBlock;
            const doorKey = `${primaryDoorBlock.dimension.id},${primaryDoorBlock.location.x},${primaryDoorBlock.location.y},${primaryDoorBlock.location.z}`;
            
            // Open both halves if they exist
            const blocksToOpen = [];
            if (lowerDoorBlock) blocksToOpen.push(lowerDoorBlock);
            if (upperDoorBlock) blocksToOpen.push(upperDoorBlock);
            if (!lowerDoorBlock && !upperDoorBlock) blocksToOpen.push(doorBlock);
            
            let anyDoorOpened = false;
            
            for (const block of blocksToOpen) {
                const perm = block.permutation;
                const isOpen = perm.getState("gaiadimension:open") || false;
                
                // Only open if not already open
                if (!isOpen) {
                    block.setPermutation(perm.withState("gaiadimension:open", true));
                    // Play open sound (only once for the pair)
                    if (!anyDoorOpened) {
                        block.dimension.playSound("open.wooden_trapdoor", block.location, { volume: 1, pitch: 1 });
                        anyDoorOpened = true;
                    }
                }
            }
            
            // Start tracking the primary door (lower half or single door)
            this.trackDoor(primaryDoorBlock, sourceBlock);
            
        } catch (e) {
            console.warn("Error opening and tracking door:", e);
        }
    },

    /**
     * Converts a block key string back to a location object.
     * @param {string} key
     * @returns {import("@minecraft/server").Vector3}
     */
    keyToLocation(key) {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
    },

    PistonController: new (class {
        constructor() {
            this.poweredPistons = new Map();
        }

        extend(pistonBlock) {
            if (!pistonBlock || !pistonBlock.typeId.includes("piston")) {
                return false;
            }

            const pistonKey = RedstoneControl.getBlockKey(pistonBlock.location);
            let pistonInfo = this.poweredPistons.get(pistonKey);

            if (pistonInfo) {
                pistonInfo.refCount++;
                return true;
            }
            
            const facing = pistonBlock.permutation.getState("minecraft:facing_direction");
            let powerLocation;
            switch (facing) {
                case 0: powerLocation = pistonBlock.above().location; break;
                case 1: powerLocation = pistonBlock.below().location; break;
                case 2: powerLocation = pistonBlock.south().location; break;
                case 3: powerLocation = pistonBlock.north().location; break;
                case 4: powerLocation = pistonBlock.east().location; break;
                case 5: powerLocation = pistonBlock.west().location; break;
                default: return false;
            }
            
            try {
                const dimension = pistonBlock.dimension;
                const originalBlock = dimension.getBlock(powerLocation);
                const originalPermutation = originalBlock.permutation;

                dimension.getBlock(powerLocation).setType("minecraft:redstone_block");

                this.poweredPistons.set(pistonKey, {
                    refCount: 1,
                    powerLocation: powerLocation,
                    originalPermutation: originalPermutation
                });

                return true;
            } catch (e) {
                console.error(`Failed to extend piston: ${e}`);
                return false;
            }
        }

        retract(pistonBlock) {
            if (!pistonBlock || !pistonBlock.typeId.includes("piston")) {
                return false;
            }

            const pistonKey = RedstoneControl.getBlockKey(pistonBlock.location);
            let pistonInfo = this.poweredPistons.get(pistonKey);

            if (!pistonInfo) {
                return true;
            }

            pistonInfo.refCount--;

            if (pistonInfo.refCount > 0) {
                return true;
            }

            try {
                const dimension = pistonBlock.dimension;
                dimension.getBlock(pistonInfo.powerLocation).setPermutation(pistonInfo.originalPermutation);
                this.poweredPistons.delete(pistonKey);
                return true;
            } catch (e) {
                console.error(`Failed to retract piston: ${e}`);
                return false;
            }
        }
    })()
};
   
