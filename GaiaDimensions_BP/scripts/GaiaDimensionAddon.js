import { world, system } from "@minecraft/server";
import { registerLeavesComponent } from "./blocks/leaves.js";
import { registerInvisibleComponent } from "./blocks/invisible.js";
import { registerCurtainComponent } from "./blocks/curtain.js";
import { registerWoodComponent } from "./blocks/wood.js";
import { registerFenceComponent } from "./blocks/fence.js";
import { registerSaplingComponent } from "./blocks/sapling.js";
import { registerWallComponent } from "./blocks/wall.js";
import { registerButtonComponent } from "./blocks/button.js";
import { registerPressurePlateComponent } from "./blocks/pressure_plate.js";
import { registerStairsComponent } from "./blocks/stairs.js";
import { registerSandstoneComponent } from "./blocks/sandstone_slab.js";
import { registerGlitteringFireComponent } from "./blocks/glittering_fire.js";
import { PortalManager } from "./API/lib/PortalLib.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";
import { initializeEventManager } from "./systems/event_manager.js";
import { initializeScriptEvents } from "./systems/scriptevents.js";
import { registerFluidComponent } from "./fluids/fluids.js";
import { registerCustomTool } from "./durability.js";
import { DimensionSystem } from "./world/Gaia.js";
import "./world/CoordinateDisplay.js";
import "./world/TerrainPatching.js";

// Initialize systems
initializeDestructionHandlers();
initializeEventManager();
initializeScriptEvents();
registerCustomTool();

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    registerLeavesComponent({ blockComponentRegistry });
    registerInvisibleComponent({ blockComponentRegistry });
    registerCurtainComponent({ blockComponentRegistry });
    registerWoodComponent({ blockComponentRegistry });
    registerFenceComponent({ blockComponentRegistry });
    registerSaplingComponent({ blockComponentRegistry });
    registerWallComponent({ blockComponentRegistry });
    registerButtonComponent({ blockComponentRegistry });
    registerPressurePlateComponent({ blockComponentRegistry });
    registerStairsComponent({ blockComponentRegistry });
    registerSandstoneComponent({ blockComponentRegistry });
    registerGlitteringFireComponent();
    registerFluidComponent({ blockComponentRegistry });
});
