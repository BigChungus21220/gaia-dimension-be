import { system, world, ItemStack, ScriptEventCommandMessageAfterEvent, EntityInventoryComponent, Player, Entity } from "@minecraft/server";

export function initializeScriptEvents(): void {
    system.afterEvents.scriptEventReceive.subscribe((event: ScriptEventCommandMessageAfterEvent): void => {
        if (event.id === "gaiadimension:give_agate_arrow") {
            const arrow: Entity | undefined = event.sourceEntity;
            if (!arrow) return;
            
            const { dimension, location } = arrow;
            const players: Player[] = dimension.getPlayers({
                location: location,
                maxDistance: 3,
                closest: 1
            });
            
            if (players.length > 0) {
                const player: Player = players[0];
                const inventory: EntityInventoryComponent | undefined = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
                if (inventory && inventory.container) {
                    inventory.container.addItem(new ItemStack("gaiadimension:agate_arrow", 1));
                }
            }
        }
    });
}

