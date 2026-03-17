import { world, system, PlayerPlaceBlockAfterEvent, PlayerBreakBlockBeforeEvent, PlayerBreakBlockAfterEvent, PlayerInteractWithBlockBeforeEvent, PlayerSpawnAfterEvent, PlayerJoinAfterEvent, Block } from "@minecraft/server";

export interface PlaceHandler {
    check: (block: Block) => boolean;
    execute: (event: PlayerPlaceBlockAfterEvent) => void;
}

export interface BreakHandler {
    event: "before" | "after";
    check: (block: any) => boolean; // any because it can be Block (before) or PlayerBreakBlockAfterEvent (after)
    execute: (event: any) => void;
}

export interface InteractHandler {
    check: (block: Block) => boolean;
    execute: (event: PlayerInteractWithBlockBeforeEvent) => void;
}

export type PlayerSpawnHandler = (event: PlayerSpawnAfterEvent) => void;
export type PlayerJoinHandler = (event: PlayerJoinAfterEvent) => void;

const placeHandlers: PlaceHandler[] = [];
const breakBeforeHandlers: BreakHandler[] = [];
const breakAfterHandlers: BreakHandler[] = [];
const interactHandlers: InteractHandler[] = [];
const spawnHandlers: PlayerSpawnHandler[] = [];
const joinHandlers: PlayerJoinHandler[] = [];

export function registerPlaceHandler(handler: PlaceHandler): void {
    placeHandlers.push(handler);
}

export function registerBreakHandler(handler: BreakHandler): void {
    if (handler.event === "before") {
        breakBeforeHandlers.push(handler);
    } else {
        breakAfterHandlers.push(handler);
    }
}

export function registerInteractHandler(handler: InteractHandler): void {
    interactHandlers.push(handler);
}

export function registerPlayerSpawnHandler(handler: PlayerSpawnHandler): void {
    spawnHandlers.push(handler);
}

export function registerPlayerJoinHandler(handler: PlayerJoinHandler): void {
    joinHandlers.push(handler);
}

export function initializeEventManager(): void {
    world.afterEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockAfterEvent) => {
        system.run(() => {
            for (const handler of placeHandlers) {
                if (handler.check(event.block)) {
                    handler.execute(event);
                }
            }
        });
    });

    world.beforeEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockBeforeEvent) => {
        for (const handler of breakBeforeHandlers) {
            if (handler.check(event.block)) {
                handler.execute(event);
            }
        }
    });

    world.afterEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockAfterEvent) => {
        system.run(() => {
            for (const handler of breakAfterHandlers) {
                if (handler.check(event)) {
                    handler.execute(event);
                }
            }
        });
    });

    world.beforeEvents.playerInteractWithBlock.subscribe((event: PlayerInteractWithBlockBeforeEvent) => {
        const { player, block } = event;
        const equippable = player.getComponent('minecraft:equippable') as any;
        const mainHandItem = equippable?.getEquipment('Mainhand');
        const isHoldingBow = mainHandItem?.typeId === 'minecraft:bow';

        for (const handler of interactHandlers) {
            if (handler.check(block)) {
                handler.execute(event);
                if (isHoldingBow && event.cancel) {
                    event.cancel = false;
                }
            }
        }
    });

    world.afterEvents.playerSpawn.subscribe((event: PlayerSpawnAfterEvent) => {
        system.run(() => {
            for (const handler of spawnHandlers) {
                handler(event);
            }
        });
    });

    world.afterEvents.playerJoin.subscribe((event: PlayerJoinAfterEvent) => {
        system.run(() => {
            for (const handler of joinHandlers) {
                handler(event);
            }
        });
    });
}
