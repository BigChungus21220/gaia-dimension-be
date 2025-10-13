import { system } from "@minecraft/server";



//@Components
import { registerLeavesComponent } from "./components/leaves.js";
import { registerInvisibleComponent } from "./components/invisible.js";
import { registerDoorComponent } from "./components/door.js";
import { registerWoodComponent } from "./components/wood.js";
import { registerFenceComponent } from "./components/fence.js";
import { registerWallComponent } from "./components/wall.js";
import { registerThinBranchesComponent } from "./components/thin_branches.js";
import { registerButtonComponent } from "./components/button.js";
import { registerPressurePlateComponent } from "./components/pressure_plate.js";
// import { registerSaplingComponent } from "./components/sapling.js";
import { registerStairsComponent } from "./components/stairs.js";
import { registerBerryBushComponent, registerBerryBushEventHandler } from "./components/berry_bush.js";
import { registerSandstoneComponent } from "./components/stone_slab.js";

// Systems
import { initializeBoatSystem } from "./systems/boat.js";
import { initializeChallengeSystem } from "./systems/entityChallenge.js";
import { initializeItemStealSystem } from "./systems/stealItem.js";
import { initializeEntityDance } from "./systems/stealItem.js";
import { initializeEntityRetaliate } from "./systems/stealItem.js";
// import { initializeBirdsongSystem } from "./systems/birdsong.js";
import { initializeBushEffectSystem } from "./systems/bush_effect_system.js";
import { initializeFishBucketSystem } from "./systems/fish_bucket_system.js";
// import { initializeBiomeDisplay } from "./systems/biome_display.js";
import { registerDamageSystem } from "./systems/damage_system.js";
import { initializeDestructionHandlers } from "./systems/destruction_handler.js";
import { initializeGravitySystem } from "./systems/gravity-system.js";
import { initializeBarkStrippingSystem } from "./systems/bark_stripping.js";
// import { initializeBreakingSpeedSystem } from "./systems/breaking_speed.js";

//Hello Jack Sparrow = )
// import { initializeLeafPlacementSystem } from "./systems/leaf_placement.js";
// import { initializeLeafDecaySystem } from "./systems/leaf_decay.js";

import { initializePlayerManager } from "./systems/PlayerManager.js";
// import { initializeAmbientSound } from "./systems/ambientSound.js";
// import { initializeSettingsSystem } from "./settings.js";
import { initializeEventManager } from "./systems/event_manager.js";
import { initializePlayerSetup } from "./systems/player_setup.js";
import { initializeDynamicFog } from "./systems/dynamic_fog.js";


//@Natural Phenomena
import { initializeBiomeAmbience } from "./natural/biome_ambience.js";
import { initializeWeatherSystem } from "./natural/weather.js";


import "./natural/water_glimpse.js";


//@Our Libraries

/**
 * This is the central registration function for the addon.
 * It is called by main.js to initialize all components and systems.
 */
export function registerAllSystems() {
    // 1. Register Custom Components
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
        // registerSaplingComponent({ blockComponentRegistry });
        registerStairsComponent({ blockComponentRegistry });
        registerBerryBushComponent({ blockComponentRegistry });
        registerSandstoneComponent({ blockComponentRegistry });
    });
    initializeDestructionHandlers();
  }