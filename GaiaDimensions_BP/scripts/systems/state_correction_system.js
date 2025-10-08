import { updateBranchConnections } from "../components/thin_branches";
import { system, world } from "@minecraft/server";

export function initializeStateCorrectionSystem() {

    class EndlessDB {
        prefix = '';
        constructor(prefix) {
            this.prefix = prefix
        }
        getCount(callback) {
            system.run(() => {
                callback(world.getDynamicProperty(this.prefix + "count") ?? 1)
            })
        }
        setCount(value) {
            system.run(() => {
                world.setDynamicProperty(this.prefix + "count", value)
            })
        }
        getAll(callback) {
            this.getCount(count => {
                system.run(() => {
                    if (count === 1) {
                        const prop = world.getDynamicProperty(this.prefix + "part_0");
                        if (prop) {
                            try {
                                callback(JSON.parse(prop));
                            } catch {
                                callback({});
                            }
                        } else {
                            callback({});
                        }
                        return;
                    }

                    let json = '';
                    for (let i = 0; i < count; i++) {
                        json += world.getDynamicProperty(this.prefix + "part_" + i) ?? ""
                    }
                    try {
                        callback(JSON.parse(json === "" ? "{}" : json));
                    } catch {
                        callback({});
                    }
                });
            })
        }
        setAll(object) {
            system.run(() => {
                let json = JSON.stringify(object);
                let i = 0;
                while (json.length !== 0) {
                    world.setDynamicProperty(this.prefix + "part_" + i, json.slice(0, 32767))
                    json = json.slice(32767)
                    i++
                };
                this.setCount(i);
            })
        }
    }

    const DB = new EndlessDB("wc:branch_state_correction_webs:");

    const isPropagationBlock = (block) => {
        if (!block || block.typeId === 'minecraft:air') return false;
        const typeId = block.typeId;
        return typeId.includes("_thin_branches") || typeId.includes("_log");
    };

    DB.getAll(data => {
        if (!data.nextWebId) {
            data.nextWebId = 1;
        }

        let proximity_y_offset = 0;
        const proximityRadius = 5;
        let player_index = 0;

        system.runInterval(() => {
            const players = world.getAllPlayers();
            if (players.length === 0) return;

            player_index = (player_index + 1) % players.length;
            const player = players[player_index];

            try {
                const loc = player.location;
                const dim = player.dimension;
                
                const y = Math.floor(loc.y) + proximity_y_offset;

                for (let dx = -proximityRadius; dx <= proximityRadius; dx++) {
                    for (let dz = -proximityRadius; dz <= proximityRadius; dz++) {
                        const checkLoc = { x: loc.x + dx, y: y, z: loc.z + dz };
                        const checkBlock = dim.getBlock(checkLoc);
                        if (!checkBlock) continue;

                        const locationString = `${checkBlock.x}:${checkBlock.y}:${checkBlock.z}`;
                        if (data[locationString]) continue;

                        if (isPropagationBlock(checkBlock)) {
                            const newWebId = data.nextWebId++;
                            system.run(() => startCorrectionWave(checkBlock, newWebId, data));
                            return; 
                        }
                    }
                }
            } catch (e) {}
            
            proximity_y_offset++;
            if (proximity_y_offset > 50) {
                proximity_y_offset = 0;
            }
        }, 4); 

        system.runInterval(() => {
            DB.setAll(data);
        }, 200);
    });

    function startCorrectionWave(startBlock, webId, data) {
        const queue = [startBlock];
        const locationString = `${startBlock.x}:${startBlock.y}:${startBlock.z}`;
        data[locationString] = webId;

        const maxBlocksInWave = 4096;
        let processedInWave = 0;
        const blocksPerTick = 256;

        system.run(function processQueue() {
            let processedThisTick = 0;
            while (queue.length > 0 && processedThisTick < blocksPerTick) {
                if (processedInWave >= maxBlocksInWave) return;

                const currentBlock = queue.shift();
                processedInWave++;
                processedThisTick++;

                if (currentBlock.typeId.includes("_thin_branches")) {
                    updateBranchConnections(currentBlock);
                }

                const neighbors = getNeighbors(currentBlock);
                for (const neighbor of neighbors) {
                    const neighborLocString = `${neighbor.x}:${neighbor.y}:${neighbor.z}`;
                    if (!data[neighborLocString] && isPropagationBlock(neighbor)) {
                        data[neighborLocString] = webId;
                        queue.push(neighbor);
                    }
                }
            }

            if (queue.length > 0 && processedInWave < maxBlocksInWave) {
                system.run(processQueue);
            }
        });
    }

    function getNeighbors(block) {
        const { x, y, z } = block.location;
        const dim = block.dimension;
        const neighbors = [];
        const locations = [
            { x: x + 1, y, z }, { x: x - 1, y, z },
            { x, y: y + 1, z }, { x, y: y - 1, z },
            { x, y, z: z + 1 }, { x, y, z: z - 1 }
        ];

        for (const loc of locations) {
            try {
                const neighborBlock = dim.getBlock(loc);
                if (neighborBlock) {
                    neighbors.push(neighborBlock);
                }
            } catch (e) {}
        }
        return neighbors;
    }
}
