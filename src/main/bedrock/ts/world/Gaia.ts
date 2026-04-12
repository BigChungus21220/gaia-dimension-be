import { world, system, Dimension, Vector3, Player, BlockPermutation, BlockVolume } from "@minecraft/server";

export const GAIA_DIMENSION_ID = "gaiadimension:gaia";

export class DimensionSystem {
    static isInGaia(player: Player): boolean {
        return player.dimension.id === GAIA_DIMENSION_ID;
    }

    static getBiome(player: Player): string {
        try {
            const biome = (player.dimension as any).getBiome(player.location);
            return biome ? biome.id.replace("minecraft:", "").replace("gaiadimension:", "") : "crystal_plains";
        } catch (e) {
            return "crystal_plains";
        }
    }

    static async teleport(player: Player, targetDimId: string) {
        if (!player.isValid) return;
        
        const targetDim = world.getDimension(targetDimId);
        const isToGaia = targetDimId === GAIA_DIMENSION_ID;
        
        // Calculate scale (4:1)
        const targetX = player.location.x / (isToGaia ? 4 : 0.25);
        const targetZ = player.location.z / (isToGaia ? 4 : 0.25);
        const targetY = isToGaia ? 100 : 70; // High enough to be safe
        
        const spawn = { x: targetX, y: targetY, z: targetZ };
        const tickingAreaId = `teleport_${player.id}`;
        
        player.sendMessage(`§eLoading Gaia Dimension...`);

        // 1. Preload arrival area
        await world.tickingAreaManager.createTickingArea(tickingAreaId, {
            dimension: targetDim,
            from: { x: spawn.x - 8, y: 0, z: spawn.z - 8 },
            to: { x: spawn.x + 8, y: 128, z: spawn.z + 8 }
        });

        // 2. Build Arrival Portal & Platform
        const px = Math.floor(spawn.x);
        const py = Math.floor(spawn.y);
        const pz = Math.floor(spawn.z);

        // Platform
        targetDim.fillBlocks(
            new BlockVolume({ x: px - 2, y: py - 1, z: pz - 2 }, { x: px + 2, y: py - 1, z: pz + 2 }),
            "minecraft:obsidian",
            { ignoreChunkBoundErrors: true }
        );

        // Frame
        const keystone = "gaiadimension:keystone_block";
        const portal = "gaiadimension:gaia_dimension_portal";
        
        // Bottom/Top
        for(let i = -1; i <= 2; i++) {
            targetDim.getBlock({x: px + i, y: py, z: pz})?.setType(keystone);
            targetDim.getBlock({x: px + i, y: py + 4, z: pz})?.setType(keystone);
        }
        // Sides
        for(let i = 1; i <= 3; i++) {
            targetDim.getBlock({x: px - 1, y: py + i, z: pz})?.setType(keystone);
            targetDim.getBlock({x: px + 2, y: py + i, z: pz})?.setType(keystone);
        }
        // Interior
        const portalPerm = BlockPermutation.resolve(portal, { "gaiadimension:perm_dim": 0 });
        for(let ix = 0; ix <= 1; ix++) {
            for(let iy = 1; iy <= 3; iy++) {
                targetDim.getBlock({x: px + ix, y: py + iy, z: pz})?.setPermutation(portalPerm);
            }
        }

        // 3. Teleport
        player.teleport({ x: px + 0.5, y: py + 1, z: pz + 0.5 }, { dimension: targetDim });
        
        // 4. Cleanup
        system.runTimeout(() => {
            try { world.tickingAreaManager.removeTickingArea(tickingAreaId); } catch(e) {}
        }, 100);
    }
}

// Logic to detect when a player stands in a portal
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;
        
        const block = player.dimension.getBlock(player.location);
        if (block && block.typeId === "gaiadimension:gaia_dimension_portal") {
            const lastTeleport = player.getDynamicProperty("last_teleport") as number ?? 0;
            if (system.currentTick - lastTeleport < 150) continue; // Slightly longer cooldown

            player.setDynamicProperty("last_teleport", system.currentTick);
            const targetDim = DimensionSystem.isInGaia(player) ? "minecraft:overworld" : GAIA_DIMENSION_ID;
            DimensionSystem.teleport(player, targetDim);
        }
    }
}, 10);
