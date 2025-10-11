import { system } from "@minecraft/server";
import { registerLeavesComponent } from "./components/leaves.js";
import { registerInvisibleComponent } from "./components/invisible.js";
import { registerDoorComponent } from "./components/door.js";
import { registerWoodComponent } from "./components/wood.js";
import { registerFenceComponent } from "./components/fence.js";
import { registerWallComponent } from "./components/wall.js";
import { registerButtonComponent } from "./components/button.js";
import { registerPressurePlateComponent } from "./components/pressure_plate.js";
import { registerSaplingComponent } from "./components/sapling.js";
import { registerStairsComponent } from "./components/stairs.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";


export function registerComponents() {
    system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
        registerLeavesComponent({ blockComponentRegistry });
        registerInvisibleComponent({ blockComponentRegistry });
        registerDoorComponent({ blockComponentRegistry });
        registerWoodComponent({ blockComponentRegistry });
        registerFenceComponent({ blockComponentRegistry });
        registerWallComponent({ blockComponentRegistry });
        registerButtonComponent({ blockComponentRegistry });
        registerPressurePlateComponent({ blockComponentRegistry });
        registerSaplingComponent({ blockComponentRegistry });
        registerStairsComponent({ blockComponentRegistry });
        });
    initializeDestructionHandlers();
}
