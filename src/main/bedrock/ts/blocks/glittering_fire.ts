import { world, system, Player, Entity, Block, Dimension, Vector3, EntityHitEntityAfterEvent, PlayerLeaveAfterEvent, PlayerPlaceBlockAfterEvent, PlayerBreakBlockBeforeEvent, PlayerBreakBlockAfterEvent } from "@minecraft/server";
import { PortalManager } from "../API/lib/PortalLib.js";

// Register the Gaia Dimension Portal
PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");

const playerHitboxes = new Map<string, Entity>();

/**
 * Registers the glittering fire component logic.
 */
export function registerGlitteringFireComponent(): void {
    // Raycast system to spawn hitboxes when looking at fire
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            const raycast = player.getBlockFromViewDirection({ maxDistance: 5 });
            const currentHitbox = playerHitboxes.get(player.id);

            if (raycast && raycast.block.typeId === "gaiadimension:glittering_fire") {
                const fireBlock: Block = raycast.block;
                const loc: Vector3 = fireBlock.location;
                const center: Vector3 = { x: loc.x + 0.5, y: loc.y + 0.2, z: loc.z + 0.5 };

                if (currentHitbox) {
                    const hLoc: Vector3 = currentHitbox.location;
                    // If looking at a different fire block, move the hitbox
                    if (Math.floor(hLoc.x) !== loc.x || Math.floor(hLoc.y) !== loc.y || Math.floor(hLoc.z) !== loc.z) {
                        try {
                            currentHitbox.teleport(center);
                        } catch (e) {
                            playerHitboxes.delete(player.id);
                        }
                    }
                } else {
                    // Spawn new hitbox
                    try {
                        const entity = player.dimension.spawnEntity("gaiadimension:fire_hitbox", center);
                        playerHitboxes.set(player.id, entity);
                    } catch (e) {}
                }
            } else if (currentHitbox) {
                // Not looking at fire anymore, remove hitbox
                try {
                    if (currentHitbox.isValid) currentHitbox.remove();
                } catch (e) {}
                playerHitboxes.delete(player.id);
            }
        }
    }, 2);

    // Handle player leaving
    world.afterEvents.playerLeave.subscribe((event: PlayerLeaveAfterEvent) => {
        const { playerId } = event;
        const currentHitbox = playerHitboxes.get(playerId);
        if (currentHitbox) {
            try {
                if (currentHitbox.isValid) currentHitbox.remove();
            } catch (e) {}
            playerHitboxes.delete(playerId);
        }
    });

    // Handle hitting the fire hitbox
    world.afterEvents.entityHitEntity.subscribe((event: EntityHitEntityAfterEvent) => {
        const { hitEntity } = event;
        if (hitEntity.typeId === "gaiadimension:fire_hitbox") {
            const loc: Vector3 = hitEntity.location;
            const blockLoc: Vector3 = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
            const dimension: Dimension = hitEntity.dimension;

            system.run(() => {
                const block = dimension.getBlock(blockLoc);
                if (block && block.typeId === "gaiadimension:glittering_fire") {
                    block.setType("minecraft:air");
                    dimension.playSound("random.fizz", blockLoc, {
                        volume: 1,
                        pitch: 1,
                    });
                }
                if (hitEntity.isValid) hitEntity.remove();
                // Clean up map
                for (const [pid, entity] of playerHitboxes) {
                    if (entity.id === hitEntity.id) {
                        playerHitboxes.delete(pid);
                        break;
                    }
                }
            });
        }
    });

    // Handle lighting the portal
    world.afterEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockAfterEvent) => {
        const { block } = event;
        if (block.typeId === "gaiadimension:glittering_fire") {
            system.run(() => {
                try {
                    const dimension: Dimension = block.dimension;
                    const location: Vector3 = block.location;
                    const currentBlock = dimension.getBlock(location);
                    if (currentBlock && currentBlock.typeId === "gaiadimension:glittering_fire") {
                         PortalManager.tryIgnite(currentBlock);
                    }
                } catch(e) {}
            });
        }
    });

    // Handle preventing breaking of fire
    world.beforeEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockBeforeEvent) => {
        const { block } = event;
        if (block.typeId === "gaiadimension:glittering_fire") {
            event.cancel = true;
        }
    });

    // Handle portal shattering
    world.afterEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockAfterEvent) => {
        const { block, brokenBlockPermutation, dimension } = event;
        const brokenId = brokenBlockPermutation.type.id;

        if (PortalManager.registeredPortals.has(brokenId)) {
            const neighbors = [
                block.above(), block.below(), block.north(), block.south(), block.east(), block.west()
            ];
            for (const neighbor of neighbors) {
                if (neighbor && neighbor.typeId === brokenId) {
                    PortalManager.breakPortal(dimension, neighbor.location, brokenId);
                    break; 
                }
            }
            return;
        }

        for (const [portalId, config] of (PortalManager.registeredPortals as Map<string, { frameId: string }>)) {
            if (config.frameId === brokenId) {
                const neighbors = [
                    block.above(), block.below(), block.north(), block.south(), block.east(), block.west()
                ];
                for (const neighbor of neighbors) {
                    if (neighbor && neighbor.typeId === portalId) {
                        PortalManager.breakPortal(dimension, neighbor.location, portalId);
                        break;
                    }
                }
            }
        }
    });
}

