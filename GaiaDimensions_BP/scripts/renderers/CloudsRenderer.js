import {world , system } from '@minecraft/server';
import * as Events from '../world/Events'
import Gaia from '../world/Gaia'
import {vec3} from './vec3.js'

//event that handles the skybox
Events.playerChangeBlock.subscribe((player) => {
    let spawn_pos = (player)
    let playerLocations = {};
    const players = Gaia.getPlayers();
    for (const player of players) {
      const { x, y, z } = player.location;
      const floorpos = vec3(x, 0, z).floor();
      if (!floorpos.compareWith(playerLocations[player.id] ?? floorpos)) {
        Events.playerChangeBlock.trigger({ player: player });
      }
      const check = Gaia.isInGaia(player.location.getBlock(pos));
      SkyboxRenderer.spawnSkybox(player.location)
    }
  });

 class SkyboxRenderer {
     constructor(player) {
         this.tick(59)
     }
       /**
   * Spawns the Skybox (in Gaia)
   * @param {ItemStack} itemStack Particle to spawn
   * @param {Vec3} location Location to spawn particle
   * @param {MolangVariableMap} molangVariables Optional variables for this particle
   */
  static spawnSkybox( location, molangVariables = {}) {
    Gaia.spawnParticle("gaia:sky1", location , molangVariables);
    Gaia.spawnParticle("gaia:sky2", location , molangVariables);
    Gaia.spawnParticle("gaia:sky_side1", location , molangVariables);
    Gaia.spawnParticle("gaia:sky_side2", location , molangVariables);
    Gaia.spawnParticle("gaia:sky_side3", location , molangVariables);
    Gaia.spawnParticle("gaia:sky_side4", location , molangVariables);
    Gaia.spawnParticle("gaia:gaia_planet", location , molangVariables);
  }
}
// Return the class and method
SkyboxRenderer;