import { world, system } from "@minecraft/server";
import { registerLeavesComponent } from "./components/leaves.js";
import { registerInvisibleComponent } from "./components/invisible.js";
import { registerDoorComponent } from "./components/door.js";
import { registerWoodComponent } from "./components/wood.js";
import { registerFenceComponent } from "./components/fence.js";
import { registerSaplingComponent } from "./components/sapling.js";
import { registerWallComponent } from "./components/wall.js";
import { registerButtonComponent } from "./components/button.js";
import { registerPressurePlateComponent } from "./components/pressure_plate.js";
import { registerStairsComponent } from "./components/stairs.js";
import { registerSandstoneComponent } from "./components/sandstone_slab.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";
import { initializeEventManager } from "./systems/event_manager.js";

// Initialize systems
initializeDestructionHandlers();
initializeEventManager();

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
    registerLeavesComponent({ blockComponentRegistry });
    registerInvisibleComponent({ blockComponentRegistry });
    registerDoorComponent({ blockComponentRegistry });
    registerWoodComponent({ blockComponentRegistry });
    registerFenceComponent({ blockComponentRegistry });
    registerSaplingComponent({ blockComponentRegistry });
    registerWallComponent({ blockComponentRegistry });
    registerButtonComponent({ blockComponentRegistry });
    registerPressurePlateComponent({ blockComponentRegistry });
    registerStairsComponent({ blockComponentRegistry });
    registerSandstoneComponent({ blockComponentRegistry });
});