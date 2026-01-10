import { world, system, BlockPermutation, ItemStack, BlockVolume } from "@minecraft/server";

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

// --- Fluid Processing System (Budgeted) ---
const BUDGET = 15; // Target max ms usage per tick
const PENDING_BLOCKS = new Map(); // Key: "x,y,z,dim", Value: {block, dimension}

// Directions for flow checks
const DIRECTIONS = [
    { x: 0, y: 0, z: -1, name: "North" },
    { x: 0, y: 0, z: 1, name: "South" },
    { x: 1, y: 0, z: 0, name: "East" },
    { x: -1, y: 0, z: 0, name: "West" }
];

const playerFluidState = new Map(); // Key: player.id, Value: { head: boolean, feet: boolean }

system.runInterval(() => {
    const start = Date.now();
    
    // Player Effects Logic
    runPlayerEffects();
    if (Date.now() - start > BUDGET) return;

    runBoatLogic();
    if (Date.now() - start > BUDGET) return;

    // Fluid Flow Logic (Budgeted)
    if (PENDING_BLOCKS.size === 0) return;

    // Use iterator to process manually so we can stop mid-loop
    for (const [key, data] of PENDING_BLOCKS) {
        if (Date.now() - start > BUDGET) break;

        PENDING_BLOCKS.delete(key);

        try {
            const { block, dimension } = data;
            if (block.isValid) {
                processFluidBlock(block, dimension);
            }
        } catch (e) {
            // Handle error silently or log
        }
    }
});

function runPlayerEffects() {
    const players = world.getPlayers();
    for (const player of players) {
      const dimension = world.getDimension(player.dimension.id)
      const location = player.location;
      
      const blockAt = dimension.getBlock(location);
      const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
      const blockHead = dimension.getBlock({ ...player?.location, y: player?.location?.y + 1.63 });
      
      const inFluidAt = blockAt && fluids.includes(blockAt.typeId);
      const inFluidAbove = blockAbove && fluids.includes(blockAbove.typeId);

      // --- 1. Viscosity Effects (Slow Falling + Levitation) ---
      if (inFluidAt || inFluidAbove) {
        let depth = 0;
        if (inFluidAt) depth++;
        if (inFluidAbove) depth++;
        if (depth === 2) {
             const blockWayAbove = dimension.getBlock({ x: location.x, y: location.y + 2, z: location.z });
             if (blockWayAbove && fluids.includes(blockWayAbove.typeId)) {
                 depth++;
             }
        }
        
        let amplifier = 0;
        if (depth >= 3) amplifier = 2;
        else if (depth === 2) amplifier = 1;
        
        if (player.isSneaking) {
            amplifier = Math.min(2, amplifier + 1);
        }

        player.addEffect("slow_falling", 4, { amplifier: amplifier, showParticles: false });
        
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

      // --- 2. Fluid Sounds & Particles (Mineral Water) ---
      const prevState = playerFluidState.get(player.id) || { head: false, feet: false };
      const isHeadInMineralWater = blockHead && blockHead.typeId.includes("mineral_water");
      const isFeetInMineralWater = blockAt && blockAt.typeId.includes("mineral_water");
      
      // Sound logic (Head)
      if (isHeadInMineralWater && !prevState.head) {
          // Enter
          player.playSound("ambient.underwater.enter", { volume: 0.5, pitch: 1 });
          player.playSound("ambient.underwater.loop", { volume: 1, pitch: 1 });
      } else if (!isHeadInMineralWater && prevState.head) {
          // Exit
          player.playSound("ambient.underwater.exit", { volume: 0.5, pitch: 1 });
          player.runCommand("stopsound @s ambient.underwater.loop");
      }

      // Surface Paddle Sound (Mineral Water)
      const isOnSurfaceMineralWater = isFeetInMineralWater && !isHeadInMineralWater;
      if (isOnSurfaceMineralWater) {
          const velocity = player.getVelocity();
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
          if (speed > 0.08 && system.currentTick % 8 === 0) {
              player.playSound("entity.boat.paddle_water", { volume: 0.25, pitch: 1 });
          }
      }
      
      // Particle logic (Feet)
      if (isFeetInMineralWater && !prevState.feet) {
          dimension.spawnParticle("minecraft:water_splash_particle", { x: location.x, y: location.y, z: location.z });
      }
      
      playerFluidState.set(player.id, { head: isHeadInMineralWater, feet: isFeetInMineralWater });

      // --- 3. Fog Effect ---
      if (blockHead) {
          const typeId = blockHead.typeId;
          if (typeId.includes("mineral_water")) {
              player.runCommand("fog @s push gaiadimension:mineral_water_fog mineral_water_fog");
          } else if (typeId.includes("superhot_magma")) {
              player.runCommand("fog @s push gaiadimension:superhot_magma_fog superhot_magma_fog");
          } else if (fluids.includes(typeId)) {
              player.runCommand("fog @s push fluid:water_fog fluid_fog");
          } else {
              player.runCommand("fog @s remove mineral_water_fog");
              player.runCommand("fog @s remove superhot_magma_fog");
              player.runCommand("fog @s remove fluid_fog");
          }
      }
    }
}

function isReplaceable(blk) {
    if (!blk || !blk.isValid) return false;
    if (blk.isAir) return true;
    if (blk.isLiquid) return false; 

    const id = blk.typeId;

    if (id === "minecraft:snow_layer" || 
        id === "minecraft:fire" || 
        id === "minecraft:soul_fire" ||
        id === "minecraft:double_plant" || 
        id === "minecraft:tallgrass" ||
        id === "minecraft:deadbush" ||
        id === "minecraft:web") return true;

    const vegetationTags = [
        "minecraft:is_plant",
        "flower",
        "plant",
        "double_plant",
        "minecraft:crop"
    ];
    if (vegetationTags.some(tag => blk.hasTag(tag))) return true;
    
// Core Fluid Logic
    if (id.includes("flower") || id.includes("sapling") || id.includes("bush") || id.includes("plant") || id.includes("leaf_litter")) return true;
    
    return false;
}

// Core Fluid Logic
function processFluidBlock(block, dimension) {
    const typeId = block.typeId;

    // ... (stage logic) ...
    let currentStage = 0; // 0 = source, -1 = down
    let baseId = typeId;
    
    if (typeId.endsWith("_down")) {
        currentStage = -1;
        baseId = typeId.slice(0, -5); 
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
    
    // Special Rule: Merge with Half Fluids or Down blocks above
    if (currentStage > 0) {
         const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
         if (above) {
             const aboveId = above.typeId;
             const isAboveDown = (aboveId === baseId + "_down");
             const isAboveHalf = (aboveId === baseId + "1" || aboveId === baseId + "2" || aboveId === baseId + "3");
             
             if (isAboveDown || isAboveHalf) {
                 const downId = baseId + "_down";
                 if (block.isValid) {
                     const vol = new BlockVolume(block.location, block.location);
                     dimension.fillBlocks(vol, BlockPermutation.resolve(downId));
                 }
                 return;
             }
         }
    }
    
    // 1. Survival Check
    if (currentStage > 0) {
        let hasParent = false;
        for (const dir of DIRECTIONS) {
            const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
            if (neighbor && neighbor.hasTag(requiredParentTag)) {
                hasParent = true;
                break;
            }
        }
        if (!hasParent) {
            if (block.isValid) {
                const vol = new BlockVolume(block.location, block.location);
                dimension.fillBlocks(vol, BlockPermutation.resolve("minecraft:air"));
            }
            return;
        }
    } else if (currentStage === -1) {
        const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
        if (!above) {
             if (block.isValid) {
                 const vol = new BlockVolume(block.location, block.location);
                 dimension.fillBlocks(vol, BlockPermutation.resolve("minecraft:air"));
             }
             return;
        }
        
        const aboveId = above.typeId;
        const validParents = [ baseId, baseId + "_down", baseId + "1", baseId + "2", baseId + "3" ];
        
        if (!validParents.includes(aboveId)) {
            if (block.isValid) {
                const vol = new BlockVolume(block.location, block.location);
                dimension.fillBlocks(vol, BlockPermutation.resolve("minecraft:air"));
            }
            return;
        }
    }

    // 2. Flow Down
    const below = dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
    let flowedDown = false;
    
    if (below && isReplaceable(below)) {
         const downId = baseId + "_down";
         const isDestructible = below.typeId !== "minecraft:air";
         
         if (below.isValid) {
             if (isDestructible) {
                 below.dimension.runCommand(`setblock ${below.location.x} ${below.location.y} ${below.location.z} air destroy`);
             }
             const vol = new BlockVolume(below.location, below.location);
             dimension.fillBlocks(vol, BlockPermutation.resolve(downId));
         }
         flowedDown = true;
    } else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) {
        flowedDown = true;
    }

    // 3. Flow Sideways (Next Stage)
    const canSpread = (currentStage === 0) || 
                      (currentStage === -1 && !flowedDown) || 
                      (currentStage > 0 && currentStage < 3);

    if (canSpread) {
        const nextStageId = (currentStage === 0 || currentStage === -1) ? baseId + "1" : baseId + (currentStage + 1).toString();
        
        for (const dir of DIRECTIONS) {
            const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
            if (neighbor && isReplaceable(neighbor)) {
                const isDestructible = neighbor.typeId !== "minecraft:air";
                if (neighbor.isValid) {
                    if (isDestructible) {
                        neighbor.dimension.runCommand(`setblock ${neighbor.location.x} ${neighbor.location.y} ${neighbor.location.z} air destroy`);
                    }
                    const vol = new BlockVolume(neighbor.location, neighbor.location);
                    dimension.fillBlocks(vol, BlockPermutation.resolve(nextStageId));
                }
            }
        }
    }
    
    // 4. Update Source Visuals
    if (currentStage === 0 || currentStage === -1) {
        const perms = block.permutation.getAllStates();
        let changed = false;
        
        const checkDir = (dx, dy, dz, stateName) => {
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
            if (block.isValid) {
                const vol = new BlockVolume(block.location, block.location);
                dimension.fillBlocks(vol, newPerm);
            }
        }
    }
}

class FluidFlowComponent {
    constructor() {
        this.onTick = this.onTick.bind(this);
    }

    onTick(event) {
        const { block } = event;
        // Push to global queue
        const key = `${block.location.x},${block.location.y},${block.location.z},${block.dimension.id}`;
        if (!PENDING_BLOCKS.has(key)) {
            PENDING_BLOCKS.set(key, { block, dimension: block.dimension });
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

             // Only allow pickup if it's a source block (no suffix like _down, 1, 2, 3)
             // Source blocks are: liquid_bismuth, liquid_aura, mineral_water, superhot_magma, sweet_muck
             const isFlowing = typeId.endsWith("_down") || /[1-3]$/.test(typeId);

             if (isFlowing) {
                 return; // Only source blocks can be picked up
             }

             let fluidName = typeId.replace("gaiadimension:", "");
             const bucketId = "gaiadimension:" + fluidName + "_bucket";
             
             system.run(() => {
                 const container = player.getComponent("inventory").container;
                 const slot = player.selectedSlotIndex;
                 const currentItem = container.getItem(slot);
                 
                 const gamemode = player.getGameMode();
                 
                 if (gamemode === "creative") {
                     block.setType("minecraft:air");
                     return;
                 }

                 if (currentItem && currentItem.typeId === "gaiadimension:scaynyx_bucket") {
                    const filledBucket = new ItemStack(bucketId, 1);
                    
                    if (currentItem.amount > 1) {
                         // Decrease empty bucket stack
                         currentItem.amount -= 1;
                         container.setItem(slot, currentItem);
                         
                         // Add filled bucket to inventory
                         const remainder = container.addItem(filledBucket);
                         
                         // If inventory full, drop item
                         if (remainder && remainder.amount > 0) {
                             player.dimension.spawnItem(remainder, player.location);
                         }
                    } else {
                         // Replace single empty bucket with filled bucket
                         container.setItem(slot, filledBucket);
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
            try {
                const perm = BlockPermutation.resolve(itemStack.typeId);
                system.run(() => {
                    if (targetBlock.isValid) {
                         targetBlock.setPermutation(perm);
                         dimension.playSound("dig.stone", targetLoc);
                         
                         const container = player.getComponent("inventory").container;
                         const slot = player.selectedSlotIndex;
                         const currentItem = container.getItem(slot);
                         
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
            } catch (e) {}
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

function runBoatLogic() {
    const players = world.getPlayers();
    if (players.length === 0) return;
    
    const activeDimensions = new Set(players.map(p => p.dimension));
    for (const dimension of activeDimensions) {
        const boats = dimension.getEntities({ families: ["boat"] });
        for (const boat of boats) {
             processBoat(boat, dimension);
        }
    }
}

function processBoat(boat, dimension) {
    if (!boat.isValid) return;

    const location = boat.location;
    // Check if boat is in mineral water
    const blockAt = dimension.getBlock(location);
    const blockBelow = dimension.getBlock({ x: location.x, y: location.y - 0.1, z: location.z });
    
    const isMineralWater = (blockAt && blockAt.typeId.includes("mineral_water")) || 
                           (blockBelow && blockBelow.typeId.includes("mineral_water"));

    if (isMineralWater) {
        // Buoyancy: Only if deep in water (blockAt is water)
        if (blockAt && blockAt.typeId.includes("mineral_water")) {
            boat.applyImpulse({ x: 0, y: 0.2, z: 0 });
        }

        // Jank Movement Logic
        // Calculate forward vector from rotation
        const rotation = boat.getRotation().y;
        const rad = (rotation + 90) * (Math.PI / 180);
        // Boat rotation 0 is usually South? Need to verify. 
        // Standard Minecraft: 0=South (+Z), 90=West (-X), 180=North (-Z), 270=East (+X).
        // Math: cos(rad) for X, sin(rad) for Z usually.
        // Let's try standard conversion.
        // Actually, let's just use the boat's velocity to boost it if it's already moving,
        // OR apply force based on player input if possible (cant detect input easily on entities).
        // But if "boat cant move", it means friction is high.
        // Let's apply a constant small push in the direction it is facing
        // IF there is a player riding it.
        
        // Check for passengers
        // Components: minecraft:rideable -> family_types
        // We can't easily check passengers in API 1.21.30 without getComponent("minecraft:rideable")?
        // Actually getComponent("minecraft:rideable") doesn't give passengers.
        // We can iterate players and check their location/vehicle? No vehicle API on player yet in stable?
        // Wait, "boat cant move" might be because it's sitting on a collision box (the holder).
        // Boats on land move very slowly.
        // We need to simulate ice-like sliding or just push it.
        
        // Let's try pushing it in its facing direction constantly.
        const dirX = -Math.sin(rotation * (Math.PI / 180));
        const dirZ = Math.cos(rotation * (Math.PI / 180));
        
        // Only push if there is some velocity already (player trying to move)
        // or just push always? Always might make it drift.
        const vel = boat.getVelocity();
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        
        if (speed > 0.01) {
             // Boost
             boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
        }

        // Calculate surface Y
        let waterTopY = Math.floor(location.y);
        const bAt = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) });
        
        if (bAt && bAt.typeId.includes("mineral_water")) {
             waterTopY = Math.floor(location.y) + 1; 
        } else if (blockBelow && blockBelow.typeId.includes("mineral_water")) {
             waterTopY = Math.floor(location.y);
        }
        
        // Find or spawn holder
        const holders = dimension.getEntities({
            type: "gaiadimension:boat_holder",
            location: location,
            maxDistance: 2
        });
        
        let holder = holders.length > 0 ? holders[0] : null;
        
        // Target Y for holder
        const targetHolderY = waterTopY - 0.55; 

        if (!holder) {
            holder = dimension.spawnEntity("gaiadimension:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
        }
        
        // Update Holder
        try {
            if (holder && holder.isValid) {
                holder.teleport(
                    { x: location.x, y: targetHolderY, z: location.z }, 
                    { dimension: dimension, rotation: { x: 0, y: boat.getRotation().y } }
                );
            }
        } catch (e) {}
        
    } else {
        // Not in water, remove nearby holders
        const holders = dimension.getEntities({
            type: "gaiadimension:boat_holder",
            location: location,
            maxDistance: 2
        });
        
        for (const h of holders) {
            if (h.isValid) h.remove();
        }
    }
}