import { system, world, ItemStack, ScriptEventCommandMessageAfterEvent, EntityInventoryComponent } from "@minecraft/server";

export function initializeScriptEvents() {
    system.afterEvents.scriptEventReceive.subscribe((event: ScriptEventCommandMessageAfterEvent) => {
        if (event.id === "gaiadimension:give_agate_arrow") {
            const arrow = event.sourceEntity;
            if (!arrow) return;
            
            const { dimension, location } = arrow;
            const players = dimension.getPlayers({
                location: location,
                maxDistance: 3,
                closest: 1
            });
            
            if (players.length > 0) {
                const player = players[0];
                const inventory = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
                if (inventory && inventory.container) {
                    inventory.container.addItem(new ItemStack("gaiadimension:agate_arrow", 1));
                }
            }
        }
    });
}

