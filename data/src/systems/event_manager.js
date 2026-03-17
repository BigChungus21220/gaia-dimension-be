import { world, system } from "@minecraft/server";

const placeHandlers = [];
const breakBeforeHandlers = [];
const breakAfterHandlers = [];
const interactHandlers = [];
const spawnHandlers = [];
const joinHandlers = [];

export function registerPlaceHandler(handler) {
    placeHandlers.push(handler);
}

export function registerBreakHandler(handler) {
    if (handler.event === "before") {
        breakBeforeHandlers.push(handler);
    } else {
        breakAfterHandlers.push(handler);
    }
}

export function registerInteractHandler(handler) {
    interactHandlers.push(handler);
}

export function registerPlayerSpawnHandler(handler) {
    spawnHandlers.push(handler);
}

export function registerPlayerJoinHandler(handler) {
    joinHandlers.push(handler);
}

export function initializeEventManager() {
    world.afterEvents.playerPlaceBlock.subscribe(event => {
        system.run(() => {
            for (const handler of placeHandlers) {
                if (handler.check(event.block)) {
                    handler.execute(event);
                }
            }
        });
    });

    world.beforeEvents.playerBreakBlock.subscribe(event => {
        for (const handler of breakBeforeHandlers) {
            if (handler.check(event.block)) {
                handler.execute(event);
            }
        }
    });

    world.afterEvents.playerBreakBlock.subscribe(event => {
        system.run(() => {
            for (const handler of breakAfterHandlers) {
                if (handler.check(event)) {
                    handler.execute(event);
                }
            }
        });
    });

    world.beforeEvents.playerInteractWithBlock.subscribe(event => {
        const { player, block } = event;
        const equippable = player.getComponent('minecraft:equippable');
        const mainHandItem = equippable.getEquipment('Mainhand');
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

    world.afterEvents.playerSpawn.subscribe(event => {
        system.run(() => {
            for (const handler of spawnHandlers) {
                handler(event);
            }
        });
    });

    world.afterEvents.playerJoin.subscribe(event => {
        system.run(() => {
            for (const handler of joinHandlers) {
                handler(event);
            }
        });
    });
}
