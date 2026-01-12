import { world, system } from "@minecraft/server";
import { PortalManager } from "../API/lib/PortalLib.js";

// Register the Gaia Dimension Portal
// Portal Block ID: gaiadimension:gaia_dimension_portal
// Frame Block ID: gaiadimension:keystone_block
PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");

/**
 * Registers the glittering fire component logic.
 * This handles the interaction with gaiadimension:glittering_fire to extinguish it,
 * and attempts to light the portal when placed.
 */
export function registerGlitteringFireComponent() {
    // Handle extinguishing the fire
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        const { block } = event;

        if (block.typeId === "gaiadimension:glittering_fire") {
            event.cancel = true;

            system.run(() => {
                if (block.isValid) {
                    block.setType("minecraft:air");
                    block.dimension.playSound("random.fizz", block.location, {
                        volume: 1,
                        pitch: 1,
                    });
                }
            });
        }
    });

    // Handle lighting the portal
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block } = event;

        if (block.typeId === "gaiadimension:glittering_fire") {
            // Capture dimension and location immediately
            const dimension = block.dimension;
            const location = block.location;

            // Attempt to ignite the portal
            // The PortalManager will handle checking the shape and placing portal blocks
            system.run(() => {
                try {
                    const dimension = block.dimension;
                    const location = block.location;
                    // console.warn(`[GlitteringFire] Checking ignition at ${location.x}, ${location.y}, ${location.z} in ${dimension.id}`);
                    
                    const currentBlock = dimension.getBlock(location);
                    if (currentBlock && currentBlock.typeId === "gaiadimension:glittering_fire") {
                         PortalManager.tryIgnite(currentBlock);
                    } else {
                        //  console.warn("[GlitteringFire] Block mismatch or invalid after wait.");
                    }
                } catch(e) {
                    // console.warn(`[GlitteringFire] Error: ${e}`);
                }
            });
        }
    });

    // Handle preventing breaking of fire
    world.beforeEvents.playerBreakBlock.subscribe((event) => {
        const { block } = event;
        if (block.typeId === "gaiadimension:glittering_fire") {
            event.cancel = true;
        }
    });

    // Handle portal shattering
    world.afterEvents.playerBreakBlock.subscribe((event) => {
        const { block, brokenBlockPermutation, dimension } = event;
        const brokenId = brokenBlockPermutation.type.id;

        // Check if broken block was a portal
        if (PortalManager.registeredPortals.has(brokenId)) {
            // Check neighbors for remaining portal blocks to trigger chain reaction
            const neighbors = [
                block.above(), block.below(), block.north(), block.south(), block.east(), block.west()
            ];
            for (const neighbor of neighbors) {
                if (neighbor && neighbor.typeId === brokenId) {
                    PortalManager.breakPortal(dimension, neighbor.location, brokenId);
                    break; 
                }
            }
            return;
        }

        // Check if broken block was a frame
        for (const [portalId, config] of PortalManager.registeredPortals) {
            if (config.frameId === brokenId) {
                // Frame broken, check for adjacent portal blocks
                const neighbors = [
                    block.above(), block.below(), block.north(), block.south(), block.east(), block.west()
                ];
                for (const neighbor of neighbors) {
                    if (neighbor && neighbor.typeId === portalId) {
                        PortalManager.breakPortal(dimension, neighbor.location, portalId);
                        break;
                    }
                }
            }
        }
    });
}