import { system } from "@minecraft/server";

// Import the registration functions from our refactored block scripts
import { registerButtonComponent } from './blocks/gaia_buttons.js';
import { registerCurtainComponent } from './blocks/gaia_curtain.js';
import { registerFenceComponent } from './blocks/gaia_fence.js';
import { registerPressurePlateComponent } from './blocks/gaia_pressure_plate.js';
import { registerWoodComponent } from './blocks/gaia_wood.js';
import { registerStairsComponent } from './blocks/gaia_stairs.js';
import { registerGeyserComponent } from './blocks/geyser.js';
import { initializeBiomeChecker } from './world/BiomeSystem.js';
import './items/Ignition';

/**
 * This is the main entry point for the Gaia Dimension mod.
 * It registers all custom block components when the world starts up.
 */
function registerAllComponents() {
    system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
        const context = { blockComponentRegistry };

        // Call each registration function
        registerButtonComponent(context);
        registerCurtainComponent(context);
        registerFenceComponent(context);
        registerPressurePlateComponent(context);
        registerWoodComponent(context);
        registerStairsComponent(context);
        registerGeyserComponent(context);
        // Initialize the biome checker system
        initializeBiomeChecker();
        });
}

// Run the registration
registerAllComponents();
