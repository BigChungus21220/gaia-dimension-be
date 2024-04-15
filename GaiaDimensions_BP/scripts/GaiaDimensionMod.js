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
import SkyboxRenderer from './renderers/Skybox.js';

system.runTimeout(() => SkyboxRenderer.setSkybox(),100)