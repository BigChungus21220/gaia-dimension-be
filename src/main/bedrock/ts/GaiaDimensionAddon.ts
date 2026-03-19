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
import { registerGeyserComponent, initializeGeyser } from "./blocks/geyser.js";
import { registerSandstoneComponent } from "./blocks/sandstone_slab.js";
import { registerStoneSlabComponent } from "./blocks/stone_slab.js";
import { registerGaiaFurnaceComponent } from "./blocks/furnaces/GaiaFurnace.js";
import { registerGlitteringFireComponent } from "./blocks/glittering_fire.js";
import { registerCrudeStorageCrateComponent } from "./blocks/crates/crude_storage_crate.js";
import { registerMegaStorageCrateComponent } from "./blocks/crates/mega_storage_crate.js";
import { initializeLightMixin } from "./mixins/LightMixin.js";
// import { initializeSkybox } from "./mixins/skybox.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";
import { initializeEventManager } from "./systems/event_manager.js";
import { initializeScriptEvents } from "./systems/scriptevents.js";
import { registerFluidComponent } from "./fluids/fluids.js";
import { registerCustomTool } from "./durability.js";
import { registerGaiaCommands } from "./systems/Commands.js";
import { registerSetBiomeCommand } from "./systems/SetBiomeCommand.js";
import { registerFireStarterComponent } from "./items/FireStarter.js";
import { registerCleanerComponent } from "./systems/Cleaner.js";
import { initializeGlitterGrassSync } from "./blocks/GlitterGrassSync.js";
import "./world/CoordinateDisplay.js";
import "./world/Biome.js";
import "./world/Fog.js";
import "./systems/enchantments.js";
import "./entities/MalachiteGuard.js";

// Initialize systems
initializeDestructionHandlers();
initializeEventManager();
initializeScriptEvents();
initializeGeyser();
initializeLightMixin();
initializeGlitterGrassSync();
// initializeSkybox();
registerCustomTool();

system.beforeEvents.startup.subscribe((event: any) => {
    const { blockComponentRegistry, customCommandRegistry, itemComponentRegistry } = event;
    
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
    registerGeyserComponent({ blockComponentRegistry });
    registerSandstoneComponent({ blockComponentRegistry });
    registerStoneSlabComponent({ blockComponentRegistry });
    registerGaiaFurnaceComponent({ blockComponentRegistry });
    registerGlitteringFireComponent();
    registerCleanerComponent({ blockComponentRegistry });
    registerCrudeStorageCrateComponent({ blockComponentRegistry });
    registerMegaStorageCrateComponent({ blockComponentRegistry });
    registerFluidComponent({ blockComponentRegistry });
    registerFireStarterComponent({ itemComponentRegistry });
    
    // Register custom commands
    registerGaiaCommands(customCommandRegistry);
    registerSetBiomeCommand(customCommandRegistry);
});
