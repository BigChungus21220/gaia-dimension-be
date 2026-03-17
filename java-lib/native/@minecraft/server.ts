export const world = {
    getAllPlayers: () => [] as Player[],
    afterEvents: {
        playerSpawn: { subscribe: (fn: any) => {} },
        entityHealthChanged: { subscribe: (fn: any) => {} }
    },
    scoreboard: {
        getObjective: (id: string) => null,
        addObjective: (id: string) => null,
        removeObjective: (id: string) => null,
        getObjectives: () => []
    },
    playSound: (soundId: string, options: { location: Vector3, pitch?: number, volume?: number }) => {},
    getDimension: (id: string) => ({
        getEntities: (options?: any) => [] as Entity[],
        spawnEntity: (typeId: string, location: Vector3) => new Entity()
    }),
    getEntity: (id: string) => new Entity()
};

export const system = {
    run: (fn: any) => fn(),
    runInterval: (fn: any, ticks: number) => 0,
    runTimeout: (fn: any, ticks: number) => 0,
    beforeEvents: {
        startup: { subscribe: (fn: any) => {} }
    }
};

export class Entity {
    public readonly id: string = "mock-id";
    public readonly location: Vector3 = { x: 0, y: 0, z: 0 };
    public readonly typeId: string = "";
    public nameTag: string = "";
    public getDynamicProperty(key: string): any { return null; }
    public setDynamicProperty(key: string, value: any): void {}
    public getComponent(id: string): any { return null; }
    public remove(): void {}
    public teleport(location: Vector3, options?: any): void {}
    public get isValid(): boolean { return true; }
    public clearVelocity(): void {}
    public applyImpulse(vector: Vector3): void {}
    public triggerEvent(eventId: string): void {}
}

export class Player extends Entity {
    public readonly onScreenDisplay = {
        setTitle: (title: string, options?: any) => {}
    };
}

export class Dimension {}
export class BlockPos {}
export interface Vector3 { x: number; y: number; z: number; }
