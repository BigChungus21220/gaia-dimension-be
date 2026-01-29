import { world, system, BlockPermutation, ItemStack, BlockVolume, GameMode } from "@minecraft/server";

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

const fluidIDs = new Set(fluids);

class FluidTemplate {
    constructor(baseId) {
        this.baseId = baseId;
        this.interactions = [];
    }

    addInteraction(directions, targetBlock, action, resultBlock, sound) {
        this.interactions.push({ directions, targetBlock, action, resultBlock, sound });
    }

    getInteractions() {
        return this.interactions;
    }
}

const idToTemplate = new Map();

function getFluidVariants(baseId) {
    return [
        baseId,
        baseId + "_down",
        baseId + "1",
        baseId + "2",
        baseId + "3"
    ];
}

function registerFluidInteraction(selfId, targetId, resultId, sound) {
    let template = idToTemplate.get(selfId);
    if (!template) {
        template = new FluidTemplate(selfId);
        idToTemplate.set(selfId, template);
    }
    // Normalize targetId to array
    const targets = Array.isArray(targetId) ? targetId : [targetId];
    template.addInteraction("adjacent", targets, "transformTarget", resultId, sound);
}

// --- Interaction Rules ---
const MAGMA = "gaiadimension:superhot_magma";
const AURA = "gaiadimension:liquid_aura";
const MINERAL = "gaiadimension:mineral_water";
const MUCK = "gaiadimension:sweet_muck";
const PRIMAL = "gaiadimension:primal_mass";
const AURA_CRYSTAL_BLOCK = "gaiadimension:aura_crystal_block";
const WATER_VARIANTS = ["minecraft:water", "minecraft:flowing_water"];

// 1. Superhot Magma + Liquid Aura = Block of Aura Crystal
registerFluidInteraction(MAGMA, getFluidVariants(AURA), AURA_CRYSTAL_BLOCK, "random.fizz");
registerFluidInteraction(AURA, getFluidVariants(MAGMA), AURA_CRYSTAL_BLOCK, "random.fizz");

// 2. Superhot Magma + Mineral Water / Normal Water = Primal Mass
registerFluidInteraction(MAGMA, [...getFluidVariants(MINERAL), ...WATER_VARIANTS], PRIMAL, "random.fizz");
registerFluidInteraction(MINERAL, getFluidVariants(MAGMA), PRIMAL, "random.fizz");

// 3. Sweet Muck + Superhot Magma = Primal Mass
registerFluidInteraction(MUCK, getFluidVariants(MAGMA), PRIMAL, "random.fizz");
registerFluidInteraction(MAGMA, getFluidVariants(MUCK), PRIMAL, "random.fizz");


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
const MAX_QUEUE_SIZE = 500; // Hard limit on pending blocks to prevent memory/lag spikes
const IDLE_TIMEOUT = 40; // Ticks before a fluid goes idle (~2 seconds)
const PENDING_BLOCKS = new Map(); // Key: "x,y,z,dim", Value: {block, dimension}
const ACTIVE_FLUIDS = new Map(); // Key: "x,y,z,dim", Value: lastActiveTick

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
                const didChange = processFluidBlock(block, dimension);
                if (didChange) {
                    ACTIVE_FLUIDS.set(key, system.currentTick);
                }
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
    if (fluidIDs.has(blk.typeId)) return false;

    const id = blk.typeId;

    if (id === "minecraft:snow_layer" || 
        id === "minecraft:fire" || 
        id === "minecraft:soul_fire" ||
        id === "minecraft:double_plant" || 
        id === "minecraft:tallgrass" ||
        id === "minecraft:short_grass" ||
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
    let changesHappened = false;

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

    if (!fluidIDs.has(baseId)) return false; 
    
    // Interaction Logic (Generic)
    const currentTemplate = idToTemplate.get(baseId);
    if (currentTemplate) {
        const interactions = currentTemplate.getInteractions();
        for (const rule of interactions) {
            // Determine blocks to check based on direction
            const blocksToCheck = [];
            
            if (rule.directions === "adjacent" || rule.directions === "all") {
                blocksToCheck.push(
                    dimension.getBlock({ x: block.location.x + 1, y: block.location.y, z: block.location.z }),
                    dimension.getBlock({ x: block.location.x - 1, y: block.location.y, z: block.location.z }),
                    dimension.getBlock({ x: block.location.x, y: block.location.y, z: block.location.z + 1 }),
                    dimension.getBlock({ x: block.location.x, y: block.location.y, z: block.location.z - 1 }),
                    dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z })
                );
            }
            if (rule.directions === "below" || rule.directions === "all") {
                blocksToCheck.push(
                    dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z })
                );
            }

            let triggered = false;
            for (const checkBlock of blocksToCheck) {
                if (!checkBlock) continue;
                
                const isMatch = Array.isArray(rule.targetBlock) 
                    ? rule.targetBlock.includes(checkBlock.typeId)
                    : checkBlock.typeId === rule.targetBlock;

                if (isMatch) {
                    if (rule.action === "transformTarget" && checkBlock.isValid) {
                        checkBlock.setType(rule.resultBlock);
                        triggered = true;
                    } else if (rule.action === "transformSelf") {
                        triggered = true;
                        break; 
                    }
                }
            }

            if (triggered) {
                changesHappened = true;
                if (rule.sound) {
                    dimension.playSound(rule.sound, block.location, { volume: 0.5, pitch: 1 });
                }
                if (rule.action === "transformSelf" && block.isValid) {
                    block.setType(rule.resultBlock);
                    return true; // Stop processing this block (it changed)
                }
            }
        }
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
                     changesHappened = true;
                 }
                 return changesHappened;
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
                changesHappened = true;
            }
            return changesHappened;
        }
    } else if (currentStage === -1) {
        const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
        if (!above) {
             if (block.isValid) {
                 const vol = new BlockVolume(block.location, block.location);
                 dimension.fillBlocks(vol, BlockPermutation.resolve("minecraft:air"));
                 changesHappened = true;
             }
             return changesHappened;
        }
        
        const aboveId = above.typeId;
        const validParents = [ baseId, baseId + "_down", baseId + "1", baseId + "2", baseId + "3" ];
        
        if (!validParents.includes(aboveId)) {
            if (block.isValid) {
                const vol = new BlockVolume(block.location, block.location);
                dimension.fillBlocks(vol, BlockPermutation.resolve("minecraft:air"));
                changesHappened = true;
            }
            return changesHappened;
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
             changesHappened = true;
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
            if (neighbor) {
                let canOverwrite = false;
                
                if (isReplaceable(neighbor)) {
                    canOverwrite = true;
                } else if (neighbor.typeId.startsWith(baseId)) {
                    // Check if neighbor is a flow stage of the same fluid
                    let neighborStage = 0; // Default to source (0)
                    if (neighbor.typeId.endsWith("_down")) neighborStage = -1;
                    else {
                        const match = neighbor.typeId.match(/(\d)$/);
                        if (match) neighborStage = parseInt(match[1]);
                        else if (neighbor.typeId === baseId) neighborStage = 0; // Explicit source check
                        else neighborStage = -999; // Not a valid flow stage
                    }

                    // We want to replace if our new stage (nextStageId suffix) is "fuller" (lower number) than neighbor.
                    // nextStageId is e.g. "liquid_magma1".
                    const nextStageNum = parseInt(nextStageId.slice(-1)); 
                    
                    if (neighborStage > 0 && nextStageNum < neighborStage) {
                        canOverwrite = true;
                    }
                }

                if (canOverwrite) {
                    const isDestructible = neighbor.typeId !== "minecraft:air";
                    if (neighbor.isValid) {
                        if (isDestructible) {
                            neighbor.dimension.runCommand(`setblock ${neighbor.location.x} ${neighbor.location.y} ${neighbor.location.z} air destroy`);
                        }
                        const vol = new BlockVolume(neighbor.location, neighbor.location);

                        let direction = "north";
                        if (dir.z === 1) direction = "south";
                        else if (dir.x === 1) direction = "east";
                        else if (dir.x === -1) direction = "west";

                        const perm = BlockPermutation.resolve(nextStageId, { "minecraft:cardinal_direction": direction });
                        dimension.fillBlocks(vol, perm);
                        changesHappened = true;
                    }
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
                changesHappened = true;
            }
        }
    }
    return changesHappened;
}

class FluidFlowComponent {
    constructor() {
        this.onTick = this.onTick.bind(this);
    }

    onTick(event) {
        if (PENDING_BLOCKS.size >= MAX_QUEUE_SIZE) return;
        const { block } = event;
        const key = `${block.location.x},${block.location.y},${block.location.z},${block.dimension.id}`;
        
        const lastActive = ACTIVE_FLUIDS.get(key);

        if (!lastActive) {
            ACTIVE_FLUIDS.set(key, system.currentTick);
        }
        if (!PENDING_BLOCKS.has(key)) {
            PENDING_BLOCKS.set(key, { block, dimension: block.dimension });
        }
    }
}

// Wake up fluids on block interactions
function wakeNeighbors(location, dimension) {
    const locations = [
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
    ];
    
    for (const offset of locations) {
        const nx = location.x + offset.x;
        const ny = location.y + offset.y;
        const nz = location.z + offset.z;
        const key = `${nx},${ny},${nz},${dimension.id}`;
        // Force update timestamp to wake it up if it's a fluid
        ACTIVE_FLUIDS.set(key, system.currentTick);
    }
}

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    wakeNeighbors(event.block.location, event.block.dimension);
});

world.afterEvents.playerBreakBlock.subscribe((event) => {
    wakeNeighbors(event.block.location, event.block.dimension);
});

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack } = event;
    if (!itemStack) return;

    if (itemStack.typeId.startsWith("gaiadimension:") && itemStack.typeId.endsWith("_bucket")) {
        const fluidId = itemStack.typeId.replace("_bucket", "");
        
        // Logic 1:/Case 1 Replace flowing fluid directly if clicking on it
        const isFlowingVariant = (blk) => {
            return blk.typeId === fluidId + "1" || 
                   blk.typeId === fluidId + "2" || 
                   blk.typeId === fluidId + "3" || 
                   blk.typeId === fluidId + "_down";
        };

        if (isFlowingVariant(block)) {
            event.cancel = true;
            system.run(() => {
                if (block.isValid) {
                    const perm = BlockPermutation.resolve(fluidId);
                    block.setPermutation(perm);
                    wakeNeighbors(block.location, block.dimension);
                    
                    const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
                    const sound = isHot ? "bucket.empty_lava" : "bucket.empty_water";
                    player.playSound(sound, { pitch: 1, volume: 1 });
                    
                    if (player.getGameMode() !== GameMode.Creative) {
                        const container = player.getComponent("inventory")?.container;
                        if (container) {
                            const slot = player.selectedSlotIndex;
                            const currentItem = container.getItem(slot);
                            if (currentItem && currentItem.typeId === itemStack.typeId) {
                                if (currentItem.amount > 1) {
                                    currentItem.amount--;
                                    container.setItem(slot, currentItem);
                                    const emptyBucket = new ItemStack("minecraft:bucket", 1);
                                    const remainder = container.addItem(emptyBucket);
                                    if (remainder) {
                                        player.dimension.spawnItem(remainder, player.location);
                                    }                                
                                } else {
                                    container.setItem(slot, new ItemStack("minecraft:bucket", 1));
                                }
                            }
                        }
                    }
                }
            });
            return;
        }

        // Logic 2:/ Case 2 Standard placement via offset
        const raycast = player.getBlockFromViewDirection({ maxDistance: 10 });
        if (!raycast) return;
        const { face } = raycast;

        let targetLoc = { x: block.location.x, y: block.location.y, z: block.location.z };
        switch (face) {
            case "Up": targetLoc.y += 1; break;
            case "Down": targetLoc.y -= 1; break;
            case "North": targetLoc.z -= 1; break;
            case "South": targetLoc.z += 1; break;
            case "West": targetLoc.x -= 1; break;
            case "East": targetLoc.x += 1; break;
        }

        const dimension = player.dimension;
        const targetBlock = dimension.getBlock(targetLoc);

        if (targetBlock && (targetBlock.isAir || isReplaceable(targetBlock) || isFlowingVariant(targetBlock))) {
             if (targetBlock.typeId === fluidId) {
                event.cancel = true;
                system.run(() => {
                    targetBlock.setType("minecraft:air");
                    wakeNeighbors(targetBlock.location, dimension);
                });
                return;
             }

             event.cancel = true;
             
             system.run(() => {
                 if (targetBlock.isValid) {
                     const perm = BlockPermutation.resolve(fluidId);
                     targetBlock.setPermutation(perm);
                     wakeNeighbors(targetBlock.location, dimension);
                     
                     const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
                     const sound = isHot ? "bucket.empty_lava" : "bucket.empty_water";
                     player.playSound(sound, { pitch: 1, volume: 1 });
                     
                     if (player.getGameMode() !== GameMode.Creative) {
                         const container = player.getComponent("inventory")?.container;
                         if (container) {
                             const slot = player.selectedSlotIndex;
                             const currentItem = container.getItem(slot);
                             if (currentItem && currentItem.typeId === itemStack.typeId) {
                                 if (currentItem.amount > 1) {
                                     currentItem.amount--;
                                     container.setItem(slot, currentItem);
                                     const emptyBucket = new ItemStack("minecraft:bucket", 1);
                                     const remainder = container.addItem(emptyBucket);
                                     if (remainder) {
                                         player.dimension.spawnItem(remainder, player.location);
                                     }                                 
                                 } else {
                                     container.setItem(slot, new ItemStack("minecraft:bucket", 1));
                                 }
                             }
                         }
                     }
                 }
             });
        }
        return;
    }

    // Pickup Fluid (Empty Bucket on Source)
    if (fluidIDs.has(block.typeId) && itemStack.typeId === "minecraft:bucket") {
        const typeId = block.typeId;
        const isFlowing = typeId.endsWith("_down") || /[1-3]$/.test(typeId);
        
        if (!isFlowing) {
            let bucketId = typeId + "_bucket";
            
            event.cancel = true; // Stop native behavior

            system.run(() => {
                if (player.getGameMode() !== GameMode.Creative) {
                    const container = player.getComponent("inventory")?.container;
                    if (container) {
                        const slot = player.selectedSlotIndex;
                        const currentItem = container.getItem(slot);
                        
                        if (currentItem && currentItem.typeId === "minecraft:bucket") {
                            const filledBucket = new ItemStack(bucketId, 1);
                            if (currentItem.amount > 1) {
                                currentItem.amount -= 1;
                                container.setItem(slot, currentItem);
                                const remainder = container.addItem(filledBucket);
                                if (remainder && remainder.amount > 0) {
                                    player.dimension.spawnItem(remainder, player.location);
                                }
                            } else {
                                container.setItem(slot, filledBucket);
                            }
                        }
                    }
                }

                // Sound
                const isHot = typeId.includes("magma") || typeId.includes("bismuth");
                const sound = isHot ? "bucket.fill_lava" : "bucket.fill_water";
                player.dimension.playSound(sound, block.location, { pitch: 1, volume: 1 });

                block.setType("minecraft:air");
                wakeNeighbors(block.location, block.dimension);
            });
            return;
        }
    }
    
    if (fluidIDs.has(block.typeId)) {
        if (itemStack.typeId === "minecraft:bucket" || itemStack.typeId.endsWith("_bucket")) return;

        event.cancel = true;
        system.run(() => {
            if (block.isValid && itemStack) {
                try {
                    const blockPerm = BlockPermutation.resolve(itemStack.typeId);
                    block.setPermutation(blockPerm);
                    wakeNeighbors(block.location, block.dimension);
                    player.playSound("stone.dig", { location: block.location });
                    
                    if (player.getGameMode() !== GameMode.Creative) {
                         const container = player.getComponent("inventory")?.container;
                         if (container) {
                             const slot = player.selectedSlotIndex;
                             if (itemStack.amount > 1) {
                                 itemStack.amount--;
                                 container.setItem(slot, itemStack);
                             } else {
                                 container.setItem(slot, undefined);
                             }
                         }
                    }
                } catch (e) {}
            }
        });
    }
});

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { player, block, itemStack } = event;
    if (fluidIDs.has(block.typeId)) {
        event.cancel = true;
    }
});

// (QOL:) Replace Fluid Blocks with Buckets
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const container = player.getComponent("inventory")?.container;
        if (!container) continue;

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item) continue;

            if (fluidIDs.has(item.typeId)) {
                let baseId = item.typeId;
                if (baseId.endsWith("_down")) baseId = baseId.slice(0, -5);
                else if (/[1-3]$/.test(baseId)) baseId = baseId.slice(0, -1);
                
                const bucketId = baseId + "_bucket";
                try {
                    const bucket = new ItemStack(bucketId, item.amount);
                    container.setItem(i, bucket);
                } catch (e) {
                }
            }
        }
    }
}, 80);

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
        // We need to simulate ice-like sliding or just push it.
        
        // Let's try pushing it in its facing direction constantly.
        const dirX = -Math.sin(rotation * (Math.PI / 180));
        const dirZ = Math.cos(rotation * (Math.PI / 180));
        
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