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
        let currentStage = 0; // 0 = source
        let baseId = typeId;
        
        if (typeId.endsWith("_down")) {
            return; 
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
        
        // 1. Survival Check (if not source)
        if (currentStage > 0) {
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
                    if (block.isValid()) block.setType("minecraft:air");
                });
                return;
            }
        }

        // 2. Flow Down
        const below = dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
        if (below && below.typeId === "minecraft:air") {
             const downId = baseId + "_down";
             system.run(() => {
                 if (below.isValid()) below.setType(downId);
             });
             return; 
        } else if (below && below.typeId === baseId + "_down") {
            return;
        }

        // 3. Flow Sideways (Next Stage)
        if (currentStage < 3) {
            const nextStageId = currentStage === 0 ? baseId + "1" : baseId + (currentStage + 1).toString();
            
            for (const dir of this.directions) {
                const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
                if (neighbor && neighbor.typeId === "minecraft:air") {
                    system.run(() => {
                        if (neighbor.isValid()) neighbor.setType(nextStageId);
                    });
                }
            }
        }
        
        // 4. Update Source Visuals (Only for Source Stage 0)
        if (currentStage === 0) {
            const perms = block.permutation.getAllStates();
            let changed = false;
            
            const checkDir = (dx, dy, dz, stateName) => {
                 const neighbor = dimension.getBlock({ x: block.location.x + dx, y: block.location.y + dy, z: block.location.z + dz });
                 const hasTag = neighbor && neighbor.hasTag("template_full");
                 const val = hasTag ? 1 : 0;
                 if (perms[stateName] !== val) {
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
                    if (block.isValid()) block.setPermutation(newPerm);
                });
            }
        }
    }
}

// Interaction Logic
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack } = event;
    
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
        }
    }
});

export function registerFluidComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:fluid_flow", new FluidFlowComponent());
}
