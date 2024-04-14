import * as Events from '../world/Events'
import Gaia from '../world/Gaia'
class SkyboxRenderer {
    constructor(player) {
        this.tick()
    }

   /**
     * Checks and updates player biome
     * @param {Player} player Player to update biome of
     */
   static updateSkybox(player){
    const biome = Gaia.getBiome(player.location);
    dimension.spawnParticle("gaia:geyser_pre_steam", spawn_pos);
    dimension.spawnParticle("gaia:geyser_steam", spawn_pos);
    dimension.spawnParticle("gaia:geyser_blast", spawn_pos);
    if (Gaia.isInGaia(player.location)) {
        if (this.#playerBiomes[player.id] != biome){
            Events.playerChangeBiome.trigger({player:player,biome:biome}); //trigger playerChangeBiome
        }
    }
    this.#playerBiomes[player.id] = biome;
}

}


Events.playerChangeBlock.subscribe((eventData)) => { 