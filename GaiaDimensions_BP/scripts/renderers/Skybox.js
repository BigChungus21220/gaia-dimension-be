import {world , system } from '@minecraft/server';
import * as Events from '../world/Events.js'
import Gaia from '../world/Gaia.js'

class SkyboxRenderer {
    constructor() {
      this.tick = Events.tick60;
    }
  
    /**
     * Spawns the Skybox (in Gaia)
     * @param {Vec3} location Location to spawn skybox
     * @param {MolangVariableMap} molangVariables Optional variables for this skybox
     */
    static setSkybox() {
      let players = Gaia.getPlayers();
      for (const player of players) {
        if (this.isInGaia(location)) {
          player.playAnimation('animation.skybox.gaia');
        }
      }
    }
  
    static isInGaia() {
      // Check if the location is within Gaia
      // Implementation goes here
    }
  }
  system.runTimeout(() => SkyboxRenderer.setSkybox(),100)
  //export
  export default SkyboxRenderer;

