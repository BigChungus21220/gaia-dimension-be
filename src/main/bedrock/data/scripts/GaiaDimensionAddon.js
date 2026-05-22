// src/main/bedrock/ts/GaiaDimensionAddon.ts
import {
  system as system41
} from "@minecraft/server";

// src/main/bedrock/ts/blocks/leaves.ts
import {
  system
} from "@minecraft/server";

// src/main/bedrock/ts/config/leaves_particles_config.ts
var leafParticles = {
  "gaiadimension:pink_agate_leaves": "minecraft:cherry_leaves_particle",
  "gaiadimension:aura_leaves": "minecraft:spore_blossom_ambient"
};

// src/main/bedrock/ts/blocks/leaves.ts
var LeavesComponent = class {
  constructor() {
    this.onRandomTick = this.onRandomTick.bind(this);
  }
  /**
   * Spawns leaf particles randomly during a block tick.
   * @param {BlockComponentRandomTickEvent} event The block component random tick event.
   */
  onRandomTick(event) {
    if (Math.random() < 0.1) {
      const { block, dimension } = event;
      const particle = leafParticles[block.typeId];
      if (particle) {
        system.run(() => {
          if (!block.isValid) return;
          dimension.spawnParticle(particle, block.center());
        });
      }
    }
  }
};
function registerLeavesComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:leaves", new LeavesComponent());
}

// src/main/bedrock/ts/blocks/invisible.ts
import { world as world3, system as system4 } from "@minecraft/server";

// src/main/bedrock/ts/systems/event_manager.ts
import {
  world,
  system as system2,
  EquipmentSlot
} from "@minecraft/server";
var placeHandlers = [];
var breakBeforeHandlers = [];
var breakAfterHandlers = [];
var interactHandlers = [];
var spawnHandlers = [];
var joinHandlers = [];
function registerPlaceHandler(handler) {
  placeHandlers.push(handler);
}
function registerBreakHandler(handler) {
  if (handler.event === "before") {
    breakBeforeHandlers.push(handler);
  } else {
    breakAfterHandlers.push(handler);
  }
}
function registerInteractHandler(handler) {
  interactHandlers.push(handler);
}
function initializeEventManager() {
  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    system2.run(() => {
      for (const handler of placeHandlers) {
        if (handler.check(event.block)) {
          handler.execute(event);
        }
      }
    });
  });
  world.beforeEvents.playerBreakBlock.subscribe((event) => {
    for (const handler of breakBeforeHandlers) {
      if (handler.check(event.block)) {
        handler.execute(event);
      }
    }
  });
  world.afterEvents.playerBreakBlock.subscribe((event) => {
    system2.run(() => {
      for (const handler of breakAfterHandlers) {
        if (handler.check(event)) {
          handler.execute(event);
        }
      }
    });
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    const equippable = player.getComponent("minecraft:equippable");
    const mainHandItem = equippable?.getEquipment(EquipmentSlot.Mainhand);
    const isHoldingBow = mainHandItem?.typeId === "minecraft:bow";
    for (const handler of interactHandlers) {
      if (handler.check(block)) {
        handler.execute(event);
        if (isHoldingBow && event.cancel) {
          event.cancel = false;
        }
      }
    }
  });
  world.afterEvents.playerSpawn.subscribe((event) => {
    system2.run(() => {
      for (const handler of spawnHandlers) {
        handler(event);
      }
    });
  });
  world.afterEvents.playerJoin.subscribe((event) => {
    system2.run(() => {
      for (const handler of joinHandlers) {
        handler(event);
      }
    });
  });
}

// src/main/bedrock/ts/systems/destruction_handler.ts
import { world as world2, system as system3 } from "@minecraft/server";
var STAIRS_TAG = "gaiadimension:stairs";
var trackedBlocks = /* @__PURE__ */ new Map();
function trackBlock(block) {
  if (!block || !block.location) return;
  const locationStr = `${block.location.x},${block.location.y},${block.location.z}`;
  if (!trackedBlocks.has(locationStr)) {
    trackedBlocks.set(locationStr, {
      typeId: block.typeId,
      dimensionId: block.dimension.id
      // Cache the dimension ID
    });
  }
}
function untrackBlock(location) {
  if (!location) return;
  const locationStr = `${location.x},${location.y},${location.z}`;
  trackedBlocks.delete(locationStr);
}
function initializeDestructionHandlers() {
  system3.runInterval(() => {
    for (const [locationStr, blockData] of [...trackedBlocks.entries()]) {
      try {
        const dimension = world2.getDimension(blockData.dimensionId);
        const coords = locationStr.split(",");
        const location = {
          x: parseInt(coords[0]),
          y: parseInt(coords[1]),
          z: parseInt(coords[2])
        };
        const block = dimension.getBlock(location);
        if (!block || block.typeId !== blockData.typeId) {
          trackedBlocks.delete(locationStr);
          continue;
        }
        let isOrphan = false;
        if (block.typeId.includes("_invisible")) {
          const parentBlock = block.below();
          if (!parentBlock || !parentBlock.typeId.includes("_fence")) {
            isOrphan = true;
          }
        }
        if (block.typeId.includes("stairs_collision")) {
          const verticalHalf = block.permutation.getState("minecraft:vertical_half");
          const parentBlock = verticalHalf === "top" ? block.above() : block.below();
          if (!parentBlock || !parentBlock.hasTag(STAIRS_TAG)) {
            isOrphan = true;
          }
        }
        if (isOrphan) {
          block.setType("minecraft:air");
          trackedBlocks.delete(locationStr);
        }
      } catch (e) {
        trackedBlocks.delete(locationStr);
      }
    }
  }, 100);
}
var UNTRACKED_SCAN_INTERVAL = 149;
var UNTRACKED_SCAN_DISTANCE = 5;
system3.runInterval(() => {
  for (const player of world2.getAllPlayers()) {
    const headLoc = player.getHeadLocation();
    const direction = player.getViewDirection();
    const dimension = player.dimension;
    for (let i = 1; i <= UNTRACKED_SCAN_DISTANCE; i++) {
      const checkLoc = {
        x: Math.floor(headLoc.x + direction.x * i),
        y: Math.floor(headLoc.y + direction.y * i),
        z: Math.floor(headLoc.z + direction.z * i)
      };
      const locStr = `${checkLoc.x},${checkLoc.y},${checkLoc.z}`;
      if (trackedBlocks.has(locStr)) continue;
      try {
        const block = dimension.getBlock(checkLoc);
        if (block && (block.typeId.includes("_invisible") || block.typeId.includes("stairs_collision"))) {
          let isOrphan = false;
          if (block.typeId.includes("_invisible")) {
            const parentBlock = block.below();
            if (!parentBlock || !parentBlock.typeId.includes("_fence")) {
              isOrphan = true;
            }
          }
          if (block.typeId.includes("stairs_collision")) {
            const verticalHalf = block.permutation.getState("minecraft:vertical_half");
            const parentBlock = verticalHalf === "top" ? block.above() : block.below();
            if (!parentBlock || !parentBlock.hasTag(STAIRS_TAG)) {
              isOrphan = true;
            }
          }
          if (isOrphan) {
            block.setType("minecraft:air");
          }
          break;
        }
      } catch (e) {
        break;
      }
    }
  }
}, UNTRACKED_SCAN_INTERVAL);

// src/main/bedrock/ts/blocks/invisible.ts
var INVISIBLE_BLOCK_ID = "gaiadimension:invisible";
var InvisibleComponent = class {
};
function registerInvisibleComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent(INVISIBLE_BLOCK_ID, new InvisibleComponent());
  registerPlaceHandler({
    check: (block) => block.typeId.startsWith("gaiadimension:") && (block.typeId.includes("_fence") || block.typeId.includes("_wall")),
    execute: (event) => {
      system4.run(() => {
        const blockAbove = event.block.above();
        if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
          trackBlock(blockAbove);
        }
      });
    }
  });
  registerBreakHandler({
    event: "after",
    check: (event) => {
      try {
        const typeId = event.brokenBlockPermutation.type.id;
        return typeId.startsWith("gaiadimension:") && (typeId.includes("_fence") || typeId.includes("_wall"));
      } catch (e) {
        return false;
      }
    },
    execute: (event) => {
      const blockAbove = event.dimension.getBlock(event.block.location)?.above();
      if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
        untrackBlock(blockAbove.location);
        blockAbove.setType("minecraft:air");
      }
    }
  });
  world3.afterEvents.pistonActivate.subscribe((event) => {
    const { piston, dimension } = event;
    for (const location of piston.getAttachedBlocks()) {
      const block = dimension.getBlock(location);
      if (block && block.typeId.startsWith("gaiadimension:") && (block.typeId.includes("_fence") || block.typeId.includes("_wall"))) {
        const blockAbove = block.above();
        if (blockAbove?.typeId === INVISIBLE_BLOCK_ID) {
          untrackBlock(blockAbove.location);
          blockAbove.setType("minecraft:air");
        }
      }
    }
  });
}

// src/main/bedrock/ts/blocks/curtain.ts
import { system as system5, BlockPermutation, ItemStack } from "@minecraft/server";
var activeCurtains = [];
var relativeDirs = {
  "north": { left: "west", right: "east" },
  "south": { left: "east", right: "west" },
  "east": { left: "north", right: "south" },
  "west": { left: "south", right: "north" }
};
function initializeCurtainSystem() {
  system5.runInterval(() => {
    for (let i = activeCurtains.length - 1; i >= 0; i--) {
      const curtainInfo = activeCurtains[i];
      try {
        const block = curtainInfo.dimension.getBlock(curtainInfo.location);
        if (!block || block.typeId !== curtainInfo.typeId) {
          const isLower = curtainInfo.typeId.includes("_lower") || curtainInfo.typeId.includes("_bottom");
          const otherBlockLocation = {
            x: curtainInfo.location.x,
            y: curtainInfo.location.y + (isLower ? 1 : -1),
            z: curtainInfo.location.z
          };
          const otherBlock = curtainInfo.dimension.getBlock(otherBlockLocation);
          let expectedOtherTypeId = "";
          if (curtainInfo.typeId.includes("_lower")) {
            expectedOtherTypeId = curtainInfo.typeId.replace("_lower", "_upper");
          } else if (curtainInfo.typeId.includes("_bottom")) {
            expectedOtherTypeId = curtainInfo.typeId.replace("_bottom", "_top");
          } else if (curtainInfo.typeId.includes("_upper")) {
            expectedOtherTypeId = curtainInfo.typeId.replace("_upper", "_lower");
          } else if (curtainInfo.typeId.includes("_top")) {
            expectedOtherTypeId = curtainInfo.typeId.replace("_top", "_bottom");
          }
          if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
            otherBlock.setType("minecraft:air");
            const otherIndex = activeCurtains.findIndex((d) => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
            if (otherIndex > -1) {
              activeCurtains.splice(otherIndex, 1);
            }
          }
          activeCurtains.splice(i, 1);
        }
      } catch (error) {
        if (error.message.includes("Could not find block")) {
          activeCurtains.splice(i, 1);
        } else {
          console.error("Error checking curtain:", error);
        }
      }
    }
  }, 100);
}
function updateCustomCurtainsFromLever(leverBlock) {
  const isLeverOn = leverBlock.permutation.getState("open_bit");
  const newState = isLeverOn;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const checkLocation = {
          x: leverBlock.location.x + x,
          y: leverBlock.location.y + y,
          z: leverBlock.location.z + z
        };
        try {
          const checkBlock = leverBlock.dimension.getBlock(checkLocation);
          if (checkBlock && !checkBlock.isAir) {
            if (checkBlock.typeId.includes("gaiadimension:") && (checkBlock.typeId.includes("curtain") || checkBlock.typeId.includes("door"))) {
              let perm = checkBlock.permutation;
              if (perm.getState("gaiadimension:open") !== void 0) {
                checkBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                const isCurtain = checkBlock.typeId.includes("curtain");
                const openSound = isCurtain ? "item.book.page_turn" : "open.wooden_trapdoor";
                const closeSound = isCurtain ? "item.book.page_turn" : "close.wooden_trapdoor";
                checkBlock.dimension.playSound(newState ? openSound : closeSound, checkBlock.location, { volume: 1, pitch: 1 });
                if (checkBlock.typeId.includes("_lower") || checkBlock.typeId.includes("_bottom")) {
                  const upperBlock = checkBlock.above();
                  if (upperBlock && !upperBlock.isAir && (upperBlock.typeId.includes("_upper") || upperBlock.typeId.includes("_top"))) {
                    const upperPerm = upperBlock.permutation;
                    if (upperPerm.getState("gaiadimension:open") !== void 0) {
                      upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                      upperBlock.dimension.playSound(newState ? openSound : closeSound, upperBlock.location, { volume: 1, pitch: 1 });
                    }
                  }
                } else if (checkBlock.typeId.includes("_upper") || checkBlock.typeId.includes("_top")) {
                  const lowerBlock = checkBlock.below();
                  if (lowerBlock && !lowerBlock.isAir && (lowerBlock.typeId.includes("_lower") || lowerBlock.typeId.includes("_bottom"))) {
                    const lowerPerm = lowerBlock.permutation;
                    if (lowerPerm.getState("gaiadimension:open") !== void 0) {
                      lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
        }
      }
    }
  }
}
function toggleCustomCurtain(curtainBlock, player) {
  if (curtainBlock.typeId.includes("_lower") || curtainBlock.typeId.includes("_bottom")) {
    const upperBlock = curtainBlock.above();
    if (upperBlock && (upperBlock.typeId.includes("_upper") || upperBlock.typeId.includes("_top"))) {
      toggleCustomCurtain(upperBlock, player);
      return;
    }
  }
  const perm = curtainBlock.permutation;
  const openState = perm.getState("gaiadimension:open");
  if (openState === void 0) return;
  const newState = !openState;
  curtainBlock.setPermutation(perm.withState("gaiadimension:open", newState));
  const isCurtain = curtainBlock.typeId.includes("curtain");
  const openSound = isCurtain ? "item.book.page_turn" : "random.door_open";
  const closeSound = isCurtain ? "item.book.page_turn" : "random.door_close";
  player.playSound(newState ? openSound : closeSound, { location: curtainBlock.location, volume: 1, pitch: 1 });
  const isLower = curtainBlock.typeId.includes("_lower") || curtainBlock.typeId.includes("_bottom");
  const otherBlock = isLower ? curtainBlock.above() : curtainBlock.below();
  let expectedOtherTypeId = "";
  if (curtainBlock.typeId.includes("_lower")) {
    expectedOtherTypeId = curtainBlock.typeId.replace("_lower", "_upper");
  } else if (curtainBlock.typeId.includes("_bottom")) {
    expectedOtherTypeId = curtainBlock.typeId.replace("_bottom", "_top");
  } else if (curtainBlock.typeId.includes("_upper")) {
    expectedOtherTypeId = curtainBlock.typeId.replace("_upper", "_lower");
  } else if (curtainBlock.typeId.includes("_top")) {
    expectedOtherTypeId = curtainBlock.typeId.replace("_top", "_bottom");
  }
  if (otherBlock && otherBlock.typeId === expectedOtherTypeId) {
    const otherPerm = otherBlock.permutation;
    if (otherPerm.getState("gaiadimension:open") !== void 0) {
      otherBlock.setPermutation(otherPerm.withState("gaiadimension:open", newState));
    }
  }
}
function toggleTrapdoor(block, player) {
  const isOpen = block.permutation.getState("gaiadimension:open");
  const newState = !isOpen;
  block.setPermutation(block.permutation.withState("gaiadimension:open", newState));
  player.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", { location: block.location, volume: 1, pitch: 1 });
}
function isValidNeighbor(neighbor, typeId, rotation) {
  return !!(neighbor && neighbor.typeId === typeId && neighbor.permutation.getState("minecraft:cardinal_direction") === rotation);
}
function updateToDouble(block, side) {
  system5.run(() => {
    try {
      const newTypeId = block.typeId + "_" + side;
      const topBlock = block.above();
      if (!topBlock) return;
      const newTopTypeId = topBlock.typeId + "_" + side;
      const perm = block.permutation;
      const open = perm.getState("gaiadimension:open");
      const facing = perm.getState("minecraft:cardinal_direction");
      block.setType(newTypeId);
      const newPerm = block.permutation.withState("gaiadimension:open", open).withState("minecraft:cardinal_direction", facing);
      block.setPermutation(newPerm);
      updateActiveCurtainType(block.location, newTypeId);
      if (topBlock) {
        topBlock.setType(newTopTypeId);
        const newTopPerm = topBlock.permutation.withState("gaiadimension:open", open).withState("minecraft:cardinal_direction", facing);
        topBlock.setPermutation(newTopPerm);
        updateActiveCurtainType(topBlock.location, newTopTypeId);
      }
    } catch (e) {
      console.warn("Failed to form double curtain:", e);
    }
  });
}
function updateActiveCurtainType(location, newTypeId) {
  const entry = activeCurtains.find((c) => c.location.x === location.x && c.location.y === location.y && c.location.z === location.z);
  if (entry) {
    entry.typeId = newTypeId;
  }
}
function destroyPartner(block, dimension) {
  system5.run(() => {
    try {
      const typeId = block.typeId;
      const itemName = typeId.replace("_lower", "").replace("_upper", "").replace("_bottom", "").replace("_top", "").replace("_left", "").replace("_right", "");
      try {
        dimension.spawnItem(new ItemStack(itemName, 1), block.location);
      } catch (e) {
      }
      block.setType("minecraft:air");
      removeFromActiveCurtains(block.location);
      const isBottom = typeId.includes("_bottom") || typeId.includes("_lower");
      const otherVertical = isBottom ? block.above() : block.below();
      const isValidVertical = otherVertical && (isBottom ? otherVertical.typeId.includes("_top") || otherVertical.typeId.includes("_upper") : otherVertical.typeId.includes("_bottom") || otherVertical.typeId.includes("_lower"));
      if (otherVertical && isValidVertical) {
        otherVertical.setType("minecraft:air");
        removeFromActiveCurtains(otherVertical.location);
      }
    } catch (e) {
      console.warn("Failed to destroy partner curtain:", e);
    }
  });
}
function removeFromActiveCurtains(location) {
  const index = activeCurtains.findIndex((d) => d.location.x === location.x && d.location.y === location.y && d.location.z === location.z);
  if (index > -1) {
    activeCurtains.splice(index, 1);
  }
}
function registerCurtainComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:curtain", {});
  initializeCurtainSystem();
  registerPlaceHandler({
    check: (block) => block.typeId.includes("_lower") || block.typeId.includes("_bottom"),
    execute: (event) => {
      const { block } = event;
      activeCurtains.push({ location: block.location, dimension: block.dimension, typeId: block.typeId });
      const blockAbove = block.above();
      if (blockAbove?.isAir) {
        const lowerPerm = block.permutation;
        const rotation = lowerPerm.getState("minecraft:cardinal_direction");
        let upperBlockId = "";
        if (block.typeId.includes("_lower")) {
          upperBlockId = block.typeId.replace("_lower", "_upper");
        } else if (block.typeId.includes("_bottom")) {
          upperBlockId = block.typeId.replace("_bottom", "_top");
        }
        try {
          const upperPerm = BlockPermutation.resolve(upperBlockId, {
            "minecraft:cardinal_direction": rotation
          });
          blockAbove.setPermutation(upperPerm);
          activeCurtains.push({ location: blockAbove.location, dimension: blockAbove.dimension, typeId: upperBlockId });
          if ((block.typeId.includes("_bottom") || block.typeId.includes("_lower")) && !block.typeId.includes("_left") && !block.typeId.includes("_right")) {
            const dirs = relativeDirs[rotation];
            if (dirs) {
              const rightNeighbor = block[dirs.right]();
              if (isValidNeighbor(rightNeighbor, block.typeId, rotation)) {
                updateToDouble(block, "left");
                updateToDouble(rightNeighbor, "right");
              } else {
                const leftNeighbor = block[dirs.left]();
                if (isValidNeighbor(leftNeighbor, block.typeId, rotation)) {
                  updateToDouble(leftNeighbor, "left");
                  updateToDouble(block, "right");
                }
              }
            }
          }
          for (const dir of ["north", "south", "east", "west"]) {
            const neighbor = block[dir]();
            if (neighbor?.typeId === block.typeId && neighbor.permutation.getState("minecraft:cardinal_direction") === rotation) {
              if (neighbor.permutation.getState("gaiadimension:inverse") === false) {
                block.setPermutation(block.permutation.withState("gaiadimension:inverse", true));
                blockAbove.setPermutation(blockAbove.permutation.withState("gaiadimension:inverse", true));
                break;
              }
            }
          }
        } catch (e) {
          console.error(`Could not resolve upper curtain permutation or double curtain logic for ${block.typeId}: ${e}`);
        }
      }
    }
  });
  registerBreakHandler({
    event: "before",
    check: (block) => block.typeId.includes("curtain") || block.typeId.includes("door"),
    execute: (event) => {
      const { block, player } = event;
      if (!block || !block.isValid) return;
      const location = block.location;
      const dimension = block.dimension;
      const brokenBlockTypeId = block.typeId;
      const index = activeCurtains.findIndex((d) => d.location.x === location.x && d.location.y === location.y && d.location.z === location.z);
      if (index > -1) {
        activeCurtains.splice(index, 1);
      }
      if (brokenBlockTypeId.includes("_left") || brokenBlockTypeId.includes("_right")) {
        const rotation = block.permutation.getState("minecraft:cardinal_direction");
        const dirs = relativeDirs[rotation];
        const isLeft = brokenBlockTypeId.includes("_left");
        if (dirs) {
          const partnerDir = isLeft ? dirs.right : dirs.left;
          const partner = block[partnerDir]();
          const baseType = brokenBlockTypeId.replace("_left", "").replace("_right", "");
          const partnerSuffix = isLeft ? "_right" : "_left";
          const expectedPartnerType = baseType + partnerSuffix;
          if (partner && partner.typeId === expectedPartnerType && partner.permutation.getState("minecraft:cardinal_direction") === rotation) {
            destroyPartner(partner, dimension);
          }
        }
      }
      const isLower = brokenBlockTypeId.includes("_lower") || brokenBlockTypeId.includes("_bottom");
      const otherBlockLocation = {
        x: location.x,
        y: location.y + (isLower ? 1 : -1),
        z: location.z
      };
      const otherIndex = activeCurtains.findIndex((d) => d.location.x === otherBlockLocation.x && d.location.y === otherBlockLocation.y && d.location.z === otherBlockLocation.z);
      if (otherIndex > -1) {
        activeCurtains.splice(otherIndex, 1);
      }
      const otherBlock = dimension.getBlock(otherBlockLocation);
      if (otherBlock && (otherBlock.typeId.includes("curtain") || otherBlock.typeId.includes("door"))) {
        let expectedOtherBlockId = "";
        if (brokenBlockTypeId.includes("_lower")) {
          expectedOtherBlockId = brokenBlockTypeId.replace("_lower", "_upper");
        } else if (brokenBlockTypeId.includes("_bottom")) {
          expectedOtherBlockId = brokenBlockTypeId.replace("_bottom", "_top");
        } else if (brokenBlockTypeId.includes("_upper")) {
          expectedOtherBlockId = brokenBlockTypeId.replace("_upper", "_lower");
        } else if (brokenBlockTypeId.includes("_top")) {
          expectedOtherBlockId = brokenBlockTypeId.replace("_top", "_bottom");
        }
        if (otherBlock.typeId === expectedOtherBlockId) {
          if (player.getGameMode() !== "creative") {
            const itemName = otherBlock.typeId.replace("_lower", "").replace("_upper", "").replace("_bottom", "").replace("_top", "").replace("_left", "").replace("_right", "");
            system5.run(() => {
              try {
                dimension.spawnItem(new ItemStack(itemName, 1), otherBlock.location);
              } catch (e) {
              }
            });
          }
          system5.run(() => {
            const blockToSet = dimension.getBlock(otherBlockLocation);
            if (blockToSet && blockToSet.typeId === expectedOtherBlockId) {
              blockToSet.setType("minecraft:air");
            }
          });
        }
      }
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId.includes("curtain") || block.typeId.includes("door") || block.typeId.includes("trapdoor"),
    execute: (event) => {
      const { block, player } = event;
      system5.run(() => {
        if (block.typeId.includes("trapdoor")) {
          toggleTrapdoor(block, player);
        } else {
          toggleCustomCurtain(block, player);
        }
      });
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId.startsWith("minecraft:") && block.typeId.includes("lever"),
    execute: (event) => {
      const { block } = event;
      system5.run(() => {
        updateCustomCurtainsFromLever(block);
      });
    }
  });
}

// src/main/bedrock/ts/blocks/wood.ts
import {
  world as world5,
  system as system6,
  BlockPermutation as BlockPermutation2,
  GameMode as GameMode2,
  Direction
} from "@minecraft/server";
function handleDoubleSlab(player, block, mainhandItem) {
  let plankId = block.typeId.replace("_slab", "_planks");
  try {
    block.setType(plankId);
  } catch (e) {
    try {
      plankId = block.typeId.replace("_slab", "_tiles");
      block.setType(plankId);
    } catch (e2) {
      console.warn(`Failed to find plank or tile type for ${block.typeId}`);
      return;
    }
  }
  try {
    player.playSound("dig.wood");
    if (player.getGameMode() === GameMode2.creative) {
      return;
    }
    const equippable = player.getComponent("equippable");
    if (!equippable) {
      return;
    }
    if (mainhandItem.amount > 1) {
      mainhandItem.amount--;
      equippable.setEquipment("Mainhand", mainhandItem);
    } else {
      equippable.setEquipment("Mainhand");
    }
  } catch (e) {
    console.warn(`Error in handleDoubleSlab post-placement: ${e}`);
  }
}
function registerWoodComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:wood", {});
  world5.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack, blockFace } = event;
    if (block.typeId.includes("_slab") && !block.typeId.includes("sandstone") && itemStack?.typeId === block.typeId) {
      const slabState = block.permutation.getState("minecraft:vertical_half");
      const isPlacingOnTop = blockFace === Direction.Up && slabState === "bottom";
      const isPlacingOnBottom = blockFace === Direction.Down && slabState === "top";
      if (isPlacingOnTop || isPlacingOnBottom) {
        event.cancel = true;
        system6.run(() => {
          if (block.isValid && itemStack) {
            handleDoubleSlab(player, block, itemStack);
          }
        });
      }
    } else if (itemStack?.hasTag("minecraft:is_axe")) {
      event.cancel = true;
      system6.run(() => {
        const blockId = block.typeId;
        if (blockId.includes("stripped") || blockId.includes("_thin_branches")) return;
        let strippedId;
        if (blockId.includes("_log") || blockId.includes("_wood")) {
          const parts = blockId.split(":");
          strippedId = `${parts[0]}:stripped_${parts[1]}`;
        }
        if (strippedId && block.isValid) {
          if (blockId.startsWith("minecraft:")) {
            const blockState = block.permutation.getState("pillar_axis");
            if (typeof blockState === "string") {
              const strippedLog = BlockPermutation2.resolve(strippedId, { "pillar_axis": blockState });
              block.setPermutation(strippedLog);
            }
          } else {
            const blockState = block.permutation.getState("minecraft:block_face");
            if (typeof blockState === "string") {
              const strippedLog = BlockPermutation2.resolve(strippedId, { "minecraft:block_face": blockState });
              block.setPermutation(strippedLog);
            }
          }
          player.playSound("step.wood");
        }
      });
    }
  });
}

// src/main/bedrock/ts/blocks/sapling.ts
import {
  GameMode as GameMode3,
  system as system7,
  ItemStack as ItemStack3,
  EquipmentSlot as EquipmentSlot2
} from "@minecraft/server";

// src/main/bedrock/ts/config/sapling_config.ts
var saplingConfig = {
  "gaiadimension:aura_sapling": {
    structures: ["gaiadimension:aura1"],
    ground: ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:mycelium", "minecraft:sand"],
    offset: { x: -7, y: 0, z: -7 }
  },
  "gaiadimension:pink_agate_sapling": {
    structures: ["gaiadimension:pink_agate_tree"],
    // Placeholder structure name
    ground: ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:mycelium", "gaiadimension:pink_agate_moss"],
    // Assuming moss or similar exists, otherwise standard ground
    offset: { x: -2, y: 0, z: -2 }
    // Adjust offset based on tree size
  }
};

// src/main/bedrock/ts/blocks/sapling.ts
var SaplingComponent = class {
  // Component logic moved to handlers
};
function registerSaplingComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:sapling", new SaplingComponent());
  registerPlaceHandler({
    check: (block) => block.typeId in saplingConfig,
    execute: (event) => {
      const { block } = event;
      system7.run(() => {
        if (!block.isValid) return;
        const blockBelow = block.below();
        const config = saplingConfig[block.typeId];
        if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
          block.dimension.spawnItem(new ItemStack3(block.typeId, 1), block.location);
          block.setType("minecraft:air");
        }
      });
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId in saplingConfig,
    execute: (event) => {
      system7.run(() => {
        const { block, player, itemStack } = event;
        if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
          const config = saplingConfig[block.typeId];
          if (config && Math.random() < 0.25) {
            block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
            const structureName = config.structures[Math.floor(Math.random() * config.structures.length)];
            block.setType("minecraft:air");
            const offset = config.offset || { x: 0, y: 0, z: 0 };
            const location = {
              x: block.location.x + offset.x,
              y: block.location.y + offset.y,
              z: block.location.z + offset.z
            };
            try {
              block.dimension.runCommand(`structure load "${structureName}" ${location.x} ${location.y} ${location.z}`);
            } catch (e) {
              console.warn(`Failed to load structure ${structureName}: ${e}`);
            }
            if (player.getGameMode() !== GameMode3.Creative) {
              const equippable = player.getComponent("minecraft:equippable");
              if (itemStack.amount > 1) {
                itemStack.amount--;
                equippable.setEquipment(EquipmentSlot2.Mainhand, itemStack);
              } else {
                equippable.setEquipment(EquipmentSlot2.Mainhand);
              }
            }
          } else if (config) {
            block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
            if (player.getGameMode() !== GameMode3.Creative) {
              const equippable = player.getComponent("minecraft:equippable");
              if (itemStack.amount > 1) {
                itemStack.amount--;
                equippable.setEquipment(EquipmentSlot2.Mainhand, itemStack);
              } else {
                equippable.setEquipment(EquipmentSlot2.Mainhand);
              }
            }
          }
        }
      });
    }
  });
}

// src/main/bedrock/ts/blocks/button.ts
import { system as system10 } from "@minecraft/server";

// src/main/bedrock/ts/systems/Redstone.ts
import { system as system9 } from "@minecraft/server";

// src/main/bedrock/ts/utils.ts
import { world as world6, system as system8 } from "@minecraft/server";
var VANILLA_DIMENSION_IDS = ["overworld", "the_end", "nether"];
var registeredDimensionIds = [];
function registerDimension(id) {
  if (!registeredDimensionIds.includes(id)) {
    registeredDimensionIds.push(id);
  }
}
function getDimensions() {
  const dims = [];
  for (const id of [...VANILLA_DIMENSION_IDS, ...registeredDimensionIds]) {
    try {
      dims.push(world6.getDimension(id));
    } catch {
    }
  }
  return dims;
}
function playDoorSound(block, isOpen, options = {}) {
  if (!block || !block.location || !block.dimension) {
    console.warn("Invalid block provided to playDoorSound.");
    return;
  }
  const typeId = block.typeId.toLowerCase();
  let soundId;
  if (typeId.includes("iron_door")) {
    soundId = isOpen ? "open.iron_door" : "close.iron_door";
  } else if (typeId.includes("wooden_door") || typeId.includes("door")) {
    soundId = isOpen ? "open.wooden_door" : "close.wooden_door";
  } else if (typeId.includes("iron_trapdoor")) {
    soundId = isOpen ? "open.iron_trapdoor" : "close.iron_trapdoor";
  } else if (typeId.includes("trapdoor")) {
    soundId = isOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor";
  } else if (typeId.includes("fence_gate")) {
    soundId = isOpen ? "open.fence_gate" : "close.fence_gate";
  } else {
    soundId = "random.click";
  }
  const soundOptions = {
    volume: options.volume ?? 1,
    pitch: options.pitch ?? 1
  };
  block.dimension.playSound(soundId, block.location, soundOptions);
}
var REDSTONE_COMPONENTS = ["redstone_wire", "repeater", "comparator", "redstone_torch"];
var invertFace = {
  "north": "south",
  "south": "north",
  "east": "west",
  "west": "east",
  "above": "below",
  "below": "above"
};
function getRedstonePower(block) {
  let power = block.getRedstonePower() ?? 0;
  if (power > 0) return power;
  const faces = ["north", "south", "east", "west", "below", "above"];
  for (const face of faces) {
    let neighbor;
    if (face === "north") neighbor = block.north();
    else if (face === "south") neighbor = block.south();
    else if (face === "east") neighbor = block.east();
    else if (face === "west") neighbor = block.west();
    else if (face === "above") neighbor = block.above();
    else if (face === "below") neighbor = block.below();
    if (!neighbor) continue;
    const neighborPower = neighbor.getRedstonePower() ?? 0;
    if (neighborPower > 0) {
      const isSpecialComponent = REDSTONE_COMPONENTS.some((c) => neighbor.typeId.includes(c));
      if (!isSpecialComponent) {
        return neighborPower;
      }
    }
    if (neighbor.typeId.includes("redstone_torch")) {
      const torchFacing = neighbor.permutation.getState("torch_facing_direction");
      if (torchFacing !== invertFace[face]) {
        return neighborPower;
      }
    }
  }
  const above = block.above();
  if (above?.typeId === "minecraft:daylight_detector") {
    return above.getRedstonePower() ?? 0;
  }
  return 0;
}
function sleep(ticks) {
  return new Promise((resolve) => system8.runTimeout(resolve, ticks));
}

// src/main/bedrock/ts/systems/Redstone.ts
var RedstoneControl = class {
  /**
   * Maps door keys to tracker info.
   * Internal map to keep track of doors being polled for redstone changes.
   */
  static doorTrackers = /* @__PURE__ */ new Map();
  /**
   * Wakes up the door tracking system for a specific source.
   * Call this when a button/plate is pressed.
   * @param sourceBlock - The block that initiated the signal (e.g., a button or pressure plate)
   */
  static updateRedstonePower(sourceBlock) {
    if (!sourceBlock) return;
    const doorInfos = this.traceNetworkForDoors(sourceBlock);
    for (const doorInfo of doorInfos) {
      this.trackDoor(doorInfo.block, sourceBlock);
      const doorKey = this.getBlockKey(doorInfo.block.location);
      this.checkDoorTracker(doorKey);
    }
  }
  /**
   * Adds a door to be tracked for signal timeout.
   * @param doorBlock - The door block to track
   * @param sourceBlock - The block providing the signal
   */
  static trackDoor(doorBlock, sourceBlock) {
    if (!doorBlock) return;
    let primaryDoorBlock = doorBlock;
    if (doorBlock.typeId.includes("door") && doorBlock.typeId.includes("_upper")) {
      const lowerBlock = doorBlock.below();
      if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
        primaryDoorBlock = lowerBlock;
      }
    }
    const doorKey = this.getBlockKey(primaryDoorBlock.location);
    let tracker = this.doorTrackers.get(doorKey);
    if (!tracker) {
      tracker = {
        doorBlock: primaryDoorBlock,
        lastSignalTick: system9.currentTick,
        checkInterval: null
      };
      this.doorTrackers.set(doorKey, tracker);
    } else {
      tracker.lastSignalTick = system9.currentTick;
    }
    if (tracker.checkInterval === null) {
      tracker.checkInterval = system9.runInterval(() => {
        this.checkDoorTracker(doorKey);
      }, 5);
    }
  }
  /**
   * Checks a door tracker and handles redstone power logic.
   * @param doorKey - The unique key identifying the door
   */
  static checkDoorTracker(doorKey) {
    const tracker = this.doorTrackers.get(doorKey);
    if (!tracker) return;
    if (!tracker.doorBlock.isValid) {
      this.stopTracking(doorKey);
      return;
    }
    const { x, y, z } = tracker.doorBlock.location;
    const dimension = tracker.doorBlock.dimension;
    let hasActiveSignal = false;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          const checkPos = { x: x + dx, y: y + dy, z: z + dz };
          const checkBlock = dimension.getBlock(checkPos);
          if (!checkBlock) continue;
          const redstonePower = getRedstonePower(checkBlock);
          if (redstonePower > 0) {
            hasActiveSignal = true;
            break;
          }
        }
        if (hasActiveSignal) break;
      }
      if (hasActiveSignal) break;
    }
    this.setDoorState(tracker.doorBlock, hasActiveSignal);
    if (!hasActiveSignal) {
      this.stopTracking(doorKey);
    }
  }
  /**
   * Stops tracking a door and clears its interval.
   * @param doorKey - The unique key identifying the door
   */
  static stopTracking(doorKey) {
    const tracker = this.doorTrackers.get(doorKey);
    if (tracker && tracker.checkInterval !== null) {
      system9.clearRun(tracker.checkInterval);
      tracker.checkInterval = null;
    }
    this.doorTrackers.delete(doorKey);
  }
  /**
   * Sets the state of a door (open or closed) and plays appropriate sounds.
   * @param doorBlock - The primary door block to update
   * @param open - True to open the door, false to close it
   */
  static setDoorState(doorBlock, open) {
    try {
      let lowerDoor = doorBlock;
      let upperDoor = void 0;
      if (doorBlock.typeId.includes("_upper")) {
        lowerDoor = doorBlock.below();
        upperDoor = doorBlock;
      } else {
        upperDoor = doorBlock.above();
      }
      const updateBlock = (block) => {
        if (!block || !block.isValid || !block.typeId.includes("door")) return;
        const perm = block.permutation;
        const isOpen = perm.getState("gaiadimension:open") === true;
        if (isOpen !== open) {
          block.setPermutation(perm.withState("gaiadimension:open", open));
          playDoorSound(block, open);
        }
      };
      updateBlock(lowerDoor);
      updateBlock(upperDoor);
    } catch (e) {
      console.warn("Error setting door state", e);
    }
  }
  /**
   * Compatibility wrapper: starts tracking and forcing an immediate state check.
   * @param doorBlock - The door block to open/track
   * @param sourceBlock - The block that triggered the opening
   */
  static openAndTrackDoor(doorBlock, sourceBlock) {
    this.trackDoor(doorBlock, sourceBlock);
    const key = this.getBlockKey(doorBlock.location);
    this.checkDoorTracker(key);
  }
  /**
   * Updates an existing tracker or creates a new one.
   * @param doorBlock - The door block to track
   * @param sourceBlock - The source of the redstone signal
   */
  static updateDoorTracker(doorBlock, sourceBlock) {
    this.trackDoor(doorBlock, sourceBlock);
  }
  /**
   * Traces the redstone network to find custom doors.
   * Uses simple connectivity logic (searching neighbors recursively).
   * @param sourceBlock - The starting block for tracing
   * @param maxDepth - Maximum recursion depth for the search
   * @returns Array of door block wrappers
   */
  static traceNetworkForDoors(sourceBlock, maxDepth = 15) {
    if (!sourceBlock) return [];
    const foundDoors = [];
    const visited = /* @__PURE__ */ new Set();
    const queue = [{ block: sourceBlock, depth: 0 }];
    const dimension = sourceBlock.dimension;
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { block, depth } = item;
      if (depth > maxDepth) continue;
      const blockKey = this.getBlockKey(block.location);
      if (visited.has(blockKey)) continue;
      visited.add(blockKey);
      const neighbors = this.getNeighbors(block.location);
      for (const neighborLoc of neighbors) {
        const neighborBlock = dimension.getBlock(neighborLoc);
        if (!neighborBlock || neighborBlock.isAir) continue;
        if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
          const doorKey = this.getBlockKey(neighborBlock.location);
          if (!foundDoors.some((d) => this.getBlockKey(d.block.location) === doorKey)) {
            foundDoors.push({ block: neighborBlock });
          }
        }
        if (depth < maxDepth && this.isRedstoneConductor(neighborBlock)) {
          queue.push({ block: neighborBlock, depth: depth + 1 });
        }
      }
    }
    return foundDoors;
  }
  /**
   * Determines if a block can conduct/transmit redstone signals.
   * @param block - The block to check
   * @returns True if the block is a redstone component or conductor
   */
  static isRedstoneConductor(block) {
    if (!block) return false;
    const typeId = block.typeId;
    return typeId === "minecraft:redstone_wire" || typeId.includes("repeater") || typeId.includes("redstone_torch") || typeId === "minecraft:redstone_block" || typeId.includes("piston") || typeId.includes("comparator");
  }
  /**
   * Helper to get adjacent block coordinates.
   * @param location - The starting coordinates
   * @returns Array of 6 adjacent Vector3 positions
   */
  static getNeighbors(location) {
    const { x, y, z } = location;
    return [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y: y + 1, z },
      { x, y: y - 1, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 }
    ];
  }
  /**
   * Converts a location to a string key for Map usage.
   * @param location - The block coordinates
   * @returns A string in format "x,y,z"
   */
  static getBlockKey(location) {
    return `${location.x},${location.y},${location.z}`;
  }
};

// src/main/bedrock/ts/blocks/button.ts
var BUTTON_SUFFIX = "_button";
var PRESS_DURATION = 1.5 * 20;
var VANILLA_BUTTON_DURATION = 1.5 * 20;
function isCustomButton(blockTypeId) {
  return blockTypeId.endsWith(BUTTON_SUFFIX);
}
function getSoundName(blockTypeId, isPressing) {
  if (isCustomButton(blockTypeId)) {
    return isPressing ? "click_on.bamboo_wood_button" : "click_off.bamboo_wood_button";
  }
  return "";
}
function findSolidBlock(buttonBlock) {
  const blockFace = buttonBlock.permutation.getState("minecraft:block_face");
  switch (blockFace) {
    case "down":
      return buttonBlock.above();
    case "up":
      return buttonBlock.below();
    case "north":
      return buttonBlock.south();
    case "south":
      return buttonBlock.north();
    case "west":
      return buttonBlock.east();
    case "east":
      return buttonBlock.west();
    default:
      return void 0;
  }
}
function updateCustomDoorsOnly(buttonBlock, newState) {
  const dimension = buttonBlock.dimension;
  const center = buttonBlock.location;
  const checkedDoors = /* @__PURE__ */ new Set();
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const checkLocation = { x: center.x + x, y: center.y + y, z: center.z + z };
        const block = dimension.getBlock(checkLocation);
        if (block && block.typeId.includes("door") && !block.typeId.includes("trapdoor")) {
          let lowerHalf, upperHalf;
          if (block.typeId.includes("_lower")) {
            lowerHalf = block;
            upperHalf = block.above();
          } else if (block.typeId.includes("_upper")) {
            upperHalf = block;
            lowerHalf = block.below();
          } else {
            continue;
          }
          if (!lowerHalf || !upperHalf || !lowerHalf.typeId.includes("_lower") || !upperHalf.typeId.includes("_upper")) {
            continue;
          }
          const lowerKey = `${lowerHalf.location.x},${lowerHalf.location.y},${lowerHalf.location.z}`;
          if (checkedDoors.has(lowerKey)) {
            continue;
          }
          checkedDoors.add(lowerKey);
          const blocksToToggle = [lowerHalf, upperHalf];
          for (const doorBlock of blocksToToggle) {
            const perm = doorBlock.permutation;
            const isOpen = perm.getState("gaiadimension:open");
            if (isOpen !== void 0 && isOpen !== newState) {
              doorBlock.setPermutation(perm.withState("gaiadimension:open", newState));
              doorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", doorBlock.location, { volume: 1, pitch: 1 });
              if (newState) {
                RedstoneControl.openAndTrackDoor(doorBlock, buttonBlock);
              } else {
                RedstoneControl.updateDoorTracker(doorBlock, buttonBlock);
              }
            }
          }
        }
      }
    }
  }
}
function handleCustomButtonPress(player, block) {
  const currentState = block.permutation.getState("gaiadimension:pressed");
  if (currentState === false) {
    block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
    const pressSound = getSoundName(block.typeId, true);
    if (pressSound) {
      player.playSound(pressSound, { location: block.location, volume: 1, pitch: 1 });
    }
    const attachedBlock = findSolidBlock(block);
    if (attachedBlock) {
      RedstoneControl.updateRedstonePower(block);
    }
    system10.runTimeout(() => {
      if (block.isValid) {
        try {
          block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
        } catch (e) {
        }
        const releaseSound = getSoundName(block.typeId, false);
        if (releaseSound) {
          player.playSound(releaseSound, { location: block.location, volume: 1, pitch: 1 });
        }
      }
    }, PRESS_DURATION);
  }
}
function registerButtonComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:button", {});
  registerInteractHandler({
    check: (block) => block.typeId.startsWith("minecraft:") && (block.typeId.includes("button") || block.typeId.includes("lever")),
    execute: (event) => {
      system10.run(() => {
        const { player, block } = event;
        if (block.typeId.includes("button")) {
          updateCustomDoorsOnly(block, true);
          const foundDoors = RedstoneControl.traceNetworkForDoors(block);
          for (const doorInfo of foundDoors) {
            RedstoneControl.openAndTrackDoor(doorInfo.block, block);
          }
          system10.runTimeout(() => {
            updateCustomDoorsOnly(block, false);
          }, VANILLA_BUTTON_DURATION);
        } else if (block.typeId.includes("lever")) {
          updateCustomDoorsOnly(block, true);
          const foundDoors = RedstoneControl.traceNetworkForDoors(block);
          for (const doorInfo of foundDoors) {
            RedstoneControl.openAndTrackDoor(doorInfo.block, block);
          }
        }
      });
    }
  });
  registerInteractHandler({
    check: (block) => isCustomButton(block.typeId),
    execute: (event) => {
      system10.run(() => handleCustomButtonPress(event.player, event.block));
    }
  });
}

// src/main/bedrock/ts/blocks/pressure_plate.ts
import { system as system11, world as world7 } from "@minecraft/server";
var PRESSURE_PLATE_SUFFIX = "_pressure_plate";
var doorStates = /* @__PURE__ */ new Map();
function isPressurePlate(blockTypeId) {
  if (blockTypeId.startsWith("minecraft:")) {
    return false;
  }
  return blockTypeId.endsWith(PRESSURE_PLATE_SUFFIX);
}
function isVanillaPressurePlate(blockTypeId) {
  return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("pressure_plate");
}
function updateNeighbors(block, newState, sourceId) {
  const directions = ["north", "south", "east", "west"];
  for (const dir of directions) {
    let neighborBlock;
    try {
      if (dir === "north") neighborBlock = block.north();
      else if (dir === "south") neighborBlock = block.south();
      else if (dir === "east") neighborBlock = block.east();
      else if (dir === "west") neighborBlock = block.west();
    } catch (e) {
    }
    if (neighborBlock) {
      const perm = neighborBlock.permutation;
      if (neighborBlock.typeId.startsWith("gaiadimension:") && neighborBlock.typeId.includes("door")) {
        if (perm.getState("gaiadimension:open") !== void 0) {
          const oldState = perm.getState("gaiadimension:open");
          const doorKey = `${neighborBlock.dimension.id},${neighborBlock.location.x},${neighborBlock.location.y},${neighborBlock.location.z}`;
          const currentDoorState = doorStates.get(doorKey) || false;
          if (currentDoorState !== newState) {
            neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
            if (oldState !== newState) {
              neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
            }
            doorStates.set(doorKey, newState);
            if (newState) {
              RedstoneControl.openAndTrackDoor(neighborBlock, block);
            } else {
              RedstoneControl.updateDoorTracker(neighborBlock, block);
            }
          }
          doorStates.set(doorKey, newState);
        }
        if (neighborBlock.typeId.includes("_lower")) {
          const upperBlock = neighborBlock.above();
          if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
            const upperPerm = upperBlock.permutation;
            if (upperPerm.getState("gaiadimension:open") !== void 0) {
              const oldState = upperPerm.getState("gaiadimension:open");
              const upperDoorKey = `${upperBlock.dimension.id},${upperBlock.location.x},${upperBlock.location.y},${upperBlock.location.z}`;
              const currentUpperDoorState = doorStates.get(upperDoorKey) || false;
              if (currentUpperDoorState !== newState) {
                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                if (oldState !== newState) {
                  upperBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, { volume: 1, pitch: 1 });
                }
                doorStates.set(upperDoorKey, newState);
              }
            }
          }
        } else if (neighborBlock.typeId.includes("_upper")) {
          const lowerBlock = neighborBlock.below();
          if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
            const lowerPerm = lowerBlock.permutation;
            if (lowerPerm.getState("gaiadimension:open") !== void 0) {
              const oldState = lowerPerm.getState("gaiadimension:open");
              const lowerDoorKey = `${lowerBlock.dimension.id},${lowerBlock.location.x},${lowerBlock.location.y},${lowerBlock.location.z}`;
              const currentLowerDoorState = doorStates.get(lowerDoorKey) || false;
              if (currentLowerDoorState !== newState) {
                lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                if (oldState !== newState) {
                  lowerBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, { volume: 1, pitch: 1 });
                }
                doorStates.set(lowerDoorKey, newState);
              }
            }
          }
        }
      } else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open_bit") !== void 0 && !neighborBlock.typeId.includes("lever")) {
        const oldState = perm.getState("open_bit");
        neighborBlock.setPermutation(perm.withState("open_bit", newState));
        if (oldState !== newState) {
          neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
        }
      } else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open") !== void 0 && !neighborBlock.typeId.includes("lever")) {
        const oldState = perm.getState("open");
        neighborBlock.setPermutation(perm.withState("open", newState));
        if (oldState !== newState) {
          neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, { volume: 1, pitch: 1 });
        }
      }
    }
  }
  if (newState) {
    RedstoneControl.updateRedstonePower(block);
  }
}
function checkAdjacentCustomDoors(block, open) {
  const dimension = block.dimension;
  const { x, y, z } = block.location;
  const adjacentPositions = [
    { x: x + 1, y, z },
    { x: x - 1, y, z },
    { x, y, z: z + 1 },
    { x, y, z: z - 1 },
    { x, y: y + 1, z },
    { x, y: y - 1, z }
  ];
  for (const pos of adjacentPositions) {
    const adjacentBlock = dimension.getBlock(pos);
    if (adjacentBlock && adjacentBlock.typeId.startsWith("gaiadimension:") && adjacentBlock.typeId.includes("door")) {
      const doorKey = `${adjacentBlock.dimension.id},${adjacentBlock.location.x},${adjacentBlock.location.y},${adjacentBlock.location.z}`;
      const activationKey = `${doorKey}_activators`;
      const activators = doorStates.get(activationKey) || /* @__PURE__ */ new Set();
      const plateKey = `${block.dimension.id},${block.location.x},${block.location.y},${block.location.z}`;
      if (open) {
        activators.add(plateKey);
      } else {
        activators.delete(plateKey);
      }
      doorStates.set(activationKey, activators);
      const shouldDoorBeOpen = activators.size > 0;
      const currentDoorState = doorStates.get(doorKey) || false;
      if (currentDoorState !== shouldDoorBeOpen) {
        const perm = adjacentBlock.permutation;
        if (perm.getState("gaiadimension:open") !== void 0 && perm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
          adjacentBlock.setPermutation(perm.withState("gaiadimension:open", shouldDoorBeOpen));
          dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", adjacentBlock.location, { volume: 1, pitch: 1 });
          doorStates.set(doorKey, shouldDoorBeOpen);
          if (shouldDoorBeOpen) {
            RedstoneControl.openAndTrackDoor(adjacentBlock, block);
          } else {
            RedstoneControl.updateDoorTracker(adjacentBlock, block);
          }
        }
        if (adjacentBlock.typeId.includes("door")) {
          if (adjacentBlock.typeId.includes("_lower")) {
            const upperBlock = adjacentBlock.above();
            if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
              const upperPerm = upperBlock.permutation;
              if (upperPerm.getState("gaiadimension:open") !== void 0 && upperPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", shouldDoorBeOpen));
                dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, { volume: 1, pitch: 1 });
                const upperDoorKey = `${upperBlock.dimension.id},${upperBlock.location.x},${upperBlock.location.y},${upperBlock.location.z}`;
                doorStates.set(upperDoorKey, shouldDoorBeOpen);
                if (shouldDoorBeOpen) {
                  RedstoneControl.openAndTrackDoor(upperBlock, block);
                } else {
                  RedstoneControl.updateDoorTracker(upperBlock, block);
                }
              }
            }
          } else if (adjacentBlock.typeId.includes("_upper")) {
            const lowerBlock = adjacentBlock.below();
            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
              const lowerPerm = lowerBlock.permutation;
              if (lowerPerm.getState("gaiadimension:open") !== void 0 && lowerPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", shouldDoorBeOpen));
                dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, { volume: 1, pitch: 1 });
                const lowerDoorKey = `${lowerBlock.dimension.id},${lowerBlock.location.x},${lowerBlock.location.y},${lowerBlock.location.z}`;
                doorStates.set(lowerDoorKey, shouldDoorBeOpen);
                if (shouldDoorBeOpen) {
                  RedstoneControl.openAndTrackDoor(lowerBlock, block);
                } else {
                  RedstoneControl.updateDoorTracker(lowerBlock, block);
                }
              }
            }
          }
        }
      }
    }
  }
}
function cleanupDoorStates() {
  const keysToDelete = [];
  for (const doorKey of doorStates.keys()) {
    if (doorKey.endsWith("_activators")) {
      continue;
    }
    try {
      const parts = doorKey.split(",");
      const dimensionId = parts[0];
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      const dimension = world7.getDimension(dimensionId);
      const block = dimension.getBlock({ x, y, z });
      if (!block || !block.typeId.startsWith("gaiadimension:") || !block.typeId.includes("door")) {
        keysToDelete.push(doorKey);
        keysToDelete.push(`${doorKey}_activators`);
      }
    } catch (e) {
    }
  }
  for (const key of keysToDelete) {
    doorStates.delete(key);
  }
  const orphanedActivatorKeys = [];
  for (const key of doorStates.keys()) {
    if (key.endsWith("_activators")) {
      const doorKey = key.substring(0, key.length - 11);
      if (!doorStates.has(doorKey)) {
        orphanedActivatorKeys.push(key);
      }
    }
  }
  for (const key of orphanedActivatorKeys) {
    doorStates.delete(key);
  }
}
var activePlates = /* @__PURE__ */ new Set();
system11.runInterval(() => {
  const players = world7.getAllPlayers();
  const newlyActivePlates = /* @__PURE__ */ new Set();
  for (const player of players) {
    try {
      const loc = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
      const headBlock = player.dimension.getBlock(loc);
      const blockBelow = player.dimension.getBlock({ x: loc.x, y: loc.y - 1, z: loc.z });
      if (headBlock && (isPressurePlate(headBlock.typeId) || isVanillaPressurePlate(headBlock.typeId))) {
        const key = `${headBlock.dimension.id},${headBlock.location.x},${headBlock.location.y},${headBlock.location.z}`;
        newlyActivePlates.add(key);
      }
      if (blockBelow && (isPressurePlate(blockBelow.typeId) || isVanillaPressurePlate(blockBelow.typeId))) {
        const key = `${blockBelow.dimension.id},${blockBelow.location.x},${blockBelow.location.y},${blockBelow.location.z}`;
        newlyActivePlates.add(key);
      }
    } catch (e) {
    }
  }
  for (const plateKey of newlyActivePlates) {
    if (!activePlates.has(plateKey)) {
      try {
        const parts = plateKey.split(",");
        const dimensionId = parts[0];
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        const z = Number(parts[3]);
        const dimension = world7.getDimension(dimensionId);
        const block = dimension.getBlock({ x, y, z });
        if (block) {
          if (isPressurePlate(block.typeId)) {
            block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
            block.dimension.playSound("click_on.wooden_pressure_plate", block.location, { volume: 1, pitch: 1 });
            const sourceId = `pressure_plate_${x}_${y}_${z}`;
            updateNeighbors(block, true, sourceId);
          } else if (isVanillaPressurePlate(block.typeId)) {
            const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
            updateNeighbors(block, true, sourceId);
            checkAdjacentCustomDoors(block, true);
          }
        }
      } catch (e) {
      }
    }
  }
  for (const plateKey of activePlates) {
    if (!newlyActivePlates.has(plateKey)) {
      try {
        const parts = plateKey.split(",");
        const dimensionId = parts[0];
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        const z = Number(parts[3]);
        const dimension = world7.getDimension(dimensionId);
        const block = dimension.getBlock({ x, y, z });
        if (block && (isPressurePlate(block.typeId) || isVanillaPressurePlate(block.typeId))) {
          if (isPressurePlate(block.typeId)) {
            block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
            block.dimension.playSound("click_off.wooden_pressure_plate", block.location, { volume: 1, pitch: 1 });
            const sourceId = `pressure_plate_${x}_${y}_${z}`;
            updateNeighbors(block, false, sourceId);
          } else if (isVanillaPressurePlate(block.typeId)) {
            const sourceId = `pressure_plate_${block.location.x}_${block.location.y}_${block.location.z}`;
            updateNeighbors(block, false, sourceId);
            checkAdjacentCustomDoors(block, false);
          }
        }
      } catch (e) {
      }
    }
  }
  activePlates = newlyActivePlates;
}, 2);
system11.runInterval(() => {
  cleanupDoorStates();
}, 1200);
var PressurePlateComponent = class {
  // This is a dummy component just for identification
};
function registerPressurePlateComponent({ blockComponentRegistry }) {
  const pressurePlateComponent = new PressurePlateComponent();
  blockComponentRegistry.registerCustomComponent("gaiadimension:pressure_plate", pressurePlateComponent);
}

// src/main/bedrock/ts/blocks/stairs.ts
import {
  system as system13,
  BlockPermutation as BlockPermutation4
} from "@minecraft/server";

// src/main/bedrock/ts/systems/BlockUpdate.ts
import { world as world8, system as system12 } from "@minecraft/server";
var blockUpdateRegistry = [];
function registerForBlockUpdates(registration) {
  blockUpdateRegistry.push(registration);
}
function updateNeighboringBlocks(block) {
  if (!block || !block.dimension) return;
  const neighbors = [
    block.north(),
    block.south(),
    block.east(),
    block.west(),
    block.above(),
    block.below()
  ];
  for (const neighbor of neighbors) {
    if (!neighbor) continue;
    for (const registration of blockUpdateRegistry) {
      if (registration.check(neighbor)) {
        registration.update(neighbor);
      }
    }
  }
}
world8.afterEvents.pistonActivate.subscribe((event) => {
  const { piston, dimension } = event;
  system12.run(() => {
    const locations = piston.getAttachedBlocks();
    for (const location of locations) {
      const block = dimension.getBlock(location);
      if (block) {
        updateNeighboringBlocks(block);
      }
    }
  });
});
world8.afterEvents.explosion.subscribe((event) => {
  const { dimension } = event;
  const locations = event.getImpactedBlocks();
  for (const location of locations) {
    const block = dimension.getBlock(location);
    if (block) {
      updateNeighboringBlocks(block);
    }
  }
});

// src/main/bedrock/ts/blocks/stairs.ts
var type = "gaiadimension:type";
var tag = "gaiadimension:stairs";
var componentName = "gaiadimension:stairs";
var blocker = "gaiadimension:stairs_collision";
function updateNeighbors2(block) {
  const neighbors = [
    block.north(),
    block.south(),
    block.east(),
    block.west(),
    block.above(),
    block.below()
  ];
  for (const neighbor of neighbors) {
    if (neighbor && neighbor.isValid && neighbor.hasTag(tag)) {
      system13.run(() => updateStair(neighbor));
    }
  }
}
function updateBlocker(block) {
  const above = block.above();
  const below = block.below();
  if (above && above.isValid && above.typeId === blocker && above.permutation.getState("minecraft:vertical_half") === "bottom") {
    above.setPermutation(BlockPermutation4.resolve("minecraft:air"));
  } else if (below && below.isValid && below.typeId === blocker && below.permutation.getState("minecraft:vertical_half") === "top") {
    below.setPermutation(BlockPermutation4.resolve("minecraft:air"));
  }
}
function updateStair(block) {
  if (!block || !block.isValid || !block.hasTag(tag)) return;
  try {
    updateBlocker(block);
    const north = block.north();
    const south = block.south();
    const east = block.east();
    const west = block.west();
    const above = block.above();
    const direction = block.permutation.getState("minecraft:cardinal_direction");
    const stairHalf = block.permutation.getState("minecraft:vertical_half");
    const getStairShape = (neighbor) => {
      if (!neighbor || !neighbor.isValid || !neighbor.typeId || !neighbor.permutation) return { half: void 0, direction: void 0 };
      if (neighbor.hasTag(tag)) {
        return {
          half: neighbor.permutation.getState("minecraft:vertical_half"),
          direction: neighbor.permutation.getState("minecraft:cardinal_direction")
        };
      } else if (neighbor.typeId.includes("minecraft:") && neighbor.typeId.includes("stairs")) {
        const upsideDown = neighbor.permutation.getState("upside_down_bit");
        const directionValue = neighbor.permutation.getState("weirdo_direction");
        const half = upsideDown ? "top" : "bottom";
        let direction2;
        switch (directionValue) {
          case 0:
            direction2 = "east";
            break;
          case 1:
            direction2 = "west";
            break;
          case 2:
            direction2 = "south";
            break;
          case 3:
            direction2 = "north";
            break;
        }
        return { half, direction: direction2 };
      }
      return { half: void 0, direction: void 0 };
    };
    const validNeighbor = (neighbor, dir) => {
      const shape = getStairShape(neighbor);
      return shape.half === stairHalf && shape.direction === dir;
    };
    let toPlace = 1;
    if (direction === "north") {
      if (validNeighbor(north, "west")) toPlace = 4;
      else if (validNeighbor(north, "east")) toPlace = 5;
      else if (validNeighbor(south, "west")) toPlace = 2;
      else if (validNeighbor(south, "east")) toPlace = 3;
    } else if (direction === "south") {
      if (validNeighbor(north, "west")) toPlace = 3;
      else if (validNeighbor(north, "east")) toPlace = 2;
      else if (validNeighbor(south, "west")) toPlace = 4;
      else if (validNeighbor(south, "east")) toPlace = 5;
    } else if (direction === "west") {
      if (validNeighbor(west, "north")) toPlace = 5;
      else if (validNeighbor(west, "south")) toPlace = 4;
      else if (validNeighbor(east, "north")) toPlace = 3;
      else if (validNeighbor(east, "south")) toPlace = 2;
    } else if (direction === "east") {
      if (validNeighbor(west, "north")) toPlace = 2;
      else if (validNeighbor(west, "south")) toPlace = 3;
      else if (validNeighbor(east, "north")) toPlace = 5;
      else if (validNeighbor(east, "south")) toPlace = 4;
    }
    block.setPermutation(block.permutation.withState(type, toPlace));
    const target = stairHalf === "bottom" ? above : block.below();
    if (target && target.isValid && (target.isAir || target.typeId === "minecraft:water" || target.typeId.includes("piston_arm"))) {
      let directionState = direction;
      if (toPlace === 4) {
        if (direction === "north") directionState = "west";
        else if (direction === "west") directionState = "south";
        else if (direction === "south") directionState = "west";
        else if (direction === "east") directionState = "south";
      } else if (toPlace === 5) {
        if (direction === "south") directionState = "east";
        else if (direction === "east") directionState = "north";
        else if (direction === "north") directionState = "east";
        else if (direction === "west") directionState = "north";
      }
      target.setPermutation(
        BlockPermutation4.resolve(blocker).withState("minecraft:cardinal_direction", directionState).withState("minecraft:vertical_half", stairHalf).withState("gaiadimension:corner", toPlace > 3)
      );
      trackBlock(target);
    }
  } catch (e) {
    console.error(`Error updating stair at ${block.location.x}, ${block.location.y}, ${block.location.z}: ${e}`);
  }
}
function registerStairsComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent(componentName, {
    // The component is now primarily for identification.
    // The main logic is handled by the block update system and direct event handling.
  });
  registerForBlockUpdates({
    check: (block) => block && block.isValid && block.hasTag(tag),
    update: updateStair
  });
  registerPlaceHandler({
    check: (block) => block && block.isValid && (block.hasTag(tag) || (block.north()?.hasTag(tag) ?? false) || (block.south()?.hasTag(tag) ?? false) || (block.east()?.hasTag(tag) ?? false) || (block.west()?.hasTag(tag) ?? false) || (block.above()?.hasTag(tag) ?? false) || (block.below()?.hasTag(tag) ?? false)),
    execute: (event) => {
      const { block } = event;
      const blockBelow = block.below();
      if (block.hasTag(tag)) {
        system13.run(() => updateStair(block));
      }
      if (block.hasTag(tag) && blockBelow && blockBelow.isValid && blockBelow.hasTag(tag)) {
      } else {
        updateNeighbors2(block);
      }
    }
  });
  registerBreakHandler({
    event: "before",
    check: (block) => block && block.isValid && block.hasTag(tag),
    execute: (event) => {
      const { block } = event;
      if (!block || !block.isValid) return;
      system13.run(() => {
        const above = block.above();
        const below = block.below();
        if (above && above.isValid && above.typeId.includes("stairs_collision")) {
          untrackBlock(above.location);
          above.setPermutation(BlockPermutation4.resolve("minecraft:air"));
        }
        if (below && below.isValid && below.typeId === blocker) {
          untrackBlock(below.location);
          below.setPermutation(BlockPermutation4.resolve("minecraft:air"));
        }
      });
    }
  });
  registerBreakHandler({
    event: "after",
    check: (event) => {
      try {
        const { block, dimension } = event;
        const { x, y, z } = block.location;
        const north = dimension.getBlock({ x, y, z: z - 1 });
        const south = dimension.getBlock({ x, y, z: z + 1 });
        const east = dimension.getBlock({ x: x + 1, y, z });
        const west = dimension.getBlock({ x: x - 1, y, z });
        const above = dimension.getBlock({ x, y: y + 1, z });
        const below = dimension.getBlock({ x, y: y - 1, z });
        return [north, south, east, west, above, below].some((b) => b && b.isValid && b.hasTag(tag));
      } catch (e) {
        return false;
      }
    },
    execute: (event) => {
      const { block, dimension } = event;
      if (!block) return;
      const blockAtPos = dimension.getBlock(block.location);
      if (blockAtPos && blockAtPos.isValid) {
        updateNeighbors2(blockAtPos);
        updateBlocker(blockAtPos);
      }
    }
  });
}

// src/main/bedrock/ts/blocks/sign.ts
import {
  system as system14,
  world as world9,
  TextPrimitive,
  EquipmentSlot as EquipmentSlot3
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
var editingPlayers = /* @__PURE__ */ new Set();
var CHARS_PER_LINE = 15;
var MAX_LINES = 4;
var STANDING_BOARD_CENTER_Y = 0.58;
var STANDING_BOARD_Z = -0.06;
var WALL_BOARD_CENTER_Y = 0.3;
var WALL_BOARD_Z = 0.41;
var HANGING_BOARD_CENTER_Y = 0.3;
var HANGING_BOARD_Z = -0.08;
var TEXT_SCALE = 0.5;
var HANGING_TEXT_SCALE = 0.5;
var DEFAULT_TEXT_COLOR = { red: 0, green: 0, blue: 0, alpha: 1 };
var activePrimitives = /* @__PURE__ */ new Map();
function isGaiaSign(block) {
  return block.typeId.includes("gaiadimension") && block.typeId.includes("sign");
}
function signKey(loc) {
  return `${loc.x},${loc.y},${loc.z}`;
}
function playerYawToRotationIndex(yaw) {
  const facing = (-yaw % 360 + 360) % 360;
  const index = Math.round(facing / 22.5) % 16;
  return index;
}
function rotationIndexToDegrees(index) {
  return index * 22.5 % 360;
}
function getSignText(block) {
  const base = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
  const frontProp = world9.getDynamicProperty(`${base}_front`);
  const backProp = world9.getDynamicProperty(`${base}_back`);
  return {
    front: typeof frontProp === "string" ? frontProp : "",
    back: typeof backProp === "string" ? backProp : ""
  };
}
function setSignText(block, front, back) {
  const base = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
  world9.setDynamicProperty(`${base}_front`, front);
  world9.setDynamicProperty(`${base}_back`, back);
}
function wrapText(input) {
  const words = input.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if (currentLine.length > 0 && currentLine.length + 1 + word.length > CHARS_PER_LINE) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= MAX_LINES) break;
    } else {
      currentLine = currentLine.length > 0 ? currentLine + " " + word : word;
    }
    while (currentLine.length > CHARS_PER_LINE && lines.length < MAX_LINES) {
      lines.push(currentLine.substring(0, CHARS_PER_LINE));
      currentLine = currentLine.substring(CHARS_PER_LINE);
    }
  }
  if (currentLine.length > 0 && lines.length < MAX_LINES) {
    lines.push(currentLine);
  }
  return lines.join("\n");
}
function clearSignPrimitives(loc) {
  const key = signKey(loc);
  const existing = activePrimitives.get(key);
  if (existing) {
    try {
      existing.front?.remove();
    } catch (e) {
    }
    try {
      existing.back?.remove();
    } catch (e) {
    }
    activePrimitives.delete(key);
  }
}
function spawnSignText(block, frontText, backText) {
  const blockX = block.location.x + 0.5;
  const blockY = block.location.y;
  const blockZ = block.location.z + 0.5;
  const dim = block.dimension;
  const rotIndexState = block.permutation.getState("gaiadimension:rotation");
  const rotIndex = typeof rotIndexState === "number" ? rotIndexState : 0;
  let isWall = false;
  try {
    const wallState = block.permutation.getState("gaiadimension:wall_attached");
    if (typeof wallState === "boolean") isWall = wallState;
  } catch (e) {
  }
  const isHanging = block.typeId.includes("hanging");
  const blockRotDeg = rotationIndexToDegrees(rotIndex);
  const boneRotDeg = -blockRotDeg;
  const boneRotRad = boneRotDeg * Math.PI / 180;
  const boardCenterY = isHanging ? HANGING_BOARD_CENTER_Y : isWall ? WALL_BOARD_CENTER_Y : STANDING_BOARD_CENTER_Y;
  const boardZ = isHanging ? HANGING_BOARD_Z : isWall ? WALL_BOARD_Z : STANDING_BOARD_Z;
  const textScale = isHanging ? HANGING_TEXT_SCALE : TEXT_SCALE;
  const frontYaw = ((boneRotDeg + 180) % 360 + 360) % 360;
  const backYaw = (boneRotDeg % 360 + 360) % 360;
  const cosR = Math.cos(boneRotRad);
  const sinR = Math.sin(boneRotRad);
  const key = signKey(block.location);
  const primitives = {};
  if (frontText.length > 0) {
    const wrappedFront = wrapText(frontText);
    const localZ = boardZ;
    const worldX = blockX + -localZ * sinR;
    const worldZ = blockZ + localZ * cosR;
    const worldY = blockY + boardCenterY;
    const frontPrim = new TextPrimitive(
      { x: worldX, y: worldY, z: worldZ },
      wrappedFront
    );
    frontPrim.useRotation = true;
    frontPrim.rotation = { x: 0, y: frontYaw, z: 0 };
    frontPrim.scale = textScale;
    frontPrim.depthTest = true;
    frontPrim.backfaceVisible = false;
    frontPrim.textBackfaceVisible = false;
    frontPrim.color = DEFAULT_TEXT_COLOR;
    frontPrim.backgroundColorOverride = { red: 0, green: 0, blue: 0, alpha: 0 };
    try {
      world9.primitiveShapesManager.addText(frontPrim, dim);
      primitives.front = frontPrim;
    } catch (e) {
      console.warn(`[Sign] Failed to add front TextPrimitive: ${e}`);
    }
  }
  if (backText.length > 0) {
    const wrappedBack = wrapText(backText);
    const localZ = -boardZ;
    const worldX = blockX + -localZ * sinR;
    const worldZ = blockZ + localZ * cosR;
    const worldY = blockY + boardCenterY;
    const backPrim = new TextPrimitive(
      { x: worldX, y: worldY, z: worldZ },
      wrappedBack
    );
    backPrim.useRotation = true;
    backPrim.rotation = { x: 0, y: backYaw, z: 0 };
    backPrim.scale = textScale;
    backPrim.depthTest = true;
    backPrim.backfaceVisible = false;
    backPrim.textBackfaceVisible = false;
    backPrim.color = DEFAULT_TEXT_COLOR;
    backPrim.backgroundColorOverride = { red: 0, green: 0, blue: 0, alpha: 0 };
    try {
      world9.primitiveShapesManager.addText(backPrim, dim);
      primitives.back = backPrim;
    } catch (e) {
      console.warn(`[Sign] Failed to add back TextPrimitive: ${e}`);
    }
  }
  activePrimitives.set(key, primitives);
  setSignText(block, frontText, backText);
}
function openSignUI(player, block) {
  const playerId = player.id;
  if (editingPlayers.has(playerId)) return;
  editingPlayers.add(playerId);
  const existing = getSignText(block);
  const isHanging = block.typeId.includes("hanging");
  let editingBack = false;
  if (isHanging) {
    const rotIndexState = block.permutation.getState("gaiadimension:rotation");
    const rotIndex = typeof rotIndexState === "number" ? rotIndexState : 0;
    const entityRotDeg = ((-rotIndex * 22.5 + 180) % 360 + 360) % 360;
    const entityRotRad = entityRotDeg * Math.PI / 180;
    const nx = -Math.sin(entityRotRad);
    const nz = Math.cos(entityRotRad);
    const dx = player.location.x - (block.location.x + 0.5);
    const dz = player.location.z - (block.location.z + 0.5);
    editingBack = dx * nx + dz * nz < 0;
  }
  const currentText = editingBack ? existing.back : existing.front;
  const ui = new ModalFormData();
  ui.title(isHanging && editingBack ? "Edit Sign (Back)" : "Edit Sign");
  ui.textField("Sign Text", "Type here...", { defaultValue: currentText || "" });
  ui.show(player).then((response) => {
    editingPlayers.delete(playerId);
    if (response.canceled || !response.formValues) return;
    const newText = String(response.formValues[0] || "").trim();
    const frontText = editingBack ? existing.front : newText;
    const backText = editingBack ? newText : existing.back;
    clearSignPrimitives(block.location);
    spawnSignText(block, frontText, backText);
  }).catch((e) => {
    editingPlayers.delete(playerId);
  });
}
function cleanupSignData(loc) {
  const base = `sign_${loc.x}_${loc.y}_${loc.z}`;
  world9.setDynamicProperty(`${base}_front`, void 0);
  world9.setDynamicProperty(`${base}_back`, void 0);
}
var DYE_COLORS = {
  0: { red: 0, green: 0, blue: 0, alpha: 1 },
  // black (default)
  1: { red: 1, green: 1, blue: 1, alpha: 1 },
  // white
  2: { red: 0.7, green: 0.1, blue: 0.1, alpha: 1 },
  // red
  3: { red: 0.15, green: 0.2, blue: 0.7, alpha: 1 },
  // blue
  4: { red: 0.3, green: 0.6, blue: 0.85, alpha: 1 },
  // light blue
  5: { red: 0.1, green: 0.5, blue: 0.1, alpha: 1 },
  // green
  6: { red: 0.95, green: 0.9, blue: 0.1, alpha: 1 },
  // yellow
  7: { red: 0.5, green: 0.5, blue: 0.5, alpha: 1 },
  // gray
  8: { red: 0.35, green: 0.35, blue: 0.35, alpha: 1 },
  // dark gray
  9: { red: 0.1, green: 0.55, blue: 0.55, alpha: 1 },
  // cyan
  10: { red: 0.75, green: 0.2, blue: 0.75, alpha: 1 },
  // magenta
  11: { red: 0.3, green: 0.75, blue: 0.1, alpha: 1 },
  // lime
  12: { red: 0.5, green: 0.3, blue: 0.15, alpha: 1 },
  // brown
  13: { red: 0.05, green: 0.05, blue: 0.05, alpha: 1 },
  // black dye
  14: { red: 0.5, green: 0.1, blue: 0.7, alpha: 1 },
  // purple
  15: { red: 0.9, green: 0.5, blue: 0.1, alpha: 1 },
  // orange
  16: { red: 0.9, green: 0.5, blue: 0.65, alpha: 1 }
  // pink
};
var DYE_MAP = {
  "minecraft:white_dye": 1,
  "minecraft:red_dye": 2,
  "minecraft:blue_dye": 3,
  "minecraft:light_blue_dye": 4,
  "minecraft:green_dye": 5,
  "minecraft:yellow_dye": 6,
  "minecraft:gray_dye": 7,
  "minecraft:dark_gray_dye": 8,
  "minecraft:cyan_dye": 9,
  "minecraft:magenta_dye": 10,
  "minecraft:lime_dye": 11,
  "minecraft:brown_dye": 12,
  "minecraft:black_dye": 13,
  "minecraft:purple_dye": 14,
  "minecraft:orange_dye": 15,
  "minecraft:pink_dye": 16
};
function registerSignComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:sign", {});
  world9.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    if (!isGaiaSign(block)) return;
    const yaw = player.getRotation().y;
    let isWall = false;
    let rotIndex = playerYawToRotationIndex(yaw);
    const isHanging = block.typeId.includes("hanging");
    if (isHanging) {
      const blockAbove = block.dimension.getBlock({
        x: block.location.x,
        y: block.location.y + 1,
        z: block.location.z
      });
      const isFullBlockAbove = !!(blockAbove && !blockAbove.isAir && !blockAbove.typeId.includes("fence") && !blockAbove.typeId.includes("chain") && !blockAbove.typeId.includes("iron_bars"));
      if (isFullBlockAbove && !player.isSneaking) {
        const cardinalIndex = Math.round(rotIndex / 4) * 4 % 16;
        const perm = block.permutation.withState("gaiadimension:rotation", cardinalIndex).withState("gaiadimension:attach_type", 1);
        block.setPermutation(perm);
      } else if (blockAbove && !blockAbove.isAir) {
        const perm = block.permutation.withState("gaiadimension:rotation", rotIndex).withState("gaiadimension:attach_type", 0);
        block.setPermutation(perm);
      } else {
        const dirs = [
          { dx: 0, dz: -1, rot: 8 },
          { dx: 1, dz: 0, rot: 4 },
          { dx: 0, dz: 1, rot: 0 },
          { dx: -1, dz: 0, rot: 12 }
        ];
        for (const d of dirs) {
          const adj = block.dimension.getBlock({
            x: block.location.x + d.dx,
            y: block.location.y,
            z: block.location.z + d.dz
          });
          if (adj && !adj.isAir) {
            rotIndex = d.rot;
            break;
          }
        }
        const perm = block.permutation.withState("gaiadimension:rotation", rotIndex).withState("gaiadimension:attach_type", 2);
        block.setPermutation(perm);
      }
    } else {
      const blockBelow = block.dimension.getBlock({
        x: block.location.x,
        y: block.location.y - 1,
        z: block.location.z
      });
      if (!blockBelow || blockBelow.isAir) {
        isWall = true;
        const dirs = [
          { dx: 0, dz: -1, rot: 8 },
          { dx: 1, dz: 0, rot: 4 },
          { dx: 0, dz: 1, rot: 0 },
          { dx: -1, dz: 0, rot: 12 }
        ];
        for (const d of dirs) {
          const adj = block.dimension.getBlock({
            x: block.location.x + d.dx,
            y: block.location.y,
            z: block.location.z + d.dz
          });
          if (adj && !adj.isAir) {
            rotIndex = d.rot;
            break;
          }
        }
      }
      const perm = block.permutation.withState("gaiadimension:rotation", rotIndex).withState("gaiadimension:wall_attached", isWall);
      block.setPermutation(perm);
    }
    system14.runTimeout(() => {
      openSignUI(player, block);
    }, 5);
  });
  world9.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block } = event;
    if (!isGaiaSign(block)) return;
    const loc = { x: block.location.x, y: block.location.y, z: block.location.z };
    system14.run(() => {
      clearSignPrimitives(loc);
      cleanupSignData(loc);
    });
  });
  world9.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    if (!isGaiaSign(block)) return;
    if (player.isSneaking) return;
    event.cancel = true;
    system14.run(() => {
      const equip = player.getComponent("minecraft:equippable");
      if (!equip) return openSignUI(player, block);
      const mainHand = equip.getEquipment(EquipmentSlot3.Mainhand);
      if (!mainHand) return openSignUI(player, block);
      const dyeIndex = DYE_MAP[mainHand.typeId];
      if (dyeIndex === void 0) return openSignUI(player, block);
      const key = signKey(block.location);
      const prims = activePrimitives.get(key);
      if (prims) {
        const rgba = DYE_COLORS[dyeIndex] || DEFAULT_TEXT_COLOR;
        try {
          if (prims.front) prims.front.color = rgba;
        } catch (e) {
        }
        try {
          if (prims.back) prims.back.color = rgba;
        } catch (e) {
        }
      }
      if (mainHand.amount > 1) {
        mainHand.amount -= 1;
        equip.setEquipment(EquipmentSlot3.Mainhand, mainHand);
      } else {
        equip.setEquipment(EquipmentSlot3.Mainhand, void 0);
      }
    });
  });
}

// src/main/bedrock/ts/blocks/geyser.ts
import {
  system as system15
} from "@minecraft/server";
function pushEntities(dimension, spawnPos, duration) {
  let elapsed = 0;
  const intervalTicks = 4;
  const runId = system15.runInterval(() => {
    if (elapsed >= duration) {
      system15.clearRun(runId);
      return;
    }
    const entities = dimension.getEntities({
      location: spawnPos,
      maxDistance: 5
    });
    for (const entity of entities) {
      const pos = entity.location;
      const dx = Math.abs(pos.x - spawnPos.x);
      const dz = Math.abs(pos.z - spawnPos.z);
      const dy = pos.y - (spawnPos.y - 1.1);
      if (dx < 0.7 && dz < 0.7 && dy > 0 && dy < 6) {
        try {
          entity.applyImpulse({ x: 0, y: 0.5, z: 0 });
        } catch (e) {
        }
      }
    }
    elapsed += intervalTicks;
  }, intervalTicks);
}
async function eruptGeyser(block) {
  if (!block || !block.isValid) return;
  const dimension = block.dimension;
  const blockCenter = {
    x: block.location.x + 0.5,
    y: block.location.y + 1.1,
    z: block.location.z + 0.5
  };
  dimension.playSound("geyser.blast", blockCenter);
  dimension.spawnParticle("gaiadimension:geyser_pre_steam", blockCenter);
  await sleep(10);
  if (!block.isValid) return;
  pushEntities(dimension, blockCenter, 60);
  dimension.spawnParticle("gaiadimension:geyser_steam", blockCenter);
  dimension.spawnParticle("gaiadimension:geyser_blast", blockCenter);
}
function initializeGeyser() {
  system15.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "gaiadimension:geyser.erupt") {
      if (event.sourceBlock) {
        eruptGeyser(event.sourceBlock);
      }
    }
  });
}
function registerGeyserComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:geyser", {
    onRandomTick: (event) => {
      eruptGeyser(event.block);
    },
    onPlayerInteract: (event) => {
      eruptGeyser(event.block);
    }
  });
}

// src/main/bedrock/ts/blocks/furnaces/GaiaFurnace.ts
import { ItemStack as ItemStack8 } from "@minecraft/server";

// src/main/bedrock/ts/API/lib/Machine.ts
import { world as world10, system as system16, ItemStack as ItemStack5 } from "@minecraft/server";
function getSegment(initialValue, currentValue, parts) {
  if (parts === 0 || initialValue === 0) return 0;
  const ratio = Math.max(0, Math.min(1, currentValue / initialValue));
  return Math.floor(ratio * (parts - 1));
}
var TimerManager = class {
  // Allow dynamic timer properties
  entity;
  timers = /* @__PURE__ */ new Map();
  constructor(entity, timerConfig) {
    this.entity = entity;
    if (!timerConfig) return;
    for (const timerName in timerConfig) {
      const scoreboardId = `gaiadimension:${timerName}`;
      let objective = world10.scoreboard.getObjective(scoreboardId);
      if (!objective) {
        objective = world10.scoreboard.addObjective(scoreboardId, timerName);
      }
      if (!objective) continue;
      let currentMax = timerConfig[timerName].max;
      const finalObjective = objective;
      Object.defineProperty(this, timerName, {
        get: () => {
          return {
            get value() {
              try {
                return finalObjective.getScore(entity) ?? 0;
              } catch (e) {
                return 0;
              }
            },
            set value(val) {
              try {
                finalObjective.setScore(entity, val);
              } catch (e) {
              }
            },
            get max() {
              return currentMax;
            },
            set max(val) {
              currentMax = val;
            },
            add: (amount) => {
              try {
                finalObjective.addScore(entity, amount);
              } catch (e) {
              }
            }
          };
        },
        enumerable: true
      });
    }
  }
};
var Machine = class {
  static get NAME() {
    throw new Error("Machine class must override static getter 'NAME'.");
  }
  static get TIMERS() {
    return {};
  }
  static get UI_CONFIG() {
    return { classicProfile: {}, pocketProfile: {} };
  }
  static get RECIPES() {
    return {};
  }
  static get INVENTORY_SIZE() {
    return 27;
  }
  static get FUEL_ITEMS() {
    return void 0;
  }
  entity;
  block;
  config;
  inventory;
  timers;
  tickCount;
  uiTickCount;
  cachedPlayers;
  locKey;
  cachedUiProfile;
  isViewed;
  lastTickTime;
  dynamicButtons;
  lastResultSnapshots;
  /**
   * Initializes a new machine instance.
   * @param {Entity} entity - The entity representing the machine.
   * @param {Block} block - The block associated with the machine.
   */
  constructor(entity, block) {
    this.entity = entity;
    this.block = block;
    this.config = this.constructor;
    const inventoryComp = this.entity.getComponent("minecraft:inventory");
    this.inventory = inventoryComp.container;
    this.timers = new TimerManager(this.entity, this.config.TIMERS);
    this.tickCount = 0;
    this.uiTickCount = 0;
    this.cachedPlayers = [];
    this.locKey = null;
    this.cachedUiProfile = null;
    this.isViewed = false;
    this.lastTickTime = system16.currentTick;
    this.dynamicButtons = /* @__PURE__ */ new Map();
    this.lastResultSnapshots = /* @__PURE__ */ new Map();
    this.initResultSnapshots();
    this.cachedUiProfile = this.getCurrentUiProfile();
    this.renderStaticUI(this.cachedUiProfile);
  }
  /**
   * Dynamically adds a button to the machine instance.
   * @param {number} slot 
   * @param {string} icon - Item Type ID
   * @param {string} callback - Name of the method to call on interaction
   */
  setButton(slot, icon, callback) {
    this.dynamicButtons.set(slot, { icon, callback });
  }
  /**
   * Initializes snapshot of result slots to prevent ejecting existing items on load.
   */
  initResultSnapshots() {
    const uiProfile = this.getCurrentUiProfile();
    if (!uiProfile) return;
    const resultSlots = [
      ...uiProfile.resultSlots || [],
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0);
    for (const slot of resultSlots) {
      const item = this.inventory.getItem(slot);
      if (item) {
        this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
      } else {
        this.lastResultSnapshots.delete(slot);
      }
    }
  }
  /**
   * Main tick loop for the machine.
   * Logic processing is consistent via dt. UI and interaction checks are gated by isViewed.
   * @param {number} dt - Delta time (ticks elapsed since last update).
   */
  tick(dt = 1) {
    const prevTick = this.tickCount;
    this.tickCount += dt;
    const isCheckTick = Math.floor(prevTick / 5) < Math.floor(this.tickCount / 5);
    if (isCheckTick) {
      this.monitorStrictSlots();
    }
    if (this.canProcess()) {
      this.processTick(dt);
    }
    this.onTick(dt);
    if (Math.floor(prevTick / 8) < Math.floor(this.tickCount / 8)) {
      this.handleHopperInteractions();
    }
    if (this.isViewed) {
      if (Math.floor(prevTick / 10) < Math.floor(this.tickCount / 10) || this.cachedPlayers.length === 0) {
        this.cachedPlayers = this.getNearbyPlayers();
      }
      this.uiTickCount += dt;
      this.cachedUiProfile = this.getCurrentUiProfile();
      const uiProfile = this.cachedUiProfile;
      this.enforceCursor(this.cachedPlayers);
      this.enforcePlayerInventory(this.cachedPlayers);
      this.handleInteractions(uiProfile);
      this.renderStaticUI(uiProfile);
      this.renderAnimatedUI(uiProfile);
      this.updateUI();
      if (this.uiTickCount % 20 === 0) {
        this.updateResultSnapshots();
      }
    } else {
      if (this.cachedPlayers.length > 0) this.cachedPlayers = [];
    }
  }
  /**
   * Handles "fake button" interactions.
   * Detects if a button slot is empty or has a swapped item, triggers the action, and resets the button.
   * @param {UIProfile | null} uiProfile - The current UI configuration.
   */
  handleInteractions(uiProfile) {
    const buttons = uiProfile && uiProfile.buttons ? { ...uiProfile.buttons } : {};
    for (const [slot, btn] of this.dynamicButtons) {
      buttons[slot] = btn;
    }
    if (Object.keys(buttons).length === 0) return;
    for (const [slotStr, btnConfig] of Object.entries(buttons)) {
      const slot = parseInt(slotStr);
      const currentItem = this.inventory.getItem(slot);
      const expectedId = btnConfig.icon;
      if (!currentItem || currentItem.typeId !== expectedId) {
        if (currentItem) {
          this.ejectItem(currentItem);
        }
        this.setInventoryItem(slot, new ItemStack5(expectedId, 1), uiProfile);
        try {
          this.block.dimension.playSound("random.click", this.block.location);
        } catch (e) {
        }
        const callback = btnConfig.callback;
        if (typeof this[callback] === "function") {
          this[callback](this.cachedPlayers[0]);
        }
      }
    }
  }
  /**
   * Safely sets an item in the machine's inventory, updating security snapshots.
   */
  setInventoryItem(slot, item, cachedUiProfile = null) {
    try {
      this.inventory.setItem(slot, item);
      const uiProfile = cachedUiProfile || this.cachedUiProfile || this.getCurrentUiProfile();
      if (uiProfile) {
        const resultSlots = [
          ...uiProfile.resultSlots || [],
          uiProfile.secondaryResultSlot
        ];
        if (resultSlots.includes(slot)) {
          if (item) {
            this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
          } else {
            this.lastResultSnapshots.delete(slot);
          }
        }
      }
    } catch (e) {
    }
  }
  /**
   * strict checks for Fuel and Result slots.
   */
  monitorStrictSlots() {
    const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
    if (!uiProfile) return;
    if (uiProfile.fuelSlot !== void 0) {
      const item = this.inventory.getItem(uiProfile.fuelSlot);
      if (item && !this.isValidFuel(item)) {
        this.setInventoryItem(uiProfile.fuelSlot, void 0, uiProfile);
        this.ejectItem(item);
      }
    }
    const resultSlots = [
      ...uiProfile.resultSlots || [],
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0);
    for (const slot of resultSlots) {
      const currentItem = this.inventory.getItem(slot);
      const lastSnapshot = this.lastResultSnapshots.get(slot);
      if (!currentItem) continue;
      let isPlayerAction = false;
      let amountToEject = 0;
      if (!lastSnapshot) {
        isPlayerAction = true;
        amountToEject = currentItem.amount;
      } else if (currentItem.typeId !== lastSnapshot.typeId) {
        isPlayerAction = true;
        amountToEject = currentItem.amount;
      } else if (currentItem.amount > lastSnapshot.amount) {
        isPlayerAction = true;
        amountToEject = currentItem.amount - lastSnapshot.amount;
      }
      if (isPlayerAction) {
        if (amountToEject >= currentItem.amount) {
          this.setInventoryItem(slot, void 0, uiProfile);
          this.ejectItem(currentItem);
        } else {
          currentItem.amount -= amountToEject;
          this.setInventoryItem(slot, currentItem, uiProfile);
          const ejectedStack = new ItemStack5(currentItem.typeId, amountToEject);
          this.ejectItem(ejectedStack);
        }
      }
    }
  }
  /**
   * Updates the snapshot of result slots. 
   */
  updateResultSnapshots() {
    const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
    if (!uiProfile) return;
    const resultSlots = [
      ...uiProfile.resultSlots || [],
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0);
    for (const slot of resultSlots) {
      const item = this.inventory.getItem(slot);
      if (item) {
        this.lastResultSnapshots.set(slot, { typeId: item.typeId, amount: item.amount });
      } else {
        this.lastResultSnapshots.delete(slot);
      }
    }
  }
  /**
   * Checks if an item is valid fuel for this machine.
   * @param {ItemStack} item 
   */
  isValidFuel(item) {
    if (!this.config.FUEL_ITEMS) return true;
    return !!this.config.FUEL_ITEMS[item.typeId];
  }
  /**
   * Called every tick, regardless of processing state.
   * Useful for updating visual states (like 'on' status), fuel timers, or other continuous logic.
   * @param {number} dt - Ticks elapsed.
   */
  onTick(dt) {
  }
  /**
   * Called every tick when players are viewing the machine, after renderUI.
   * Override this to update dynamic UI elements using setItemDisplay.
   */
  updateUI() {
  }
  /**
   * Updates the display properties (Name, Lore) of an item in a specific slot.
   * @param {number} slot - The inventory slot index.
   * @param {string | undefined} name - The new name for the item.
   * @param {string[]} lore - The new lore strings for the item.
   * @param {UIProfile | null} cachedUiProfile - Optional cached profile.
   */
  setItemDisplay(slot, name, lore = [], cachedUiProfile = null) {
    const item = this.inventory.getItem(slot);
    if (!item) return;
    const currentLore = item.getLore();
    const loreChanged = lore.length !== currentLore.length || lore.some((l, i) => l !== currentLore[i]);
    const nameChanged = name !== void 0 && item.nameTag !== name;
    if (!loreChanged && !nameChanged) return;
    if (name !== void 0) item.nameTag = name;
    if (lore !== void 0) item.setLore(lore);
    this.setInventoryItem(slot, item, cachedUiProfile);
  }
  /**
   * Safely consumes a specified amount of items from a slot.
   * Handles decrementing stack size or removing the item if depleted.
   * @param {number} slot - The inventory slot index.
   * @param {number} amount - Amount to consume (default 1).
   * @returns {boolean} True if items were consumed, false if slot was empty or had insufficient items.
   */
  consumeItem(slot, amount = 1) {
    const item = this.inventory.getItem(slot);
    if (!item || item.amount < amount) return false;
    const newAmount = item.amount - amount;
    if (newAmount > 0) {
      item.amount = newAmount;
      this.setInventoryItem(slot, item);
    } else {
      this.setInventoryItem(slot, void 0);
    }
    return true;
  }
  /**
   * Determines if the machine has valid inputs, fuel, and space for outputs.
   * @returns {boolean} True if processing can proceed.
   */
  canProcess() {
    return false;
  }
  /**
   * Executed when 'canProcess' returns true.
   * Handles timer increments, item consumption, and product creation.
   */
  processTick(dt) {
  }
  /**
   * Gets players near the machine for UI interactions.
   * Only called when the machine is marked as 'viewed' by the central manager.
   */
  getNearbyPlayers() {
    return this.block.dimension.getPlayers({
      maxDistance: 6,
      location: this.block.location
    });
  }
  /**
   * Checks if the machine is currently active (processing items).
   * @returns {boolean} True if the 'cook' timer is greater than 0 or if the machine can start processing.
   */
  isRunning() {
    return this.timers.cook && this.timers.cook.value > 0 || this.canProcess();
  }
  /**
   * Prevents players from interacting with UI-only slots (placeholders, static icons, animated bars).
   * Also clears cursor if they picked up a UI item.
   * @param {Player[]} players - List of players to enforce inventory rules on.
   */
  enforceCursor(players) {
    for (const player of players) {
      const cursorComp = player.getComponent("minecraft:cursor_inventory");
      if (cursorComp && cursorComp.item) {
        if (this.isUiItem(cursorComp.item)) {
          cursorComp.clear();
        }
      }
    }
  }
  /**
   * Strict cleanup of player inventory and machine functional slots.
   */
  enforcePlayerInventory(players) {
    const uiProfile = this.cachedUiProfile || this.getCurrentUiProfile();
    if (!uiProfile) return;
    for (const player of players) {
      const inventory = player.getComponent("minecraft:inventory");
      if (!inventory) continue;
      const container = inventory.container;
      for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (this.isUiItem(item)) {
          container.setItem(i, void 0);
        }
      }
    }
    const functionalSlots = new Set([
      ...uiProfile.inputSlots || [],
      ...uiProfile.resultSlots || [],
      uiProfile.fuelSlot,
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0));
    for (let slot = 0; slot < this.inventory.size; slot++) {
      const item = this.inventory.getItem(slot);
      if (!item) continue;
      const isUiItem = this.isUiItem(item);
      if (functionalSlots.has(slot)) {
        if (isUiItem) {
          this.setInventoryItem(slot, void 0, uiProfile);
        }
      } else {
        if (isUiItem && item.amount > 1) {
          item.amount = 1;
          this.setInventoryItem(slot, item, uiProfile);
        }
      }
    }
  }
  /**
   * Renders static UI elements and placeholders.
   */
  renderStaticUI(uiProfile) {
    if (!uiProfile) return;
    const userSlots = [
      ...uiProfile.inputSlots || [],
      ...uiProfile.resultSlots || [],
      uiProfile.fuelSlot,
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0);
    for (let slot = 0; slot < this.inventory.size; slot++) {
      if (userSlots.includes(slot)) continue;
      let desiredId = "gaiadimension:placeholder_invisible";
      if (uiProfile.staticUI && uiProfile.staticUI[slot]) {
        desiredId = uiProfile.staticUI[slot];
      }
      if (uiProfile.buttons && uiProfile.buttons[slot]) {
        desiredId = uiProfile.buttons[slot].icon;
      }
      if (this.dynamicButtons.has(slot)) {
        desiredId = this.dynamicButtons.get(slot).icon;
      }
      let isAnimatedAndRunning = false;
      if (uiProfile.animatedUI) {
        const animPart = uiProfile.animatedUI.find((part) => part.slot === slot);
        if (animPart) {
          const timer = this.timers[animPart.timer];
          if (timer && timer.value > 0) {
            isAnimatedAndRunning = true;
          }
        }
      }
      if (isAnimatedAndRunning) continue;
      const currentItem = this.inventory.getItem(slot);
      if (!currentItem || currentItem.typeId !== desiredId) {
        if (currentItem && currentItem.typeId !== "minecraft:air") {
          this.ejectItem(currentItem);
          try {
            this.inventory.setItem(slot, void 0);
          } catch (e) {
          }
        }
        try {
          this.setInventoryItem(slot, new ItemStack5(desiredId, 1), uiProfile);
        } catch (e) {
        }
      }
    }
  }
  /**
   * Renders animated UI elements based on machine state.
   */
  renderAnimatedUI(uiProfile) {
    if (!uiProfile) return;
    if (uiProfile.animatedUI) {
      for (const part of uiProfile.animatedUI) {
        const timer = this.timers[part.timer];
        if (timer === void 0) continue;
        if (timer.value <= 0) continue;
        const remainingTime = timer.value;
        let maxTime = timer.max;
        if (part.maxTimer && this.timers[part.maxTimer]) {
          maxTime = this.timers[part.maxTimer].value;
        }
        const offset = part.segmentOffset || 0;
        const segment = getSegment(maxTime, remainingTime, part.steps) + offset;
        const frameId = `${part.baseId}_${Math.max(0, segment)}`;
        const currentItem = this.inventory.getItem(part.slot);
        if (!currentItem || currentItem.typeId !== frameId) {
          try {
            this.setInventoryItem(part.slot, new ItemStack5(frameId, 1), uiProfile);
          } catch (e) {
          }
        }
      }
    }
  }
  /**
   * Checks if an item is a protected UI element (static or animated).
   * @param {ItemStack | undefined} item 
   */
  isUiItem(item) {
    if (!item) return false;
    if (BANNED_ITEMS.has(item.typeId)) return true;
    for (const prefix of BANNED_PREFIXES) {
      if (item.typeId.startsWith(prefix)) return true;
    }
    const uiProfile = this.getCurrentUiProfile();
    if (!uiProfile) return false;
    const bannedItems = /* @__PURE__ */ new Set(["gaiadimension:placeholder_invisible"]);
    if (uiProfile.staticUI) {
      Object.values(uiProfile.staticUI).forEach((id) => bannedItems.add(id));
    }
    if (uiProfile.buttons) {
      Object.values(uiProfile.buttons).forEach((btn) => bannedItems.add(btn.icon));
    }
    for (const btn of this.dynamicButtons.values()) {
      bannedItems.add(btn.icon);
    }
    if (bannedItems.has(item.typeId)) return true;
    if (uiProfile.animatedUI) {
      for (const part of uiProfile.animatedUI) {
        if (item.typeId.startsWith(part.baseId)) return true;
      }
    }
    return false;
  }
  /**
   * Ejects an item from the machine's inventory, attempting to return it to a player
   * or dropping it in the world if no player can take it.
   * @param {ItemStack} itemStack - The item to eject.
   */
  ejectItem(itemStack) {
    if (!itemStack || itemStack.amount === 0) return;
    if (this.isUiItem(itemStack)) return;
    const player = this.cachedPlayers[0];
    if (player) {
      const inventory = player.getComponent("minecraft:inventory");
      if (inventory) {
        const container = inventory.container;
        const remainder = container.addItem(itemStack);
        if (!remainder) return;
        itemStack = remainder;
      }
    }
    if (itemStack.amount > 0) {
      const dim = this.block.dimension;
      try {
        const dropLoc = { x: this.block.location.x + 0.5, y: this.block.location.y + 1.2, z: this.block.location.z + 0.5 };
        dim.spawnItem(itemStack, dropLoc);
      } catch (e) {
      }
    }
  }
  /**
   * Retrieves the current UI configuration based on block state.
   */
  getCurrentUiProfile() {
    const pocketUi = this.block.permutation.getState("gaiadimension:pocket_ui");
    return this.config.UI_CONFIG[pocketUi ? "pocketProfile" : "classicProfile"];
  }
  handleHopperInteractions() {
    const uiProfile = this.getCurrentUiProfile();
    if (!uiProfile) return;
    try {
      const hopperBelow = this.block.below();
      if (hopperBelow && hopperBelow.typeId === "minecraft:hopper") {
        const outputSlots = [
          ...uiProfile.resultSlots || [],
          uiProfile.secondaryResultSlot
        ].filter((s) => s !== void 0);
        if (outputSlots.length > 0) {
          this.pushToHopper(hopperBelow, outputSlots);
        }
      }
    } catch (e) {
    }
    try {
      const hopperAbove = this.block.above();
      if (hopperAbove && hopperAbove.typeId === "minecraft:hopper") {
        const facing = hopperAbove.permutation.getState("facing_direction");
        const isLocked = hopperAbove.permutation.getState("toggle_bit");
        if (facing === 0 && !isLocked && uiProfile.inputSlots) {
          this.pullFromHopper(hopperAbove, uiProfile.inputSlots);
        }
      }
    } catch (e) {
    }
    if (uiProfile.fuelSlot !== void 0) {
      const directions = {
        north: 3,
        // Hopper at North must face South (3)
        east: 4,
        // Hopper at East must face West (4)
        south: 2,
        // Hopper at South must face North (2)
        west: 5
        // Hopper at West must face East (5)
      };
      for (const [dir, requiredFacing] of Object.entries(directions)) {
        try {
          const hopperSide = this.block[dir]();
          if (hopperSide && hopperSide.typeId === "minecraft:hopper") {
            const facing = hopperSide.permutation.getState("facing_direction");
            const isLocked = hopperSide.permutation.getState("toggle_bit");
            if (facing === requiredFacing && !isLocked) {
              this.pullFromHopper(hopperSide, [uiProfile.fuelSlot]);
            }
          }
        } catch (e) {
        }
      }
    }
  }
  /**
   * Pushes items from specific machine slots into a target hopper.
   */
  pushToHopper(hopperBlock, sourceSlots) {
    if (hopperBlock.permutation.getState("toggle_bit")) return;
    const inventoryComp = hopperBlock.getComponent("minecraft:inventory");
    const hopperInventory = inventoryComp?.container;
    if (!hopperInventory) return;
    for (const slot of sourceSlots) {
      const item = this.inventory.getItem(slot);
      if (!item) continue;
      const itemToMove = new ItemStack5(item.typeId, 1);
      const remainder = hopperInventory.addItem(itemToMove);
      if (!remainder || remainder.amount === 0) {
        if (item.amount > 1) {
          item.amount--;
          this.setInventoryItem(slot, item);
        } else {
          this.setInventoryItem(slot, void 0);
        }
        return;
      }
    }
  }
  /**
   * Pulls items from a source hopper into specific machine slots.
   */
  pullFromHopper(hopperBlock, targetSlots) {
    const inventoryComp = hopperBlock.getComponent("minecraft:inventory");
    const hopperInventory = inventoryComp?.container;
    if (!hopperInventory) return;
    let hopperSlot = -1;
    let itemToMove = null;
    for (let i = 0; i < hopperInventory.size; i++) {
      const item = hopperInventory.getItem(i);
      if (item) {
        hopperSlot = i;
        itemToMove = item;
        break;
      }
    }
    if (!itemToMove) return;
    for (const slot of targetSlots) {
      const currentItem = this.inventory.getItem(slot);
      if (!currentItem) {
        const newItem = new ItemStack5(itemToMove.typeId, 1);
        this.setInventoryItem(slot, newItem);
        if (itemToMove.amount > 1) {
          itemToMove.amount--;
          hopperInventory.setItem(hopperSlot, itemToMove);
        } else {
          hopperInventory.setItem(hopperSlot, void 0);
        }
        return;
      } else if (currentItem.typeId === itemToMove.typeId && currentItem.amount < currentItem.maxStackSize) {
        currentItem.amount++;
        this.setInventoryItem(slot, currentItem);
        if (itemToMove.amount > 1) {
          itemToMove.amount--;
          hopperInventory.setItem(hopperSlot, itemToMove);
        } else {
          hopperInventory.setItem(hopperSlot, void 0);
        }
        return;
      }
    }
  }
  /**
   * Called when the machine is destroyed/removed.
   * Ejects all valid player items (inputs, outputs, fuel) to the world.
   */
  destroy() {
    if (!this.inventory) return;
    const uiProfile = this.getCurrentUiProfile();
    if (!uiProfile) return;
    const functionalSlots = [
      ...uiProfile.inputSlots || [],
      ...uiProfile.resultSlots || [],
      uiProfile.fuelSlot,
      uiProfile.secondaryResultSlot
    ].filter((s) => s !== void 0);
    const itemsToDrop = [];
    const dim = this.entity.dimension;
    const dropLoc = {
      x: this.entity.location.x,
      y: this.entity.location.y + 0.5,
      z: this.entity.location.z
    };
    for (const slot of functionalSlots) {
      const item = this.inventory.getItem(slot);
      if (item) {
        itemsToDrop.push(new ItemStack5(item.typeId, item.amount));
        try {
          this.inventory.setItem(slot, void 0);
        } catch (e) {
        }
      }
    }
    if (itemsToDrop.length > 0) {
      system16.run(() => {
        for (const stack of itemsToDrop) {
          try {
            dim.spawnItem(stack, dropLoc);
          } catch (e) {
            console.warn(`[Machine] Failed to spawn dropped item: ${e}`);
          }
        }
      });
    }
  }
  /**
   * Registers UI items from a machine config to be strictly managed (banned from drop/player inv).
   * @param {UIConfig} config - The machine's UI_CONFIG
   */
  static processUiConfig(config) {
    if (!config) return;
    BANNED_ITEMS.add("gaiadimension:placeholder_invisible");
    const profiles = [config.classicProfile, config.pocketProfile];
    for (const profile of profiles) {
      if (!profile) continue;
      if (profile.staticUI) {
        Object.values(profile.staticUI).forEach((id) => BANNED_ITEMS.add(id));
      }
      if (profile.animatedUI) {
        profile.animatedUI.forEach((part) => {
          if (part.baseId) BANNED_PREFIXES.add(part.baseId);
        });
      }
    }
  }
};
var BANNED_ITEMS = /* @__PURE__ */ new Set(["gaiadimension:placeholder_invisible"]);
var BANNED_PREFIXES = /* @__PURE__ */ new Set();
world10.afterEvents.entitySpawn.subscribe((event) => {
  const { entity } = event;
  if (entity.typeId !== "minecraft:item") return;
  try {
    const itemComp = entity.getComponent("minecraft:item");
    if (!itemComp || !itemComp.itemStack) return;
    const typeId = itemComp.itemStack.typeId;
    if (BANNED_ITEMS.has(typeId)) {
      system16.run(() => {
        try {
          if (entity.isValid) entity.remove();
        } catch (e) {
        }
      });
      return;
    }
    for (const prefix of BANNED_PREFIXES) {
      if (typeId.startsWith(prefix)) {
        system16.run(() => {
          try {
            if (entity.isValid) entity.remove();
          } catch (e) {
          }
        });
        return;
      }
    }
  } catch (e) {
  }
});

// src/main/bedrock/ts/furnace_recipes/furnace/NativeFurnaceData.ts
import * as MC from "@minecraft/server";
var nativeRecipes = {
  "minecraft:raw_iron": {
    output: "minecraft:iron_ingot"
  },
  "minecraft:raw_gold": {
    output: "minecraft:gold_ingot"
  },
  "minecraft:raw_copper": {
    output: "minecraft:copper_ingot"
  },
  "minecraft:copper_ore": {
    output: "minecraft:copper_ingot"
  },
  "minecraft:iron_ore": {
    output: "minecraft:iron_ingot"
  },
  "minecraft:gold_ore": {
    output: "minecraft:gold_ingot"
  },
  "minecraft:diamond_ore": {
    output: "minecraft:diamond"
  },
  "minecraft:lapis_ore": {
    output: "minecraft:lapis_lazuli"
  },
  "minecraft:redstone_ore": {
    output: "minecraft:redstone"
  },
  "minecraft:coal_ore": {
    output: "minecraft:coal"
  },
  "minecraft:emerald_ore": {
    output: "minecraft:emerald"
  },
  "minecraft:deepslate_copper_ore": {
    output: "minecraft:copper_ingot"
  },
  "minecraft:deepslate_iron_ore": {
    output: "minecraft:iron_ingot"
  },
  "minecraft:deepslate_gold_ore": {
    output: "minecraft:gold_ingot"
  },
  "minecraft:deepslate_diamond_ore": {
    output: "minecraft:diamond"
  },
  "minecraft:deepslate_lapis_ore": {
    output: "minecraft:lapis_lazuli"
  },
  "minecraft:deepslate_redstone_ore": {
    output: "minecraft:redstone"
  },
  "minecraft:deepslate_coal_ore": {
    output: "minecraft:coal"
  },
  "minecraft:deepslate_emerald_ore": {
    output: "minecraft:emerald"
  },
  "minecraft:quartz_ore": {
    output: "minecraft:quartz"
  },
  "minecraft:ancient_debris": {
    output: "minecraft:netherite_scrap"
  },
  "minecraft:nether_gold_ore": {
    output: "minecraft:gold_ingot"
  },
  "minecraft:porkchop": {
    output: "minecraft:cooked_porkchop"
  },
  "minecraft:beef": {
    output: "minecraft:cooked_beef"
  },
  "minecraft:chicken": {
    output: "minecraft:cooked_chicken"
  },
  "minecraft:cod": {
    output: "minecraft:cooked_cod"
  },
  "minecraft:salmon": {
    output: "minecraft:cooked_salmon"
  },
  "minecraft:potato": {
    output: "minecraft:baked_potato"
  },
  "minecraft:mutton": {
    output: "minecraft:cooked_mutton"
  },
  "minecraft:rabbit": {
    output: "minecraft:cooked_rabbit"
  },
  "minecraft:kelp": {
    output: "minecraft:dried_kelp"
  },
  "minecraft:sand": {
    output: "minecraft:glass"
  },
  "minecraft:cobblestone": {
    output: "minecraft:stone"
  },
  "minecraft:sandstone": {
    output: "minecraft:sandstone",
    outputBlockState: {
      "sand_stone_type": "smooth"
    },
    blockState: {
      "sand_stone_type": "default"
    }
  },
  "minecraft:red_sandstone": {
    output: "minecraft:red_sandstone",
    outputBlockState: {
      "sand_stone_type": "smooth"
    },
    blockState: {
      "sand_stone_type": "default"
    }
  },
  "minecraft:stone": {
    output: "minecraft:smooth_stone",
    blockState: {
      "stone_type": "stone"
    }
  },
  "minecraft:quartz_block": {
    output: "minecraft:quartz_block",
    outputBlockState: {
      "chisel_type": "smooth"
    },
    blockState: {
      "chisel_type": "default"
    }
  },
  "minecraft:clay_ball": {
    output: "minecraft:brick"
  },
  "minecraft:netherrack": {
    output: "minecraft:netherbrick"
  },
  "minecraft:nether_brick": {
    output: "minecraft:cracked_nether_bricks"
  },
  "minecraft:basalt": {
    output: "minecraft:smooth_basalt"
  },
  "minecraft:clay": {
    output: "minecraft:hardened_clay"
  },
  "minecraft:stonebrick": {
    output: "minecraft:stonebrick",
    outputBlockState: {
      "stone_brick_type": "cracked"
    },
    blockState: {
      "stone_brick_type": "default"
    }
  },
  "minecraft:polished_blackstone_bricks": {
    output: "minecraft:cracked_polished_blackstone_bricks"
  },
  "minecraft:cobbled_deepslate": {
    output: "minecraft:deepslate"
  },
  "minecraft:deepslate_bricks": {
    output: "minecraft:cracked_deepslate_bricks"
  },
  "minecraft:deepslate_tiles": {
    output: "minecraft:cracked_deepslate_tiles"
  },
  "minecraft:stained_hardened_clay": {
    //hardcoded
    scriptedOutput: function(item) {
      if (!item) return void 0;
      const colorState = MC.world.getBlockStates().get("color");
      if (!colorState) return void 0;
      const colorValues = colorState.validValues;
      for (let i = 0; i < colorValues.length; i++) {
        const color = colorValues[i];
        const block = MC.BlockPermutation.resolve(item.typeId, { "color": color });
        const itemCompare = block.getItemStack(1);
        if (itemCompare && item.isStackableWith(itemCompare)) {
          return new MC.ItemStack(`minecraft:${color}_glazed_terracotta`);
        }
      }
      return void 0;
    }
  },
  "minecraft:cactus": {
    output: "minecraft:green_dye"
  },
  "minecraft:oak_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:spruce_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:birch_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:jungle_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:acacia_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:dark_oak_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:cherry_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:mangrove_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_oak_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_spruce_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_birch_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_jungle_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_acacia_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_dark_oak_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_cherry_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:stripped_mangrove_log": {
    output: "minecraft:charcoal"
  },
  "minecraft:wood": {
    output: "minecraft:charcoal"
  },
  "minecraft:chorus_fruit": {
    output: "minecraft:popped_chorus_fruit"
  },
  "minecraft:sea_pickle": {
    output: "minecraft:lime_dye"
  }
};
var nativeFuels = {
  "minecraft:coal_block": 16e3,
  "minecraft:dried_kelp_block": 4e3,
  "minecraft:blaze_rod": 2400,
  "minecraft:lava_bucket": {
    burnTime: 2e4,
    return: "minecraft:bucket"
  },
  "tag:wood": 1e3,
  "tag:item:minecraft:coals": 1600,
  "tag:item:minecraft:boats": 1200,
  "tag:item:minecraft:wooden_tier": 200,
  "minecraft:scaffolding": 50,
  "minecraft:bamboo_mosaic": 300,
  "minecraft:beehive": 300,
  "minecraft:bee_nest": 300,
  "minecraft:chiseled_bookshelf": 300,
  "minecraft:bamboo_block": 300,
  "minecraft:stripped_bamboo_block": 300,
  "tag:item:minecraft:wooden_slabs": 150,
  "minecraft:oak_stairs": 150,
  "minecraft:spruce_stairs": 150,
  "minecraft:birch_stairs": 150,
  "minecraft:jungle_stairs": 150,
  "minecraft:acacia_stairs": 150,
  "minecraft:dark_oak_stairs": 150,
  "minecraft:mangrove_stairs": 150,
  "minecraft:cherry_stairs": 150,
  "minecraft:bamboo_stairs": 150,
  "minecraft:bamboo_mosaic_stairs": 150,
  "tag:block:wood": 300,
  "minecraft:crafting_table": 300,
  "minecraft:cartography_table": 300,
  "minecraft:fletching_table": 300,
  "minecraft:smithing_table": 300,
  "minecraft:loom": 300,
  "minecraft:bookshelf": 300,
  "minecraft:lectern": 300,
  "minecraft:composter": 300,
  "minecraft:chest": 300,
  "minecraft:trapped_chest": 300,
  "minecraft:jukebox": 300,
  "minecraft:noteblock": 300,
  "minecraft:banner": 300,
  "minecraft:crossbow": 300,
  "minecraft:bow": 300,
  "minecraft:fishing_rod": 300,
  "minecraft:oak_sign": 200,
  "minecraft:spruce_sign": 200,
  "minecraft:birch_sign": 200,
  "minecraft:acacia_sign": 200,
  "minecraft:jungle_sign": 200,
  "minecraft:dark_oak_sign": 200,
  "minecraft:mangrove_sign": 200,
  "minecraft:cherry_sign": 200,
  "minecraft:bamboo_sign": 200,
  "minecraft:bowl": 200,
  "minecraft:sapling": 100,
  "minecraft:mangrove_propagule": 100,
  "minecraft:cherry_sapling": 100,
  "minecraft:stick": 100,
  "minecraft:azalea": 100,
  "minecraft:flowering_azalea": 100,
  "tag:item:minecraft:wool": 100,
  "minecraft:carpet": 67,
  "minecraft:bamboo": 50,
  // Added Fuels
  "minecraft:oak_log": 300,
  "minecraft:spruce_log": 300,
  "minecraft:birch_log": 300,
  "minecraft:jungle_log": 300,
  "minecraft:acacia_log": 300,
  "minecraft:dark_oak_log": 300,
  "minecraft:mangrove_log": 300,
  "minecraft:cherry_log": 300,
  "minecraft:stripped_oak_log": 300,
  "minecraft:stripped_spruce_log": 300,
  "minecraft:stripped_birch_log": 300,
  "minecraft:stripped_jungle_log": 300,
  "minecraft:stripped_acacia_log": 300,
  "minecraft:stripped_dark_oak_log": 300,
  "minecraft:stripped_mangrove_log": 300,
  "minecraft:stripped_cherry_log": 300,
  "minecraft:oak_wood": 300,
  "minecraft:spruce_wood": 300,
  "minecraft:birch_wood": 300,
  "minecraft:jungle_wood": 300,
  "minecraft:acacia_wood": 300,
  "minecraft:dark_oak_wood": 300,
  "minecraft:mangrove_wood": 300,
  "minecraft:cherry_wood": 300,
  "minecraft:stripped_oak_wood": 300,
  "minecraft:stripped_spruce_wood": 300,
  "minecraft:stripped_birch_wood": 300,
  "minecraft:stripped_jungle_wood": 300,
  "minecraft:stripped_acacia_wood": 300,
  "minecraft:stripped_dark_oak_wood": 300,
  "minecraft:stripped_mangrove_wood": 300,
  "minecraft:stripped_cherry_wood": 300,
  "minecraft:crimson_sign": 200,
  "minecraft:warped_sign": 200,
  "minecraft:oak_hanging_sign": 800,
  "minecraft:spruce_hanging_sign": 800,
  "minecraft:birch_hanging_sign": 800,
  "minecraft:jungle_hanging_sign": 800,
  "minecraft:acacia_hanging_sign": 800,
  "minecraft:dark_oak_hanging_sign": 800,
  "minecraft:mangrove_hanging_sign": 800,
  "minecraft:cherry_hanging_sign": 800,
  "minecraft:bamboo_hanging_sign": 800,
  "minecraft:crimson_hanging_sign": 800,
  "minecraft:warped_hanging_sign": 800,
  "minecraft:white_carpet": 67,
  "minecraft:orange_carpet": 67,
  "minecraft:magenta_carpet": 67,
  "minecraft:light_blue_carpet": 67,
  "minecraft:yellow_carpet": 67,
  "minecraft:lime_carpet": 67,
  "minecraft:pink_carpet": 67,
  "minecraft:gray_carpet": 67,
  "minecraft:light_gray_carpet": 67,
  "minecraft:cyan_carpet": 67,
  "minecraft:purple_carpet": 67,
  "minecraft:blue_carpet": 67,
  "minecraft:brown_carpet": 67,
  "minecraft:green_carpet": 67,
  "minecraft:red_carpet": 67,
  "minecraft:black_carpet": 67
};

// src/main/bedrock/ts/furnace_recipes/furnace/RecipeDiscovery.ts
import { world as world12, system as system17, ItemStack as ItemStack7 } from "@minecraft/server";
var DB_PREFIX = "luminiae:fn_";
var ENTITY_ID = "luminiae:recipe_check";
var TICK_BUDGET_MS = 3;
var RecipeDiscoverySystem = class {
  activeTests = /* @__PURE__ */ new Map();
  // Persistence: ID -> {loc, dim}
  runtimeTests = /* @__PURE__ */ new Map();
  // Logic: ID -> {stage, nextTick, ...}
  failedCooldowns = /* @__PURE__ */ new Map();
  // Cooldown: ID -> Expiry Time
  MAX_CONCURRENT_TESTS = 5;
  customRecipes = [];
  constructor() {
    this.init();
  }
  init() {
    this.loadState();
    system17.runInterval(() => this.tick(), 1);
    system17.runTimeout(() => this.resumeTests(), 40);
    world12.afterEvents.entityLoad.subscribe((ev) => {
      if (ev.entity.typeId === ENTITY_ID) {
        if (ev.entity.hasTag("luminiae:checked")) {
          if (!this.runtimeTests.has(ev.entity.nameTag)) {
            this.cleanupTest(ev.entity, ev.entity.nameTag);
          }
        } else {
          ev.entity.addTag("luminiae:checked");
        }
      }
    });
  }
  cleanupTest(entity, id) {
    if (entity && entity.isValid) entity.remove();
  }
  tick() {
    if (this.runtimeTests.size === 0) return;
    const now = Date.now();
    const currentTick = system17.currentTick;
    const toDelete = [];
    for (const [id, test] of this.runtimeTests) {
      if (Date.now() - now > TICK_BUDGET_MS) break;
      if (currentTick >= test.nextTick) {
        if (!test.marker || !test.marker.isValid) {
          console.warn(`[RecipeDiscovery] Marker lost for ${id}. Restarting setup.`);
          this.cleanupBlocks(test);
          this.startTest(id, test.location, test.dimension);
          return;
        }
        if (test.stage === 0) {
          if (!this.checkLitState(test)) {
            this.markFailed(id);
            toDelete.push(id);
            this.cleanupBlocks(test);
          } else {
            test.stage = 1;
            test.nextTick = currentTick + 205;
          }
        } else if (test.stage === 1) {
          if (this.analyzeResult(id, test)) {
            toDelete.push(id);
            this.cleanupBlocks(test);
          } else {
            this.markFailed(id);
            toDelete.push(id);
            this.cleanupBlocks(test);
          }
        }
      }
    }
    for (const id of toDelete) {
      this.runtimeTests.delete(id);
      this.activeTests.delete(id);
      this.saveState("tests");
    }
  }
  discover(inputId, location, dimension) {
    if (nativeRecipes[inputId] || this.activeTests.has(inputId)) return;
    const cooldown = this.failedCooldowns.get(inputId);
    if (cooldown) {
      if (Date.now() < cooldown) return;
      this.failedCooldowns.delete(inputId);
    }
    if (this.activeTests.size >= this.MAX_CONCURRENT_TESTS) return;
    this.startTest(inputId, location, dimension);
  }
  startTest(inputId, location, dimension) {
    this.activeTests.set(inputId, { location, dimId: dimension.id });
    this.saveState("tests");
    const offset = this.runtimeTests.size * 2;
    const testY = Math.max(dimension.heightRange.min + 4, -60);
    const testLoc = { x: location.x, y: testY, z: location.z + offset };
    let marker;
    try {
      marker = dimension.spawnEntity(ENTITY_ID, testLoc);
      marker.nameTag = inputId;
    } catch (e) {
      this.activeTests.delete(inputId);
      this.saveState("tests");
      return;
    }
    const types = ["furnace", "blast_furnace", "smoker"];
    for (let i = 0; i < types.length; i++) {
      const blockLoc = { x: testLoc.x + i, y: testLoc.y, z: testLoc.z };
      try {
        const block = dimension.getBlock(blockLoc);
        if (block) {
          block.setType(`minecraft:${types[i]}`);
          const inv = block.getComponent("inventory")?.container;
          if (inv) {
            inv.setItem(0, new ItemStack7(inputId, 1));
            inv.setItem(1, new ItemStack7("minecraft:oak_log", 1));
            inv.setItem(2, void 0);
          }
        }
      } catch (e) {
      }
    }
    this.runtimeTests.set(inputId, {
      stage: 0,
      nextTick: system17.currentTick + 60,
      // Wait 60 ticks (3s) for lag/ignition
      location: testLoc,
      dimension,
      marker,
      types
    });
  }
  checkLitState(test) {
    const { location, dimension, types } = test;
    for (let i = 0; i < types.length; i++) {
      try {
        const blockLoc = { x: location.x + i, y: location.y, z: location.z };
        const block = dimension.getBlock(blockLoc);
        if (block && block.typeId.includes("lit")) return true;
      } catch (e) {
      }
    }
    return false;
  }
  analyzeResult(inputId, test) {
    let found = false;
    const { location, dimension, types } = test;
    for (let i = 0; i < types.length; i++) {
      const blockLoc = { x: location.x + i, y: location.y, z: location.z };
      const block = dimension.getBlock(blockLoc);
      if (!block) continue;
      const inv = block.getComponent("inventory")?.container;
      if (inv) {
        const result = inv.getItem(2);
        if (result) {
          this.customRecipes.push({
            input: inputId,
            output: result.typeId,
            type: types[i]
          });
          found = true;
        }
      }
    }
    if (found) {
      this.saveState("recipes");
      this.applyRecipes();
    }
    return found;
  }
  cleanupBlocks(test) {
    const { location, dimension, marker } = test;
    if (marker && marker.isValid) marker.remove();
    for (let i = 0; i < 3; i++) {
      try {
        const block = dimension.getBlock({ x: location.x + i, y: location.y, z: location.z });
        if (block) block.setType("minecraft:air");
      } catch (e) {
      }
    }
  }
  markFailed(inputId) {
    this.failedCooldowns.set(inputId, Date.now() + 12e4);
  }
  resumeTests() {
    for (const [inputId, data] of this.activeTests) {
      if (this.runtimeTests.has(inputId)) continue;
      try {
        const dim = world12.getDimension(data.dimId);
        if (dim) this.startTest(inputId, data.location, dim);
      } catch (e) {
      }
    }
  }
  loadState() {
    try {
      const activeRaw = world12.getDynamicProperty(`${DB_PREFIX}tests`);
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        for (const [k, v] of Object.entries(parsed)) this.activeTests.set(k, v);
      }
      const customRaw = world12.getDynamicProperty(`${DB_PREFIX}recipes`);
      if (customRaw) {
        this.customRecipes = JSON.parse(customRaw);
        this.applyRecipes();
      }
    } catch (e) {
    }
  }
  saveState(key) {
    try {
      if (key === "tests") world12.setDynamicProperty(`${DB_PREFIX}tests`, JSON.stringify(Object.fromEntries(this.activeTests)));
      else if (key === "recipes") world12.setDynamicProperty(`${DB_PREFIX}recipes`, JSON.stringify(this.customRecipes));
    } catch (e) {
    }
  }
  applyRecipes() {
    for (const recipe of this.customRecipes) {
      nativeRecipes[recipe.input] = { output: recipe.output };
    }
  }
};
var recipeDiscovery = new RecipeDiscoverySystem();

// src/main/bedrock/ts/API/lib/BlockEntity.ts
import { world as world13, system as system18 } from "@minecraft/server";
var BlockEntityManager = class {
  registeredMachineClasses = /* @__PURE__ */ new Map();
  activeMachineInstances = /* @__PURE__ */ new Map();
  // Maps entity.id -> Machine instance
  activeMachineList = [];
  // Array for efficient batch processing
  locationToEntityId = /* @__PURE__ */ new Map();
  // Optimization: Maps "x,y,z" -> entity.id
  lastProcessedIndex = 0;
  // For budget-based ticking
  pendingSpawns = /* @__PURE__ */ new Set();
  // Track locations currently being spawned to prevent duplicates
  lastPlacementTick = 0;
  // Global cooldown to prevent self-healing race conditions
  constructor() {
    this.registerEventListeners();
  }
  /**
   * Registers a new machine class with the system.
   * @param machineClass The class definition of the machine.
   */
  register(machineClass) {
    if (!machineClass || !machineClass.NAME) {
      console.warn("[BlockEntity] Registration failed: machineClass must have a static NAME property.");
      return;
    }
    const blockId = `gaiadimension:${machineClass.NAME}`;
    this.registeredMachineClasses.set(blockId, machineClass);
    if (typeof machineClass.processUiConfig === "function") {
      machineClass.processUiConfig(machineClass.UI_CONFIG);
    }
  }
  registerEventListeners() {
    world13.afterEvents.playerPlaceBlock.subscribe(this.handlePlayerPlaceBlock.bind(this));
    world13.beforeEvents.playerBreakBlock.subscribe(this.handlePlayerBreakBlock.bind(this));
    world13.afterEvents.explosion.subscribe(this.handleExplosion.bind(this));
    system18.runInterval(this.handlePlayerViewCheck.bind(this), 5);
    system18.runInterval(this.handleMachineTick.bind(this), 1);
    world13.afterEvents.worldLoad.subscribe(this.handleWorldLoad.bind(this));
    world13.afterEvents.entityLoad.subscribe(this.handleEntityLoad.bind(this));
  }
  handleExplosion(event) {
    const impactedBlocks = event.getImpactedBlocks();
    for (const block of impactedBlocks) {
      const location = block.location;
      const locKey = `${location.x},${location.y},${location.z}`;
      const entityId = this.locationToEntityId.get(locKey);
      if (entityId) {
        const machineInstance = this.activeMachineInstances.get(entityId);
        if (machineInstance) {
          this.removeMachine(entityId, machineInstance);
        }
      }
    }
  }
  handleEntityLoad(event) {
    const entity = event.entity;
    if (entity.typeId.startsWith("luminiae_generic:block_entity")) {
      this.registerEntityAsMachine(entity);
    }
  }
  registerEntityAsMachine(entity) {
    if (this.activeMachineInstances.has(entity.id)) return;
    let blockLocationStr = entity.getDynamicProperty("blockLocation");
    let blockLocation;
    let blockId = entity.getDynamicProperty("machineId");
    if (blockLocationStr) {
      try {
        blockLocation = JSON.parse(blockLocationStr);
      } catch (e) {
        console.warn(`[BlockEntity] Corrupt blockLocation data for ${entity.id}`);
      }
    }
    if (!blockLocation || !blockId) {
      const loc = entity.location;
      const candidateLoc = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
      try {
        const candidateBlock = entity.dimension.getBlock(candidateLoc);
        if (candidateBlock && this.registeredMachineClasses.has(candidateBlock.typeId)) {
          console.warn(`[BlockEntity] Auto-healing lost link for ${entity.id} at ${candidateLoc.x}, ${candidateLoc.y}, ${candidateLoc.z}`);
          blockLocation = candidateLoc;
          blockId = candidateBlock.typeId;
          entity.setDynamicProperty("blockLocation", JSON.stringify(blockLocation));
          if (entity.typeId.startsWith("luminiae_generic:block_entity")) {
            entity.setDynamicProperty("machineId", blockId);
          }
        } else {
          return;
        }
      } catch (e) {
        return;
      }
    }
    if (blockId && this.registeredMachineClasses.has(blockId)) {
      try {
        const block = entity.dimension.getBlock(blockLocation);
        if (block && block.typeId === blockId) {
          const MachineClass = this.registeredMachineClasses.get(blockId);
          const machineInstance = new MachineClass(entity, block);
          machineInstance.locKey = `${blockLocation.x},${blockLocation.y},${blockLocation.z}`;
          this.activeMachineInstances.set(entity.id, machineInstance);
          this.activeMachineList.push(machineInstance);
          this.locationToEntityId.set(machineInstance.locKey, entity.id);
        }
      } catch (e) {
        console.warn(`[BlockEntity] Error registering entity ${entity.id}: ${e}`);
      }
    }
  }
  handlePlayerPlaceBlock(event) {
    const { block } = event;
    this.lastPlacementTick = system18.currentTick;
    if (this.registeredMachineClasses.has(block.typeId)) {
      const x = Math.floor(block.location.x);
      const y = Math.floor(block.location.y);
      const z = Math.floor(block.location.z);
      const locKey = `${x},${y},${z}`;
      if (this.locationToEntityId.has(locKey)) {
        console.warn(`[BlockEntity] Skipping spawn at ${locKey}: Entity already registered.`);
        return;
      }
      this.pendingSpawns.add(locKey);
      system18.run(() => {
        try {
          if (this.locationToEntityId.has(locKey)) return;
          const MachineClass = this.registeredMachineClasses.get(block.typeId);
          const useLarge = MachineClass.INVENTORY_SIZE === 54;
          const entityId = useLarge ? "luminiae_generic:block_entity_large" : "luminiae_generic:block_entity";
          const center = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
          const entity = block.dimension.spawnEntity(entityId, center);
          entity.setDynamicProperty("blockLocation", JSON.stringify({ x, y, z }));
          entity.setDynamicProperty("machineId", block.typeId);
          const machineInstance = new MachineClass(entity, block);
          machineInstance.locKey = locKey;
          this.activeMachineInstances.set(entity.id, machineInstance);
          this.activeMachineList.push(machineInstance);
          this.locationToEntityId.set(locKey, entity.id);
        } catch (e) {
          console.warn(`[BlockEntity] Error spawning/registering: ${e}`);
        } finally {
          this.pendingSpawns.delete(locKey);
        }
      });
    }
  }
  handlePlayerBreakBlock(event) {
    const { block } = event;
    if (this.registeredMachineClasses.has(block.typeId)) {
      const locKey = `${block.location.x},${block.location.y},${block.location.z}`;
      const entityId = this.locationToEntityId.get(locKey);
      if (entityId) {
        const machineInstance = this.activeMachineInstances.get(entityId);
        if (machineInstance) {
          this.removeMachine(entityId, machineInstance);
        }
      }
    }
  }
  removeMachine(entityId, machineInstance) {
    if (machineInstance && typeof machineInstance.destroy === "function") {
      try {
        machineInstance.destroy();
      } catch (e) {
        console.error(`Error destroying machine instance: ${e}`);
      }
    }
    this.activeMachineInstances.delete(entityId);
    const index = this.activeMachineList.indexOf(machineInstance);
    if (index > -1) {
      this.activeMachineList.splice(index, 1);
    }
    if (machineInstance.locKey) {
      this.locationToEntityId.delete(machineInstance.locKey);
    }
    if (machineInstance.entity && machineInstance.entity.isValid) {
      try {
        machineInstance.entity.remove();
      } catch (e) {
        system18.run(() => {
          try {
            if (machineInstance.entity.isValid) machineInstance.entity.remove();
          } catch (e2) {
            console.error(`[BlockEntity] Error removing entity: ${e2}`);
          }
        });
      }
    }
  }
  /**
   * Centralized Raycasting: Offloads physics checks from hundreds of individual machines 
   * to a single per-player pass. Flags viewed machines for prioritized 20TPS updates.
   */
  handlePlayerViewCheck() {
    for (const machine of this.activeMachineList) {
      machine.isViewed = false;
    }
    const machinesToShrink = /* @__PURE__ */ new Set();
    for (const player of world13.getAllPlayers()) {
      const blockHit = player.getBlockFromViewDirection({ maxDistance: 7 });
      let targetMachine = null;
      if (blockHit) {
        const locKey = `${blockHit.block.x},${blockHit.block.y},${blockHit.block.z}`;
        const entityId = this.locationToEntityId.get(locKey);
        if (entityId) {
          targetMachine = this.activeMachineInstances.get(entityId) || null;
        } else if (this.registeredMachineClasses.has(blockHit.block.typeId) && !this.pendingSpawns.has(locKey)) {
          if (system18.currentTick - this.lastPlacementTick > 20) {
            console.warn(`[BlockEntity] Self-healing missing entity at ${locKey}`);
            try {
              const MachineClass = this.registeredMachineClasses.get(blockHit.block.typeId);
              const useLarge = MachineClass.INVENTORY_SIZE === 54;
              const entityTypeId = useLarge ? "luminiae_generic:block_entity_large" : "luminiae_generic:block_entity";
              const center = { x: blockHit.block.x + 0.5, y: blockHit.block.y + 0.5, z: blockHit.block.z + 0.5 };
              const existingEntities = blockHit.block.dimension.getEntities({
                location: center,
                maxDistance: 0.8,
                type: entityTypeId
              });
              let entity;
              if (existingEntities.length > 0) {
                entity = existingEntities[0];
                console.warn(`[BlockEntity] Found physical entity ${entity.id}, rebinding...`);
              } else {
                entity = blockHit.block.dimension.spawnEntity(entityTypeId, center);
                entity.setDynamicProperty("blockLocation", JSON.stringify(blockHit.block.location));
                entity.setDynamicProperty("machineId", blockHit.block.typeId);
              }
              if (!this.activeMachineInstances.has(entity.id)) {
                const machineInstance = new MachineClass(entity, blockHit.block);
                machineInstance.locKey = locKey;
                this.activeMachineInstances.set(entity.id, machineInstance);
                this.activeMachineList.push(machineInstance);
                this.locationToEntityId.set(locKey, entity.id);
                targetMachine = machineInstance;
              } else {
                targetMachine = this.activeMachineInstances.get(entity.id) || null;
              }
            } catch (e) {
              console.warn(`[BlockEntity] Failed to self-heal: ${e}`);
            }
          }
        }
      }
      if (!targetMachine) {
        const entityHits = player.getEntitiesFromViewDirection({ maxDistance: 7 });
        for (const hit of entityHits) {
          if (this.activeMachineInstances.has(hit.entity.id)) {
            targetMachine = this.activeMachineInstances.get(hit.entity.id) || null;
            break;
          }
        }
      }
      if (targetMachine && targetMachine.entity) {
        targetMachine.isViewed = true;
        const isSneaking = player.isSneaking;
        const mainhandItem = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId || "";
        const isHoldingTool = mainhandItem.includes("_pickaxe") || mainhandItem.includes("wrench");
        if (isSneaking || isHoldingTool) {
          machinesToShrink.add(targetMachine.entity.id);
        }
      }
    }
    for (const machineInstance of this.activeMachineList) {
      const entity = machineInstance.entity;
      if (!entity || !entity.isValid) continue;
      const shouldShrink = machinesToShrink.has(entity.id);
      const isShrunk = entity.hasTag("shrunk");
      if (shouldShrink && !isShrunk) {
        entity.triggerEvent("general_block_entity:shrink");
        entity.addTag("shrunk");
      } else if (!shouldShrink && isShrunk) {
        entity.triggerEvent("general_block_entity:expand");
        entity.removeTag("shrunk");
      }
    }
  }
  /**
   * Priority & Budget Ticking:
   * 1. Priority: Viewed machines tick every frame (20TPS) for smooth UI.
   * 2. Budget: Ambient machines tick via round-robin with DT compensation.
   */
  handleMachineTick() {
    const totalMachines = this.activeMachineList.length;
    if (totalMachines === 0) return;
    const PROCESS_LIMIT = 40;
    const TIME_BUDGET_MS = 5;
    const startTime = Date.now();
    const currentTick = system18.currentTick;
    for (const machine of this.activeMachineList) {
      if (machine.isViewed && machine.entity?.isValid) {
        try {
          const dt = currentTick - machine.lastTickTime;
          if (dt > 0) {
            if (machine.block && machine.block.typeId === `gaiadimension:${machine.config.NAME}`) {
              machine.tick(dt);
              machine.lastTickTime = currentTick;
            }
          }
        } catch (e) {
          console.error(`Error ticking viewed machine: ${e}`);
        }
      }
    }
    let processedCount = 0;
    let attempts = 0;
    while (processedCount < PROCESS_LIMIT && attempts < totalMachines) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break;
      this.lastProcessedIndex = (this.lastProcessedIndex + 1) % totalMachines;
      const machine = this.activeMachineList[this.lastProcessedIndex];
      attempts++;
      if (!machine || machine.isViewed) continue;
      if (!machine.entity?.isValid) {
        this.removeMachine(machine.entity.id, machine);
        this.lastProcessedIndex--;
        continue;
      }
      try {
        const dt = currentTick - machine.lastTickTime;
        if (dt > 0) {
          let currentBlockTypeId;
          try {
            currentBlockTypeId = machine.block?.typeId;
          } catch (err) {
            continue;
          }
          if (machine.block && currentBlockTypeId === `gaiadimension:${machine.config.NAME}`) {
            machine.tick(dt);
            machine.lastTickTime = currentTick;
            processedCount++;
          } else {
            this.removeMachine(machine.entity.id, machine);
            this.lastProcessedIndex--;
          }
        }
      } catch (e) {
        console.error(`Error ticking ambient machine: ${e}`);
      }
    }
  }
  handleWorldLoad() {
    const dimensions = getDimensions();
    dimensions.forEach((dimension) => {
      const entities = dimension.getEntities({ families: ["luminiae_generic"] });
      for (const entity of entities) {
        this.registerEntityAsMachine(entity);
      }
    });
  }
  getXP(blockLocation) {
    let xp = 0;
    const locKey = `${blockLocation.x},${blockLocation.y},${blockLocation.z}`;
    const entityId = this.locationToEntityId.get(locKey);
    if (entityId) {
      const machine = this.activeMachineInstances.get(entityId);
      if (machine && typeof machine.getRequiredXP === "function") {
        xp = machine.getRequiredXP();
      }
    }
    return xp;
  }
};
var blockEntityManager = new BlockEntityManager();
var BlockEntity_default = blockEntityManager;

// src/main/bedrock/ts/blocks/furnaces/GaiaFurnace.ts
var GaiaFurnace = class extends Machine {
  static get NAME() {
    return "gaia_furnace";
  }
  static get TIMERS() {
    return {
      cook: { max: 200 },
      burn: { max: 0 },
      max_burn: { max: 0 }
    };
  }
  static get UI_CONFIG() {
    const staticUI = {
      11: "gaiadimension:furnace_flame_empty",
      13: "gaiadimension:generic_progress_arrow_empty",
      9: "gaiadimension:gaia_stone_furnace_part_1",
      17: "gaiadimension:gaia_stone_furnace_part_2",
      4: "gaiadimension:gaia_stone_furnace_name"
    };
    const animatedUI = [
      { slot: 11, timer: "burn", maxTimer: "max_burn", baseId: "gaiadimension:furnace_flame", steps: 12 },
      { slot: 13, timer: "cook", baseId: "gaiadimension:generic_progress_arrow", steps: 22 }
    ];
    return {
      classicProfile: {
        inputSlots: [2],
        fuelSlot: 20,
        resultSlots: [15],
        staticUI: { ...staticUI },
        animatedUI
      },
      pocketProfile: {
        inputSlots: [2],
        fuelSlot: 20,
        resultSlots: [15],
        staticUI: { ...staticUI },
        animatedUI
      }
    };
  }
  onTick(dt) {
    if (this.timers.burn.value > 0) {
      this.timers.burn.value = Math.max(0, this.timers.burn.value - dt);
    }
    if (!this.canProcess() && this.timers.cook.value > 0) {
      this.timers.cook.value = 0;
    }
    try {
      const isBurning = this.timers.burn.value > 0;
      const currentState = this.block.permutation.getState("gaiadimension:furnace_on");
      if (isBurning !== currentState) {
        this.block.setPermutation(this.block.permutation.withState("gaiadimension:furnace_on", isBurning));
      }
    } catch (e) {
    }
  }
  updateUI() {
    const profile = this.cachedUiProfile || this.getCurrentUiProfile();
    const burnPercent = this.timers.max_burn.value > 0 ? Math.ceil(this.timers.burn.value / this.timers.max_burn.value * 100) : 0;
    this.setItemDisplay(11, "\xA76Furnace Heat", [`\xA77Intensity: ${burnPercent}%`], profile);
    const cookPercent = Math.floor(this.timers.cook.value / this.timers.cook.max * 100);
    this.setItemDisplay(13, "\xA7eRefining Progress", [`\xA77Status: ${cookPercent}%`], profile);
    this.setItemDisplay(4, "\xA7l\xA7bGaia Furnace", ["\xA77Smelting"], profile);
    for (let i = 0; i < this.inventory.size; i++) {
      const item = this.inventory.getItem(i);
      if (item && item.typeId === "gaiadimension:placeholder_invisible") {
        this.setItemDisplay(i, "\xA78Gaia Furnace", [], profile);
      }
    }
  }
  canProcess() {
    const inputItem = this.inventory.getItem(2);
    if (!inputItem) return false;
    const recipe = this.getRecipe(inputItem);
    if (!recipe) return false;
    if (this.timers.burn.value <= 0) {
      const fuelItem = this.inventory.getItem(20);
      if (!fuelItem || !this.getFuelValue(fuelItem)) return false;
    }
    const outputItem = this.inventory.getItem(15);
    if (outputItem) {
      if (outputItem.typeId !== recipe.output || outputItem.amount + 1 > outputItem.maxStackSize) return false;
    }
    return true;
  }
  processTick(dt = 1) {
    const profile = this.cachedUiProfile || this.getCurrentUiProfile();
    if (this.timers.burn.value <= 0) {
      const fuelItem = this.inventory.getItem(20);
      const burnTime = this.getFuelValue(fuelItem);
      if (burnTime > 0) {
        this.consumeItem(20, 1);
        this.timers.burn.value = burnTime;
        this.timers.max_burn.value = burnTime;
      } else return;
    }
    const inputItem = this.inventory.getItem(2);
    const recipe = this.getRecipe(inputItem);
    if (!recipe) {
      this.timers.cook.value = 0;
      return;
    }
    this.timers.cook.max = 200;
    this.timers.cook.add(dt);
    if (this.timers.cook.value >= this.timers.cook.max) {
      this.timers.cook.value = 0;
      this.consumeItem(2, 1);
      this.addToSlot(15, new ItemStack8(recipe.output, 1), profile);
    }
  }
  addToSlot(slot, itemStack, profile) {
    const current = this.inventory.getItem(slot);
    if (!current) {
      this.setInventoryItem(slot, itemStack, profile);
    } else if (current.typeId === itemStack.typeId) {
      const maxStack = current.maxStackSize ?? 64;
      if (current.amount < maxStack) {
        const space = maxStack - current.amount;
        const add = Math.min(space, itemStack.amount);
        if (add > 0) {
          current.amount += add;
          this.setInventoryItem(slot, current, profile);
        }
      }
    }
  }
  getRecipe(input) {
    if (!input) return null;
    if (nativeRecipes[input.typeId]) {
      const recipe = nativeRecipes[input.typeId];
      if (recipe.output) {
        return { output: recipe.output, time: 200 };
      }
    }
    recipeDiscovery.discover(input.typeId, this.block.location, this.block.dimension);
    return null;
  }
  getFuelValue(item) {
    if (!item) return 0;
    if (nativeFuels[item.typeId]) {
      const val = nativeFuels[item.typeId];
      return typeof val === "object" ? val.burnTime : val;
    }
    for (const [key, val] of Object.entries(nativeFuels)) {
      if (key.startsWith("tag:")) {
        let tagName = key.replace("tag:", "");
        if (tagName.startsWith("item:")) tagName = tagName.replace("item:", "");
        if (tagName.startsWith("block:")) tagName = tagName.replace("block:", "");
        if (item.hasTag(tagName)) {
          return typeof val === "object" ? val.burnTime : val;
        }
      }
    }
    return 0;
  }
};
BlockEntity_default.register(GaiaFurnace);
function registerGaiaFurnaceComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:gaia_furnace", {
    onPlace: (arg) => {
      const { block, dimension } = arg;
      const location = block.location;
      const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
      try {
        const entity = dimension.spawnEntity("luminiae_generic:block_entity", center);
        BlockEntity_default.registerEntityAsMachine(entity);
      } catch (e) {
        console.warn("Failed to spawn gaia furnace entity", e);
      }
    },
    onPlayerDestroy: () => {
    }
  });
}

// src/main/bedrock/ts/blocks/glittering_fire.ts
import { world as world15, system as system19 } from "@minecraft/server";

// src/main/bedrock/ts/API/lib/PortalLib.ts
import {
  BlockPermutation as BlockPermutation7,
  BlockVolume
} from "@minecraft/server";
var PortalManager = class {
  static registeredPortals = /* @__PURE__ */ new Map();
  static register(portalBlockId, frameBlockId, options = {}) {
    this.registeredPortals.set(portalBlockId, {
      frameId: frameBlockId,
      ...options
    });
  }
  static tryIgnite(originBlock) {
    if (!originBlock || !originBlock.dimension) {
      return false;
    }
    for (const [portalId, config] of this.registeredPortals) {
      if (this.attemptPortalCreation(originBlock, portalId, config.frameId)) {
        return true;
      }
    }
    return false;
  }
  static attemptPortalCreation(originBlock, portalId, frameId) {
    const shapeX = this.detectPortalShape(originBlock, frameId, "x");
    if (shapeX) {
      this.fillPortal(shapeX, portalId, "x");
      return true;
    }
    const shapeZ = this.detectPortalShape(originBlock, frameId, "z");
    if (shapeZ) {
      this.fillPortal(shapeZ, portalId, "z");
      return true;
    }
    return false;
  }
  static detectPortalShape(startBlock, frameId, axis) {
    const dim = startBlock.dimension;
    if (!dim) return null;
    const { x, y, z } = startBlock.location;
    const MAX_SIZE = 21;
    const MIN_SIZE = 2;
    const fillerId = startBlock.typeId;
    const dx = axis === "x" ? 1 : 0;
    const dz = axis === "z" ? 1 : 0;
    const minYLimit = dim.heightRange ? dim.heightRange.min : -64;
    const maxYLimit = dim.heightRange ? dim.heightRange.max : 320;
    let bottomY = y;
    while (true) {
      const checkY = bottomY - 1;
      if (bottomY - y < -MAX_SIZE) return null;
      if (checkY < minYLimit) return null;
      let block;
      try {
        block = dim.getBlock({ x, y: checkY, z });
      } catch (e) {
        return null;
      }
      if (!block) return null;
      if (this.isEmptyBlock(dim, block.location) || block.typeId === fillerId) {
        bottomY = checkY;
      } else if (block.typeId === frameId) {
        break;
      } else {
        return null;
      }
    }
    let topY = bottomY;
    while (true) {
      if (topY - bottomY >= MAX_SIZE) return null;
      if (topY + 1 > maxYLimit) return null;
      let block;
      try {
        block = dim.getBlock({ x, y: topY + 1, z });
      } catch (e) {
        return null;
      }
      if (!block) return null;
      if (this.isEmptyBlock(dim, block.location) || block.typeId === fillerId) {
        topY++;
      } else if (block.typeId === frameId) {
        break;
      } else {
        return null;
      }
    }
    const height = topY - bottomY + 1;
    if (height < MIN_SIZE) {
      return null;
    }
    let minSide = 0;
    let maxSide = 0;
    for (let i = 1; i <= MAX_SIZE; i++) {
      const cx = x - dx * i;
      const cz = z - dz * i;
      if (!this.checkColumn(dim, cx, cz, bottomY, topY, frameId, fillerId)) {
        if (this.checkFrameColumn(dim, cx, cz, bottomY, topY, frameId)) {
          minSide = -i;
          break;
        } else {
          return null;
        }
      }
    }
    for (let i = 1; i <= MAX_SIZE; i++) {
      const cx = x + dx * i;
      const cz = z + dz * i;
      if (!this.checkColumn(dim, cx, cz, bottomY, topY, frameId, fillerId)) {
        if (this.checkFrameColumn(dim, cx, cz, bottomY, topY, frameId)) {
          maxSide = i;
          break;
        } else {
          return null;
        }
      }
    }
    if (minSide === 0 || maxSide === 0) return null;
    const width = maxSide - minSide - 1;
    if (width < MIN_SIZE) return null;
    for (let i = minSide; i <= maxSide; i++) {
      const cx = x + dx * i;
      const cz = z + dz * i;
      const floorBlock = dim.getBlock({ x: cx, y: bottomY - 1, z: cz });
      const ceilBlock = dim.getBlock({ x: cx, y: topY + 1, z: cz });
      if (!floorBlock || floorBlock.typeId !== frameId) return null;
      if (!ceilBlock || ceilBlock.typeId !== frameId) return null;
    }
    return {
      dimension: dim,
      bounds: {
        minX: x + dx * minSide + (axis === "x" ? 1 : 0),
        maxX: x + dx * maxSide - (axis === "x" ? 1 : 0),
        minZ: z + dz * minSide + (axis === "z" ? 1 : 0),
        maxZ: z + dz * maxSide - (axis === "z" ? 1 : 0),
        minY: bottomY,
        maxY: topY
      }
    };
  }
  static checkColumn(dim, x, z, minY, maxY, frameId, fillerId) {
    for (let y = minY; y <= maxY; y++) {
      let block;
      try {
        block = dim.getBlock({ x, y, z });
      } catch (e) {
        return false;
      }
      if (!block || !this.isEmptyBlock(dim, block.location) && block.typeId !== fillerId) return false;
    }
    return true;
  }
  static checkFrameColumn(dim, x, z, minY, maxY, frameId) {
    for (let y = minY; y <= maxY; y++) {
      let block;
      try {
        block = dim.getBlock({ x, y, z });
      } catch (e) {
        return false;
      }
      if (!block || block.typeId !== frameId) return false;
    }
    return true;
  }
  static fillPortal(shape, portalId, axis) {
    const { dimension, bounds } = shape;
    const { minX, maxX, minZ, maxZ, minY, maxY } = bounds;
    let blockPerm = null;
    try {
      const perm = BlockPermutation7.resolve(portalId);
      try {
        const dir = axis === "x" ? "north" : "east";
        blockPerm = perm.withState("minecraft:cardinal_direction", dir);
      } catch (e2) {
        blockPerm = perm;
      }
    } catch (e) {
    }
    let filled = false;
    if (blockPerm) {
      try {
        const volume = new BlockVolume(
          { x: minX, y: minY, z: minZ },
          { x: maxX, y: maxY, z: maxZ }
        );
        dimension.fillBlocks(volume, blockPerm, { matchingBlock: void 0 });
        filled = true;
      } catch (e) {
      }
    }
    if (!filled) {
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          for (let y = minY; y <= maxY; y++) {
            const block = dimension.getBlock({ x, y, z });
            if (block) {
              try {
                if (blockPerm) {
                  block.setPermutation(blockPerm);
                } else {
                  block.setType(portalId);
                }
              } catch (e) {
                try {
                  block.setType(portalId);
                } catch (e2) {
                }
              }
            }
          }
        }
      }
    }
    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: (minZ + maxZ) / 2
    };
    dimension.playSound("block.end_portal.spawn", center);
  }
  static getExistingPortal(pos, dimension, portalBlockId, range = 128) {
    const startX = Math.floor(pos.x);
    const startZ = Math.floor(pos.z);
    const scanRange = 16;
    for (let x = startX - scanRange; x <= startX + scanRange; x += 16) {
      for (let z = startZ - scanRange; z <= startZ + scanRange; z += 16) {
        for (let y = dimension.heightRange.min; y < dimension.heightRange.max; y += 16) {
          try {
            const block = dimension.getBlock({ x, y, z });
            if (block && block.typeId === portalBlockId) {
              return block;
            }
          } catch (e) {
          }
        }
      }
    }
    return null;
  }
  static makePortal(pos, dimension, axis, portalBlockId, frameBlockId) {
    const origin = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
    const worldBorder = 3e7;
    const heightMax = dimension.heightRange.max;
    const heightMin = dimension.heightRange.min;
    const direction = axis === "x" ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };
    const crossDir = axis === "x" ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
    let d0 = -1;
    let blockpos = null;
    let d1 = -1;
    let blockpos1 = null;
    const spiral = this.spiralAround(origin, 16);
    for (const mut of spiral) {
      if (!this.isWithinBounds(mut, worldBorder) || !this.isWithinBounds(this.offset(mut, direction), worldBorder)) continue;
      const checkPos = this.offset(mut, { x: -direction.x, y: -direction.y, z: -direction.z });
      for (let l = heightMax - 1; l >= heightMin; l--) {
        checkPos.y = l;
        if (this.canReplaceBlock(dimension, checkPos)) {
          let i1 = l;
          while (l > heightMin && this.canReplaceBlock(dimension, this.offset(checkPos, { x: 0, y: -1, z: 0 }))) {
            l--;
          }
          if (l + 4 <= heightMax) {
            let j1 = i1 - l;
            if (j1 <= 0 || j1 >= 3) {
              checkPos.y = l;
              if (this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, 0)) {
                const d2 = this.distSqr(origin, checkPos);
                if (this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, -1) && this.checkRegionForPlacement(dimension, checkPos, direction, crossDir, 1) && (d0 === -1 || d0 > d2)) {
                  d0 = d2;
                  blockpos = { ...checkPos };
                }
                if (d0 === -1 && (d1 === -1 || d1 > d2)) {
                  d1 = d2;
                  blockpos1 = { ...checkPos };
                }
              }
            }
          }
        }
      }
    }
    if (d0 === -1 && d1 !== -1) {
      blockpos = blockpos1;
      d0 = d1;
    }
    if (d0 === -1 || !blockpos) {
      blockpos = {
        x: origin.x,
        y: Math.max(heightMin + 70, Math.min(origin.y, heightMax - 10)),
        z: origin.z
      };
      for (let fOffset = -1; fOffset < 2; ++fOffset) {
        for (let fWidth = 0; fWidth < 2; ++fWidth) {
          for (let fHeight = -1; fHeight < 3; ++fHeight) {
            const isFloor = fHeight < 0;
            const p = {
              x: blockpos.x + fWidth * direction.x + fOffset * crossDir.x,
              y: blockpos.y + fHeight,
              z: blockpos.z + fWidth * direction.z + fOffset * crossDir.z
            };
            const blk = dimension.getBlock(p);
            if (blk) blk.setPermutation(BlockPermutation7.resolve(isFloor ? frameBlockId : "minecraft:air"));
          }
        }
      }
    }
    for (let fWidth = -1; fWidth < 3; ++fWidth) {
      for (let fHeight = -1; fHeight < 4; ++fHeight) {
        if (fWidth === -1 || fWidth === 2 || fHeight === -1 || fHeight === 3) {
          const p = {
            x: blockpos.x + fWidth * direction.x,
            y: blockpos.y + fHeight,
            z: blockpos.z + fWidth * direction.z
          };
          const blk = dimension.getBlock(p);
          if (blk) blk.setPermutation(BlockPermutation7.resolve(frameBlockId));
        }
      }
    }
    const portalPerm = BlockPermutation7.resolve(portalBlockId);
    let orientedPerm;
    try {
      orientedPerm = portalPerm.withState("axis", axis);
    } catch {
      try {
        orientedPerm = portalPerm.withState("minecraft:cardinal_direction", axis === "x" ? "east" : "south");
      } catch {
        orientedPerm = portalPerm;
      }
    }
    for (let pWidth = 0; pWidth < 2; ++pWidth) {
      for (let pHeight = 0; pHeight < 3; ++pHeight) {
        const p = {
          x: blockpos.x + pWidth * direction.x,
          y: blockpos.y + pHeight,
          z: blockpos.z + pWidth * direction.z
        };
        const blk = dimension.getBlock(p);
        if (blk) blk.setPermutation(orientedPerm);
      }
    }
    return blockpos;
  }
  static breakPortal(dimension, startLoc, portalBlockId) {
    const queue = [startLoc];
    const visited = /* @__PURE__ */ new Set();
    const key = (l) => `${l.x},${l.y},${l.z}`;
    visited.add(key(startLoc));
    const blocksToBreak = [];
    const MAX_BLOCKS = 600;
    let head = 0;
    while (head < queue.length && blocksToBreak.length < MAX_BLOCKS) {
      const current = queue[head++];
      let block;
      try {
        block = dimension.getBlock(current);
      } catch (e) {
        continue;
      }
      if (!block) continue;
      if (block.typeId === portalBlockId) {
        blocksToBreak.push(block);
        const neighbors = [
          { x: current.x + 1, y: current.y, z: current.z },
          { x: current.x - 1, y: current.y, z: current.z },
          { x: current.x, y: current.y + 1, z: current.z },
          { x: current.x, y: current.y - 1, z: current.z },
          { x: current.x, y: current.y, z: current.z + 1 },
          { x: current.x, y: current.y, z: current.z - 1 }
        ];
        for (const n of neighbors) {
          const k = key(n);
          if (!visited.has(k)) {
            visited.add(k);
            queue.push(n);
          }
        }
      }
    }
    if (blocksToBreak.length > 0) {
      dimension.playSound("break.amethyst_block", startLoc);
      for (const b of blocksToBreak) {
        try {
          b.setType("minecraft:air");
        } catch (e) {
        }
      }
    }
  }
  static checkRegionForPlacement(dimension, originalPos, direction, crossDir, offsetScale) {
    for (let i = -1; i < 3; ++i) {
      for (let j = -1; j < 4; ++j) {
        const p = {
          x: originalPos.x + direction.x * i + crossDir.x * offsetScale,
          y: originalPos.y + j,
          z: originalPos.z + direction.z * i + crossDir.z * offsetScale
        };
        if (j < 0 && !this.isSolid(dimension, p)) {
          return false;
        }
        if (j >= 0 && !this.isEmptyBlock(dimension, p)) {
          return false;
        }
      }
    }
    return true;
  }
  static canReplaceBlock(dimension, pos) {
    try {
      const block = dimension.getBlock(pos);
      if (!block) return false;
      if (block.isAir || block.isLiquid || block.typeId.includes("minecraft:light_block")) return true;
      if (block.typeId.includes("grass") || block.typeId.includes("flower") || block.typeId.includes("snow")) return true;
      return false;
    } catch (e) {
      return false;
    }
  }
  static isSolid(dimension, pos) {
    try {
      const block = dimension.getBlock(pos);
      return block !== void 0 && !block.isAir && !block.isLiquid && !block.typeId.includes("minecraft:light_block");
    } catch (e) {
      return false;
    }
  }
  static isEmptyBlock(dimension, pos) {
    return this.canReplaceBlock(dimension, pos);
  }
  static isWithinBounds(pos, border) {
    return Math.abs(pos.x) < border && Math.abs(pos.z) < border;
  }
  static distSqr(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return dx * dx + dy * dy + dz * dz;
  }
  static offset(pos, offset) {
    return { x: pos.x + offset.x, y: pos.y + offset.y, z: pos.z + offset.z };
  }
  static *spiralAround(center, radius) {
    let x = 0;
    let z = 0;
    let dx = 0;
    let dz = -1;
    yield { x: center.x, y: center.y, z: center.z };
    const maxSteps = (2 * radius + 1) ** 2;
    for (let i = 0; i < maxSteps; i++) {
      if (-radius <= x && x <= radius && -radius <= z && z <= radius) {
        if (x !== 0 || z !== 0) {
          yield { x: center.x + x, y: center.y, z: center.z + z };
        }
      }
      if (x === z || x < 0 && x === -z || x > 0 && x === 1 - z) {
        const temp = dx;
        dx = -dz;
        dz = temp;
      }
      x += dx;
      z += dz;
    }
  }
};

// src/main/bedrock/ts/config/mod_config.ts
import { world as world14 } from "@minecraft/server";

// src/main/bedrock/ts/systems/DataSystem.ts
var DataSystem = class {
  /**
   * Traverses an object using a path string (e.g., "inventory[0].id")
   */
  static getByPath(obj, path) {
    if (!path) return obj;
    const parts = path.split(/[.\[\]]+/).filter((p) => p !== "");
    let current = obj;
    for (const part of parts) {
      if (current === void 0 || current === null) return void 0;
      current = current[part];
    }
    return current;
  }
  /**
   * Sets a value in an object using a path string.
   */
  static setByPath(obj, path, value) {
    const parts = path.split(/[.\[\]]+/).filter((p) => p !== "");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const currentObj = current;
      if (!(part in currentObj)) {
        const nextPart = parts[i + 1];
        currentObj[part] = !isNaN(Number(nextPart)) ? [] : {};
      }
      current = currentObj[part];
    }
    current[parts[parts.length - 1]] = value;
    return obj;
  }
  /**
   * Deep merges source into target
   */
  static deepMerge(target, source) {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];
      if (sourceValue instanceof Object && key in target && targetValue instanceof Object) {
        Object.assign(sourceValue, this.deepMerge(targetValue, sourceValue));
      }
    }
    Object.assign(target || {}, source);
    return target;
  }
  /**
   * Helper to read the "root" data object from a target's dynamic property
   */
  static getRoot(target, key = "nbt") {
    const raw = target.getDynamicProperty(key);
    if (typeof raw !== "string") return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  /**
   * Helper to save the "root" data object
   */
  static saveRoot(target, data, key = "nbt") {
    target.setDynamicProperty(key, JSON.stringify(data));
  }
};

// src/main/bedrock/ts/config/mod_config.ts
var CONFIG_KEY = "mod_config";
var DEFAULT_HOT_BIOMES = [
  "minecraft:desert",
  "minecraft:desert_hills",
  "minecraft:mutated_desert",
  "minecraft:jungle",
  "minecraft:jungle_hills",
  "minecraft:jungle_edge",
  "minecraft:mutated_jungle",
  "minecraft:mutated_jungle_edge",
  "minecraft:bamboo_jungle",
  "minecraft:bamboo_jungle_hills",
  "minecraft:savanna",
  "minecraft:savanna_plateau",
  "minecraft:mutated_savanna",
  "minecraft:mutated_savanna_rocky",
  "minecraft:badlands",
  "minecraft:eroded_badlands",
  "minecraft:badlands_plateau",
  "minecraft:mutated_badlands_plateau",
  "minecraft:wooded_badlands_plateau",
  "minecraft:mutated_wooded_badlands_plateau"
];
var ModConfig = class {
  /**
   * Portal Biome Restriction Setting
   */
  static get portalBiomeRestriction() {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    return root.portalBiomeRestriction ?? true;
  }
  static set portalBiomeRestriction(value) {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    root.portalBiomeRestriction = value;
    DataSystem.saveRoot(world14, root, CONFIG_KEY);
  }
  /**
   * Allow All Biomes Setting
   */
  static get allowAllBiomes() {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    return root.allowAllBiomes ?? false;
  }
  static set allowAllBiomes(value) {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    root.allowAllBiomes = value;
    DataSystem.saveRoot(world14, root, CONFIG_KEY);
  }
  /**
   * List of biomes where the portal can be ignited
   */
  static get hotBiomes() {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    return root.hotBiomes ?? [...DEFAULT_HOT_BIOMES];
  }
  static set hotBiomes(value) {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    root.hotBiomes = value;
    DataSystem.saveRoot(world14, root, CONFIG_KEY);
  }
  /**
   * Comprehensive list of all biomes encountered by players
   */
  static get discoveredBiomes() {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    const discovered = root.discoveredBiomes ?? [...DEFAULT_HOT_BIOMES];
    return discovered;
  }
  static set discoveredBiomes(value) {
    const root = DataSystem.getRoot(world14, CONFIG_KEY);
    root.discoveredBiomes = value;
    DataSystem.saveRoot(world14, root, CONFIG_KEY);
  }
  static registerDiscoveredBiome(biomeId) {
    const discovered = this.discoveredBiomes;
    if (!discovered.includes(biomeId)) {
      discovered.push(biomeId);
      discovered.sort();
      this.discoveredBiomes = discovered;
    }
  }
  static addHotBiome(biomeId) {
    this.registerDiscoveredBiome(biomeId);
    const biomes = this.hotBiomes;
    if (!biomes.includes(biomeId)) {
      biomes.push(biomeId);
      this.hotBiomes = biomes;
    }
  }
  static removeHotBiome(biomeId) {
    const biomes = this.hotBiomes.filter((id) => id !== biomeId);
    this.hotBiomes = biomes;
  }
  static getAll() {
    return {
      portalBiomeRestriction: this.portalBiomeRestriction,
      allowAllBiomes: this.allowAllBiomes,
      hotBiomes: this.hotBiomes,
      discoveredBiomes: this.discoveredBiomes
    };
  }
};

// src/main/bedrock/ts/blocks/glittering_fire.ts
PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");
var playerHitboxes = /* @__PURE__ */ new Map();
function registerGlitteringFireComponent() {
  system19.runInterval(() => {
    for (const player of world15.getAllPlayers()) {
      const raycast = player.getBlockFromViewDirection({ maxDistance: 5 });
      const currentHitbox = playerHitboxes.get(player.id);
      if (raycast && raycast.block.typeId === "gaiadimension:glittering_fire") {
        const fireBlock = raycast.block;
        const loc = fireBlock.location;
        const center = { x: loc.x + 0.5, y: loc.y + 0.2, z: loc.z + 0.5 };
        if (currentHitbox) {
          const hLoc = currentHitbox.location;
          if (Math.floor(hLoc.x) !== loc.x || Math.floor(hLoc.y) !== loc.y || Math.floor(hLoc.z) !== loc.z) {
            try {
              currentHitbox.teleport(center);
            } catch (e) {
              playerHitboxes.delete(player.id);
            }
          }
        } else {
          try {
            const entity = player.dimension.spawnEntity("gaiadimension:fire_hitbox", center);
            playerHitboxes.set(player.id, entity);
          } catch (e) {
          }
        }
      } else if (currentHitbox) {
        try {
          if (currentHitbox.isValid) currentHitbox.remove();
        } catch (e) {
        }
        playerHitboxes.delete(player.id);
      }
    }
  }, 2);
  world15.afterEvents.playerLeave.subscribe((event) => {
    const { playerId } = event;
    const currentHitbox = playerHitboxes.get(playerId);
    if (currentHitbox) {
      try {
        if (currentHitbox.isValid) currentHitbox.remove();
      } catch (e) {
      }
      playerHitboxes.delete(playerId);
    }
  });
  world15.afterEvents.entityHitEntity.subscribe((event) => {
    const { hitEntity } = event;
    if (hitEntity.typeId === "gaiadimension:fire_hitbox") {
      const loc = hitEntity.location;
      const blockLoc = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
      const dimension = hitEntity.dimension;
      system19.run(() => {
        const block = dimension.getBlock(blockLoc);
        if (block && block.typeId === "gaiadimension:glittering_fire") {
          block.setType("minecraft:air");
          dimension.playSound("random.fizz", blockLoc, {
            volume: 1,
            pitch: 1
          });
        }
        if (hitEntity.isValid) hitEntity.remove();
        for (const [pid, entity] of playerHitboxes) {
          if (entity.id === hitEntity.id) {
            playerHitboxes.delete(pid);
            break;
          }
        }
      });
    }
  });
  world15.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      system19.run(() => {
        try {
          const dimension = block.dimension;
          const location = block.location;
          if (dimension.id === "minecraft:overworld" && ModConfig.portalBiomeRestriction && !ModConfig.allowAllBiomes) {
            const biome = dimension.getBiome(location);
            const hotBiomes = ModConfig.hotBiomes;
            if (!hotBiomes.includes(biome.id)) {
              const currentBlock2 = dimension.getBlock(location);
              if (currentBlock2 && currentBlock2.typeId === "gaiadimension:glittering_fire") {
                currentBlock2.setType("minecraft:air");
                dimension.playSound("random.fizz", location);
              }
              return;
            }
          }
          const currentBlock = dimension.getBlock(location);
          if (currentBlock && currentBlock.typeId === "gaiadimension:glittering_fire") {
            PortalManager.tryIgnite(currentBlock);
          }
        } catch (e) {
        }
      });
    }
  });
  world15.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      event.cancel = true;
    }
  });
  world15.afterEvents.playerBreakBlock.subscribe((event) => {
    const { block, brokenBlockPermutation, dimension } = event;
    const brokenId = brokenBlockPermutation.type.id;
    if (PortalManager.registeredPortals.has(brokenId)) {
      const neighbors = [
        block.above(),
        block.below(),
        block.north(),
        block.south(),
        block.east(),
        block.west()
      ];
      for (const neighbor of neighbors) {
        if (neighbor && neighbor.typeId === brokenId) {
          PortalManager.breakPortal(dimension, neighbor.location, brokenId);
          break;
        }
      }
      return;
    }
    for (const [portalId, config] of PortalManager.registeredPortals) {
      if (config.frameId === brokenId) {
        const neighbors = [
          block.above(),
          block.below(),
          block.north(),
          block.south(),
          block.east(),
          block.west()
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

// src/main/bedrock/ts/blocks/crates/crude_storage_crate.ts
var CrudeStorageCrate = class extends Machine {
  static get NAME() {
    return "crude_storage_crate";
  }
  static get INVENTORY_SIZE() {
    return 27;
  }
  static get UI_CONFIG() {
    const slots = Array.from({ length: 27 }, (_, i) => i);
    return {
      classicProfile: {
        inputSlots: slots
      },
      pocketProfile: {
        inputSlots: slots
      }
    };
  }
  constructor(entity, block) {
    super(entity, block);
    if (this.entity && this.entity.isValid) {
      this.entity.nameTag = "Crude Storage Crate";
    }
  }
  onLoad() {
    if (this.entity && this.entity.isValid) {
      this.entity.nameTag = "Crude Storage Crate";
    }
  }
};
BlockEntity_default.register(CrudeStorageCrate);
function registerCrudeStorageCrateComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:crude_storage_crate", {
    onPlace: (event) => {
      const { block, dimension } = event;
      const location = block.location;
      const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
      try {
        const entity = dimension.spawnEntity("gaiadimension:crude_storage_crate", center);
        BlockEntity_default.registerEntityAsMachine(entity);
      } catch (e) {
        console.warn("Failed to spawn crude storage crate entity", e);
      }
    }
  });
}

// src/main/bedrock/ts/blocks/crates/mega_storage_crate.ts
var MegaStorageCrate = class extends Machine {
  static get NAME() {
    return "mega_storage_crate";
  }
  static get INVENTORY_SIZE() {
    return 54;
  }
  static get UI_CONFIG() {
    const slots = Array.from({ length: 54 }, (_, i) => i);
    return {
      classicProfile: {
        inputSlots: slots
      },
      pocketProfile: {
        inputSlots: slots
      }
    };
  }
  constructor(entity, block) {
    super(entity, block);
    if (this.entity && this.entity.isValid) {
      this.entity.nameTag = "Mega Storage Crate";
    }
  }
  onLoad() {
    if (this.entity && this.entity.isValid) {
      this.entity.nameTag = "Mega Storage Crate";
    }
  }
};
BlockEntity_default.register(MegaStorageCrate);
function registerMegaStorageCrateComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:mega_storage_crate", {
    onPlace: (event) => {
      const { block, dimension } = event;
      const location = block.location;
      const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
      try {
        const entity = dimension.spawnEntity("gaiadimension:mega_storage_crate", center);
        BlockEntity_default.registerEntityAsMachine(entity);
      } catch (e) {
        console.warn("Failed to spawn mega storage crate entity", e);
      }
    }
  });
}

// src/main/bedrock/ts/mixins/LightMixin.ts
import { world as world17, system as system21, BlockPermutation as BlockPermutation9 } from "@minecraft/server";

// src/main/bedrock/ts/world/Gaia.ts
import { world as world16, system as system20, BlockPermutation as BlockPermutation8, BlockVolume as BlockVolume2 } from "@minecraft/server";
var GAIA_DIMENSION_ID = "gaiadimension:gaia_dimension";
var DimensionSystem = class {
  static isInGaia(player) {
    return player.dimension.id === GAIA_DIMENSION_ID;
  }
  static getBiome(player) {
    try {
      const biome = player.dimension.getBiome(player.location);
      return biome ? biome.id.replace("minecraft:", "").replace("gaiadimension:", "") : "crystal_plains";
    } catch (e) {
      return "crystal_plains";
    }
  }
  static async teleport(player, targetDimId) {
    if (!player.isValid) return;
    const targetDim = world16.getDimension(targetDimId);
    const isToGaia = targetDimId === GAIA_DIMENSION_ID;
    const targetX = player.location.x / (isToGaia ? 4 : 0.25);
    const targetZ = player.location.z / (isToGaia ? 4 : 0.25);
    const targetY = isToGaia ? 100 : 70;
    const spawn = { x: targetX, y: targetY, z: targetZ };
    const tickingAreaId = `teleport_${player.id}`;
    player.sendMessage(`\xA7eLoading Gaia Dimension...`);
    await world16.tickingAreaManager.createTickingArea(tickingAreaId, {
      dimension: targetDim,
      from: { x: spawn.x - 8, y: 0, z: spawn.z - 8 },
      to: { x: spawn.x + 8, y: 128, z: spawn.z + 8 }
    });
    const px = Math.floor(spawn.x);
    const py = Math.floor(spawn.y);
    const pz = Math.floor(spawn.z);
    targetDim.fillBlocks(
      new BlockVolume2({ x: px - 2, y: py - 1, z: pz - 2 }, { x: px + 2, y: py - 1, z: pz + 2 }),
      "minecraft:obsidian",
      { ignoreChunkBoundErrors: true }
    );
    const keystone = "gaiadimension:keystone_block";
    const portal = "gaiadimension:gaia_dimension_portal";
    for (let i = -1; i <= 2; i++) {
      targetDim.getBlock({ x: px + i, y: py, z: pz })?.setType(keystone);
      targetDim.getBlock({ x: px + i, y: py + 4, z: pz })?.setType(keystone);
    }
    for (let i = 1; i <= 3; i++) {
      targetDim.getBlock({ x: px - 1, y: py + i, z: pz })?.setType(keystone);
      targetDim.getBlock({ x: px + 2, y: py + i, z: pz })?.setType(keystone);
    }
    const portalPerm = BlockPermutation8.resolve(portal, { "gaiadimension:perm_dim": 0 });
    for (let ix = 0; ix <= 1; ix++) {
      for (let iy = 1; iy <= 3; iy++) {
        targetDim.getBlock({ x: px + ix, y: py + iy, z: pz })?.setPermutation(portalPerm);
      }
    }
    player.teleport({ x: px + 0.5, y: py + 1, z: pz + 0.5 }, { dimension: targetDim });
    system20.runTimeout(() => {
      try {
        world16.tickingAreaManager.removeTickingArea(tickingAreaId);
      } catch (e) {
      }
    }, 100);
  }
};
system20.runInterval(() => {
  for (const player of world16.getAllPlayers()) {
    if (!player.isValid) continue;
    const block = player.dimension.getBlock(player.location);
    if (block && block.typeId === "gaiadimension:gaia_dimension_portal") {
      const lastTeleport = player.getDynamicProperty("last_teleport") ?? 0;
      if (system20.currentTick - lastTeleport < 150) continue;
      player.setDynamicProperty("last_teleport", system20.currentTick);
      const targetDim = DimensionSystem.isInGaia(player) ? "minecraft:overworld" : GAIA_DIMENSION_ID;
      DimensionSystem.teleport(player, targetDim);
    }
  }
}, 10);

// src/main/bedrock/ts/mixins/LightMixin.ts
var lightBlockPermutation;
system21.run(() => {
  try {
    lightBlockPermutation = BlockPermutation9.resolve("minecraft:light_block", { "minecraft:block_light_level": 15 });
  } catch (e) {
  }
});
function initializeLightMixin() {
  world17.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;
    const dimId = dimension.id;
    let stateVal = 0;
    const typeId = block.typeId;
    const isExcluded = typeId === "gaiadimension:glittering_fire" || typeId === "gaiadimension:stairs_collision" || typeId.includes("curtain") || typeId.includes("door") || typeId.includes("fluid") || typeId.includes("liquid") || typeId.includes("water") || typeId.includes("magma") || typeId.includes("muck");
    try {
      const currentState = block.permutation.getState("gaiadimension:perm_dim");
      if (currentState === void 0) return;
      const inGaia = DimensionSystem.isInGaia({
        location: block.location,
        dimension,
        isValid: true
      });
      if (inGaia) {
        stateVal = 0;
      } else if (dimId === "minecraft:overworld" && !inGaia) {
        stateVal = 1;
      } else if (dimId === "minecraft:nether") {
        stateVal = 2;
      }
      if (currentState !== stateVal) {
        const newPerm = block.permutation.withState("gaiadimension:perm_dim", stateVal);
        block.setPermutation(newPerm);
      }
    } catch (e) {
    }
  });
  world17.afterEvents.playerBreakBlock.subscribe((event) => {
  });
}

// src/main/bedrock/ts/systems/scriptevents.ts
import { system as system22, ItemStack as ItemStack9 } from "@minecraft/server";
function initializeScriptEvents() {
  system22.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "gaiadimension:give_agate_arrow") {
      const arrow = event.sourceEntity;
      if (!arrow) return;
      const { dimension, location } = arrow;
      const players = dimension.getPlayers({
        location,
        maxDistance: 3,
        closest: 1
      });
      if (players.length > 0) {
        const player = players[0];
        const inventory = player.getComponent("minecraft:inventory");
        if (inventory && inventory.container) {
          inventory.container.addItem(new ItemStack9("gaiadimension:agate_arrow", 1));
        }
      }
    }
  });
}

// src/main/bedrock/ts/fluids/fluids.ts
import { world as world19, system as system24, BlockPermutation as BlockPermutation10, ItemStack as ItemStack10, BlockVolume as BlockVolume3, Player as Player17, GameMode as GameMode4 } from "@minecraft/server";

// src/main/bedrock/ts/fluids/lib/FluidTemplate.ts
var FluidTemplate = class {
  static blockResolver;
  static physicsStates = /* @__PURE__ */ new Map();
  /**
   * The amount the level decreases for each horizontal block spread.
   */
  get decayPerBlock() {
    return 1;
  }
  /**
   * How far to search for a slope/hole when spreading horizontally.
   */
  get slopeFindDistance() {
    return 4;
  }
  /**
   * The delay in ticks between each spread operation.
   * Higher values result in slower flow.
   */
  get spreadDelay() {
    return 5;
  }
};

// src/main/bedrock/ts/fluids/lib/utils.ts
function generateFluidIDs(baseName) {
  return [
    baseName,
    baseName + "_down",
    baseName + "1",
    baseName + "2",
    baseName + "3"
  ];
}

// src/main/bedrock/ts/fluids/lib/FogManager.ts
var FogManager = class {
  static pushFog(player, fogId, userFogId) {
    try {
      player.runCommand(`fog @s push "${fogId}" "${userFogId}"`);
    } catch (e) {
    }
  }
  static popFog(player, userFogId) {
    try {
      player.runCommand(`fog @s remove "${userFogId}"`);
    } catch (e) {
    }
  }
};

// src/main/bedrock/ts/fluids/templates/LavaTemplate.ts
import { system as system23 } from "@minecraft/server";
var LavaTemplate = class extends FluidTemplate {
  _ids;
  _idsSet;
  playerState = /* @__PURE__ */ new Map();
  constructor(baseName) {
    super();
    this._ids = generateFluidIDs(baseName);
    this._idsSet = new Set(this._ids);
  }
  get fluidIDs() {
    return this._ids;
  }
  get spreadDelay() {
    return 15;
  }
  get decayPerBlock() {
    return 2;
  }
  get slopeFindDistance() {
    return 2;
  }
  getInteractions() {
    return [
      {
        targetBlock: ["minecraft:water", "minecraft:flowing_water"],
        action: "transformSelf",
        resultBlock: "pu_bn:fragile_magma",
        directions: "adjacent",
        sound: "random.fizz"
      },
      {
        targetBlock: ["minecraft:water", "minecraft:flowing_water"],
        action: "transformTarget",
        resultBlock: "pu_bn:fragile_magma",
        directions: "below",
        sound: "random.fizz"
      },
      {
        targetBlock: ["minecraft:water", "minecraft:flowing_water"],
        action: "transformSelf",
        resultBlock: "pu_bn:fragile_magma",
        directions: "below",
        sound: "random.fizz"
      }
    ];
  }
  onPlayerTick(player, block, isHeadInside, isFeetInside) {
    const prevState = this.playerState.get(player.id) || { head: false };
    let gravityScale = 1;
    let amplifier = 0;
    if (isHeadInside) {
      gravityScale = 0.6;
      amplifier = 2;
    } else if (isFeetInside) {
      const loc = player.location;
      const resolver = FluidTemplate.blockResolver;
      const midBlock = resolver ? resolver(player.dimension, loc.x, loc.y + 0.8, loc.z) : player.dimension.getBlock({ x: loc.x, y: loc.y + 0.8, z: loc.z });
      if (midBlock && this._idsSet.has(midBlock.typeId)) {
        gravityScale = 1;
        amplifier = 1;
      } else {
        gravityScale = 1.6;
        amplifier = 0;
      }
    }
    if (player.isSneaking) {
      gravityScale = Math.max(0.2, gravityScale - 0.4);
      amplifier = Math.min(2, amplifier + 1);
    }
    if (isHeadInside || isFeetInside) {
      FluidTemplate.physicsStates.set(player.id, {
        player,
        drag: 0.5,
        acceleration: 0.02,
        gravityScale,
        canSprint: false
      });
    }
    player.setOnFire(10, true);
    if (system23.currentTick % 20 === 0) {
      player.applyDamage(4, { cause: "lava" });
    }
    const userFogId = "fluid_fog";
    if (isHeadInside) {
      FogManager.pushFog(player, "pu_bn:liquid_magma_fog", userFogId);
    } else if (prevState.head) {
      FogManager.popFog(player, userFogId);
    }
    this.playerState.set(player.id, { head: isHeadInside });
  }
  onEntityTick(entity, block) {
    if (entity.typeId === "minecraft:item") {
      entity.setOnFire(5, true);
      return;
    }
    entity.setOnFire(10, true);
    if (system23.currentTick % 20 === 0) {
      entity.applyDamage(4, { cause: "lava" });
    }
    entity.addEffect("slow_falling", 4, { amplifier: 1, showParticles: false });
  }
  processBoat(boat, dimension, isDeep) {
  }
};

// src/main/bedrock/ts/fluids/templates/WaterTemplate.ts
var WaterTemplate = class extends FluidTemplate {
  _ids;
  _idsSet;
  config;
  playerState = /* @__PURE__ */ new Map();
  constructor(config) {
    super();
    this.config = config;
    this._ids = generateFluidIDs(config.baseName);
    this._idsSet = new Set(this._ids);
  }
  get fluidIDs() {
    return this._ids;
  }
  get spreadDelay() {
    return this.config.spreadDelay ?? 5;
  }
  get decayPerBlock() {
    return this.config.decayPerBlock ?? 1;
  }
  get slopeFindDistance() {
    return this.config.slopeFindDistance ?? 4;
  }
  getInteractions() {
    return this.config.interactions || [];
  }
  onPlayerTick(player, block, isHeadInside, isFeetInside) {
    const prevState = this.playerState.get(player.id) || { head: false, feet: false };
    let gravityScale = 1;
    let amplifier = 0;
    if (this.config.viscosity !== void 0) {
      gravityScale = this.config.viscosity / 2;
      amplifier = 2;
    } else {
      if (isHeadInside) {
        gravityScale = 0.6;
        amplifier = 2;
      } else if (isFeetInside) {
        const loc = player.location;
        const resolver = FluidTemplate.blockResolver;
        const midBlock = resolver ? resolver(player.dimension, loc.x, loc.y + 0.8, loc.z) : player.dimension.getBlock({ x: loc.x, y: loc.y + 0.8, z: loc.z });
        if (midBlock && this._idsSet.has(midBlock.typeId)) {
          gravityScale = 1;
          amplifier = 1;
        } else {
          gravityScale = 1.5;
          amplifier = 0;
        }
      }
      if (player.isSneaking) {
        gravityScale = Math.max(0.2, gravityScale - 0.6);
        amplifier = Math.min(2, amplifier + 1);
      }
    }
    const baseDrag = this.config.stickiness ? Math.max(0.3, 0.8 - this.config.stickiness * 0.1) : 0.8;
    if (isHeadInside || isFeetInside) {
      FluidTemplate.physicsStates.set(player.id, {
        player,
        drag: baseDrag,
        acceleration: 0.02,
        gravityScale,
        canSprint: !this.config.stickiness
      });
    }
    const userFogId = "fluid_fog";
    if (isHeadInside) {
      if (this.config.fogId) {
        FogManager.pushFog(player, this.config.fogId, userFogId);
      }
    } else if (prevState.head) {
      FogManager.popFog(player, userFogId);
    }
    if (isHeadInside && !prevState.head) {
      player.playSound("ambient.underwater.enter", { volume: 0.5, pitch: 1 });
      player.playSound("ambient.underwater.loop", { volume: 1, pitch: 1 });
    } else if (!isHeadInside && prevState.head) {
      player.playSound("ambient.underwater.exit", { volume: 0.5, pitch: 1 });
      player.runCommand("stopsound @s ambient.underwater.loop");
    }
    this.playerState.set(player.id, { head: isHeadInside, feet: isFeetInside });
  }
  processBoat(boat, dimension, isDeep) {
    if (!this.config.hasBoatPhysics) return;
    if (isDeep) {
      boat.applyImpulse({ x: 0, y: 0.2, z: 0 });
    }
    const rotation = boat.getRotation().y;
    const dirX = -Math.sin(rotation * (Math.PI / 180));
    const dirZ = Math.cos(rotation * (Math.PI / 180));
    const vel = boat.getVelocity();
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed > 0.01) {
      boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
    }
    this.manageBoatHolder(boat, dimension);
  }
  manageBoatHolder(boat, dimension) {
    const location = boat.location;
    const holders = dimension.getEntities({
      type: "pu_bn:boat_holder",
      location,
      maxDistance: 2
    });
    let holder = holders.length > 0 ? holders[0] : null;
    let waterTopY = Math.floor(location.y) + 1;
    const targetHolderY = waterTopY - 0.55;
    if (!holder) {
      holder = dimension.spawnEntity("pu_bn:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
    }
    if (holder && holder.isValid) {
      try {
        holder.teleport(
          { x: location.x, y: targetHolderY, z: location.z },
          { dimension, rotation: { x: 0, y: boat.getRotation().y } }
        );
      } catch {
      }
    }
  }
};

// src/main/bedrock/ts/fluids/EntityEffects.ts
var ENTITY_EFFECT_QUERY_RADIUS = 32;
var ENTITY_EFFECT_CLUSTER_JOIN_RADIUS = 32;
var ENTITY_EFFECT_CLUSTER_FETCH_RADIUS = ENTITY_EFFECT_QUERY_RADIUS + ENTITY_EFFECT_CLUSTER_JOIN_RADIUS;
var distanceSquared = (left, right) => {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return dx * dx + dy * dy + dz * dz;
};
var buildEntityEffectClusters = (players) => {
  const clusters = [];
  const maxJoinDistanceSquared = ENTITY_EFFECT_CLUSTER_JOIN_RADIUS * ENTITY_EFFECT_CLUSTER_JOIN_RADIUS;
  for (const player of players) {
    if (!player?.isValid) continue;
    let matchedCluster;
    for (const cluster of clusters) {
      if (cluster.dimensionId !== player.dimension.id) continue;
      if (distanceSquared(cluster.anchor, player.location) > maxJoinDistanceSquared) continue;
      matchedCluster = cluster;
      break;
    }
    if (!matchedCluster) {
      clusters.push({
        dimensionId: player.dimension.id,
        dimension: player.dimension,
        anchor: { ...player.location }
      });
    }
  }
  return clusters;
};
function runEntityEffects(idToTemplate2, fluidIDs2, players) {
  if (players.length === 0) return;
  const entitiesToProcess = /* @__PURE__ */ new Set();
  for (const cluster of buildEntityEffectClusters(players)) {
    const entities = cluster.dimension.getEntities({
      location: cluster.anchor,
      maxDistance: ENTITY_EFFECT_CLUSTER_FETCH_RADIUS,
      excludeFamilies: ["inanimate"]
    });
    for (const entity of entities) {
      if (entity.typeId === "minecraft:player") continue;
      entitiesToProcess.add(entity);
    }
  }
  for (const entity of entitiesToProcess) {
    try {
      const dimension = entity.dimension;
      const location = entity.location;
      const blockAt = dimension.getBlock(location);
      const blockTypeId = blockAt?.typeId;
      if (blockAt && blockTypeId && fluidIDs2.has(blockTypeId)) {
        const template = idToTemplate2.get(blockTypeId);
        if (template && template.onEntityTick) {
          template.onEntityTick(entity, blockAt);
        }
      }
    } catch (e) {
    }
  }
}

// src/main/bedrock/ts/utils/MotionEngine.ts
import { InputButton, ButtonState } from "@minecraft/server";
var DEG2RAD = Math.PI / 180;
var FLUID_GRAVITY = 0.02;
var SWIM_UP_FORCE = 0.04;
var DEADZONE = 3e-3;
var MAX_H_SPEED = 0.45;
var MAX_H_SPEED_SPRINT = 0.6;
var MAX_V_SPEED = 2;
var MotionEngine = class {
  /**
   * Java-parity fluid physics tick.
   *
   * @param player         Target player
   * @param drag           Per-tick XZ velocity multiplier — Java: 0.8 (water), 0.5 (lava)
   * @param acceleration   Per-tick input acceleration — Java: 0.02
   * @param gravityScale   Multiplier on FLUID_GRAVITY (0.02). 1.0 = vanilla water/lava
   * @param canSprint      Whether sprinting boosts drag (Java: true for water, false for lava)
   */
  static tickPlayer(player, drag = 0.8, acceleration = 0.02, gravityScale = 1, canSprint = true) {
    const p = player;
    if (player.isFlying || player.isGliding) {
      p._fluidVX = void 0;
      p._fluidVZ = void 0;
      p._fluidVY = void 0;
      p._lastSmoothImpX = void 0;
      p._lastSmoothImpZ = void 0;
      p._lastSmoothImpY = void 0;
      p._smoothDirX = void 0;
      p._smoothDirZ = void 0;
      p._walkExcessX = 0;
      p._walkExcessZ = 0;
      return;
    }
    if (p._fluidVX === void 0) {
      const v = player.getVelocity();
      p._fluidVX = v.x;
      p._fluidVZ = v.z;
      p._fluidVY = v.y;
    }
    let forward = 0;
    let right = 0;
    try {
      const mv = p.inputInfo?.getMovementVector();
      if (mv) {
        forward = mv.y;
        right = -mv.x;
      }
    } catch {
    }
    const yaw = player.getRotation().y * DEG2RAD;
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const rawWorldX = right * cosY - forward * sinY;
    const rawWorldZ = forward * cosY + right * sinY;
    const inputLen = Math.sqrt(rawWorldX * rawWorldX + rawWorldZ * rawWorldZ);
    const rawInputMag = Math.min(inputLen, 1);
    const rawNormX = inputLen > 1e-4 ? rawWorldX / inputLen : 0;
    const rawNormZ = inputLen > 1e-4 ? rawWorldZ / inputLen : 0;
    const DIR_LERP = 0.35;
    let normX, normZ, inputMag;
    if (rawInputMag > 0.01) {
      if (p._smoothDirX === void 0) {
        p._smoothDirX = rawNormX * rawInputMag;
        p._smoothDirZ = rawNormZ * rawInputMag;
      } else {
        p._smoothDirX += DIR_LERP * (rawNormX * rawInputMag - p._smoothDirX);
        p._smoothDirZ += DIR_LERP * (rawNormZ * rawInputMag - p._smoothDirZ);
      }
    } else {
      if (p._smoothDirX !== void 0) {
        p._smoothDirX *= 0.7;
        p._smoothDirZ *= 0.7;
        if (p._smoothDirX * p._smoothDirX + p._smoothDirZ * p._smoothDirZ < 1e-4) {
          p._smoothDirX = 0;
          p._smoothDirZ = 0;
        }
      } else {
        p._smoothDirX = 0;
        p._smoothDirZ = 0;
      }
    }
    const smoothLen = Math.sqrt((p._smoothDirX ?? 0) * (p._smoothDirX ?? 0) + (p._smoothDirZ ?? 0) * (p._smoothDirZ ?? 0));
    inputMag = Math.min(smoothLen, 1);
    normX = smoothLen > 1e-4 ? (p._smoothDirX ?? 0) / smoothLen : 0;
    normZ = smoothLen > 1e-4 ? (p._smoothDirZ ?? 0) / smoothLen : 0;
    let effectiveDrag = drag;
    if (canSprint && player.isSprinting && drag >= 0.7) {
      effectiveDrag = Math.min(drag + 0.1, 0.95);
    }
    let swimSpeed = acceleration;
    if (canSprint && player.isSprinting) swimSpeed *= 1.3;
    const speedAmp = (player.getEffect("speed")?.amplifier ?? -1) + 1;
    const slowAmp = (player.getEffect("slowness")?.amplifier ?? -1) + 1;
    swimSpeed *= Math.max(0.1, 1 + (speedAmp - slowAmp) * 0.2);
    let isJumping = false;
    try {
      const jumpState = p.inputInfo?.getButtonState(InputButton.Jump);
      isJumping = jumpState === ButtonState.Pressed;
    } catch {
    }
    if (!isJumping) {
      try {
        isJumping = player.isJumping;
      } catch {
      }
    }
    const onGround = player.isOnGround;
    p._fluidVX = (p._fluidVX ?? 0) + swimSpeed * normX * inputMag;
    p._fluidVZ = (p._fluidVZ ?? 0) + swimSpeed * normZ * inputMag;
    p._fluidVX *= effectiveDrag;
    p._fluidVZ *= effectiveDrag;
    const yDrag = drag >= 0.7 ? 0.8 : drag;
    if (onGround) {
      if ((p._fluidVY ?? 0) < 0) p._fluidVY = 0;
      if ((p._fluidVY ?? 0) > 0) p._fluidVY = (p._fluidVY ?? 0) * yDrag;
      if (isJumping) {
        const targetRise = SWIM_UP_FORCE + effectiveDrag * 0.1;
        p._fluidVY = (p._fluidVY ?? 0) + (targetRise - (p._fluidVY ?? 0)) * 0.4;
      } else if (!player.isSneaking && drag >= 0.7) {
        p._fluidVY = (p._fluidVY ?? 0) + SWIM_UP_FORCE * 0.6;
      }
    } else {
      p._fluidVY = (p._fluidVY ?? 0) * yDrag;
      p._fluidVY -= FLUID_GRAVITY * gravityScale;
      if (isJumping) {
        p._fluidVY += SWIM_UP_FORCE;
      }
      if (player.isSneaking) {
        p._fluidVY -= FLUID_GRAVITY * 0.8;
      }
      if (!isJumping && !player.isSneaking && (p._fluidVY ?? 0) < 0 && (p._fluidVY ?? 0) > -0.15) {
        const buoyancy = drag >= 0.7 ? 0.4 : 0.3;
        p._fluidVY *= buoyancy;
      }
    }
    if (Math.abs(p._fluidVX ?? 0) < DEADZONE && inputMag < 0.01) p._fluidVX = 0;
    if (Math.abs(p._fluidVZ ?? 0) < DEADZONE && inputMag < 0.01) p._fluidVZ = 0;
    if (Math.abs(p._fluidVY ?? 0) < 1e-3 && !isJumping && (onGround || !player.isSneaking)) p._fluidVY = 0;
    p._fluidVY = Math.max(-MAX_V_SPEED, Math.min(MAX_V_SPEED, p._fluidVY ?? 0));
    const maxH = canSprint && player.isSprinting ? MAX_H_SPEED_SPRINT : MAX_H_SPEED;
    const hSpeed = Math.sqrt((p._fluidVX ?? 0) * (p._fluidVX ?? 0) + (p._fluidVZ ?? 0) * (p._fluidVZ ?? 0));
    if (hSpeed > maxH) {
      const scale = maxH / hSpeed;
      p._fluidVX = (p._fluidVX ?? 0) * scale;
      p._fluidVZ = (p._fluidVZ ?? 0) * scale;
    }
    try {
      const headLoc = player.getHeadLocation();
      const hDir = Math.sqrt((p._fluidVX ?? 0) * (p._fluidVX ?? 0) + (p._fluidVZ ?? 0) * (p._fluidVZ ?? 0));
      if (hDir > 0.01) {
        const ray = player.dimension.getBlockFromRay(
          headLoc,
          { x: (p._fluidVX ?? 0) / hDir, y: 0, z: (p._fluidVZ ?? 0) / hDir },
          { maxDistance: 0.45 }
        );
        if (ray && !ray.block.isAir && !ray.block.isLiquid) {
          p._fluidVX = (p._fluidVX ?? 0) * 0.15;
          p._fluidVZ = (p._fluidVZ ?? 0) * 0.15;
          if ((p._fluidVY ?? 0) < 0.08) p._fluidVY = (p._fluidVY ?? 0) + 0.04;
        }
      }
    } catch {
    }
    const walkExX = p._walkExcessX ?? 0;
    const walkExZ = p._walkExcessZ ?? 0;
    let targetImpX = (p._fluidVX ?? 0) - walkExX;
    let targetImpZ = (p._fluidVZ ?? 0) - walkExZ;
    let targetImpY = p._fluidVY ?? 0;
    const IMPULSE_LERP = 0.6;
    if (p._lastSmoothImpX !== void 0) {
      targetImpX = p._lastSmoothImpX + IMPULSE_LERP * (targetImpX - p._lastSmoothImpX);
      targetImpZ = p._lastSmoothImpZ + IMPULSE_LERP * (targetImpZ - p._lastSmoothImpZ);
    }
    p._lastSmoothImpX = targetImpX;
    p._lastSmoothImpZ = targetImpZ;
    const Y_LERP = 0.5;
    if (p._lastSmoothImpY !== void 0) {
      targetImpY = p._lastSmoothImpY + Y_LERP * (targetImpY - p._lastSmoothImpY);
    }
    p._lastSmoothImpY = targetImpY;
    player.clearVelocity();
    player.applyImpulse({
      x: targetImpX,
      y: targetImpY,
      z: targetImpZ
    });
  }
};
var Geo = new class {
  distance(v1, v2) {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2 + (v1.z - v2.z) ** 2);
  }
  getDirection3D(v1, v2) {
    const d = this.distance(v1, v2) || 1;
    return { x: (v2.x - v1.x) / d, y: (v2.y - v1.y) / d, z: (v2.z - v1.z) / d };
  }
  rotate(offset, angle, axis = ["x", "z"]) {
    const [pa, sa] = axis;
    const flat = { [pa]: offset[pa] ?? 0, [sa]: offset[sa] ?? 0 };
    const zero = { x: 0, y: 0, z: 0 };
    const flatVec = sumObjects(zero, flat);
    const dir = this.getDirection3D(zero, flatVec);
    const dist = this.distance(zero, flatVec);
    const paVal = dir[pa] ?? 0;
    const saVal = dir[sa] ?? 0;
    angle += Math.acos(paVal) * 57.2958 * (saVal < 0 ? -1 : 1);
    const d = { [pa]: Math.cos(angle / 57.2958), [sa]: Math.sin(angle / 57.2958) };
    return sumObjects(zero, d, dist);
  }
}();
function sumObjects(v1, v2, multi = 1) {
  return {
    x: (v1.x || 0) + (v2.x || 0) * multi,
    y: (v1.y || 0) + (v2.y || 0) * multi,
    z: (v1.z || 0) + (v2.z || 0) * multi
  };
}

// src/main/bedrock/ts/fluids/fluids.ts
var blockCache = /* @__PURE__ */ new Map();
var playersInFluids = /* @__PURE__ */ new Set();
var typeInfoCache = /* @__PURE__ */ new Map();
var REPLACABLE_IDS = /* @__PURE__ */ new Set([
  "minecraft:snow_layer",
  "minecraft:fire",
  "minecraft:soul_fire",
  "minecraft:double_plant",
  "minecraft:tallgrass",
  "minecraft:short_grass",
  "minecraft:deadbush",
  "minecraft:web",
  "minecraft:dandelion",
  "minecraft:oxeye_daisy",
  "minecraft:poppy",
  "minecraft:azure_bluet",
  "minecraft:cornflower"
]);
function getCachedBlock(dimension, x, y, z) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  if (fy < dimension.heightRange.min || fy > dimension.heightRange.max) return void 0;
  const key = `${dimension.id}:${fx},${fy},${fz}`;
  let blk = blockCache.get(key);
  if (blk !== void 0) return blk;
  blk = dimension.getBlock({ x: fx, y: fy, z: fz });
  blockCache.set(key, blk);
  return blk;
}
function getTypeInfo(typeId) {
  let info = typeInfoCache.get(typeId);
  if (info) return info;
  let currentStage = 0;
  let baseId = typeId;
  if (typeId.endsWith("_down")) {
    currentStage = -1;
    baseId = typeId.replace("_down", "");
  } else {
    const match = typeId.match(/(\d+)$/);
    if (match) {
      currentStage = parseInt(match[1]);
      baseId = typeId.slice(0, -match[1].length);
    } else {
      for (const template of templates) {
        if (typeId === template.baseName) {
          currentStage = 0;
          baseId = typeId;
          break;
        }
      }
    }
  }
  info = { stage: currentStage, baseId };
  typeInfoCache.set(typeId, info);
  return info;
}
var templates = [
  new LavaTemplate("gaiadimension:superhot_magma"),
  new LavaTemplate("gaiadimension:liquid_bismuth"),
  new WaterTemplate({
    baseName: "gaiadimension:liquid_aura",
    fogId: "gaiadimension:liquid_aura_fog",
    interactions: [
      {
        targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
        action: "transformTarget",
        resultBlock: "gaiadimension:aura_crystal_block",
        directions: "adjacent"
      }
    ]
  }),
  new WaterTemplate({
    baseName: "gaiadimension:mineral_water",
    fogId: "gaiadimension:mineral_water_fog",
    hasBoatPhysics: true,
    interactions: [
      {
        targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
        action: "transformTarget",
        resultBlock: "gaiadimension:primal_mass",
        directions: "adjacent"
      }
    ]
  }),
  new WaterTemplate({
    baseName: "gaiadimension:sweet_muck",
    viscosity: 5,
    spreadDelay: 10,
    fogId: "gaiadimension:sweet_muck_fog",
    interactions: [
      {
        targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
        action: "transformTarget",
        resultBlock: "gaiadimension:primal_mass",
        directions: "adjacent"
      }
    ]
  })
];
var fluidIDs = /* @__PURE__ */ new Set();
var idToTemplate = /* @__PURE__ */ new Map();
for (const template of templates) {
  for (const id of template.fluidIDs) {
    fluidIDs.add(id);
    idToTemplate.set(id, template);
  }
}
var BUDGET = 4;
var MAX_QUEUE_SIZE = 1e3;
var playerInteractionDummies = /* @__PURE__ */ new Map();
var PENDING_BLOCKS = /* @__PURE__ */ new Map();
var STABLE_BLOCKS = /* @__PURE__ */ new Set();
var taskIndex = 0;
var DIRECTIONS = [
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 }
];
system24.runInterval(() => {
  blockCache.clear();
  const start = Date.now();
  const players = world19.getAllPlayers();
  const tasks = [
    () => runPlayerEffects(players),
    () => runEntityEffects(idToTemplate, fluidIDs, players),
    () => runBoatLogic(players),
    () => runFluidFlowLogic(start),
    () => runFluidInteractionDummies(players)
  ];
  const priorityTask = taskIndex % tasks.length;
  tasks[priorityTask]();
  for (let i = 0; i < tasks.length; i++) {
    if (i === priorityTask) continue;
    if (Date.now() - start > BUDGET) break;
    tasks[i]();
  }
  taskIndex++;
}, 1);
var _fluidPosTrack = /* @__PURE__ */ new Map();
system24.runInterval(() => {
  for (const state of FluidTemplate.physicsStates.values()) {
    try {
      if (!state.player.isValid) {
        FluidTemplate.physicsStates.delete(state.player.id);
        _fluidPosTrack.delete(state.player.id);
        continue;
      }
      const player = state.player;
      const pos = player.location;
      const pid = player.id;
      const p = player;
      const track = _fluidPosTrack.get(pid);
      if (track) {
        const rawExX = pos.x - track.lx - track.vx;
        const rawExZ = pos.z - track.lz - track.vz;
        const prevExX = p._walkExcessX ?? 0;
        const prevExZ = p._walkExcessZ ?? 0;
        const clampedExX = Math.max(-0.15, Math.min(0.15, rawExX));
        const clampedExZ = Math.max(-0.15, Math.min(0.15, rawExZ));
        p._walkExcessX = prevExX + 0.2 * (clampedExX - prevExX);
        p._walkExcessZ = prevExZ + 0.2 * (clampedExZ - prevExZ);
      } else {
        p._walkExcessX = 0;
        p._walkExcessZ = 0;
      }
      MotionEngine.tickPlayer(
        player,
        state.drag,
        state.acceleration,
        state.gravityScale,
        state.canSprint
      );
      _fluidPosTrack.set(pid, {
        lx: pos.x,
        lz: pos.z,
        vx: p._fluidVX ?? 0,
        vz: p._fluidVZ ?? 0
      });
    } catch {
    }
  }
  for (const pid of _fluidPosTrack.keys()) {
    if (!FluidTemplate.physicsStates.has(pid)) {
      _fluidPosTrack.delete(pid);
    }
  }
});
function runFluidInteractionDummies(players) {
  for (const player of players) {
    const inventory = player.getComponent("inventory")?.container;
    if (!inventory) continue;
    const heldItem = inventory.getItem(player.selectedSlotIndex);
    const isHoldingBucket = heldItem?.typeId === "minecraft:bucket" || heldItem?.typeId.startsWith("gaiadimension:") && heldItem?.typeId.endsWith("_bucket");
    const isHoldingBlock = heldItem && (heldItem.typeId.includes("planks") || heldItem.typeId.includes("log") || heldItem.typeId.includes("stairs") || heldItem.typeId.includes("slab") || heldItem.typeId.includes("fence") || heldItem.typeId.includes("stone") || heldItem.typeId.includes("dirt") || heldItem.typeId.includes("sand") || heldItem.typeId.includes("glass") || heldItem.typeId.includes("cobblestone"));
    if (!isHoldingBucket && !isHoldingBlock) {
      const existing = playerInteractionDummies.get(player.id);
      if (existing) {
        if (existing.isValid) existing.remove();
        playerInteractionDummies.delete(player.id);
      }
      continue;
    }
    const viewVec = player.getViewDirection();
    const headLoc = player.getHeadLocation();
    let targetFluid;
    for (let d = 0.5; d <= 5; d += 0.5) {
      const checkPos = { x: headLoc.x + viewVec.x * d, y: headLoc.y + viewVec.y * d, z: headLoc.z + viewVec.z * d };
      const block = getCachedBlock(player.dimension, checkPos.x, checkPos.y, checkPos.z);
      if (block) {
        if (fluidIDs.has(block.typeId)) {
          targetFluid = block;
          break;
        }
        if (!block.isAir && !isReplaceable(block)) break;
      }
    }
    if (targetFluid) {
      let dummy = playerInteractionDummies.get(player.id);
      const center = targetFluid.center();
      const targetPos = { x: center.x, y: center.y - 0.5, z: center.z };
      if (!dummy || !dummy.isValid) {
        dummy = player.dimension.spawnEntity("gaiadimension:fluid_interaction_dummy", targetPos);
        playerInteractionDummies.set(player.id, dummy);
      } else {
        const distSq2 = Math.pow(dummy.location.x - targetPos.x, 2) + Math.pow(dummy.location.y - targetPos.y, 2) + Math.pow(dummy.location.z - targetPos.z, 2);
        if (distSq2 > 0.01) dummy.teleport(targetPos);
      }
    } else {
      const existing = playerInteractionDummies.get(player.id);
      if (existing) {
        if (existing.isValid) existing.remove();
        playerInteractionDummies.delete(player.id);
      }
    }
  }
}
function runFluidFlowLogic(startTime) {
  if (PENDING_BLOCKS.size === 0) return;
  const currentTick = system24.currentTick;
  const iterator = PENDING_BLOCKS.entries();
  let processedCount = 0;
  const MAX_PER_TICK = 50;
  for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
    const timeSpent = Date.now() - startTime;
    if (timeSpent > BUDGET && processedCount > 0) break;
    if (processedCount >= MAX_PER_TICK) break;
    const [key, data] = entry.value;
    if (currentTick < data.scheduledTick) continue;
    PENDING_BLOCKS.delete(key);
    try {
      const { block, dimension } = data;
      if (block.isValid) {
        const changed = processFluidBlock(block, dimension);
        if (changed) {
          wakeNeighbors(block.location, dimension);
        } else {
          STABLE_BLOCKS.add(key);
        }
        processedCount++;
      }
    } catch (e) {
    }
  }
}
function runPlayerEffects(players) {
  for (const player of players) {
    try {
      const dim = player.dimension;
      const loc = player.location;
      const blockAt = getCachedBlock(dim, loc.x, loc.y, loc.z);
      const blockHead = getCachedBlock(dim, loc.x, loc.y + 1.63, loc.z);
      let template;
      let isHead = false;
      let isFeet = false;
      if (blockHead && fluidIDs.has(blockHead.typeId)) {
        template = idToTemplate.get(blockHead.typeId);
        isHead = true;
      }
      if (blockAt && fluidIDs.has(blockAt.typeId)) {
        const t = idToTemplate.get(blockAt.typeId);
        if (!template) template = t;
        isFeet = true;
      }
      if (template) {
        playersInFluids.add(player.id);
        template.onPlayerTick(player, blockAt || blockHead, isHead, isFeet);
      } else if (playersInFluids.has(player.id)) {
        player.runCommand("fog @s remove fluid_fog");
        playersInFluids.delete(player.id);
        FluidTemplate.physicsStates.delete(player.id);
        _fluidPosTrack.delete(player.id);
        const p = player;
        p._fluidVX = void 0;
        p._fluidVZ = void 0;
        p._fluidVY = void 0;
        p._lastSmoothImpX = void 0;
        p._lastSmoothImpZ = void 0;
        p._lastSmoothImpY = void 0;
        p._smoothDirX = void 0;
        p._smoothDirZ = void 0;
        p._walkExcessX = 0;
        p._walkExcessZ = 0;
      }
    } catch {
    }
  }
}
function runBoatLogic(players) {
  if (players.length === 0) return;
  const activeDimensions = new Set(players.map((p) => p.dimension));
  for (const dimension of activeDimensions) {
    const boats = dimension.getEntities({ families: ["boat"] });
    for (const boat of boats) {
      if (!boat.isValid) continue;
      const loc = boat.location;
      const blockAt = getCachedBlock(dimension, loc.x, loc.y, loc.z);
      const blockBelow = getCachedBlock(dimension, loc.x, loc.y - 0.1, loc.z);
      let template;
      let isDeep = false;
      if (blockAt && fluidIDs.has(blockAt.typeId)) {
        template = idToTemplate.get(blockAt.typeId);
        isDeep = true;
      } else if (blockBelow && fluidIDs.has(blockBelow.typeId)) {
        template = idToTemplate.get(blockBelow.typeId);
      }
      if (template) template.processBoat(boat, dimension, isDeep);
      else {
        const holders = dimension.getEntities({ type: "gaiadimension:boat_holder", location: loc, maxDistance: 2 });
        for (const h of holders) if (h.isValid) h.remove();
      }
    }
  }
}
function isReplaceable(blk) {
  if (!blk || !blk.isValid) return false;
  if (blk.isAir) return true;
  const id = blk.typeId;
  if (blk.isLiquid || fluidIDs.has(id)) return false;
  if (REPLACABLE_IDS.has(id)) return true;
  if (id.includes("flower") || id.includes("sapling") || id.includes("bush") || id.includes("plant") || id.includes("leaf_litter")) return true;
  const vegetationTags = ["minecraft:is_plant", "flower", "plant", "double_plant", "minecraft:crop"];
  for (const tag2 of vegetationTags) {
    if (blk.hasTag(tag2)) return true;
  }
  return false;
}
function getSlopeDistance(dimension, x, y, z, maxDistance, baseId) {
  const visited = /* @__PURE__ */ new Set();
  const qX = [x], qZ = [z], qD = [0];
  let head = 0, tail = 1;
  const KEY_MUL = 200003;
  visited.add(x * KEY_MUL + z);
  while (head < tail) {
    const cx = qX[head], cz = qZ[head], d = qD[head++];
    if (d >= maxDistance) continue;
    for (const dir of DIRECTIONS) {
      const nx = cx + dir.x, nz = cz + dir.z;
      const key = nx * KEY_MUL + nz;
      if (visited.has(key)) continue;
      visited.add(key);
      const neighbor = getCachedBlock(dimension, nx, y, nz);
      if (!neighbor) continue;
      const isSameFluid = neighbor.typeId.startsWith(baseId);
      if (!isSameFluid && !isReplaceable(neighbor)) continue;
      const below = getCachedBlock(dimension, nx, y - 1, nz);
      if (below && isReplaceable(below)) return d;
      qX[tail] = nx;
      qZ[tail] = nz;
      qD[tail++] = d + 1;
    }
  }
  return 999;
}
function processFluidBlock(block, dimension) {
  const typeId = block.typeId;
  let changesHappened = false;
  const { stage: currentStage, baseId } = getTypeInfo(typeId);
  if (!fluidIDs.has(baseId)) return false;
  const template = idToTemplate.get(baseId);
  if (template) {
    const interactions = template.getInteractions();
    if (interactions.length > 0) {
      const neighbors = [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }];
      for (const rule of interactions) {
        const checkIndices = rule.directions === "below" ? [5] : rule.directions === "all" ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4];
        let triggered = false;
        for (const idx of checkIndices) {
          const off = neighbors[idx];
          const nb = getCachedBlock(dimension, block.x + off.x, block.y + off.y, block.z + off.z);
          if (nb && (Array.isArray(rule.targetBlock) ? rule.targetBlock.includes(nb.typeId) : nb.typeId === rule.targetBlock)) {
            if (rule.action === "transformTarget") {
              dimension.fillBlocks(new BlockVolume3(nb.location, nb.location), rule.resultBlock);
              triggered = true;
            } else if (rule.action === "transformSelf") {
              triggered = true;
              break;
            }
          }
        }
        if (triggered) {
          changesHappened = true;
          if (rule.sound) dimension.playSound(rule.sound, block.location, { volume: 0.5, pitch: 1 });
          if (rule.action === "transformSelf") {
            dimension.fillBlocks(new BlockVolume3(block.location, block.location), rule.resultBlock);
            return true;
          }
        }
      }
    }
  }
  let requiredParentTag = "";
  if (currentStage === 1) requiredParentTag = "template_full";
  else if (currentStage === 2) requiredParentTag = "template1";
  else if (currentStage === 3) requiredParentTag = "template2";
  if (currentStage > 0) {
    const above = getCachedBlock(dimension, block.location.x, block.location.y + 1, block.location.z);
    if (above) {
      const aboveId = above.typeId;
      const isAboveDown = aboveId === baseId + "_down";
      const isAboveHalf = aboveId === baseId + "1" || aboveId === baseId + "2" || aboveId === baseId + "3";
      if (isAboveDown || isAboveHalf) {
        if (block.isValid) {
          dimension.fillBlocks(new BlockVolume3(block.location, block.location), BlockPermutation10.resolve(baseId + "_down"));
          changesHappened = true;
        }
        return changesHappened;
      }
    }
  }
  if (currentStage > 0) {
    let hasParent = false;
    for (const dir of DIRECTIONS) {
      const neighbor = getCachedBlock(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z);
      if (neighbor && neighbor.hasTag(requiredParentTag)) {
        hasParent = true;
        break;
      }
    }
    if (!hasParent) {
      if (block.isValid) {
        dimension.fillBlocks(new BlockVolume3(block.location, block.location), "minecraft:air");
        changesHappened = true;
      }
      return changesHappened;
    }
  } else if (currentStage === -1) {
    const above = getCachedBlock(dimension, block.location.x, block.location.y + 1, block.location.z);
    if (!above) {
      if (block.isValid) {
        dimension.fillBlocks(new BlockVolume3(block.location, block.location), "minecraft:air");
        changesHappened = true;
      }
      return changesHappened;
    }
    const aboveId = above.typeId;
    const validAbove = [baseId, baseId + "_down", baseId + "1", baseId + "2", baseId + "3"];
    if (!validAbove.includes(aboveId)) {
      if (block.isValid) {
        dimension.fillBlocks(new BlockVolume3(block.location, block.location), "minecraft:air");
        changesHappened = true;
      }
      return changesHappened;
    }
  }
  if (currentStage <= 0) {
    const states = block.permutation.getAllStates();
    let changedStates = false;
    const neighbors = [
      { x: 1, y: 0, z: 0, state: "gaiadimension:x" },
      { x: -1, y: 0, z: 0, state: "gaiadimension:nx" },
      { x: 0, y: 0, z: 1, state: "gaiadimension:z" },
      { x: 0, y: 0, z: -1, state: "gaiadimension:nz" },
      { x: 0, y: 1, z: 0, state: "gaiadimension:top" },
      { x: 0, y: -1, z: 0, state: "gaiadimension:bottom" }
    ];
    for (const nbDef of neighbors) {
      const nb = getCachedBlock(dimension, block.x + nbDef.x, block.y + nbDef.y, block.z + nbDef.z);
      const isFluid = nb && (nb.typeId.startsWith(baseId) || nb.isLiquid);
      const newState = isFluid ? 1 : 0;
      if (states[nbDef.state] !== newState) {
        states[nbDef.state] = newState;
        changedStates = true;
      }
    }
    if (changedStates) {
      dimension.fillBlocks(new BlockVolume3(block.location, block.location), BlockPermutation10.resolve(block.typeId, states));
    }
  }
  const below = getCachedBlock(dimension, block.location.x, block.location.y - 1, block.location.z);
  let flowedDown = false;
  if (below && isReplaceable(below)) {
    dimension.fillBlocks(new BlockVolume3(below.location, below.location), baseId + "_down");
    flowedDown = true;
    changesHappened = true;
  } else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) flowedDown = true;
  const maxStages = 3;
  const canSpread = currentStage === 0 || currentStage === -1 && !flowedDown || currentStage > 0 && !flowedDown && currentStage < maxStages;
  if (canSpread) {
    if (!template) return changesHappened;
    const nextStageNum = currentStage <= 0 ? 1 : currentStage + 1;
    const nextStageId = currentStage === 0 || currentStage === -1 ? baseId + "1" : baseId + (currentStage + 1).toString();
    let anyOverwritable = false;
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const dir = DIRECTIONS[i];
      const neighbor = getCachedBlock(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z);
      if (neighbor) {
        if (isReplaceable(neighbor)) {
          anyOverwritable = true;
          break;
        }
        if (neighbor.typeId.startsWith(baseId)) {
          const nInfo = getTypeInfo(neighbor.typeId);
          if (nInfo.stage > 0 && nextStageNum < nInfo.stage) {
            anyOverwritable = true;
            break;
          }
        }
      }
    }
    if (anyOverwritable) {
      const maxSearch = template.slopeFindDistance;
      let minDistance = 999;
      const distances = [];
      for (let i = 0; i < DIRECTIONS.length; i++) {
        const dir = DIRECTIONS[i];
        const dist = getSlopeDistance(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z, maxSearch, baseId);
        distances[i] = dist;
        if (dist < minDistance) minDistance = dist;
      }
      for (let i = 0; i < DIRECTIONS.length; i++) {
        const dir = DIRECTIONS[i];
        if (minDistance < 999 && distances[i] > minDistance) continue;
        const nx = block.location.x + dir.x, ny = block.location.y, nz = block.location.z + dir.z;
        const neighbor = getCachedBlock(dimension, nx, ny, nz);
        if (neighbor) {
          let canOverwrite = false;
          if (isReplaceable(neighbor)) {
            canOverwrite = true;
          } else if (neighbor.typeId.startsWith(baseId)) {
            const nInfo = getTypeInfo(neighbor.typeId);
            const neighborStage = nInfo.stage;
            if (neighborStage > 0 && nextStageNum < neighborStage) {
              canOverwrite = true;
            }
          }
          if (canOverwrite) {
            if (neighbor.isValid) {
              let dirState = 0;
              if (dir.z === -1) dirState = 1;
              else if (dir.x === 1) dirState = 7;
              else if (dir.z === 1) dirState = 5;
              else if (dir.x === -1) dirState = 3;
              const perm = BlockPermutation10.resolve(nextStageId, { "gaiadimension:flow_dir": dirState });
              dimension.fillBlocks(new BlockVolume3(neighbor.location, neighbor.location), perm);
              PENDING_BLOCKS.set(`${neighbor.location.x},${neighbor.location.y},${neighbor.location.z},${dimension.id}`, { block: neighbor, dimension, scheduledTick: system24.currentTick + (template?.spreadDelay ?? 5) });
              changesHappened = true;
            }
          }
        }
      }
    }
  }
  if (currentStage > 0) {
    let flowX = 0;
    let flowZ = 0;
    for (const dir of DIRECTIONS) {
      const neighbor = getCachedBlock(dimension, block.x + dir.x, block.y, block.z + dir.z);
      if (!neighbor) continue;
      let nLevel = -999;
      if (neighbor.typeId.startsWith(baseId)) {
        const nInfo = getTypeInfo(neighbor.typeId);
        nLevel = nInfo.stage === -1 ? 0 : nInfo.stage;
      } else {
        const below2 = getCachedBlock(dimension, neighbor.x, neighbor.y - 1, neighbor.z);
        if (isReplaceable(neighbor) && below2 && isReplaceable(below2)) {
          nLevel = 99;
        } else {
          continue;
        }
      }
      if (nLevel < currentStage) {
        flowX -= dir.x;
        flowZ -= dir.z;
      } else if (nLevel > currentStage) {
        flowX += dir.x;
        flowZ += dir.z;
      }
    }
    flowX = flowX > 0 ? 1 : flowX < 0 ? -1 : 0;
    flowZ = flowZ > 0 ? 1 : flowZ < 0 ? -1 : 0;
    let dirState;
    if (flowX === 0 && flowZ === 0) {
      dirState = block.permutation.getAllStates()["gaiadimension:flow_dir"] ?? 0;
    } else if (flowX === 0 && flowZ === -1) dirState = 1;
    else if (flowX === -1 && flowZ === -1) dirState = 2;
    else if (flowX === -1 && flowZ === 0) dirState = 3;
    else if (flowX === -1 && flowZ === 1) dirState = 4;
    else if (flowX === 0 && flowZ === 1) dirState = 5;
    else if (flowX === 1 && flowZ === 1) dirState = 6;
    else if (flowX === 1 && flowZ === 0) dirState = 7;
    else if (flowX === 1 && flowZ === -1) dirState = 8;
    else dirState = 0;
    const perms = block.permutation.getAllStates();
    if (perms["gaiadimension:flow_dir"] !== dirState) {
      perms["gaiadimension:flow_dir"] = dirState;
      dimension.fillBlocks(new BlockVolume3(block.location, block.location), BlockPermutation10.resolve(typeId, perms));
      changesHappened = true;
    }
  }
  return changesHappened;
}
var FluidFlowComponent = class {
  constructor() {
    this.onTick = this.onTick.bind(this);
    this.onPlayerDestroy = this.onPlayerDestroy.bind(this);
  }
  onPlayerDestroy(event) {
    wakeNeighbors(event.block.location, event.dimension);
  }
  onTick(event) {
    if (PENDING_BLOCKS.size >= MAX_QUEUE_SIZE) return;
    const { block } = event;
    const key = `${block.x},${block.y},${block.z},${block.dimension.id}`;
    if (STABLE_BLOCKS.has(key)) return;
    if (!PENDING_BLOCKS.has(key)) {
      let delay2 = 5;
      const info = getTypeInfo(block.typeId);
      const template = idToTemplate.get(info.baseId);
      if (template) delay2 = template.spreadDelay;
      PENDING_BLOCKS.set(key, { block, dimension: block.dimension, scheduledTick: system24.currentTick + delay2 });
    }
  }
};
function wakeNeighbors(location, dimension) {
  const { x, y, z } = location;
  const centerBlock = getCachedBlock(dimension, x, y, z);
  if (!centerBlock) return;
  let delay2 = 5;
  const info = getTypeInfo(centerBlock.typeId);
  const template = idToTemplate.get(info.baseId);
  if (template) delay2 = template.spreadDelay;
  const locations = [{ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }];
  const scheduledTick = system24.currentTick + delay2;
  for (const offset of locations) {
    const nx = x + offset.x, ny = y + offset.y, nz = z + offset.z;
    const key = `${nx},${ny},${nz},${dimension.id}`;
    STABLE_BLOCKS.delete(key);
    if (!PENDING_BLOCKS.has(key)) {
      const neighbor = getCachedBlock(dimension, nx, ny, nz);
      if (neighbor && neighbor.isValid && fluidIDs.has(neighbor.typeId)) PENDING_BLOCKS.set(key, { block: neighbor, dimension, scheduledTick });
    }
  }
}
world19.afterEvents.playerPlaceBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));
world19.afterEvents.playerBreakBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));
world19.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block, itemStack } = event;
  if (!itemStack || !itemStack.typeId.startsWith("gaiadimension:") || !itemStack.typeId.endsWith("_bucket")) return;
  const fluidId = itemStack.typeId.replace("_bucket", "");
  const isFlowingVariant = (blk) => blk.typeId.startsWith(fluidId) && (blk.typeId.endsWith("_down") || /\d+$/.test(blk.typeId));
  if (isFlowingVariant(block)) {
    event.cancel = true;
    system24.run(() => {
      if (block.isValid) {
        block.setPermutation(BlockPermutation10.resolve(fluidId));
        wakeNeighbors(block.location, block.dimension);
        const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
        player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water", { pitch: 1, volume: 1 });
        if (player.getGameMode() !== GameMode4.Creative) {
          const container = player.getComponent("inventory")?.container;
          if (container) {
            const slot = player.selectedSlotIndex;
            const currentItem = container.getItem(slot);
            if (currentItem && currentItem.typeId === itemStack.typeId) {
              if (currentItem.amount > 1) {
                currentItem.amount--;
                container.setItem(slot, currentItem);
                const emptyBucket = new ItemStack10("minecraft:bucket", 1);
                const remainder = container.addItem(emptyBucket);
                if (remainder) player.dimension.spawnItem(remainder, player.location);
              } else container.setItem(slot, new ItemStack10("minecraft:bucket", 1));
            }
          }
        }
      }
    });
    return;
  }
});
world19.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target, itemStack } = event;
  if (target.typeId !== "gaiadimension:fluid_interaction_dummy" || !(player instanceof Player17)) return;
  const dimension = player.dimension;
  const location = { x: Math.floor(target.location.x), y: Math.floor(target.location.y), z: Math.floor(target.location.z) };
  const fluidBlock = getCachedBlock(dimension, location.x, location.y, location.z);
  if (!fluidBlock || !fluidIDs.has(fluidBlock.typeId)) return;
  if (itemStack?.typeId === "minecraft:bucket") {
    const info = getTypeInfo(fluidBlock.typeId);
    if (info.stage === 0) {
      const bucketId = info.baseId + "_bucket", filledBucket = new ItemStack10(bucketId, 1);
      const inventory = player.getComponent("inventory")?.container;
      if (inventory) {
        const slot = player.selectedSlotIndex;
        if (itemStack.amount > 1) {
          itemStack.amount--;
          inventory.setItem(slot, itemStack);
          const remainder = inventory.addItem(filledBucket);
          if (remainder) dimension.spawnItem(remainder, player.location);
        } else inventory.setItem(slot, filledBucket);
      }
      const isHot = fluidBlock.typeId.includes("magma") || fluidBlock.typeId.includes("bismuth");
      dimension.playSound(isHot ? "bucket.fill_lava" : "bucket.fill_water", location);
      dimension.fillBlocks(new BlockVolume3(location, location), "minecraft:air");
      wakeNeighbors(location, dimension);
    }
    return;
  }
  if (itemStack) {
    const fluidId = itemStack.typeId.replace("_bucket", "");
    if (fluidIDs.has(fluidId)) {
      const viewVec = player.getViewDirection();
      const absX = Math.abs(viewVec.x), absY = Math.abs(viewVec.y), absZ = Math.abs(viewVec.z);
      let offset = { x: 0, y: 0, z: 0 };
      if (absY > absX && absY > absZ) offset.y = viewVec.y > 0 ? 1 : -1;
      else if (absX > absZ) offset.x = viewVec.x > 0 ? 1 : -1;
      else offset.z = viewVec.z > 0 ? 1 : -1;
      const placeLoc = { x: location.x + offset.x, y: location.y + offset.y, z: location.z + offset.z };
      const targetBlock = dimension.getBlock(placeLoc);
      if (targetBlock && (targetBlock.isAir || isReplaceable(targetBlock))) {
        dimension.fillBlocks(new BlockVolume3(placeLoc, placeLoc), fluidId);
        wakeNeighbors(placeLoc, dimension);
        const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
        player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water");
        if (player.getGameMode() !== GameMode4.Creative) {
          const inventory = player.getComponent("inventory")?.container;
          if (inventory) {
            const slot = player.selectedSlotIndex;
            if (itemStack.amount > 1) {
              itemStack.amount--;
              inventory.setItem(slot, itemStack);
              const emptyBucket = new ItemStack10("minecraft:bucket", 1);
              const remainder = inventory.addItem(emptyBucket);
              if (remainder) dimension.spawnItem(remainder, player.location);
            } else inventory.setItem(slot, new ItemStack10("minecraft:bucket", 1));
          }
        }
      }
    } else {
      try {
        const perm = BlockPermutation10.resolve(itemStack.typeId);
        if (perm) {
          dimension.fillBlocks(new BlockVolume3(location, location), perm);
          player.playSound("stone.dig", { location });
          if (player.getGameMode() !== GameMode4.Creative) {
            const inventory = player.getComponent("inventory")?.container;
            if (inventory) {
              const slot = player.selectedSlotIndex;
              if (itemStack.amount > 1) {
                itemStack.amount--;
                inventory.setItem(slot, itemStack);
              } else inventory.setItem(slot, void 0);
            }
          }
          wakeNeighbors(location, dimension);
        }
      } catch {
      }
    }
  }
});
system24.runInterval(() => {
  for (const player of world19.getAllPlayers()) {
    const container = player.getComponent("inventory")?.container;
    if (!container) continue;
    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (!item) continue;
      if (item.typeId === "gaiadimension:tar_cauldron") {
        try {
          container.setItem(i, new ItemStack10("minecraft:cauldron", item.amount));
        } catch (e) {
        }
        continue;
      }
      if (fluidIDs.has(item.typeId)) {
        let baseId = item.typeId;
        if (baseId.endsWith("_down")) baseId = baseId.slice(0, -5);
        else {
          const m = baseId.match(/(\d+)$/);
          if (m) baseId = baseId.slice(0, -m[1].length);
        }
        try {
          container.setItem(i, new ItemStack10(baseId + "_bucket", item.amount));
        } catch (e) {
        }
      }
    }
  }
}, 80);
function registerFluidComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:fluid_flow", new FluidFlowComponent());
}

// src/main/bedrock/ts/durability.ts
import {
  system as system25,
  EquipmentSlot as EquipmentSlot4
} from "@minecraft/server";
function registerCustomTool() {
  system25.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("luminiae:durability", {
      onUseOn(e, params) {
        const { source, itemStack, block } = e;
        if (!source || !itemStack || !block) return;
        if (!itemStack.hasTag("minecraft:is_axe")) return;
        const typeId = block.typeId;
        const isWood = typeId.includes("wood") || typeId.includes("log") || typeId.includes("hyphae") || typeId.includes("minecraft:");
        if (!isWood) return;
        source.playSound("use.wood", { location: block.location });
        if (source.getGameMode() === "creative") return;
        const stripDamage = params.stripDamage !== void 0 ? params.stripDamage : 1;
        applyCustomDamage(source, itemStack, stripDamage);
      },
      onMineBlock(e, params) {
        const { source, itemStack } = e;
        if (!source || !itemStack) return;
        if (source.getGameMode() === "creative") return;
        const mineDamage = params.mineDamage !== void 0 ? params.mineDamage : 1;
        applyCustomDamage(source, itemStack, mineDamage);
      }
    });
  });
}
function applyCustomDamage(player, itemStack, damageAmount) {
  const durability = itemStack.getComponent("minecraft:durability");
  if (!durability) return;
  const enchantable = itemStack.getComponent("minecraft:enchantable");
  const unbreakingLevel = enchantable ? enchantable.getEnchantment("unbreaking")?.level ?? 0 : 0;
  const chance = 1 / (unbreakingLevel + 1);
  if (Math.random() > chance) return;
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  const newDamage = durability.damage + damageAmount;
  if (newDamage >= durability.maxDurability) {
    equippable.setEquipment(EquipmentSlot4.Mainhand, void 0);
    player.playSound("random.break", { location: player.location });
  } else {
    durability.damage = newDamage;
    equippable.setEquipment(EquipmentSlot4.Mainhand, itemStack);
  }
}

// src/main/bedrock/ts/systems/Commands.ts
import {
  Player as Player19,
  system as system26,
  CommandPermissionLevel,
  CustomCommandParamType
} from "@minecraft/server";
import { ModalFormData as ModalFormData2 } from "@minecraft/server-ui";

// src/main/bedrock/ts/Vec3.ts
var Vec3 = class {
  /**
   * Returns a zero vector (0, 0, 0).
   */
  static get zero() {
    return { x: 0, y: 0, z: 0 };
  }
  /**
   * Adds two vectors together.
   * @param v1 The first vector.
   * @param v2 The second vector.
   * @returns A new vector that is the sum of v1 and v2.
   */
  static add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
  }
  /**
   * Subtracts the second vector from the first.
   * @param v1 The first vector.
   * @param v2 The second vector.
   * @returns A new vector that is the difference of v1 and v2.
   */
  static subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
  }
  /**
   * Multiplies a vector by a scalar.
   * @param v The vector to multiply.
   * @param scale The scalar to multiply by.
   * @returns A new scaled vector.
   */
  static multiply(v, scale) {
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
  }
  /**
   * Divides a vector by a scalar. Returns zero vector if scale is 0.
   * @param v The vector to divide.
   * @param scale The scalar to divide by.
   * @returns A new divided vector.
   */
  static divide(v, scale) {
    if (scale === 0) return this.zero;
    return { x: v.x / scale, y: v.y / scale, z: v.z / scale };
  }
  /**
   * Calculates the dot product of two vectors.
   */
  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }
  /**
   * Calculates the cross product of two vectors.
   */
  static cross(v1, v2) {
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
  }
  /**
   * Calculates the magnitude (length) of a vector.
   */
  static magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
  /**
   * Returns a normalized version of the vector (magnitude of 1).
   * Returns zero vector if original magnitude is 0.
   */
  static normalize(v) {
    const mag = this.magnitude(v);
    if (mag === 0) return this.zero;
    return this.divide(v, mag);
  }
  /**
   * Calculates the distance between two vectors.
   */
  static distance(v1, v2) {
    return this.magnitude(this.subtract(v1, v2));
  }
  /**
   * Linearly interpolates between two vectors.
   * @param v1 Start vector.
   * @param v2 End vector.
   * @param t Interpolation factor (0.0 to 1.0).
   */
  static lerp(v1, v2, t) {
    return this.add(v1, this.multiply(this.subtract(v2, v1), t));
  }
  /**
   * Applies Math.floor to each component of the vector.
   */
  static floor(v) {
    return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
  }
  /**
   * Applies Math.ceil to each component of the vector.
   */
  static ceil(v) {
    return { x: Math.ceil(v.x), y: Math.ceil(v.y), z: Math.ceil(v.z) };
  }
  /**
   * Applies Math.round to each component of the vector.
   */
  static round(v) {
    return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
  }
  /**
   * Applies Math.abs to each component of the vector.
   */
  static abs(v) {
    return { x: Math.abs(v.x), y: Math.abs(v.y), z: Math.abs(v.z) };
  }
  /**
   * Returns a vector containing the minimum components of two vectors.
   */
  static min(v1, v2) {
    return { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), z: Math.min(v1.z, v2.z) };
  }
  /**
   * Returns a vector containing the maximum components of two vectors.
   */
  static max(v1, v2) {
    return { x: Math.max(v1.x, v2.x), y: Math.max(v1.y, v2.y), z: Math.max(v1.z, v2.z) };
  }
  /**
   * Returns a string representation of the vector.
   */
  static toString(v) {
    return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
  }
};

// src/main/bedrock/ts/systems/MathParser.ts
var MathParser = class _MathParser {
  /**
   * Gets the default context with standard math and vector functions.
   * @param extra Optional extra context to merge.
   */
  static getContext(extra = {}) {
    return {
      v: (x, y, z) => ({ x: Number(x), y: Number(y), z: Number(z) }),
      vec3: (x, y, z) => ({ x: Number(x), y: Number(y), z: Number(z) }),
      add: (v1, v2) => Vec3.add(v1, v2),
      sub: (v1, v2) => Vec3.subtract(v1, v2),
      mul: (v, s) => typeof v === "number" ? v * s : Vec3.multiply(v, s),
      div: (v, s) => typeof v === "number" ? v / s : Vec3.divide(v, s),
      dot: (v1, v2) => Vec3.dot(v1, v2),
      cross: (v1, v2) => Vec3.cross(v1, v2),
      mag: (v) => Vec3.magnitude(v),
      magnitude: (v) => Vec3.magnitude(v),
      norm: (v) => Vec3.normalize(v),
      normalize: (v) => Vec3.normalize(v),
      dist: (v1, v2) => Vec3.distance(v1, v2),
      distance: (v1, v2) => Vec3.distance(v1, v2),
      lerp: (v1, v2, t) => Vec3.lerp(v1, v2, t),
      floor: (v) => typeof v === "number" ? Math.floor(v) : Vec3.floor(v),
      ceil: (v) => typeof v === "number" ? Math.ceil(v) : Vec3.ceil(v),
      round: (v) => typeof v === "number" ? Math.round(v) : Vec3.round(v),
      abs: (v) => typeof v === "number" ? Math.abs(v) : Vec3.abs(v),
      min: (a, b) => typeof a === "number" ? Math.min(a, b) : Vec3.min(a, b),
      max: (a, b) => typeof a === "number" ? Math.max(a, b) : Vec3.max(a, b),
      pi: () => Math.PI,
      e: () => Math.E,
      sin: (x) => Math.sin(x),
      cos: (x) => Math.cos(x),
      tan: (x) => Math.tan(x),
      sqrt: (x) => Math.sqrt(x),
      pow: (x, y) => Math.pow(x, y),
      log: (x) => Math.log(x),
      log10: (x) => Math.log10(x),
      random: () => Math.random(),
      // Simple linear solver: ax + b = 0 => x = -b/a
      solve_linear: (a, b) => -b / a,
      // Quadratic solver: ax^2 + bx + c = 0
      solve_quadratic: (a, b, c) => {
        const d = b * b - 4 * a * c;
        if (d < 0) return "No real roots";
        if (d === 0) return [-b / (2 * a)];
        return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
      },
      // Universal numerical solver using Secant method for f(x) = 0
      solve: (exprStr, guess1 = 0, guess2 = 1) => {
        if (typeof exprStr !== "string") return "Error: solve() requires a string expression (e.g., 'x^2 - 4'). Use single quotes.";
        let finalExpr = exprStr;
        if (exprStr.includes("=") && !exprStr.includes("<=") && !exprStr.includes(">=") && !exprStr.includes("==")) {
          const parts = exprStr.split("=");
          finalExpr = `${parts[0]} - (${parts[1]})`;
        }
        let x0 = Number(guess1);
        let x1 = Number(guess2);
        let f0 = _MathParser.evaluate(finalExpr, { ...extra, x: x0 });
        let f1 = _MathParser.evaluate(finalExpr, { ...extra, x: x1 });
        for (let i = 0; i < 100; i++) {
          if (Math.abs(f1) < 1e-10) return x1;
          if (Math.abs(f1 - f0) < 1e-15) break;
          let x2 = x1 - f1 * ((x1 - x0) / (f1 - f0));
          x0 = x1;
          f0 = f1;
          x1 = x2;
          f1 = _MathParser.evaluate(finalExpr, { ...extra, x: x1 });
        }
        return Math.abs(f1) < 1e-5 ? x1 : "No real solution found near guesses";
      },
      ...extra
    };
  }
  /**
   * Evaluates a mathematical expression and returns the result.
   * @param expression The expression string to evaluate.
   * @param extra Optional extra context variables or functions.
   */
  static evaluate(expression, extra = {}) {
    const tokens = this.tokenize(expression);
    const context = this.getContext(extra);
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const parsePrimary = () => {
      let token = consume();
      if (!token) throw new Error("Unexpected end of expression");
      if (token === "-") {
        const val = parsePrimary();
        return typeof val === "number" ? -val : Vec3.multiply(val, -1);
      }
      if (token === "(") {
        const val = parseExpr();
        if (consume() !== ")") throw new Error("Expected ')'");
        return val;
      }
      if (token.startsWith("'") || token.startsWith('"')) {
        return token.slice(1, -1);
      }
      if (!isNaN(Number(token))) return Number(token);
      const lowerToken = token.toLowerCase();
      if (lowerToken === "x" && extra.x !== void 0) {
        return extra.x;
      }
      if (context[lowerToken] !== void 0) {
        let current = context[lowerToken];
        while (peek() === ".") {
          consume();
          const prop = consume();
          if (!prop) throw new Error("Expected property name after '.'");
          current = current[prop];
        }
        if (typeof current === "function") {
          if (peek() === "(") {
            consume();
            const args = [];
            if (peek() !== ")") {
              args.push(parseExpr());
              while (peek() === ",") {
                consume();
                args.push(parseExpr());
              }
            }
            if (consume() !== ")") throw new Error(`Expected ')' after arguments for ${token}`);
            return current(...args);
          } else {
            try {
              return current();
            } catch (e) {
              return current;
            }
          }
        } else {
          return current;
        }
      }
      if (extra[lowerToken] !== void 0) {
        let current = extra[lowerToken];
        while (peek() === ".") {
          consume();
          const prop = consume();
          if (!prop) throw new Error("Expected property name after '.'");
          current = current[prop];
        }
        return current;
      }
      throw new Error(`Unexpected token: '${token}'`);
    };
    const parsePower = () => {
      let left = parsePrimary();
      while (peek() === "^") {
        consume();
        const right = parsePrimary();
        left = Math.pow(left, right);
      }
      return left;
    };
    const parseImplicitMul = () => {
      let left = parsePower();
      while (peek() && !["+", "-", "*", "/", "^", ",", ")", "<", ">", "=", "<=", ">="].includes(peek())) {
        const right = parsePower();
        left = typeof left === "number" && typeof right === "number" ? left * right : typeof left === "object" ? Vec3.multiply(left, right) : Vec3.multiply(right, left);
      }
      return left;
    };
    const parseMulDiv = () => {
      let left = parseImplicitMul();
      while (peek() === "*" || peek() === "/") {
        const op = consume();
        const right = parseImplicitMul();
        if (op === "*") {
          left = typeof left === "number" && typeof right === "number" ? left * right : typeof left === "object" ? Vec3.multiply(left, right) : Vec3.multiply(right, left);
        } else {
          left = typeof left === "number" ? left / right : Vec3.divide(left, right);
        }
      }
      return left;
    };
    const parseAddSub = () => {
      let left = parseMulDiv();
      while (peek() === "+" || peek() === "-") {
        const op = consume();
        const right = parseMulDiv();
        if (op === "+") {
          left = typeof left === "number" && typeof right === "number" ? left + right : Vec3.add(left, right);
        } else {
          left = typeof left === "number" && typeof right === "number" ? left - right : Vec3.subtract(left, right);
        }
      }
      return left;
    };
    const parseComparison = () => {
      let left = parseAddSub();
      while (peek() === "<" || peek() === ">" || peek() === "=" || peek() === "<=" || peek() === ">=") {
        const op = consume();
        const right = parseAddSub();
        if (op === "<") left = left < right;
        else if (op === ">") left = left > right;
        else if (op === "=") left = left == right;
        else if (op === "<=") left = left <= right;
        else if (op === ">=") left = left >= right;
      }
      return left;
    };
    const parseExpr = () => parseComparison();
    const result = parseExpr();
    if (pos < tokens.length) throw new Error(`Unexpected extra tokens starting at '${tokens[pos]}'`);
    return result;
  }
  /**
   * Tokenizes an expression string into an array of tokens.
   * @param str The expression string to tokenize.
   */
  static tokenize(str) {
    const regex = /"[^"]*"|'[^']*'|[a-zA-Z_]+|[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?|\.|\(|\)|,|\+|\-|\*|\/|\^|\<=|\>=|\<|\>|\=/gi;
    return str.match(regex) || [];
  }
};

// src/main/bedrock/ts/systems/Commands.ts
function registerGaiaCommands(registry) {
  registry.registerCommand({
    name: "gaiadimension:math",
    description: "Evaluates a mathematical expression with Vec3 and Math support.",
    permissionLevel: CommandPermissionLevel.Any,
    optionalParameters: [
      { name: "p1", type: CustomCommandParamType.String },
      { name: "p2", type: CustomCommandParamType.String },
      { name: "p3", type: CustomCommandParamType.String },
      { name: "p4", type: CustomCommandParamType.String },
      { name: "p5", type: CustomCommandParamType.String },
      { name: "p6", type: CustomCommandParamType.String },
      { name: "p7", type: CustomCommandParamType.String },
      { name: "p8", type: CustomCommandParamType.String }
    ]
  }, (origin, p1, p2, p3, p4, p5, p6, p7, p8) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      try {
        const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter((p) => p !== void 0).join(" ");
        if (!expression) {
          player.sendMessage("\xA7cUsage: /gaiadimension:math <expression>");
          return;
        }
        const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
        const view = player.getViewDirection();
        const rot = player.getRotation();
        const contextExtra = {
          pos,
          view,
          rot,
          self: player,
          lp: pos,
          lx: pos.x,
          ly: pos.y,
          lz: pos.z,
          vx: view.x,
          vy: view.y,
          vz: view.z,
          rx: rot.x,
          ry: rot.y
        };
        const result = MathParser.evaluate(expression, contextExtra);
        let output = "";
        if (typeof result === "object" && result !== null) {
          if ("x" in result && "y" in result && "z" in result) {
            output = Vec3.toString(result);
          } else {
            output = JSON.stringify(result);
          }
        } else {
          output = String(result);
        }
        player.sendMessage(`\xA78[\xA76Math\xA78] \xA7f${expression} \xA77= \xA7a${output}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        player.sendMessage(`\xA78[\xA76Math\xA78] \xA7cError: ${message}`);
      }
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:tpmath",
    description: "Calculates a location and teleports you there.",
    permissionLevel: CommandPermissionLevel.Any,
    optionalParameters: [
      { name: "p1", type: CustomCommandParamType.String },
      { name: "p2", type: CustomCommandParamType.String },
      { name: "p3", type: CustomCommandParamType.String },
      { name: "p4", type: CustomCommandParamType.String },
      { name: "p5", type: CustomCommandParamType.String },
      { name: "p6", type: CustomCommandParamType.String },
      { name: "p7", type: CustomCommandParamType.String },
      { name: "p8", type: CustomCommandParamType.String }
    ]
  }, (origin, p1, p2, p3, p4, p5, p6, p7, p8) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      try {
        const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter((p) => p !== void 0).join(" ");
        if (!expression) {
          player.sendMessage("\xA7cUsage: /gaiadimension:tpmath <expression>");
          return;
        }
        const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
        const view = player.getViewDirection();
        const rot = player.getRotation();
        const contextExtra = {
          pos,
          view,
          rot,
          self: player,
          lp: pos,
          lx: pos.x,
          ly: pos.y,
          lz: pos.z,
          vx: view.x,
          vy: view.y,
          vz: view.z,
          rx: rot.x,
          ry: rot.y
        };
        const result = MathParser.evaluate(expression, contextExtra);
        if (typeof result === "object" && result !== null && "x" in result && "y" in result && "z" in result) {
          player.teleport(result);
          player.sendMessage(`\xA78[\xA76TPMath\xA78] \xA77Teleported to \xA7a${Vec3.toString(result)}`);
        } else {
          player.sendMessage("\xA7cError: The expression must result in a Vector3.");
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        player.sendMessage(`\xA78[\xA76TPMath\xA78] \xA7cError: ${message}`);
      }
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:data",
    description: "Allows you to get, merge, modify, and remove data from block entities and entities.",
    permissionLevel: CommandPermissionLevel.GameDirectors,
    optionalParameters: [
      { name: "op", type: CustomCommandParamType.String },
      { name: "target", type: CustomCommandParamType.String },
      { name: "path", type: CustomCommandParamType.String },
      { name: "v1", type: CustomCommandParamType.String },
      { name: "v2", type: CustomCommandParamType.String },
      { name: "v3", type: CustomCommandParamType.String },
      { name: "v4", type: CustomCommandParamType.String },
      { name: "v5", type: CustomCommandParamType.String }
    ]
  }, (origin, op, target, path, v1, v2, v3, v4, v5) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      try {
        const operation = op ? op.toLowerCase() : "get";
        const targetType = target ? target.toLowerCase() : "self";
        const getTarget = (type2) => {
          if (type2 === "block") {
            const ray = player.getBlockFromViewDirection({ maxDistance: 10 });
            return ray ? ray.block : null;
          } else if (type2 === "entity") {
            const ray = player.getEntitiesFromViewDirection({ maxDistance: 10 });
            return ray && ray.length > 0 ? ray[0].entity : null;
          } else if (type2 === "self") {
            return player;
          }
          return null;
        };
        let targetObj = getTarget(targetType);
        if (!targetObj) throw new Error(`Target '${targetType}' not found or out of range.`);
        const data = DataSystem.getRoot(targetObj);
        const targetName = targetType === "self" ? player.name : targetType;
        if (operation === "get") {
          const val = DataSystem.getByPath(data, path);
          if (path) {
            player.sendMessage(`${targetName} has the following entity data: ${JSON.stringify(val, null, 2)}`);
          } else {
            player.sendMessage(`${targetName} has the following entity data: ${JSON.stringify(data, null, 2)}`);
          }
        } else if (operation === "merge") {
          const jsonStr = [path, v1, v2, v3, v4, v5].filter((p) => p !== void 0).join(" ");
          const source = JSON.parse(jsonStr);
          DataSystem.deepMerge(data, source);
          DataSystem.saveRoot(targetObj, data);
          player.sendMessage(`Modified entity data of ${targetName}`);
        } else if (operation === "modify") {
          const subOp = v1 ? v1.toLowerCase() : "set";
          const sourceType = v2 ? v2.toLowerCase() : "value";
          let finalVal = void 0;
          if (sourceType === "value") {
            const rawVal = [v3, v4, v5].filter((p) => p !== void 0).join(" ");
            finalVal = rawVal;
            try {
              finalVal = JSON.parse(rawVal);
            } catch (e) {
            }
            if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") finalVal = Number(rawVal);
            if (rawVal === "true") finalVal = true;
            if (rawVal === "false") finalVal = false;
          } else if (sourceType === "from") {
            const fromSourceType = v3 ? v3.toLowerCase() : "self";
            const fromSourcePath = v4;
            const sourceObj = getTarget(fromSourceType);
            if (!sourceObj) throw new Error(`Source '${fromSourceType}' not found.`);
            const sourceData = DataSystem.getRoot(sourceObj);
            finalVal = DataSystem.getByPath(sourceData, fromSourcePath);
          }
          if (subOp === "set") {
            DataSystem.setByPath(data, path, finalVal);
          }
          DataSystem.saveRoot(targetObj, data);
          player.sendMessage(`Modified entity data of ${targetName}`);
        } else if (operation === "remove") {
          if (!path) throw new Error("Path required for remove.");
          DataSystem.setByPath(data, path, void 0);
          DataSystem.saveRoot(targetObj, data);
          player.sendMessage(`Modified entity data of ${targetName}`);
        } else if (operation === "math") {
          const expression = [v1, v2, v3, v4, v5].filter((p) => p !== void 0).join(" ");
          const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
          const view = player.getViewDirection();
          const rot = player.getRotation();
          const contextExtra = {
            pos,
            view,
            rot,
            self: player,
            lp: pos,
            lx: pos.x,
            ly: pos.y,
            lz: pos.z,
            vx: view.x,
            vy: view.y,
            vz: view.z,
            rx: rot.x,
            ry: rot.y,
            ...data
          };
          const result = MathParser.evaluate(expression, contextExtra);
          DataSystem.setByPath(data, path, result);
          DataSystem.saveRoot(targetObj, data);
          player.sendMessage(`Modified entity data of ${targetName}`);
        } else {
          throw new Error("Unknown operation. Use get, merge, modify, remove, or math.");
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        player.sendMessage(`\xA7cError: ${message}`);
      }
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:gaiahelp",
    description: "Technical information and lore regarding the Gaia Dimension Bedrock Port.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      player.sendMessage("\xA78\xA7l========================================");
      player.sendMessage("\xA76\xA7lGAIA DIMENSION BEDROCK PORT");
      player.sendMessage("\xA77Basked under an eternal sun, a world preserved in time, a land sprouting with crystals and minerals, the ground seeping a mysterious energy.");
      player.sendMessage("");
      player.sendMessage("\xA7eWelcome to Gaia. Now its on Bedrock.");
      player.sendMessage("\xA7bThis is a Bedrock port of the Java Mod Gaia Dimension.");
      player.sendMessage("\xA78\xA7l========================================");
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:whereami",
    description: "Identify your current dimensional location.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      const inGaia = DimensionSystem.isInGaia(player);
      const dimId = player.dimension.id;
      let dimensionName = "\xA77" + dimId;
      if (inGaia) {
        dimensionName = "\xA76Gaia Dimension";
      } else if (dimId === "minecraft:overworld") {
        dimensionName = "\xA7aOverworld";
      } else if (dimId === "minecraft:nether") {
        dimensionName = "\xA7cNether";
      } else if (dimId === "minecraft:the_end") {
        dimensionName = "\xA7dThe End";
      }
      player.sendMessage("\xA78[\xA76Gaia\xA78] \xA77Current Location: " + dimensionName);
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:gaiainfo",
    description: "Display technical status within the Gaia Dimension.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      const inGaia = DimensionSystem.isInGaia(player);
      const dimId = player.dimension.id;
      let dimensionName = "\xA77" + dimId;
      if (inGaia) dimensionName = "\xA76Gaia Dimension";
      else if (dimId === "minecraft:overworld") dimensionName = "\xA7aOverworld";
      else if (dimId === "minecraft:nether") dimensionName = "\xA7cNether";
      else if (dimId === "minecraft:the_end") dimensionName = "\xA7dThe End";
      player.sendMessage("\xA78\xA7l========================================");
      player.sendMessage("\xA76\xA7lGAIA STATUS REPORT");
      player.sendMessage("\xA77Location: " + dimensionName);
      player.sendMessage("\xA77Synchronization: " + (inGaia ? "\xA7aStable" : "\xA7cExternal"));
      let coords = player.location;
      if (inGaia) {
        const biome = DimensionSystem.getBiome(player);
        player.sendMessage("\xA77Current Biome: \xA7e" + formatName(biome));
      }
      player.sendMessage("\xA77Coordinates: \xA7f" + Math.floor(coords.x) + ", " + Math.floor(coords.y) + ", " + Math.floor(coords.z));
      player.sendMessage("\xA78\xA7l========================================");
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:androsa",
    description: "The Architect.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      player.sendMessage("\xA7d[Gaia Creator] \xA77She's the primordial architect who birthed the original Java realm. If you see crystals, thank her. If you see bugs, it's definitely the porter's fault.");
      player.sendMessage("\xA7b\u{1F517} https://www.curseforge.com/minecraft/mc-mods/gaia-dimension");
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:settings",
    description: "Configure Gaia Dimension settings.",
    permissionLevel: CommandPermissionLevel.GameDirectors
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      const currentConfig = ModConfig.getAll();
      const form = new ModalFormData2();
      form.title("\xA76Gaia Settings");
      form.toggle("Portal Biome Restriction\n\xA77(Only allowed biomes)", currentConfig.portalBiomeRestriction);
      form.toggle("Allow All Biomes\n\xA77(Bypass restriction)", currentConfig.allowAllBiomes);
      form.textField("Manually Add Biome ID", "Enter identifier...", "");
      const discovered = currentConfig.discoveredBiomes;
      const hotBiomes = new Set(currentConfig.hotBiomes);
      for (const biomeId of discovered) {
        const isAllowed = hotBiomes.has(biomeId);
        const label = isAllowed ? `\xA7aAllowed: \xA7f${biomeId}` : `\xA77Restricted: \xA7f${biomeId}`;
        form.toggle(label, isAllowed);
      }
      form.show(player).then((response) => {
        if (response.canceled || !response.formValues) return;
        const [portalRestriction, allowAll, manualBiome, ...biomeToggles] = response.formValues;
        ModConfig.portalBiomeRestriction = portalRestriction;
        ModConfig.allowAllBiomes = allowAll;
        if (manualBiome && manualBiome.trim().length > 0) {
          ModConfig.addHotBiome(manualBiome.trim());
        }
        const newHotBiomes = [];
        for (let i = 0; i < discovered.length; i++) {
          if (biomeToggles[i]) {
            newHotBiomes.push(discovered[i]);
          }
        }
        ModConfig.hotBiomes = newHotBiomes;
        player.sendMessage(`\xA76[Gaia] \xA77Settings updated.`);
      }).catch((e) => {
        console.error("Failed to show settings form: " + (e instanceof Error ? e.message : String(e)));
      });
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:sen",
    description: "The Porter.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player19)) return { status: 0 };
    system26.run(() => {
      player.sendMessage("\xA76[The Porter] \xA77Behold the one who dragged this entire dimension into Bedrock by its crystal ears.");
      player.sendMessage("\xA7eIt only took 4 years, three gray hairs, and a questionable amount of sanity. Don't ask why it took so long... those gray hairs are just Albite dust, I promise.");
    });
    return { status: 0 };
  });
}
function formatName(id) {
  return id.split(/[:_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// src/main/bedrock/ts/systems/SetBiomeCommand.ts
import { Player as Player20, system as system27, CommandPermissionLevel as CommandPermissionLevel2, CustomCommandParamType as CustomCommandParamType2 } from "@minecraft/server";

// src/main/bedrock/ts/config/biome_visuals.ts
var BIOME_VISUALS = {
  "mineral_river": {
    surface: "gaiadimension:salt",
    dirt: "gaiadimension:salt_rock",
    bedrock: "gaiadimension:bedrock_mineral_river",
    foliage: [],
    groundCover: []
  },
  "volcanic_lands": {
    surface: "gaiadimension:charred_grass",
    dirt: "gaiadimension:volcanic_rock",
    bedrock: "gaiadimension:bedrock_volcanic_lands",
    foliage: ["gaiadimension:burning_tree"],
    groundCover: []
  },
  "shining_grove": {
    surface: "gaiadimension:soft_grass",
    dirt: "gaiadimension:light_soil",
    bedrock: "gaiadimension:bedrock_shining_grove",
    foliage: ["gaiadimension:golden_tree"],
    groundCover: ["gaiadimension:gold_orb_tucher_patch"]
  },
  "smoldering_bog": {
    surface: "gaiadimension:murky_grass",
    dirt: "gaiadimension:boggy_soil",
    bedrock: "gaiadimension:bedrock_smoldering_bog",
    foliage: ["gaiadimension:burnt_tree"],
    groundCover: []
  },
  "static_wasteland": {
    surface: "gaiadimension:wasteland_stone",
    dirt: "gaiadimension:impure_rock",
    bedrock: "gaiadimension:bedrock_static_wasteland",
    foliage: [],
    groundCover: ["gaiadimension:static_stone_blob"]
  },
  "green_agate_jungle": {
    surface: "gaiadimension:green_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_green_agate_jungle",
    foliage: ["gaiadimension:green_agate_tree", "gaiadimension:green_bush"],
    groundCover: ["gaiadimension:agathum_patch", "gaiadimension:green_crystal_growth_patch"]
  },
  "crystal_plains": {
    surface: "gaiadimension:pink_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_crystal_plains",
    foliage: ["gaiadimension:pink_agate_tree"],
    groundCover: ["gaiadimension:pink_crystal_growth_patch"]
  },
  "mutant_agate_wildwood": {
    surface: "gaiadimension:orange_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_mutant_agate_wildwood",
    foliage: ["gaiadimension:pink_agate_tree_mutant"],
    groundCover: ["gaiadimension:mutant_crystal_growth_patch"]
  },
  "purple_agate_swamp": {
    surface: "gaiadimension:purple_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_purple_agate_swamp",
    foliage: ["gaiadimension:purple_tree_randomizer"],
    groundCover: ["gaiadimension:purple_crystal_growth_patch"]
  },
  "pink_agate_forest": {
    surface: "gaiadimension:peach_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_pink_agate_forest",
    foliage: ["gaiadimension:forest_pink_agate_tree"],
    groundCover: ["gaiadimension:peach_crystal_growth_patch"]
  },
  "blue_agate_taiga": {
    surface: "gaiadimension:blue_agate_taiga",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_blue_agate_taiga",
    foliage: ["gaiadimension:blue_agate_tree"],
    groundCover: ["gaiadimension:blue_crystal_growth_patch"]
  },
  "fossil_woodland": {
    surface: "gaiadimension:pale_green_glitter_grass",
    dirt: "gaiadimension:heavy_soil",
    bedrock: "gaiadimension:bedrock_fossil_woodland",
    foliage: ["gaiadimension:fossilized_tree"],
    groundCover: ["gaiadimension:agathum_patch"]
  },
  "goldstone_lands": {
    surface: "gaiadimension:corrupt_grass",
    dirt: "gaiadimension:corrupt_soil",
    bedrock: "gaiadimension:bedrock_goldstone_lands",
    foliage: ["gaiadimension:goldstone_tree"],
    groundCover: ["gaiadimension:corrupt_varloom_patch"]
  },
  "plains": {
    surface: "gaiadimension:vanilla_grass_plains",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "desert": {
    surface: "minecraft:sand",
    dirt: "minecraft:sand",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: ["minecraft:cactus_feature"]
  },
  "badlands": {
    surface: "minecraft:red_sand",
    dirt: "minecraft:hardened_clay",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "swamp": {
    surface: "gaiadimension:vanilla_grass_swamp",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "jungle": {
    surface: "gaiadimension:vanilla_grass_jungle",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "forest": {
    surface: "gaiadimension:vanilla_grass_forest",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "dark_forest": {
    surface: "gaiadimension:vanilla_grass_dark_forest",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "taiga": {
    surface: "gaiadimension:vanilla_grass_taiga",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "snowy_plains": {
    surface: "gaiadimension:vanilla_grass_snowy_plains",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "mushroom_fields": {
    surface: "minecraft:mycelium",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  },
  "cherry_grove": {
    surface: "gaiadimension:vanilla_grass_cherry_grove",
    dirt: "minecraft:dirt",
    bedrock: "minecraft:bedrock",
    foliage: [],
    groundCover: []
  }
};

// src/main/bedrock/ts/systems/SetBiomeCommand.ts
function formatName2(id) {
  return id.split(/[:_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function registerSetBiomeCommand(registry) {
  registry.registerCommand({
    name: "gaiadimension:setbiome",
    description: 'Transform the biome. Usage: /gaiadimension:setbiome "crystal_plains" "20" "circle" "true"',
    permissionLevel: CommandPermissionLevel2.GameDirectors,
    optionalParameters: [
      { name: "biome", type: CustomCommandParamType2.String },
      { name: "radius", type: CustomCommandParamType2.String },
      { name: "shape", type: CustomCommandParamType2.String },
      { name: "epic", type: CustomCommandParamType2.String }
    ]
  }, (origin, biome, radiusStr, shape, epic) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player20)) return;
    if (!biome || !radiusStr) {
      player.sendMessage('\xA7cUsage: /gaiadimension:setbiome "biome" "radius" ["shape"] ["epic"]');
      return { status: 0 };
    }
    const cleanBiome = biome.replace(/["']/g, "");
    const radius = Number(radiusStr.replace(/["']/g, ""));
    const cleanShape = (shape || "circle").replace(/["']/g, "");
    const isEpic = epic?.toLowerCase().replace(/["']/g, "") === "true" || epic?.toLowerCase().replace(/["']/g, "") === "epic";
    if (isNaN(radius)) {
      player.sendMessage("\xA7cInvalid radius. Please provide a number.");
      return { status: 0 };
    }
    const visuals = BIOME_VISUALS[cleanBiome];
    if (!visuals) {
      player.sendMessage(`\xA7cUnknown biome: ${cleanBiome}. Valid: ${Object.keys(BIOME_VISUALS).join(", ")}`);
      return { status: 0 };
    }
    const center = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
    const dim = player.dimension;
    player.sendMessage(`\xA76[Gaia] \xA77Commencing transformation to \xA7e${formatName2(cleanBiome)}\xA77...`);
    const transformLocation = (loc) => {
      try {
        const metaBlock = dim.getBlock({ x: loc.x, y: 0, z: loc.z });
        if (metaBlock) metaBlock.setType(visuals.bedrock);
        let currentY = DimensionSystem.getTopBlock(dim, loc.x, loc.z, loc.y + 40);
        let surfaceBlock = null;
        while (currentY > dim.heightRange.min) {
          const b = dim.getBlock({ x: loc.x, y: currentY - 1, z: loc.z });
          if (!b || b.isAir) {
            currentY--;
            continue;
          }
          const tid = b.typeId;
          if (tid.includes("log") || tid.includes("wood") || tid.includes("leaves") || tid.includes("stem") || tid.includes("flower") || tid === "minecraft:tallgrass" || tid === "minecraft:grass" || tid === "minecraft:mycelium" || tid.includes("crystal_growth") || tid.includes("agathum") || tid.includes("tucher") || tid.includes("sapling") || tid.includes("bush")) {
            currentY--;
            continue;
          }
          surfaceBlock = b;
          break;
        }
        if (surfaceBlock && !surfaceBlock.isAir) {
          surfaceBlock.setType(visuals.surface);
          const dirtBlock = dim.getBlock({ x: loc.x, y: currentY - 2, z: loc.z });
          if (dirtBlock) dirtBlock.setType(visuals.dirt);
          const rand = Math.random();
          if (rand < 0.05 && visuals.foliage.length > 0) {
            const feature = visuals.foliage[Math.floor(Math.random() * visuals.foliage.length)];
            dim.runCommand(`execute positioned ${loc.x} ${currentY} ${loc.z} run feature place ${feature}`);
          } else if (rand < 0.15 && visuals.groundCover.length > 0) {
            const feature = visuals.groundCover[Math.floor(Math.random() * visuals.groundCover.length)];
            dim.runCommand(`execute positioned ${loc.x} ${currentY} ${loc.z} run feature place ${feature}`);
          } else if (rand < 0.25) {
            const flowers = ["gaiadimension:tilibl", "gaiadimension:tiligr", "gaiadimension:tilimy", "gaiadimension:tiliol", "gaiadimension:tiliou", "gaiadimension:tilipi", "gaiadimension:tilipu"];
            const flower = flowers[Math.floor(Math.random() * flowers.length)];
            const airBlock = dim.getBlock({ x: loc.x, y: currentY, z: loc.z });
            if (airBlock && airBlock.isAir) airBlock.setType(flower);
          }
        }
      } catch (e) {
      }
    };
    if (!isEpic) {
      system27.run(() => {
        for (let x = -radius; x <= radius; x++) {
          for (let z = -radius; z <= radius; z++) {
            const dist = Math.sqrt(x * x + z * z);
            if (cleanShape === "circle" && dist > radius) continue;
            transformLocation({ x: center.x + x, y: center.y, z: center.z + z });
          }
        }
        dim.spawnEntity("minecraft:lightning_bolt", center);
        dim.playSound("ambient.weather.thunder", center);
      });
    } else {
      let currentRadius = 0;
      const interval = system27.runInterval(() => {
        const r = currentRadius;
        for (let theta = 0; theta < 360; theta += 2) {
          const rad = theta * Math.PI / 180;
          const x = Math.round(r * Math.cos(rad));
          const z = Math.round(r * Math.sin(rad));
          transformLocation({ x: center.x + x, y: center.y, z: center.z + z });
        }
        if (r % 5 === 0) {
          const fxPos = { x: center.x + r, y: center.y, z: center.z };
          dim.playSound("item.trident.thunder", fxPos, { volume: 0.5 });
          if (Math.random() < 0.3) dim.spawnEntity("minecraft:lightning_bolt", { x: center.x + (Math.random() * r * 2 - r), y: center.y, z: center.z + (Math.random() * r * 2 - r) });
        }
        currentRadius++;
        if (currentRadius > radius) {
          system27.clearRun(interval);
          dim.playSound("ui.toast.challenge_complete", center);
          player.sendMessage("\xA76[Gaia] \xA7aTransformation Complete.");
        }
      }, 1);
    }
    return { status: 0 };
  });
}

// src/main/bedrock/ts/items/FireStarter.ts
import {
  Player as Player21,
  EquipmentSlot as EquipmentSlot5,
  Direction as Direction2
} from "@minecraft/server";
function registerFireStarterComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:fire_starter", {
    onUseOn: (event) => {
      const { source: player, block, blockFace, itemStack } = event;
      if (!(player instanceof Player21)) return;
      if (!itemStack) return;
      const targetLocation = block.location;
      const placeLocation = {
        x: targetLocation.x + (blockFace === Direction2.East ? 1 : blockFace === Direction2.West ? -1 : 0),
        y: targetLocation.y + (blockFace === Direction2.Up ? 1 : blockFace === Direction2.Down ? -1 : 0),
        z: targetLocation.z + (blockFace === Direction2.South ? 1 : blockFace === Direction2.North ? -1 : 0)
      };
      const targetBlock = player.dimension.getBlock(placeLocation);
      if (!targetBlock) return;
      if (targetBlock.typeId === "gaiadimension:glittering_fire") return;
      if (block.typeId === "gaiadimension:glittering_fire" && blockFace === Direction2.Up) return;
      if (targetBlock.isAir || targetBlock.typeId.includes("minecraft:light_block") || targetBlock.typeId === "minecraft:tallgrass" || targetBlock.typeId === "minecraft:yellow_flower" || targetBlock.typeId === "minecraft:red_flower") {
        const dimension = player.dimension;
        if (dimension.id === "minecraft:overworld" && ModConfig.portalBiomeRestriction && !ModConfig.allowAllBiomes) {
          const biome = dimension.getBiome(placeLocation);
          const hotBiomes = ModConfig.hotBiomes;
          if (!hotBiomes.includes(biome.id)) {
            dimension.playSound("random.fizz", placeLocation);
            return;
          }
        }
        targetBlock.setType("gaiadimension:glittering_fire");
        dimension.playSound("fire.ignite", placeLocation);
        PortalManager.tryIgnite(targetBlock);
        if (player.getGameMode() !== "creative") {
          const durability = itemStack.getComponent("minecraft:durability");
          if (durability) {
            const equippable = player.getComponent("minecraft:equippable");
            if (durability.damage + 1 >= durability.maxDurability) {
              equippable?.setEquipment(EquipmentSlot5.Mainhand, void 0);
              player.playSound("random.break");
            } else {
              durability.damage += 1;
              equippable?.setEquipment(EquipmentSlot5.Mainhand, itemStack);
            }
          }
        }
      }
    }
  });
}

// src/main/bedrock/ts/systems/DimensionDestruction.ts
import {
  world as world22,
  system as system28,
  Player as Player22,
  CommandPermissionLevel as CommandPermissionLevel3,
  CustomCommandParamType as CustomCommandParamType3,
  BlockVolume as BlockVolume4
} from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
var CORE_DIMENSIONS = [
  { id: "minecraft:overworld", name: "Overworld", lore: "The familiar realm of sun and earth.", color: "\xA7a" },
  { id: "minecraft:nether", name: "Nether", lore: "A hellscape of fire and brimstone.", color: "\xA7c" },
  { id: "minecraft:the_end", name: "The End", lore: "The void beyond the stars.", color: "\xA75" },
  { id: "gaiadimension:gaia_dimension", name: "Gaia Dimension", lore: "Crystalline paradise preserved in eternal sun.", color: "\xA76" }
];
var REALM_COUNT = 16;
var REALM_PREFIX = "gaiadimension:realm_";
function getRealmDims() {
  const realms = [];
  const themes = [
    { adj: "Rainia", lore: "OH MY GOD IT'S RAINING CRYSTALS", color: "\xA7b" },
    { adj: "Hollow", lore: "Echo... echo... is anyone even here?", color: "\xA77" },
    { adj: "Prismatic", lore: "Warning: may cause permanent eye damage from sheer beauty.", color: "\xA7d" },
    { adj: "Forgotten", lore: "Even the GPS gave up on this place.", color: "\xA72" },
    { adj: "Upside-Down", lore: "The trees grow INTO the sky. The sky IS the ground.", color: "\xA7c" },
    { adj: "Floaty", lore: "Everything floats here. EVERYTHING.", color: "\xA7f" },
    { adj: "Cursed", lore: "The flowers have teeth. THE FLOWERS HAVE TEETH.", color: "\xA75" },
    { adj: "Silent", lore: "Shhh. Even your footsteps are afraid to make noise.", color: "\xA78" },
    { adj: "Wiggly", lore: "The ground won't stop moving. Please make it stop.", color: "\xA74" },
    { adj: "Burning", lore: "Floor is lava but unironically.", color: "\xA7c" },
    { adj: "Misty", lore: "Can't see five blocks ahead. Vibes are immaculate though.", color: "\xA79" },
    { adj: "Void", lore: "Stare into the abyss. The abyss offers you a crystal.", color: "\xA78" },
    { adj: "Moonlit", lore: "Eternal night. Eternal chill. Eternal drip.", color: "\xA7f" },
    { adj: "Golden", lore: "Everything the light touches is gold. And edible.", color: "\xA76" },
    { adj: "Spectral", lore: "The ghosts here are more alive than you.", color: "\xA73" },
    { adj: "Abyssal", lore: "Rock bottom. Literally. You can't go deeper than this.", color: "\xA71" }
  ];
  for (let i = 0; i < REALM_COUNT; i++) {
    const t = themes[i];
    realms.push({
      id: `${REALM_PREFIX}${i}`,
      name: `${t.adj} Realm`,
      lore: t.lore,
      color: t.color
    });
  }
  return realms;
}
function getAllDimensions() {
  return [...CORE_DIMENSIONS, ...getRealmDims()];
}
function getAliveDimensions() {
  return getAllDimensions().filter((d) => !isDimensionDestroyed(d.id));
}
function isDimensionDestroyed(dimId) {
  return world22.getDynamicProperty(`destroyed:${dimId}`) === true;
}
function setDimensionDestroyed(dimId, destroyed) {
  world22.setDynamicProperty(`destroyed:${dimId}`, destroyed);
}
function findFallbackDimension(excludeId) {
  return getAliveDimensions().find((d) => d.id !== excludeId);
}
function showDimensionNavigator(player) {
  const alive = getAliveDimensions();
  if (alive.length === 0) {
    player.sendMessage("\xA7c\xA7lAll dimensions have been obliterated. There is nothing left.");
    return;
  }
  const currentDim = player.dimension.id;
  const form = new ActionFormData().title("\xA7l\xA78[ \xA7fDimensional Navigator \xA78]").body("\xA77Choose a dimension to traverse to:");
  const dimList = [];
  for (const dim of alive) {
    const isCurrent = dim.id === currentDim;
    const label = isCurrent ? `${dim.color}\xA7l${dim.name}
\xA7r\xA78(you are here)` : `${dim.color}${dim.name}
\xA78\xA7o${dim.lore}`;
    form.button(label);
    dimList.push(dim);
  }
  form.show(player).then((response) => {
    if (response.canceled || response.selection === void 0) return;
    const selected = dimList[response.selection];
    if (!selected) return;
    if (selected.id === currentDim) {
      player.sendMessage("\xA77You are already in this dimension.");
      return;
    }
    teleportToDimension(player, selected);
  }).catch(() => {
  });
}
function teleportToDimension(player, dim) {
  system28.run(() => {
    try {
      const targetDim = world22.getDimension(dim.id);
      player.sendMessage(`${dim.color}\xA7l\xBB \xA7r\xA77Traversing to ${dim.color}${dim.name}\xA77...`);
      player.teleport(
        { x: player.location.x, y: 100, z: player.location.z },
        { dimension: targetDim }
      );
      system28.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage(`${dim.color}\xA7l\xBB \xA7r\xA77Arrived in ${dim.color}${dim.name}\xA77.`);
        }
      }, 20);
    } catch (e) {
      player.sendMessage(`\xA7cFailed to traverse: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
var OMEN_LINES = [
  "\xA74\xA7lNow I am become Death, the destroyer of worlds.",
  "\xA77\xA7o\u2014 J. Robert Oppenheimer",
  "",
  "\xA7c\xA7lThe stars themselves shall weep.",
  "\xA78\xA7oThe dimensional fabric shudders...",
  "\xA74If the radiance of a thousand suns were to burst at once into the sky,",
  "\xA74that would be like the splendor of the mighty one.",
  "\xA77\xA7o\u2014 Bhagavad Gita, XI.12"
];
var FRACTURE_LINES = [
  "\xA7c\xA7l D E A T H",
  "\xA74\xA7l T H E",
  "\xA7c\xA7l D E S T R O Y E R",
  "\xA74\xA7l O F   W O R L D S",
  "",
  "\xA76\xA7lThe power of a god flows through your fingertips.",
  "\xA7e\xA7lRagnar\xF6k!",
  "\xA78\xA7oThe sky cracks. The earth splits. The void hungers.",
  "",
  "\xA75\xA7lFeel it. The weight of an entire reality... collapsing.",
  "\xA77\xA7oA trillion souls, silenced in an instant.",
  "\xA74\xA7lThis is what it means to unmake a world."
];
var DEVOURER_LINES = [
  "\xA78\xA7l\u2501\u2501\u2501\u2501\u2501\u2501 \xA74TRANSMISSIONS RECEIVED \xA78\xA7l\u2501\u2501\u2501\u2501\u2501\u2501",
  "",
  '\xA75\xA7l[UNICRON] \xA7f\xA7o"Magnificent. You destroy with the elegance of a true herald. I approve."',
  '\xA74\xA7l[GALACTUS] \xA7f\xA7o"Another world consumed. The cosmic balance shifts. Welcome to the hunger."',
  '\xA72\xA7l[ABELOTH] \xA7f\xA7o"Delicious. The chaos of an unraveling dimension... I can taste it from here."',
  '\xA7c\xA7l[THANOS] \xA7f\xA7o"You could not live with your own failure. So you erased the whole thing. Respect."',
  '\xA76\xA7l[SAURON] \xA7f\xA7o"One does not simply walk into a dimension that no longer exists."',
  `\xA7e\xA7l[Cyn] \xA7f\xA7o"Haha, you actually did it. \xA7e[giggle]\xA7f That's adorable. \xA7e[giggle] \xA7e[giggle]\xA7f"`,
  `\xA7b\xA7l[BILL CIPHER] \xA7f\xA7o"WOW! A FLAT CIRCLE WHERE A WORLD USED TO BE! NOW THAT'S MY KIND OF GEOMETRY!"`,
  `\xA7d\xA7l[DORMAMMU] \xA7f\xA7o"I've come to bargain\u2014 wait. There's nothing left to bargain for. Well played."`,
  '\xA73\xA7l[THE VOID] \xA7f\xA7o"..."',
  '\xA73\xA7l[THE VOID] \xA7f\xA7o"...thank you for the meal."',
  "",
  "\xA78\xA7l\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"
];
var AFTERMATH_LINES = [
  "",
  "\xA77\xA7oIn the silence that follows...",
  "\xA77\xA7oyou realize the screaming was yours.",
  "",
  "\xA7f\xA7lA world unmade. A history erased.",
  "\xA7f\xA7lEvery mountain. Every ocean. Every sunset.",
  "\xA7f\xA7lGone.",
  "",
  '\xA74\xA7l"I have become death."',
  "\xA77\xA7oAnd you didn't even flinch.",
  "",
  "\xA78\xA7o[The dimensional navigator will open shortly...]"
];
function broadcast(msg) {
  for (const p of world22.getAllPlayers()) {
    if (p.isValid) p.sendMessage(msg);
  }
}
var DestructionSequencer = class {
  player;
  dimId;
  dimName;
  dimColor;
  tick = 0;
  interval = 0;
  affectedPlayers = [];
  constructor(player, dimId, dimName, dimColor) {
    this.player = player;
    this.dimId = dimId;
    this.dimName = dimName;
    this.dimColor = dimColor;
  }
  start() {
    this.affectedPlayers = world22.getAllPlayers().filter((p) => p.dimension.id === this.dimId);
    broadcast(`\xA74\xA7l\u26A0 ${this.dimColor}${this.dimName} \xA74\xA7lis being obliterated... \u26A0`);
    broadcast(`\xA78\xA7oDimensional collapse initiated by \xA7f${this.player.name}`);
    this.interval = system28.runInterval(() => {
      this.tick++;
      this.processTick();
    }, 1);
  }
  processTick() {
    this.affectedPlayers = this.affectedPlayers.filter((p) => p.isValid && p.dimension.id === this.dimId);
    if (this.tick === 1) {
      for (const p of this.affectedPlayers) {
        p.onScreenDisplay.setTitle("\xA74\xA7l\u26A0 DIMENSIONAL COLLAPSE \u26A0", {
          fadeInDuration: 10,
          stayDuration: 50,
          fadeOutDuration: 10
        });
        p.addEffect("darkness", 300, { amplifier: 0, showParticles: false });
        p.dimension.playSound("ambient.weather.thunder", p.location, { volume: 2, pitch: 0.3 });
      }
    }
    for (let i = 0; i < OMEN_LINES.length; i++) {
      if (this.tick === 5 + i * 3) broadcast(OMEN_LINES[i]);
    }
    if (this.tick > 5 && this.tick < 40 && this.tick % 6 === 0) {
      for (const p of this.affectedPlayers) {
        p.addEffect("night_vision", 5, { amplifier: 0, showParticles: false });
      }
    }
    if (this.tick === 40) {
      for (const p of this.affectedPlayers) {
        p.onScreenDisplay.setTitle("\xA7c\xA7lTHE GROUND TREMBLES", {
          fadeInDuration: 5,
          stayDuration: 30,
          fadeOutDuration: 5
        });
      }
    }
    if (this.tick >= 40 && this.tick < 80) {
      for (const p of this.affectedPlayers) {
        if (this.tick % 2 === 0) {
          const shake = 0.05 + (this.tick - 40) * 4e-3;
          p.teleport({
            x: p.location.x + (Math.random() - 0.5) * shake,
            y: p.location.y,
            z: p.location.z + (Math.random() - 0.5) * shake
          });
        }
        if (this.tick % 5 === 0) {
          try {
            p.dimension.spawnParticle("minecraft:huge_explosion_emitter", {
              x: p.location.x + (Math.random() - 0.5) * 20,
              y: p.location.y + Math.random() * 10,
              z: p.location.z + (Math.random() - 0.5) * 20
            });
          } catch {
          }
        }
        if (this.tick % 8 === 0) {
          p.dimension.playSound("random.explode", p.location, { volume: 1.5, pitch: 0.2 + Math.random() * 0.3 });
        }
      }
    }
    if (this.tick === 80) {
      for (const p of this.affectedPlayers) {
        p.onScreenDisplay.setTitle("\xA7c\xA7l\xA7kXX\xA7r \xA74\xA7lTHE FABRIC IS TEARING \xA7c\xA7l\xA7kXX", {
          fadeInDuration: 5,
          stayDuration: 50,
          fadeOutDuration: 5
        });
        p.dimension.playSound("mob.enderdragon.growl", p.location, { volume: 3, pitch: 0.5 });
      }
    }
    for (let i = 0; i < FRACTURE_LINES.length; i++) {
      if (this.tick === 82 + i * 3) broadcast(FRACTURE_LINES[i]);
    }
    if (this.tick >= 80 && this.tick < 130) {
      for (const p of this.affectedPlayers) {
        if (this.tick % 3 === 0) {
          const angle = (this.tick - 80) * 0.3;
          const radius = 3 + (this.tick - 80) * 0.1;
          try {
            p.dimension.spawnParticle("minecraft:dragon_breath_trail", {
              x: p.location.x + Math.cos(angle) * radius,
              y: p.location.y + 1 + (this.tick - 80) % 10 * 0.3,
              z: p.location.z + Math.sin(angle) * radius
            });
            p.dimension.spawnParticle("minecraft:end_chest", {
              x: p.location.x + Math.cos(angle + Math.PI) * radius,
              y: p.location.y + 2,
              z: p.location.z + Math.sin(angle + Math.PI) * radius
            });
          } catch {
          }
        }
        if (this.tick % 10 === 0) {
          const r = Math.floor((this.tick - 80) / 10) + 2;
          const px = Math.floor(p.location.x);
          const py = Math.floor(p.location.y);
          const pz = Math.floor(p.location.z);
          try {
            p.dimension.fillBlocks(
              new BlockVolume4(
                { x: px - r, y: py - 1, z: pz - r },
                { x: px + r, y: py + r, z: pz + r }
              ),
              "minecraft:air",
              { ignoreChunkBoundErrors: true }
            );
          } catch {
          }
        }
        const shake = 0.15 + (this.tick - 80) * 6e-3;
        p.teleport({
          x: p.location.x + (Math.random() - 0.5) * shake,
          y: p.location.y,
          z: p.location.z + (Math.random() - 0.5) * shake
        });
        if (this.tick % 6 === 0) {
          p.dimension.playSound("random.explode", p.location, { volume: 2, pitch: 0.1 + Math.random() * 0.2 });
          p.dimension.playSound("ambient.weather.thunder", p.location, { volume: 2.5, pitch: 0.2 });
        }
      }
    }
    for (let i = 0; i < DEVOURER_LINES.length; i++) {
      if (this.tick === 130 + i * 3) {
        broadcast(DEVOURER_LINES[i]);
        if (DEVOURER_LINES[i].includes("[") && this.tick % 2 === 0) {
          for (const p of this.affectedPlayers) {
            if (!p.isValid) continue;
            p.dimension.playSound("random.explode", p.location, { volume: 1, pitch: 0.5 + Math.random() * 0.5 });
            try {
              p.dimension.spawnParticle("minecraft:huge_explosion_emitter", {
                x: p.location.x + (Math.random() - 0.5) * 15,
                y: p.location.y + Math.random() * 8,
                z: p.location.z + (Math.random() - 0.5) * 15
              });
            } catch {
            }
          }
        }
      }
    }
    if (this.tick === 180) {
      for (const p of this.affectedPlayers) {
        p.onScreenDisplay.setTitle("\xA7f\xA7l.", {
          fadeInDuration: 2,
          stayDuration: 30,
          fadeOutDuration: 10
        });
        p.addEffect("blindness", 80, { amplifier: 255, showParticles: false });
        p.addEffect("nausea", 80, { amplifier: 3, showParticles: false });
        p.dimension.playSound("beacon.activate", p.location, { volume: 5, pitch: 2 });
      }
      broadcast(`\xA78\xA7l[\xA74\xA7l\u2726\xA78\xA7l] \xA7f${this.dimColor}${this.dimName} \xA7fhas been \xA74\xA7lerased from existence\xA7f.`);
    }
    if (this.tick === 200) {
      setDimensionDestroyed(this.dimId, true);
      const fallback = findFallbackDimension(this.dimId);
      for (const p of this.affectedPlayers) {
        if (!p.isValid) continue;
        try {
          if (fallback) {
            const targetDim = world22.getDimension(fallback.id);
            p.teleport({ x: 0, y: 100, z: 0 }, { dimension: targetDim });
          }
          p.addEffect("slow_falling", 200, { amplifier: 0, showParticles: false });
          p.addEffect("resistance", 200, { amplifier: 4, showParticles: false });
        } catch {
        }
      }
    }
    for (let i = 0; i < AFTERMATH_LINES.length; i++) {
      if (this.tick === 210 + i * 4) broadcast(AFTERMATH_LINES[i]);
    }
    if (this.tick === 215) {
      for (const p of world22.getAllPlayers()) {
        if (!p.isValid) continue;
        p.onScreenDisplay.setTitle("\xA77\xA7oThis world has been erased from existence.", {
          fadeInDuration: 20,
          stayDuration: 60,
          fadeOutDuration: 20
        });
        p.dimension.playSound("beacon.deactivate", p.location, { volume: 2, pitch: 0.5 });
      }
    }
    if (this.tick === 260) {
      for (const p of this.affectedPlayers) {
        if (p.isValid) {
          system28.runTimeout(() => {
            if (p.isValid) showDimensionNavigator(p);
          }, 20);
        }
      }
      system28.clearRun(this.interval);
    }
  }
};
function initDestroyedDimensionGuard() {
  system28.runInterval(() => {
    for (const player of world22.getAllPlayers()) {
      if (!player.isValid) continue;
      const dimId = player.dimension.id;
      if (isDimensionDestroyed(dimId)) {
        const fallback = findFallbackDimension(dimId);
        if (fallback) {
          try {
            const targetDim = world22.getDimension(fallback.id);
            player.teleport({ x: 0, y: 100, z: 0 }, { dimension: targetDim });
            player.sendMessage(`\xA74\xA7l\u26A0 \xA7c${dimId} \xA74no longer exists. \xA77You have been redirected.`);
            system28.runTimeout(() => {
              if (player.isValid) showDimensionNavigator(player);
            }, 40);
          } catch {
          }
        }
      }
    }
  }, 20);
}
function registerRealmDimensions(registry) {
  for (let i = 0; i < REALM_COUNT; i++) {
    try {
      registry.registerCustomDimension(`${REALM_PREFIX}${i}`);
    } catch {
    }
  }
}
function registerDestructionCommands(registry) {
  registry.registerCommand({
    name: "gaiadimension:obliterate",
    description: "Obliterate an entire dimension from existence.",
    permissionLevel: CommandPermissionLevel3.Any,
    mandatoryParameters: [
      { name: "dimension", type: CustomCommandParamType3.String }
    ]
  }, (origin, dimension) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player22)) return { status: 0 };
    system28.run(() => {
      if (!dimension) {
        player.sendMessage("\xA7cUsage: /gaiadimension:obliterate <overworld|nether|the_end|gaia>");
        return;
      }
      const dimMap = {};
      for (const d of CORE_DIMENSIONS) {
        const short = d.id.split(":")[1] || d.id;
        dimMap[short] = d;
        dimMap[d.id] = d;
      }
      dimMap["gaia"] = CORE_DIMENSIONS[3];
      dimMap["end"] = CORE_DIMENSIONS[2];
      const target = dimMap[dimension.toLowerCase()];
      if (!target) {
        player.sendMessage(`\xA7cUnknown dimension '${dimension}'. Valid: overworld, nether, the_end, gaia`);
        return;
      }
      if (isDimensionDestroyed(target.id)) {
        player.sendMessage(`\xA77${target.color}${target.name} \xA77has already been obliterated.`);
        return;
      }
      const aliveAfter = getAliveDimensions().filter((d) => d.id !== target.id);
      if (aliveAfter.length === 0) {
        player.sendMessage("\xA7c\xA7lCannot obliterate the last remaining dimension.");
        return;
      }
      player.sendMessage(`\xA74\xA7lInitiating dimensional collapse of ${target.color}${target.name}\xA74\xA7l...`);
      const sequencer = new DestructionSequencer(player, target.id, target.name, target.color);
      sequencer.start();
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:dimensions",
    description: "Open the Dimensional Navigator to traverse between worlds.",
    permissionLevel: CommandPermissionLevel3.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player22)) return { status: 0 };
    system28.run(() => {
      showDimensionNavigator(player);
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:restore",
    description: "Restore a previously obliterated dimension.",
    permissionLevel: CommandPermissionLevel3.Any,
    mandatoryParameters: [
      { name: "dimension", type: CustomCommandParamType3.String }
    ]
  }, (origin, dimension) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player22)) return { status: 0 };
    system28.run(() => {
      if (!dimension) {
        player.sendMessage("\xA7cUsage: /gaiadimension:restore <overworld|nether|the_end|gaia>");
        return;
      }
      const dimMap = {};
      for (const d of CORE_DIMENSIONS) {
        const short = d.id.split(":")[1] || d.id;
        dimMap[short] = d;
        dimMap[d.id] = d;
      }
      dimMap["gaia"] = CORE_DIMENSIONS[3];
      dimMap["end"] = CORE_DIMENSIONS[2];
      const target = dimMap[dimension.toLowerCase()];
      if (!target) {
        player.sendMessage(`\xA7cUnknown dimension '${dimension}'.`);
        return;
      }
      if (!isDimensionDestroyed(target.id)) {
        player.sendMessage(`\xA77${target.color}${target.name} \xA77is not destroyed.`);
        return;
      }
      setDimensionDestroyed(target.id, false);
      for (const p of world22.getAllPlayers()) {
        p.sendMessage(`\xA7a\xA7l\u2726 ${target.color}${target.name} \xA7a\xA7lhas been restored!`);
        p.dimension.playSound("random.levelup", p.location, { volume: 1, pitch: 1.5 });
      }
    });
    return { status: 0 };
  });
}

// src/main/bedrock/ts/items/MagicStaff.ts
import { Player as Player24 } from "@minecraft/server";

// src/main/bedrock/ts/physics/ContraptionPhysics.ts
import { world as world23, system as system29, BlockPermutation as BlockPermutation12 } from "@minecraft/server";

// src/main/bedrock/ts/physics/ContraptionHitbox.ts
var PLAYER_HALF_W = 0.3;
var BLOCK_HALF = 0.5;
var PLAYER_H = 1.8;
function rotateRel(rel, pitch, yaw) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const y1 = rel.y * cp - rel.z * sp;
  const z1 = rel.y * sp + rel.z * cp;
  return {
    x: rel.x * cy - z1 * sy,
    y: y1,
    z: rel.x * sy + z1 * cy
  };
}
function resolveContraptionCollision(player, body) {
  if (!player.isValid) return { x: 0, y: 0, z: 0 };
  const px = player.location.x;
  const py = player.location.y;
  const pz = player.location.z;
  let totalPushX = 0;
  let totalPushY = 0;
  let totalPushZ = 0;
  for (const child of body.children) {
    if (!child.entity.isValid) continue;
    const VISUAL_Y = 7 * 2.7 / 16;
    const rot = rotateRel(child.relPos, body.rotation.x, body.rotation.y);
    const bx = body.center.x + rot.x;
    const by = body.center.y + VISUAL_Y + rot.y;
    const bz = body.center.z + rot.z;
    const ox = PLAYER_HALF_W + BLOCK_HALF - Math.abs(px - bx);
    const oz = PLAYER_HALF_W + BLOCK_HALF - Math.abs(pz - bz);
    const oyBot = by + 1 - py;
    const oyTop = py + PLAYER_H - by;
    if (ox <= 0 || oz <= 0 || oyBot <= 0 || oyTop <= 0) continue;
    const penX = ox;
    const penY = Math.min(oyBot, oyTop);
    const penZ = oz;
    const minPen = Math.min(penX, penY, penZ);
    if (minPen === penY) {
      if (oyBot < oyTop) {
        totalPushY = Math.max(totalPushY, by + 1 - py);
      } else {
        totalPushY = Math.min(totalPushY, by - (py + PLAYER_H));
      }
    } else if (minPen === penX) {
      const dir = px > bx ? 1 : -1;
      const push = dir * penX;
      if (Math.abs(push) > Math.abs(totalPushX)) totalPushX = push;
    } else {
      const dir = pz > bz ? 1 : -1;
      const push = dir * penZ;
      if (Math.abs(push) > Math.abs(totalPushZ)) totalPushZ = push;
    }
  }
  if (totalPushX !== 0 || totalPushY !== 0 || totalPushZ !== 0) {
    try {
      player.teleport({
        x: px + totalPushX,
        y: py + totalPushY,
        z: pz + totalPushZ
      });
    } catch {
    }
  }
  return { x: totalPushX, y: totalPushY, z: totalPushZ };
}

// src/main/bedrock/ts/physics/ContraptionPhysics.ts
var PHANTOM_SLOPE_IDS = [
  "gaiadimension:phantom_slope_n",
  // dir 0: slope ascends toward +Z
  "gaiadimension:phantom_slope_e",
  // dir 1: slope ascends toward +X
  "gaiadimension:phantom_slope_s",
  // dir 2: slope ascends toward -Z
  "gaiadimension:phantom_slope_w"
  // dir 3: slope ascends toward -X
];
var PHANTOM_FULL = "gaiadimension:phantom_full";
var SLOPE_ANGLE_STEPS = 128;
var DEFAULT_CONFIG = {
  entityType: "gaiadimension:contraption",
  holdDistance: 4,
  throwForce: 1.8
};
var ContraptionScanner = class {
  static INVALID_BLOCKS = /* @__PURE__ */ new Set([
    "minecraft:air",
    "minecraft:water",
    "minecraft:lava",
    "minecraft:flowing_water",
    "minecraft:flowing_lava"
  ]);
  static scan(startBlock, dimension, maxBlocks = 1e5) {
    const queue = [startBlock];
    const visited = /* @__PURE__ */ new Set();
    const result = [];
    while (queue.length > 0 && result.length < maxBlocks) {
      const block = queue.shift();
      const key = `${block.location.x},${block.location.y},${block.location.z}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (!this.isValidBlock(block)) continue;
      result.push(block);
      const { x, y, z } = block.location;
      const offsets = [
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 }
      ];
      for (const off of offsets) {
        const neighbor = dimension.getBlock({ x: x + off.x, y: y + off.y, z: z + off.z });
        if (neighbor) {
          const nKey = `${neighbor.location.x},${neighbor.location.y},${neighbor.location.z}`;
          if (!visited.has(nKey)) queue.push(neighbor);
        }
      }
    }
    return result;
  }
  static isValidBlock(block) {
    if (block.isAir || block.isLiquid) return false;
    if (this.INVALID_BLOCKS.has(block.typeId)) return false;
    const id = block.typeId;
    if (id.includes("slab") || id.includes("stair") || id.includes("fence") || id.includes("wall") || id.includes("door") || id.includes("trapdoor") || id.includes("sign") || id.includes("button") || id.includes("pressure_plate") || id.includes("carpet") || id.includes("banner") || id.includes("torch") || id.includes("lantern") || id.includes("chain") || id.includes("candle") || id.includes("flower") || id.includes("sapling") || id.includes("mushroom") || id.includes("skull") || id.includes("head") || id.includes("pot") || id.includes("rail") || id.includes("lever") || id.includes("tripwire") || id.includes("anvil") || id.includes("bell") || id.includes("cake") || id.includes("bed") || id.includes("chest") || id.includes("barrel")) {
      return false;
    }
    return true;
  }
};
var PHANTOM_TYPES = /* @__PURE__ */ new Set([
  PHANTOM_FULL,
  ...PHANTOM_SLOPE_IDS
]);
function isSolid(dim, x, y, z) {
  try {
    const b = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    if (!b || b.isAir || b.isLiquid) return false;
    if (PHANTOM_TYPES.has(b.typeId)) return false;
    return true;
  } catch {
    return false;
  }
}
function rotateRel2(rel, pitch, yaw) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const y1 = rel.y * cp - rel.z * sp;
  const z1 = rel.y * sp + rel.z * cp;
  return {
    x: rel.x * cy - z1 * sy,
    y: y1,
    z: rel.x * sy + z1 * cy
  };
}
var GRAVITY = 0.04;
var LINEAR_DAMPING = 0.98;
var ANGULAR_DAMPING = 0.96;
var BOUNCE = 0.3;
var REST_THRESHOLD = 0.01;
var VISUAL_Y_OFFSET = 7 * 2.7 / 16;
var ContraptionBody = class _ContraptionBody {
  center;
  rotation;
  velocity;
  angularVelocity;
  children;
  dimension;
  state;
  holderId;
  tickCallback;
  config;
  // Perf: dirty tracking
  _lastPitchS = 0;
  _lastYawS = 0;
  _lastCenterX = 0;
  _lastCenterY = 0;
  _lastCenterZ = 0;
  _restTicks = 0;
  // Phantom slope collision tracking
  _barrierPositions = [];
  _barriersPlaced = false;
  constructor(center, children, dimension, config) {
    this.center = center;
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.children = children;
    this.dimension = dimension;
    this.state = "held";
    this.holderId = "";
    this.tickCallback = 0;
    this.config = config;
  }
  static assemble(blocks, pivot, dimension, config) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const center = { x: pivot.x + 0.5, y: pivot.y, z: pivot.z + 0.5 };
    const children = [];
    const REL_SCALE = 1e3;
    for (const block of blocks) {
      const relPos = {
        x: block.location.x - pivot.x,
        y: block.location.y - pivot.y,
        z: block.location.z - pivot.z
      };
      const blockTypeId = block.typeId;
      const entity = dimension.spawnEntity(cfg.entityType, {
        x: center.x,
        y: center.y,
        z: center.z
      });
      entity.setDynamicProperty("blockType", blockTypeId);
      system29.run(() => {
        if (entity.isValid) {
          entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${blockTypeId}`);
        }
      });
      entity.setProperty("gaiadimension:rel_x", Math.round(relPos.x * REL_SCALE));
      entity.setProperty("gaiadimension:rel_y", Math.round(relPos.y * REL_SCALE));
      entity.setProperty("gaiadimension:rel_z", Math.round(relPos.z * REL_SCALE));
      children.push({ entity, relPos, blockTypeId });
      block.setType("minecraft:air");
    }
    return new _ContraptionBody(center, children, dimension, cfg);
  }
  hold(player) {
    this.removeBarriers();
    this.state = "held";
    this.holderId = player.id;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  throw(direction, force) {
    this.removeBarriers();
    const f = force ?? this.config.throwForce;
    this.state = "thrown";
    this.holderId = "";
    this._restTicks = 0;
    this.velocity = {
      x: direction.x * f,
      y: direction.y * f + 0.3,
      z: direction.z * f
    };
    this.angularVelocity = {
      x: direction.z * 0.15,
      y: 0,
      z: -direction.x * 0.15
    };
  }
  /**
   * Script-side physics tick:
   * - Gravity applied to velocity
   * - Position updated by velocity
   * - Ground collision checked per-block at rotated positions
   * - Angular velocity updates rotation
   * - Damping applied
   * - Player collision resolved via hitbox module
   */
  physicsTick() {
    if (this.state === "resting" && this._barriersPlaced) return;
    this.velocity.y -= GRAVITY;
    this.center.x += this.velocity.x;
    this.center.y += this.velocity.y;
    this.center.z += this.velocity.z;
    this.rotation.x += this.angularVelocity.x;
    this.rotation.y += this.angularVelocity.y;
    let grounded = false;
    for (const child of this.children) {
      if (!child.entity.isValid) continue;
      const rot = rotateRel2(child.relPos, this.rotation.x, this.rotation.y);
      const wx = this.center.x + rot.x;
      const wy = this.center.y + VISUAL_Y_OFFSET + rot.y;
      const wz = this.center.z + rot.z;
      if (isSolid(this.dimension, wx, wy, wz)) {
        grounded = true;
        const groundTop = Math.floor(wy) + 1;
        this.center.y += groundTop - wy;
        break;
      }
      if (isSolid(this.dimension, wx, wy - 1, wz)) {
        grounded = true;
        break;
      }
    }
    if (grounded) {
      if (Math.abs(this.velocity.y) > 0.05) {
        this.velocity.y = -this.velocity.y * BOUNCE;
      } else {
        this.velocity.y = 0;
      }
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      this.angularVelocity.x *= 0.85;
      this.angularVelocity.z *= 0.85;
    }
    this.velocity.x *= LINEAR_DAMPING;
    this.velocity.z *= LINEAR_DAMPING;
    this.angularVelocity.x *= ANGULAR_DAMPING;
    this.angularVelocity.y *= ANGULAR_DAMPING;
    this._syncProperties();
    if (!this._barriersPlaced) {
      for (const player of world23.getAllPlayers()) {
        if (!player.isValid) continue;
        if (player.dimension.id !== this.dimension.id) continue;
        const dx = player.location.x - this.center.x;
        const dy = player.location.y - this.center.y;
        const dz = player.location.z - this.center.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) > this.children.length + 3) continue;
        resolveContraptionCollision(player, this);
      }
    }
    const speed = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) + Math.abs(this.velocity.z) + Math.abs(this.angularVelocity.x) + Math.abs(this.angularVelocity.y);
    if (speed < REST_THRESHOLD && grounded) {
      this._restTicks++;
      if (this._restTicks > 20) {
        this.state = "resting";
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        let lowestWy = Infinity;
        for (const child of this.children) {
          if (!child.entity.isValid) continue;
          const rot = rotateRel2(child.relPos, this.rotation.x, this.rotation.y);
          const wy = this.center.y + VISUAL_Y_OFFSET + rot.y;
          if (wy < lowestWy) lowestWy = wy;
        }
        if (isFinite(lowestWy)) {
          const snappedLowest = Math.round(lowestWy);
          this.center.y += snappedLowest - lowestWy;
        }
        if (!this._barriersPlaced) {
          this.placeBarriers();
        }
      }
    } else {
      this._restTicks = 0;
      if (this._barriersPlaced) {
        this.removeBarriers();
      }
    }
  }
  /**
   * Syncs rotation/position properties and teleports entities to CENTER.
   * Animation handles all visual offset via calibrated Molang.
   */
  _syncProperties() {
    const SCALE = 1e7;
    const toDeg = (rad) => {
      let d = rad * 180 / Math.PI % 360;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return d;
    };
    const pitchDeg = toDeg(this.rotation.x);
    const yawDeg = toDeg(this.rotation.y);
    const pitchS = Math.max(-18e8, Math.min(18e8, Math.round(pitchDeg * SCALE)));
    const yawS = Math.max(-18e8, Math.min(18e8, Math.round(yawDeg * SCALE)));
    const rotDirty = pitchS !== this._lastPitchS || yawS !== this._lastYawS;
    const posDirty = this.center.x !== this._lastCenterX || this.center.y !== this._lastCenterY || this.center.z !== this._lastCenterZ;
    if (!rotDirty && !posDirty) return;
    if (rotDirty) {
      this._lastPitchS = pitchS;
      this._lastYawS = yawS;
    }
    if (posDirty) {
      this._lastCenterX = this.center.x;
      this._lastCenterY = this.center.y;
      this._lastCenterZ = this.center.z;
    }
    for (const child of this.children) {
      if (!child.entity.isValid) continue;
      if (posDirty) {
        child.entity.teleport({
          x: this.center.x,
          y: this.center.y,
          z: this.center.z
        });
      }
      if (rotDirty) {
        child.entity.setProperty("gaiadimension:tumble_a", pitchS);
        child.entity.setProperty("gaiadimension:tumble_b", yawS);
      }
    }
  }
  destroy() {
    this.removeBarriers();
    for (const child of this.children) {
      if (child.entity.isValid) child.entity.triggerEvent("gaiadimension:despawn");
    }
    this.children = [];
  }
  // ══════════════════════════════════════════════════════════════════
  //  Phantom Slope Collision — Engine-native collision for resting
  //  contraptions using invisible blocks with multi-box collision.
  //
  //  COORDINATE SYSTEM: Bedrock uses LEFT-HANDED rotation.
  //  Ry (yaw): x2 = rx*cos(w) - z1*sin(w)   (MINUS sin)
  //            z2 = rx*sin(w) + z1*cos(w)   (PLUS sin)
  //  This matches rotateRel() above.
  // ══════════════════════════════════════════════════════════════════
  /**
   * Place invisible phantom slope blocks at each child's resting grid position.
   * The slope angle and direction are derived from the contraption's rotation.
   */
  placeBarriers() {
    if (this._barriersPlaced) return;
    const pitch = this.rotation.x;
    const yaw = this.rotation.y;
    const absPitchDeg = Math.abs(pitch * 180 / Math.PI) % 180;
    const clampedDeg = Math.min(absPitchDeg, 89.3);
    const slopeIdx = Math.round(clampedDeg / 89.3 * (SLOPE_ANGLE_STEPS - 1));
    let yawNorm = (yaw % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pitchSign = pitch >= 0 ? 0 : 2;
    const octant = Math.round(yawNorm / (Math.PI / 2)) % 4;
    const dirIdx = (octant + pitchSign) % 4;
    const useFullBlock = slopeIdx <= 1;
    const targets = [];
    for (const child of this.children) {
      if (!child.entity.isValid) continue;
      const rot = rotateRel2(child.relPos, pitch, yaw);
      const vx = this.center.x + rot.x;
      const vy = this.center.y + VISUAL_Y_OFFSET + rot.y;
      const vz = this.center.z + rot.z;
      const wx = Math.floor(vx);
      const wy = Math.floor(vy);
      const wz = Math.floor(vz);
      targets.push({ wx, wy, wz });
    }
    let maxPhantomY = -Infinity;
    for (const t of targets) {
      if (t.wy > maxPhantomY) maxPhantomY = t.wy;
    }
    const safeY = maxPhantomY + 1;
    for (const player of world23.getAllPlayers()) {
      if (!player.isValid) continue;
      if (player.dimension.id !== this.dimension.id) continue;
      const px = player.location.x;
      const py = player.location.y;
      const pz = player.location.z;
      for (const t of targets) {
        const overlapX = px + 0.3 > t.wx && px - 0.3 < t.wx + 1;
        const overlapZ = pz + 0.3 > t.wz && pz - 0.3 < t.wz + 1;
        const overlapY = py + 1.8 > t.wy && py < t.wy + 1;
        if (overlapX && overlapY && overlapZ) {
          try {
            player.teleport({ x: px, y: safeY, z: pz });
          } catch {
          }
          break;
        }
      }
    }
    for (const t of targets) {
      try {
        const block = this.dimension.getBlock({ x: t.wx, y: t.wy, z: t.wz });
        if (!block) continue;
        if (!block.isAir && !block.isLiquid) continue;
        if (useFullBlock) {
          block.setType(PHANTOM_FULL);
        } else {
          const slopeBlockId = PHANTOM_SLOPE_IDS[dirIdx];
          const slopeHi = Math.floor(slopeIdx / 16);
          const slopeLo = slopeIdx % 16;
          const perm = BlockPermutation12.resolve(slopeBlockId, {
            "gaiadimension:slope_hi": slopeHi,
            "gaiadimension:slope_lo": slopeLo
          });
          block.setPermutation(perm);
        }
        this._barrierPositions.push({ x: t.wx, y: t.wy, z: t.wz });
      } catch (e) {
        console.error(`[Contraption] placeBarriers ERROR at ${t.wx},${t.wy},${t.wz}: ${e}`);
      }
    }
    this._barriersPlaced = true;
  }
  /**
   * Remove all placed phantom collision blocks (set back to air).
   */
  removeBarriers() {
    if (!this._barriersPlaced || this._barrierPositions.length === 0) {
      this._barriersPlaced = false;
      return;
    }
    for (const pos of this._barrierPositions) {
      try {
        const block = this.dimension.getBlock(pos);
        if (!block) continue;
        const id = block.typeId;
        if (id === PHANTOM_FULL || id === PHANTOM_SLOPE_IDS[0] || id === PHANTOM_SLOPE_IDS[1] || id === PHANTOM_SLOPE_IDS[2] || id === PHANTOM_SLOPE_IDS[3]) {
          block.setType("minecraft:air");
        }
      } catch {
      }
    }
    console.log(`[Contraption] Removed ${this._barrierPositions.length} phantom collision blocks`);
    this._barrierPositions = [];
    this._barriersPlaced = false;
  }
  prune() {
    this.children = this.children.filter((ch) => ch.entity.isValid);
    return this.children.length > 0;
  }
};
var ContraptionManager = class {
  static active = /* @__PURE__ */ new Map();
  static get(id) {
    return this.active.get(id);
  }
  static has(id) {
    return this.active.has(id);
  }
  static delete(id) {
    this.active.delete(id);
  }
  static register(id, body) {
    this.active.set(id, body);
    const tickCallback = system29.runInterval(() => {
      if (!body.prune()) {
        system29.clearRun(body.tickCallback);
        body.destroy();
        for (const [k, v] of this.active) {
          if (v === body) this.active.delete(k);
        }
        return;
      }
      if (body.state === "held") {
        const p = world23.getAllPlayers().find((pl) => pl.id === body.holderId);
        if (!p) {
          body.state = "thrown";
          this.active.delete(body.holderId);
          this.active.set("thrown_" + Date.now(), body);
          return;
        }
        const headLoc = p.getHeadLocation();
        const viewDir = p.getViewDirection();
        const targetX = headLoc.x + viewDir.x * body.config.holdDistance;
        const targetY = headLoc.y + viewDir.y * body.config.holdDistance;
        const targetZ = headLoc.z + viewDir.z * body.config.holdDistance;
        body.center = { x: targetX, y: targetY, z: targetZ };
        body.rotation = { x: 0, y: 0, z: 0 };
        body._syncProperties();
      } else if (body.state === "thrown" || body.state === "resting") {
        body.physicsTick();
      }
    }, 1);
    body.tickCallback = tickCallback;
  }
  static findNearby(position, maxDistance = 8) {
    for (const [key, body] of this.active) {
      if (body.state !== "thrown" && body.state !== "resting") continue;
      const dx = position.x - body.center.x;
      const dy = position.y - body.center.y;
      const dz = position.z - body.center.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxDistance) {
        return { key, body };
      }
    }
    return void 0;
  }
};

// src/main/bedrock/ts/items/MagicStaff.ts
function registerMagicStaffComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
    onUse: (event) => {
      const { source: player, itemStack } = event;
      if (!(player instanceof Player24) || !itemStack) return;
      const idParts = itemStack.typeId.split("_");
      if (idParts.length < 4) return;
      const elementStr = idParts[2];
      const behaviorStr = idParts[3];
      const elementMap = {
        "physical": 0 /* PHYSICAL */,
        "fire": 1 /* FIRE */,
        "electric": 2 /* ELECTRIC */,
        "poison": 3 /* POISON */,
        "frost": 4 /* FROST */,
        "magic": 5 /* MAGIC */,
        "energy": 6 /* ENERGY */
      };
      const behaviorMap = {
        "basic": 0 /* BASIC */,
        "blast": 1 /* BLAST */,
        "burst": 2 /* BURST */,
        "linger": 3 /* LINGER */,
        "ricochet": 4 /* RICOCHET */,
        "scatter": 5 /* SCATTER */
      };
      const element = elementMap[elementStr] ?? 0 /* PHYSICAL */;
      const behavior = behaviorMap[behaviorStr] ?? 0 /* BASIC */;
      const stat = idParts[4];
      if (stat === "force") {
        if (player.isSneaking) {
          handleForceGrab(player);
          return;
        } else if (ContraptionManager.has(player.id)) {
          handleForceThrow(player);
          return;
        }
      }
      const viewDir = player.getViewDirection();
      const spawnLoc = {
        x: player.location.x + viewDir.x * 1.5,
        y: player.getHeadLocation().y + viewDir.y * 1.5,
        z: player.location.z + viewDir.z * 1.5
      };
      if (behavior === 5 /* SCATTER */) {
        for (let i = -1; i <= 1; i++) {
          const angle = i * 0.2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const scatterDir = {
            x: viewDir.x * cos - viewDir.z * sin,
            y: viewDir.y,
            z: viewDir.x * sin + viewDir.z * cos
          };
          spawnProjectile(player, spawnLoc, scatterDir, element, behavior);
        }
      } else {
        spawnProjectile(player, spawnLoc, viewDir, element, behavior);
      }
      player.dimension.playSound("random.bow", player.location, { pitch: 0.5 });
    }
  });
}
function spawnProjectile(player, location, direction, element, behavior) {
  const projectile = player.dimension.spawnEntity("gaiadimension:staff_projectile", location);
  projectile.setProperty("gaiadimension:element", element);
  projectile.setProperty("gaiadimension:behavior", behavior);
  const projectileComp = projectile.getComponent("minecraft:projectile");
  if (projectileComp) {
    projectileComp.shoot(direction);
  }
}
function handleForceGrab(player) {
  if (ContraptionManager.has(player.id)) return;
  const nearby = ContraptionManager.findNearby(player.location);
  if (nearby) {
    ContraptionManager.delete(nearby.key);
    nearby.body.hold(player);
    ContraptionManager.register(player.id, nearby.body);
    player.dimension.playSound("random.orb", player.location);
    return;
  }
  const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
  if (!blockHit) return;
  const origin = blockHit.block.location;
  const dim = player.dimension;
  const RADIUS = 1;
  const blocks = [];
  for (let dx = -RADIUS; dx <= RADIUS; dx++) {
    for (let dy = -RADIUS; dy <= RADIUS; dy++) {
      for (let dz = -RADIUS; dz <= RADIUS; dz++) {
        const b = dim.getBlock({ x: origin.x + dx, y: origin.y + dy, z: origin.z + dz });
        if (b && ContraptionScanner.isValidBlock(b)) {
          blocks.push(b);
        }
      }
    }
  }
  if (blocks.length === 0) return;
  const body = ContraptionBody.assemble(
    blocks,
    blockHit.block.location,
    dim
  );
  body.hold(player);
  ContraptionManager.register(player.id, body);
  player.dimension.playSound("random.orb", player.location);
}
function handleForceThrow(player) {
  const body = ContraptionManager.get(player.id);
  if (!body) return;
  ContraptionManager.delete(player.id);
  body.throw(player.getViewDirection());
  ContraptionManager.register("thrown_" + Date.now(), body);
  player.dimension.playSound("random.explode", player.location, { volume: 0.3 });
}

// src/main/bedrock/ts/systems/MagicStaffBehaviors.ts
import { world as world25, system as system31, MolangVariableMap, Direction as Direction3 } from "@minecraft/server";
var projectileCache = /* @__PURE__ */ new Map();
var activeProjectiles = /* @__PURE__ */ new Set();
var ELEMENT_COLORS = {
  [0 /* PHYSICAL */]: { r: 1, g: 1, b: 1 },
  [1 /* FIRE */]: { r: 1, g: 0.4, b: 0.4 },
  [2 /* ELECTRIC */]: { r: 1, g: 1, b: 0.4 },
  [3 /* POISON */]: { r: 0.6, g: 1, b: 0.2 },
  [4 /* FROST */]: { r: 0.4, g: 0.8, b: 1 },
  [5 /* MAGIC */]: { r: 1, g: 0.6, b: 1 },
  [6 /* ENERGY */]: { r: 0.6, g: 0.4, b: 0.8 }
};
function initializeMagicStaffBehaviors() {
  world25.afterEvents.entitySpawn.subscribe((event) => {
    if (event.entity.typeId === "gaiadimension:staff_projectile") {
      activeProjectiles.add(event.entity.id);
    }
  });
  system31.runInterval(() => {
    if (activeProjectiles.size === 0) return;
    for (const id of activeProjectiles) {
      const entity = world25.getEntity(id);
      if (!entity || !entity.isValid) {
        activeProjectiles.delete(id);
        continue;
      }
      try {
        const vel = entity.getVelocity();
        if (vel.x !== 0 || vel.y !== 0 || vel.z !== 0 || !projectileCache.has(id)) {
          projectileCache.set(id, {
            velocity: vel,
            element: entity.getProperty("gaiadimension:element") ?? 0,
            behavior: entity.getProperty("gaiadimension:behavior") ?? 0,
            bounceCount: entity.getProperty("gaiadimension:bounce_count") ?? 0,
            dimensionId: entity.dimension.id
          });
        }
      } catch (e) {
        activeProjectiles.delete(id);
      }
    }
    if (system31.currentTick % 200 === 0) {
      for (const id of projectileCache.keys()) {
        if (!activeProjectiles.has(id) && !world25.getEntity(id)) {
          projectileCache.delete(id);
        }
      }
    }
  }, 1);
  world25.afterEvents.projectileHitBlock.subscribe((event) => {
    if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
    const data = projectileCache.get(event.projectile.id);
    if (data) {
      handleHit(event.projectile, data, event.location, event.face);
      activeProjectiles.delete(event.projectile.id);
      projectileCache.delete(event.projectile.id);
    }
  });
  world25.afterEvents.projectileHitEntity.subscribe((event) => {
    if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
    const data = projectileCache.get(event.projectile.id);
    if (data) {
      handleHit(event.projectile, data, event.location);
      activeProjectiles.delete(event.projectile.id);
      projectileCache.delete(event.projectile.id);
    }
  });
}
function handleHit(projectile, data, location, face) {
  const { element, behavior, bounceCount, velocity } = data;
  if (behavior === 4 /* RICOCHET */ && face && bounceCount > 0) {
    const newVel = { x: velocity.x, y: velocity.y, z: velocity.z };
    if (face === Direction3.North || face === Direction3.South) newVel.z *= -1;
    if (face === Direction3.East || face === Direction3.West) newVel.x *= -1;
    if (face === Direction3.Up || face === Direction3.Down) newVel.y *= -1;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const currentSpeed = Math.sqrt(newVel.x ** 2 + newVel.y ** 2 + newVel.z ** 2);
    if (currentSpeed > 0) {
      const ratio = speed / currentSpeed;
      newVel.x *= ratio;
      newVel.y *= ratio;
      newVel.z *= ratio;
    }
    const offsetLoc = {
      x: location.x + (face === Direction3.East ? 0.1 : face === Direction3.West ? -0.1 : 0),
      y: location.y + (face === Direction3.Up ? 0.1 : face === Direction3.Down ? -0.1 : 0),
      z: location.z + (face === Direction3.South ? 0.1 : face === Direction3.North ? -0.1 : 0)
    };
    try {
      const newProj = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", offsetLoc);
      newProj.setProperty("gaiadimension:element", element);
      newProj.setProperty("gaiadimension:behavior", 4 /* RICOCHET */);
      newProj.setProperty("gaiadimension:bounce_count", bounceCount - 1);
      const projComp = newProj.getComponent("minecraft:projectile");
      if (projComp) projComp.shoot(newVel);
      projectile.dimension.playSound("random.bowhit", location, { pitch: 1.2 });
    } catch (e) {
    }
    return;
  }
  try {
    projectile.dimension.playSound("random.glass", location, { pitch: 1.5, volume: 0.5 });
    const color = ELEMENT_COLORS[element] || ELEMENT_COLORS[0 /* PHYSICAL */];
    const vars = new MolangVariableMap();
    vars.setFloat("variable.color_r", color.r);
    vars.setFloat("variable.color_g", color.g);
    vars.setFloat("variable.color_b", color.b);
    projectile.dimension.spawnParticle("gaiadimension:staff_shatter_particle", location, vars);
  } catch (e) {
  }
  switch (behavior) {
    case 1 /* BLAST */:
      try {
        projectile.dimension.createExplosion(location, 2, { breaksBlocks: false, causesFire: false });
      } catch (e) {
      }
      break;
    case 2 /* BURST */:
      const dirs = [{ x: 1, y: 0.5, z: 0 }, { x: -1, y: 0.5, z: 0 }, { x: 0, y: 0.5, z: 1 }, { x: 0, y: 0.5, z: -1 }];
      for (const d of dirs) {
        try {
          const sub = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", location);
          sub.setProperty("gaiadimension:element", element);
          sub.setProperty("gaiadimension:behavior", 0 /* BASIC */);
          const projComp = sub.getComponent("minecraft:projectile");
          if (projComp) projComp.shoot(d);
        } catch (e) {
        }
      }
      break;
    case 3 /* LINGER */:
      try {
        projectile.dimension.spawnEntity("minecraft:area_effect_cloud", location);
      } catch (e) {
      }
      break;
  }
}

// src/main/bedrock/ts/blocks/GlitterGrassSync.ts
import { world as world26, system as system32, ItemStack as ItemStack12 } from "@minecraft/server";
var GLITTER_GRASS_TYPES = [
  "gaiadimension:green_glitter_grass",
  "gaiadimension:pink_glitter_grass",
  "gaiadimension:orange_glitter_grass",
  "gaiadimension:purple_glitter_grass",
  "gaiadimension:peach_glitter_grass",
  "gaiadimension:blue_glitter_grass",
  "gaiadimension:pale_green_glitter_grass"
];
var BIOME_TO_GRASS = {
  "green_agate_jungle": "gaiadimension:green_glitter_grass",
  "crystal_plains": "gaiadimension:pink_glitter_grass",
  "mutant_agate_wildwood": "gaiadimension:orange_glitter_grass",
  "purple_agate_swamp": "gaiadimension:purple_glitter_grass",
  "pink_agate_forest": "gaiadimension:peach_glitter_grass",
  "blue_agate_taiga": "gaiadimension:blue_glitter_grass",
  "fossil_woodland": "gaiadimension:pale_green_glitter_grass"
};
function syncInventory(player) {
  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) return;
  const biome = DimensionSystem.getBiome(player);
  const targetGrassId = BIOME_TO_GRASS[biome];
  if (!targetGrassId) return;
  for (let i = 0; i < inventory.size; i++) {
    const item = inventory.getItem(i);
    if (item && GLITTER_GRASS_TYPES.includes(item.typeId) && item.typeId !== targetGrassId) {
      const newItem = new ItemStack12(targetGrassId, item.amount);
      inventory.setItem(i, newItem);
    }
  }
}
function initializeGlitterGrassSync() {
  world26.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block } = event;
    if (GLITTER_GRASS_TYPES.includes(block.typeId)) {
      const biome = DimensionSystem.getBiomeAt(block.dimension, block.location);
      const targetGrassId = BIOME_TO_GRASS[biome];
      if (targetGrassId && block.typeId !== targetGrassId) {
        system32.run(() => {
          if (block.isValid) {
            block.setType(targetGrassId);
          }
        });
      }
    }
  });
  system32.runInterval(() => {
    for (const player of world26.getAllPlayers()) {
      if (DimensionSystem.isInGaia(player)) {
        syncInventory(player);
      }
    }
  }, 40);
  world26.afterEvents.playerInventoryItemChange.subscribe((event) => {
    const { player } = event;
    if (DimensionSystem.isInGaia(player)) {
      syncInventory(player);
    }
  });
}

// src/main/bedrock/ts/world/worldgen/core/utils/vec3.ts
var isVec3Symbol = /* @__PURE__ */ Symbol("isVec3");
var Vec32 = class _Vec3 {
  x;
  y;
  z;
  // @ts-ignore
  [isVec3Symbol] = true;
  constructor(x = 0, y = 0, z = 0) {
    this.x = Number(x);
    this.y = Number(y);
    this.z = Number(z);
  }
  static magnitude(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  }
  static normalize(vec) {
    const l = _Vec3.magnitude(vec);
    return new _Vec3(vec.x / l, vec.y / l, vec.z / l);
  }
  static cross(a, b) {
    return new _Vec3(
      a.y * b.z - a.z * b.y,
      a.x * b.z - a.z * b.x,
      a.x * b.y - a.y * b.x
    );
  }
  static dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  static angleBetween(a, b) {
    return Math.acos(_Vec3.dot(a, b) / (_Vec3.magnitude(a) * _Vec3.magnitude(b)));
  }
  static subtract(a, b) {
    return new _Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  static add(a, b) {
    return new _Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
  }
  static multiply(vec, num) {
    if (typeof num === "number") {
      return new _Vec3(vec.x * num, vec.y * num, vec.z * num);
    } else {
      return new _Vec3(vec.x * num.x, vec.y * num.y, vec.z * num.z);
    }
  }
  static isVec3(vec) {
    return !!(vec && typeof vec === "object" && isVec3Symbol in vec && vec[isVec3Symbol] === true);
  }
  static floor(vec) {
    return new _Vec3(Math.floor(vec.x), Math.floor(vec.y), Math.floor(vec.z));
  }
  static ceil(vec) {
    return new _Vec3(Math.ceil(vec.x), Math.ceil(vec.y), Math.ceil(vec.z));
  }
  static projection(a, b) {
    return _Vec3.multiply(b, _Vec3.dot(a, b) / (b.x * b.x + b.y * b.y + b.z * b.z) ** 2);
  }
  static rejection(a, b) {
    return _Vec3.subtract(a, _Vec3.projection(a, b));
  }
  static reflect(v, n) {
    return _Vec3.subtract(v, _Vec3.multiply(n, 2 * _Vec3.dot(v, n)));
  }
  static lerp(a, b, t) {
    return _Vec3.add(_Vec3.multiply(a, 1 - t), _Vec3.multiply(b, t));
  }
  static distance(a, b) {
    return _Vec3.magnitude(_Vec3.subtract(a, b));
  }
  static from(object) {
    if (_Vec3.isVec3(object)) return object;
    if (Array.isArray(object)) return new _Vec3(object[0], object[1], object[2]);
    const { x = 0, y = 0, z = 0 } = object ?? {};
    return new _Vec3(Number(x), Number(y), Number(z));
  }
  static sort(vec1, vec2) {
    const [x1, x2] = vec1.x < vec2.x ? [vec1.x, vec2.x] : [vec2.x, vec1.x];
    const [y1, y2] = vec1.y < vec2.y ? [vec1.y, vec2.y] : [vec2.y, vec1.y];
    const [z1, z2] = vec1.z < vec2.z ? [vec1.z, vec2.z] : [vec2.z, vec1.z];
    return [new _Vec3(x1, y1, z1), new _Vec3(x2, y2, z2)];
  }
  static invert(vec) {
    return new _Vec3(-vec.x, -vec.y, -vec.z);
  }
  static get up() {
    return new _Vec3(0, 1, 0);
  }
  static get down() {
    return new _Vec3(0, -1, 0);
  }
  static get right() {
    return new _Vec3(1, 0, 0);
  }
  static get left() {
    return new _Vec3(-1, 0, 0);
  }
  static get forward() {
    return new _Vec3(0, 0, 1);
  }
  static get backward() {
    return new _Vec3(0, 0, -1);
  }
  static get zero() {
    return new _Vec3(0, 0, 0);
  }
  distance(vec) {
    return _Vec3.distance(this, vec);
  }
  lerp(vec, t) {
    return _Vec3.lerp(this, vec, t);
  }
  projection(vec) {
    return _Vec3.projection(this, vec);
  }
  reflect(vec) {
    return _Vec3.reflect(this, vec);
  }
  rejection(vec) {
    return _Vec3.rejection(this, vec);
  }
  cross(vec) {
    return _Vec3.cross(this, vec);
  }
  dot(vec) {
    return _Vec3.dot(this, vec);
  }
  floor() {
    return _Vec3.floor(this);
  }
  ceil() {
    return _Vec3.ceil(this);
  }
  add(vec) {
    return _Vec3.add(this, vec);
  }
  subtract(vec) {
    return _Vec3.subtract(this, vec);
  }
  multiply(num) {
    return _Vec3.multiply(this, num);
  }
  get length() {
    return _Vec3.magnitude(this);
  }
  get normalized() {
    return _Vec3.normalize(this);
  }
  toString() {
    return `<${this.x}, ${this.y}, ${this.z}>`;
  }
};

// node_modules/fastnoise-lite/FastNoiseLite.js
var FastNoiseLite = class _FastNoiseLite {
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{Cellular: string, OpenSimplex2: string, Value: string, ValueCubic: string, Perlin: string, OpenSimplex2S: string}>}
   */
  static NoiseType = Object.freeze({
    OpenSimplex2: "OpenSimplex2",
    OpenSimplex2S: "OpenSimplex2S",
    Cellular: "Cellular",
    Perlin: "Perlin",
    ValueCubic: "ValueCubic",
    Value: "Value"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{ImproveXYPlanes: string, ImproveXZPlanes: string, None: string}>}
   */
  static RotationType3D = Object.freeze({
    None: "None",
    ImproveXYPlanes: "ImproveXYPlanes",
    ImproveXZPlanes: "ImproveXZPlanes"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{FBm: string, DomainWarpIndependent: string, PingPong: string, None: string, Ridged: string, DomainWarpProgressive: string}>}
   */
  static FractalType = Object.freeze({
    None: "None",
    FBm: "FBm",
    Ridged: "Ridged",
    PingPong: "PingPong",
    DomainWarpProgressive: "DomainWarpProgressive",
    DomainWarpIndependent: "DomainWarpIndependent"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{EuclideanSq: string, Euclidean: string, Hybrid: string, Manhattan: string}>}
   */
  static CellularDistanceFunction = Object.freeze({
    Euclidean: "Euclidean",
    EuclideanSq: "EuclideanSq",
    Manhattan: "Manhattan",
    Hybrid: "Hybrid"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{Distance2Sub: string, Distance2Mul: string, Distance2Add: string, Distance2Div: string, CellValue: string, Distance: string, Distance2: string}>}
   */
  static CellularReturnType = Object.freeze({
    CellValue: "CellValue",
    Distance: "Distance",
    Distance2: "Distance2",
    Distance2Add: "Distance2Add",
    Distance2Sub: "Distance2Sub",
    Distance2Mul: "Distance2Mul",
    Distance2Div: "Distance2Div"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{BasicGrid: string, OpenSimplex2Reduced: string, OpenSimplex2: string}>}
   */
  static DomainWarpType = Object.freeze({
    OpenSimplex2: "OpenSimplex2",
    OpenSimplex2Reduced: "OpenSimplex2Reduced",
    BasicGrid: "BasicGrid"
  });
  /**
   * @static
   * @enum {string}
   * @type {Readonly<{ImproveXYPlanes: string, ImproveXZPlanes: string, None: string, DefaultOpenSimplex2: string}>}
   */
  static TransformType3D = Object.freeze({
    None: "None",
    ImproveXYPlanes: "ImproveXYPlanes",
    ImproveXZPlanes: "ImproveXZPlanes",
    DefaultOpenSimplex2: "DefaultOpenSimplex2"
  });
  /* Private */
  _Seed = 1337;
  _Frequency = 0.01;
  _NoiseType = _FastNoiseLite.NoiseType.OpenSimplex2;
  _RotationType3D = _FastNoiseLite.RotationType3D.None;
  _TransformType3D = _FastNoiseLite.TransformType3D.DefaultOpenSimplex2;
  _DomainWarpAmp = 1;
  _FractalType = _FastNoiseLite.FractalType.None;
  _Octaves = 3;
  _Lacunarity = 2;
  _Gain = 0.5;
  _WeightedStrength = 0;
  _PingPongStrength = 2;
  _FractalBounding = 1 / 1.75;
  _CellularDistanceFunction = _FastNoiseLite.CellularDistanceFunction.EuclideanSq;
  _CellularReturnType = _FastNoiseLite.CellularReturnType.Distance;
  _CellularJitterModifier = 1;
  _DomainWarpType = _FastNoiseLite.DomainWarpType.OpenSimplex2;
  _WarpTransformType3D = _FastNoiseLite.TransformType3D.DefaultOpenSimplex2;
  /**
   * @description Create new FastNoiseLite object with optional seed
   * @param {number} [seed]
   * @constructor
   */
  constructor(seed2) {
    if (seed2 !== void 0) {
      this._Seed = seed2;
    }
  }
  /**
   * @description Sets seed used for all noise types
   * @remarks Default: 1337
   * @default 1337
   * @param {number} seed
   */
  SetSeed(seed2) {
    this._Seed = seed2;
  }
  /**
   * @description Sets frequency for all noise types
   * @remarks Default: 0.01
   * @default 0.01
   * @param {number} frequency
   */
  SetFrequency(frequency) {
    this._Frequency = frequency;
  }
  /**
   * @description Sets noise algorithm used for GetNoise(...)
   * @remarks Default: OpenSimplex2
   * @default FastNoiseLite.NoiseType.OpenSimplex2
   * @param {FastNoiseLite.NoiseType} noiseType
   */
  SetNoiseType(noiseType) {
    this._NoiseType = noiseType;
    this._UpdateTransformType3D();
  }
  /**
   * @description Sets domain rotation type for 3D Noise and 3D DomainWarp.
   * @description Can aid in reducing directional artifacts when sampling a 2D plane in 3D
   * @remarks Default: None
   * @default FastNoiseLite.RotationType3D.None
   * @param {FastNoiseLite.RotationType3D} rotationType3D
   */
  SetRotationType3D(rotationType3D) {
    this._RotationType3D = rotationType3D;
    this._UpdateTransformType3D();
    this._UpdateWarpTransformType3D();
  }
  /**
   * @description Sets method for combining octaves in all fractal noise types
   * @remarks Default: None
   * @default FastNoiseLite.FractalType.None
   * @param {FastNoiseLite.FractalType} fractalType
   */
  SetFractalType(fractalType) {
    this._FractalType = fractalType;
  }
  /**
   * @description Sets octave count for all fractal noise types
   * @remarks Default: 3
   * @default 3
   * @param {number} octaves
   */
  SetFractalOctaves(octaves) {
    this._Octaves = octaves;
    this._CalculateFractalBounding();
  }
  /**
   * @description Sets octave lacunarity for all fractal noise types
   * @remarks Default: 2.0
   * @default 2.0
   * @param {number} lacunarity
   */
  SetFractalLacunarity(lacunarity) {
    this._Lacunarity = lacunarity;
  }
  /**
   * @description Sets octave gain for all fractal noise types
   * @remarks Default: 0.5
   * @default 0.5
   * @param {number} gain
   */
  SetFractalGain(gain) {
    this._Gain = gain;
    this._CalculateFractalBounding();
  }
  /**
   * @description Sets octave weighting for all none DomainWarp fratal types
   * @remarks Default: 0.0 | Keep between 0...1 to maintain -1...1 output bounding
   * @default 0.5
   * @param {number} weightedStrength
   */
  SetFractalWeightedStrength(weightedStrength) {
    this._WeightedStrength = weightedStrength;
  }
  /**
   * @description Sets strength of the fractal ping pong effect
   * @remarks Default: 2.0
   * @default 2.0
   * @param {number} pingPongStrength
   */
  SetFractalPingPongStrength(pingPongStrength) {
    this._PingPongStrength = pingPongStrength;
  }
  /**
   * @description Sets distance function used in cellular noise calculations
   * @remarks Default: EuclideanSq
   * @default FastNoiseLite.CellularDistanceFunction.EuclideanSq
   * @param {FastNoiseLite.CellularDistanceFunction} cellularDistanceFunction
   */
  SetCellularDistanceFunction(cellularDistanceFunction) {
    this._CellularDistanceFunction = cellularDistanceFunction;
  }
  /**
   * @description Sets return type from cellular noise calculations
   * @remarks Default: Distance
   * @default FastNoiseLite.CellularReturnType.Distance
   * @param {FastNoiseLite.CellularReturnType} cellularReturnType
   */
  SetCellularReturnType(cellularReturnType) {
    this._CellularReturnType = cellularReturnType;
  }
  /**
   * @description Sets the maximum distance a cellular point can move from it's grid position
   * @remarks Default: 1.0
   * @default 1.0
   * @param {number} cellularJitter
   */
  SetCellularJitter(cellularJitter) {
    this._CellularJitterModifier = cellularJitter;
  }
  /**
   * @description Sets the warp algorithm when using DomainWarp(...)
   * @remarks Default: OpenSimplex2
   * @default FastNoiseLite.DomainWarpType.OpenSimplex2
   * @param {FastNoiseLite.DomainWarpType} domainWarpType
   */
  SetDomainWarpType(domainWarpType) {
    this._DomainWarpType = domainWarpType;
    this._UpdateWarpTransformType3D();
  }
  /**
   * @description Sets the maximum warp distance from original position when using DomainWarp(...)
   * @remarks Default: 1.0
   * @default 1.0
   * @param {number} domainWarpAmp
   */
  SetDomainWarpAmp(domainWarpAmp) {
    this._DomainWarpAmp = domainWarpAmp;
  }
  /**
   * @description 2D/3D noise at given position using current settings
   * @param {number} x X coordinate
   * @param {number} y Y coordinate
   * @param {number} [z] Z coordinate
   * @return {number} Noise output bounded between -1...1
   */
  GetNoise(x, y, z) {
    let R2 = (x2, y2) => {
      x2 *= this._Frequency;
      y2 *= this._Frequency;
      switch (this._NoiseType) {
        case _FastNoiseLite.NoiseType.OpenSimplex2:
        case _FastNoiseLite.NoiseType.OpenSimplex2S:
          const SQRT3 = 1.7320508075688772;
          const F2 = 0.5 * (SQRT3 - 1);
          let t = (x2 + y2) * F2;
          x2 += t;
          y2 += t;
          break;
        default:
          break;
      }
      switch (this._FractalType) {
        default:
          return this._GenNoiseSingleR2(this._Seed, x2, y2);
        case _FastNoiseLite.FractalType.FBm:
          return this._GenFractalFBmR2(x2, y2);
        case _FastNoiseLite.FractalType.Ridged:
          return this._GenFractalRidgedR2(x2, y2);
        case _FastNoiseLite.FractalType.PingPong:
          return this._GenFractalPingPongR2(x2, y2);
      }
    };
    let R3 = (x2, y2, z2) => {
      x2 *= this._Frequency;
      y2 *= this._Frequency;
      z2 *= this._Frequency;
      switch (this._TransformType3D) {
        case _FastNoiseLite.TransformType3D.ImproveXYPlanes: {
          let xy = x2 + y2;
          let s2 = xy * -0.211324865405187;
          z2 *= 0.577350269189626;
          x2 += s2 - z2;
          y2 += s2 - z2;
          z2 += xy * 0.577350269189626;
          break;
        }
        case _FastNoiseLite.TransformType3D.ImproveXZPlanes: {
          let xz = x2 + z2;
          let s2 = xz * -0.211324865405187;
          y2 *= 0.577350269189626;
          x2 += s2 - y2;
          z2 += s2 - y2;
          y2 += xz * 0.577350269189626;
          break;
        }
        case _FastNoiseLite.TransformType3D.DefaultOpenSimplex2:
          const R32 = 2 / 3;
          let r = (x2 + y2 + z2) * R32;
          x2 = r - x2;
          y2 = r - y2;
          z2 = r - z2;
          break;
        default:
          break;
      }
      switch (this._FractalType) {
        default:
          return this._GenNoiseSingleR3(this._Seed, x2, y2, z2);
        case _FastNoiseLite.FractalType.FBm:
          return this._GenFractalFBmR3(x2, y2, z2);
        case _FastNoiseLite.FractalType.Ridged:
          return this._GenFractalRidgedR3(x2, y2, z2);
        case _FastNoiseLite.FractalType.PingPong:
          return this._GenFractalPingPongR3(x2, y2, z2);
      }
    };
    if (arguments.length === 2) {
      return R2(x, y);
    }
    if (arguments.length === 3) {
      return R3(x, y, z);
    }
  }
  /**
   * @description 2D/3D warps the input position using current domain warp settings
   * @param {Vector2|Vector3} coord
   */
  DomainWrap(coord) {
    switch (this._FractalType) {
      default:
        this._DomainWarpSingle(coord);
        break;
      case _FastNoiseLite.FractalType.DomainWarpProgressive:
        this._DomainWarpFractalProgressive(coord);
        break;
      case _FastNoiseLite.FractalType.DomainWarpIndependent:
        this._DomainWarpFractalIndependent(coord);
        break;
    }
  }
  // prettier-ignore
  _Gradients2D = [
    0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.608761429008721,
    0.793353340291235,
    0.793353340291235,
    0.608761429008721,
    0.923879532511287,
    0.38268343236509,
    0.99144486137381,
    0.130526192220051,
    0.99144486137381,
    -0.130526192220051,
    0.923879532511287,
    -0.38268343236509,
    0.793353340291235,
    -0.60876142900872,
    0.608761429008721,
    -0.793353340291235,
    0.38268343236509,
    -0.923879532511287,
    0.130526192220052,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    -0.38268343236509,
    -0.923879532511287,
    -0.608761429008721,
    -0.793353340291235,
    -0.793353340291235,
    -0.608761429008721,
    -0.923879532511287,
    -0.38268343236509,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    0.130526192220051,
    -0.923879532511287,
    0.38268343236509,
    -0.793353340291235,
    0.608761429008721,
    -0.608761429008721,
    0.793353340291235,
    -0.38268343236509,
    0.923879532511287,
    -0.130526192220052,
    0.99144486137381,
    0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.608761429008721,
    0.793353340291235,
    0.793353340291235,
    0.608761429008721,
    0.923879532511287,
    0.38268343236509,
    0.99144486137381,
    0.130526192220051,
    0.99144486137381,
    -0.130526192220051,
    0.923879532511287,
    -0.38268343236509,
    0.793353340291235,
    -0.60876142900872,
    0.608761429008721,
    -0.793353340291235,
    0.38268343236509,
    -0.923879532511287,
    0.130526192220052,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    -0.38268343236509,
    -0.923879532511287,
    -0.608761429008721,
    -0.793353340291235,
    -0.793353340291235,
    -0.608761429008721,
    -0.923879532511287,
    -0.38268343236509,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    0.130526192220051,
    -0.923879532511287,
    0.38268343236509,
    -0.793353340291235,
    0.608761429008721,
    -0.608761429008721,
    0.793353340291235,
    -0.38268343236509,
    0.923879532511287,
    -0.130526192220052,
    0.99144486137381,
    0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.608761429008721,
    0.793353340291235,
    0.793353340291235,
    0.608761429008721,
    0.923879532511287,
    0.38268343236509,
    0.99144486137381,
    0.130526192220051,
    0.99144486137381,
    -0.130526192220051,
    0.923879532511287,
    -0.38268343236509,
    0.793353340291235,
    -0.60876142900872,
    0.608761429008721,
    -0.793353340291235,
    0.38268343236509,
    -0.923879532511287,
    0.130526192220052,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    -0.38268343236509,
    -0.923879532511287,
    -0.608761429008721,
    -0.793353340291235,
    -0.793353340291235,
    -0.608761429008721,
    -0.923879532511287,
    -0.38268343236509,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    0.130526192220051,
    -0.923879532511287,
    0.38268343236509,
    -0.793353340291235,
    0.608761429008721,
    -0.608761429008721,
    0.793353340291235,
    -0.38268343236509,
    0.923879532511287,
    -0.130526192220052,
    0.99144486137381,
    0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.608761429008721,
    0.793353340291235,
    0.793353340291235,
    0.608761429008721,
    0.923879532511287,
    0.38268343236509,
    0.99144486137381,
    0.130526192220051,
    0.99144486137381,
    -0.130526192220051,
    0.923879532511287,
    -0.38268343236509,
    0.793353340291235,
    -0.60876142900872,
    0.608761429008721,
    -0.793353340291235,
    0.38268343236509,
    -0.923879532511287,
    0.130526192220052,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    -0.38268343236509,
    -0.923879532511287,
    -0.608761429008721,
    -0.793353340291235,
    -0.793353340291235,
    -0.608761429008721,
    -0.923879532511287,
    -0.38268343236509,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    0.130526192220051,
    -0.923879532511287,
    0.38268343236509,
    -0.793353340291235,
    0.608761429008721,
    -0.608761429008721,
    0.793353340291235,
    -0.38268343236509,
    0.923879532511287,
    -0.130526192220052,
    0.99144486137381,
    0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.608761429008721,
    0.793353340291235,
    0.793353340291235,
    0.608761429008721,
    0.923879532511287,
    0.38268343236509,
    0.99144486137381,
    0.130526192220051,
    0.99144486137381,
    -0.130526192220051,
    0.923879532511287,
    -0.38268343236509,
    0.793353340291235,
    -0.60876142900872,
    0.608761429008721,
    -0.793353340291235,
    0.38268343236509,
    -0.923879532511287,
    0.130526192220052,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    -0.38268343236509,
    -0.923879532511287,
    -0.608761429008721,
    -0.793353340291235,
    -0.793353340291235,
    -0.608761429008721,
    -0.923879532511287,
    -0.38268343236509,
    -0.99144486137381,
    -0.130526192220052,
    -0.99144486137381,
    0.130526192220051,
    -0.923879532511287,
    0.38268343236509,
    -0.793353340291235,
    0.608761429008721,
    -0.608761429008721,
    0.793353340291235,
    -0.38268343236509,
    0.923879532511287,
    -0.130526192220052,
    0.99144486137381,
    0.38268343236509,
    0.923879532511287,
    0.923879532511287,
    0.38268343236509,
    0.923879532511287,
    -0.38268343236509,
    0.38268343236509,
    -0.923879532511287,
    -0.38268343236509,
    -0.923879532511287,
    -0.923879532511287,
    -0.38268343236509,
    -0.923879532511287,
    0.38268343236509,
    -0.38268343236509,
    0.923879532511287
  ];
  // prettier-ignore
  _RandVecs2D = [
    -0.2700222198,
    -0.9628540911,
    0.3863092627,
    -0.9223693152,
    0.04444859006,
    -0.999011673,
    -0.5992523158,
    -0.8005602176,
    -0.7819280288,
    0.6233687174,
    0.9464672271,
    0.3227999196,
    -0.6514146797,
    -0.7587218957,
    0.9378472289,
    0.347048376,
    -0.8497875957,
    -0.5271252623,
    -0.879042592,
    0.4767432447,
    -0.892300288,
    -0.4514423508,
    -0.379844434,
    -0.9250503802,
    -0.9951650832,
    0.0982163789,
    0.7724397808,
    -0.6350880136,
    0.7573283322,
    -0.6530343002,
    -0.9928004525,
    -0.119780055,
    -0.0532665713,
    0.9985803285,
    0.9754253726,
    -0.2203300762,
    -0.7665018163,
    0.6422421394,
    0.991636706,
    0.1290606184,
    -0.994696838,
    0.1028503788,
    -0.5379205513,
    -0.84299554,
    0.5022815471,
    -0.8647041387,
    0.4559821461,
    -0.8899889226,
    -0.8659131224,
    -0.5001944266,
    0.0879458407,
    -0.9961252577,
    -0.5051684983,
    0.8630207346,
    0.7753185226,
    -0.6315704146,
    -0.6921944612,
    0.7217110418,
    -0.5191659449,
    -0.8546734591,
    0.8978622882,
    -0.4402764035,
    -0.1706774107,
    0.9853269617,
    -0.9353430106,
    -0.3537420705,
    -0.9992404798,
    0.03896746794,
    -0.2882064021,
    -0.9575683108,
    -0.9663811329,
    0.2571137995,
    -0.8759714238,
    -0.4823630009,
    -0.8303123018,
    -0.5572983775,
    0.05110133755,
    -0.9986934731,
    -0.8558373281,
    -0.5172450752,
    0.09887025282,
    0.9951003332,
    0.9189016087,
    0.3944867976,
    -0.2439375892,
    -0.9697909324,
    -0.8121409387,
    -0.5834613061,
    -0.9910431363,
    0.1335421355,
    0.8492423985,
    -0.5280031709,
    -0.9717838994,
    -0.2358729591,
    0.9949457207,
    0.1004142068,
    0.6241065508,
    -0.7813392434,
    0.662910307,
    0.7486988212,
    -0.7197418176,
    0.6942418282,
    -0.8143370775,
    -0.5803922158,
    0.104521054,
    -0.9945226741,
    -0.1065926113,
    -0.9943027784,
    0.445799684,
    -0.8951327509,
    0.105547406,
    0.9944142724,
    -0.992790267,
    0.1198644477,
    -0.8334366408,
    0.552615025,
    0.9115561563,
    -0.4111755999,
    0.8285544909,
    -0.5599084351,
    0.7217097654,
    -0.6921957921,
    0.4940492677,
    -0.8694339084,
    -0.3652321272,
    -0.9309164803,
    -0.9696606758,
    0.2444548501,
    0.08925509731,
    -0.996008799,
    0.5354071276,
    -0.8445941083,
    -0.1053576186,
    0.9944343981,
    -0.9890284586,
    0.1477251101,
    0.004856104961,
    0.9999882091,
    0.9885598478,
    0.1508291331,
    0.9286129562,
    -0.3710498316,
    -0.5832393863,
    -0.8123003252,
    0.3015207509,
    0.9534596146,
    -0.9575110528,
    0.2883965738,
    0.9715802154,
    -0.2367105511,
    0.229981792,
    0.9731949318,
    0.955763816,
    -0.2941352207,
    0.740956116,
    0.6715534485,
    -0.9971513787,
    -0.07542630764,
    0.6905710663,
    -0.7232645452,
    -0.290713703,
    -0.9568100872,
    0.5912777791,
    -0.8064679708,
    -0.9454592212,
    -0.325740481,
    0.6664455681,
    0.74555369,
    0.6236134912,
    0.7817328275,
    0.9126993851,
    -0.4086316587,
    -0.8191762011,
    0.5735419353,
    -0.8812745759,
    -0.4726046147,
    0.9953313627,
    0.09651672651,
    0.9855650846,
    -0.1692969699,
    -0.8495980887,
    0.5274306472,
    0.6174853946,
    -0.7865823463,
    0.8508156371,
    0.52546432,
    0.9985032451,
    -0.05469249926,
    0.1971371563,
    -0.9803759185,
    0.6607855748,
    -0.7505747292,
    -0.03097494063,
    0.9995201614,
    -0.6731660801,
    0.739491331,
    -0.7195018362,
    -0.6944905383,
    0.9727511689,
    0.2318515979,
    0.9997059088,
    -0.0242506907,
    0.4421787429,
    -0.8969269532,
    0.9981350961,
    -0.061043673,
    -0.9173660799,
    -0.3980445648,
    -0.8150056635,
    -0.5794529907,
    -0.8789331304,
    0.4769450202,
    0.0158605829,
    0.999874213,
    -0.8095464474,
    0.5870558317,
    -0.9165898907,
    -0.3998286786,
    -0.8023542565,
    0.5968480938,
    -0.5176737917,
    0.8555780767,
    -0.8154407307,
    -0.5788405779,
    0.4022010347,
    -0.9155513791,
    -0.9052556868,
    -0.4248672045,
    0.7317445619,
    0.6815789728,
    -0.5647632201,
    -0.8252529947,
    -0.8403276335,
    -0.5420788397,
    -0.9314281527,
    0.363925262,
    0.5238198472,
    0.8518290719,
    0.7432803869,
    -0.6689800195,
    -0.985371561,
    -0.1704197369,
    0.4601468731,
    0.88784281,
    0.825855404,
    0.5638819483,
    0.6182366099,
    0.7859920446,
    0.8331502863,
    -0.553046653,
    0.1500307506,
    0.9886813308,
    -0.662330369,
    -0.7492119075,
    -0.668598664,
    0.743623444,
    0.7025606278,
    0.7116238924,
    -0.5419389763,
    -0.8404178401,
    -0.3388616456,
    0.9408362159,
    0.8331530315,
    0.5530425174,
    -0.2989720662,
    -0.9542618632,
    0.2638522993,
    0.9645630949,
    0.124108739,
    -0.9922686234,
    -0.7282649308,
    -0.6852956957,
    0.6962500149,
    0.7177993569,
    -0.9183535368,
    0.3957610156,
    -0.6326102274,
    -0.7744703352,
    -0.9331891859,
    -0.359385508,
    -0.1153779357,
    -0.9933216659,
    0.9514974788,
    -0.3076565421,
    -0.08987977445,
    -0.9959526224,
    0.6678496916,
    0.7442961705,
    0.7952400393,
    -0.6062947138,
    -0.6462007402,
    -0.7631674805,
    -0.2733598753,
    0.9619118351,
    0.9669590226,
    -0.254931851,
    -0.9792894595,
    0.2024651934,
    -0.5369502995,
    -0.8436138784,
    -0.270036471,
    -0.9628500944,
    -0.6400277131,
    0.7683518247,
    -0.7854537493,
    -0.6189203566,
    0.06005905383,
    -0.9981948257,
    -0.02455770378,
    0.9996984141,
    -0.65983623,
    0.751409442,
    -0.6253894466,
    -0.7803127835,
    -0.6210408851,
    -0.7837781695,
    0.8348888491,
    0.5504185768,
    -0.1592275245,
    0.9872419133,
    0.8367622488,
    0.5475663786,
    -0.8675753916,
    -0.4973056806,
    -0.2022662628,
    -0.9793305667,
    0.9399189937,
    0.3413975472,
    0.9877404807,
    -0.1561049093,
    -0.9034455656,
    0.4287028224,
    0.1269804218,
    -0.9919052235,
    -0.3819600854,
    0.924178821,
    0.9754625894,
    0.2201652486,
    -0.3204015856,
    -0.9472818081,
    -0.9874760884,
    0.1577687387,
    0.02535348474,
    -0.9996785487,
    0.4835130794,
    -0.8753371362,
    -0.2850799925,
    -0.9585037287,
    -0.06805516006,
    -0.99768156,
    -0.7885244045,
    -0.6150034663,
    0.3185392127,
    -0.9479096845,
    0.8880043089,
    0.4598351306,
    0.6476921488,
    -0.7619021462,
    0.9820241299,
    0.1887554194,
    0.9357275128,
    -0.3527237187,
    -0.8894895414,
    0.4569555293,
    0.7922791302,
    0.6101588153,
    0.7483818261,
    0.6632681526,
    -0.7288929755,
    -0.6846276581,
    0.8729032783,
    -0.4878932944,
    0.8288345784,
    0.5594937369,
    0.08074567077,
    0.9967347374,
    0.9799148216,
    -0.1994165048,
    -0.580730673,
    -0.8140957471,
    -0.4700049791,
    -0.8826637636,
    0.2409492979,
    0.9705377045,
    0.9437816757,
    -0.3305694308,
    -0.8927998638,
    -0.4504535528,
    -0.8069622304,
    0.5906030467,
    0.06258973166,
    0.9980393407,
    -0.9312597469,
    0.3643559849,
    0.5777449785,
    0.8162173362,
    -0.3360095855,
    -0.941858566,
    0.697932075,
    -0.7161639607,
    -0.002008157227,
    -0.9999979837,
    -0.1827294312,
    -0.9831632392,
    -0.6523911722,
    0.7578824173,
    -0.4302626911,
    -0.9027037258,
    -0.9985126289,
    -0.05452091251,
    -0.01028102172,
    -0.9999471489,
    -0.4946071129,
    0.8691166802,
    -0.2999350194,
    0.9539596344,
    0.8165471961,
    0.5772786819,
    0.2697460475,
    0.962931498,
    -0.7306287391,
    -0.6827749597,
    -0.7590952064,
    -0.6509796216,
    -0.907053853,
    0.4210146171,
    -0.5104861064,
    -0.8598860013,
    0.8613350597,
    0.5080373165,
    0.5007881595,
    -0.8655698812,
    -0.654158152,
    0.7563577938,
    -0.8382755311,
    -0.545246856,
    0.6940070834,
    0.7199681717,
    0.06950936031,
    0.9975812994,
    0.1702942185,
    -0.9853932612,
    0.2695973274,
    0.9629731466,
    0.5519612192,
    -0.8338697815,
    0.225657487,
    -0.9742067022,
    0.4215262855,
    -0.9068161835,
    0.4881873305,
    -0.8727388672,
    -0.3683854996,
    -0.9296731273,
    -0.9825390578,
    0.1860564427,
    0.81256471,
    0.5828709909,
    0.3196460933,
    -0.9475370046,
    0.9570913859,
    0.2897862643,
    -0.6876655497,
    -0.7260276109,
    -0.9988770922,
    -0.047376731,
    -0.1250179027,
    0.992154486,
    -0.8280133617,
    0.560708367,
    0.9324863769,
    -0.3612051451,
    0.6394653183,
    0.7688199442,
    -0.01623847064,
    -0.9998681473,
    -0.9955014666,
    -0.09474613458,
    -0.81453315,
    0.580117012,
    0.4037327978,
    -0.9148769469,
    0.9944263371,
    0.1054336766,
    -0.1624711654,
    0.9867132919,
    -0.9949487814,
    -0.100383875,
    -0.6995302564,
    0.7146029809,
    0.5263414922,
    -0.85027327,
    -0.5395221479,
    0.841971408,
    0.6579370318,
    0.7530729462,
    0.01426758847,
    -0.9998982128,
    -0.6734383991,
    0.7392433447,
    0.639412098,
    -0.7688642071,
    0.9211571421,
    0.3891908523,
    -0.146637214,
    -0.9891903394,
    -0.782318098,
    0.6228791163,
    -0.5039610839,
    -0.8637263605,
    -0.7743120191,
    -0.6328039957
  ];
  // prettier-ignore
  _Gradients3D = [
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    0,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    1,
    0,
    -1,
    0,
    -1,
    0,
    -1,
    0,
    1,
    1,
    0,
    0,
    -1,
    1,
    0,
    0,
    1,
    -1,
    0,
    0,
    -1,
    -1,
    0,
    0,
    1,
    1,
    0,
    0,
    0,
    -1,
    1,
    0,
    -1,
    1,
    0,
    0,
    0,
    -1,
    -1,
    0
  ];
  // prettier-ignore
  _RandVecs3D = [
    -0.7292736885,
    -0.6618439697,
    0.1735581948,
    0,
    0.790292081,
    -0.5480887466,
    -0.2739291014,
    0,
    0.7217578935,
    0.6226212466,
    -0.3023380997,
    0,
    0.565683137,
    -0.8208298145,
    -0.0790000257,
    0,
    0.760049034,
    -0.5555979497,
    -0.3370999617,
    0,
    0.3713945616,
    0.5011264475,
    0.7816254623,
    0,
    -0.1277062463,
    -0.4254438999,
    -0.8959289049,
    0,
    -0.2881560924,
    -0.5815838982,
    0.7607405838,
    0,
    0.5849561111,
    -0.662820239,
    -0.4674352136,
    0,
    0.3307171178,
    0.0391653737,
    0.94291689,
    0,
    0.8712121778,
    -0.4113374369,
    -0.2679381538,
    0,
    0.580981015,
    0.7021915846,
    0.4115677815,
    0,
    0.503756873,
    0.6330056931,
    -0.5878203852,
    0,
    0.4493712205,
    0.601390195,
    0.6606022552,
    0,
    -0.6878403724,
    0.09018890807,
    -0.7202371714,
    0,
    -0.5958956522,
    -0.6469350577,
    0.475797649,
    0,
    -0.5127052122,
    0.1946921978,
    -0.8361987284,
    0,
    -0.9911507142,
    -0.05410276466,
    -0.1212153153,
    0,
    -0.2149721042,
    0.9720882117,
    -0.09397607749,
    0,
    -0.7518650936,
    -0.5428057603,
    0.3742469607,
    0,
    0.5237068895,
    0.8516377189,
    -0.02107817834,
    0,
    0.6333504779,
    0.1926167129,
    -0.7495104896,
    0,
    -0.06788241606,
    0.3998305789,
    0.9140719259,
    0,
    -0.5538628599,
    -0.4729896695,
    -0.6852128902,
    0,
    -0.7261455366,
    -0.5911990757,
    0.3509933228,
    0,
    -0.9229274737,
    -0.1782808786,
    0.3412049336,
    0,
    -0.6968815002,
    0.6511274338,
    0.3006480328,
    0,
    0.9608044783,
    -0.2098363234,
    -0.1811724921,
    0,
    0.06817146062,
    -0.9743405129,
    0.2145069156,
    0,
    -0.3577285196,
    -0.6697087264,
    -0.6507845481,
    0,
    -0.1868621131,
    0.7648617052,
    -0.6164974636,
    0,
    -0.6541697588,
    0.3967914832,
    0.6439087246,
    0,
    0.6993340405,
    -0.6164538506,
    0.3618239211,
    0,
    -0.1546665739,
    0.6291283928,
    0.7617583057,
    0,
    -0.6841612949,
    -0.2580482182,
    -0.6821542638,
    0,
    0.5383980957,
    0.4258654885,
    0.7271630328,
    0,
    -0.5026987823,
    -0.7939832935,
    -0.3418836993,
    0,
    0.3202971715,
    0.2834415347,
    0.9039195862,
    0,
    0.8683227101,
    -3762656404e-13,
    -0.4959995258,
    0,
    0.791120031,
    -0.08511045745,
    0.6057105799,
    0,
    -0.04011016052,
    -0.4397248749,
    0.8972364289,
    0,
    0.9145119872,
    0.3579346169,
    -0.1885487608,
    0,
    -0.9612039066,
    -0.2756484276,
    0.01024666929,
    0,
    0.6510361721,
    -0.2877799159,
    -0.7023778346,
    0,
    -0.2041786351,
    0.7365237271,
    0.644859585,
    0,
    -0.7718263711,
    0.3790626912,
    0.5104855816,
    0,
    -0.3060082741,
    -0.7692987727,
    0.5608371729,
    0,
    0.454007341,
    -0.5024843065,
    0.7357899537,
    0,
    0.4816795475,
    0.6021208291,
    -0.6367380315,
    0,
    0.6961980369,
    -0.3222197429,
    0.641469197,
    0,
    -0.6532160499,
    -0.6781148932,
    0.3368515753,
    0,
    0.5089301236,
    -0.6154662304,
    -0.6018234363,
    0,
    -0.1635919754,
    -0.9133604627,
    -0.372840892,
    0,
    0.52408019,
    -0.8437664109,
    0.1157505864,
    0,
    0.5902587356,
    0.4983817807,
    -0.6349883666,
    0,
    0.5863227872,
    0.494764745,
    0.6414307729,
    0,
    0.6779335087,
    0.2341345225,
    0.6968408593,
    0,
    0.7177054546,
    -0.6858979348,
    0.120178631,
    0,
    -0.5328819713,
    -0.5205125012,
    0.6671608058,
    0,
    -0.8654874251,
    -0.0700727088,
    -0.4960053754,
    0,
    -0.2861810166,
    0.7952089234,
    0.5345495242,
    0,
    -0.04849529634,
    0.9810836427,
    -0.1874115585,
    0,
    -0.6358521667,
    0.6058348682,
    0.4781800233,
    0,
    0.6254794696,
    -0.2861619734,
    0.7258696564,
    0,
    -0.2585259868,
    0.5061949264,
    -0.8227581726,
    0,
    0.02136306781,
    0.5064016808,
    -0.8620330371,
    0,
    0.200111773,
    0.8599263484,
    0.4695550591,
    0,
    0.4743561372,
    0.6014985084,
    -0.6427953014,
    0,
    0.6622993731,
    -0.5202474575,
    -0.5391679918,
    0,
    0.08084972818,
    -0.6532720452,
    0.7527940996,
    0,
    -0.6893687501,
    0.0592860349,
    0.7219805347,
    0,
    -0.1121887082,
    -0.9673185067,
    0.2273952515,
    0,
    0.7344116094,
    0.5979668656,
    -0.3210532909,
    0,
    0.5789393465,
    -0.2488849713,
    0.7764570201,
    0,
    0.6988182827,
    0.3557169806,
    -0.6205791146,
    0,
    -0.8636845529,
    -0.2748771249,
    -0.4224826141,
    0,
    -0.4247027957,
    -0.4640880967,
    0.777335046,
    0,
    0.5257722489,
    -0.8427017621,
    0.1158329937,
    0,
    0.9343830603,
    0.316302472,
    -0.1639543925,
    0,
    -0.1016836419,
    -0.8057303073,
    -0.5834887393,
    0,
    -0.6529238969,
    0.50602126,
    -0.5635892736,
    0,
    -0.2465286165,
    -0.9668205684,
    -0.06694497494,
    0,
    -0.9776897119,
    -0.2099250524,
    -0.007368825344,
    0,
    0.7736893337,
    0.5734244712,
    0.2694238123,
    0,
    -0.6095087895,
    0.4995678998,
    0.6155736747,
    0,
    0.5794535482,
    0.7434546771,
    0.3339292269,
    0,
    -0.8226211154,
    0.08142581855,
    0.5627293636,
    0,
    -0.510385483,
    0.4703667658,
    0.7199039967,
    0,
    -0.5764971849,
    -0.07231656274,
    -0.8138926898,
    0,
    0.7250628871,
    0.3949971505,
    -0.5641463116,
    0,
    -0.1525424005,
    0.4860840828,
    -0.8604958341,
    0,
    -0.5550976208,
    -0.4957820792,
    0.667882296,
    0,
    -0.1883614327,
    0.9145869398,
    0.357841725,
    0,
    0.7625556724,
    -0.5414408243,
    -0.3540489801,
    0,
    -0.5870231946,
    -0.3226498013,
    -0.7424963803,
    0,
    0.3051124198,
    0.2262544068,
    -0.9250488391,
    0,
    0.6379576059,
    0.577242424,
    -0.5097070502,
    0,
    -0.5966775796,
    0.1454852398,
    -0.7891830656,
    0,
    -0.658330573,
    0.6555487542,
    -0.3699414651,
    0,
    0.7434892426,
    0.2351084581,
    0.6260573129,
    0,
    0.5562114096,
    0.8264360377,
    -0.0873632843,
    0,
    -0.3028940016,
    -0.8251527185,
    0.4768419182,
    0,
    0.1129343818,
    -0.985888439,
    -0.1235710781,
    0,
    0.5937652891,
    -0.5896813806,
    0.5474656618,
    0,
    0.6757964092,
    -0.5835758614,
    -0.4502648413,
    0,
    0.7242302609,
    -0.1152719764,
    0.6798550586,
    0,
    -0.9511914166,
    0.0753623979,
    -0.2992580792,
    0,
    0.2539470961,
    -0.1886339355,
    0.9486454084,
    0,
    0.571433621,
    -0.1679450851,
    -0.8032795685,
    0,
    -0.06778234979,
    0.3978269256,
    0.9149531629,
    0,
    0.6074972649,
    0.733060024,
    -0.3058922593,
    0,
    -0.5435478392,
    0.1675822484,
    0.8224791405,
    0,
    -0.5876678086,
    -0.3380045064,
    -0.7351186982,
    0,
    -0.7967562402,
    0.04097822706,
    -0.6029098428,
    0,
    -0.1996350917,
    0.8706294745,
    0.4496111079,
    0,
    -0.02787660336,
    -0.9106232682,
    -0.4122962022,
    0,
    -0.7797625996,
    -0.6257634692,
    0.01975775581,
    0,
    -0.5211232846,
    0.7401644346,
    -0.4249554471,
    0,
    0.8575424857,
    0.4053272873,
    -0.3167501783,
    0,
    0.1045223322,
    0.8390195772,
    -0.5339674439,
    0,
    0.3501822831,
    0.9242524096,
    -0.1520850155,
    0,
    0.1987849858,
    0.07647613266,
    0.9770547224,
    0,
    0.7845996363,
    0.6066256811,
    -0.1280964233,
    0,
    0.09006737436,
    -0.9750989929,
    -0.2026569073,
    0,
    -0.8274343547,
    -0.542299559,
    0.1458203587,
    0,
    -0.3485797732,
    -0.415802277,
    0.840000362,
    0,
    -0.2471778936,
    -0.7304819962,
    -0.6366310879,
    0,
    -0.3700154943,
    0.8577948156,
    0.3567584454,
    0,
    0.5913394901,
    -0.548311967,
    -0.5913303597,
    0,
    0.1204873514,
    -0.7626472379,
    -0.6354935001,
    0,
    0.616959265,
    0.03079647928,
    0.7863922953,
    0,
    0.1258156836,
    -0.6640829889,
    -0.7369967419,
    0,
    -0.6477565124,
    -0.1740147258,
    -0.7417077429,
    0,
    0.6217889313,
    -0.7804430448,
    -0.06547655076,
    0,
    0.6589943422,
    -0.6096987708,
    0.4404473475,
    0,
    -0.2689837504,
    -0.6732403169,
    -0.6887635427,
    0,
    -0.3849775103,
    0.5676542638,
    0.7277093879,
    0,
    0.5754444408,
    0.8110471154,
    -0.1051963504,
    0,
    0.9141593684,
    0.3832947817,
    0.131900567,
    0,
    -0.107925319,
    0.9245493968,
    0.3654593525,
    0,
    0.377977089,
    0.3043148782,
    0.8743716458,
    0,
    -0.2142885215,
    -0.8259286236,
    0.5214617324,
    0,
    0.5802544474,
    0.4148098596,
    -0.7008834116,
    0,
    -0.1982660881,
    0.8567161266,
    -0.4761596756,
    0,
    -0.03381553704,
    0.3773180787,
    -0.9254661404,
    0,
    -0.6867922841,
    -0.6656597827,
    0.2919133642,
    0,
    0.7731742607,
    -0.2875793547,
    -0.5652430251,
    0,
    -0.09655941928,
    0.9193708367,
    -0.3813575004,
    0,
    0.2715702457,
    -0.9577909544,
    -0.09426605581,
    0,
    0.2451015704,
    -0.6917998565,
    -0.6792188003,
    0,
    0.977700782,
    -0.1753855374,
    0.1155036542,
    0,
    -0.5224739938,
    0.8521606816,
    0.02903615945,
    0,
    -0.7734880599,
    -0.5261292347,
    0.3534179531,
    0,
    -0.7134492443,
    -0.269547243,
    0.6467878011,
    0,
    0.1644037271,
    0.5105846203,
    -0.8439637196,
    0,
    0.6494635788,
    0.05585611296,
    0.7583384168,
    0,
    -0.4711970882,
    0.5017280509,
    -0.7254255765,
    0,
    -0.6335764307,
    -0.2381686273,
    -0.7361091029,
    0,
    -0.9021533097,
    -0.270947803,
    -0.3357181763,
    0,
    -0.3793711033,
    0.872258117,
    0.3086152025,
    0,
    -0.6855598966,
    -0.3250143309,
    0.6514394162,
    0,
    0.2900942212,
    -0.7799057743,
    -0.5546100667,
    0,
    -0.2098319339,
    0.85037073,
    0.4825351604,
    0,
    -0.4592603758,
    0.6598504336,
    -0.5947077538,
    0,
    0.8715945488,
    0.09616365406,
    -0.4807031248,
    0,
    -0.6776666319,
    0.7118504878,
    -0.1844907016,
    0,
    0.7044377633,
    0.312427597,
    0.637304036,
    0,
    -0.7052318886,
    -0.2401093292,
    -0.6670798253,
    0,
    0.081921007,
    -0.7207336136,
    -0.6883545647,
    0,
    -0.6993680906,
    -0.5875763221,
    -0.4069869034,
    0,
    -0.1281454481,
    0.6419895885,
    0.7559286424,
    0,
    -0.6337388239,
    -0.6785471501,
    -0.3714146849,
    0,
    0.5565051903,
    -0.2168887573,
    -0.8020356851,
    0,
    -0.5791554484,
    0.7244372011,
    -0.3738578718,
    0,
    0.1175779076,
    -0.7096451073,
    0.6946792478,
    0,
    -0.6134619607,
    0.1323631078,
    0.7785527795,
    0,
    0.6984635305,
    -0.02980516237,
    -0.715024719,
    0,
    0.8318082963,
    -0.3930171956,
    0.3919597455,
    0,
    0.1469576422,
    0.05541651717,
    -0.9875892167,
    0,
    0.708868575,
    -0.2690503865,
    0.6520101478,
    0,
    0.2726053183,
    0.67369766,
    -0.68688995,
    0,
    -0.6591295371,
    0.3035458599,
    -0.6880466294,
    0,
    0.4815131379,
    -0.7528270071,
    0.4487723203,
    0,
    0.9430009463,
    0.1675647412,
    -0.2875261255,
    0,
    0.434802957,
    0.7695304522,
    -0.4677277752,
    0,
    0.3931996188,
    0.594473625,
    0.7014236729,
    0,
    0.7254336655,
    -0.603925654,
    0.3301814672,
    0,
    0.7590235227,
    -0.6506083235,
    0.02433313207,
    0,
    -0.8552768592,
    -0.3430042733,
    0.3883935666,
    0,
    -0.6139746835,
    0.6981725247,
    0.3682257648,
    0,
    -0.7465905486,
    -0.5752009504,
    0.3342849376,
    0,
    0.5730065677,
    0.810555537,
    -0.1210916791,
    0,
    -0.9225877367,
    -0.3475211012,
    -0.167514036,
    0,
    -0.7105816789,
    -0.4719692027,
    -0.5218416899,
    0,
    -0.08564609717,
    0.3583001386,
    0.929669703,
    0,
    -0.8279697606,
    -0.2043157126,
    0.5222271202,
    0,
    0.427944023,
    0.278165994,
    0.8599346446,
    0,
    0.5399079671,
    -0.7857120652,
    -0.3019204161,
    0,
    0.5678404253,
    -0.5495413974,
    -0.6128307303,
    0,
    -0.9896071041,
    0.1365639107,
    -0.04503418428,
    0,
    -0.6154342638,
    -0.6440875597,
    0.4543037336,
    0,
    0.1074204368,
    -0.7946340692,
    0.5975094525,
    0,
    -0.3595449969,
    -0.8885529948,
    0.28495784,
    0,
    -0.2180405296,
    0.1529888965,
    0.9638738118,
    0,
    -0.7277432317,
    -0.6164050508,
    -0.3007234646,
    0,
    0.7249729114,
    -0.00669719484,
    0.6887448187,
    0,
    -0.5553659455,
    -0.5336586252,
    0.6377908264,
    0,
    0.5137558015,
    0.7976208196,
    -0.3160000073,
    0,
    -0.3794024848,
    0.9245608561,
    -0.03522751494,
    0,
    0.8229248658,
    0.2745365933,
    -0.4974176556,
    0,
    -0.5404114394,
    0.6091141441,
    0.5804613989,
    0,
    0.8036581901,
    -0.2703029469,
    0.5301601931,
    0,
    0.6044318879,
    0.6832968393,
    0.4095943388,
    0,
    0.06389988817,
    0.9658208605,
    -0.2512108074,
    0,
    0.1087113286,
    0.7402471173,
    -0.6634877936,
    0,
    -0.713427712,
    -0.6926784018,
    0.1059128479,
    0,
    0.6458897819,
    -0.5724548511,
    -0.5050958653,
    0,
    -0.6553931414,
    0.7381471625,
    0.159995615,
    0,
    0.3910961323,
    0.9188871375,
    -0.05186755998,
    0,
    -0.4879022471,
    -0.5904376907,
    0.6429111375,
    0,
    0.6014790094,
    0.7707441366,
    -0.2101820095,
    0,
    -0.5677173047,
    0.7511360995,
    0.3368851762,
    0,
    0.7858573506,
    0.226674665,
    0.5753666838,
    0,
    -0.4520345543,
    -0.604222686,
    -0.6561857263,
    0,
    0.002272116345,
    0.4132844051,
    -0.9105991643,
    0,
    -0.5815751419,
    -0.5162925989,
    0.6286591339,
    0,
    -0.03703704785,
    0.8273785755,
    0.5604221175,
    0,
    -0.5119692504,
    0.7953543429,
    -0.3244980058,
    0,
    -0.2682417366,
    -0.9572290247,
    -0.1084387619,
    0,
    -0.2322482736,
    -0.9679131102,
    -0.09594243324,
    0,
    0.3554328906,
    -0.8881505545,
    0.2913006227,
    0,
    0.7346520519,
    -0.4371373164,
    0.5188422971,
    0,
    0.9985120116,
    0.04659011161,
    -0.02833944577,
    0,
    -0.3727687496,
    -0.9082481361,
    0.1900757285,
    0,
    0.91737377,
    -0.3483642108,
    0.1925298489,
    0,
    0.2714911074,
    0.4147529736,
    -0.8684886582,
    0,
    0.5131763485,
    -0.7116334161,
    0.4798207128,
    0,
    -0.8737353606,
    0.18886992,
    -0.4482350644,
    0,
    0.8460043821,
    -0.3725217914,
    0.3814499973,
    0,
    0.8978727456,
    -0.1780209141,
    -0.4026575304,
    0,
    0.2178065647,
    -0.9698322841,
    -0.1094789531,
    0,
    -0.1518031304,
    -0.7788918132,
    -0.6085091231,
    0,
    -0.2600384876,
    -0.4755398075,
    -0.8403819825,
    0,
    0.572313509,
    -0.7474340931,
    -0.3373418503,
    0,
    -0.7174141009,
    0.1699017182,
    -0.6756111411,
    0,
    -0.684180784,
    0.02145707593,
    -0.7289967412,
    0,
    -0.2007447902,
    0.06555605789,
    -0.9774476623,
    0,
    -0.1148803697,
    -0.8044887315,
    0.5827524187,
    0,
    -0.7870349638,
    0.03447489231,
    0.6159443543,
    0,
    -0.2015596421,
    0.6859872284,
    0.6991389226,
    0,
    -0.08581082512,
    -0.10920836,
    -0.9903080513,
    0,
    0.5532693395,
    0.7325250401,
    -0.396610771,
    0,
    -0.1842489331,
    -0.9777375055,
    -0.1004076743,
    0,
    0.0775473789,
    -0.9111505856,
    0.4047110257,
    0,
    0.1399838409,
    0.7601631212,
    -0.6344734459,
    0,
    0.4484419361,
    -0.845289248,
    0.2904925424,
    0
  ];
  _PrimeX = 501125321;
  _PrimeY = 1136930381;
  _PrimeZ = 1720413743;
  /**
   * @private
   * @param {number} a
   * @param {number} b
   * @param {number} t
   * @returns {number}
   */
  static _Lerp(a, b, t) {
    return a + t * (b - a);
  }
  /**
   * @private
   * @param {number} t
   * @returns {number}
   */
  static _InterpHermite(t) {
    return t * t * (3 - 2 * t);
  }
  /**
   * @private
   * @param t
   * @returns {number}
   */
  static _InterpQuintic(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  /**
   * @private
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @param {number} d
   * @param {number} t
   * @returns {number}
   */
  static _CubicLerp(a, b, c, d, t) {
    let p = d - c - (a - b);
    return t * t * t * p + t * t * (a - b - p) + t * (c - a) + b;
  }
  /**
   * @private
   * @param {number} t
   * @returns {number}
   */
  static _PingPong(t) {
    t -= Math.trunc(t * 0.5) * 2;
    return t < 1 ? t : 2 - t;
  }
  /**
   * @private
   */
  _CalculateFractalBounding() {
    let gain = Math.abs(this._Gain);
    let amp = gain;
    let ampFractal = 1;
    for (let i = 1; i < this._Octaves; i++) {
      ampFractal += amp;
      amp *= gain;
    }
    this._FractalBounding = 1 / ampFractal;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @returns {number}
   */
  _HashR2(seed2, xPrimed, yPrimed) {
    let hash = seed2 ^ xPrimed ^ yPrimed;
    hash = Math.imul(hash, 668265261);
    return hash;
  }
  /**
   *
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @param {number} zPrimed
   * @returns {number}
   */
  _HashR3(seed2, xPrimed, yPrimed, zPrimed) {
    let hash = seed2 ^ xPrimed ^ yPrimed ^ zPrimed;
    hash = Math.imul(hash, 668265261);
    return hash;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @returns {number}
   */
  _ValCoordR2(seed2, xPrimed, yPrimed) {
    let hash = this._HashR2(seed2, xPrimed, yPrimed);
    hash = Math.imul(hash, hash);
    hash ^= hash << 19;
    return hash * (1 / 2147483648);
  }
  /**
   *
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @param {number} zPrimed
   * @returns {number}
   */
  _ValCoordR3(seed2, xPrimed, yPrimed, zPrimed) {
    let hash = this._HashR3(seed2, xPrimed, yPrimed, zPrimed);
    hash = Math.imul(hash, hash);
    hash ^= hash << 19;
    return hash * (1 / 2147483648);
  }
  /**
   *
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @param {number} xd
   * @param {number} yd
   * @returns {number}
   */
  _GradCoordR2(seed2, xPrimed, yPrimed, xd, yd) {
    let hash = this._HashR2(seed2, xPrimed, yPrimed);
    hash ^= hash >> 15;
    hash &= 127 << 1;
    let xg = this._Gradients2D[hash];
    let yg = this._Gradients2D[hash | 1];
    return xd * xg + yd * yg;
  }
  /**
   *
   * @param {number} seed
   * @param {number} xPrimed
   * @param {number} yPrimed
   * @param {number} zPrimed
   * @param {number} xd
   * @param {number} yd
   * @param {number} zd
   * @returns {number}
   */
  _GradCoordR3(seed2, xPrimed, yPrimed, zPrimed, xd, yd, zd) {
    let hash = this._HashR3(seed2, xPrimed, yPrimed, zPrimed);
    hash ^= hash >> 15;
    hash &= 63 << 2;
    let xg = this._Gradients3D[hash];
    let yg = this._Gradients3D[hash | 1];
    let zg = this._Gradients3D[hash | 2];
    return xd * xg + yd * yg + zd * zg;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _GenNoiseSingleR2(seed2, x, y) {
    switch (this._NoiseType) {
      case _FastNoiseLite.NoiseType.OpenSimplex2:
        return this._SingleOpenSimplex2R2(seed2, x, y);
      case _FastNoiseLite.NoiseType.OpenSimplex2S:
        return this._SingleOpenSimplex2SR2(seed2, x, y);
      case _FastNoiseLite.NoiseType.Cellular:
        return this._SingleCellularR2(seed2, x, y);
      case _FastNoiseLite.NoiseType.Perlin:
        return this._SinglePerlinR2(seed2, x, y);
      case _FastNoiseLite.NoiseType.ValueCubic:
        return this._SingleValueCubicR2(seed2, x, y);
      case _FastNoiseLite.NoiseType.Value:
        return this._SingleValueR2(seed2, x, y);
      default:
        return 0;
    }
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _GenNoiseSingleR3(seed2, x, y, z) {
    switch (this._NoiseType) {
      case _FastNoiseLite.NoiseType.OpenSimplex2:
        return this._SingleOpenSimplex2R3(seed2, x, y, z);
      case _FastNoiseLite.NoiseType.OpenSimplex2S:
        return this._SingleOpenSimplex2SR3(seed2, x, y, z);
      case _FastNoiseLite.NoiseType.Cellular:
        return this._SingleCellularR3(seed2, x, y, z);
      case _FastNoiseLite.NoiseType.Perlin:
        return this._SinglePerlinR3(seed2, x, y, z);
      case _FastNoiseLite.NoiseType.ValueCubic:
        return this._SingleValueCubicR3(seed2, x, y, z);
      case _FastNoiseLite.NoiseType.Value:
        return this._SingleValueR3(seed2, x, y, z);
      default:
        return 0;
    }
  }
  /**
   * @private
   */
  _UpdateTransformType3D() {
    switch (this._RotationType3D) {
      case _FastNoiseLite.RotationType3D.ImproveXYPlanes:
        this._TransformType3D = _FastNoiseLite.TransformType3D.ImproveXYPlanes;
        break;
      case _FastNoiseLite.RotationType3D.ImproveXZPlanes:
        this._TransformType3D = _FastNoiseLite.TransformType3D.ImproveXZPlanes;
        break;
      default:
        switch (this._NoiseType) {
          case _FastNoiseLite.NoiseType.OpenSimplex2:
          case _FastNoiseLite.NoiseType.OpenSimplex2S:
            this._TransformType3D = _FastNoiseLite.TransformType3D.DefaultOpenSimplex2;
            break;
          default:
            this._TransformType3D = _FastNoiseLite.TransformType3D.None;
            break;
        }
        break;
    }
  }
  /**
   * @private
   */
  _UpdateWarpTransformType3D() {
    switch (this._RotationType3D) {
      case _FastNoiseLite.RotationType3D.ImproveXYPlanes:
        this._WarpTransformType3D = _FastNoiseLite.TransformType3D.ImproveXYPlanes;
        break;
      case _FastNoiseLite.RotationType3D.ImproveXZPlanes:
        this._WarpTransformType3D = _FastNoiseLite.TransformType3D.ImproveXZPlanes;
        break;
      default:
        switch (this._DomainWarpType) {
          case _FastNoiseLite.DomainWarpType.OpenSimplex2:
          case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
            this._WarpTransformType3D = _FastNoiseLite.TransformType3D.DefaultOpenSimplex2;
            break;
          default:
            this._WarpTransformType3D = _FastNoiseLite.TransformType3D.None;
            break;
        }
        break;
    }
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _GenFractalFBmR2(x, y) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = this._GenNoiseSingleR2(seed2++, x, y);
      sum += noise * amp;
      amp *= _FastNoiseLite._Lerp(1, Math.min(noise + 1, 2) * 0.5, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _GenFractalFBmR3(x, y, z) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = this._GenNoiseSingleR3(seed2++, x, y, z);
      sum += noise * amp;
      amp *= _FastNoiseLite._Lerp(1, (noise + 1) * 0.5, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      z *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _GenFractalRidgedR2(x, y) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = Math.abs(this._GenNoiseSingleR2(seed2++, x, y));
      sum += (noise * -2 + 1) * amp;
      amp *= _FastNoiseLite._Lerp(1, 1 - noise, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _GenFractalRidgedR3(x, y, z) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = Math.abs(this._GenNoiseSingleR3(seed2++, x, y, z));
      sum += (noise * -2 + 1) * amp;
      amp *= _FastNoiseLite._Lerp(1, 1 - noise, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      z *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _GenFractalPingPongR2(x, y) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = _FastNoiseLite._PingPong(
        (this._GenNoiseSingleR2(seed2++, x, y) + 1) * this._PingPongStrength
      );
      sum += (noise - 0.5) * 2 * amp;
      amp *= _FastNoiseLite._Lerp(1, noise, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _GenFractalPingPongR3(x, y, z) {
    let seed2 = this._Seed;
    let sum = 0;
    let amp = this._FractalBounding;
    for (let i = 0; i < this._Octaves; i++) {
      let noise = _FastNoiseLite._PingPong(
        (this._GenNoiseSingleR3(seed2++, x, y, z) + 1) * this._PingPongStrength
      );
      sum += (noise - 0.5) * 2 * amp;
      amp *= _FastNoiseLite._Lerp(1, noise, this._WeightedStrength);
      x *= this._Lacunarity;
      y *= this._Lacunarity;
      z *= this._Lacunarity;
      amp *= this._Gain;
    }
    return sum;
  }
  /**
   *
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SingleOpenSimplex2R2(seed2, x, y) {
    const SQRT3 = 1.7320508075688772;
    const G2 = (3 - SQRT3) / 6;
    let i = Math.floor(x);
    let j = Math.floor(y);
    let xi = x - i;
    let yi = y - j;
    let t = (xi + yi) * G2;
    let x0 = xi - t;
    let y0 = yi - t;
    i = Math.imul(i, this._PrimeX);
    j = Math.imul(j, this._PrimeY);
    let n0, n1, n2;
    let a = 0.5 - x0 * x0 - y0 * y0;
    if (a <= 0) {
      n0 = 0;
    } else {
      n0 = a * a * (a * a) * this._GradCoordR2(seed2, i, j, x0, y0);
    }
    let c = 2 * (1 - 2 * G2) * (1 / G2 - 2) * t + (-2 * (1 - 2 * G2) * (1 - 2 * G2) + a);
    if (c <= 0) {
      n2 = 0;
    } else {
      let x2 = x0 + (2 * G2 - 1);
      let y2 = y0 + (2 * G2 - 1);
      n2 = c * c * (c * c) * this._GradCoordR2(seed2, i + this._PrimeX, j + this._PrimeY, x2, y2);
    }
    if (y0 > x0) {
      let x1 = x0 + G2;
      let y1 = y0 + (G2 - 1);
      let b = 0.5 - x1 * x1 - y1 * y1;
      if (b <= 0) {
        n1 = 0;
      } else {
        n1 = b * b * (b * b) * this._GradCoordR2(seed2, i, j + this._PrimeY, x1, y1);
      }
    } else {
      let x1 = x0 + (G2 - 1);
      let y1 = y0 + G2;
      let b = 0.5 - x1 * x1 - y1 * y1;
      if (b <= 0) {
        n1 = 0;
      } else {
        n1 = b * b * (b * b) * this._GradCoordR2(seed2, i + this._PrimeX, j, x1, y1);
      }
    }
    return (n0 + n1 + n2) * 99.83685446303647;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SingleOpenSimplex2R3(seed2, x, y, z) {
    let i = Math.round(x);
    let j = Math.round(y);
    let k = Math.round(z);
    let x0 = x - i;
    let y0 = y - j;
    let z0 = z - k;
    let yNSign = Math.trunc(-1 - y0 | 1);
    let xNSign = Math.trunc(-1 - x0 | 1);
    let zNSign = Math.trunc(-1 - z0 | 1);
    let ax0 = xNSign * -x0;
    let ay0 = yNSign * -y0;
    let az0 = zNSign * -z0;
    i = Math.imul(i, this._PrimeX);
    j = Math.imul(j, this._PrimeY);
    k = Math.imul(k, this._PrimeZ);
    let value = 0;
    let a = 0.6 - x0 * x0 - (y0 * y0 + z0 * z0);
    for (let l = 0; ; l++) {
      if (a > 0) {
        value += a * a * (a * a) * this._GradCoordR3(seed2, i, j, k, x0, y0, z0);
      }
      if (ax0 >= ay0 && ax0 >= az0) {
        let b = a + ax0 + ax0;
        if (b > 1) {
          b -= 1;
          value += b * b * (b * b) * this._GradCoordR3(
            seed2,
            i - xNSign * this._PrimeX,
            j,
            k,
            x0 + xNSign,
            y0,
            z0
          );
        }
      } else if (ay0 > ax0 && ay0 >= az0) {
        let b = a + ay0 + ay0;
        if (b > 1) {
          b -= 1;
          value += b * b * (b * b) * this._GradCoordR3(
            seed2,
            i,
            j - yNSign * this._PrimeY,
            k,
            x0,
            y0 + yNSign,
            z0
          );
        }
      } else {
        let b = a + az0 + az0;
        if (b > 1) {
          b -= 1;
          value += b * b * (b * b) * this._GradCoordR3(
            seed2,
            i,
            j,
            k - zNSign * this._PrimeZ,
            x0,
            y0,
            z0 + zNSign
          );
        }
      }
      if (l === 1) {
        break;
      }
      ax0 = 0.5 - ax0;
      ay0 = 0.5 - ay0;
      az0 = 0.5 - az0;
      x0 = xNSign * ax0;
      y0 = yNSign * ay0;
      z0 = zNSign * az0;
      a += 0.75 - ax0 - (ay0 + az0);
      i += xNSign >> 1 & this._PrimeX;
      j += yNSign >> 1 & this._PrimeY;
      k += zNSign >> 1 & this._PrimeZ;
      xNSign = -xNSign;
      yNSign = -yNSign;
      zNSign = -zNSign;
      seed2 = ~seed2;
    }
    return value * 32.69428253173828;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SingleOpenSimplex2SR2(seed2, x, y) {
    const SQRT3 = 1.7320508075688772;
    const G2 = (3 - SQRT3) / 6;
    let i = Math.floor(x);
    let j = Math.floor(y);
    let xi = x - i;
    let yi = y - j;
    i = Math.imul(i, this._PrimeX);
    j = Math.imul(j, this._PrimeY);
    let i1 = i + this._PrimeX;
    let j1 = j + this._PrimeY;
    let t = (xi + yi) * G2;
    let x0 = xi - t;
    let y0 = yi - t;
    let a0 = 2 / 3 - x0 * x0 - y0 * y0;
    let value = a0 * a0 * (a0 * a0) * this._GradCoordR2(seed2, i, j, x0, y0);
    let a1 = 2 * (1 - 2 * G2) * (1 / G2 - 2) * t + (-2 * (1 - 2 * G2) * (1 - 2 * G2) + a0);
    let x1 = x0 - (1 - 2 * G2);
    let y1 = y0 - (1 - 2 * G2);
    value += a1 * a1 * (a1 * a1) * this._GradCoordR2(seed2, i1, j1, x1, y1);
    let xmyi = xi - yi;
    if (t > G2) {
      if (xi + xmyi > 1) {
        let x2 = x0 + (3 * G2 - 2);
        let y2 = y0 + (3 * G2 - 1);
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i + (this._PrimeX << 1), j + this._PrimeY, x2, y2);
        }
      } else {
        let x2 = x0 + G2;
        let y2 = y0 + (G2 - 1);
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i, j + this._PrimeY, x2, y2);
        }
      }
      if (yi - xmyi > 1) {
        let x3 = x0 + (3 * G2 - 1);
        let y3 = y0 + (3 * G2 - 2);
        let a3 = 2 / 3 - x3 * x3 - y3 * y3;
        if (a3 > 0) {
          value += a3 * a3 * (a3 * a3) * this._GradCoordR2(seed2, i + this._PrimeX, j + (this._PrimeY << 1), x3, y3);
        }
      } else {
        let x3 = x0 + (G2 - 1);
        let y3 = y0 + G2;
        let a3 = 2 / 3 - x3 * x3 - y3 * y3;
        if (a3 > 0) {
          value += a3 * a3 * (a3 * a3) * this._GradCoordR2(seed2, i + this._PrimeX, j, x3, y3);
        }
      }
    } else {
      if (xi + xmyi < 0) {
        let x2 = x0 + (1 - G2);
        let y2 = y0 - G2;
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i - this._PrimeX, j, x2, y2);
        }
      } else {
        let x2 = x0 + (G2 - 1);
        let y2 = y0 + G2;
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i + this._PrimeX, j, x2, y2);
        }
      }
      if (yi < xmyi) {
        let x2 = x0 - G2;
        let y2 = y0 - (G2 - 1);
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i, j - this._PrimeY, x2, y2);
        }
      } else {
        let x2 = x0 + G2;
        let y2 = y0 + (G2 - 1);
        let a2 = 2 / 3 - x2 * x2 - y2 * y2;
        if (a2 > 0) {
          value += a2 * a2 * (a2 * a2) * this._GradCoordR2(seed2, i, j + this._PrimeY, x2, y2);
        }
      }
    }
    return value * 18.24196194486065;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SingleOpenSimplex2SR3(seed2, x, y, z) {
    let i = Math.floor(x);
    let j = Math.floor(y);
    let k = Math.floor(z);
    let xi = x - i;
    let yi = y - j;
    let zi = z - k;
    i = Math.imul(i, this._PrimeX);
    j = Math.imul(j, this._PrimeY);
    k = Math.imul(k, this._PrimeZ);
    let seed22 = seed2 + 1293373;
    let xNMask = Math.trunc(-0.5 - xi);
    let yNMask = Math.trunc(-0.5 - yi);
    let zNMask = Math.trunc(-0.5 - zi);
    let x0 = xi + xNMask;
    let y0 = yi + yNMask;
    let z0 = zi + zNMask;
    let a0 = 0.75 - x0 * x0 - y0 * y0 - z0 * z0;
    let value = a0 * a0 * (a0 * a0) * this._GradCoordR3(
      seed2,
      i + (xNMask & this._PrimeX),
      j + (yNMask & this._PrimeY),
      k + (zNMask & this._PrimeZ),
      x0,
      y0,
      z0
    );
    let x1 = xi - 0.5;
    let y1 = yi - 0.5;
    let z1 = zi - 0.5;
    let a1 = 0.75 - x1 * x1 - y1 * y1 - z1 * z1;
    value += a1 * a1 * (a1 * a1) * this._GradCoordR3(seed22, i + this._PrimeX, j + this._PrimeY, k + this._PrimeZ, x1, y1, z1);
    let xAFlipMask0 = ((xNMask | 1) << 1) * x1;
    let yAFlipMask0 = ((yNMask | 1) << 1) * y1;
    let zAFlipMask0 = ((zNMask | 1) << 1) * z1;
    let xAFlipMask1 = (-2 - (xNMask << 2)) * x1 - 1;
    let yAFlipMask1 = (-2 - (yNMask << 2)) * y1 - 1;
    let zAFlipMask1 = (-2 - (zNMask << 2)) * z1 - 1;
    let skip5 = false;
    let a2 = xAFlipMask0 + a0;
    if (a2 > 0) {
      let x2 = x0 - (xNMask | 1);
      value += a2 * a2 * (a2 * a2) * this._GradCoordR3(
        seed2,
        i + (~xNMask & this._PrimeX),
        j + (yNMask & this._PrimeY),
        k + (zNMask & this._PrimeZ),
        x2,
        y0,
        z0
      );
    } else {
      let a3 = yAFlipMask0 + zAFlipMask0 + a0;
      if (a3 > 0) {
        let x3 = x0;
        let y3 = y0 - (yNMask | 1);
        let z3 = z0 - (zNMask | 1);
        value += a3 * a3 * (a3 * a3) * this._GradCoordR3(
          seed2,
          i + (xNMask & this._PrimeX),
          j + (~yNMask & this._PrimeY),
          k + (~zNMask & this._PrimeZ),
          x3,
          y3,
          z3
        );
      }
      let a4 = xAFlipMask1 + a1;
      if (a4 > 0) {
        let x4 = (xNMask | 1) + x1;
        value += a4 * a4 * (a4 * a4) * this._GradCoordR3(
          seed22,
          i + (xNMask & this._PrimeX * 2),
          j + this._PrimeY,
          k + this._PrimeZ,
          x4,
          y1,
          z1
        );
        skip5 = true;
      }
    }
    let skip9 = false;
    let a6 = yAFlipMask0 + a0;
    if (a6 > 0) {
      let x6 = x0;
      let y6 = y0 - (yNMask | 1);
      value += a6 * a6 * (a6 * a6) * this._GradCoordR3(
        seed2,
        i + (xNMask & this._PrimeX),
        j + (~yNMask & this._PrimeY),
        k + (zNMask & this._PrimeZ),
        x6,
        y6,
        z0
      );
    } else {
      let a7 = xAFlipMask0 + zAFlipMask0 + a0;
      if (a7 > 0) {
        let x7 = x0 - (xNMask | 1);
        let y7 = y0;
        let z7 = z0 - (zNMask | 1);
        value += a7 * a7 * (a7 * a7) * this._GradCoordR3(
          seed2,
          i + (~xNMask & this._PrimeX),
          j + (yNMask & this._PrimeY),
          k + (~zNMask & this._PrimeZ),
          x7,
          y7,
          z7
        );
      }
      let a8 = yAFlipMask1 + a1;
      if (a8 > 0) {
        let x8 = x1;
        let y8 = (yNMask | 1) + y1;
        value += a8 * a8 * (a8 * a8) * this._GradCoordR3(
          seed22,
          i + this._PrimeX,
          j + (yNMask & this._PrimeY << 1),
          k + this._PrimeZ,
          x8,
          y8,
          z1
        );
        skip9 = true;
      }
    }
    let skipD = false;
    let aA = zAFlipMask0 + a0;
    if (aA > 0) {
      let xA = x0;
      let yA = y0;
      let zA = z0 - (zNMask | 1);
      value += aA * aA * (aA * aA) * this._GradCoordR3(
        seed2,
        i + (xNMask & this._PrimeX),
        j + (yNMask & this._PrimeY),
        k + (~zNMask & this._PrimeZ),
        xA,
        yA,
        zA
      );
    } else {
      let aB = xAFlipMask0 + yAFlipMask0 + a0;
      if (aB > 0) {
        let xB = x0 - (xNMask | 1);
        let yB = y0 - (yNMask | 1);
        value += aB * aB * (aB * aB) * this._GradCoordR3(
          seed2,
          i + (~xNMask & this._PrimeX),
          j + (~yNMask & this._PrimeY),
          k + (zNMask & this._PrimeZ),
          xB,
          yB,
          z0
        );
      }
      let aC = zAFlipMask1 + a1;
      if (aC > 0) {
        let xC = x1;
        let yC = y1;
        let zC = (zNMask | 1) + z1;
        value += aC * aC * (aC * aC) * this._GradCoordR3(
          seed22,
          i + this._PrimeX,
          j + this._PrimeY,
          k + (zNMask & this._PrimeZ << 1),
          xC,
          yC,
          zC
        );
        skipD = true;
      }
    }
    if (!skip5) {
      let a5 = yAFlipMask1 + zAFlipMask1 + a1;
      if (a5 > 0) {
        let x5 = x1;
        let y5 = (yNMask | 1) + y1;
        let z5 = (zNMask | 1) + z1;
        value += a5 * a5 * (a5 * a5) * this._GradCoordR3(
          seed22,
          i + this._PrimeX,
          j + (yNMask & this._PrimeY << 1),
          k + (zNMask & this._PrimeZ << 1),
          x5,
          y5,
          z5
        );
      }
    }
    if (!skip9) {
      let a9 = xAFlipMask1 + zAFlipMask1 + a1;
      if (a9 > 0) {
        let x9 = (xNMask | 1) + x1;
        let y9 = y1;
        let z9 = (zNMask | 1) + z1;
        value += a9 * a9 * (a9 * a9) * this._GradCoordR3(
          seed22,
          i + (xNMask & this._PrimeX * 2),
          j + this._PrimeY,
          k + (zNMask & this._PrimeZ << 1),
          x9,
          y9,
          z9
        );
      }
    }
    if (!skipD) {
      let aD = xAFlipMask1 + yAFlipMask1 + a1;
      if (aD > 0) {
        let xD = (xNMask | 1) + x1;
        let yD = (yNMask | 1) + y1;
        value += aD * aD * (aD * aD) * this._GradCoordR3(
          seed22,
          i + (xNMask & this._PrimeX << 1),
          j + (yNMask & this._PrimeY << 1),
          k + this._PrimeZ,
          xD,
          yD,
          z1
        );
      }
    }
    return value * 9.046026385208288;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SingleCellularR2(seed2, x, y) {
    let xr = Math.round(x);
    let yr = Math.round(y);
    let distance0 = Number.MAX_VALUE;
    let distance1 = Number.MAX_VALUE;
    let closestHash = 0;
    let cellularJitter = 0.43701595 * this._CellularJitterModifier;
    let xPrimed = (xr - 1) * this._PrimeX;
    let yPrimedBase = (yr - 1) * this._PrimeY;
    switch (this._CellularDistanceFunction) {
      default:
      case _FastNoiseLite.CellularDistanceFunction.Euclidean:
      case _FastNoiseLite.CellularDistanceFunction.EuclideanSq:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let hash = this._HashR2(seed2, xPrimed, yPrimed);
            let idx = hash & 255 << 1;
            let vecX = xi - x + this._RandVecs2D[idx] * cellularJitter;
            let vecY = yi - y + this._RandVecs2D[idx | 1] * cellularJitter;
            let newDistance = vecX * vecX + vecY * vecY;
            distance1 = Math.max(Math.min(distance1, newDistance), distance0);
            if (newDistance < distance0) {
              distance0 = newDistance;
              closestHash = hash;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
      case _FastNoiseLite.CellularDistanceFunction.Manhattan:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let hash = this._HashR2(seed2, xPrimed, yPrimed);
            let idx = hash & 255 << 1;
            let vecX = xi - x + this._RandVecs2D[idx] * cellularJitter;
            let vecY = yi - y + this._RandVecs2D[idx | 1] * cellularJitter;
            let newDistance = Math.abs(vecX) + Math.abs(vecY);
            distance1 = Math.max(Math.min(distance1, newDistance), distance0);
            if (newDistance < distance0) {
              distance0 = newDistance;
              closestHash = hash;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
      case _FastNoiseLite.CellularDistanceFunction.Hybrid:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let hash = this._HashR2(seed2, xPrimed, yPrimed);
            let idx = hash & 255 << 1;
            let vecX = xi - x + this._RandVecs2D[idx] * cellularJitter;
            let vecY = yi - y + this._RandVecs2D[idx | 1] * cellularJitter;
            let newDistance = Math.abs(vecX) + Math.abs(vecY) + (vecX * vecX + vecY * vecY);
            distance1 = Math.max(Math.min(distance1, newDistance), distance0);
            if (newDistance < distance0) {
              distance0 = newDistance;
              closestHash = hash;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
    }
    if (this._CellularDistanceFunction === _FastNoiseLite.CellularDistanceFunction.Euclidean && this._CellularReturnType !== _FastNoiseLite.CellularReturnType.CellValue) {
      distance0 = Math.sqrt(distance0);
      if (this._CellularReturnType !== _FastNoiseLite.CellularReturnType.CellValue) {
        distance1 = Math.sqrt(distance1);
      }
    }
    switch (this._CellularReturnType) {
      case _FastNoiseLite.CellularReturnType.CellValue:
        return closestHash * (1 / 2147483648);
      case _FastNoiseLite.CellularReturnType.Distance:
        return distance0 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2:
        return distance1 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Add:
        return (distance1 + distance0) * 0.5 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Sub:
        return distance1 - distance0 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Mul:
        return distance1 * distance0 * 0.5 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Div:
        return distance0 / distance1 - 1;
      default:
        return 0;
    }
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SingleCellularR3(seed2, x, y, z) {
    let xr = Math.round(x);
    let yr = Math.round(y);
    let zr = Math.round(z);
    let distance0 = Number.MAX_VALUE;
    let distance1 = Number.MAX_VALUE;
    let closestHash = 0;
    let cellularJitter = 0.39614353 * this._CellularJitterModifier;
    let xPrimed = (xr - 1) * this._PrimeX;
    let yPrimedBase = (yr - 1) * this._PrimeY;
    let zPrimedBase = (zr - 1) * this._PrimeZ;
    switch (this._CellularDistanceFunction) {
      case _FastNoiseLite.CellularDistanceFunction.Euclidean:
      case _FastNoiseLite.CellularDistanceFunction.EuclideanSq:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let zPrimed = zPrimedBase;
            for (let zi = zr - 1; zi <= zr + 1; zi++) {
              let hash = this._HashR3(seed2, xPrimed, yPrimed, zPrimed);
              let idx = hash & 255 << 2;
              let vecX = xi - x + this._RandVecs3D[idx] * cellularJitter;
              let vecY = yi - y + this._RandVecs3D[idx | 1] * cellularJitter;
              let vecZ = zi - z + this._RandVecs3D[idx | 2] * cellularJitter;
              let newDistance = vecX * vecX + vecY * vecY + vecZ * vecZ;
              distance1 = Math.max(Math.min(distance1, newDistance), distance0);
              if (newDistance < distance0) {
                distance0 = newDistance;
                closestHash = hash;
              }
              zPrimed += this._PrimeZ;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
      case _FastNoiseLite.CellularDistanceFunction.Manhattan:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let zPrimed = zPrimedBase;
            for (let zi = zr - 1; zi <= zr + 1; zi++) {
              let hash = this._HashR3(seed2, xPrimed, yPrimed, zPrimed);
              let idx = hash & 255 << 2;
              let vecX = xi - x + this._RandVecs3D[idx] * cellularJitter;
              let vecY = yi - y + this._RandVecs3D[idx | 1] * cellularJitter;
              let vecZ = zi - z + this._RandVecs3D[idx | 2] * cellularJitter;
              let newDistance = Math.abs(vecX) + Math.abs(vecY) + Math.abs(vecZ);
              distance1 = Math.max(Math.min(distance1, newDistance), distance0);
              if (newDistance < distance0) {
                distance0 = newDistance;
                closestHash = hash;
              }
              zPrimed += this._PrimeZ;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
      case _FastNoiseLite.CellularDistanceFunction.Hybrid:
        for (let xi = xr - 1; xi <= xr + 1; xi++) {
          let yPrimed = yPrimedBase;
          for (let yi = yr - 1; yi <= yr + 1; yi++) {
            let zPrimed = zPrimedBase;
            for (let zi = zr - 1; zi <= zr + 1; zi++) {
              let hash = this._HashR3(seed2, xPrimed, yPrimed, zPrimed);
              let idx = hash & 255 << 2;
              let vecX = xi - x + this._RandVecs3D[idx] * cellularJitter;
              let vecY = yi - y + this._RandVecs3D[idx | 1] * cellularJitter;
              let vecZ = zi - z + this._RandVecs3D[idx | 2] * cellularJitter;
              let newDistance = Math.abs(vecX) + Math.abs(vecY) + Math.abs(vecZ) + (vecX * vecX + vecY * vecY + vecZ * vecZ);
              distance1 = Math.max(Math.min(distance1, newDistance), distance0);
              if (newDistance < distance0) {
                distance0 = newDistance;
                closestHash = hash;
              }
              zPrimed += this._PrimeZ;
            }
            yPrimed += this._PrimeY;
          }
          xPrimed += this._PrimeX;
        }
        break;
      default:
        break;
    }
    if (this._CellularDistanceFunction === _FastNoiseLite.CellularDistanceFunction.Euclidean && this._CellularReturnType !== _FastNoiseLite.CellularReturnType.CellValue) {
      distance0 = Math.sqrt(distance0);
      if (this._CellularReturnType !== _FastNoiseLite.CellularReturnType.CellValue) {
        distance1 = Math.sqrt(distance1);
      }
    }
    switch (this._CellularReturnType) {
      case _FastNoiseLite.CellularReturnType.CellValue:
        return closestHash * (1 / 2147483648);
      case _FastNoiseLite.CellularReturnType.Distance:
        return distance0 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2:
        return distance1 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Add:
        return (distance1 + distance0) * 0.5 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Sub:
        return distance1 - distance0 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Mul:
        return distance1 * distance0 * 0.5 - 1;
      case _FastNoiseLite.CellularReturnType.Distance2Div:
        return distance0 / distance1 - 1;
      default:
        return 0;
    }
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SinglePerlinR2(seed2, x, y) {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    let xd0 = x - x0;
    let yd0 = y - y0;
    let xd1 = xd0 - 1;
    let yd1 = yd0 - 1;
    let xs = _FastNoiseLite._InterpQuintic(xd0);
    let ys = _FastNoiseLite._InterpQuintic(yd0);
    x0 = Math.imul(x0, this._PrimeX);
    y0 = Math.imul(y0, this._PrimeY);
    let x1 = x0 + this._PrimeX;
    let y1 = y0 + this._PrimeY;
    let xf0 = _FastNoiseLite._Lerp(
      this._GradCoordR2(seed2, x0, y0, xd0, yd0),
      this._GradCoordR2(seed2, x1, y0, xd1, yd0),
      xs
    );
    let xf1 = _FastNoiseLite._Lerp(
      this._GradCoordR2(seed2, x0, y1, xd0, yd1),
      this._GradCoordR2(seed2, x1, y1, xd1, yd1),
      xs
    );
    return _FastNoiseLite._Lerp(xf0, xf1, ys) * 1.4247691104677813;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SinglePerlinR3(seed2, x, y, z) {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    let z0 = Math.floor(z);
    let xd0 = x - x0;
    let yd0 = y - y0;
    let zd0 = z - z0;
    let xd1 = xd0 - 1;
    let yd1 = yd0 - 1;
    let zd1 = zd0 - 1;
    let xs = _FastNoiseLite._InterpQuintic(xd0);
    let ys = _FastNoiseLite._InterpQuintic(yd0);
    let zs = _FastNoiseLite._InterpQuintic(zd0);
    x0 = Math.imul(x0, this._PrimeX);
    y0 = Math.imul(y0, this._PrimeY);
    z0 = Math.imul(z0, this._PrimeZ);
    let x1 = x0 + this._PrimeX;
    let y1 = y0 + this._PrimeY;
    let z1 = z0 + this._PrimeZ;
    let xf00 = _FastNoiseLite._Lerp(
      this._GradCoordR3(seed2, x0, y0, z0, xd0, yd0, zd0),
      this._GradCoordR3(seed2, x1, y0, z0, xd1, yd0, zd0),
      xs
    );
    let xf10 = _FastNoiseLite._Lerp(
      this._GradCoordR3(seed2, x0, y1, z0, xd0, yd1, zd0),
      this._GradCoordR3(seed2, x1, y1, z0, xd1, yd1, zd0),
      xs
    );
    let xf01 = _FastNoiseLite._Lerp(
      this._GradCoordR3(seed2, x0, y0, z1, xd0, yd0, zd1),
      this._GradCoordR3(seed2, x1, y0, z1, xd1, yd0, zd1),
      xs
    );
    let xf11 = _FastNoiseLite._Lerp(
      this._GradCoordR3(seed2, x0, y1, z1, xd0, yd1, zd1),
      this._GradCoordR3(seed2, x1, y1, z1, xd1, yd1, zd1),
      xs
    );
    let yf0 = _FastNoiseLite._Lerp(xf00, xf10, ys);
    let yf1 = _FastNoiseLite._Lerp(xf01, xf11, ys);
    return _FastNoiseLite._Lerp(yf0, yf1, zs) * 0.9649214148521423;
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SingleValueCubicR2(seed2, x, y) {
    let x1 = Math.floor(x);
    let y1 = Math.floor(y);
    let xs = x - x1;
    let ys = y - y1;
    x1 = Math.imul(x1, this._PrimeX);
    y1 = Math.imul(y1, this._PrimeY);
    let x0 = x1 - this._PrimeX;
    let y0 = y1 - this._PrimeY;
    let x2 = x1 + this._PrimeX;
    let y2 = y1 + this._PrimeY;
    let x3 = x1 + (this._PrimeX << 1);
    let y3 = y1 + (this._PrimeY << 1);
    return _FastNoiseLite._CubicLerp(
      _FastNoiseLite._CubicLerp(
        this._ValCoordR2(seed2, x0, y0),
        this._ValCoordR2(seed2, x1, y0),
        this._ValCoordR2(seed2, x2, y0),
        this._ValCoordR2(seed2, x3, y0),
        xs
      ),
      _FastNoiseLite._CubicLerp(
        this._ValCoordR2(seed2, x0, y1),
        this._ValCoordR2(seed2, x1, y1),
        this._ValCoordR2(seed2, x2, y1),
        this._ValCoordR2(seed2, x3, y1),
        xs
      ),
      _FastNoiseLite._CubicLerp(
        this._ValCoordR2(seed2, x0, y2),
        this._ValCoordR2(seed2, x1, y2),
        this._ValCoordR2(seed2, x2, y2),
        this._ValCoordR2(seed2, x3, y2),
        xs
      ),
      _FastNoiseLite._CubicLerp(
        this._ValCoordR2(seed2, x0, y3),
        this._ValCoordR2(seed2, x1, y3),
        this._ValCoordR2(seed2, x2, y3),
        this._ValCoordR2(seed2, x3, y3),
        xs
      ),
      ys
    ) * (1 / (1.5 * 1.5));
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SingleValueCubicR3(seed2, x, y, z) {
    let x1 = Math.floor(x);
    let y1 = Math.floor(y);
    let z1 = Math.floor(z);
    let xs = x - x1;
    let ys = y - y1;
    let zs = z - z1;
    x1 = Math.imul(x1, this._PrimeX);
    y1 = Math.imul(y1, this._PrimeY);
    z1 = Math.imul(z1, this._PrimeZ);
    let x0 = x1 - this._PrimeX;
    let y0 = y1 - this._PrimeY;
    let z0 = z1 - this._PrimeZ;
    let x2 = x1 + this._PrimeX;
    let y2 = y1 + this._PrimeY;
    let z2 = z1 + this._PrimeZ;
    let x3 = x1 + (this._PrimeX << 1);
    let y3 = y1 + (this._PrimeY << 1);
    let z3 = z1 + (this._PrimeZ << 1);
    return _FastNoiseLite._CubicLerp(
      _FastNoiseLite._CubicLerp(
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y0, z0),
          this._ValCoordR3(seed2, x1, y0, z0),
          this._ValCoordR3(seed2, x2, y0, z0),
          this._ValCoordR3(seed2, x3, y0, z0),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y1, z0),
          this._ValCoordR3(seed2, x1, y1, z0),
          this._ValCoordR3(seed2, x2, y1, z0),
          this._ValCoordR3(seed2, x3, y1, z0),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y2, z0),
          this._ValCoordR3(seed2, x1, y2, z0),
          this._ValCoordR3(seed2, x2, y2, z0),
          this._ValCoordR3(seed2, x3, y2, z0),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y3, z0),
          this._ValCoordR3(seed2, x1, y3, z0),
          this._ValCoordR3(seed2, x2, y3, z0),
          this._ValCoordR3(seed2, x3, y3, z0),
          xs
        ),
        ys
      ),
      _FastNoiseLite._CubicLerp(
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y0, z1),
          this._ValCoordR3(seed2, x1, y0, z1),
          this._ValCoordR3(seed2, x2, y0, z1),
          this._ValCoordR3(seed2, x3, y0, z1),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y1, z1),
          this._ValCoordR3(seed2, x1, y1, z1),
          this._ValCoordR3(seed2, x2, y1, z1),
          this._ValCoordR3(seed2, x3, y1, z1),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y2, z1),
          this._ValCoordR3(seed2, x1, y2, z1),
          this._ValCoordR3(seed2, x2, y2, z1),
          this._ValCoordR3(seed2, x3, y2, z1),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y3, z1),
          this._ValCoordR3(seed2, x1, y3, z1),
          this._ValCoordR3(seed2, x2, y3, z1),
          this._ValCoordR3(seed2, x3, y3, z1),
          xs
        ),
        ys
      ),
      _FastNoiseLite._CubicLerp(
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y0, z2),
          this._ValCoordR3(seed2, x1, y0, z2),
          this._ValCoordR3(seed2, x2, y0, z2),
          this._ValCoordR3(seed2, x3, y0, z2),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y1, z2),
          this._ValCoordR3(seed2, x1, y1, z2),
          this._ValCoordR3(seed2, x2, y1, z2),
          this._ValCoordR3(seed2, x3, y1, z2),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y2, z2),
          this._ValCoordR3(seed2, x1, y2, z2),
          this._ValCoordR3(seed2, x2, y2, z2),
          this._ValCoordR3(seed2, x3, y2, z2),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y3, z2),
          this._ValCoordR3(seed2, x1, y3, z2),
          this._ValCoordR3(seed2, x2, y3, z2),
          this._ValCoordR3(seed2, x3, y3, z2),
          xs
        ),
        ys
      ),
      _FastNoiseLite._CubicLerp(
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y0, z3),
          this._ValCoordR3(seed2, x1, y0, z3),
          this._ValCoordR3(seed2, x2, y0, z3),
          this._ValCoordR3(seed2, x3, y0, z3),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y1, z3),
          this._ValCoordR3(seed2, x1, y1, z3),
          this._ValCoordR3(seed2, x2, y1, z3),
          this._ValCoordR3(seed2, x3, y1, z3),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y2, z3),
          this._ValCoordR3(seed2, x1, y2, z3),
          this._ValCoordR3(seed2, x2, y2, z3),
          this._ValCoordR3(seed2, x3, y2, z3),
          xs
        ),
        _FastNoiseLite._CubicLerp(
          this._ValCoordR3(seed2, x0, y3, z3),
          this._ValCoordR3(seed2, x1, y3, z3),
          this._ValCoordR3(seed2, x2, y3, z3),
          this._ValCoordR3(seed2, x3, y3, z3),
          xs
        ),
        ys
      ),
      zs
    ) * (1 / (1.5 * 1.5 * 1.5));
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  _SingleValueR2(seed2, x, y) {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    let xs = _FastNoiseLite._InterpHermite(x - x0);
    let ys = _FastNoiseLite._InterpHermite(y - y0);
    x0 = Math.imul(x0, this._PrimeX);
    y0 = Math.imul(y0, this._PrimeY);
    let x1 = x0 + this._PrimeX;
    let y1 = y0 + this._PrimeY;
    let xf0 = _FastNoiseLite._Lerp(this._ValCoordR2(seed2, x0, y0), this._ValCoordR2(seed2, x1, y0), xs);
    let xf1 = _FastNoiseLite._Lerp(this._ValCoordR2(seed2, x0, y1), this._ValCoordR2(seed2, x1, y1), xs);
    return _FastNoiseLite._Lerp(xf0, xf1, ys);
  }
  /**
   * @private
   * @param {number} seed
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number}
   */
  _SingleValueR3(seed2, x, y, z) {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    let z0 = Math.floor(z);
    let xs = _FastNoiseLite._InterpHermite(x - x0);
    let ys = _FastNoiseLite._InterpHermite(y - y0);
    let zs = _FastNoiseLite._InterpHermite(z - z0);
    x0 = Math.imul(x0, this._PrimeX);
    y0 = Math.imul(y0, this._PrimeY);
    z0 = Math.imul(z0, this._PrimeZ);
    let x1 = x0 + this._PrimeX;
    let y1 = y0 + this._PrimeY;
    let z1 = z0 + this._PrimeZ;
    let xf00 = _FastNoiseLite._Lerp(
      this._ValCoordR3(seed2, x0, y0, z0),
      this._ValCoordR3(seed2, x1, y0, z0),
      xs
    );
    let xf10 = _FastNoiseLite._Lerp(
      this._ValCoordR3(seed2, x0, y1, z0),
      this._ValCoordR3(seed2, x1, y1, z0),
      xs
    );
    let xf01 = _FastNoiseLite._Lerp(
      this._ValCoordR3(seed2, x0, y0, z1),
      this._ValCoordR3(seed2, x1, y0, z1),
      xs
    );
    let xf11 = _FastNoiseLite._Lerp(
      this._ValCoordR3(seed2, x0, y1, z1),
      this._ValCoordR3(seed2, x1, y1, z1),
      xs
    );
    let yf0 = _FastNoiseLite._Lerp(xf00, xf10, ys);
    let yf1 = _FastNoiseLite._Lerp(xf01, xf11, ys);
    return _FastNoiseLite._Lerp(yf0, yf1, zs);
  }
  /**
   * @private
   */
  _DoSingleDomainWarp() {
    let R2 = (seed2, amp, freq, coord, x, y) => {
      switch (this._DomainWarpType) {
        case _FastNoiseLite.DomainWarpType.OpenSimplex2:
          this._SingleDomainWarpOpenSimplex2Gradient(
            seed2,
            amp * 38.283687591552734,
            freq,
            coord,
            false,
            x,
            y
          );
          break;
        case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
          this._SingleDomainWarpOpenSimplex2Gradient(
            seed2,
            amp * 16,
            freq,
            coord,
            true,
            x,
            y
          );
          break;
        case _FastNoiseLite.DomainWarpType.BasicGrid:
          this._SingleDomainWarpBasicGrid(seed2, amp, freq, coord, x, y);
          break;
      }
    };
    let R3 = (seed2, amp, freq, coord, x, y, z) => {
      switch (this._DomainWarpType) {
        case _FastNoiseLite.DomainWarpType.OpenSimplex2:
          this._SingleDomainWarpOpenSimplex2Gradient(
            seed2,
            amp * 32.69428253173828,
            freq,
            coord,
            false,
            x,
            y,
            z
          );
          break;
        case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
          this._SingleDomainWarpOpenSimplex2Gradient(
            seed2,
            amp * 7.71604938271605,
            freq,
            coord,
            true,
            x,
            y,
            z
          );
          break;
        case _FastNoiseLite.DomainWarpType.BasicGrid:
          this._SingleDomainWarpBasicGrid(seed2, amp, freq, coord, x, y, z);
          break;
      }
    };
    if (arguments.length === 6 && arguments[3] instanceof Vector2) {
      return R2(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
    }
    if (arguments.length === 7 && arguments[3] instanceof Vector328) {
      return R3(
        arguments[0],
        arguments[1],
        arguments[2],
        arguments[3],
        arguments[4],
        arguments[5],
        arguments[6]
      );
    }
  }
  /**
   * @private
   */
  _DomainWarpSingle() {
    let R2 = (coord) => {
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      let xs = coord.x;
      let ys = coord.y;
      switch (this._DomainWarpType) {
        case _FastNoiseLite.DomainWarpType.OpenSimplex2:
        case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
          const SQRT3 = 1.7320508075688772;
          const F2 = 0.5 * (SQRT3 - 1);
          let t = (xs + ys) * F2;
          xs += t;
          ys += t;
          break;
        default:
          break;
      }
      this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys);
    };
    let R3 = (coord) => {
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      let xs = coord.x;
      let ys = coord.y;
      let zs = coord.z;
      switch (this._WarpTransformType3D) {
        case _FastNoiseLite.TransformType3D.ImproveXYPlanes:
          {
            let xy = xs + ys;
            let s2 = xy * -0.211324865405187;
            zs *= 0.577350269189626;
            xs += s2 - zs;
            ys = ys + s2 - zs;
            zs += xy * 0.577350269189626;
          }
          break;
        case _FastNoiseLite.TransformType3D.ImproveXZPlanes:
          {
            let xz = xs + zs;
            let s2 = xz * -0.211324865405187;
            ys *= 0.577350269189626;
            xs += s2 - ys;
            zs += s2 - ys;
            ys += xz * 0.577350269189626;
          }
          break;
        case _FastNoiseLite.TransformType3D.DefaultOpenSimplex2:
          const R32 = 2 / 3;
          let r = (xs + ys + zs) * R32;
          xs = r - xs;
          ys = r - ys;
          zs = r - zs;
          break;
        default:
          break;
      }
      this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys, zs);
    };
    if (arguments.length === 1 && arguments[0] instanceof Vector2) {
      return R2(arguments[0]);
    }
    if (arguments.length === 1 && arguments[0] instanceof Vector328) {
      return R3(arguments[0]);
    }
  }
  _DomainWarpFractalProgressive() {
    let R2 = (coord) => {
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      for (let i = 0; i < this._Octaves; i++) {
        let xs = coord.x;
        let ys = coord.y;
        switch (this._DomainWarpType) {
          case _FastNoiseLite.DomainWarpType.OpenSimplex2:
          case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
            const SQRT3 = 1.7320508075688772;
            const F2 = 0.5 * (SQRT3 - 1);
            let t = (xs + ys) * F2;
            xs += t;
            ys += t;
            break;
          default:
            break;
        }
        this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys);
        seed2++;
        amp *= this._Gain;
        freq *= this._Lacunarity;
      }
    };
    let R3 = (coord) => {
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      for (let i = 0; i < this._Octaves; i++) {
        let xs = coord.x;
        let ys = coord.y;
        let zs = coord.z;
        switch (this._WarpTransformType3D) {
          case _FastNoiseLite.TransformType3D.ImproveXYPlanes:
            {
              let xy = xs + ys;
              let s2 = xy * -0.211324865405187;
              zs *= 0.577350269189626;
              xs += s2 - zs;
              ys = ys + s2 - zs;
              zs += xy * 0.577350269189626;
            }
            break;
          case _FastNoiseLite.TransformType3D.ImproveXZPlanes:
            {
              let xz = xs + zs;
              let s2 = xz * -0.211324865405187;
              ys *= 0.577350269189626;
              xs += s2 - ys;
              zs += s2 - ys;
              ys += xz * 0.577350269189626;
            }
            break;
          case _FastNoiseLite.TransformType3D.DefaultOpenSimplex2:
            {
              const R32 = 2 / 3;
              let r = (xs + ys + zs) * R32;
              xs = r - xs;
              ys = r - ys;
              zs = r - zs;
            }
            break;
          default:
            break;
        }
        this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys, zs);
        seed2++;
        amp *= this._Gain;
        freq *= this._Lacunarity;
      }
    };
    if (arguments.length === 1 && arguments[0] instanceof Vector2) {
      return R2(arguments[0]);
    }
    if (arguments.length === 1 && arguments[0] instanceof Vector328) {
      return R3(arguments[0]);
    }
  }
  /**
   * @private
   */
  _DomainWarpFractalIndependent() {
    let R2 = (coord) => {
      let xs = coord.x;
      let ys = coord.y;
      switch (this._DomainWarpType) {
        case _FastNoiseLite.DomainWarpType.OpenSimplex2:
        case _FastNoiseLite.DomainWarpType.OpenSimplex2Reduced:
          const SQRT3 = 1.7320508075688772;
          const F2 = 0.5 * (SQRT3 - 1);
          let t = (xs + ys) * F2;
          xs += t;
          ys += t;
          break;
        default:
          break;
      }
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      for (let i = 0; i < this._Octaves; i++) {
        this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys);
        seed2++;
        amp *= this._Gain;
        freq *= this._Lacunarity;
      }
    };
    let R3 = (coord) => {
      let xs = coord.x;
      let ys = coord.y;
      let zs = coord.z;
      switch (this._WarpTransformType3D) {
        case _FastNoiseLite.TransformType3D.ImproveXYPlanes:
          {
            let xy = xs + ys;
            let s2 = xy * -0.211324865405187;
            zs *= 0.577350269189626;
            xs += s2 - zs;
            ys = ys + s2 - zs;
            zs += xy * 0.577350269189626;
          }
          break;
        case _FastNoiseLite.TransformType3D.ImproveXZPlanes:
          {
            let xz = xs + zs;
            let s2 = xz * -0.211324865405187;
            ys *= 0.577350269189626;
            xs += s2 - ys;
            zs += s2 - ys;
            ys += xz * 0.577350269189626;
          }
          break;
        case _FastNoiseLite.TransformType3D.DefaultOpenSimplex2:
          {
            const R32 = 2 / 3;
            let r = (xs + ys + zs) * R32;
            xs = r - xs;
            ys = r - ys;
            zs = r - zs;
          }
          break;
        default:
          break;
      }
      let seed2 = this._Seed;
      let amp = this._DomainWarpAmp * this._FractalBounding;
      let freq = this._Frequency;
      for (let i = 0; i < this._Octaves; i++) {
        this._DoSingleDomainWarp(seed2, amp, freq, coord, xs, ys, zs);
        seed2++;
        amp *= this._Gain;
        freq *= this._Lacunarity;
      }
    };
    if (arguments.length === 1 && arguments[0] instanceof Vector2) {
      return R2(arguments[0]);
    }
    if (arguments.length === 1 && arguments[0] instanceof Vector328) {
      return R3(arguments[0]);
    }
  }
  /**
   * @private
   */
  _SingleDomainWarpBasicGrid() {
    let R2 = (seed2, warpAmp, frequency, coord, x, y) => {
      let xf = x * frequency;
      let yf = y * frequency;
      let x0 = Math.floor(xf);
      let y0 = Math.floor(yf);
      let xs = _FastNoiseLite._InterpHermite(xf - x0);
      let ys = _FastNoiseLite._InterpHermite(yf - y0);
      x0 = Math.imul(x0, this._PrimeX);
      y0 = Math.imul(y0, this._PrimeY);
      let x1 = x0 + this._PrimeX;
      let y1 = y0 + this._PrimeY;
      let hash0 = this._HashR2(seed2, x0, y0) & 255 << 1;
      let hash1 = this._HashR2(seed2, x1, y0) & 255 << 1;
      let lx0x = _FastNoiseLite._Lerp(this._RandVecs2D[hash0], this._RandVecs2D[hash1], xs);
      let ly0x = _FastNoiseLite._Lerp(this._RandVecs2D[hash0 | 1], this._RandVecs2D[hash1 | 1], xs);
      hash0 = this._HashR2(seed2, x0, y1) & 255 << 1;
      hash1 = this._HashR2(seed2, x1, y1) & 255 << 1;
      let lx1x = _FastNoiseLite._Lerp(this._RandVecs2D[hash0], this._RandVecs2D[hash1], xs);
      let ly1x = _FastNoiseLite._Lerp(this._RandVecs2D[hash0 | 1], this._RandVecs2D[hash1 | 1], xs);
      coord.x += _FastNoiseLite._Lerp(lx0x, lx1x, ys) * warpAmp;
      coord.y += _FastNoiseLite._Lerp(ly0x, ly1x, ys) * warpAmp;
    };
    let R3 = (seed2, warpAmp, frequency, coord, x, y, z) => {
      let xf = x * frequency;
      let yf = y * frequency;
      let zf = z * frequency;
      let x0 = Math.floor(xf);
      let y0 = Math.floor(yf);
      let z0 = Math.floor(zf);
      let xs = _FastNoiseLite._InterpHermite(xf - x0);
      let ys = _FastNoiseLite._InterpHermite(yf - y0);
      let zs = _FastNoiseLite._InterpHermite(zf - z0);
      x0 = Math.imul(x0, this._PrimeX);
      y0 = Math.imul(y0, this._PrimeY);
      z0 = Math.imul(z0, this._PrimeZ);
      let x1 = x0 + this._PrimeX;
      let y1 = y0 + this._PrimeY;
      let z1 = z0 + this._PrimeZ;
      let hash0 = this._HashR3(seed2, x0, y0, z0) & 255 << 2;
      let hash1 = this._HashR3(seed2, x1, y0, z0) & 255 << 2;
      let lx0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0], this._RandVecs3D[hash1], xs);
      let ly0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 1], this._RandVecs3D[hash1 | 1], xs);
      let lz0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 2], this._RandVecs3D[hash1 | 2], xs);
      hash0 = this._HashR3(seed2, x0, y1, z0) & 255 << 2;
      hash1 = this._HashR3(seed2, x1, y1, z0) & 255 << 2;
      let lx1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0], this._RandVecs3D[hash1], xs);
      let ly1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 1], this._RandVecs3D[hash1 | 1], xs);
      let lz1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 2], this._RandVecs3D[hash1 | 2], xs);
      let lx0y = _FastNoiseLite._Lerp(lx0x, lx1x, ys);
      let ly0y = _FastNoiseLite._Lerp(ly0x, ly1x, ys);
      let lz0y = _FastNoiseLite._Lerp(lz0x, lz1x, ys);
      hash0 = this._HashR3(seed2, x0, y0, z1) & 255 << 2;
      hash1 = this._HashR3(seed2, x1, y0, z1) & 255 << 2;
      lx0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0], this._RandVecs3D[hash1], xs);
      ly0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 1], this._RandVecs3D[hash1 | 1], xs);
      lz0x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 2], this._RandVecs3D[hash1 | 2], xs);
      hash0 = this._HashR3(seed2, x0, y1, z1) & 255 << 2;
      hash1 = this._HashR3(seed2, x1, y1, z1) & 255 << 2;
      lx1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0], this._RandVecs3D[hash1], xs);
      ly1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 1], this._RandVecs3D[hash1 | 1], xs);
      lz1x = _FastNoiseLite._Lerp(this._RandVecs3D[hash0 | 2], this._RandVecs3D[hash1 | 2], xs);
      coord.x += _FastNoiseLite._Lerp(lx0y, _FastNoiseLite._Lerp(lx0x, lx1x, ys), zs) * warpAmp;
      coord.y += _FastNoiseLite._Lerp(ly0y, _FastNoiseLite._Lerp(ly0x, ly1x, ys), zs) * warpAmp;
      coord.z += _FastNoiseLite._Lerp(lz0y, _FastNoiseLite._Lerp(lz0x, lz1x, ys), zs) * warpAmp;
    };
    if (arguments.length === 6 && arguments[3] instanceof Vector2) {
      R2(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
    }
    if (arguments.length === 7 && arguments[3] instanceof Vector328) {
      R3(
        arguments[0],
        arguments[1],
        arguments[2],
        arguments[3],
        arguments[4],
        arguments[5],
        arguments[6]
      );
    }
  }
  /**
   * @private
   */
  _SingleDomainWarpOpenSimplex2Gradient() {
    let R2 = (seed2, warpAmp, frequency, coord, outGradOnly, x, y) => {
      const SQRT3 = 1.7320508075688772;
      const G2 = (3 - SQRT3) / 6;
      x *= frequency;
      y *= frequency;
      let i = Math.floor(x);
      let j = Math.floor(y);
      let xi = x - i;
      let yi = y - j;
      let t = (xi + yi) * G2;
      let x0 = xi - t;
      let y0 = yi - t;
      i = Math.imul(i, this._PrimeX);
      j = Math.imul(j, this._PrimeY);
      let vx, vy;
      vx = vy = 0;
      let a = 0.5 - x0 * x0 - y0 * y0;
      if (a > 0) {
        let aaaa = a * a * (a * a);
        let xo, yo;
        if (outGradOnly) {
          let hash = this._HashR2(seed2, i, j) & 255 << 1;
          xo = this._RandVecs2D[hash];
          yo = this._RandVecs2D[hash | 1];
        } else {
          let hash = this._HashR2(seed2, i, j);
          let index1 = hash & 127 << 1;
          let index2 = hash >> 7 & 255 << 1;
          let xg = this._Gradients2D[index1];
          let yg = this._Gradients2D[index1 | 1];
          let value = x0 * xg + y0 * yg;
          let xgo = this._RandVecs2D[index2];
          let ygo = this._RandVecs2D[index2 | 1];
          xo = value * xgo;
          yo = value * ygo;
        }
        vx += aaaa * xo;
        vy += aaaa * yo;
      }
      let c = 2 * (1 - 2 * G2) * (1 / G2 - 2) * t + (-2 * (1 - 2 * G2) * (1 - 2 * G2) + a);
      if (c > 0) {
        let x2 = x0 + (2 * G2 - 1);
        let y2 = y0 + (2 * G2 - 1);
        let cccc = c * c * (c * c);
        let xo, yo;
        if (outGradOnly) {
          let hash = this._HashR2(seed2, i + this._PrimeX, j + this._PrimeY) & 255 << 1;
          xo = this._RandVecs2D[hash];
          yo = this._RandVecs2D[hash | 1];
        } else {
          let hash = this._HashR2(seed2, i + this._PrimeX, j + this._PrimeY);
          let index1 = hash & 127 << 1;
          let index2 = hash >> 7 & 255 << 1;
          let xg = this._Gradients2D[index1];
          let yg = this._Gradients2D[index1 | 1];
          let value = x2 * xg + y2 * yg;
          let xgo = this._RandVecs2D[index2];
          let ygo = this._RandVecs2D[index2 | 1];
          xo = value * xgo;
          yo = value * ygo;
        }
        vx += cccc * xo;
        vy += cccc * yo;
      }
      if (y0 > x0) {
        let x1 = x0 + G2;
        let y1 = y0 + (G2 - 1);
        let b = 0.5 - x1 * x1 - y1 * y1;
        if (b > 0) {
          let bbbb = b * b * (b * b);
          let xo, yo;
          if (outGradOnly) {
            let hash = this._HashR2(seed2, i, j + this._PrimeY) & 255 << 1;
            xo = this._RandVecs2D[hash];
            yo = this._RandVecs2D[hash | 1];
          } else {
            let hash = this._HashR2(seed2, i, j + this._PrimeY);
            let index1 = hash & 127 << 1;
            let index2 = hash >> 7 & 255 << 1;
            let xg = this._Gradients2D[index1];
            let yg = this._Gradients2D[index1 | 1];
            let value = x1 * xg + y1 * yg;
            let xgo = this._RandVecs2D[index2];
            let ygo = this._RandVecs2D[index2 | 1];
            xo = value * xgo;
            yo = value * ygo;
          }
          vx += bbbb * xo;
          vy += bbbb * yo;
        }
      } else {
        let x1 = x0 + (G2 - 1);
        let y1 = y0 + G2;
        let b = 0.5 - x1 * x1 - y1 * y1;
        if (b > 0) {
          let bbbb = b * b * (b * b);
          let xo, yo;
          if (outGradOnly) {
            let hash = this._HashR2(seed2, i + this._PrimeX, j) & 255 << 1;
            xo = this._RandVecs2D[hash];
            yo = this._RandVecs2D[hash | 1];
          } else {
            let hash = this._HashR2(seed2, i + this._PrimeX, j);
            let index1 = hash & 127 << 1;
            let index2 = hash >> 7 & 255 << 1;
            let xg = this._Gradients2D[index1];
            let yg = this._Gradients2D[index1 | 1];
            let value = x1 * xg + y1 * yg;
            let xgo = this._RandVecs2D[index2];
            let ygo = this._RandVecs2D[index2 | 1];
            xo = value * xgo;
            yo = value * ygo;
          }
          vx += bbbb * xo;
          vy += bbbb * yo;
        }
      }
      coord.x += vx * warpAmp;
      coord.y += vy * warpAmp;
    };
    let R3 = (seed2, warpAmp, frequency, coord, outGradOnly, x, y, z) => {
      x *= frequency;
      y *= frequency;
      z *= frequency;
      let i = Math.round(x);
      let j = Math.round(y);
      let k = Math.round(z);
      let x0 = x - i;
      let y0 = y - j;
      let z0 = z - k;
      let xNSign = -x0 - 1 | 1;
      let yNSign = -y0 - 1 | 1;
      let zNSign = -z0 - 1 | 1;
      let ax0 = xNSign * -x0;
      let ay0 = yNSign * -y0;
      let az0 = zNSign * -z0;
      i = Math.imul(i, this._PrimeX);
      j = Math.imul(j, this._PrimeY);
      k = Math.imul(k, this._PrimeZ);
      let vx, vy, vz;
      vx = vy = vz = 0;
      let a = 0.6 - x0 * x0 - (y0 * y0 + z0 * z0);
      for (let l = 0; ; l++) {
        if (a > 0) {
          let aaaa = a * a * (a * a);
          let xo, yo, zo;
          if (outGradOnly) {
            let hash = this._HashR3(seed2, i, j, k) & 255 << 2;
            xo = this._RandVecs3D[hash];
            yo = this._RandVecs3D[hash | 1];
            zo = this._RandVecs3D[hash | 2];
          } else {
            let hash = this._HashR3(seed2, i, j, k);
            let index1 = hash & 63 << 2;
            let index2 = hash >> 6 & 255 << 2;
            let xg = this._Gradients3D[index1];
            let yg = this._Gradients3D[index1 | 1];
            let zg = this._Gradients3D[index1 | 2];
            let value = x0 * xg + y0 * yg + z0 * zg;
            let xgo = this._RandVecs3D[index2];
            let ygo = this._RandVecs3D[index2 | 1];
            let zgo = this._RandVecs3D[index2 | 2];
            xo = value * xgo;
            yo = value * ygo;
            zo = value * zgo;
          }
          vx += aaaa * xo;
          vy += aaaa * yo;
          vz += aaaa * zo;
        }
        let b = a;
        let i1 = i;
        let j1 = j;
        let k1 = k;
        let x1 = x0;
        let y1 = y0;
        let z1 = z0;
        if (ax0 >= ay0 && ax0 >= az0) {
          x1 += xNSign;
          b = b + ax0 + ax0;
          i1 -= xNSign * this._PrimeX;
        } else if (ay0 > ax0 && ay0 >= az0) {
          y1 += yNSign;
          b = b + ay0 + ay0;
          j1 -= yNSign * this._PrimeY;
        } else {
          z1 += zNSign;
          b = b + az0 + az0;
          k1 -= zNSign * this._PrimeZ;
        }
        if (b > 1) {
          b -= 1;
          let bbbb = b * b * (b * b);
          let xo, yo, zo;
          if (outGradOnly) {
            let hash = this._HashR3(seed2, i1, j1, k1) & 255 << 2;
            xo = this._RandVecs3D[hash];
            yo = this._RandVecs3D[hash | 1];
            zo = this._RandVecs3D[hash | 2];
          } else {
            let hash = this._HashR3(seed2, i1, j1, k1);
            let index1 = hash & 63 << 2;
            let index2 = hash >> 6 & 255 << 2;
            let xg = this._Gradients3D[index1];
            let yg = this._Gradients3D[index1 | 1];
            let zg = this._Gradients3D[index1 | 2];
            let value = x1 * xg + y1 * yg + z1 * zg;
            let xgo = this._RandVecs3D[index2];
            let ygo = this._RandVecs3D[index2 | 1];
            let zgo = this._RandVecs3D[index2 | 2];
            xo = value * xgo;
            yo = value * ygo;
            zo = value * zgo;
          }
          vx += bbbb * xo;
          vy += bbbb * yo;
          vz += bbbb * zo;
        }
        if (l === 1) break;
        ax0 = 0.5 - ax0;
        ay0 = 0.5 - ay0;
        az0 = 0.5 - az0;
        x0 = xNSign * ax0;
        y0 = yNSign * ay0;
        z0 = zNSign * az0;
        a += 0.75 - ax0 - (ay0 + az0);
        i += xNSign >> 1 & this._PrimeX;
        j += yNSign >> 1 & this._PrimeY;
        k += zNSign >> 1 & this._PrimeZ;
        xNSign = -xNSign;
        yNSign = -yNSign;
        zNSign = -zNSign;
        seed2 += 1293373;
      }
      coord.x += vx * warpAmp;
      coord.y += vy * warpAmp;
      coord.z += vz * warpAmp;
    };
    if (arguments.length === 7) {
      R2(
        arguments[0],
        arguments[1],
        arguments[2],
        arguments[3],
        arguments[4],
        arguments[5],
        arguments[6]
      );
    }
    if (arguments.length === 8) {
      R3(
        arguments[0],
        arguments[1],
        arguments[2],
        arguments[3],
        arguments[4],
        arguments[5],
        arguments[6],
        arguments[7]
      );
    }
  }
};
var Vector2 = class {
  /**
   * 2d Vector
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
};
var Vector328 = class {
  /**
   * 3d Vector
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
};

// src/main/bedrock/ts/world/worldgen/core/utils/random.ts
var ProceduralRandom = class _ProceduralRandom {
  static getNumber(pos, seed2) {
    const BIT_NOISE1 = 1759714724;
    const BIT_NOISE2 = 3039394381;
    const BIT_NOISE3 = 458671337;
    let mangledBits = pos & 2147483647;
    mangledBits *= BIT_NOISE1;
    mangledBits += seed2;
    mangledBits ^= mangledBits >> 8;
    mangledBits += BIT_NOISE2;
    mangledBits ^= mangledBits << 8;
    mangledBits *= BIT_NOISE3;
    mangledBits ^= mangledBits >> 8;
    return mangledBits;
  }
  seed;
  index;
  constructor(seed2) {
    this.seed = Math.floor(seed2);
    this.index = 0;
  }
  getInt(r) {
    return _ProceduralRandom.getNumber(r, this.seed);
  }
  getFloat(r) {
    return this.getInt(r) / 2147483647;
  }
  getInt2(x, z) {
    return this.getInt(x + z * 999999937);
  }
  nextInt() {
    return this.getInt(this.index++);
  }
  nextFloat() {
    return this.getFloat(this.index++);
  }
  getSeqence(x, z) {
    return new _ProceduralRandom(this.getInt(x + z * 999999937));
  }
};
Array.prototype.random = function(r = Math.random()) {
  return this[Math.floor(r * this.length)];
};
String.prototype.toArray = function(num) {
  return new Array(num ?? 1).fill(this);
};

// src/main/bedrock/ts/world/worldgen/core/utils/ease-ing.ts
var c1 = 1.70158;
var c2 = c1 * 1.525;
var c3 = c1 + 1;

// src/main/bedrock/ts/world/worldgen/core/utils/paletted-placer.ts
import { ListBlockVolume } from "@minecraft/server";
var PalettedPlacer = class {
  palettes;
  constructor() {
    this.palettes = /* @__PURE__ */ new Map();
  }
  getPaletteLocations(permutation) {
    return this.palettes.get(permutation) ?? [];
  }
  setPaletteLocations(permutation, locations) {
    this.palettes.set(permutation, locations);
  }
  setBlock(location, permutation) {
    let list = this.palettes.get(permutation);
    if (!list) {
      list = [];
      this.palettes.set(permutation, list);
    }
    list.push(location);
  }
  *flush(dimension, filterOption) {
    for (const [permutation, list] of this.palettes.entries()) {
      if (!list.length) continue;
      const slices = /* @__PURE__ */ new Map();
      for (const loc of list) {
        const cx = Math.floor(loc.x / 16);
        const cy = Math.floor(loc.y / 16);
        const cz = Math.floor(loc.z / 16);
        const key = `${cx},${cy},${cz}`;
        let sliceList = slices.get(key);
        if (!sliceList) {
          sliceList = [];
          slices.set(key, sliceList);
        }
        sliceList.push(loc);
      }
      for (const sliceList of slices.values()) {
        dimension.fillBlocks(new ListBlockVolume(sliceList), permutation, filterOption ?? {});
        yield;
      }
    }
    this.palettes.clear();
  }
};

// src/main/bedrock/ts/world/worldgen/core/utils/paletted-brush.ts
import { BlockPermutation as BlockPermutation15 } from "@minecraft/server";
var PalettedBrush = class {
  permutations;
  resolved;
  constructor() {
    this.permutations = [];
    this.resolved = [];
  }
  add(type2, repeat) {
    const count = repeat ?? 1;
    for (let i = 0; i < count; i++) {
      this.permutations.push(type2);
    }
    return this;
  }
  addArray(list) {
    for (const entry of list) this.add(entry);
    return this;
  }
  resolveAll() {
    if (this.resolved.length === this.permutations.length) return;
    this.resolved = this.permutations.map((p) => {
      if (typeof p === "string") {
        try {
          return BlockPermutation15.resolve(p);
        } catch (e) {
          return BlockPermutation15.resolve("minecraft:air");
        }
      }
      return p;
    });
  }
  next(r = Math.random()) {
    this.resolveAll();
    return this.resolved[Math.floor(r * this.resolved.length)] ?? BlockPermutation15.resolve("minecraft:air");
  }
  toPermutation(r) {
    return this.next(r);
  }
  /** Returns the raw string block ID (or BlockPermutation) without resolving.
   *  This is safe to pass directly to fillBlocks() which accepts string | BlockPermutation. */
  toBlockId(r) {
    if (!this.permutations.length) return "minecraft:air";
    return this.permutations[Math.floor(r * this.permutations.length)];
  }
};
PalettedBrush.prototype.toPermutation = PalettedBrush.prototype.next;
BlockPermutation15.prototype.toPermutation = function(r) {
  return this;
};
String.prototype.toPermutation = function(r) {
  return BlockPermutation15.resolve(this);
};

// src/main/bedrock/ts/world/worldgen/core/utils/event.ts
var sessions = /* @__PURE__ */ new WeakMap();
var PublicEvent = class {
  constructor() {
    sessions.set(this, /* @__PURE__ */ new Set());
  }
  subscribe(method) {
    const t = typeof method;
    if (t !== "function")
      throw new TypeError(`Expected a function, but got ${t}.`);
    if (sessions.has(this)) {
      const set = sessions.get(this);
      if (set && !set.has(method))
        set.add(method);
    }
    return method;
  }
  unsubscribe(method) {
    const t = typeof method;
    if (t !== "function")
      throw new TypeError(`Expected a function, but got ${t}.`);
    if (sessions.has(this))
      sessions.get(this)?.delete(method);
    return method;
  }
};
var NativeEvent = class extends PublicEvent {
  async trigger(...params) {
    if (sessions.has(this)) {
      const promises = [];
      sessions.get(this)?.forEach((method) => {
        promises.push((async () => method(...params))().catch((e) => console.error(e, e.stack)));
      });
      await Promise.all(promises);
    }
  }
};

// src/main/bedrock/ts/world/worldgen/core/utils/functions.ts
import { system as system33 } from "@minecraft/server";
var delay = system33.waitTicks.bind(system33);

// src/main/bedrock/ts/world/worldgen/core/client/index.ts
import { world as world31 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/client/local-chunks.ts
import { system as system34 } from "@minecraft/server";
var CLIENT_CHUNKS = /* @__PURE__ */ new WeakMap();
var MAX_RETRIES = 3;
var ClientChunk = class {
  static open(sessionManager, player) {
    let m = CLIENT_CHUNKS.get(player);
    if (!m) CLIENT_CHUNKS.set(player, m = new this(player, sessionManager));
    return m;
  }
  player;
  manager;
  lastVisitedChunk = "";
  id = void 0;
  chunkQueue = [];
  queuedChunks = /* @__PURE__ */ new Set();
  activeJobs = 0;
  maxJobs = 3;
  constructor(player, sessionManager) {
    this.player = player;
    this.manager = sessionManager;
  }
  get chunkXZ() {
    const { x, z } = this.player.location;
    return { x: Math.floor(x / 16), z: Math.floor(z / 16) };
  }
  get isRunning() {
    return typeof this.id === "number";
  }
  get currentGenerator() {
    return this.manager.get(this.player.dimension);
  }
  getKey(loc) {
    return `${loc.x};${loc.z}`;
  }
  start() {
    this.id = system34.runInterval(() => {
      try {
        this._tick();
      } catch (e) {
        console.error(e);
      }
    });
  }
  stop() {
    if (this.isRunning && this.id !== void 0) system34.clearRun(this.id);
  }
  _tick() {
    if (!this.player.dimension.id.startsWith("gaiadimension:")) return;
    const gen = this.currentGenerator;
    if (!gen) return;
    const { x: X, z: Z } = this.chunkXZ;
    const radius = 4;
    const chunks = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = X + dx;
        const cz = Z + dz;
        const key = this.getKey({ x: cx, z: cz });
        const dist = dx * dx + dz * dz;
        chunks.push({ x: cx, z: cz, key, dist });
      }
    }
    chunks.sort((a, b) => a.dist - b.dist);
    let added = 0;
    for (const entry of chunks) {
      if (gen.isGenerated(entry.key)) continue;
      if (this.queuedChunks.has(entry.key)) continue;
      this.queuedChunks.add(entry.key);
      this.chunkQueue.push({ ...entry, retries: 0 });
      added++;
      if (added >= 6) break;
    }
    this._processQueue(gen);
  }
  _processQueue(gen) {
    while (this.activeJobs < this.maxJobs && this.chunkQueue.length > 0) {
      const entry = this.chunkQueue.shift();
      this.queuedChunks.delete(entry.key);
      if (gen.isGenerated(entry.key)) continue;
      this.activeJobs++;
      gen.buildChunk(entry.x, entry.z, entry.key).then((success) => {
        if (!success && entry.retries < MAX_RETRIES) {
          system34.runTimeout(() => {
            if (!gen.isGenerated(entry.key) && !this.queuedChunks.has(entry.key)) {
              this.queuedChunks.add(entry.key);
              this.chunkQueue.push({ ...entry, retries: entry.retries + 1 });
            }
          }, 20);
        }
      }).catch((e) => console.error(`[GaiaDim] Chunk error:`, e)).finally(() => {
        this.activeJobs--;
      });
    }
  }
};

// src/main/bedrock/ts/world/worldgen/core/world_gen/index.ts
import { world as world30, system as system37 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/world_gen/session-manager.ts
import { world as world29 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/world_gen/generator.ts
import { system as system35 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/world_gen/gaia-layers.ts
var BIOME_IDS = {
  OCEAN: 0,
  // mineral_reservoir
  LAND: 1,
  // generic land marker
  // Common (5)
  PINK_AGATE_FOREST: 2,
  BLUE_AGATE_TAIGA: 3,
  GREEN_AGATE_JUNGLE: 4,
  CRYSTAL_PLAINS: 5,
  FOSSIL_WOODLAND: 6,
  // Uncommon (6)
  VOLCANIC_LANDS: 7,
  STATIC_WASTELAND: 8,
  SALT_DUNES: 9,
  SMOLDERING_BOG: 10,
  SHINING_GROVE: 11,
  MOOKAITE_MESA: 12,
  // Rare (3)
  PURPLE_AGATE_SWAMP: 13,
  GOLDSTONE_LANDS: 14,
  MUTANT_WILDWOOD: 15,
  // Gold (5)
  GOLDEN_FOREST: 16,
  GOLDEN_PLAINS: 17,
  GOLDEN_HILLS: 18,
  GOLDEN_SANDS: 19,
  GOLDEN_MARSH: 20,
  // Water
  MINERAL_RIVER: 21,
  // Gold marker
  GOLD_ISLAND: 22
};
var B = BIOME_IDS;
var COMMON = [B.PINK_AGATE_FOREST, B.BLUE_AGATE_TAIGA, B.GREEN_AGATE_JUNGLE, B.CRYSTAL_PLAINS, B.FOSSIL_WOODLAND];
var UNCOMMON = [B.VOLCANIC_LANDS, B.STATIC_WASTELAND, B.SALT_DUNES, B.SMOLDERING_BOG, B.SHINING_GROVE, B.MOOKAITE_MESA];
var RARE = [B.PURPLE_AGATE_SWAMP, B.GOLDSTONE_LANDS, B.MUTANT_WILDWOOD];
var GOLD = [B.GOLDEN_SANDS, B.GOLDEN_MARSH, B.GOLDEN_HILLS, B.GOLDEN_FOREST, B.GOLDEN_PLAINS];
var LayerRNG = class {
  state;
  constructor(seed2) {
    this.state = seed2 | 0;
  }
  initRandom(x, z) {
    let s = this.state;
    s = Math.imul(s, s * 6364136223846793e3 + 1442695040888963300 | 0);
    s = s + x | 0;
    s = Math.imul(s, s * 6364136223846793e3 + 1442695040888963300 | 0);
    s = s + z | 0;
    s = Math.imul(s, s * 6364136223846793e3 + 1442695040888963300 | 0);
    s = s + x | 0;
    s = Math.imul(s, s * 6364136223846793e3 + 1442695040888963300 | 0);
    s = s + z | 0;
    this.state = s;
  }
  nextRandom(bound) {
    let r = (this.state >> 24) % bound | 0;
    if (r < 0) r += bound;
    this.state = Math.imul(this.state, 6364136223846793e3) + 1442695040888963300 | 0;
    return r;
  }
  random2(a, b) {
    return this.nextRandom(2) === 0 ? a : b;
  }
  random4(a, b, c, d) {
    const r = this.nextRandom(4);
    return r === 0 ? a : r === 1 ? b : r === 2 ? c : d;
  }
};
function cachedLayer(fn, cacheSize = 1024) {
  const cache = /* @__PURE__ */ new Map();
  return (x, z) => {
    const key = (x & 65535) << 16 | z & 65535;
    const v = cache.get(key);
    if (v !== void 0) return v;
    const res = fn(x, z);
    if (cache.size > cacheSize) cache.clear();
    cache.set(key, res);
    return res;
  };
}
function islandLayer(seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    rng.initRandom(x, z);
    if (x === 0 && z === 0) return B.LAND;
    return rng.nextRandom(10) === 0 ? B.LAND : B.OCEAN;
  });
}
function zoomLayer(parent, seed2, fuzzy) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const px = x >> 1, pz = z >> 1;
    const first = parent(px, pz);
    rng.initRandom(px << 1, pz << 1);
    const rx = x & 1, rz = z & 1;
    if (rx === 0 && rz === 0) return first;
    const south = parent(px, pz + 1);
    const randFS = rng.random2(first, south);
    if (rx === 0) return randFS;
    const east = parent(px + 1, pz);
    const randFE = rng.random2(first, east);
    if (rz === 0) return randFE;
    const se = parent(px + 1, pz + 1);
    if (fuzzy) return rng.random4(first, south, east, se);
    return modeOrRandom(rng, first, south, east, se);
  });
}
function modeOrRandom(rng, a, b, c, d) {
  if (b === c && c === d) return b;
  if (a === b && a === c) return a;
  if (a === b && a === d) return a;
  if (a === c && a === d) return a;
  if (a === b && c !== d) return a;
  if (a === c && b !== d) return a;
  if (a === d && b !== c) return a;
  if (b === c && a !== d) return b;
  if (b === d && a !== c) return b;
  if (c === d && a !== b) return c;
  return rng.random4(a, b, c, d);
}
function isOcean(v) {
  return v === B.OCEAN;
}
function isGold(v) {
  return v === B.GOLD_ISLAND || GOLD.includes(v);
}
function addIslandLayer(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const sw = parent(x - 1, z - 1);
    const se = parent(x + 1, z - 1);
    const ne = parent(x + 1, z + 1);
    const nw = parent(x - 1, z + 1);
    const center = parent(x, z);
    rng.initRandom(x, z);
    if (!isOcean(center) || isOcean(nw) && isOcean(ne) && isOcean(sw) && isOcean(se)) {
      if (!isOcean(center) && (isOcean(nw) || isOcean(sw) || isOcean(ne) || isOcean(se)) && rng.nextRandom(5) === 0) {
        if (isOcean(nw)) return center === B.LAND ? B.LAND : nw;
        if (isOcean(sw)) return center === B.LAND ? B.LAND : sw;
        if (isOcean(ne)) return center === B.LAND ? B.LAND : ne;
        if (isOcean(se)) return center === B.LAND ? B.LAND : se;
      }
      return center;
    } else {
      let i = 1, j = B.LAND;
      if (!isOcean(nw) && rng.nextRandom(i++) === 0) j = nw;
      if (!isOcean(ne) && rng.nextRandom(i++) === 0) j = ne;
      if (!isOcean(sw) && rng.nextRandom(i++) === 0) j = sw;
      if (!isOcean(se) && rng.nextRandom(i++) === 0) j = se;
      return rng.nextRandom(3) === 0 ? j : j === B.LAND ? B.LAND : center;
    }
  });
}
function removeTooMuchOcean(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const n = parent(x, z - 1), e = parent(x + 1, z);
    const s = parent(x, z + 1), w = parent(x - 1, z);
    const c = parent(x, z);
    rng.initRandom(x, z);
    if (isOcean(c) && isOcean(n) && isOcean(e) && isOcean(w) && isOcean(s)) {
      return rng.nextRandom(2) === 0 ? c : B.LAND;
    }
    return B.LAND;
  });
}
function goldIslandLayer(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const sw = parent(x - 1, z - 1), se = parent(x + 1, z - 1);
    const ne = parent(x + 1, z + 1), nw = parent(x - 1, z + 1);
    const c = parent(x, z);
    rng.initRandom(x, z);
    if (isOcean(sw) && isOcean(se) && isOcean(ne) && isOcean(nw) && isOcean(c)) {
      if (rng.nextRandom(3) === 0) return B.GOLD_ISLAND;
    }
    return c;
  });
}
function gaiaBiomesLayer(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const c = parent(x, z);
    rng.initRandom(x, z);
    if (isOcean(c)) return c;
    if (isGold(c)) return GOLD[rng.nextRandom(GOLD.length)];
    if (rng.nextRandom(16) === 0) return RARE[rng.nextRandom(RARE.length)];
    if (rng.nextRandom(8) === 0) return UNCOMMON[rng.nextRandom(UNCOMMON.length)];
    return COMMON[rng.nextRandom(COMMON.length)];
  });
}
function smoothLayer(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const c = parent(x, z);
    const n = parent(x, z - 1), e = parent(x + 1, z);
    const s = parent(x, z + 1), w = parent(x - 1, z);
    rng.initRandom(x, z);
    if (n === s && w === e) return rng.nextRandom(2) === 0 ? n : w;
    if (n === s) return n;
    if (w === e) return w;
    return c;
  });
}
function riverLayer(parent, seed2) {
  const rng = new LayerRNG(seed2);
  return cachedLayer((x, z) => {
    const c = parent(x, z);
    const n = parent(x, z - 1), e = parent(x + 1, z);
    const s = parent(x, z + 1), w = parent(x - 1, z);
    if (c !== n || c !== e || c !== s || c !== w) return B.MINERAL_RIVER;
    return B.OCEAN;
  });
}
function riverMixLayer(biomesParent, riverParent, seed2) {
  return cachedLayer((x, z) => {
    const biome = biomesParent(x, z);
    const river = riverParent(x, z);
    if (isOcean(biome)) return biome;
    if (river === B.MINERAL_RIVER) return B.MINERAL_RIVER;
    return biome;
  });
}
function oceanMixLayer(biomesParent, oceanParent, seed2) {
  return cachedLayer((x, z) => {
    const biome = biomesParent(x, z);
    if (!isOcean(biome)) return biome;
    return B.OCEAN;
  });
}
function buildGaiaLayers(worldSeed) {
  let islands = islandLayer(worldSeed + 1);
  islands = zoomLayer(islands, worldSeed + 2e3, true);
  islands = addIslandLayer(islands, worldSeed + 1);
  islands = zoomLayer(islands, worldSeed + 2001, false);
  islands = addIslandLayer(islands, worldSeed + 2);
  islands = addIslandLayer(islands, worldSeed + 50);
  islands = addIslandLayer(islands, worldSeed + 70);
  islands = removeTooMuchOcean(islands, worldSeed + 2);
  let ocean = islandLayer(worldSeed + 2);
  ocean = cachedLayer((_x, _z) => B.OCEAN);
  ocean = zoomLayer(ocean, worldSeed + 2001, true);
  for (let i = 2002; i <= 2005; i++) ocean = zoomLayer(ocean, worldSeed + i, false);
  ocean = smoothLayer(ocean, worldSeed + 1003);
  islands = addIslandLayer(islands, worldSeed + 3);
  islands = zoomLayer(islands, worldSeed + 2002, false);
  islands = zoomLayer(islands, worldSeed + 2003, false);
  islands = addIslandLayer(islands, worldSeed + 4);
  islands = goldIslandLayer(islands, worldSeed + 5);
  islands = zoomLayer(islands, worldSeed + 1e3, false);
  let biomes = gaiaBiomesLayer(islands, worldSeed + 1);
  for (let i = 1e3; i <= 1005; i++) biomes = zoomLayer(biomes, worldSeed + i, false);
  let river = riverLayer(biomes, worldSeed + 1);
  river = smoothLayer(river, worldSeed + 1e3);
  biomes = smoothLayer(biomes, worldSeed + 1e3);
  biomes = riverMixLayer(biomes, river, worldSeed + 100);
  biomes = oceanMixLayer(biomes, ocean, worldSeed + 100);
  return biomes;
}
var ID_TO_NAME = {
  [B.OCEAN]: "gaiadimension:crystal_plains",
  [B.PINK_AGATE_FOREST]: "gaiadimension:pink_agate_forest",
  [B.BLUE_AGATE_TAIGA]: "gaiadimension:blue_agate_taiga",
  [B.GREEN_AGATE_JUNGLE]: "gaiadimension:green_agate_jungle",
  [B.CRYSTAL_PLAINS]: "gaiadimension:crystal_plains",
  [B.FOSSIL_WOODLAND]: "gaiadimension:fossil_woodland",
  [B.VOLCANIC_LANDS]: "gaiadimension:volcanic_lands",
  [B.STATIC_WASTELAND]: "gaiadimension:static_wasteland",
  [B.SALT_DUNES]: "gaiadimension:salt_dunes",
  [B.SMOLDERING_BOG]: "gaiadimension:smoldering_bog",
  [B.SHINING_GROVE]: "gaiadimension:shining_grove",
  [B.MOOKAITE_MESA]: "gaiadimension:mookaite_mesa",
  [B.PURPLE_AGATE_SWAMP]: "gaiadimension:purple_agate_swamp",
  [B.GOLDSTONE_LANDS]: "gaiadimension:goldstone_lands",
  [B.MUTANT_WILDWOOD]: "gaiadimension:mutant_agate_wildwood",
  [B.GOLDEN_FOREST]: "gaiadimension:golden_forest",
  [B.GOLDEN_PLAINS]: "gaiadimension:golden_plains",
  [B.GOLDEN_HILLS]: "gaiadimension:golden_hills",
  [B.GOLDEN_SANDS]: "gaiadimension:golden_sands",
  [B.GOLDEN_MARSH]: "gaiadimension:golden_marsh",
  [B.MINERAL_RIVER]: "gaiadimension:mineral_river",
  [B.GOLD_ISLAND]: "gaiadimension:golden_forest",
  [B.LAND]: "gaiadimension:crystal_plains"
};
function getBiomeNameFromId(id) {
  return ID_TO_NAME[id] ?? "gaiadimension:crystal_plains";
}

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-tree.ts
import { ListBlockVolume as ListBlockVolume2 } from "@minecraft/server";
var CompiledTreeSample = class {
  lists;
  constructor() {
    this.lists = /* @__PURE__ */ new Map();
  }
  placePaleteLike() {
    return this.lists.entries();
  }
  [Symbol.iterator]() {
    return this.lists.entries();
  }
};
var TreeDefinition = class {
  id;
  IsPrecalculated;
  samples;
  constructor(id) {
    this.id = id;
    this.IsPrecalculated = false;
    this.samples = [];
  }
  place(location, seed2, placer) {
    return this.build(location, seed2, placer);
  }
  onPrecalculate(samples, seed2) {
    samples ??= 5;
    this.IsPrecalculated = true;
    while (samples-- > 0) {
      const placer = new PalettedPlacer();
      for (const _ of this.build({ x: 0, y: 0, z: 0 }, seed2, placer)) ;
      const sample = new CompiledTreeSample();
      for (const [p, list] of placer.palettes.entries()) {
        const volume = new ListBlockVolume2(list);
        const newList = [];
        for (const a of volume.getBlockLocationIterator()) newList.push(a);
        sample.lists.set(p, newList);
      }
      this.samples.push(sample);
    }
  }
  getCompiledSample(r) {
    return this.samples.random(r);
  }
  /** Used by the generator to validate placement */
  canPlaceValidator = () => true;
};
var PillarTreeDefinition = class extends TreeDefinition {
  height;
  logPaletted;
  constructor(id = "pillar") {
    super(id);
    this.height = [3, 10];
    this.logPaletted = "minecraft:spruce_log";
  }
  setCanPlaceValidator(p) {
    this.canPlaceValidator = p;
    return this;
  }
  setLogPaletted(p) {
    this.logPaletted = p;
    return this;
  }
  setHeight(min, max) {
    this.height[0] = min;
    this.height[1] = max ?? min;
    return this;
  }
  *build(location, seed2, placer) {
    const { x, y, z } = location;
    const h = seed2.nextFloat() * (this.height[1] - this.height[0]) + this.height[0];
    for (let Y = 0; Y < h; Y++) {
      placer.setBlock({ x: x + 0.5, y: y + Y, z: z + 0.5 }, this.logPaletted.toPermutation(seed2.nextFloat()));
    }
  }
};
var SpruceTreeDefinition = class extends PillarTreeDefinition {
  offset;
  leavesPaletted;
  constructor() {
    super("spruce");
    this.offset = [1, 2];
    this.leavesPaletted = "minecraft:spruce_leaves";
  }
  setLeavesPaletted(p) {
    this.leavesPaletted = p;
    return this;
  }
  setOffSet(min, max) {
    this.offset[0] = min;
    this.offset[1] = max ?? min;
    return this;
  }
  *build(location, seed2, placer) {
    const { x, y, z } = location;
    const add = seed2.nextFloat() * (this.offset[1] - this.offset[0]) + this.offset[0];
    const h = seed2.nextFloat() * (this.height[1] - this.height[0]) + this.height[0];
    const height = h + add;
    for (let Y = 0; Y < height; Y++) {
      let max = height - Y + 1;
      if (Y < height - 1) placer.setBlock({ x, y: y + Y, z }, this.logPaletted.toPermutation(seed2.nextFloat()));
      else placer.setBlock({ x: x + 0.5, y: y + Y, z: z + 0.5 }, this.leavesPaletted.toPermutation(seed2.nextFloat()));
      if (Y >= add) for (let i = 0.5; i < max; i += 0.8) {
        let count = i * Math.PI;
        for (let j = 0; j < count; j++) {
          const distance = seed2.nextFloat() * i / 3 + 0.2;
          const rot = seed2.nextFloat() * Math.PI * 2;
          placer.setBlock({
            x: x + Math.sin(rot) * distance + 0.5,
            y: y + Y,
            z: z + Math.cos(rot) * distance + 0.5
          }, this.leavesPaletted.toPermutation(seed2.nextFloat()));
        }
        yield;
      }
    }
  }
};
var TreePalette = class {
  trees;
  constructor() {
    this.trees = [];
  }
  add(treeDefinition, num) {
    let value = num ?? 1;
    while (value--) this.trees.push(treeDefinition);
    return this;
  }
  get(random) {
    return this.trees.random(random);
  }
  onPrecalculate(samples, seed2) {
    for (const tree of this.trees) if (!tree.IsPrecalculated) tree.onPrecalculate(samples, seed2);
  }
};

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-biome.ts
var BiomeDefinition = class {
  id;
  trees;
  /** @deprecated Use treesPerChunk instead */
  treesChance;
  /** @deprecated Use treesPerChunk instead */
  treeAreaChance;
  /** Java countExtra: base tree count per chunk */
  treesPerChunk;
  /** Java countExtra: chance of extra trees (0.0 - 1.0) */
  treesExtraChance;
  /** Java countExtra: number of extra trees when chance succeeds */
  treesExtra;
  temperature;
  humidity;
  groundPaletted;
  underGroundPaletted;
  vegetationPalette;
  vegetationChance;
  vegetationValidation;
  IsPrecalculated;
  depth;
  scale;
  constructor(id) {
    this.id = id;
    this.trees = new TreePalette();
    this.treesChance = 0.02;
    this.treeAreaChance = 0.5;
    this.treesPerChunk = 0;
    this.treesExtraChance = 0.1;
    this.treesExtra = 1;
    this.temperature = [0, 1];
    this.humidity = [0, 1];
    this.groundPaletted = new PalettedBrush();
    this.underGroundPaletted = new PalettedBrush();
    this.vegetationPalette = new PalettedBrush();
    this.vegetationChance = 0.1;
    this.vegetationValidation = true;
    this.IsPrecalculated = false;
    this.depth = 0.125;
    this.scale = 0.05;
  }
  setDepth(p) {
    this.depth = p;
    return this;
  }
  setScale(p) {
    this.scale = p;
    return this;
  }
  onPrecalculate(samples, seed2) {
    this.trees.onPrecalculate(samples, seed2);
    this.IsPrecalculated = true;
  }
  /**@default 0.02 @deprecated Use setTreesPerChunk instead */
  setTreesChance(p) {
    this.treesChance = p;
    return this;
  }
  /**@default 0.5 @deprecated Use setTreesPerChunk instead */
  setTreesAreaChance(p) {
    this.treeAreaChance = p;
    return this;
  }
  /**
   * Java-parity tree placement: countExtra(count, chance, extra)
   * Places `count` trees per chunk, with `chance` probability of placing `extra` more.
   */
  setTreesPerChunk(count, chance = 0.1, extra = 1) {
    this.treesPerChunk = count;
    this.treesExtraChance = chance;
    this.treesExtra = extra;
    return this;
  }
  setTrees(p) {
    this.trees = p;
    return this;
  }
  setTemperature(min, max) {
    this.temperature = [min, max];
    return this;
  }
  setHumidity(min, max) {
    this.humidity = [min, max];
    return this;
  }
  setGroundPalette(p) {
    this.groundPaletted = p;
    return this;
  }
  setUnderGroundPalette(p) {
    this.underGroundPaletted = p;
    return this;
  }
  setVegetationPalette(p) {
    this.vegetationPalette = p;
    return this;
  }
  /**@default true @deprecated */
  setVegetationValidation(p) {
    this.vegetationValidation = p;
    return this;
  }
  /**@default 0.1 */
  setVegetationChance(p) {
    this.vegetationChance = p;
    return this;
  }
  get hasTrees() {
    return this.trees.trees.length;
  }
  getTreeDefinition(random) {
    return this.trees.get(random.nextFloat());
  }
};

// src/main/bedrock/ts/world/worldgen/core/world_gen/structures.ts
import { world as world27, StructureRotation, StructureMirrorAxis, StructureAnimationMode } from "@minecraft/server";
var MINI_TOWER_TYPES = ["amethyst_tower", "copal_tower", "jade_tower", "jet_tower"];
var MINI_TOWER_BIOMES = /* @__PURE__ */ new Set([
  "gaiadimension:pink_agate_forest",
  "gaiadimension:blue_agate_taiga",
  "gaiadimension:green_agate_jungle",
  "gaiadimension:purple_agate_swamp",
  "gaiadimension:mutant_agate_wildwood",
  "gaiadimension:fossil_woodland",
  "gaiadimension:crystal_plains"
]);
var MALACHITE_BIOMES = /* @__PURE__ */ new Set([
  "gaiadimension:pink_agate_forest",
  "gaiadimension:green_agate_jungle",
  "gaiadimension:crystal_plains"
]);
function getStructureChunkInRegion(chunkX, chunkZ, spacing, separation, salt, worldSeed, triangular) {
  const regionX = Math.floor(chunkX / spacing);
  const regionZ = Math.floor(chunkZ / spacing);
  const rngSeed = hashSeed(regionX, regionZ, worldSeed, salt);
  const rng = new SimpleRNG(rngSeed);
  const range = spacing - separation;
  let offsetX, offsetZ;
  if (triangular) {
    offsetX = Math.floor((rng.nextInt(range) + rng.nextInt(range)) / 2);
    offsetZ = Math.floor((rng.nextInt(range) + rng.nextInt(range)) / 2);
  } else {
    offsetX = rng.nextInt(range);
    offsetZ = rng.nextInt(range);
  }
  const structChunkX = regionX * spacing + offsetX;
  const structChunkZ = regionZ * spacing + offsetZ;
  if (chunkX === structChunkX && chunkZ === structChunkZ) {
    return { cx: structChunkX, cz: structChunkZ };
  }
  return null;
}
function hashSeed(regionX, regionZ, worldSeed, salt) {
  let hash = regionX * 341873 + regionZ * 132897 + worldSeed + salt;
  hash = (hash >>> 16 ^ hash) * 73244475;
  hash = (hash >>> 16 ^ hash) * 73244475;
  hash = hash >>> 16 ^ hash;
  return Math.abs(hash);
}
var SimpleRNG = class {
  state;
  constructor(seed2) {
    this.state = (seed2 ^ 25214903917) & 4294967295;
  }
  next() {
    this.state = this.state * 1103515245 + 12345 & 2147483647;
    return this.state;
  }
  nextInt(bound) {
    if (bound <= 0) return 0;
    return this.next() % bound;
  }
  nextFloat() {
    return this.next() / 2147483647;
  }
};
var ROTATIONS = [
  StructureRotation.None,
  StructureRotation.Rotate90,
  StructureRotation.Rotate180,
  StructureRotation.Rotate270
];
var PLACED_STRUCTURES = /* @__PURE__ */ new Set();
function getPlacementKey(chunkX, chunkZ, type2) {
  return `struct:${type2}:${chunkX},${chunkZ}`;
}
function placeStructuresForChunk(chunkX, chunkZ, dimension, worldSeed, getBiomeAt, getTerrainHeightAt) {
  const miniKey = getPlacementKey(chunkX, chunkZ, "mini_tower");
  if (!PLACED_STRUCTURES.has(miniKey)) {
    const miniResult = getStructureChunkInRegion(chunkX, chunkZ, 30, 10, 420, worldSeed, false);
    if (miniResult) {
      const worldX = miniResult.cx * 16 + 8;
      const worldZ = miniResult.cz * 16 + 8;
      const biome = getBiomeAt(worldX, worldZ);
      if (MINI_TOWER_BIOMES.has(biome.id)) {
        const typeRng = new SimpleRNG(hashSeed(miniResult.cx, miniResult.cz, worldSeed, 999));
        const towerIdx = typeRng.nextInt(MINI_TOWER_TYPES.length);
        const towerName = MINI_TOWER_TYPES[towerIdx];
        const rotation = ROTATIONS[typeRng.nextInt(4)];
        const surfaceY = getTerrainHeightAt(worldX, worldZ);
        placeMiniTower(dimension, worldX, surfaceY, worldZ, towerName, rotation);
        PLACED_STRUCTURES.add(miniKey);
      }
    }
  }
  const malKey = getPlacementKey(chunkX, chunkZ, "malachite_watchtower");
  if (!PLACED_STRUCTURES.has(malKey)) {
    const malResult = getStructureChunkInRegion(chunkX, chunkZ, 35, 15, 621, worldSeed, true);
    if (malResult) {
      const worldX = malResult.cx * 16 + 8;
      const worldZ = malResult.cz * 16 + 8;
      const biome = getBiomeAt(worldX, worldZ);
      if (MALACHITE_BIOMES.has(biome.id)) {
        const typeRng = new SimpleRNG(hashSeed(malResult.cx, malResult.cz, worldSeed, 1337));
        const rotation = ROTATIONS[typeRng.nextInt(4)];
        const surfaceY = getTerrainHeightAt(worldX, worldZ);
        placeMalachiteTower(dimension, worldX, surfaceY, worldZ, rotation);
        PLACED_STRUCTURES.add(malKey);
      }
    }
  }
}
function placeMiniTower(dimension, x, surfaceY, z, towerName, rotation) {
  try {
    const structureId = `mystructure:${towerName}`;
    const placeY = Math.floor(surfaceY);
    const options = {
      rotation,
      mirror: StructureMirrorAxis.None,
      animationMode: StructureAnimationMode.None,
      includeEntities: true,
      includeBlocks: true,
      waterlogged: false
    };
    world27.structureManager.place(structureId, dimension, { x, y: placeY, z }, options);
    fillSupportColumn(dimension, x, placeY, z, 17);
  } catch (e) {
    console.warn(`[GaiaDim] Failed to place ${towerName} at ${x},${surfaceY},${z}:`, e);
  }
}
function placeMalachiteTower(dimension, x, surfaceY, z, rotation) {
  try {
    const structureId = "mystructure:malachite_tower";
    const placeY = Math.floor(surfaceY);
    const options = {
      rotation,
      mirror: StructureMirrorAxis.None,
      animationMode: StructureAnimationMode.None,
      includeEntities: true,
      includeBlocks: true,
      waterlogged: false
    };
    world27.structureManager.place(structureId, dimension, { x, y: placeY, z }, options);
    fillSupportColumn(dimension, x, placeY, z, 25);
  } catch (e) {
    console.warn(`[GaiaDim] Failed to place malachite_tower at ${x},${surfaceY},${z}:`, e);
  }
}
function fillSupportColumn(dimension, centerX, baseY, centerZ, width) {
  const half = Math.floor(width / 2);
  const step = 4;
  for (let dx = -half; dx <= half; dx += step) {
    for (let dz = -half; dz <= half; dz += step) {
      const bx = centerX + dx;
      const bz = centerZ + dz;
      for (let y = baseY - 1; y > baseY - 15; y--) {
        try {
          const block = dimension.getBlock({ x: bx, y, z: bz });
          if (!block) break;
          if (block.typeId !== "minecraft:air" && !block.isLiquid) break;
          block.setType("gaiadimension:heavy_soil");
        } catch (_) {
          break;
        }
      }
    }
  }
}

// src/main/bedrock/ts/world/worldgen/core/world_gen/generator.ts
var SEA_LEVEL = 63;
var ENTRY = 0;
var STONE_DEPTH = 10;
var SOIL_DEPTH = 4;
function setBlock(block, type2) {
  if (!block) return false;
  if (block.typeId !== type2) {
    try {
      block.setType(type2);
    } catch (_) {
      return false;
    }
  }
  return true;
}
var ChunkGenerator = class _ChunkGenerator {
  seaLevel = SEA_LEVEL;
  entry = ENTRY;
  manager;
  dimension;
  dimensionId;
  range;
  seed;
  isGenerating = /* @__PURE__ */ new Set();
  // Java Edition 5x5 Parabolic Biome Weight Matrix
  static biomeWeights = [];
  static {
    for (let rx = -2; rx <= 2; ++rx) {
      for (let rz = -2; rz <= 2; ++rz) {
        const weight = 10 / Math.sqrt(rx * rx + rz * rz + 0.2);
        _ChunkGenerator.biomeWeights[rx + 2 + (rz + 2) * 5] = weight;
      }
    }
  }
  // Noise layers for terrain shape
  base;
  spikes;
  kind;
  overall;
  deep;
  trees;
  // Layer-based biome lookup (ported from Java)
  layerFn;
  // Biome cache: biome name -> BiomeDefinition
  biomeCache = /* @__PURE__ */ new Map();
  constructor(sessionManager, dimension, seed2) {
    this.manager = sessionManager;
    this.dimension = dimension;
    this.dimensionId = dimension.id;
    this.range = dimension.heightRange;
    this.seed = seed2;
    this.layerFn = buildGaiaLayers(seed2.seed);
    this.base = new FastNoiseLite(seed2.nextInt());
    this.base.SetNoiseType(FastNoiseLite.NoiseType.Perlin);
    this.base.SetFractalType(FastNoiseLite.FractalType.FBm);
    this.base.SetFractalOctaves(2);
    this.base.SetFrequency(0.01);
    this.spikes = new FastNoiseLite(seed2.nextInt());
    this.spikes.SetNoiseType(FastNoiseLite.NoiseType.Cellular);
    this.spikes.SetCellularJitter(1.2);
    this.spikes.SetFrequency(0.02);
    this.kind = new FastNoiseLite(seed2.nextInt());
    this.kind.SetFrequency(8e-4);
    this.overall = new FastNoiseLite(seed2.nextInt());
    this.overall.SetFrequency(0.02);
    this.deep = new FastNoiseLite(seed2.nextInt());
    this.deep.SetFrequency(4e-4);
    this.trees = new FastNoiseLite(seed2.nextInt());
    this.trees.SetFrequency(3e-3);
  }
  /**
   * Get the biome at a world (block) coordinate using the Java layer system.
   * The layers operate on biome-grid coords (Ã·4), matching Java's getNoiseBiome(x/4, y, z/4).
   */
  getBiomeAt(x, z) {
    const bx = x >> 2, bz = z >> 2;
    const biomeId = this.layerFn(bx, bz);
    const name = getBiomeNameFromId(biomeId);
    let cached = this.biomeCache.get(name);
    if (cached) return cached;
    const bm2 = this.manager.definition?.biomeManager;
    if (bm2) {
      cached = bm2.biomes.find((b) => b.id === name);
      if (cached) {
        this.biomeCache.set(name, cached);
        return cached;
      }
    }
    return bm2?.default ?? new BiomeDefinition(name);
  }
  getTerrainHeight(x, z) {
    const { base, spikes, kind, overall, deep } = this;
    const s = spikes.GetNoise(x, z) * 0.7 + 1;
    const b = base.GetNoise(x, z) + 1;
    const k = kind.GetNoise(x, z) / 2;
    const o = (overall.GetNoise(x, z) + 1) / 2;
    const d = (deep.GetNoise(x, z) + 1) / 2;
    const waterProp = Math.max(0, Math.min(1, d * 5));
    const height = (s * 2.5 * (0.8 + k) + b * Math.max(0, 0.5 + k) * 8 + o * (0.8 + k)) * (waterProp / 2 + 0.5) + waterProp * 3.5;
    return height;
  }
  /**
   * 1:1 Java port of GaiaTerrainWarp.fillNoiseColumn lines 61-86.
   * Computes the low-frequency biome depth and scale blending.
   * This is sampled at 4-block cell corners and bilinearly interpolated
   * across the chunk to create smooth slopes at biome boundaries.
   */
  getBiomeBlend(x, z) {
    const centerBiome = this.getBiomeAt(x, z);
    const centerDepth = centerBiome.depth;
    let scaleSum = 0;
    let depthSum = 0;
    let weightSum = 0;
    for (let rx = -2; rx <= 2; rx++) {
      for (let rz = -2; rz <= 2; rz++) {
        const b = this.getBiomeAt(x + rx * 4, z + rz * 4);
        const offD = b.depth;
        const offS = b.scale;
        const depthPenalty = offD > centerDepth ? 0.5 : 1;
        const w = depthPenalty * _ChunkGenerator.biomeWeights[rx + 2 + (rz + 2) * 5] / (offD + 2);
        scaleSum += offS * w;
        depthSum += offD * w;
        weightSum += w;
      }
    }
    const avgDepth = depthSum / weightSum;
    const avgScale = scaleSum / weightSum;
    const depthOffset = (avgDepth * 0.5 - 0.125) * 0.265625;
    const scaleFactor = 96 / (avgScale * 0.9 + 0.1);
    return { depthOffset, scaleFactor, avgScale };
  }
  buildChunk(X, Z, hash) {
    if (this.isGenerating.has(hash)) return Promise.resolve(true);
    if (this.isGenerated(hash)) return Promise.resolve(true);
    this.isGenerating.add(hash);
    return new Promise((resolve) => {
      const failRef = { count: 0 };
      system35.runJob(this.generate(X, Z, failRef, () => {
        this.isGenerating.delete(hash);
        if (failRef.count === 0) {
          this.setGenerated(hash);
          try {
            placeStructuresForChunk(
              X,
              Z,
              this.dimension,
              this.seed.seed,
              (x, z) => this.getBiomeAt(x, z),
              (x, z) => {
                const raw = this.getTerrainHeight(x, z);
                const blend = this.getBiomeBlend(x, z);
                return Math.floor(68 + 128 * blend.depthOffset + 128 * (raw * 10) / blend.scaleFactor);
              }
            );
          } catch (e) {
            console.warn(`[GaiaDim] Structure placement error in chunk ${X},${Z}:`, e);
          }
          resolve(true);
        } else {
          resolve(false);
        }
      }));
    });
  }
  isGenerated(hash) {
    return this.manager.isGenerated(hash + this.dimensionId);
  }
  setGenerated(hash) {
    this.manager.setGenerated(hash + this.dimensionId);
  }
  /**
   * Single-pass chunk generator: stone -> soil -> surface grass -> vegetation -> trees.
   * Yields every X-row to prevent watchdog timeout.
   */
  *generate(X, Z, failRef, done) {
    const { dimension: dim } = this;
    const random = this.seed.getSeqence(X, Z);
    const worldX = X * 16, worldZ = Z * 16;
    const placedTrees = [];
    const terrainMap = new Array(256);
    const biomeMap = new Array(256);
    const underwaterMap = new Array(256);
    try {
      const CELL = 4;
      const CELLS_X = 16 / CELL;
      const CELLS_Z = 16 / CELL;
      const corners = [];
      for (let cx = 0; cx <= CELLS_X; cx++) {
        corners[cx] = [];
        for (let cz = 0; cz <= CELLS_Z; cz++) {
          corners[cx][cz] = this.getBiomeBlend(worldX + cx * CELL, worldZ + cz * CELL);
        }
      }
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          const xx = worldX + x, zz = worldZ + z;
          const jitterX = Math.round(this.spikes.GetNoise(xx * 2, zz * 2) * 5);
          const jitterZ = Math.round(this.spikes.GetNoise(xx * 2 + 1e3, zz * 2 + 1e3) * 5);
          const biome = this.getBiomeAt(xx + jitterX, zz + jitterZ);
          const cellX = Math.floor(x / CELL);
          const cellZ = Math.floor(z / CELL);
          const fracX = (x - cellX * CELL) / CELL;
          const fracZ = (z - cellZ * CELL) / CELL;
          const c00 = corners[cellX][cellZ];
          const c10 = corners[cellX + 1][cellZ];
          const c01 = corners[cellX][cellZ + 1];
          const c11 = corners[cellX + 1][cellZ + 1];
          const depthOffset = c00.depthOffset + (c10.depthOffset - c00.depthOffset) * fracX + (c01.depthOffset - c00.depthOffset) * fracZ + (c00.depthOffset - c10.depthOffset - c01.depthOffset + c11.depthOffset) * fracX * fracZ;
          const scaleFactor = c00.scaleFactor + (c10.scaleFactor - c00.scaleFactor) * fracX + (c01.scaleFactor - c00.scaleFactor) * fracZ + (c00.scaleFactor - c10.scaleFactor - c01.scaleFactor + c11.scaleFactor) * fracX * fracZ;
          const avgScale = c00.avgScale + (c10.avgScale - c00.avgScale) * fracX + (c01.avgScale - c00.avgScale) * fracZ + (c00.avgScale - c10.avgScale - c01.avgScale + c11.avgScale) * fracX * fracZ;
          const raw = this.getTerrainHeight(xx, zz);
          let terrain = Math.floor(68 + 128 * depthOffset + 128 * (raw * 10) / scaleFactor);
          if (isNaN(terrain) || !isFinite(terrain)) terrain = ENTRY;
          terrain = Math.max(this.range.min, Math.min(this.range.max - 1, terrain));
          const groundId = biome.groundPaletted?.permutations?.[0] ?? "gaiadimension:crystal_plains_glitter_grass";
          const underId = biome.underGroundPaletted?.permutations?.[0] ?? "gaiadimension:heavy_soil";
          const isUnderwater = terrain < SEA_LEVEL;
          const stoneStart = Math.max(this.range.min, terrain - (STONE_DEPTH + SOIL_DEPTH));
          for (let y = stoneStart; y < terrain - SOIL_DEPTH; y++) {
            if (!setBlock(dim.getBlock({ x: xx, y, z: zz }), "gaiadimension:gaia_stone")) failRef.count++;
          }
          for (let y = terrain - SOIL_DEPTH; y < terrain; y++) {
            if (!setBlock(dim.getBlock({ x: xx, y, z: zz }), underId)) failRef.count++;
          }
          try {
            const surfaceBlock = dim.getBlock({ x: xx, y: terrain, z: zz });
            if (surfaceBlock) {
              if (isUnderwater && groundId.includes("grass")) surfaceBlock.setType(underId);
              else surfaceBlock.setType(groundId);
            }
          } catch (_) {
          }
          if (isUnderwater) {
            for (let y = terrain + 1; y <= SEA_LEVEL; y++) {
              const waterBlock = dim.getBlock({ x: xx, y, z: zz });
              if (waterBlock) {
                try {
                  waterBlock.setType("gaiadimension:mineral_water");
                } catch (_) {
                }
              }
            }
          }
          if (!isUnderwater && (biome.vegetationPalette?.permutations?.length ?? 0) > 0) {
            if (random.nextFloat() < biome.vegetationChance) {
              const idx = Math.floor(random.nextFloat() * biome.vegetationPalette.permutations.length);
              const vegId = biome.vegetationPalette.permutations[idx];
              if (vegId) {
                const vBlock = dim.getBlock({ x: xx, y: terrain + 1, z: zz });
                if (vBlock && vBlock.typeId === "minecraft:air") {
                  try {
                    vBlock.setType(vegId);
                  } catch (_) {
                  }
                }
              }
            }
          }
          terrainMap[x * 16 + z] = terrain;
          biomeMap[x * 16 + z] = biome;
          underwaterMap[x * 16 + z] = isUnderwater;
        }
        yield;
      }
      const centerBiome = biomeMap[8 * 16 + 8] || biomeMap[0];
      if (centerBiome && centerBiome.hasTrees && centerBiome.treesPerChunk >= 0) {
        let totalTrees = centerBiome.treesPerChunk;
        if (random.nextFloat() < centerBiome.treesExtraChance) {
          totalTrees += centerBiome.treesExtra;
        }
        let placed = 0;
        for (let t = 0; t < totalTrees; t++) {
          const tx = Math.floor(random.nextFloat() * 16);
          const tz = Math.floor(random.nextFloat() * 16);
          const tIdx = tx * 16 + tz;
          if (underwaterMap[tIdx]) continue;
          const terrain = terrainMap[tIdx];
          if (terrain === void 0) continue;
          const txx = worldX + tx;
          const tzz = worldZ + tz;
          let tooClose = false;
          for (const pt of placedTrees) {
            if (Math.abs(pt.x - txx) < 3 && Math.abs(pt.z - tzz) < 3) {
              tooClose = true;
              break;
            }
          }
          if (tooClose) continue;
          const biome = biomeMap[tIdx] || centerBiome;
          const treeDef = biome.trees.get(random.nextFloat());
          if (treeDef) {
            const above = dim.getBlock({ x: txx, y: terrain + 1, z: tzz });
            if (above && above.typeId === "minecraft:air") {
              try {
                yield* this.placeTree(dim, txx, terrain + 1, tzz, treeDef, random);
                placedTrees.push({ x: txx, z: tzz });
                placed++;
              } catch (treeErr) {
                console.warn(`[GaiaDim] Tree place failed at ${txx},${terrain + 1},${tzz}: ${treeErr}`);
              }
            }
          }
        }
      }
      done();
    } catch (e) {
      console.error(`[GaiaDim] Chunk ${X},${Z} error:`, e);
      done();
    }
  }
  *placeTree(dim, x, baseY, z, treeDef, random) {
    const logId = treeDef.logPaletted?.permutations?.[0];
    const leafId = treeDef.leavesPaletted?.permutations?.[0] ?? treeDef.carpetPaletted?.permutations?.[0];
    if (!logId) return;
    const minH = treeDef.height?.[0] ?? 5;
    const maxH = treeDef.height?.[1] ?? 11;
    const h = minH + Math.floor(random.nextFloat() * (maxH - minH + 1));
    const treeId = treeDef.id || "";
    let attachments;
    if (treeId === "green_agate") {
      attachments = placeThickTrunk(dim, x, baseY, z, h, logId);
    } else if (treeId === "purple_agate") {
      attachments = placeCardinalTrunk(dim, x, baseY, z, h, logId);
    } else if (treeId === "aura") {
      attachments = placeFourBranchTrunk(dim, x, baseY, z, h, logId);
    } else if (treeId === "golden_small" || treeId === "golden_big") {
      attachments = placeVaryingFourBranchTrunk(dim, x, baseY, z, h, logId, random);
    } else if (treeId === "green_agate_bush") {
      setBlock(dim.getBlock({ x, y: baseY, z }), logId);
      attachments = [{ x, y: baseY + 1, z }];
    } else {
      for (let i = 0; i < h; i++) {
        setBlock(dim.getBlock({ x, y: baseY + i, z }), logId);
      }
      attachments = [{ x, y: baseY + h, z }];
    }
    if (!leafId) return;
    for (const att of attachments) {
      placeFoliageForTree(dim, att.x, att.y, att.z, treeId, leafId, random);
    }
    yield;
  }
};
function placeThickTrunk(dim, x, baseY, z, h, logId) {
  for (let y = 0; y < h; y++) {
    const wy = baseY + y;
    if (y === 0) {
      setBlock(dim.getBlock({ x, y: wy, z: z - 2 }), logId);
      setBlock(dim.getBlock({ x, y: wy, z: z + 2 }), logId);
      setBlock(dim.getBlock({ x: x + 2, y: wy, z }), logId);
      setBlock(dim.getBlock({ x: x - 2, y: wy, z }), logId);
    }
    if (y < Math.floor(h / 4)) {
      setBlock(dim.getBlock({ x: x + 1, y: wy, z: z + 1 }), logId);
      setBlock(dim.getBlock({ x: x + 1, y: wy, z: z - 1 }), logId);
      setBlock(dim.getBlock({ x: x - 1, y: wy, z: z + 1 }), logId);
      setBlock(dim.getBlock({ x: x - 1, y: wy, z: z - 1 }), logId);
    }
    setBlock(dim.getBlock({ x, y: wy, z }), logId);
    setBlock(dim.getBlock({ x, y: wy, z: z - 1 }), logId);
    setBlock(dim.getBlock({ x, y: wy, z: z + 1 }), logId);
    setBlock(dim.getBlock({ x: x + 1, y: wy, z }), logId);
    setBlock(dim.getBlock({ x: x - 1, y: wy, z }), logId);
  }
  return [{ x, y: baseY + h, z }];
}
function placeCardinalTrunk(dim, x, baseY, z, h, logId) {
  const atts = [];
  for (let y = 0; y <= h - 2; y++) {
    setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
  }
  const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  for (const [sx, sz] of dirs) {
    let bx = sx, bz = sz;
    setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 2, z: z + bz }), logId);
    setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 1, z: z + bz }), logId);
    bx += sx;
    bz += sz;
    setBlock(dim.getBlock({ x: x + bx, y: baseY + h - 1, z: z + bz }), logId);
    bx += sx;
    bz += sz;
    setBlock(dim.getBlock({ x: x + bx, y: baseY + h, z: z + bz }), logId);
    bx += sx;
    bz += sz;
    setBlock(dim.getBlock({ x: x + bx, y: baseY + h, z: z + bz }), logId);
    bx += sx;
    bz += sz;
    atts.push({ x: x + bx, y: baseY + h, z: z + bz });
  }
  return atts;
}
function placeFourBranchTrunk(dim, x, baseY, z, h, logId) {
  const atts = [];
  for (let y = 0; y < h; y++) {
    setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
  }
  const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  for (const [sx, sz] of dirs) {
    let bx = sx, bz = sz;
    const startY = Math.floor(h / 2);
    for (let y = startY; y < h; y++) {
      setBlock(dim.getBlock({ x: x + bx, y: baseY + y, z: z + bz }), logId);
      if (y === h - 1) {
        atts.push({ x: x + bx, y: baseY + y + 1, z: z + bz });
      }
      if (y % 2 === 0) {
        bx += sx;
        bz += sz;
      }
    }
  }
  atts.push({ x, y: baseY + h, z });
  return atts;
}
function placeVaryingFourBranchTrunk(dim, x, baseY, z, h, logId, random) {
  const atts = [];
  const halfH = Math.floor(h / 2);
  for (let y = 0; y <= halfH; y++) {
    setBlock(dim.getBlock({ x, y: baseY + y, z }), logId);
  }
  const dirs = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  for (const [sx, sz] of dirs) {
    let bx = 0, bz = 0;
    const offset = Math.floor(random.nextFloat() * 3);
    const startY = halfH - offset;
    const branchLen = Math.floor(random.nextFloat() * 3) + 2;
    for (let i = 0; i < branchLen; i++) {
      bx += sx;
      bz += sz;
      setBlock(dim.getBlock({ x: x + bx, y: baseY + startY, z: z + bz }), logId);
    }
    for (let y = startY; y <= h - offset; y++) {
      setBlock(dim.getBlock({ x: x + bx, y: baseY + y, z: z + bz }), logId);
    }
    atts.push({ x: x + bx, y: baseY + h - offset, z: z + bz });
  }
  return atts;
}
function placeFoliageForTree(dim, cx, cy, cz, treeId, leafId, random) {
  if (treeId === "green_agate") {
    placeLeavesRowThick(dim, cx, cy, cz, 1, -4, leafId, random);
    placeLeavesRowThick(dim, cx, cy, cz, 2, -3, leafId, random);
    placeLeavesRowThick(dim, cx, cy, cz, 3, -2, leafId, random);
    placeLeavesRowThick(dim, cx, cy, cz, 3, -1, leafId, random);
    placeLeavesRowThick(dim, cx, cy, cz, 2, 0, leafId, random);
  } else if (treeId === "purple_agate") {
    for (let y = 1; y >= -1; y--) {
      placeLeavesRowBulb(dim, cx, cy, cz, 1, -y, leafId);
    }
  } else if (treeId === "blue_agate") {
    const crownHeight = 1 + Math.floor(random.nextFloat() * 2);
    const foliageH = 4 + Math.floor(random.nextFloat() * 3);
    let r = 0;
    for (let y = foliageH; y >= 0; y--) {
      placeLeavesRowDefault(dim, cx, cy - (foliageH - y), cz, r, 0, leafId, random);
      if (r >= 1 && y > 0 && y < crownHeight) r--;
      else if (r < 2 + Math.floor(random.nextFloat() * 2)) r++;
    }
  } else if (treeId === "corrupted") {
    const crownH = 3 + Math.floor(random.nextFloat() * 2);
    for (let y = 0; y <= crownH; y++) {
      const lr = y === 0 || y === crownH ? 0 : 1;
      placeLeavesRowDefault(dim, cx, cy, cz, lr, -y, leafId, random);
    }
  } else if (treeId === "golden_small") {
    for (let y = 1; y >= -1; y--) placeLeavesRowCube(dim, cx, cy, cz, 1, -y, leafId);
  } else if (treeId === "golden_big") {
    for (let y = 2; y >= -2; y--) placeLeavesRowCube(dim, cx, cy, cz, 2, -y, leafId);
  } else if (treeId === "green_agate_bush") {
    for (let y = 2; y >= 0; y--) placeLeavesRowBush(dim, cx, cy, cz, 2, -y, leafId, random);
  } else if (treeId === "pink_agate" || treeId === "fossilized") {
    placeLeavesRowCapped(dim, cx, cy, cz, 1, -5, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 2, -4, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 3, -3, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 3, -2, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
  } else if (treeId === "aura") {
    placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
  } else {
    placeLeavesRowCapped(dim, cx, cy, cz, 2, -1, leafId, random);
    placeLeavesRowCapped(dim, cx, cy, cz, 1, 0, leafId, random);
  }
}
function placeLeavesRowCapped(dim, cx, cy, cz, radius, yOff, leafId, random) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const ax = Math.abs(dx), az = Math.abs(dz);
      if (yOff === 0) {
        if ((ax > 1 || az > 1) && ax !== 0 && az !== 0) continue;
      } else {
        if (ax === radius && az === radius && radius > 0) continue;
      }
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function placeLeavesRowThick(dim, cx, cy, cz, radius, yOff, leafId, random) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const ax = Math.abs(dx), az = Math.abs(dz);
      if (yOff === 0) {
        if ((ax > 1 || az > 1) && ax !== 0 && az !== 0) continue;
      } else if (yOff <= -4) {
      } else {
        if (ax === radius && az === radius && radius > 0) continue;
      }
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function placeLeavesRowBulb(dim, cx, cy, cz, radius, yOff, leafId) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) === radius && Math.abs(yOff) === radius && Math.abs(dz) === radius) continue;
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function placeLeavesRowCube(dim, cx, cy, cz, radius, yOff, leafId) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function placeLeavesRowBush(dim, cx, cy, cz, radius, yOff, leafId, random) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) === radius && Math.abs(dz) === radius && random.nextFloat() < 0.5) continue;
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function placeLeavesRowDefault(dim, cx, cy, cz, radius, yOff, leafId, random) {
  const y = cy + yOff;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) === radius && Math.abs(dz) === radius && radius > 0) continue;
      setLeaf(dim, cx + dx, y, cz + dz, leafId);
    }
  }
}
function setLeaf(dim, x, y, z, leafId) {
  const block = dim.getBlock({ x, y, z });
  if (block && block.typeId === "minecraft:air") {
    try {
      block.setType(leafId);
    } catch (_) {
    }
  }
}

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-manager.ts
import { world as world28, system as system36 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/definitions/biome-manager.ts
var BiomeManager = class {
  definition;
  biomes;
  table;
  default;
  constructor(definition, defaultBiome) {
    this.definition = definition;
    this.biomes = [];
    this.table = null;
    this.default = defaultBiome;
    definition.finialize.subscribe(() => this.selfFinialize());
  }
  addBiome(biome) {
    this.biomes.push(biome);
  }
  selfFinialize() {
    const tempSteps = 20;
    const humiSteps = 20;
    let array = [];
    for (let i = 0; i < tempSteps; i++) {
      const temp = i / tempSteps;
      const currentBiomes = [];
      const tempMatches = this.biomes.filter((b) => temp >= b.temperature[0] && temp < b.temperature[1]);
      for (let j = 0; j < humiSteps; j++) {
        const humi = j / humiSteps;
        const match = tempMatches.find((b) => humi >= b.humidity[0] && humi < b.humidity[1]) ?? this.default;
        currentBiomes.push(match);
      }
      array.push(currentBiomes);
    }
    this.table = array;
  }
  getBiome(temperature, humidity) {
    if (!this.table) return this.default;
    const tempIdx = Math.floor(temperature * (this.table.length - 1));
    const tempSlice = this.table[Math.max(0, Math.min(tempIdx, this.table.length - 1))];
    const humiIdx = Math.floor(humidity * (tempSlice.length - 1));
    return tempSlice[Math.max(0, Math.min(humiIdx, tempSlice.length - 1))] ?? this.default;
  }
  onPrecalculate(samples, seed2) {
    this.biomes.forEach((e) => e.onPrecalculate(samples, seed2));
  }
};

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-manager.ts
var DefinitionManager = class {
  /**@readonly */
  finialize;
  /**@readonly */
  precalculate;
  /**@readonly */
  treeDefinitions;
  biomeManager;
  __precalculated;
  __precalculatedSamples;
  constructor() {
    this.finialize = new NativeEvent();
    this.precalculate = new NativeEvent();
    this.treeDefinitions = /* @__PURE__ */ new Map();
    this.biomeManager = new BiomeManager(this, new BiomeDefinition("gaiadimension:crystal_plains"));
    this.__precalculated = true;
    this.__precalculatedSamples = 15;
    system36.run(() => {
      this.__precalculated = world28.getDynamicProperty("property-precalculated") ?? true;
      this.__precalculatedSamples = world28.getDynamicProperty("property-precalculated-sampling") ?? 15;
      if (this.__precalculatedSamples > 50) this.__precalculatedSamples = 50;
    });
  }
  get IsPrecalculated() {
    return this.__precalculated;
  }
  set IsPrecalculated(v) {
    this.__precalculated = v;
    world28.setDynamicProperty("property-precalculated", v);
  }
  get PrecalculatedSamples() {
    return this.__precalculatedSamples;
  }
  set PrecalculatedSamples(v) {
    this.__precalculatedSamples = v;
    world28.setDynamicProperty("property-precalculated-sampling", v);
  }
  get IsPrecalculatedVariable() {
    return world28.getDynamicProperty("property-precalculated") ?? false;
  }
  get IsPrecalculatedSamplesVariable() {
    return world28.getDynamicProperty("property-precalculated-sampling") ?? 10;
  }
  triggerFinialize(seed2) {
    system36.run(() => {
      this.finialize.subscribe(() => {
        let time = Date.now();
        this.biomeManager.selfFinialize();
        if (this.__precalculated) this.biomeManager.onPrecalculate(this.__precalculatedSamples, seed2);
      });
      this.finialize.trigger(seed2);
    });
  }
};

// src/main/bedrock/ts/world/worldgen/core/definitions/index.ts
var DEFINITION_MANAGER = new DefinitionManager();

// src/main/bedrock/ts/world/worldgen/core/world_gen/session-manager.ts
var SessionManager = class {
  generators;
  seed;
  procedural;
  definition;
  constructor(seed2) {
    this.generators = /* @__PURE__ */ new Map();
    this.seed = Math.ceil(seed2);
    this.procedural = new ProceduralRandom(this.seed);
    this.definition = DEFINITION_MANAGER;
    this.getOrCreateGenerator("gaiadimension:gaia_dimension");
    for (let i = 0; i < REALM_COUNT; i++) {
      const realmId = `${REALM_PREFIX}${i}`;
      this.getOrCreateGenerator(realmId, i);
    }
  }
  getOrCreateGenerator(dimensionId, realmIndex) {
    if (this.generators.has(dimensionId)) return this.generators.get(dimensionId);
    try {
      const dimension = world29.getDimension(dimensionId);
      const genSeed = realmIndex !== void 0 ? new ProceduralRandom(this.seed + (realmIndex + 1) * 7919) : this.procedural;
      const gen = new ChunkGenerator(this, dimension, genSeed);
      this.generators.set(dimensionId, gen);
      return gen;
    } catch (e) {
      return void 0;
    }
  }
  get(dimension) {
    return this.getOrCreateGenerator(dimension.id);
  }
  isGenerated(hash) {
    return !!world29.getDynamicProperty(hash);
  }
  setGenerated(hash) {
    world29.setDynamicProperty(hash, true);
  }
  getBiome(temp, humi) {
    return this.definition.biomeManager.getBiome(temp, humi);
  }
};

// src/main/bedrock/ts/world/worldgen/core/world_gen/index.ts
var seed;
system37.run(() => {
  let savedSeed = world30.getDynamicProperty("seed");
  if (!savedSeed) {
    savedSeed = Math.ceil(Date.now() * Math.random() * 2);
    world30.setDynamicProperty("seed", savedSeed);
  }
  seed = savedSeed;
  SESSION_MANAGER.init(seed);
});
var SessionManagerProxy = class {
  _instance;
  _readyPromise;
  _resolveReady;
  constructor() {
    this._readyPromise = new Promise((r) => this._resolveReady = r);
  }
  init(seed2) {
    this._instance = new SessionManager(seed2);
    this._resolveReady();
  }
  /** Resolves once init(seed) has been called and the SessionManager is live. */
  get ready() {
    return this._readyPromise;
  }
  get instance() {
    return this._instance;
  }
  // Proxy common methods used by the generator
  get(dim) {
    return this._instance?.get(dim);
  }
  get seed() {
    return this._instance?.seed ?? 0;
  }
  get procedural() {
    return this._instance?.procedural;
  }
};
var SESSION_MANAGER = new SessionManagerProxy();

// src/main/bedrock/ts/world/worldgen/core/client/index.ts
var initializedPlayers = /* @__PURE__ */ new Set();
world31.afterEvents.worldLoad.subscribe(() => (async () => {
  await SESSION_MANAGER.ready;
  DEFINITION_MANAGER.triggerFinialize(SESSION_MANAGER.procedural);
  for (const p of world31.getAllPlayers()) {
    playerInitialize(p).catch((e) => console.error(e));
  }
})().catch((e) => console.error(e, e.stack)));
world31.afterEvents.playerSpawn.subscribe((e) => {
  if (e.initialSpawn) {
    playerInitialize(e.player).catch((err) => console.error(err));
  }
});
world31.beforeEvents.playerLeave.subscribe((e) => {
  initializedPlayers.delete(e.player.id);
  ClientChunk.open(SESSION_MANAGER, e.player).stop();
});
async function playerInitialize(player) {
  if (initializedPlayers.has(player.id)) return;
  initializedPlayers.add(player.id);
  await SESSION_MANAGER.ready;
  const local = ClientChunk.open(SESSION_MANAGER, player);
  local.start();
}

// src/main/bedrock/ts/world/worldgen/core/my_world/biomes.ts
var pinkAgateTree = new SpruceTreeDefinition();
pinkAgateTree.id = "pink_agate";
pinkAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:pink_agate_log"));
pinkAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:pink_agate_leaves"));
pinkAgateTree.setHeight(5, 11);
var blueAgateTree = new SpruceTreeDefinition();
blueAgateTree.id = "blue_agate";
blueAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:blue_agate_log"));
blueAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:blue_agate_leaves"));
blueAgateTree.setHeight(6, 9);
var greenAgateTree = new SpruceTreeDefinition();
greenAgateTree.id = "green_agate";
greenAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:green_agate_log"));
greenAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:green_agate_leaves"));
greenAgateTree.setHeight(10, 16);
var greenAgateBush = new SpruceTreeDefinition();
greenAgateBush.id = "green_agate_bush";
greenAgateBush.setLogPaletted(new PalettedBrush().add("gaiadimension:green_agate_log"));
greenAgateBush.setLeavesPaletted(new PalettedBrush().add("gaiadimension:green_agate_leaves"));
greenAgateBush.setHeight(1, 1);
var purpleAgateTree = new SpruceTreeDefinition();
purpleAgateTree.id = "purple_agate";
purpleAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:purple_agate_log"));
purpleAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:purple_agate_leaves"));
purpleAgateTree.setHeight(7, 13);
var fossilizedTree = new SpruceTreeDefinition();
fossilizedTree.id = "fossilized";
fossilizedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fossilized_log"));
fossilizedTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:fossilized_leaves"));
fossilizedTree.setHeight(5, 11);
var corruptedTree = new SpruceTreeDefinition();
corruptedTree.id = "corrupted";
corruptedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:corrupted_log"));
corruptedTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:corrupted_leaves"));
corruptedTree.setHeight(7, 11);
var burntAgateTree = new PillarTreeDefinition("burnt");
burntAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:burnt_log"));
burntAgateTree.setHeight(5, 11);
var fireAgateTree = new PillarTreeDefinition("fire");
fireAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fire_agate_log"));
fireAgateTree.setHeight(5, 11);
var auraTree = new SpruceTreeDefinition();
auraTree.id = "aura";
auraTree.setLogPaletted(new PalettedBrush().add("gaiadimension:aura_log"));
auraTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:aura_leaves"));
auraTree.setHeight(10, 16);
var goldenTree = new SpruceTreeDefinition();
goldenTree.id = "golden_small";
goldenTree.setLogPaletted(new PalettedBrush().add("gaiadimension:golden_log"));
goldenTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:golden_leaves"));
goldenTree.setHeight(7, 11);
var bigGoldenTree = new SpruceTreeDefinition();
bigGoldenTree.id = "golden_big";
bigGoldenTree.setLogPaletted(new PalettedBrush().add("gaiadimension:golden_log"));
bigGoldenTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:golden_leaves"));
bigGoldenTree.setHeight(9, 16);
var bm = DEFINITION_MANAGER.biomeManager;
bm.addBiome(new BiomeDefinition("gaiadimension:crystal_plains").setGroundPalette(new PalettedBrush().add("gaiadimension:crystal_plains_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 5).add("gaiadimension:crystal_growth_aura", 3).add("gaiadimension:thiscus", 2).add("gaiadimension:spotted_kersei", 1)).setVegetationChance(0.12).setDepth(0.05).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:pink_agate_forest").setGroundPalette(new PalettedBrush().add("gaiadimension:pink_agate_forest_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:spotted_kersei", 2).add("gaiadimension:bulbous_hobina", 1)).setVegetationChance(0.15).setTrees(new TreePalette().add(pinkAgateTree)).setTreesPerChunk(4, 0.1, 1).setDepth(0.1).setScale(0.1));
bm.addBiome(new BiomeDefinition("gaiadimension:blue_agate_taiga").setGroundPalette(new PalettedBrush().add("gaiadimension:blue_agate_taiga_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:mystical_murgni", 2).add("gaiadimension:thorny_wiltha", 1)).setVegetationChance(0.1).setTrees(new TreePalette().add(blueAgateTree)).setTreesPerChunk(1, 0.1, 1).setDepth(0.1).setScale(0.2));
bm.addBiome(new BiomeDefinition("gaiadimension:green_agate_jungle").setGroundPalette(new PalettedBrush().add("gaiadimension:green_agate_jungle_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:agathum", 2).add("gaiadimension:stickly_cupsir", 2).add("gaiadimension:ouzium", 1)).setVegetationChance(0.2).setTrees(new TreePalette().add(greenAgateTree).add(greenAgateBush)).setTreesPerChunk(5, 0.1, 1).setDepth(0.1).setScale(0.2));
bm.addBiome(new BiomeDefinition("gaiadimension:fossil_woodland").setGroundPalette(new PalettedBrush().add("gaiadimension:fossil_woodland_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 2).add("gaiadimension:sombre_shrub", 2)).setVegetationChance(0.08).setTrees(new TreePalette().add(fossilizedTree)).setTreesPerChunk(1, 0.1, 1).setDepth(0.1).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:volcanic_lands").setGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_seared", 3).add("gaiadimension:crystal_growth_red", 2)).setVegetationChance(0.04).setTrees(new TreePalette().add(burntAgateTree).add(fireAgateTree)).setTreesPerChunk(0, 0.1, 1).setDepth(1).setScale(0.7));
bm.addBiome(new BiomeDefinition("gaiadimension:static_wasteland").setGroundPalette(new PalettedBrush().add("gaiadimension:wasteland_stone")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:static_stone")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_black", 3).add("gaiadimension:crystal_growth_mutant", 2)).setVegetationChance(0.03).setDepth(3).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:salt_dunes").setGroundPalette(new PalettedBrush().add("gaiadimension:salt")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:saltstone")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 2)).setVegetationChance(0.02).setDepth(0.2).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:smoldering_bog").setGroundPalette(new PalettedBrush().add("gaiadimension:smoldering_bog_murky_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:boggy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_seared", 3).add("gaiadimension:roofed_agaric", 2).add("gaiadimension:corrupted_varloom", 1)).setVegetationChance(0.12).setTrees(new TreePalette().add(fireAgateTree)).setTreesPerChunk(0, 0.1, 1).setDepth(0.2).setScale(0.02));
bm.addBiome(new BiomeDefinition("gaiadimension:shining_grove").setGroundPalette(new PalettedBrush().add("gaiadimension:shining_grove_soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_aura", 5).add("gaiadimension:thiscus", 3).add("gaiadimension:spotted_kersei", 2)).setVegetationChance(0.15).setTrees(new TreePalette().add(auraTree)).setTreesPerChunk(2, 0.1, 1).setDepth(0.4).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:mookaite_mesa").setGroundPalette(new PalettedBrush().add("gaiadimension:mookaite_mesa_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:auburn_mookaite")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_red", 2).add("gaiadimension:gold_orb_tucher", 1)).setVegetationChance(0.03).setDepth(2).setScale(0.075));
bm.addBiome(new BiomeDefinition("gaiadimension:purple_agate_swamp").setGroundPalette(new PalettedBrush().add("gaiadimension:purple_agate_swamp_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth", 3).add("gaiadimension:corrupted_gaia_eye", 2).add("gaiadimension:corrupted_varloom", 2).add("gaiadimension:roofed_agaric", 1)).setVegetationChance(0.18).setTrees(new TreePalette().add(purpleAgateTree).add(corruptedTree)).setTreesPerChunk(1, 0.1, 2).setDepth(0).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:goldstone_lands").setGroundPalette(new PalettedBrush().add("gaiadimension:goldstone_lands_corrupted_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_black", 3).add("gaiadimension:corrupted_gaia_eye", 2)).setVegetationChance(0.06).setTrees(new TreePalette().add(corruptedTree)).setTreesPerChunk(1, 0.1, 1).setDepth(0.125).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:mutant_agate_wildwood").setGroundPalette(new PalettedBrush().add("gaiadimension:mutant_agate_wildwood_glitter_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:crystal_growth_mutant", 4).add("gaiadimension:crystal_growth", 2).add("gaiadimension:glamelea", 1)).setVegetationChance(0.18).setTrees(new TreePalette().add(pinkAgateTree).add(blueAgateTree).add(greenAgateTree).add(purpleAgateTree)).setTreesPerChunk(2, 0.1, 1).setDepth(0.1).setScale(0.1));
bm.addBiome(new BiomeDefinition("gaiadimension:golden_forest").setGroundPalette(new PalettedBrush().add("gaiadimension:golden_forest_gilded_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 4).add("gaiadimension:twinkling_gilsri", 2).add("gaiadimension:elder_imklia", 1)).setVegetationChance(0.14).setTrees(new TreePalette().add(goldenTree, 3).add(bigGoldenTree)).setTreesPerChunk(2, 0.1, 1).setDepth(0.35).setScale(0.15));
bm.addBiome(new BiomeDefinition("gaiadimension:golden_plains").setGroundPalette(new PalettedBrush().add("gaiadimension:golden_plains_gilded_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 5).add("gaiadimension:tall_golden_grass", 2)).setVegetationChance(0.16).setDepth(0.35).setScale(0.1));
bm.addBiome(new BiomeDefinition("gaiadimension:golden_hills").setGroundPalette(new PalettedBrush().add("gaiadimension:golden_hills_gilded_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 3)).setVegetationChance(0.06).setDepth(0.8).setScale(0.5));
bm.addBiome(new BiomeDefinition("gaiadimension:golden_sands").setGroundPalette(new PalettedBrush().add("gaiadimension:golden_sand")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:brilliant_stone")).setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 2)).setVegetationChance(0.03).setDepth(0.25).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:golden_marsh").setGroundPalette(new PalettedBrush().add("gaiadimension:golden_marsh_gilded_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil")).setVegetationPalette(new PalettedBrush().add("gaiadimension:golden_grass", 3).add("gaiadimension:twinkling_gilsri", 1)).setVegetationChance(0.1).setDepth(0.15).setScale(0.05));
bm.addBiome(new BiomeDefinition("gaiadimension:mineral_reservoir").setGroundPalette(new PalettedBrush().add("gaiadimension:pebbles")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:saltstone")).setVegetationPalette(new PalettedBrush()).setVegetationChance(0).setDepth(-1.8).setScale(0.1));
bm.addBiome(new BiomeDefinition("gaiadimension:mineral_river").setGroundPalette(new PalettedBrush().add("gaiadimension:pebbles")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:gaia_stone")).setVegetationPalette(new PalettedBrush()).setVegetationChance(0).setDepth(-0.8).setScale(0));

// src/main/bedrock/ts/API/lib/EnchantmentLib.ts
import { world as world32, system as system39, EquipmentSlot as EquipmentSlot6, GameMode as GameMode5 } from "@minecraft/server";
import { ActionFormData as ActionFormData2 } from "@minecraft/server-ui";
var EnchantmentManager = class {
  constructor() {
    this.registry = /* @__PURE__ */ new Map();
    this.uiCooldowns = /* @__PURE__ */ new Map();
    this.namespace = null;
    this.hitboxEntities = /* @__PURE__ */ new Map();
    this.isLeader = false;
    this.initEvents();
  }
  /**
   * Registers a new custom enchantment.
   * Auto-detects addon namespace from the first enchantment ID (e.g. 'decayed:wither_shot' -> 'decayed').
   */
  register(id, config) {
    if (!this.namespace && id.includes(":")) {
      this.namespace = id.split(":")[0];
    }
    this.registry.set(id, {
      id,
      name: config.name,
      bookId: config.bookId || `${id}_book`,
      maxLevel: config.maxLevel || 1,
      appliesTo: config.appliesTo || [],
      entityHitEntity: config.entityHitEntity,
      playerBreakBlock: config.playerBreakBlock,
      onHurt: config.onHurt,
      projectileHitBlock: config.projectileHitBlock,
      onTick: config.onTick,
      costPerLevel: config.costPerLevel || ((lvl) => lvl * 3),
      _costMultiplier: config.costMultiplier || 3
    });
  }
  get dummyEntityType() {
    return this.namespace ? `${this.namespace}:enchant_dummy` : null;
  }
  /**
   * Helper to find enchant ID from book item ID.
   */
  getEnchantFromBook(itemStack) {
    if (!itemStack) return null;
    for (const [id, config] of this.registry) {
      if (config.bookId === itemStack.typeId) {
        return id;
      }
    }
    return null;
  }
  initEvents() {
    system39.runInterval(() => this.manageVisuals(), 5);
    system39.runInterval(() => this.manageDummies(), 10);
    system39.runInterval(() => this.electLeader(), 20);
    world32.afterEvents.playerInteractWithEntity.subscribe((ev) => {
      if (!this.isLeader) return;
      const { player, target } = ev;
      if (!target.hasTag("mirage_enchant_dummy")) return;
      const now = Date.now();
      if (this.uiCooldowns.has(player.id) && now - this.uiCooldowns.get(player.id) < 1e3) {
        return;
      }
      this.uiCooldowns.set(player.id, now);
      world32.setDynamicProperty("mirage:shared_registry", JSON.stringify({}));
      player.runCommand(`scriptevent mirage:broadcast_enchants`);
      system39.runTimeout(() => {
        this.openEnchantmentUI(player);
      }, 3);
    });
    system39.afterEvents.scriptEventReceive.subscribe((ev) => {
      if (ev.id === "mirage:broadcast_enchants") {
        let shared = {};
        try {
          const data = world32.getDynamicProperty("mirage:shared_registry");
          if (data) shared = JSON.parse(data);
        } catch (e) {
        }
        for (const [id, config] of this.registry) {
          shared[id] = {
            id: config.id,
            name: config.name,
            maxLevel: config.maxLevel,
            appliesTo: config.appliesTo,
            _costMultiplier: config._costMultiplier
          };
        }
        world32.setDynamicProperty("mirage:shared_registry", JSON.stringify(shared));
      }
      if (ev.id === "mirage:apply_enchant") {
        try {
          const data = JSON.parse(ev.message);
          if (this.registry.has(data.enchantId)) {
            const player = ev.sourceEntity;
            if (!player) return;
            const inventory = player.getComponent("minecraft:inventory").container;
            const item = inventory.getItem(data.slot);
            if (!item || item.typeId !== data.itemTypeId) return;
            if (player.getGameMode() !== GameMode5.Creative) {
              player.addLevels(-data.cost);
            }
            this.applyEnchantment(item, data.enchantId, data.level);
            inventory.setItem(data.slot, item);
            player.dimension.spawnParticle("minecraft:enchanting_table_particle", player.location);
            player.playSound("random.levelup");
            const enchantName = this.registry.get(data.enchantId).name;
            player.sendMessage(`\xA7aSuccessfully enchanted with ${enchantName} ${data.level}!`);
          }
        } catch (e) {
        }
      }
    });
    world32.afterEvents.playerInteractWithBlock.subscribe((ev) => {
      if (!this.isLeader) return;
      const { player, block } = ev;
      if (!player.isSneaking) return;
      if (this.registry.size === 0) return;
      if (!block.typeId.includes("anvil")) return;
      const now = Date.now();
      if (this.uiCooldowns.has(player.id) && now - this.uiCooldowns.get(player.id) < 1e3) return;
      const equippable = player.getComponent("minecraft:equippable");
      const itemStack = equippable?.getEquipment(EquipmentSlot6.Mainhand);
      const enchantId = this.getEnchantFromBook(itemStack);
      if (enchantId) {
        this.uiCooldowns.set(player.id, now);
        player.dimension.spawnParticle("minecraft:villager_happy", {
          x: block.location.x + 0.5,
          y: block.location.y + 1,
          z: block.location.z + 0.5
        });
        player.playSound("random.anvil_use");
        this.openAnvilBookApplyUI(player, itemStack, enchantId);
      }
    });
    world32.afterEvents.playerPlaceBlock.subscribe((ev) => {
      const { block, player } = ev;
      if (block.typeId === "minecraft:enchanting_table") {
        player.sendMessage("\xA7d[Enchantment] \xA7eInteract with the table to access Custom Enchantments!");
      } else if (block.typeId.includes("anvil")) {
        player.sendMessage("\xA7d[Anvil] \xA7eSneak + Interact with a Custom Book to combine!");
      }
    });
    world32.afterEvents.entityHitEntity.subscribe((ev) => {
      const { damagingEntity, hitEntity } = ev;
      if (!damagingEntity || !damagingEntity.isValid || !damagingEntity.getComponent("minecraft:equippable")) return;
      const equippable = damagingEntity.getComponent("minecraft:equippable");
      const mainHand = equippable.getEquipment("Mainhand");
      if (mainHand) {
        this.triggerEnchants(mainHand, "entityHitEntity", ev);
      }
    });
    world32.afterEvents.playerBreakBlock.subscribe((ev) => {
      const { player, itemStack } = ev;
      if (itemStack) {
        this.triggerEnchants(itemStack, "playerBreakBlock", ev);
      }
    });
    world32.afterEvents.entityHurt.subscribe((ev) => {
      const { hurtEntity } = ev;
      if (!hurtEntity || !hurtEntity.isValid || !hurtEntity.getComponent("minecraft:equippable")) return;
      const equippable = hurtEntity.getComponent("minecraft:equippable");
      const armorSlots = ["Head", "Chest", "Legs", "Feet"];
      for (const slot of armorSlots) {
        const item = equippable.getEquipment(slot);
        if (item) this.triggerEnchants(item, "onHurt", ev);
      }
    });
    world32.afterEvents.projectileHitBlock.subscribe((ev) => {
      const { source } = ev;
      if (!source || !source.isValid || !source.getComponent("minecraft:equippable")) return;
      const equippable = source.getComponent("minecraft:equippable");
      const mainHand = equippable.getEquipment("Mainhand");
      if (mainHand) this.triggerEnchants(mainHand, "projectileHitBlock", ev);
    });
  }
  /**
   * Triggers registered callbacks for an item's enchants.
   */
  triggerEnchants(itemStack, triggerType, eventData) {
    const enchants = this.getEnchantments(itemStack);
    for (const [id, level] of Object.entries(enchants)) {
      const config = this.registry.get(id);
      if (config && config[triggerType]) {
        config[triggerType](eventData, level);
      }
    }
  }
  /**
   * Leader Election — only ONE instance across all addons handles UI & dummies.
   * Each instance writes a heartbeat. The lowest alphabetical namespace wins.
   * Non-leaders deactivate dummy management and UI handling.
   */
  electLeader() {
    if (!this.namespace) return;
    const now = Date.now();
    try {
      world32.setDynamicProperty(`mirage:enchant_hb_${this.namespace}`, now);
    } catch (e) {
    }
    let instances = [];
    try {
      const data = world32.getDynamicProperty("mirage:enchant_instances");
      if (data) instances = JSON.parse(data);
    } catch (e) {
    }
    if (!instances.includes(this.namespace)) {
      instances.push(this.namespace);
      try {
        world32.setDynamicProperty("mirage:enchant_instances", JSON.stringify(instances));
      } catch (e) {
      }
    }
    const alive = instances.filter((ns) => {
      try {
        const hb = world32.getDynamicProperty(`mirage:enchant_hb_${ns}`);
        return hb && now - hb < 5e3;
      } catch (e) {
        return false;
      }
    });
    if (alive.length !== instances.length) {
      try {
        world32.setDynamicProperty("mirage:enchant_instances", JSON.stringify(alive));
      } catch (e) {
      }
    }
    alive.sort();
    const wasLeader = this.isLeader;
    this.isLeader = alive.length > 0 && alive[0] === this.namespace;
    if (this.isLeader && !wasLeader) {
    }
  }
  // --- Dummy Entity Management ---
  /**
   * For each player, checks if they're near an enchanting table.
   * Spawns/maintains a dummy entity on top of it for interaction.
   * Only runs if this instance is the elected leader.
   */
  manageDummies() {
    if (!this.namespace || this.registry.size === 0) return;
    if (!this.isLeader) return;
    const activePlayers = /* @__PURE__ */ new Set();
    for (const player of world32.getAllPlayers()) {
      if (!player.isValid) continue;
      activePlayers.add(player.id);
      this.updateHitboxDummy(player);
    }
    for (const [pid, entity] of this.hitboxEntities) {
      if (!activePlayers.has(pid)) {
        try {
          if (entity?.isValid && entity.typeId === this.dummyEntityType) {
            entity.remove();
          }
        } catch {
        }
        this.hitboxEntities.delete(pid);
      }
    }
  }
  updateHitboxDummy(player) {
    const existing = this.hitboxEntities.get(player.id);
    if (!player.isSneaking) {
      if (existing?.isValid && existing.typeId === this.dummyEntityType) {
        try {
          existing.remove();
        } catch {
        }
      }
      this.hitboxEntities.delete(player.id);
      return;
    }
    const loc = player.location;
    const dim = player.dimension;
    let bestTablePos = null;
    let minDistanceSq = Infinity;
    const R = 4;
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        for (let dy = -2; dy <= 2; dy++) {
          try {
            const block = dim.getBlock({
              x: Math.floor(loc.x) + dx,
              y: Math.floor(loc.y) + dy,
              z: Math.floor(loc.z) + dz
            });
            if (block?.typeId === "minecraft:enchanting_table") {
              const bLoc = block.location;
              const distSq2 = Math.pow(bLoc.x + 0.5 - loc.x, 2) + Math.pow(bLoc.y - loc.y, 2) + Math.pow(bLoc.z + 0.5 - loc.z, 2);
              if (distSq2 < minDistanceSq) {
                minDistanceSq = distSq2;
                bestTablePos = bLoc;
              }
            }
          } catch {
          }
        }
      }
    }
    if (bestTablePos) {
      if (existing?.isValid) {
        const ep = existing.location;
        if (Math.abs(ep.x - (bestTablePos.x + 0.5)) > 0.5 || Math.abs(ep.z - (bestTablePos.z + 0.5)) > 0.5 || Math.abs(ep.y - bestTablePos.y) > 0.5) {
          try {
            existing.teleport({
              x: bestTablePos.x + 0.5,
              y: bestTablePos.y,
              z: bestTablePos.z + 0.5
            });
          } catch {
          }
        }
      } else {
        const tableCenter = {
          x: bestTablePos.x + 0.5,
          y: bestTablePos.y,
          z: bestTablePos.z + 0.5
        };
        try {
          const existingDummies = dim.getEntities({
            location: tableCenter,
            maxDistance: 1.5,
            tags: ["mirage_enchant_dummy"]
          });
          if (existingDummies.length > 0) {
            this.hitboxEntities.set(player.id, existingDummies[0]);
          } else {
            const entity = dim.spawnEntity(this.dummyEntityType, tableCenter);
            entity.addTag("mirage_enchant_dummy");
            this.hitboxEntities.set(player.id, entity);
          }
        } catch (e) {
        }
      }
    } else {
      if (existing?.isValid && existing.typeId === this.dummyEntityType) {
        try {
          existing.remove();
        } catch {
        }
      }
      this.hitboxEntities.delete(player.id);
    }
  }
  // --- Enchanting Table UI ---
  async openEnchantmentUI(player) {
    const inventory = player.getComponent("minecraft:inventory").container;
    let sharedRegistry = /* @__PURE__ */ new Map();
    try {
      const data = world32.getDynamicProperty("mirage:shared_registry");
      if (data) {
        const parsed = JSON.parse(data);
        for (const key in parsed) {
          sharedRegistry.set(key, parsed[key]);
        }
      }
    } catch (e) {
    }
    if (sharedRegistry.size === 0) {
      sharedRegistry = this.registry;
    }
    const candidates = [];
    for (let i = 0; i < inventory.size; i++) {
      const item = inventory.getItem(i);
      if (!item) continue;
      if (this.hasAnyApplicableEnchant(item, player, sharedRegistry)) {
        candidates.push({ slot: i, item, source: "inv" });
      }
    }
    if (candidates.length === 0) {
      player.sendMessage("\xA7cNo enchantable items in your inventory. (" + sharedRegistry.size + " enchants registered)");
      return;
    }
    const itemForm = new ActionFormData2().title("Custom Enchanting").body(`\xA77Select an item to enchant
\xA77XP Level: ${player.level}`);
    candidates.forEach((c) => {
      const label = c.item.nameTag || c.item.typeId.split(":")[1];
      itemForm.button(`${label}
\xA78Slot ${c.slot}`);
    });
    system39.runTimeout(async () => {
      try {
        const itemResp = await itemForm.show(player);
        if (itemResp.canceled) return;
        const chosen = candidates[itemResp.selection];
        const validEnchants = [];
        const currentEnchants = this.getEnchantments(chosen.item);
        for (const [id, config] of sharedRegistry) {
          const isCompatible = config.appliesTo.some((type2) => chosen.item.typeId.includes(type2));
          if (!isCompatible) continue;
          const currentLevel = currentEnchants[id] || 0;
          if (currentLevel >= config.maxLevel && player.getGameMode() !== GameMode5.Creative) continue;
          const nextLevel = currentLevel + 1;
          const cost = config._costMultiplier ? nextLevel * config._costMultiplier : typeof config.costPerLevel === "function" ? config.costPerLevel(nextLevel) : config.costPerLevel;
          validEnchants.push({ config, nextLevel, cost });
        }
        if (validEnchants.length === 0) {
          player.sendMessage("\xA7cNo available enchantments for this item (or maxed out).");
          return;
        }
        const enchForm = new ActionFormData2().title("Select Enchantment").body(`\xA77Item: ${chosen.item.typeId.split(":")[1]}
\xA77Available Enchants:`);
        validEnchants.forEach(({ config, nextLevel, cost }) => {
          enchForm.button(`\xA7d${config.name} ${nextLevel}
\xA72Cost: ${cost} levels`);
        });
        const enchResp = await enchForm.show(player);
        if (enchResp.canceled) return;
        const selected = validEnchants[enchResp.selection];
        if (player.getGameMode() !== GameMode5.Creative && player.level < selected.cost) {
          player.sendMessage("\xA7cNot enough experience levels!");
          return;
        }
        const applyData = {
          enchantId: selected.config.id,
          level: selected.nextLevel,
          cost: selected.cost,
          slot: chosen.slot,
          itemTypeId: chosen.item.typeId
        };
        player.runCommand(`scriptevent mirage:apply_enchant ${JSON.stringify(applyData)}`);
      } catch (e) {
      }
    });
  }
  /**
   * Returns true if the item can receive at least one registered enchant.
   */
  hasAnyApplicableEnchant(item, player, customRegistry = null) {
    const currentEnchants = this.getEnchantments(item);
    const reg = customRegistry || this.registry;
    for (const [id, config] of reg) {
      const isCompatible = config.appliesTo.some((type2) => item.typeId.includes(type2));
      if (!isCompatible) continue;
      const currentLevel = currentEnchants[id] || 0;
      if (currentLevel < config.maxLevel || player?.getGameMode() === GameMode5.Creative) return true;
    }
    return false;
  }
  applyEnchantmentTransaction(player, itemStack, selection) {
    const { config, nextLevel, cost } = selection;
    if (player.level < cost && player.getGameMode() !== GameMode5.Creative) {
      player.sendMessage(`\xA7cNot enough XP! Need ${cost} levels.`);
      player.playSound("note.bass");
      return;
    }
    const newItem = this.applyEnchantment(itemStack, config.id, nextLevel);
    const equippable = player.getComponent("minecraft:equippable");
    equippable.setEquipment("Mainhand", newItem);
    if (player.getGameMode() !== GameMode5.Creative) {
      player.addLevels(-cost);
    }
    player.dimension.playSound("random.levelup", player.location);
    player.sendMessage(`\xA7aEnchanted with ${config.name} ${this.toRoman(nextLevel)}!`);
  }
  // --- Anvil UI ---
  async openAnvilBookApplyUI(player, bookStack, enchantId) {
    const config = this.registry.get(enchantId);
    if (!config) return;
    const inventory = player.getComponent("minecraft:inventory").container;
    const validTargets = [];
    for (let i = 0; i < inventory.size; i++) {
      const item = inventory.getItem(i);
      if (!item) continue;
      const isCompatible = config.appliesTo.some((type2) => item.typeId.includes(type2));
      const currentEnchants = this.getEnchantments(item);
      const currentLevel = currentEnchants[enchantId] || 0;
      if (isCompatible && (currentLevel < config.maxLevel || player.getGameMode() === GameMode5.Creative)) {
        validTargets.push({
          slot: i,
          item,
          nextLevel: currentLevel + 1,
          cost: typeof config.costPerLevel === "function" ? config.costPerLevel(currentLevel + 1) : config.costPerLevel
        });
      }
    }
    if (validTargets.length === 0) {
      player.sendMessage(`\xA7cNo compatible items for ${config.name} found in your inventory.`);
      return;
    }
    const form = new ActionFormData2().title(`Combine: ${config.name}`).body(`\xA77Select an item to apply the enchantment to:`);
    validTargets.forEach((t) => {
      const color = player.level >= t.cost ? "\xA72" : "\xA7c";
      const itemName = t.item.nameTag || t.item.typeId.split(":")[1];
      form.button(`${itemName} (Slot ${t.slot})
${color}Cost: ${t.cost} Lvl`);
    });
    const response = await form.show(player);
    if (response.canceled) return;
    const selection = validTargets[response.selection];
    const currentInvItem = inventory.getItem(selection.slot);
    const currentHandItem = player.getComponent("minecraft:equippable").getEquipment("Mainhand");
    if (!currentHandItem || currentHandItem.typeId !== bookStack.typeId || !currentInvItem || currentInvItem.typeId !== selection.item.typeId) {
      player.sendMessage("\xA7cInventory changed. Transaction cancelled.");
      return;
    }
    if (player.level < selection.cost && player.getGameMode() !== GameMode5.Creative) {
      player.sendMessage(`\xA7cNot enough XP! Need ${selection.cost} levels.`);
      player.playSound("note.bass");
      return;
    }
    const newItem = this.applyEnchantment(currentInvItem, config.id, selection.nextLevel);
    inventory.setItem(selection.slot, newItem);
    if (currentHandItem.amount > 1) {
      currentHandItem.amount--;
      player.getComponent("minecraft:equippable").setEquipment("Mainhand", currentHandItem);
    } else {
      player.getComponent("minecraft:equippable").setEquipment("Mainhand");
    }
    if (player.getGameMode() !== GameMode5.Creative) {
      player.addLevels(-selection.cost);
    }
    player.playSound("random.anvil_use");
    player.dimension.spawnParticle("minecraft:villager_happy", player.location);
    player.sendMessage(`\xA7aSuccessfully combined ${config.name} with your item!`);
  }
  // --- Helper Methods ---
  applyEnchantment(itemStack, id, level) {
    const config = this.registry.get(id);
    if (!config) return itemStack;
    const enchants = this.getEnchantments(itemStack);
    enchants[id] = level;
    itemStack.setDynamicProperty("mirage:enchants", JSON.stringify(enchants));
    const currentLore = itemStack.getLore() || [];
    const newLoreLine = `\xA77${config.name} ${this.toRoman(level)}`;
    const cleanLore = currentLore.filter((line) => !line.includes(`\xA77${config.name}`));
    cleanLore.unshift(newLoreLine);
    itemStack.setLore(cleanLore);
    this.updateGlint(itemStack);
    return itemStack;
  }
  /**
   * Toggles the dummy glint based on context.
   */
  updateGlint(itemStack, shouldHaveGlint = true) {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return;
    const hasDummy = itemStack.getDynamicProperty("mirage:dummy_glint");
    const currentVanillas = enchantable.getEnchantments();
    if (shouldHaveGlint) {
      if (currentVanillas.length === 0) {
        try {
          enchantable.addEnchantment({ type: "unbreaking", level: 0 });
          itemStack.setDynamicProperty("mirage:dummy_glint", true);
        } catch (e) {
          try {
            enchantable.addEnchantment({ type: "unbreaking", level: 1 });
            itemStack.setDynamicProperty("mirage:dummy_glint", true);
          } catch (e2) {
          }
        }
      }
    } else {
      if (hasDummy) {
        const unbreaking = enchantable.getEnchantment("unbreaking");
        if (unbreaking && currentVanillas.length === 1) {
          enchantable.removeAllEnchantments();
          itemStack.setDynamicProperty("mirage:dummy_glint", void 0);
        }
      }
    }
  }
  /**
   * Scans players to toggle glint state.
   */
  manageVisuals() {
    for (const player of world32.getAllPlayers()) {
      const cursorComp = player.getComponent("minecraft:cursor_inventory");
      if (cursorComp && cursorComp.item) {
        const item = cursorComp.item;
        if (this.hasCustomEnchants(item) && item.getDynamicProperty("mirage:dummy_glint")) {
          this.updateGlint(item, false);
          cursorComp.item = item;
        }
      }
      const invComp = player.getComponent("minecraft:inventory");
      if (invComp && invComp.container) {
        const container = invComp.container;
        for (let i = 0; i < container.size; i++) {
          const item = container.getItem(i);
          if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("mirage:dummy_glint")) {
            this.updateGlint(item, true);
            if (item.getDynamicProperty("mirage:dummy_glint")) {
              container.setItem(i, item);
            }
          }
        }
      }
      const equipComp = player.getComponent("minecraft:equippable");
      if (equipComp) {
        const slots = ["Mainhand", "Offhand", "Head", "Chest", "Legs", "Feet"];
        for (const slot of slots) {
          const item = equipComp.getEquipment(slot);
          if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("mirage:dummy_glint")) {
            this.updateGlint(item, true);
            if (item.getDynamicProperty("mirage:dummy_glint")) {
              equipComp.setEquipment(slot, item);
            }
          }
        }
      }
    }
  }
  hasCustomEnchants(item) {
    return !!item.getDynamicProperty("mirage:enchants");
  }
  getEnchantments(itemStack) {
    if (!itemStack) return {};
    const data = itemStack.getDynamicProperty("mirage:enchants");
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  toRoman(num) {
    const roman = { M: 1e3, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = "";
    for (let i of Object.keys(roman)) {
      let q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }
    return str;
  }
};
var enchantmentManager = new EnchantmentManager();

// src/main/bedrock/ts/systems/enchantments.ts
enchantmentManager.register("gaia:life_steal", {
  name: "Life Steal",
  maxLevel: 3,
  appliesTo: ["sword", "axe"],
  costPerLevel: (lvl) => lvl * 5,
  onHit: (event, level) => {
    const { damagingEntity } = event;
    if (!damagingEntity) return;
    const health = damagingEntity.getComponent("minecraft:health");
    if (health) {
      health.setCurrentValue(Math.min(health.currentValue + level, health.effectiveMax));
    }
  }
});
enchantmentManager.register("gaia:thunder_strike", {
  name: "Thunder Strike",
  maxLevel: 1,
  appliesTo: ["sword", "trident"],
  costPerLevel: 10,
  onHit: (event, level) => {
    const { hitEntity, damagingEntity } = event;
    if (!damagingEntity || !hitEntity) return;
    const dim = damagingEntity.dimension;
    if (Math.random() < 0.2) {
      dim.spawnEntity("minecraft:lightning_bolt", hitEntity.location);
    }
  }
});

// src/main/bedrock/ts/entities/MalachiteGuard.ts
import { world as world33, system as system40, Player as Player29, EquipmentSlot as EquipmentSlot7, GameMode as GameMode6, EntityComponentTypes, EntityDamageCause } from "@minecraft/server";
var GUARD_ID = "gaiadimension:malachite_guard";
var DRONE_ID = "gaiadimension:malachite_drone";
var BATON_ID = "gaiadimension:malachite_guard_baton";
var STOMP_WINDUP_TICKS = 20;
var STOMP_COOLDOWN = 120;
var CHARGE_DURATION = 100;
var CHARGE_COOLDOWN = 60;
var BLAST_LINGER = 20;
var DRONE_OFFSETS = [
  { x: 2, z: 1 },
  { x: 2, z: -1 },
  { x: -2, z: 1 },
  { x: -2, z: -1 }
];
var P = {
  GUARD_ID: "gd:guard_id",
  PHASE: "gd:phase",
  STOMP_COOLDOWN: "gd:stomp_cd",
  CHARGE_COOLDOWN: "gd:charge_cd",
  STOMP_TIMER: "gd:stomp_t",
  CHARGE_TIMER: "gd:charge_t",
  BLAST_TIMER: "gd:blast_t",
  BIDE_DAMAGE: "gd:bide_dmg",
  HAS_DRONES: "gd:has_drones",
  DRONES_SPAWNED: "gd:drones_spawned",
  PARENT_ID: "gd:parent_id"
};
function getNum(e, key, def = 0) {
  return e.getDynamicProperty(key) ?? def;
}
function setNum(e, key, v) {
  e.setDynamicProperty(key, v);
}
function getBool(e, key, def = false) {
  return e.getDynamicProperty(key) ?? def;
}
function setBool(e, key, v) {
  e.setDynamicProperty(key, v);
}
function getStr(e, key, def = "") {
  return e.getDynamicProperty(key) ?? def;
}
function setAnimState(guard, state) {
  try {
    guard.setProperty("minecraft:mark_variant", state);
  } catch {
  }
}
function distSq(a, b) {
  const al = a.location, bl = b.location;
  const dx = al.x - bl.x, dy = al.y - bl.y, dz = al.z - bl.z;
  return dx * dx + dy * dy + dz * dz;
}
function isValidPlayer(e) {
  if (!(e instanceof Player29)) return false;
  try {
    const gm = e.getGameMode();
    return gm !== GameMode6.Creative && gm !== GameMode6.Spectator;
  } catch {
    return false;
  }
}
function getDamageMultiplier(baseDmg) {
  if (baseDmg > 100) return 0;
  if (baseDmg > 50) return 0.125;
  if (baseDmg > 25) return 0.25;
  if (baseDmg > 10) return 0.5;
  return 1;
}
var MalachiteGuardSystem = class {
  constructor() {
    this.init();
  }
  init() {
    world33.afterEvents.entitySpawn.subscribe((event) => {
      const { entity } = event;
      if (entity.typeId === GUARD_ID) {
        this.setupGuard(entity);
      }
    });
    system40.runInterval(() => {
      for (const dimension of getDimensions()) {
        const guards = dimension.getEntities({ type: GUARD_ID });
        for (const guard of guards) {
          if (!guard.isValid) continue;
          try {
            this.tickGuard(guard);
          } catch {
          }
        }
      }
    }, 1);
    world33.afterEvents.entityHurt.subscribe((event) => {
      const { hurtEntity, damage, damageSource } = event;
      if (hurtEntity.typeId !== GUARD_ID || !hurtEntity.isValid) return;
      const phase = getNum(hurtEntity, P.PHASE, 0 /* Defence */);
      const health = hurtEntity.getComponent(EntityComponentTypes.Health);
      if (!health) return;
      const maxHp = health.effectiveMax;
      const curHp = health.currentValue;
      const attacker = damageSource.damagingEntity;
      const chargeTimer = getNum(hurtEntity, P.CHARGE_TIMER, 0);
      if (chargeTimer > 0 && attacker && isValidPlayer(attacker)) {
        const bide = getNum(hurtEntity, P.BIDE_DAMAGE, 0);
        setNum(hurtEntity, P.BIDE_DAMAGE, bide + damage * 0.5);
      }
      if (phase === 0 /* Defence */) {
        return;
      }
      if (phase === 1 /* Attack */) {
        const threshold = maxHp / 2 - 2;
        if (curHp < threshold) {
          system40.run(() => {
            try {
              if (hurtEntity.isValid && health) {
                health.setCurrentValue(threshold);
              }
            } catch {
            }
          });
        }
        return;
      }
      if (phase === 2 /* Resist */) {
        if (!attacker || !isValidPlayer(attacker)) {
          if (hurtEntity.location.y > -64) {
            system40.run(() => {
              try {
                if (hurtEntity.isValid && health) {
                  health.setCurrentValue(Math.min(curHp + damage, maxHp));
                }
              } catch {
              }
            });
          }
          return;
        }
        const mult = getDamageMultiplier(damage);
        if (mult < 1) {
          const reduction = damage * (1 - mult);
          system40.run(() => {
            try {
              if (hurtEntity.isValid && health) {
                health.setCurrentValue(Math.min(curHp + reduction, maxHp));
              }
            } catch {
            }
          });
        }
      }
    });
    world33.afterEvents.entityHitEntity.subscribe((event) => {
      const { damagingEntity, hitEntity } = event;
      if (damagingEntity instanceof Player29 && hitEntity.isValid) {
        try {
          const equip = damagingEntity.getComponent(EntityComponentTypes.Equippable);
          const mainhand = equip?.getEquipment(EquipmentSlot7.Mainhand);
          if (mainhand?.typeId === BATON_ID) {
            const yaw = damagingEntity.getRotation().y;
            const rad = yaw * (Math.PI / 180);
            const kbX = -Math.sin(rad) * 1.5;
            const kbZ = Math.cos(rad) * 1.5;
            hitEntity.applyKnockback(kbX, kbZ, 1.5, 0.4);
          }
        } catch {
        }
      }
      if (damagingEntity.typeId === GUARD_ID && hitEntity instanceof Player29) {
        if (!hitEntity.isValid) return;
        if (Math.random() > 1 / 12) return;
        try {
          const equip = hitEntity.getComponent(EntityComponentTypes.Equippable);
          if (!equip) return;
          const slots = [EquipmentSlot7.Head, EquipmentSlot7.Chest, EquipmentSlot7.Legs, EquipmentSlot7.Feet];
          const slot = slots[Math.floor(Math.random() * slots.length)];
          const item = equip.getEquipment(slot);
          if (item) {
            const dim = hitEntity.dimension;
            const loc = hitEntity.location;
            system40.run(() => {
              try {
                dim.spawnItem(item, { x: loc.x, y: loc.y + 0.5, z: loc.z });
                equip.setEquipment(slot, void 0);
                hitEntity.playSound("random.break");
              } catch {
              }
            });
          }
        } catch {
        }
      }
    });
    world33.afterEvents.entityDie.subscribe((event) => {
      const { deadEntity } = event;
      if (deadEntity.typeId !== DRONE_ID) return;
      const parentId = getStr(deadEntity, P.PARENT_ID);
      if (!parentId) return;
    });
  }
  // ────────────────────────────────────────────────────────────────────
  // Setup
  // ────────────────────────────────────────────────────────────────────
  setupGuard(guard) {
    const guardId = `mg_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    guard.setDynamicProperty(P.GUARD_ID, guardId);
    setNum(guard, P.PHASE, 0 /* Defence */);
    setNum(guard, P.STOMP_COOLDOWN, 0);
    setNum(guard, P.CHARGE_COOLDOWN, 0);
    setNum(guard, P.STOMP_TIMER, 0);
    setNum(guard, P.CHARGE_TIMER, 0);
    setNum(guard, P.BLAST_TIMER, 0);
    setNum(guard, P.BIDE_DAMAGE, 0);
    setBool(guard, P.HAS_DRONES, true);
    setBool(guard, P.DRONES_SPAWNED, false);
    system40.run(() => {
      if (!guard.isValid) return;
      try {
        guard.triggerEvent("mg_defend");
        setAnimState(guard, 0 /* Default */);
      } catch {
      }
    });
  }
  // ────────────────────────────────────────────────────────────────────
  // Per-tick guard logic
  // ────────────────────────────────────────────────────────────────────
  tickGuard(guard) {
    const phase = getNum(guard, P.PHASE, 0 /* Defence */);
    const guardId = getStr(guard, P.GUARD_ID);
    if (!guardId) return;
    const health = guard.getComponent(EntityComponentTypes.Health);
    if (!health) return;
    const maxHp = health.effectiveMax;
    const curHp = health.currentValue;
    switch (phase) {
      case 0 /* Defence */:
        this.tickDefencePhase(guard, guardId, curHp, maxHp);
        break;
      case 1 /* Attack */:
        this.tickAttackPhase(guard, guardId, curHp, maxHp);
        break;
      case 2 /* Resist */:
        this.tickResistPhase(guard, guardId, curHp, maxHp);
        break;
    }
    const stompCd = getNum(guard, P.STOMP_COOLDOWN, 0);
    if (stompCd > 0) setNum(guard, P.STOMP_COOLDOWN, stompCd - 1);
    const chargeCd = getNum(guard, P.CHARGE_COOLDOWN, 0);
    if (chargeCd > 0) setNum(guard, P.CHARGE_COOLDOWN, chargeCd - 1);
    this.tickStomp(guard);
    this.tickBlast(guard);
  }
  // ────────────────────────────────────────────────────────────────────
  // DEFENCE phase: immobile, spawn drones, wait for drones to die
  // ────────────────────────────────────────────────────────────────────
  tickDefencePhase(guard, guardId, curHp, maxHp) {
    if (!getBool(guard, P.DRONES_SPAWNED, false)) {
      this.spawnDrones(guard, guardId);
      setBool(guard, P.DRONES_SPAWNED, true);
    }
    const drones = guard.dimension.getEntities({
      type: DRONE_ID,
      tags: [`mg_parent:${guardId}`],
      location: guard.location,
      maxDistance: 200
    });
    if (drones.length <= 0 && getBool(guard, P.DRONES_SPAWNED, false)) {
      setNum(guard, P.PHASE, 1 /* Attack */);
      setBool(guard, P.HAS_DRONES, false);
      guard.triggerEvent("no_mg_defend");
      setAnimState(guard, 0 /* Default */);
    }
  }
  // ────────────────────────────────────────────────────────────────────
  // ATTACK phase: normal combat, transition to RESIST at <= 50% HP
  // ────────────────────────────────────────────────────────────────────
  tickAttackPhase(guard, guardId, curHp, maxHp) {
    if (curHp <= maxHp / 2) {
      setNum(guard, P.PHASE, 2 /* Resist */);
      guard.triggerEvent("mg_resist");
    }
    this.checkAttackOpportunities(guard);
  }
  // ────────────────────────────────────────────────────────────────────
  // RESIST phase: enraged, restricted damage, slower. Revert to ATTACK if healed > 50%
  // ────────────────────────────────────────────────────────────────────
  tickResistPhase(guard, guardId, curHp, maxHp) {
    if (curHp > maxHp / 2) {
      setNum(guard, P.PHASE, 1 /* Attack */);
      guard.triggerEvent("no_mg_resist");
    }
    this.checkAttackOpportunities(guard);
  }
  // ────────────────────────────────────────────────────────────────────
  // Drone spawning
  // ────────────────────────────────────────────────────────────────────
  spawnDrones(guard, guardId) {
    const dim = guard.dimension;
    const loc = guard.location;
    for (const offset of DRONE_OFFSETS) {
      try {
        const drone = dim.spawnEntity(DRONE_ID, {
          x: loc.x + offset.x,
          y: loc.y + 1,
          z: loc.z + offset.z
        });
        drone.addTag(`mg_parent:${guardId}`);
        drone.setDynamicProperty(P.PARENT_ID, guardId);
      } catch {
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────
  // Opportunity detection for stomp and blast attacks
  // ────────────────────────────────────────────────────────────────────
  checkAttackOpportunities(guard) {
    const phase = getNum(guard, P.PHASE);
    if (phase === 0 /* Defence */) return;
    const stompTimer = getNum(guard, P.STOMP_TIMER, 0);
    const chargeTimer = getNum(guard, P.CHARGE_TIMER, 0);
    const blastTimer = getNum(guard, P.BLAST_TIMER, 0);
    if (stompTimer > 0 || chargeTimer > 0 || blastTimer > 0) return;
    const gl = guard.location;
    const nearbyPlayers = guard.dimension.getEntities({
      type: "minecraft:player",
      location: gl,
      maxDistance: 6
    }).filter((e) => isValidPlayer(e));
    if (nearbyPlayers.length === 0) return;
    const chargeCd = getNum(guard, P.CHARGE_COOLDOWN, 0);
    const stompCd = getNum(guard, P.STOMP_COOLDOWN, 0);
    if (chargeCd <= 0) {
      for (const player of nearbyPlayers) {
        const yDiff = player.location.y - gl.y;
        if (Math.abs(yDiff) > 1) {
          this.startBlastAttack(guard);
          return;
        }
      }
    }
    if (stompCd <= 0) {
      for (const player of nearbyPlayers) {
        const dSq = distSq(guard, player);
        if (dSq > 1 && dSq < 16 && player.isOnGround) {
          this.startStompAttack(guard);
          return;
        }
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────
  // STOMP ATTACK — Java StompAttackGoal port
  // ────────────────────────────────────────────────────────────────────
  startStompAttack(guard) {
    setNum(guard, P.STOMP_TIMER, STOMP_WINDUP_TICKS);
    guard.triggerEvent("mg_stomp_start");
    setAnimState(guard, 1 /* StompWindup */);
  }
  tickStomp(guard) {
    const timer = getNum(guard, P.STOMP_TIMER, 0);
    if (timer <= 0) return;
    const newTimer = timer - 1;
    setNum(guard, P.STOMP_TIMER, newTimer);
    if (newTimer <= 0) {
      setAnimState(guard, 3 /* StompExecute */);
      const gl = guard.location;
      const dim = guard.dimension;
      const targets = dim.getEntities({
        location: gl,
        maxDistance: 3.5
      }).filter((e) => e.id !== guard.id && e.typeId !== DRONE_ID && e.typeId !== GUARD_ID);
      try {
        dim.playSound("mob.ravager.stomp", gl);
      } catch {
      }
      for (const target of targets) {
        try {
          target.applyDamage(5, { cause: EntityDamageCause.EntityAttack, damagingEntity: guard });
          target.applyKnockback(0, 0, 0, 0.6);
        } catch {
        }
      }
      try {
        dim.runCommand(`particle minecraft:terrain_explosion ${gl.x} ${gl.y} ${gl.z}`);
      } catch {
      }
      system40.runTimeout(() => {
        if (!guard.isValid) return;
        setNum(guard, P.STOMP_COOLDOWN, STOMP_COOLDOWN);
        guard.triggerEvent("mg_stomp_end");
        setAnimState(guard, 0 /* Default */);
      }, 10);
    }
  }
  // ────────────────────────────────────────────────────────────────────
  // BLAST ATTACK (BIDE) — Java BlastAttackGoal port
  // ────────────────────────────────────────────────────────────────────
  startBlastAttack(guard) {
    setNum(guard, P.CHARGE_TIMER, CHARGE_DURATION);
    setNum(guard, P.BIDE_DAMAGE, 0);
    guard.triggerEvent("mg_charge_start");
    setAnimState(guard, 2 /* ChargeCrouch */);
  }
  tickBlast(guard) {
    const chargeTimer = getNum(guard, P.CHARGE_TIMER, 0);
    const blastTimer = getNum(guard, P.BLAST_TIMER, 0);
    if (chargeTimer > 0) {
      const newCharge = chargeTimer - 1;
      setNum(guard, P.CHARGE_TIMER, newCharge);
      if (newCharge % 3 === 0) {
        try {
          const gl = guard.location;
          guard.dimension.spawnParticle("gaiadimension:malachite_magic", {
            x: gl.x + (Math.random() - 0.5) * 6,
            y: gl.y + Math.random() * 0.25,
            z: gl.z + (Math.random() - 0.5) * 6
          });
        } catch {
        }
      }
      if (newCharge <= 0) {
        setAnimState(guard, 4 /* BlastExecute */);
        setNum(guard, P.BLAST_TIMER, BLAST_LINGER);
        const gl = guard.location;
        const dim = guard.dimension;
        const bideDmg = getNum(guard, P.BIDE_DAMAGE, 0);
        const targets = dim.getEntities({
          location: gl,
          maxDistance: 4.5
        }).filter((e) => e.id !== guard.id && e.typeId !== DRONE_ID && e.typeId !== GUARD_ID);
        try {
          dim.playSound("random.explode", gl, { volume: 1.5, pitch: 0.7 });
        } catch {
        }
        for (const target of targets) {
          try {
            target.applyDamage(8 + bideDmg, { cause: EntityDamageCause.EntityAttack, damagingEntity: guard });
            const dx = target.location.x - gl.x;
            const dz = target.location.z - gl.z;
            const dist = Math.sqrt(dx * dx + dz * dz) || 1;
            target.applyKnockback(dx / dist, dz / dist, 2, 0.3);
          } catch {
          }
        }
      }
      return;
    }
    if (blastTimer > 0) {
      const newBlast = blastTimer - 1;
      setNum(guard, P.BLAST_TIMER, newBlast);
      if (newBlast % 2 === 0) {
        try {
          const gl = guard.location;
          for (let i = 0; i < 5; i++) {
            guard.dimension.spawnParticle("gaiadimension:malachite_magic", {
              x: gl.x + (Math.random() - 0.5) * 2,
              y: gl.y + Math.random() * 3,
              z: gl.z + (Math.random() - 0.5) * 2
            });
          }
        } catch {
        }
      }
      if (newBlast <= 0) {
        setNum(guard, P.CHARGE_COOLDOWN, CHARGE_COOLDOWN);
        setNum(guard, P.BIDE_DAMAGE, 0);
        guard.triggerEvent("mg_charge_end");
        setAnimState(guard, 0 /* Default */);
      }
    }
  }
};
var malachiteGuardSystem = new MalachiteGuardSystem();

// src/main/bedrock/ts/GaiaDimensionAddon.ts
initializeDestructionHandlers();
initializeEventManager();
system41.beforeEvents?.shutdown?.subscribe((event) => event.cancel = true);
initializeScriptEvents();
initializeGeyser();
initializeLightMixin();
initializeGlitterGrassSync();
initializeMagicStaffBehaviors();
registerCustomTool();
initDestroyedDimensionGuard();
system41.beforeEvents.startup.subscribe((event) => {
  const { blockComponentRegistry, customCommandRegistry, itemComponentRegistry, dimensionRegistry } = event;
  const gaiaDimId = "gaiadimension:gaia_dimension";
  dimensionRegistry.registerCustomDimension(gaiaDimId);
  registerDimension(gaiaDimId);
  registerRealmDimensions(dimensionRegistry);
  for (let i = 0; i < REALM_COUNT; i++) {
    registerDimension(`${REALM_PREFIX}${i}`);
  }
  registerLeavesComponent({ blockComponentRegistry });
  registerInvisibleComponent({ blockComponentRegistry });
  registerCurtainComponent({ blockComponentRegistry });
  registerWoodComponent({ blockComponentRegistry });
  registerSaplingComponent({ blockComponentRegistry });
  registerButtonComponent({ blockComponentRegistry });
  registerPressurePlateComponent({ blockComponentRegistry });
  registerStairsComponent({ blockComponentRegistry });
  registerSignComponent({ blockComponentRegistry });
  registerGeyserComponent({ blockComponentRegistry });
  registerGaiaFurnaceComponent({ blockComponentRegistry });
  registerGlitteringFireComponent();
  registerCrudeStorageCrateComponent({ blockComponentRegistry });
  registerMegaStorageCrateComponent({ blockComponentRegistry });
  registerFluidComponent({ blockComponentRegistry });
  registerFireStarterComponent({ itemComponentRegistry });
  registerMagicStaffComponent({ itemComponentRegistry });
  registerGaiaCommands(customCommandRegistry);
  registerSetBiomeCommand(customCommandRegistry);
  registerDestructionCommands(customCommandRegistry);
});
/*! Bundled license information:

fastnoise-lite/FastNoiseLite.js:
  (**
   * @description FastNoise Lite is an extremely portable open source noise generation library with a large selection of noise algorithms
   * @author Jordan Peck, snowfoxsh
   * @version 1.1.0
   * @copyright Copyright(c) 2023 Jordan Peck, Contributors
   * @license MIT
   * @git https://github.com/Auburn/FastNoiseLite
   * @npm https://www.npmjs.com/package/fastnoise-lite
   * @example
  // Import from npm (if you used npm)
  
  import FastNoiseLite from "fastnoise-lite";
  
  // Create and configure FastNoiseLite object
  
  let noise = new FastNoiseLite();
  noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2);
  
  // Gather noise data
  let noiseData = [];
  
  for (let x = 0; x < 128; x++) {
      noiseData[x] = [];
  
      for (let y = 0; y < 128; y++) {        
          noiseData[x][y] = noise.GetNoise(x,y);
      }
  }
  
  // Do something with this data...
   *)
*/
//# sourceMappingURL=GaiaDimensionAddon.js.map
