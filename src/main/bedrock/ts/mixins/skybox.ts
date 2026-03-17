import { world, system, Entity, Player } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

const SKYBOX_ENTITY = "gaiadimension:gaia_dimension_skybox";
const SKYBOX_PROPERTY = "gaiadimension:is_active";

// Map<playerId, skyboxEntity>
const playerSkyboxMap = new Map<string, Entity>();

// Player Cache
const playerCache = new Map<string, Player>();

export function initializeSkybox(): void {
    // Initial cache population
    system.run(() => {
        for (const player of world.getAllPlayers()) {
            playerCache.set(player.id, player);
        }
    });

    // Maintenance loop
    system.runInterval(() => {
        // Refresh valid players
        for (const player of world.getAllPlayers()) {
            playerCache.set(player.id, player);
        }
        // Prune invalid players
        for (const [id, player] of playerCache) {
            if (!player.isValid) playerCache.delete(id);
        }
    }, 40);

    // Event listeners
    world.afterEvents.playerJoin.subscribe(event => {
        system.run(() => {
            const player = world.getEntity(event.playerId) as Player | undefined;
            if (player) playerCache.set(player.id, player);
        });
    });

    world.afterEvents.playerLeave.subscribe(event => {
        const skybox = playerSkyboxMap.get(event.playerId);
        if (skybox && skybox.isValid) {
            try { skybox.remove(); } catch (e) {}
        }
        playerSkyboxMap.delete(event.playerId);
        playerCache.delete(event.playerId);
    });

    // Main Loop
    system.runInterval(() => {
        for (const player of playerCache.values()) {
            if (!player.isValid) continue;

            if (DimensionSystem.isInGaia(player)) {
                let skybox = playerSkyboxMap.get(player.id);

                if (!skybox || !skybox.isValid) {
                    try {
                        skybox = player.dimension.spawnEntity(SKYBOX_ENTITY, player.location);
                        playerSkyboxMap.set(player.id, skybox);
                    } catch (e) {
                        continue;
                    }
                }

                try {
                    // Teleport to player
                    skybox.teleport({ x: player.location.x, y: player.location.y - 20, z: player.location.z });
                    
                    // Activate property if needed
                    const isActive = skybox.getProperty(SKYBOX_PROPERTY);
                    if (isActive !== true) {
                        skybox.setProperty(SKYBOX_PROPERTY, true);
                    }
                } catch (e) {
                   playerSkyboxMap.delete(player.id);
                }

            } else {
                // Not in Gaia, cleanup
                const skybox = playerSkyboxMap.get(player.id);
                if (skybox) {
                     if (skybox.isValid) {
                        try { skybox.remove(); } catch(e) {}
                     }
                     playerSkyboxMap.delete(player.id);
                }
            }
        }
    }, 1);
}