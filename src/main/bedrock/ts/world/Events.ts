import { world, system, Player } from "@minecraft/server";

export interface BiomeEventData {
    player: Player;
    biome: string;
}

export interface BlockEventData {
    player: Player;
}

class EventHandler<T> {
    private handlers: ((data: T) => void)[] = [];

    constructor() {
        this.handlers = [];
    }

    subscribe(callback: (data: T) => void): void {
        this.handlers.push(callback);
    }

    trigger(data: T): void {
        for (const handler of this.handlers) {
            try {
                handler(data);
            } catch (e) {
            }
        }
    }
}

export const playerChangeBiome = new EventHandler<BiomeEventData>();
export const playerChangeBlock = new EventHandler<BlockEventData>();

// Polling system to trigger playerChangeBlock
interface LastPos {
    x: number;
    y: number;
    z: number;
    dimension: string;
}
const lastPlayerPositions = new Map<string, LastPos>();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) {
            lastPlayerPositions.delete(player.id);
            continue;
        }

        const currentPos: LastPos = {
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
