import {world , system } from '@minecraft/server';
import * as Events from '../world/Events.js'
import Gaia from '../world/Gaia.js'

class SkyboxRenderer {
    constructor(tick) {
      this.tick = tick;
    }
  
    /**
     * Spawns the Skybox (in Gaia)
     * @param {MolangVariableMap} molangVariables Optional variables for this skybox
     */
    static setSkybox() {
      let players = Gaia.getPlayers();
      for (const player of players) {
        if (this.isInGaia(location)) {
          player.playAnimation('animation.skybox.gaia');
          return true;
        } else {
            return false;
        }
    }
      }
    }
  
  system.runTimeout(() => SkyboxRenderer.setSkybox(),100)
  //export
  export default SkyboxRenderer;

