import { world, system } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";

// Particle definitions
const SKY_PARTICLES = [
    "gaiadimension:sky_side1",
    "gaiadimension:sky_side2",
    "gaiadimension:sky_side3",
    "gaiadimension:sky_side4",
    "gaiadimension:sky1",
    "gaiadimension:sky2"
];

const PLANET_PARTICLE = "gaiadimension:gaia_planet";

// Timings (in ticks)
const SKY_REFRESH = 10 * 20; // 10 seconds refresh for responsiveness
const PLANET_REFRESH = 9;    // 9 ticks

// State tracking: Map<playerId, { nextSky: tick, nextPlanet: tick }>
const playerSkyState = new Map();

// Player Cache: Cache player objects to avoid expensive getAllPlayers calls every tick
const playerCache = new Map();

export function initializeSkybox() {
    // Initial cache population
    system.run(() => {
    for (const player of world.getAllPlayers()) {
        playerCache.set(player.id, player);
    }})

    // Maintenance loop to keep cache fresh and valid (runs infrequently)
    system.runInterval(() => {
        // Refresh valid players
        for (const player of world.getAllPlayers()) {
            playerCache.set(player.id, player);
        }
        // Prune invalid players
        for (const [id, player] of playerCache) {
            if (!player.isValid) playerCache.delete(id);
        }
    }, 40); // Run every 2 seconds

    // Event listeners for immediate cache updates
    world.afterEvents.playerJoin.subscribe(event => {
        // Add to cache (attempt retrieval next tick to ensure loaded)
        system.run(() => {
            const p = world.getEntity(event.playerId);
            if (p) playerCache.set(p.id, p);
        });
    });

    world.afterEvents.playerLeave.subscribe(event => {
        playerCache.delete(event.playerId);
        playerSkyState.delete(event.playerId);
    });

    // Main Loop
    system.runInterval(() => {
        const currentTick = system.currentTick;
        
        // Iterate over CACHED players only
        for (const player of playerCache.values()) {
            if (!player.isValid) continue;

            // Only spawn if in Gaia dimension
            if (DimensionSystem.isInGaia(player)) {
                let state = playerSkyState.get(player.id);
                if (!state) {
                    // Force immediate spawn on first detection
                    state = { nextSky: 0, nextPlanet: 0 }; 
                    playerSkyState.set(player.id, state);
                }

                // Handle Skybox Particles (Every 10 seconds)
                if (currentTick >= state.nextSky) {
                    const loc = player.location;
                    for (const particleId of SKY_PARTICLES) {
                        try {
                            player.dimension.spawnParticle(particleId, loc);
                        } catch (e) {}
                    }
                    state.nextSky = currentTick + SKY_REFRESH;
                }

                // Handle Planet Particle (Every 9 ticks)
                if (currentTick >= state.nextPlanet) {
                    try {
                        player.dimension.spawnParticle(PLANET_PARTICLE, player.location);
                    } catch (e) {}
                    state.nextPlanet = currentTick + PLANET_REFRESH;
                }

            } else {
                // Remove state if player is no longer in Gaia
                if (playerSkyState.has(player.id)) {
                    playerSkyState.delete(player.id);
                }
            }
        }
    }, 1); // Run every tick for precise timing of 9-tick planet
}