import { world, system, StartupEvent, CommandPermissionLevel, Player, CustomCommandStatus } from "@minecraft/server";
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
import { registerSignComponent } from "./blocks/sign.js";
import { registerGeyserComponent, initializeGeyser } from "./blocks/geyser.js";
import { registerSandstoneComponent } from "./blocks/sandstone_slab.js";
import { registerStoneSlabComponent } from "./blocks/stone_slab.js";
import { registerGaiaFurnaceComponent } from "./blocks/furnaces/GaiaFurnace.js";
import { registerGlitteringFireComponent } from "./blocks/glittering_fire.js";
import { registerCrudeStorageCrateComponent } from "./blocks/crates/crude_storage_crate.js";
import { registerMegaStorageCrateComponent } from "./blocks/crates/mega_storage_crate.js";
import { initializeLightMixin } from "./mixins/LightMixin.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";
import { initializeEventManager } from "./systems/event_manager.js";
import { initializeScriptEvents } from "./systems/scriptevents.js";
import { registerFluidComponent } from "./fluids/fluids.js";
import { registerCustomTool } from "./durability.js";
import { registerGaiaCommands } from "./systems/Commands.js";
import { registerSetBiomeCommand } from "./systems/SetBiomeCommand.js";
import { registerFireStarterComponent } from "./items/FireStarter.js";
import { registerMagicStaffComponent } from "./items/MagicStaff.js";
import { initializeMagicStaffBehaviors } from "./systems/MagicStaffBehaviors.js";
import { initializeGlitterGrassSync } from "./blocks/GlitterGrassSync.js";
// import "./world/worldgen/core/index.js";
import "./systems/enchantments.js";
import "./entities/MalachiteGuard.js";

// Initialize systems
initializeDestructionHandlers();
initializeEventManager();

// @ts-ignore
system.beforeEvents?.shutdown?.subscribe((event) => event.cancel = true);
initializeScriptEvents();
initializeGeyser();
initializeLightMixin();
initializeGlitterGrassSync();
initializeMagicStaffBehaviors();
registerCustomTool();

system.beforeEvents.startup.subscribe((event: StartupEvent) => {
    const { blockComponentRegistry, customCommandRegistry, itemComponentRegistry /*, dimensionRegistry*/ } = event;
    
    // const { dimensionRegistry } = event; // Unplugged dimension registry
    
    // Register Native Gaia Dimension
    // dimensionRegistry.registerCustomDimension("gaiadimension:gaia_dimension");

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
    registerSignComponent({ blockComponentRegistry });
    registerGeyserComponent({ blockComponentRegistry });
    registerSandstoneComponent({ blockComponentRegistry });
    registerStoneSlabComponent({ blockComponentRegistry });
    registerGaiaFurnaceComponent({ blockComponentRegistry });
    registerGlitteringFireComponent();
    registerCrudeStorageCrateComponent({ blockComponentRegistry });
    registerMegaStorageCrateComponent({ blockComponentRegistry });
    registerFluidComponent({ blockComponentRegistry });
    registerFireStarterComponent({ itemComponentRegistry });
    registerMagicStaffComponent({ itemComponentRegistry });
    
    // Register travel command
    /*
    customCommandRegistry.registerCommand({
        name: "gaiadimension:travel",
        description: "Travel to the Gaia Dimension",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = origin.sourceEntity;
        if (player instanceof Player) {
            // Dimension Traveler Logic
            return { status: CustomCommandStatus.Success };
        }
        return { status: CustomCommandStatus.Failure, message: "Only players can use this command." };
    });
    */

    registerGaiaCommands(customCommandRegistry);
    registerSetBiomeCommand(customCommandRegistry);
});
