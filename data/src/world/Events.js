import { world, system } from "@minecraft/server";

class EventHandler {
    constructor() {
        this.handlers = [];
    }

    subscribe(callback) {
        this.handlers.push(callback);
    }

    trigger(data) {
        for (const handler of this.handlers) {
            try {
                handler(data);
            } catch (e) {
            }
        }
    }
}

export const playerChangeBiome = new EventHandler();
export const playerChangeBlock = new EventHandler();

// Polling system to trigger playerChangeBlock
const lastPlayerPositions = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) {
            lastPlayerPositions.delete(player.id);
            continue;
        }

        const currentPos = {
            x: Math.floor(player.location.x),
            y: Math.floor(player.location.y),
            z: Math.floor(player.location.z),
            dimension: player.dimension.id
        };

        const lastPos = lastPlayerPositions.get(player.id);

        if (!lastPos || 
            lastPos.x !== currentPos.x || 
            lastPos.y !== currentPos.y || 
            lastPos.z !== currentPos.z || 
            lastPos.dimension !== currentPos.dimension) {
            
            playerChangeBlock.trigger({ player: player });
            lastPlayerPositions.set(player.id, currentPos);
        }
    }
}, 5); // Check every 5 ticks (0.25s) for performance
