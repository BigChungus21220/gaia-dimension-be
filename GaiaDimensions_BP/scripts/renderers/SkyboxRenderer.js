import {world , system } from '@minecraft/server';
import * as Events from '../world/Events'
import Gaia from '../world/Gaia'
import {vec3} from './vec3.js'

//event that handles the skybox
Events.playerChangeBlock.subscribe((eventData) => {
    let spawn_pos = (eventData.player)
    let players = Gaia.getPlayers();
    for (const player of players) {
      const { x, y, z } = player.location;
      const floorpos = vec3(x, 0, z).floor();
      if (!floorpos.compareWith(playerLocations[player.id] ?? floorpos)) {
        Events.playerChangeBlock.trigger({ player: player });
      }
      const check = Gaia.isInGaia(player.location.getBlock(pos));
      Gaia.spawnParticle("gaia:sky1", spawn_pos);
      Gaia.spawnParticle("gaia:sky2", spawn_pos);
      Gaia.spawnParticle("gaia:sky_side1", spawn_pos);
      Gaia.spawnParticle("gaia:sky_side2", spawn_pos);
      Gaia.spawnParticle("gaia:sky_side3", spawn_pos);
      Gaia.spawnParticle("gaia:sky_side4", spawn_pos);
      Gaia.spawnParticle("gaia:gaia_planet", spawn_pos);
    }
  });

 class SkyboxRenderer {
     constructor(player) {
         this.tick(8)
     }