import './asm/mixins.js';
import "./Vec3.js";
import './blocks/geyser.js';
import './GaiaTeleporter.js';
import './tickEvents.js'
import './light_portal.js';
import "./blocks/place.js";
import "./fluids/fluids.js";
import "./world/Biome.js";
import "./world/Fog.js";
import './GemPouchData.js';
import "./world/TerrainInterpolator.js";

// to change
import { world, system } from "@minecraft/server";

function showSkybox() {
    system.runTimeout(() => {
        for (const player of world.getPlayers()) {
            const { x, y, z } = player.location;
            // u know, just change the coords condition
            if (x > 1000 && z > 1000 && player.dimension.id == 'minecraft:the_end') {
                player.playAnimation('animation.skybox.gaia');
            }
        }
    }, 100);
}
showSkybox();
