import Gaia from '../world/Gaia.js'

class SkyboxRenderer {
    /**
     * Spawns the Skybox (in Gaia)
     */
    static renderSkybox() {
      let players = Gaia.getPlayers();
      for (const player of players) {
            if (player.getProperty('gaia:in_gaia') == true) player.setProperty('gaia:in_gaia',true);
           }
      }
    }
  
  //export
  export default SkyboxRenderer;
