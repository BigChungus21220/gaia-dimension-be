import { system } from "@minecraft/server";

// Import the single file that handles all component registrations
import "./registration/unifiedComponent.js";

// Import all other scripts
import "./blocks/api/BlockEntity.js";
import "./blocks/blockentity/Furnace.js";
import "./blocks/blockentity/Purifier.js";
import "./blocks/blockentity/Restructerer.js";
import "./blocks/dist/GaiaGeyser.dev.js";
import "./blocks/dist/GaiaGeyser.min.js";
import "./blocks/GaiaGeyser.js";
import "./blocks/PortalBlock.js";
import "./blocks/Sapling.js";
import "./blocks/VanillaStairs.js";
import "./client/GaiaSkyRenderer.js";
import "./data/NativeFurnaceData.js";
import "./data/NativePurifierData.js";
import "./data/NativeRestructererData.js";
import "./fluids/fluids.js";
import "./GaiaDimensionMod.js";
import "./GaiaMapping.js";
import "./GemPouchData.js";
import "./items/GlintandGold.js";
import "./malachiteGuardLogic.js";
import "./tickEvents.js";
import "./utils/mixins.js";
import "./Vec3.js";
import "./world/Biome.js";
import "./world/CoordinateDisplay.js";
import "./world/Events.js";
import "./world/Fog.js";
import "./world/Gaia.js";
import "./world/ModDimension.js";
import "./world/Portal.js";
import "./world/SaplingGrowth.js";

// Handle the new startup event
system.beforeEvents.startup.subscribe(() => {
    // Initialization logic that needs to run before the world is loaded can go here.
    // For now, we'll just log a message to indicate that the script is running.
    console.log("Gaia Dimension scripts loaded with Unified Component Model.");
});
