import Gaia from '../world/Gaia.js'

class SkyboxRenderer {
    /**
     * Spawns the Skybox (in Gaia)
     * @param {MolangVariableMap} molangVariables Optional variables for this skybox
     */
    static renderSkybox() {
      let players = Gaia.getPlayers();
      for (const player of players) {
        if (Gaia.isInGaia(player.location)) {
          //player.setProperty('gaia:skybox_property',); //there is no player.json file lol
          return true;
        } else {
            return false;
        }
    }
      }
    }
  
  //export
  export default SkyboxRenderer;

