import { world, system, BlockPermutation } from "@minecraft/server";
import { ModDimension } from "./ModDimension.js";

// Configuration
const GAIA_DIMENSION_ID = "gaia_dimension";
const RANGE_START = 100000;
const RANGE_END = 400000;

export const GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
    range: {
        start: { x: RANGE_START, z: RANGE_START },
        end: { x: RANGE_END, z: RANGE_END }
    },
    inheritance: "minecraft:the_end"
});

export class DimensionSystem {
    static teleportToGaia(player) {
        const center = GaiaDimension.getCenter();
        // 1:4 Ratio
        const targetX = (player.location.x / 4) + center.x;
        const targetZ = (player.location.z / 4) + center.z;
        const targetY = 100;

        // Teleport
        player.teleport(
            { x: targetX, y: targetY, z: targetZ },
            { dimension: world.getDimension("minecraft:the_end") }
        );
        
        // Cooldown
        player.addTag("gaiadimension:teleport_cooldown");
        system.runTimeout(() => {
            if (player.isValid) player.removeTag("gaiadimension:teleport_cooldown");
        }, 200);
        
        // Build Safety (Delayed)
        system.runTimeout(() => {
            if (!player.isValid) return;
            const dim = world.getDimension("minecraft:the_end");
            const px = Math.floor(targetX);
            const py = Math.floor(targetY);
            const pz = Math.floor(targetZ);
            try {
                // Platform
                for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) dim.getBlock({ x: px + x, y: py - 1, z: pz + z })?.setType("minecraft:obsidian");
                // Portal Frame (Simple)
                const pb = BlockPermutation.resolve("gaiadimension:gaia_dimension_portal", {"minecraft:cardinal_direction": "north"});
                dim.getBlock({ x: px, y: py, z: pz })?.setPermutation(pb);
                dim.getBlock({ x: px, y: py + 1, z: pz })?.setPermutation(pb);
            } catch(e) {}
        }, 40);
    }

    static returnFromGaia(player) {
        const center = GaiaDimension.getCenter();
        const relX = player.location.x - center.x;
        const relZ = player.location.z - center.z;
        const targetX = relX * 4;
        const targetZ = relZ * 4;
        const targetY = 100;

        player.teleport(
            { x: targetX, y: targetY, z: targetZ },
            { dimension: world.getDimension("minecraft:overworld") }
        );
        
        player.addTag("gaiadimension:teleport_cooldown");
        system.runTimeout(() => {
            if (player.isValid) player.removeTag("gaiadimension:teleport_cooldown");
        }, 200);

        system.runTimeout(() => {
            if (!player.isValid) return;
            const dim = world.getDimension("minecraft:overworld");
            const px = Math.floor(targetX);
            const py = Math.floor(targetY);
            const pz = Math.floor(targetZ);
            try {
                for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) dim.getBlock({ x: px + x, y: py - 1, z: pz + z })?.setType("minecraft:obsidian");
            } catch(e) {}
        }, 40);
    }
}

// Portal Detection Loop
system.runInterval(() => {
    const players = world.getPlayers();
    for (const player of players) {
        if (!player.isValid || player.hasTag("gaiadimension:teleport_cooldown")) continue;
        
        const dim = player.dimension;
        const loc = player.location;
        const b = dim.getBlock(loc);
        
        if (b && b.typeId === "gaiadimension:gaia_dimension_portal") {
            if (dim.id === "minecraft:overworld") {
                DimensionSystem.teleportToGaia(player);
            } else if (dim.id === "minecraft:the_end") {
                DimensionSystem.returnFromGaia(player);
            }
        }
    }
}, 10);