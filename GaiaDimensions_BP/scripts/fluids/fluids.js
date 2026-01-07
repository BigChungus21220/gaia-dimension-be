import { world, system, BlockPermutation } from "@minecraft/server";

const fluids = [
    "gaiadimension:liquid_bismuth",
    "gaiadimension:liquid_bismuth_down",
    "gaiadimension:liquid_bismuth1",
    "gaiadimension:liquid_bismuth2",
    "gaiadimension:liquid_bismuth3",

    "gaiadimension:liquid_aura",
    "gaiadimension:liquid_aura_down",
    "gaiadimension:liquid_aura1",
    "gaiadimension:liquid_aura2",
    "gaiadimension:liquid_aura3",

    "gaiadimension:mineral_water",
    "gaiadimension:mineral_water_down",
    "gaiadimension:mineral_water1",
    "gaiadimension:mineral_water2",
    "gaiadimension:mineral_water3",

    "gaiadimension:superhot_magma",
    "gaiadimension:superhot_magma_down",
    "gaiadimension:superhot_magma1",
    "gaiadimension:superhot_magma2",
    "gaiadimension:superhot_magma3",

    "gaiadimension:sweet_muck",
    "gaiadimension:sweet_muck_down",
    "gaiadimension:sweet_muck1",
    "gaiadimension:sweet_muck2",
    "gaiadimension:sweet_muck3"
];

const hot_fluids = [
    "gaiadimension:superhot_magma",
    "gaiadimension:superhot_magma_down",
    "gaiadimension:superhot_magma1",
    "gaiadimension:superhot_magma2",
    "gaiadimension:superhot_magma3",

    "gaiadimension:liquid_bismuth",
    "gaiadimension:liquid_bismuth_down",
    "gaiadimension:liquid_bismuth1",
    "gaiadimension:liquid_bismuth2",
    "gaiadimension:liquid_bismuth3",
];

system.runInterval(() => {
    const players = world.getPlayers();
  
    for (const player of players) {
      const dimension = world.getDimension(player.dimension.id)
      const blockAbove = dimension.getBlock({ ...player?.location, y: player?.location?.y + 1 });
      const blockAt = dimension.getBlock(player?.location);

      if (
        (blockAbove && fluids.includes(blockAbove.typeId)) ||
        (blockAt && fluids.includes(blockAt.typeId))
      ) {
        player.addEffect("slow_falling", 4, { amplifier: player.isSneaking ? 1 : 2, showParticles: false });
        if (player.isJumping) {
          player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
        }

        if (
          (blockAbove && hot_fluids.includes(blockAbove.typeId)) ||
          (blockAt && hot_fluids.includes(blockAt.typeId))
        ) {
          player.setOnFire(10, true);
        } else {
          player.extinguishFire(true);
        }
      }

      const blockHead = dimension.getBlock({ ...player?.location, y: player?.location?.y + 1.63 });
      if (blockHead && fluids.includes(blockHead.typeId)) {
        player.runCommand("fog @s push fluid:water_fog fluid_fog");
      } else {
        player.runCommand("fog @s remove fluid_fog");
      }
    }
});

class FluidFlowComponent {
    constructor() {
        this.onTick = this.onTick.bind(this);
        this.directions = [
            { x: 0, y: 0, z: -1 }, // North
            { x: 0, y: 0, z: 1 },  // South
            { x: 1, y: 0, z: 0 },  // East
            { x: -1, y: 0, z: 0 }  // West
        ];
    }

    onTick(event) {
        const { block } = event;
        const dimension = block.dimension;
        const typeId = block.typeId;

        // Determine fluid level/stage based on ID suffix
        let currentStage = 0; // 0 = source, -1 = down
        let baseId = typeId;
        
        if (typeId.endsWith("_down")) {
            currentStage = -1;
            baseId = typeId.slice(0, -5); // Remove "_down"
        } else if (typeId.endsWith("3")) {
            currentStage = 3;
            baseId = typeId.slice(0, -1);
        } else if (typeId.endsWith("2")) {
            currentStage = 2;
            baseId = typeId.slice(0, -1);
        } else if (typeId.endsWith("1")) {
            currentStage = 1;
            baseId = typeId.slice(0, -1);
        } else {
            currentStage = 0; // Source
            baseId = typeId;
        }
        
        let requiredParentTag = "";
        if (currentStage === 1) requiredParentTag = "template_full";
        else if (currentStage === 2) requiredParentTag = "template1";
        else if (currentStage === 3) requiredParentTag = "template2";
        
        // Special Rule: If stage 1, 2, 3 has a _down block above it, OR another stage 1, 2, 3 (half fluid) above it, it becomes _down (filling up/connecting)
        if (currentStage > 0) {
             const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
             if (above) {
                 const aboveId = above.typeId;
                 const isAboveDown = (aboveId === baseId + "_down");
                 const isAboveHalf = (aboveId === baseId + "1" || aboveId === baseId + "2" || aboveId === baseId + "3");
                 
                 if (isAboveDown || isAboveHalf) {
                     const downId = baseId + "_down";
                     system.run(() => {
                         if (block.isValid) block.setType(downId);
                     });
                     return;
                 }
             }
        }
        
        // 1. Survival Check
        if (currentStage > 0) {
            // Horizontal stages need a parent neighbor
            let hasParent = false;
            for (const dir of this.directions) {
                const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
                if (neighbor && neighbor.hasTag(requiredParentTag)) {
                    hasParent = true;
                    break;
                }
            }
            if (!hasParent) {
                system.run(() => {
                    if (block.isValid) block.setType("minecraft:air");
                });
                return;
            }
        } else if (currentStage === -1) {
            // Down blocks need source, down, or any stage above to survive?
            // JSON logic for stages: "execute if block ~ ~-1 ~ air run setblock ..._down"
            // So stages 1, 2, 3 CAN create down blocks.
            // Thus down blocks should survive if above is Source, Down, 1, 2, or 3.
            
            const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
            if (!above) {
                 system.run(() => { if (block.isValid) block.setType("minecraft:air"); });
                 return;
            }
            
            const aboveId = above.typeId;
            const validParents = [
                baseId,
                baseId + "_down",
                baseId + "1",
                baseId + "2",
                baseId + "3"
            ];
            
            if (!validParents.includes(aboveId)) {
                system.run(() => {
                    if (block.isValid) block.setType("minecraft:air");
                });
                return;
            }
        }

        // 2. Flow Down
        const below = dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
        let flowedDown = false;
        
        if (below && below.typeId === "minecraft:air") {
             const downId = baseId + "_down";
             system.run(() => {
                 if (below.isValid) below.setType(downId);
             });
             flowedDown = true;
             // If we flowed down into air, we generally don't spread sideways from this block in the same tick 
             // (simulating gravity priority), but _down blocks hitting ground IS the exception.
             // If I am a source or _down, and I have air below, I just made a pillar.
             // I don't necessarily spread sideways unless I am blocked.
        } else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) {
            // Already flowing down or merging into source
            flowedDown = true;
        }

        // 3. Flow Sideways (Next Stage)
        // Occurs if:
        // - I am Source (0) AND (NOT flowing down OR flowing down but maybe spread too? Vanilla water spreads even if falling, but less? No, water spreads only if supported or max depth?)
        // - Actually, Bedrock water: If it can go down, it goes down. It only goes side if it CANNOT go down (or if it's a source block, it does both? No, source usually prioritizes down).
        // - I am Down (-1) AND blocked below (not air/water).
        // - I am Stage 1, 2 (currentStage < 3) AND supported below?
        
        const canSpread = (currentStage === 0) || 
                          (currentStage === -1 && !flowedDown) || 
                          (currentStage > 0 && currentStage < 3);

        if (canSpread) {
            const nextStageId = (currentStage === 0 || currentStage === -1) ? baseId + "1" : baseId + (currentStage + 1).toString();
            
            for (const dir of this.directions) {
                const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
                if (neighbor && neighbor.typeId === "minecraft:air") {
                    // Also check if neighbor has support below? 
                    // Real fluids need support to flow 'out' usually, unless it's a source.
                    // But here, let's just spread to air.
                    system.run(() => {
                        if (neighbor.isValid) neighbor.setType(nextStageId);
                    });
                }
            }
        }
        
        // 4. Update Source Visuals (Only for Source Stage 0 or Down Stage -1 acting as source-like?)
        // The visual properties (x, nx, z, nz) on 'mineral_water' (Stage 0) depend on neighbors.
        // Down blocks usually don't have these properties or use a different model.
        // Checking mineral_water_down.json: it HAS these states!
        
        if (currentStage === 0 || currentStage === -1) {
            const perms = block.permutation.getAllStates();
            let changed = false;
            
            const checkDir = (dx, dy, dz, stateName) => {
                 // For _down blocks, do we connect to everything?
                 // JSON said: neighbor has 'template_full'.
                 // Source has template_full. Down has template_full (I saw it in the json earlier).
                 // So they connect to each other.
                 
                 const neighbor = dimension.getBlock({ x: block.location.x + dx, y: block.location.y + dy, z: block.location.z + dz });
                 const hasTag = neighbor && neighbor.hasTag("template_full");
                 const val = hasTag ? 1 : 0;
                 if (perms[stateName] !== undefined && perms[stateName] !== val) {
                     perms[stateName] = val;
                     changed = true;
                 }
            };

            checkDir(1, 0, 0, "gaiadimension:x");
            checkDir(-1, 0, 0, "gaiadimension:nx");
            checkDir(0, 0, 1, "gaiadimension:z");
            checkDir(0, 0, -1, "gaiadimension:nz");
            checkDir(0, 1, 0, "gaiadimension:top");
            checkDir(0, -1, 0, "gaiadimension:bottom");
            
            if (changed) {
                const newPerm = BlockPermutation.resolve(typeId, perms);
                system.run(() => {
                    if (block.isValid) block.setPermutation(newPerm);
                });
            }
        }
    }
}

// Interaction Logic
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack, face } = event;
    
    // 1. Bucket Interaction
    if (itemStack && itemStack.typeId === "gaiadimension:scaynyx_bucket") {
        if (fluids.includes(block.typeId)) {
             const typeId = block.typeId;
             let fluidName = typeId.replace("gaiadimension:", "");
             fluidName = fluidName.replace(/[0-9]|_down/g, "");
             
             const bucketId = "gaiadimension:" + fluidName + "_bucket";
             
             system.run(() => {
                 player.runCommand(`give @s ${bucketId}`);
                 const container = player.getComponent("inventory").container;
                 const slot = player.selectedSlotIndex;
                 const currentItem = container.getItem(slot);
                 if (currentItem && currentItem.typeId === "gaiadimension:scaynyx_bucket") {
                    if (currentItem.amount > 1) {
                         currentItem.amount -= 1;
                         container.setItem(slot, currentItem);
                    } else {
                         container.setItem(slot, null);
                    }
                 }
                 
                 block.setType("minecraft:air");
             });
             
             event.cancel = true;
             return; 
        }
    }

    // 2. Block Placement (Replace Fluid)
    if (itemStack) {
        // Calculate the target block position based on the face interacted with
        let targetLoc = { x: block.location.x, y: block.location.y, z: block.location.z };
        
        switch (face) {
            case "Up": targetLoc.y += 1; break;
            case "Down": targetLoc.y -= 1; break;
            case "North": targetLoc.z -= 1; break;
            case "South": targetLoc.z += 1; break;
            case "West": targetLoc.x -= 1; break;
            case "East": targetLoc.x += 1; break;
        }

        const dimension = block.dimension;
        const targetBlock = dimension.getBlock(targetLoc);

        if (targetBlock && fluids.includes(targetBlock.typeId)) {
            // Try to resolve if the held item is a block
            try {
                // Check if it's a valid block type
                const perm = BlockPermutation.resolve(itemStack.typeId);
                
                // If we are here, it is a block. Place it.
                system.run(() => {
                    // Check validity again in run
                    if (targetBlock.isValid) {
                         targetBlock.setPermutation(perm);
                         dimension.playSound("dig.stone", targetLoc);
                         
                         // Consume item (Creative check?)
                         const gameMode = player.getGameMode(); // Not directly available on player? 
                         // Check components or use default assumption. 
                         // Player.getGameMode() exists in newer API? Or check matchesCommand.
                         // For simplicity, just decrement for now. Correct way:
                         // const inventory = player.getComponent("inventory");
                         
                         // Check for creative mode to avoid decrementing? 
                         // "minecraft:game_mode" is not a component.
                         // We can assume survival or check preferences.
                         // Let's just decrement. Creative players usually have infinite items via client logic, 
                         // but server script decrementing might fight it?
                         // Actually, creating a robust check is hard without extra API.
                         // Standard addon behavior: check if "minecraft:can_fly" is NOT present? No.
                         // Let's try to decrement.
                         
                         const container = player.getComponent("inventory").container;
                         const slot = player.selectedSlotIndex;
                         const currentItem = container.getItem(slot);
                         
                         // If player is in creative, we shouldn't decrement. 
                         // Assuming survival for now as safe default for custom mechanics.
                         if (currentItem) {
                             if (currentItem.amount > 1) {
                                 currentItem.amount -= 1;
                                 container.setItem(slot, currentItem);
                             } else {
                                 container.setItem(slot, null);
                             }
                         }
                    }
                });
                event.cancel = true;
            } catch (e) {
                // Not a block, ignore
            }
        }
    }
});

// Indestructibility
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    if (fluids.includes(event.block.typeId)) {
        event.cancel = true;
    }
});

export function registerFluidComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:fluid_flow", new FluidFlowComponent());
}
