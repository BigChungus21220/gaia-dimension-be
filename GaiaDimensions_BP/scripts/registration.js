import { system } from "@minecraft/server";
import { registerLeavesComponent } from "./components/leaves.js";
import { registerInvisibleComponent } from "./components/invisible.js";
import { registerDoorComponent } from "./components/door.js";
import { registerWoodComponent } from "./components/wood.js";
import { registerFenceComponent } from "./components/fence.js";
import { registerWallComponent } from "./components/wall.js";
import { registerThinBranchesComponent } from "./components/thin_branches.js";
import { registerButtonComponent } from "./components/button.js";
import { registerPressurePlateComponent } from "./components/pressure_plate.js";
import { registerSaplingComponent } from "./components/sapling.js";
import { registerStairsComponent } from "./components/stairs.js";
import { registerBerryBushComponent, registerBerryBushEventHandler } from "./components/berry_bush.js";
import { initializeBoatSystem } from "./systems/boat.js";
import { initializeChallengeSystem } from "./systems/entityChallenge.js";
import { initializeBirdsongSystem } from "./systems/birdsong.js";
// import { initializeBiomeSystem } from "./systems/biome_system.js";
import { initializeBushEffectSystem } from "./systems/bush_effect_system.js";
import { initializeWeatherSystem } from "./systems/weather_system.js"
import { initializeFishBucketSystem } from "./systems/fish_bucket_system.js"
import { initializeAmbientVfxSystem } from "./systems/ambient_vfx_system.js";
import { initializeStateCorrectionSystem } from "./systems/state_correction_system.js";


export function registerComponents() {
    system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
        registerLeavesComponent({ blockComponentRegistry });
        registerInvisibleComponent({ blockComponentRegistry });
        registerDoorComponent({ blockComponentRegistry });
        registerWoodComponent({ blockComponentRegistry });
        registerFenceComponent({ blockComponentRegistry });
        registerWallComponent({ blockComponentRegistry });
        registerThinBranchesComponent({ blockComponentRegistry });
        registerButtonComponent({ blockComponentRegistry });
        registerPressurePlateComponent({ blockComponentRegistry });
        registerSaplingComponent({ blockComponentRegistry });
        registerStairsComponent({ blockComponentRegistry });
    registerBerryBushComponent({ blockComponentRegistry });
    });
    initializeDestructionHandlers();
    initializeStateCorrectionSystem();
}
