import { Player } from "@minecraft/server";

export interface BiomeEventData {
    player: Player;
    biome: string;
}

export interface BlockEventData {
    player: Player;
}

class EventHandler<T> {
    private handlers: ((data: T) => void)[] = [];

    subscribe(callback: (data: T) => void): void {
        this.handlers.push(callback);
    }

    trigger(data: T): void {
        for (const handler of this.handlers) {
            try {
                handler(data);
            } catch (e) {
                // Ignore errors in handlers
            }
        }
    }
}

export const playerChangeBiome = new EventHandler<BiomeEventData>();
export const playerChangeBlock = new EventHandler<BlockEventData>();
