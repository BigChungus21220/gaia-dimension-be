// src/main/bedrock/ts/GaiaDimensionAddon.ts
import { system as system39 } from "@minecraft/server";

// src/main/bedrock/ts/blocks/leaves.ts
import { system } from "@minecraft/server";

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
  onRandomTick(event) {
    if (Math.random() < 0.1) {
      const { block, dimension } = event;
      const particle = leafParticles[block.typeId];
      if (particle) {
        system.run(() => {
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
import { world, system as system2 } from "@minecraft/server";
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
    const mainHandItem = equippable?.getEquipment("Mainhand");
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
import { world as world5, system as system6, BlockPermutation as BlockPermutation2, GameMode as GameMode2, Direction } from "@minecraft/server";
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
    if (player.getGameMode() !== GameMode2.creative) {
      const equippable = player.getComponent("equippable");
      if (mainhandItem.amount > 1) {
        mainhandItem.amount--;
        equippable.setEquipment("Mainhand", mainhandItem);
      } else {
        equippable.setEquipment("Mainhand");
      }
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
          if (block.isValid) {
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
        if (strippedId) {
          if (block.isValid) {
            if (blockId.startsWith("minecraft:")) {
              const blockState = block.permutation.getState("pillar_axis");
              if (blockState) {
                const strippedLog = BlockPermutation2.resolve(strippedId, { "pillar_axis": blockState });
                block.setPermutation(strippedLog);
              }
            } else {
              const blockState = block.permutation.getState("minecraft:block_face");
              if (blockState) {
                const strippedLog = BlockPermutation2.resolve(strippedId, { "minecraft:block_face": blockState });
                block.setPermutation(strippedLog);
              }
            }
            player.playSound("step.wood");
          }
        }
      });
    }
  });
}

// src/main/bedrock/ts/blocks/fence.ts
import { system as system9, Direction as Direction3, GameMode as GameMode4 } from "@minecraft/server";

// src/main/bedrock/ts/blocks/wall.ts
import { system as system8, Direction as Direction2, GameMode as GameMode3 } from "@minecraft/server";

// src/main/bedrock/ts/systems/BlockUpdate.ts
import { world as world6, system as system7 } from "@minecraft/server";
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
world6.afterEvents.pistonActivate.subscribe((event) => {
  const { piston, dimension } = event;
  system7.run(() => {
    for (const location of piston.getAttachedBlocks()) {
      const block = dimension.getBlock(location);
      if (block) {
        updateNeighboringBlocks(block);
      }
    }
  });
});
world6.afterEvents.explosion.subscribe((event) => {
  const { dimension } = event;
  for (const location of event.getImpactedBlocks()) {
    const block = dimension.getBlock(location);
    if (block) {
      updateNeighboringBlocks(block);
    }
  }
});

// src/main/bedrock/ts/blocks/wall.ts
var INVISIBLE_BLOCK_ID2 = "gaiadimension:invisible";
function isConnectable(block) {
  if (!block) return false;
  if (block.isAir || block.isLiquid) return false;
  const typeId = block.typeId;
  const nonConnectableKeywords = [
    "snow",
    "mushroom",
    "grass",
    "fern",
    "flower",
    "sapling",
    "vine",
    "crop",
    "dead_bush",
    "leaves",
    "scaffolding",
    "sign",
    "banner",
    "torch",
    "lantern",
    "button",
    "lever",
    "invisible",
    "door",
    "trapdoor",
    "leaf_litter"
  ];
  if (typeId.includes("wall") || typeId.includes("fence")) return true;
  for (const keyword of nonConnectableKeywords) {
    if (typeId.includes(keyword)) return false;
  }
  return true;
}
function updateWallConnections(block) {
  if (!block || !block.isValid || !block.typeId.includes("wall")) return;
  try {
    let permutation = block.permutation;
    const blockAbove = block.above();
    const isWallAbove = blockAbove?.typeId.includes("wall");
    let northConnect = isConnectable(block.north());
    if (!northConnect && isWallAbove && isConnectable(blockAbove.north())) {
      northConnect = true;
    }
    permutation = permutation.withState("gaiadimension:north", northConnect);
    let southConnect = isConnectable(block.south());
    if (!southConnect && isWallAbove && isConnectable(blockAbove.south())) {
      southConnect = true;
    }
    permutation = permutation.withState("gaiadimension:south", southConnect);
    let eastConnect = isConnectable(block.east());
    if (!eastConnect && isWallAbove && isConnectable(blockAbove.east())) {
      eastConnect = true;
    }
    permutation = permutation.withState("gaiadimension:east", eastConnect);
    let westConnect = isConnectable(block.west());
    if (!westConnect && isWallAbove && isConnectable(blockAbove.west())) {
      westConnect = true;
    }
    permutation = permutation.withState("gaiadimension:west", westConnect);
    permutation = permutation.withState("gaiadimension:above", isConnectable(block.above()));
    block.setPermutation(permutation);
  } catch (e) {
  }
}
function updateInvisibleBlock(block) {
  if (!block || !block.isValid) return;
  const blockAbove = block.above();
  if (!blockAbove) return;
  if (blockAbove.isAir) {
    blockAbove.setType(INVISIBLE_BLOCK_ID2);
  } else if (blockAbove.typeId === INVISIBLE_BLOCK_ID2) {
    if (!blockAbove.isAir && !blockAbove.isLiquid) {
      blockAbove.setType("minecraft:air");
    }
  }
}
function updateWallNeighborsAt(location, dimension) {
  const { x, y, z } = location;
  const neighbors = [
    dimension.getBlock({ x, y, z: z - 1 }),
    // North
    dimension.getBlock({ x, y, z: z + 1 }),
    // South
    dimension.getBlock({ x: x + 1, y, z }),
    // East
    dimension.getBlock({ x: x - 1, y, z }),
    // West
    dimension.getBlock({ x, y: y + 1, z }),
    // Above
    dimension.getBlock({ x, y: y - 1, z })
    // Below
  ];
  for (const neighbor of neighbors) {
    if (neighbor) {
      updateWallConnections(neighbor);
    }
  }
}
function registerWallComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:wall", {});
  registerForBlockUpdates({
    check: (block) => block.typeId.includes("wall") && !block.typeId.startsWith("minecraft:"),
    update: updateWallConnections
  });
  registerPlaceHandler({
    check: (block) => block.typeId.includes("wall") && !block.typeId.startsWith("minecraft:"),
    execute: (event) => {
      const { block } = event;
      updateWallConnections(block);
      updateInvisibleBlock(block);
      updateWallNeighborsAt(block.location, block.dimension);
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId.includes("wall") || block.typeId === INVISIBLE_BLOCK_ID2,
    execute: (event) => {
      const { player, block, blockFace, itemStack } = event;
      if (itemStack) {
        if (block.typeId === INVISIBLE_BLOCK_ID2) {
          const blockBelow = block.below();
          if (blockBelow && blockBelow.typeId.includes("wall")) {
            event.cancel = true;
            system8.run(() => {
              if (!block.isValid) return;
              block.setType(itemStack.typeId);
              player.playSound("dig.stone", { location: block.location });
              updateWallConnections(blockBelow);
              if (player.getGameMode() !== GameMode3.Creative) {
                const inventory = player.getComponent("minecraft:inventory");
                const container = inventory.container;
                const item = container.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container.setItem(player.selectedSlot, item);
                  }
                }
              }
              const newBlock = block;
              updateWallConnections(newBlock);
              updateInvisibleBlock(newBlock);
              updateWallNeighborsAt(newBlock.location, newBlock.dimension);
            });
          }
        } else if (blockFace === Direction2.Up || player.isSneaking) {
          event.cancel = true;
          system8.run(() => {
            if (!block.isValid) return;
            const blockAbove = block.above();
            if (blockAbove && (blockAbove.isAir || blockAbove.typeId === INVISIBLE_BLOCK_ID2)) {
              try {
                blockAbove.setType(itemStack.typeId);
              } catch (e) {
              }
              player.playSound("dig.stone", { location: blockAbove.location });
              if (player.getGameMode() !== GameMode3.Creative) {
                const inventory = player.getComponent("minecraft:inventory");
                const container = inventory.container;
                const item = container.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container.setItem(player.selectedSlot, item);
                  }
                }
              }
              const newBlock = block.above();
              if (newBlock) {
                updateWallConnections(newBlock);
                updateInvisibleBlock(newBlock);
                updateWallNeighborsAt(newBlock.location, newBlock.dimension);
              }
            }
          });
        }
      }
    }
  });
}

// src/main/bedrock/ts/blocks/fence.ts
var INVISIBLE_BLOCK_ID3 = "gaiadimension:invisible";
function isConnectable2(block) {
  if (!block) return false;
  if (block.isAir || block.isLiquid) return false;
  const typeId = block.typeId;
  const nonConnectableKeywords = [
    "snow",
    "mushroom",
    "grass",
    "fern",
    "flower",
    "sapling",
    "vine",
    "crop",
    "dead_bush",
    "leaves",
    "scaffolding",
    "sign",
    "banner",
    "torch",
    "lantern",
    "button",
    "lever",
    "invisible",
    "door",
    "trapdoor",
    "leaf_litter"
  ];
  for (const keyword of nonConnectableKeywords) {
    if (typeId.includes(keyword)) return false;
  }
  return true;
}
function updateFenceConnections(block) {
  if (!block || !block.isValid || !block.typeId.includes("fence") || block.typeId.includes("fence_gate")) return;
  try {
    let permutation = block.permutation;
    permutation = permutation.withState("gaiadimension:north", isConnectable2(block.north()));
    permutation = permutation.withState("gaiadimension:south", isConnectable2(block.south()));
    permutation = permutation.withState("gaiadimension:east", isConnectable2(block.east()));
    permutation = permutation.withState("gaiadimension:west", isConnectable2(block.west()));
    block.setPermutation(permutation);
  } catch (e) {
  }
}
function updateInvisibleBlock2(block) {
  if (!block || !block.isValid) return;
  const blockAbove = block.above();
  if (!blockAbove) return;
  const typeId = block.typeId;
  const isOpen = typeId.includes("fence_gate") ? block.permutation.getState("gaiadimension:open") : false;
  if (blockAbove.isAir) {
    if (typeId.includes("fence_gate") && !isOpen || typeId.includes("fence") && !typeId.includes("fence_gate")) {
      blockAbove.setType(INVISIBLE_BLOCK_ID3);
    }
  } else if (blockAbove.typeId === INVISIBLE_BLOCK_ID3) {
    if (typeId.includes("fence_gate") && isOpen || !blockAbove.isAir && !blockAbove.isLiquid) {
      blockAbove.setType("minecraft:air");
    }
  }
}
function updateNeighborsAt(location, dimension) {
  const { x, y, z } = location;
  const north = dimension.getBlock({ x, y, z: z - 1 });
  const south = dimension.getBlock({ x, y, z: z + 1 });
  const east = dimension.getBlock({ x: x + 1, y, z });
  const west = dimension.getBlock({ x: x - 1, y, z });
  if (north) updateFenceConnections(north);
  if (south) updateFenceConnections(south);
  if (east) updateFenceConnections(east);
  if (west) updateFenceConnections(west);
}
function getGateDirectionFromPlayerFacing(playerFacing) {
  if (Math.abs(playerFacing.x) > Math.abs(playerFacing.z)) {
    return playerFacing.x > 0 ? "west" : "east";
  } else {
    return playerFacing.z > 0 ? "north" : "south";
  }
}
function handleFenceGateInteract(player, block) {
  if (block.typeId.startsWith("minecraft:")) {
    return;
  }
  const isOpen = block.permutation.getState("gaiadimension:open");
  let newPermutation = block.permutation.withState("gaiadimension:open", !isOpen);
  block.setPermutation(newPermutation);
  updateInvisibleBlock2(block);
  player.playSound(isOpen ? "close.fence_gate" : "open.fence_gate", { location: block.location });
}
function registerFenceComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:fence", {});
  registerForBlockUpdates({
    check: (block) => block.typeId.includes("fence") && !block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:"),
    update: updateFenceConnections
  });
  registerPlaceHandler({
    check: (block) => block.typeId.includes("fence"),
    execute: (event) => {
      const { block, player } = event;
      if (block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:")) {
        const gateDirection = getGateDirectionFromPlayerFacing(player.getViewDirection());
        const newPermutation = block.permutation.withState("minecraft:cardinal_direction", gateDirection);
        block.setPermutation(newPermutation);
      }
      updateFenceConnections(block);
      updateInvisibleBlock2(block);
      updateNeighborsAt(block.location, block.dimension);
    }
  });
  registerBreakHandler({
    event: "after",
    check: () => true,
    // Handle all block breaks to update neighbors
    execute: (event) => {
      const { dimension } = event;
      const location = event.block.location;
      const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
      if (blockAbove && blockAbove.typeId === INVISIBLE_BLOCK_ID3) {
        blockAbove.setType("minecraft:air");
      }
      const blockBelow = dimension.getBlock({ x: location.x, y: location.y - 1, z: location.z });
      if (blockBelow && blockBelow.typeId.includes("fence") && !blockBelow.typeId.startsWith("minecraft:")) {
        const fenceTop = dimension.getBlock({ x: location.x, y: location.y, z: location.z });
        if (fenceTop && fenceTop.isAir) {
          fenceTop.setType(INVISIBLE_BLOCK_ID3);
        }
      }
      updateNeighborsAt(location, dimension);
      updateWallNeighborsAt(location, dimension);
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId.includes("fence") || block.typeId === INVISIBLE_BLOCK_ID3,
    execute: (event) => {
      const { player, block, blockFace, itemStack } = event;
      if (block.typeId.includes("fence_gate") && !block.typeId.startsWith("minecraft:")) {
        if (!(player.isSneaking && blockFace === Direction3.Up)) {
          event.cancel = true;
          system9.run(() => handleFenceGateInteract(player, block));
          return;
        }
      }
      if (itemStack) {
        if (block.typeId === INVISIBLE_BLOCK_ID3) {
          const blockBelow = block.below();
          if (blockBelow && blockBelow.typeId.includes("fence")) {
            event.cancel = true;
            system9.run(() => {
              if (!block.isValid) return;
              block.setType(itemStack.typeId);
              player.playSound("dig.wood", { location: block.location });
              if (player.gameMode !== GameMode4.Creative) {
                const inventory = player.getComponent("minecraft:inventory");
                const container = inventory.container;
                const item = container.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container.setItem(player.selectedSlot, item);
                  }
                }
              }
              const newBlock = block;
              updateFenceConnections(newBlock);
              updateInvisibleBlock2(newBlock);
              updateNeighborsAt(newBlock.location, newBlock.dimension);
            });
          }
        } else if (blockFace === Direction3.Up || player.isSneaking) {
          event.cancel = true;
          system9.run(() => {
            if (!block.isValid) return;
            const blockAbove = block.above();
            if (blockAbove && (blockAbove.isAir || blockAbove.typeId === INVISIBLE_BLOCK_ID3)) {
              try {
                blockAbove.setType(itemStack.typeId);
              } catch (e) {
              }
              player.playSound("dig.wood", { location: blockAbove.location });
              if (player.gameMode !== GameMode4.Creative) {
                const inventory = player.getComponent("minecraft:inventory");
                const container = inventory.container;
                const item = container.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container.setItem(player.selectedSlot, item);
                  }
                }
              }
              const newBlock = block.above();
              if (newBlock) {
                updateFenceConnections(newBlock);
                updateInvisibleBlock2(newBlock);
                updateNeighborsAt(newBlock.location, newBlock.dimension);
              }
            }
          });
        }
      }
    }
  });
}

// src/main/bedrock/ts/blocks/sapling.ts
import { GameMode as GameMode5, system as system10, ItemStack as ItemStack4 } from "@minecraft/server";

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
      system10.run(() => {
        if (!block.isValid) return;
        const blockBelow = block.below();
        const config = saplingConfig[block.typeId];
        if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
          block.dimension.spawnItem(new ItemStack4(block.typeId, 1), block.location);
          block.setType("minecraft:air");
        }
      });
    }
  });
  registerInteractHandler({
    check: (block) => block.typeId in saplingConfig,
    execute: (event) => {
      system10.run(() => {
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
              block.dimension.runCommand(`structure load ${structureName} ${location.x} ${location.y} ${location.z}`);
            } catch (e) {
              console.warn(`Failed to load structure ${structureName}: ${e}`);
            }
            if (player.getGameMode() !== GameMode5.creative) {
              const equippable = player.getComponent("minecraft:equippable");
              if (itemStack.amount > 1) {
                itemStack.amount--;
                equippable.setEquipment("Mainhand", itemStack);
              } else {
                equippable.setEquipment("Mainhand");
              }
            }
          } else {
            block.dimension.spawnParticle("minecraft:crop_growth_emitter", block.location);
            if (player.getGameMode() !== GameMode5.creative) {
              const equippable = player.getComponent("minecraft:equippable");
              if (itemStack.amount > 1) {
                itemStack.amount--;
                equippable.setEquipment("Mainhand", itemStack);
              } else {
                equippable.setEquipment("Mainhand");
              }
            }
          }
        }
      });
    }
  });
}

// src/main/bedrock/ts/blocks/button.ts
import { system as system13 } from "@minecraft/server";

// src/main/bedrock/ts/systems/Redstone.ts
import { system as system12 } from "@minecraft/server";

// src/main/bedrock/ts/utils.ts
import { world as world9, system as system11 } from "@minecraft/server";
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
    soundId = isOpen ? "random.click" : "random.click";
  }
  const soundOptions = {
    volume: options.volume ?? 1,
    pitch: options.pitch ?? 1
  };
  block.dimension.playSound(soundId, block.location, soundOptions);
}
var REDSTONE_COMPONENTS = ["redstone_wire", "repeater", "comparator", "redstone_torch"];
function getRedstonePower(block) {
  let power = block.getRedstonePower() ?? 0;
  if (power > 0) return power;
  const faces = ["north", "south", "east", "west", "below", "above"];
  for (const face of faces) {
    const neighbor = block[face]();
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
  return new Promise((resolve) => system11.runTimeout(resolve, ticks));
}
var invertFace = {
  "north": "south",
  "south": "north",
  "east": "west",
  "west": "east",
  "above": "below",
  "below": "above"
};

// src/main/bedrock/ts/systems/Redstone.ts
var RedstoneControl = {
  // Door tracking system
  // Maps door keys to tracker info
  doorTrackers: /* @__PURE__ */ new Map(),
  /**
   * Wakes up the door tracking system for a specific source.
   * Call this when a button/plate is pressed.
   * @param {Block} sourceBlock - The block that initiated the signal
   */
  updateRedstonePower(sourceBlock) {
    const doorInfos = this.traceNetworkForDoors(sourceBlock);
    for (const doorInfo of doorInfos) {
      this.trackDoor(doorInfo.block, sourceBlock);
      const doorKey = this.getBlockKey(doorInfo.block.location);
      this.checkDoorTracker(doorKey);
    }
  },
  /**
   * Adds a door to be tracked for signal timeout
   */
  trackDoor(doorBlock, sourceBlock) {
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
        lastSignalTick: system12.currentTick,
        checkInterval: null
      };
      this.doorTrackers.set(doorKey, tracker);
    } else {
      tracker.lastSignalTick = system12.currentTick;
    }
    if (!tracker.checkInterval) {
      tracker.checkInterval = system12.runInterval(() => {
        this.checkDoorTracker(doorKey);
      }, 5);
    }
  },
  /**
   * Checks a door tracker and handles redstone power logic
   */
  checkDoorTracker(doorKey) {
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
  },
  stopTracking(doorKey) {
    const tracker = this.doorTrackers.get(doorKey);
    if (tracker && tracker.checkInterval) {
      system12.clearRun(tracker.checkInterval);
    }
    this.doorTrackers.delete(doorKey);
  },
  setDoorState(doorBlock, open) {
    try {
      let lowerDoor = doorBlock;
      let upperDoor = void 0;
      if (doorBlock.typeId.includes("_upper")) {
        lowerDoor = doorBlock.below();
        upperDoor = doorBlock;
      } else {
        upperDoor = doorBlock.above();
      }
      if (lowerDoor && lowerDoor.isValid && lowerDoor.typeId.includes("gaiadimension:p")) {
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
  },
  // Kept for "Wake Up" phase
  openAndTrackDoor(doorBlock, sourceBlock) {
    this.trackDoor(doorBlock, sourceBlock);
    const key = this.getBlockKey(doorBlock.location);
    this.checkDoorTracker(key);
  },
  updateDoorTracker(doorBlock, sourceBlock) {
    this.trackDoor(doorBlock, sourceBlock);
  },
  /**
   * Traces the redstone network to find custom doors.
   * Uses simple connectivity logic.
   */
  traceNetworkForDoors(sourceBlock, maxDepth = 15) {
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
  },
  isRedstoneConductor(block) {
    if (!block) return false;
    const typeId = block.typeId;
    return typeId === "minecraft:redstone_wire" || typeId.includes("repeater") || typeId.includes("redstone_torch") || typeId === "minecraft:redstone_block" || typeId.includes("piston") || typeId.includes("comparator");
  },
  getNeighbors(location) {
    const { x, y, z } = location;
    return [
      { x: x + 1, y, z },
      { x: x - 1, y, z },
      { x, y: y + 1, z },
      { x, y: y - 1, z },
      { x, y, z: z + 1 },
      { x, y, z: z - 1 }
    ];
  },
  getBlockKey(location) {
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
            let perm = doorBlock.permutation;
            if (perm.getState("gaiadimension:open") !== void 0 && perm.getState("gaiadimension:open") !== newState) {
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
    system13.runTimeout(() => {
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
      system13.run(() => {
        const { player, block } = event;
        if (block.typeId.includes("button")) {
          updateCustomDoorsOnly(block, true);
          const foundDoors = RedstoneControl.traceNetworkForDoors(block);
          for (const doorInfo of foundDoors) {
            RedstoneControl.openAndTrackDoor(doorInfo.block, block);
          }
          system13.runTimeout(() => {
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
      system13.run(() => handleCustomButtonPress(event.player, event.block));
    }
  });
}

// src/main/bedrock/ts/blocks/pressure_plate.ts
import { system as system14, world as world12 } from "@minecraft/server";
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
    const neighborBlock = block[dir]();
    if (neighborBlock) {
      let perm = neighborBlock.permutation;
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
  } else {
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
      let activators = doorStates.get(activationKey) || /* @__PURE__ */ new Set();
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
      const dimension = world12.getDimension(dimensionId);
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
system14.runInterval(() => {
  const players = world12.getAllPlayers();
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
        const dimension = world12.getDimension(dimensionId);
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
        const dimension = world12.getDimension(dimensionId);
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
system14.runInterval(() => {
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
import { system as system15, BlockPermutation as BlockPermutation5 } from "@minecraft/server";
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
    if (neighbor?.hasTag(tag)) {
      system15.run(() => updateStair(neighbor));
    }
  }
}
function updateBlocker(block) {
  const above = block.above();
  const below = block.below();
  if (above?.typeId === blocker && above.permutation.getState("minecraft:vertical_half") === "bottom") {
    above.setPermutation(BlockPermutation5.resolve("minecraft:air"));
  } else if (below?.typeId === blocker && below.permutation.getState("minecraft:vertical_half") === "top") {
    below.setPermutation(BlockPermutation5.resolve("minecraft:air"));
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
    if (target && (target.isAir || target.typeId === "minecraft:water" || target.typeId.includes("piston_arm"))) {
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
        BlockPermutation5.resolve(blocker).withState("minecraft:cardinal_direction", directionState).withState("minecraft:vertical_half", stairHalf).withState("gaiadimension:corner", toPlace > 3)
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
    check: (block) => block && block.hasTag(tag),
    update: updateStair
  });
  registerPlaceHandler({
    check: (block) => block.hasTag(tag) || block.north()?.hasTag(tag) || block.south()?.hasTag(tag) || block.east()?.hasTag(tag) || block.west()?.hasTag(tag) || block.above()?.hasTag(tag) || block.below()?.hasTag(tag),
    execute: (event) => {
      const { block } = event;
      const blockBelow = block.below();
      if (block.hasTag(tag)) {
        system15.run(() => updateStair(block));
      }
      if (block.hasTag(tag) && blockBelow?.hasTag(tag)) {
      } else {
        updateNeighbors2(block);
      }
    }
  });
  registerBreakHandler({
    event: "before",
    check: (block) => block.hasTag(tag),
    execute: (event) => {
      const { block } = event;
      if (!block || !block.isValid) return;
      system15.run(() => {
        const above = block.above();
        const below = block.below();
        if (above?.typeId.includes("stairs_collision")) {
          untrackBlock(above.location);
          above.setPermutation(BlockPermutation5.resolve("minecraft:air"));
        }
        if (below?.typeId === blocker) {
          untrackBlock(below.location);
          below.setPermutation(BlockPermutation5.resolve("minecraft:air"));
        }
      });
    }
  });
  registerBreakHandler({
    event: "after",
    check: (event) => {
      try {
        const { brokenBlock, dimension } = event;
        const { x, y, z } = brokenBlock.location;
        const north = dimension.getBlock({ x, y, z: z - 1 });
        const south = dimension.getBlock({ x, y, z: z + 1 });
        const east = dimension.getBlock({ x: x + 1, y, z });
        const west = dimension.getBlock({ x: x - 1, y, z });
        const above = dimension.getBlock({ x, y: y + 1, z });
        const below = dimension.getBlock({ x, y: y - 1, z });
        return [north, south, east, west, above, below].some((b) => b && b.hasTag(tag));
      } catch (e) {
        return false;
      }
    },
    execute: (event) => {
      const { brokenBlock } = event;
      if (!brokenBlock || !brokenBlock.isValid) return;
      const blockAtPos = event.dimension.getBlock(brokenBlock.location);
      if (blockAtPos) {
        updateNeighbors2(blockAtPos);
        updateBlocker(blockAtPos);
      }
    }
  });
}

// src/main/bedrock/ts/blocks/geyser.ts
import { system as system16 } from "@minecraft/server";
function pushEntities(dimension, spawnPos, duration) {
  let elapsed = 0;
  const intervalTicks = 4;
  const runId = system16.runInterval(() => {
    if (elapsed >= duration) {
      system16.clearRun(runId);
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
  system16.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id === "gaiadimension:geyser.erupt") {
      if (event.sourceBlock) {
        eruptGeyser(event.sourceBlock);
      }
    }
  });
}
function registerGeyserComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:geyser", {
    onRandomTick: ({ block }) => {
      eruptGeyser(block);
    },
    onPlayerInteract: ({ block }) => {
      eruptGeyser(block);
    }
  });
}

// src/main/bedrock/ts/blocks/sandstone_slab.ts
import { world as world14, system as system17, GameMode as GameMode6, Direction as Direction4 } from "@minecraft/server";
function handleDoubleSandstoneSlab(player, block, mainhandItem) {
  const fullBlockId = block.typeId.replace("_slab", "");
  try {
    block.setType(fullBlockId);
    player.playSound("dig.stone");
    if (player.getGameMode() !== GameMode6.Creative) {
      const equippable = player.getComponent("equippable");
      if (mainhandItem.amount > 1) {
        mainhandItem.amount--;
        equippable.setEquipment("Mainhand", mainhandItem);
      } else {
        equippable.setEquipment("Mainhand");
      }
    }
  } catch (e) {
    console.warn(`Failed to find full block type for ${block.typeId}`);
  }
}
function registerSandstoneComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:sandstone_slab", {});
  world14.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack, blockFace } = event;
    if (block.typeId.includes("sandstone_slab") && itemStack?.typeId === block.typeId) {
      const slabState = block.permutation.getState("minecraft:vertical_half");
      const isPlacingOnTop = blockFace === Direction4.Up && slabState === "bottom";
      const isPlacingOnBottom = blockFace === Direction4.Down && slabState === "top";
      if (isPlacingOnTop || isPlacingOnBottom) {
        event.cancel = true;
        system17.run(() => {
          if (block.isValid) {
            handleDoubleSandstoneSlab(player, block, itemStack);
          }
        });
      }
    }
  });
}

// src/main/bedrock/ts/blocks/stone_slab.ts
import { world as world15, system as system18, BlockPermutation as BlockPermutation7, GameMode as GameMode7, Direction as Direction5 } from "@minecraft/server";
function handleDoubleOreSlab(player, block, mainhandItem) {
  const baseId = block.typeId.replace("_slab", "");
  const possibleIds = [baseId, baseId + "s"];
  let success = false;
  for (const fullBlockId of possibleIds) {
    try {
      BlockPermutation7.resolve(fullBlockId);
      block.setType(fullBlockId);
      success = true;
      break;
    } catch (e) {
    }
  }
  if (success) {
    player.playSound("dig.stone");
    if (player.getGameMode() !== GameMode7.Creative) {
      const equippable = player.getComponent("equippable");
      if (mainhandItem.amount > 1) {
        mainhandItem.amount--;
        equippable.setEquipment("Mainhand", mainhandItem);
      } else {
        equippable.setEquipment("Mainhand");
      }
    }
  } else {
    console.warn(`Failed to find full block type for ${block.typeId}. Tried: ${possibleIds.join(", ")}`);
  }
}
function registerStoneSlabComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:stone_slab", {});
  world15.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack, blockFace } = event;
    if (block.typeId.startsWith("gaiadimension:") && block.typeId.endsWith("_slab") && !block.typeId.includes("sandstone") && itemStack?.typeId === block.typeId) {
      const slabState = block.permutation.getState("minecraft:vertical_half");
      const isPlacingOnTop = blockFace === Direction5.Up && slabState === "bottom";
      const isPlacingOnBottom = blockFace === Direction5.Down && slabState === "top";
      if (isPlacingOnTop || isPlacingOnBottom) {
        event.cancel = true;
        system18.run(() => {
          if (block.isValid) {
            handleDoubleOreSlab(player, block, itemStack);
          }
        });
      }
    }
  });
}

// src/main/bedrock/ts/blocks/furnaces/GaiaFurnace.ts
import { ItemStack as ItemStack10 } from "@minecraft/server";

// src/main/bedrock/ts/API/lib/Machine.ts
import { world as world16, system as system19, ItemStack as ItemStack7 } from "@minecraft/server";
function getSegment(initialValue, currentValue, parts) {
  if (parts === 0 || initialValue === 0) return 0;
  const ratio = Math.max(0, Math.min(1, currentValue / initialValue));
  return Math.floor(ratio * (parts - 1));
}
var TimerManager = class {
  entity;
  timers = /* @__PURE__ */ new Map();
  constructor(entity, timerConfig) {
    this.entity = entity;
    if (!timerConfig) return;
    for (const timerName in timerConfig) {
      const scoreboardId = `gaiadimension:${timerName}`;
      let objective = world16.scoreboard.getObjective(scoreboardId);
      if (!objective) {
        objective = world16.scoreboard.addObjective(scoreboardId, timerName);
      }
      let currentMax = timerConfig[timerName].max;
      Object.defineProperty(this, timerName, {
        get: () => {
          return {
            get value() {
              try {
                return objective.getScore(entity) ?? 0;
              } catch (e) {
                return 0;
              }
            },
            set value(val) {
              try {
                objective.setScore(entity, val);
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
                objective.addScore(entity, amount);
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
  /**
   * Initializes a new machine instance.
   * @param {Entity} entity - The entity representing the machine.
   * @param {Block} block - The block associated with the machine.
   */
  constructor(entity, block) {
    this.entity = entity;
    this.block = block;
    this.config = this.constructor;
    this.inventory = this.entity.getComponent("minecraft:inventory").container;
    this.timers = new TimerManager(this.entity, this.config.TIMERS);
    this.tickCount = 0;
    this.uiTickCount = 0;
    this.cachedPlayers = [];
    this.locKey = null;
    this.cachedUiProfile = null;
    this.isViewed = false;
    this.lastTickTime = system19.currentTick;
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
   * @param {Object} uiProfile - The current UI configuration.
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
        this.setInventoryItem(slot, new ItemStack7(expectedId, 1), uiProfile);
        try {
          this.block.dimension.playSound("random.click", this.block.location);
        } catch (e) {
        }
        if (typeof this[btnConfig.callback] === "function") {
          this[btnConfig.callback](this.cachedPlayers[0]);
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
          const ejectedStack = new ItemStack7(currentItem.typeId, amountToEject);
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
   * @param {string} name - The new name for the item.
   * @param {string[]} lore - The new lore strings for the item.
   * @param {Object} cachedUiProfile - Optional cached profile.
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
  processTick() {
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
          this.setInventoryItem(slot, new ItemStack7(desiredId, 1), uiProfile);
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
            this.setInventoryItem(part.slot, new ItemStack7(frameId, 1), uiProfile);
          } catch (e) {
          }
        }
      }
    }
  }
  /**
   * Checks if an item is a protected UI element (static or animated).
   * @param {ItemStack} item 
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
        const remainder = inventory.container.addItem(itemStack);
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
    const hopperInventory = hopperBlock.getComponent("minecraft:inventory")?.container;
    if (!hopperInventory) return;
    for (const slot of sourceSlots) {
      const item = this.inventory.getItem(slot);
      if (!item) continue;
      const itemToMove = new ItemStack7(item.typeId, 1);
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
    const hopperInventory = hopperBlock.getComponent("minecraft:inventory")?.container;
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
        const newItem = new ItemStack7(itemToMove.typeId, 1);
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
        itemsToDrop.push(new ItemStack7(item.typeId, item.amount));
        try {
          this.inventory.setItem(slot, void 0);
        } catch (e) {
        }
      }
    }
    if (itemsToDrop.length > 0) {
      system19.run(() => {
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
   * @param {Object} config - The machine's UI_CONFIG
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
world16.afterEvents.entitySpawn.subscribe((event) => {
  const { entity } = event;
  if (entity.typeId !== "minecraft:item") return;
  try {
    const itemComp = entity.getComponent("minecraft:item");
    if (!itemComp || !itemComp.itemStack) return;
    const typeId = itemComp.itemStack.typeId;
    if (BANNED_ITEMS.has(typeId)) {
      system19.run(() => {
        try {
          if (entity.isValid) entity.remove();
        } catch (e) {
        }
      });
      return;
    }
    for (const prefix of BANNED_PREFIXES) {
      if (typeId.startsWith(prefix)) {
        system19.run(() => {
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
  "minecraft:coobled_deepslate": {
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
    scriptedOutput: function(item = MC.ItemStack("air")) {
      let colorValues = MC.BlockStates.get("color").validValues;
      for (let i = 0; i < colorValues.length; i++) {
        let condition = `{"color": "${colorValues[i]}"}`;
        let block = MC.BlockPermutation.resolve(item.typeId, JSON.parse(condition));
        let itemCompare = block.getItemStack(1);
        if (item.isStackableWith(itemCompare)) {
          let output = new MC.ItemStack(`minecraft:${colorValues[i]}_glazed_terracotta`);
          return output;
        }
      }
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
import { world as world17, system as system20, ItemStack as ItemStack9 } from "@minecraft/server";
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
    system20.runInterval(() => this.tick(), 1);
    system20.runTimeout(() => this.resumeTests(), 40);
    world17.afterEvents.entityLoad.subscribe((ev) => {
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
    const currentTick = system20.currentTick;
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
            inv.setItem(0, new ItemStack9(inputId, 1));
            inv.setItem(1, new ItemStack9("minecraft:oak_log", 1));
            inv.setItem(2, void 0);
          }
        }
      } catch (e) {
      }
    }
    this.runtimeTests.set(inputId, {
      stage: 0,
      nextTick: system20.currentTick + 60,
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
        const dim = world17.getDimension(data.dimId);
        if (dim) this.startTest(inputId, data.location, dim);
      } catch (e) {
      }
    }
  }
  loadState() {
    try {
      const activeRaw = world17.getDynamicProperty(`${DB_PREFIX}tests`);
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        for (const [k, v] of Object.entries(parsed)) this.activeTests.set(k, v);
      }
      const customRaw = world17.getDynamicProperty(`${DB_PREFIX}recipes`);
      if (customRaw) {
        this.customRecipes = JSON.parse(customRaw);
        this.applyRecipes();
      }
    } catch (e) {
    }
  }
  saveState(key) {
    try {
      if (key === "tests") world17.setDynamicProperty(`${DB_PREFIX}tests`, JSON.stringify(Object.fromEntries(this.activeTests)));
      else if (key === "recipes") world17.setDynamicProperty(`${DB_PREFIX}recipes`, JSON.stringify(this.customRecipes));
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
import { world as world18, system as system21 } from "@minecraft/server";
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
    world18.afterEvents.playerPlaceBlock.subscribe(this.handlePlayerPlaceBlock.bind(this));
    world18.beforeEvents.playerBreakBlock.subscribe(this.handlePlayerBreakBlock.bind(this));
    world18.afterEvents.explosion.subscribe(this.handleExplosion.bind(this));
    system21.runInterval(this.handlePlayerViewCheck.bind(this), 5);
    system21.runInterval(this.handleMachineTick.bind(this), 1);
    world18.afterEvents.worldLoad.subscribe(this.handleWorldLoad.bind(this));
    world18.afterEvents.entityLoad.subscribe(this.handleEntityLoad.bind(this));
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
    this.lastPlacementTick = system21.currentTick;
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
      system21.run(() => {
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
        system21.run(() => {
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
    for (const player of world18.getAllPlayers()) {
      const blockHit = player.getBlockFromViewDirection({ maxDistance: 7 });
      let targetMachine = null;
      if (blockHit) {
        const locKey = `${blockHit.block.x},${blockHit.block.y},${blockHit.block.z}`;
        const entityId = this.locationToEntityId.get(locKey);
        if (entityId) {
          targetMachine = this.activeMachineInstances.get(entityId) || null;
        } else if (this.registeredMachineClasses.has(blockHit.block.typeId) && !this.pendingSpawns.has(locKey)) {
          if (system21.currentTick - this.lastPlacementTick > 20) {
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
    const currentTick = system21.currentTick;
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
    console.warn("[BlockEntity] World load handling started...");
    const dimensions = ["overworld", "nether", "the_end"].map((id) => world18.getDimension(id));
    dimensions.forEach((dimension) => {
      const entities = dimension.getEntities({ families: ["luminiae_generic"] });
      console.warn(`[BlockEntity] Found ${entities.length} generic block entities in ${dimension.id}`);
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
      this.addToSlot(15, new ItemStack10(recipe.output, 1), profile);
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
      return { output: nativeRecipes[input.typeId].output, time: 200 };
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
    onPlace: ({ block, dimension }) => {
      const location = block.location;
      const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
      try {
        const entity = dimension.spawnEntity("luminiae_generic:block_entity", center);
        BlockEntity_default.registerEntityAsMachine(entity);
      } catch (e) {
        console.warn("Failed to spawn gaia furnace entity", e);
      }
    },
    onPlayerDestroy: ({ block, dimension }) => {
    }
  });
}

// src/main/bedrock/ts/blocks/glittering_fire.ts
import { world as world20, system as system23 } from "@minecraft/server";

// src/main/bedrock/ts/API/lib/PortalLib.ts
import { BlockPermutation as BlockPermutation9, BlockVolume } from "@minecraft/server";
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
      console.warn("[PortalLib] tryIgnite called with invalid block");
      return false;
    }
    for (const [portalId, config] of this.registeredPortals) {
      if (this.attemptPortalCreation(originBlock, portalId, config.frameId)) {
        console.warn(`[PortalLib] Portal created successfully: ${portalId}`);
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
      console.warn(`[PortalLib] Height too small: ${height}`);
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
          console.warn(`[PortalLib] MinSide check failed at i=${i}`);
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
          console.warn(`[PortalLib] MaxSide check failed at i=${i}`);
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
      const perm = BlockPermutation9.resolve(portalId);
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
        console.warn("PortalLib: fillBlocks failed: " + e);
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
  /**
   * Port of GaiaTeleporter.makePortal logic
   */
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
    if (d0 === -1) {
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
            if (blk) blk.setPermutation(BlockPermutation9.resolve(isFloor ? frameBlockId : "minecraft:air"));
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
          if (blk) blk.setPermutation(BlockPermutation9.resolve(frameBlockId));
        }
      }
    }
    const portalPerm = BlockPermutation9.resolve(portalBlockId);
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
  // --- Helpers ---
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
      return block && !block.isAir && !block.isLiquid && !block.typeId.includes("minecraft:light_block");
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
  /**
   * Generator that yields spiral coordinates around a center.
   */
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

// src/main/bedrock/ts/blocks/glittering_fire.ts
PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");
var playerHitboxes = /* @__PURE__ */ new Map();
function registerGlitteringFireComponent() {
  system23.runInterval(() => {
    for (const player of world20.getAllPlayers()) {
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
  world20.afterEvents.playerLeave.subscribe((event) => {
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
  world20.afterEvents.entityHitEntity.subscribe((event) => {
    const { hitEntity } = event;
    if (hitEntity.typeId === "gaiadimension:fire_hitbox") {
      const loc = hitEntity.location;
      const blockLoc = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
      const dimension = hitEntity.dimension;
      system23.run(() => {
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
  world20.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      system23.run(() => {
        try {
          const dimension = block.dimension;
          const location = block.location;
          const currentBlock = dimension.getBlock(location);
          if (currentBlock && currentBlock.typeId === "gaiadimension:glittering_fire") {
            PortalManager.tryIgnite(currentBlock);
          }
        } catch (e) {
        }
      });
    }
  });
  world20.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      event.cancel = true;
    }
  });
  world20.afterEvents.playerBreakBlock.subscribe((event) => {
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
    return {
      uiPath: "crude_storage_crate_ui",
      inventorySize: this.INVENTORY_SIZE,
      slots: []
    };
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
    onPlace: ({ block, dimension }) => {
      const location = block.location;
      const center = { x: location.x + 0.5, y: location.y, z: location.z + 0.5 };
      try {
        const entity = dimension.spawnEntity("gaiadimension:crude_storage_crate", center);
        BlockEntity_default.registerEntityAsMachine(entity);
      } catch (e) {
        console.warn("Failed to spawn crude storage crate entity", e);
      }
    },
    onPlayerDestroy: ({ block, dimension }) => {
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
    return {
      uiPath: "mega_storage_crate_ui",
      inventorySize: this.INVENTORY_SIZE,
      slots: []
    };
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
    onPlace: ({ block, dimension }) => {
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
import { world as world23, system as system26, BlockPermutation as BlockPermutation11 } from "@minecraft/server";

// src/main/bedrock/ts/world/Gaia.ts
import { world as world22, system as system25, BlockPermutation as BlockPermutation10 } from "@minecraft/server";

// src/main/bedrock/ts/world/ModDimension.ts
import { world as world21, system as system24 } from "@minecraft/server";
var ALL_MOD_DIMENSIONS = {};
var ModDimension = class _ModDimension {
  type;
  range;
  center;
  _inheritanceId;
  _inheritance;
  eventsHandler;
  constructor({ type: type2, range, inheritance }) {
    this.type = type2;
    this.range = range;
    this.center = {
      x: (this.range.start.x + this.range.end.x) / 2,
      z: (this.range.start.z + this.range.end.z) / 2
    };
    this._inheritanceId = inheritance;
    this._inheritance = void 0;
    this.eventsHandler = new DimensionEvents(this);
  }
  get inheritance() {
    if (!this._inheritance) {
      this._inheritance = world21.getDimension(this._inheritanceId);
    }
    return this._inheritance;
  }
  getCenter() {
    return {
      x: this.center.x,
      z: this.center.z
    };
  }
  getEvents() {
    return this.eventsHandler;
  }
  isInDimension(location) {
    return this.range.start.x <= location.x && location.x <= this.range.end.x && this.range.start.z <= location.z && location.z <= this.range.end.z;
  }
  getEntities(entityQueryOptions) {
    return this.inheritance.getEntities(entityQueryOptions).filter(
      (entity) => this.isInDimension(entity.location)
    );
  }
  getPlayers(entityQueryOptions) {
    return this.inheritance.getPlayers(entityQueryOptions).filter(
      (player) => this.isInDimension(player.location)
    );
  }
  offset(location) {
    return {
      x: location.x - this.getCenter().x,
      y: location.y,
      z: location.z - this.getCenter().z
    };
  }
  static register(id, options) {
    if (_ModDimension.get(id) !== void 0) {
      throw new Error('Dimension with id "' + id + '" is already registered');
    }
    const range = options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } };
    const inheritance = options.inheritance || "the_end";
    const dim = new _ModDimension({
      type: id,
      range,
      inheritance
    });
    ALL_MOD_DIMENSIONS[id] = dim;
    return dim;
  }
  static get(id) {
    return ALL_MOD_DIMENSIONS[id];
  }
  static getAll() {
    return Object.values(ALL_MOD_DIMENSIONS);
  }
};
var DimensionEvents = class {
  dimension;
  players = {};
  events = {};
  constructor(dimension) {
    this.dimension = dimension;
    system24.runInterval(() => {
      const currentPlayers = this.dimension.getPlayers();
      const newPlayers = currentPlayers.filter((player) => !this.players[player.id]);
      const leavingPlayers = Object.keys(this.players).filter((id) => !currentPlayers.some((player) => player.id === id));
      leavingPlayers.forEach((id, index) => {
        const player = world21.getEntity(id);
        if (player && player.isValid) {
          delete this.players[id];
          system24.runTimeout(() => {
            this.triggerEvent("onLeave", player);
          }, index + 1);
        }
      });
      newPlayers.forEach((player, index) => {
        this.players[player.id] = player;
        system24.runTimeout(() => {
          this.triggerEvent("onJoin", player);
        }, leavingPlayers.length + index + 1);
      });
    }, 20);
  }
  addEvent(id, type2, callback) {
    if (this.events[id]) throw new Error("Event with ID " + id + " has already been registered");
    const event = new DimensionEvent(id, type2, callback, this);
    this.events[id] = event;
    return event;
  }
  removeEvent(eventId) {
    delete this.events[eventId];
  }
  getEvent(id) {
    return this.events[id];
  }
  getAllEvents() {
    return Object.values(this.events);
  }
  onJoin(id, callback) {
    return this.addEvent(id, "onJoin", callback);
  }
  onLeave(id, callback) {
    return this.addEvent(id, "onLeave", callback);
  }
  triggerEvent(type2, player) {
    for (const event of this.getAllEvents()) {
      if (event.type === type2) {
        event.callback(event, player);
      }
    }
  }
};
var DimensionEvent = class {
  id;
  type;
  callback;
  handler;
  constructor(id, type2, callback, handler) {
    this.id = id;
    this.type = type2;
    this.callback = callback;
    this.handler = handler;
  }
  remove() {
    this.handler.removeEvent(this.id);
  }
};

// src/main/bedrock/ts/config/biome_config.ts
var BIOME_MAPPING = /* @__PURE__ */ new Map([
  ["gaiadimension:bedrock_blue_agate_taiga", "blue_agate_taiga"],
  ["gaiadimension:bedrock_crystal_plains", "crystal_plains"],
  ["gaiadimension:bedrock_fossil_woodland", "fossil_woodland"],
  ["gaiadimension:bedrock_goldstone_lands", "goldstone_lands"],
  ["gaiadimension:bedrock_green_agate_jungle", "green_agate_jungle"],
  ["gaiadimension:bedrock_mineral_resevoir", "mineral_resevoir"],
  ["gaiadimension:bedrock_mineral_river", "mineral_river"],
  ["gaiadimension:bedrock_mutant_agate_wildwood", "mutant_agate_wildwood"],
  ["gaiadimension:bedrock_pink_agate_forest", "pink_agate_forest"],
  ["gaiadimension:bedrock_purple_agate_swamp", "purple_agate_swamp"],
  ["gaiadimension:bedrock_salt_dunes", "salt_dunes"],
  ["gaiadimension:bedrock_shining_grove", "shining_grove"],
  ["gaiadimension:bedrock_smoldering_bog", "smoldering_bog"],
  ["gaiadimension:bedrock_static_wasteland", "static_wasteland"],
  ["gaiadimension:bedrock_volcanic_lands", "volcanic_lands"]
]);

// src/main/bedrock/ts/world/Gaia.ts
var GAIA_DIMENSION_ID = "gaia_dimension";
var RANGE_START = 1e5;
var RANGE_END = 4e5;
var GaiaDimension;
var PortalLinker = class {
  static getLink(dimensionId, x, y, z) {
    const key = `link_${dimensionId}_${Math.floor(x)}_${Math.floor(y)}_${Math.floor(z)}`;
    const data = world22.getDynamicProperty(key);
    return data ? JSON.parse(data) : null;
  }
  static setLink(fromDim, fromX, fromY, fromZ, toDim, toX, toY, toZ) {
    const key = `link_${fromDim}_${Math.floor(fromX)}_${Math.floor(fromY)}_${Math.floor(fromZ)}`;
    const value = JSON.stringify({ dimensionId: toDim, x: toX, y: toY, z: toZ });
    world22.setDynamicProperty(key, value);
  }
};
var PENDING_TASKS = [];
var DimensionSystem = class {
  static isInGaia(entity) {
    if (!entity || !entity.isValid || !GaiaDimension) return false;
    if (entity.dimension.id !== GaiaDimension.inheritance.id) return false;
    return GaiaDimension.isInDimension(entity.location);
  }
  static getBiomeAt(dimension, location) {
    try {
      const px = Math.floor(location.x);
      const pz = Math.floor(location.z);
      let block = dimension.getBlock({ x: px, y: 0, z: pz });
      if (!block || !block.isValid || !BIOME_MAPPING.has(block.typeId)) {
        block = dimension.getBlock({ x: px, y: -64, z: pz });
      }
      if (block && block.isValid && BIOME_MAPPING.has(block.typeId)) {
        return BIOME_MAPPING.get(block.typeId);
      }
    } catch (e) {
    }
    return "crystal_plains";
  }
  static getBiome(entity) {
    if (!entity || !entity.isValid) return "crystal_plains";
    return this.getBiomeAt(entity.dimension, entity.location);
  }
  static findPortalBlock(dimension, center) {
    const px = Math.floor(center.x);
    const py = Math.floor(center.y);
    const pz = Math.floor(center.z);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -16; dy <= 16; dy++) {
          const y = py + dy;
          if (y < dimension.heightRange.min || y > dimension.heightRange.max) continue;
          try {
            const b = dimension.getBlock({ x: px + dx, y, z: pz + dz });
            if (b && b.typeId === "gaiadimension:gaia_dimension_portal") return { x: px + dx, y, z: pz + dz };
          } catch (e) {
          }
        }
      }
    }
    return null;
  }
  static getTopBlock(dimension, x, z, startY = 319) {
    for (let y = startY; y > dimension.heightRange.min; y--) {
      try {
        const block = dimension.getBlock({ x, y, z });
        if (block && !block.isAir && !block.typeId.includes("liquid") && block.typeId !== "gaiadimension:gaia_dimension_portal") {
          return y + 1;
        }
      } catch (e) {
      }
    }
    return 100;
  }
  static handleTeleport(player, sourceDim, targetDimId, isToGaia) {
    if (!player.isValid || !GaiaDimension) return;
    const inGaiaCurrently = this.isInGaia(player);
    if (sourceDim.id === targetDimId && inGaiaCurrently === isToGaia) return;
    player.setDynamicProperty("gaiadimension:last_teleport", system25.currentTick);
    player.addTag("gaiadimension:teleport_cooldown");
    if (isToGaia) player.addTag("gaiadimension:in_gaia");
    else player.removeTag("gaiadimension:in_gaia");
    const sourceLoc = player.location;
    const sourcePortalLoc = this.findPortalBlock(sourceDim, sourceLoc) || sourceLoc;
    const center = GaiaDimension.getCenter();
    let targetX, targetZ;
    if (isToGaia) {
      targetX = Math.max(RANGE_START, Math.min(RANGE_END, sourceLoc.x / 4 + center.x));
      targetZ = Math.max(RANGE_START, Math.min(RANGE_END, sourceLoc.z / 4 + center.z));
    } else {
      targetX = (sourceLoc.x - center.x) * 4;
      targetZ = (sourceLoc.z - center.z) * 4;
    }
    const targetDim = world22.getDimension(targetDimId);
    const areaName = `portal_${player.id}`;
    try {
      targetDim.runCommand(`tickingarea add circle ${Math.floor(targetX)} 100 ${Math.floor(targetZ)} 2 ${areaName}`);
    } catch (e) {
    }
    PENDING_TASKS.push({
      playerId: player.id,
      targetDimId,
      targetX,
      targetZ,
      sourcePortalLoc: { x: sourcePortalLoc.x, y: sourcePortalLoc.y, z: sourcePortalLoc.z },
      sourceDimId: sourceDim.id,
      rotationY: player.getRotation().y,
      createdAt: system25.currentTick,
      areaName,
      state: "WAITING"
    });
    player.addEffect("blindness", 220, { amplifier: 0, showParticles: false });
    player.addEffect("slowness", 220, { amplifier: 255, showParticles: false });
    player.addEffect("resistance", 250, { amplifier: 255, showParticles: false });
  }
  static teleportToGaia(player) {
    if (!GaiaDimension) return;
    this.handleTeleport(player, player.dimension, GaiaDimension.inheritance.id, true);
  }
  static returnFromGaia(player) {
    this.handleTeleport(player, player.dimension, "minecraft:overworld", false);
  }
};
system25.runInterval(() => {
  if (PENDING_TASKS.length === 0) return;
  for (let i = PENDING_TASKS.length - 1; i >= 0; i--) {
    const task = PENDING_TASKS[i];
    const player = world22.getEntity(task.playerId);
    if (!player || !player.isValid) {
      try {
        world22.getDimension(task.targetDimId).runCommand(`tickingarea remove ${task.areaName}`);
      } catch (e) {
      }
      PENDING_TASKS.splice(i, 1);
      continue;
    }
    const targetDim = world22.getDimension(task.targetDimId);
    if (task.state === "WAITING") {
      if (system25.currentTick - task.createdAt < 200) continue;
      task.state = "PREPARING";
    }
    if (task.state === "PREPARING") {
      const savedLink = PortalLinker.getLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
      if (savedLink) {
        task.finalPos = { x: savedLink.x + 1, y: savedLink.y + 1, z: savedLink.z };
        task.state = "TELEPORTING";
      } else {
        let targetY = DimensionSystem.getTopBlock(targetDim, Math.floor(task.targetX), Math.floor(task.targetZ), 319);
        if (targetY >= 318) targetY = 100;
        task.targetY = targetY;
        const landingPortal = DimensionSystem.findPortalBlock(targetDim, { x: task.targetX, y: targetY, z: task.targetZ });
        if (landingPortal) {
          PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z);
          PortalLinker.setLink(task.targetDimId, landingPortal.x, landingPortal.y, landingPortal.z, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
          task.finalPos = { x: landingPortal.x + 1, y: landingPortal.y + 1, z: landingPortal.z };
          task.state = "TELEPORTING";
        } else {
          task.state = "BUILDING";
        }
      }
    }
    if (task.state === "BUILDING") {
      const px = Math.floor(task.targetX);
      const py = task.targetY;
      const pz = Math.floor(task.targetZ);
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          for (let dy = -1; dy <= 6; dy++) {
            const b = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
            if (b) {
              if (dy === -1) b.setType("minecraft:obsidian");
              else b.setType("minecraft:air");
            }
          }
        }
      }
      let rotation = task.rotationY;
      while (rotation < 0) rotation += 360;
      rotation = rotation % 360;
      let direction = "north", axis = "x";
      if (rotation >= 45 && rotation < 135) {
        direction = "east";
        axis = "z";
      } else if (rotation >= 135 && rotation < 225) {
        direction = "south";
        axis = "x";
      } else if (rotation >= 225 && rotation < 315) {
        direction = "west";
        axis = "z";
      }
      const frameBlock = "gaiadimension:keystone_block";
      const portalBlockId = "gaiadimension:gaia_dimension_portal";
      const portalPerm = BlockPermutation10.resolve(portalBlockId, { "gaiadimension:perm_dim": 0, "minecraft:cardinal_direction": direction });
      const build = (dx, dy, dz, type2, perm) => {
        const b = targetDim.getBlock({ x: px + dx, y: py + dy, z: pz + dz });
        if (b) {
          b.setType(type2);
          if (perm) b.setPermutation(perm);
        }
      };
      if (axis === "x") {
        for (let i2 = -1; i2 <= 2; i2++) {
          build(i2, 0, 0, frameBlock);
          build(i2, 4, 0, frameBlock);
        }
        for (let y = 1; y <= 3; y++) {
          build(-1, y, 0, frameBlock);
          build(2, y, 0, frameBlock);
        }
        for (let i2 = 0; i2 <= 1; i2++) for (let y = 1; y <= 3; y++) build(i2, y, 0, portalBlockId, portalPerm);
      } else {
        for (let i2 = -1; i2 <= 2; i2++) {
          build(0, 0, i2, frameBlock);
          build(0, 4, i2, frameBlock);
        }
        for (let y = 1; y <= 3; y++) {
          build(0, y, -1, frameBlock);
          build(0, y, 2, frameBlock);
        }
        for (let i2 = 0; i2 <= 1; i2++) for (let y = 1; y <= 3; y++) build(0, y, i2, portalBlockId, portalPerm);
      }
      PortalLinker.setLink(task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z, task.targetDimId, px, py, pz);
      PortalLinker.setLink(task.targetDimId, px, py, pz, task.sourceDimId, task.sourcePortalLoc.x, task.sourcePortalLoc.y, task.sourcePortalLoc.z);
      task.finalPos = { x: px + 1, y: py + 1, z: pz };
      task.state = "TELEPORTING";
    }
    if (task.state === "TELEPORTING") {
      if (task.finalPos) player.teleport(task.finalPos, { dimension: targetDim });
      player.setDynamicProperty("gaiadimension:last_teleport", system25.currentTick);
      const areaName = task.areaName;
      const targetDimId = task.targetDimId;
      system25.runTimeout(() => {
        try {
          world22.getDimension(targetDimId).runCommand(`tickingarea remove ${areaName}`);
        } catch (e) {
        }
      }, 100);
      PENDING_TASKS.splice(i, 1);
    }
  }
}, 10);
world22.beforeEvents.weatherChange.subscribe((event) => {
  let anyPlayerInGaia = false;
  for (const player of world22.getAllPlayers()) {
    if (player.isValid && DimensionSystem.isInGaia(player)) {
      anyPlayerInGaia = true;
      break;
    }
  }
  if (anyPlayerInGaia) {
    event.cancel = true;
  }
});
system25.run(() => {
  try {
    GaiaDimension = ModDimension.register(GAIA_DIMENSION_ID, {
      range: { start: { x: RANGE_START, z: RANGE_START }, end: { x: RANGE_END, z: RANGE_END } },
      inheritance: "minecraft:overworld"
    });
  } catch (e) {
  }
});
var isAlwaysDayActive = false;
system25.runInterval(() => {
  const players = world22.getAllPlayers();
  let anyPlayerInGaia = false;
  for (const player of players) {
    if (!player.isValid) continue;
    const inGaia = DimensionSystem.isInGaia(player);
    if (inGaia) anyPlayerInGaia = true;
    const lastTeleport = player.getDynamicProperty("gaiadimension:last_teleport") || 0;
    const timeDiff = system25.currentTick - lastTeleport;
    if (timeDiff > 300 && player.hasTag("gaiadimension:teleport_cooldown")) player.removeTag("gaiadimension:teleport_cooldown");
    if (timeDiff < 100) continue;
    if (player.hasTag("gaiadimension:teleport_cooldown")) continue;
    if (player.hasTag("gaiadimension:in_gaia") && player.dimension.id === "minecraft:overworld") {
      if (!inGaia && GaiaDimension) {
        const center = GaiaDimension.getCenter();
        const targetX = Math.max(RANGE_START + 10, Math.min(RANGE_END - 10, player.location.x + center.x));
        const targetZ = Math.max(RANGE_START + 10, Math.min(RANGE_END - 10, player.location.z + center.z));
        player.teleport({ x: targetX, y: player.location.y, z: targetZ }, { dimension: player.dimension });
        continue;
      }
    } else if (player.dimension.id === "minecraft:overworld" && inGaia && GaiaDimension) {
      const center = GaiaDimension.getCenter();
      const targetX = player.location.x - center.x;
      const targetZ = player.location.z - center.z;
      player.teleport({ x: targetX, y: player.location.y, z: targetZ }, { dimension: player.dimension });
      continue;
    }
    const dimension = player.dimension;
    const loc = player.location;
    const px = Math.floor(loc.x), py = Math.floor(loc.y), pz = Math.floor(loc.z);
    let inPortal = false;
    const b1 = dimension.getBlock({ x: px, y: py, z: pz });
    const b2 = dimension.getBlock({ x: px, y: py + 1, z: pz });
    if (b1?.typeId === "gaiadimension:gaia_dimension_portal" || b2?.typeId === "gaiadimension:gaia_dimension_portal") inPortal = true;
    if (inPortal) {
      if (inGaia) DimensionSystem.returnFromGaia(player);
      else if (dimension.id === "minecraft:overworld") DimensionSystem.teleportToGaia(player);
    }
  }
  if (anyPlayerInGaia && !isAlwaysDayActive) {
    const overworld = world22.getDimension("minecraft:overworld");
    overworld.runCommand("alwaysday true");
    overworld.runCommand("weather clear");
    isAlwaysDayActive = true;
  } else if (!anyPlayerInGaia && isAlwaysDayActive) {
    world22.getDimension("minecraft:overworld").runCommand("alwaysday false");
    isAlwaysDayActive = false;
  }
}, 10);
world22.afterEvents.entitySpawn.subscribe((event) => {
  const { entity } = event;
  if (!entity || !entity.isValid) return;
  if (entity.typeId === "minecraft:enderman" && DimensionSystem.isInGaia(entity)) {
    if (Math.random() < 0.95) system25.run(() => {
      if (entity.isValid) entity.remove();
    });
  }
});
world22.afterEvents.gameRuleChange.subscribe(({ rule, value }) => {
  if (rule === "showCoordinates" && value === false) {
    world22.getAllPlayers().forEach((player) => player.onScreenDisplay.setActionBar(`\xA7.`));
  }
});

// src/main/bedrock/ts/mixins/LightMixin.ts
var lightBlockPermutation;
system26.run(() => {
  try {
    lightBlockPermutation = BlockPermutation11.resolve("minecraft:light_block", { "minecraft:block_light_level": 15 });
  } catch (e) {
  }
});
function placeLight(dimension, location) {
  if (!lightBlockPermutation) return;
  try {
    const block = dimension.getBlock(location);
    if (block && block.isAir) {
      block.setPermutation(lightBlockPermutation);
    }
  } catch (e) {
  }
}
function initializeLightMixin() {
  world23.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;
    const dimId = dimension.id;
    let stateVal = 0;
    const typeId = block.typeId;
    const isExcluded = typeId === "gaiadimension:glittering_fire" || typeId === "gaiadimension:stairs_collision" || typeId.includes("curtain") || typeId.includes("door") || typeId.includes("fluid") || typeId.includes("liquid") || typeId.includes("water") || typeId.includes("magma") || typeId.includes("muck");
    if (player && DimensionSystem.isInGaia(player) && !isExcluded) {
      const { x, y, z } = block.location;
      const possibleLightLocations = [
        { x: x + 1, y, z },
        { x: x - 1, y, z },
        { x, y: y + 1, z },
        { x, y: y - 1, z },
        { x, y, z: z + 1 },
        { x, y, z: z - 1 }
      ];
      for (const loc of possibleLightLocations) {
        const targetBlock = dimension.getBlock(loc);
        if (targetBlock && targetBlock.isAir) {
          const { x: tx, y: ty, z: tz } = loc;
          const stairNeighbors = [
            dimension.getBlock({ x: tx, y: ty + 1, z: tz }),
            dimension.getBlock({ x: tx, y: ty - 1, z: tz })
          ];
          const isNeededForStair = stairNeighbors.some((n) => n?.hasTag("gaiadimension:stairs"));
          if (!isNeededForStair) {
            placeLight(dimension, loc);
          }
        }
      }
    }
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
  world23.afterEvents.playerBreakBlock.subscribe((event) => {
    const { player, block, dimension } = event;
    if (player && DimensionSystem.isInGaia(player)) {
      const { x, y, z } = block.location;
      const neighbors = [
        dimension.getBlock({ x, y: y + 1, z }),
        dimension.getBlock({ x, y: y - 1, z })
      ];
      const isNearStair = neighbors.some((n) => n?.hasTag("gaiadimension:stairs"));
      if (!isNearStair) {
        placeLight(dimension, block.location);
      }
    }
  });
}

// src/main/bedrock/ts/systems/scriptevents.ts
import { system as system27, ItemStack as ItemStack11 } from "@minecraft/server";
function initializeScriptEvents() {
  system27.afterEvents.scriptEventReceive.subscribe((event) => {
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
          inventory.container.addItem(new ItemStack11("gaiadimension:agate_arrow", 1));
        }
      }
    }
  });
}

// src/main/bedrock/ts/fluids/fluids.ts
import { world as world25, system as system28, BlockPermutation as BlockPermutation12, ItemStack as ItemStack12, BlockVolume as BlockVolume2, GameMode as GameMode8 } from "@minecraft/server";
var fluids = [
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
var fluidIDs = new Set(fluids);
var FluidTemplate = class {
  baseId;
  interactions;
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
};
var idToTemplate = /* @__PURE__ */ new Map();
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
  const targets = Array.isArray(targetId) ? targetId : [targetId];
  template.addInteraction("adjacent", targets, "transformTarget", resultId, sound);
}
var MAGMA = "gaiadimension:superhot_magma";
var AURA = "gaiadimension:liquid_aura";
var MINERAL = "gaiadimension:mineral_water";
var MUCK = "gaiadimension:sweet_muck";
var PRIMAL = "gaiadimension:primal_mass";
var AURA_CRYSTAL_BLOCK = "gaiadimension:aura_crystal_block";
var WATER_VARIANTS = ["minecraft:water", "minecraft:flowing_water"];
registerFluidInteraction(MAGMA, getFluidVariants(AURA), AURA_CRYSTAL_BLOCK, "random.fizz");
registerFluidInteraction(AURA, getFluidVariants(MAGMA), AURA_CRYSTAL_BLOCK, "random.fizz");
registerFluidInteraction(MAGMA, [...getFluidVariants(MINERAL), ...WATER_VARIANTS], PRIMAL, "random.fizz");
registerFluidInteraction(MINERAL, getFluidVariants(MAGMA), PRIMAL, "random.fizz");
registerFluidInteraction(MUCK, getFluidVariants(MAGMA), PRIMAL, "random.fizz");
registerFluidInteraction(MAGMA, getFluidVariants(MUCK), PRIMAL, "random.fizz");
var hot_fluids = [
  "gaiadimension:superhot_magma",
  "gaiadimension:superhot_magma_down",
  "gaiadimension:superhot_magma1",
  "gaiadimension:superhot_magma2",
  "gaiadimension:superhot_magma3",
  "gaiadimension:liquid_bismuth",
  "gaiadimension:liquid_bismuth_down",
  "gaiadimension:liquid_bismuth1",
  "gaiadimension:liquid_bismuth2",
  "gaiadimension:liquid_bismuth3"
];
var BUDGET = 15;
var MAX_QUEUE_SIZE = 500;
var PENDING_BLOCKS = /* @__PURE__ */ new Map();
var ACTIVE_FLUIDS = /* @__PURE__ */ new Map();
var DIRECTIONS = [
  { x: 0, y: 0, z: -1, name: "North" },
  { x: 0, y: 0, z: 1, name: "South" },
  { x: 1, y: 0, z: 0, name: "East" },
  { x: -1, y: 0, z: 0, name: "West" }
];
var playerFluidState = /* @__PURE__ */ new Map();
system28.runInterval(() => {
  const start = Date.now();
  runPlayerEffects();
  if (Date.now() - start > BUDGET) return;
  runBoatLogic();
  if (Date.now() - start > BUDGET) return;
  if (PENDING_BLOCKS.size === 0) return;
  for (const [key, data] of PENDING_BLOCKS) {
    if (Date.now() - start > BUDGET) break;
    PENDING_BLOCKS.delete(key);
    try {
      const { block, dimension } = data;
      if (block.isValid) {
        const didChange = processFluidBlock(block, dimension);
        if (didChange) {
          ACTIVE_FLUIDS.set(key, system28.currentTick);
        }
      }
    } catch (e) {
    }
  }
});
function runPlayerEffects() {
  const players = world25.getPlayers();
  for (const player of players) {
    const dimension = player.dimension;
    const location = player.location;
    const blockAt = dimension.getBlock(location);
    const blockAbove = dimension.getBlock({ x: location.x, y: location.y + 1, z: location.z });
    const blockHead = dimension.getBlock({ x: location.x, y: location.y + 1.63, z: location.z });
    const inFluidAt = blockAt && fluids.includes(blockAt.typeId);
    const inFluidAbove = blockAbove && fluids.includes(blockAbove.typeId);
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
      player.addEffect("slow_falling", 4, { amplifier, showParticles: false });
      if (player.isJumping) {
        player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
      }
      if (blockAbove && hot_fluids.includes(blockAbove.typeId) || blockAt && hot_fluids.includes(blockAt.typeId)) {
        player.setOnFire(10, true);
      } else {
        player.extinguishFire(true);
      }
    }
    const prevState = playerFluidState.get(player.id) || { head: false, feet: false };
    const isHeadInMineralWater = !!(blockHead && blockHead.typeId.includes("mineral_water"));
    const isFeetInMineralWater = !!(blockAt && blockAt.typeId.includes("mineral_water"));
    if (isHeadInMineralWater && !prevState.head) {
      player.playSound("ambient.underwater.enter", { volume: 0.5, pitch: 1 });
      player.playSound("ambient.underwater.loop", { volume: 1, pitch: 1 });
    } else if (!isHeadInMineralWater && prevState.head) {
      player.playSound("ambient.underwater.exit", { volume: 0.5, pitch: 1 });
      player.runCommand("stopsound @s ambient.underwater.loop");
    }
    const isOnSurfaceMineralWater = isFeetInMineralWater && !isHeadInMineralWater;
    if (isOnSurfaceMineralWater) {
      const velocity = player.getVelocity();
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      if (speed > 0.08 && system28.currentTick % 8 === 0) {
        player.playSound("entity.boat.paddle_water", { volume: 0.25, pitch: 1 });
      }
    }
    if (isFeetInMineralWater && !prevState.feet) {
      dimension.spawnParticle("minecraft:water_splash_particle", { x: location.x, y: location.y, z: location.z });
    }
    playerFluidState.set(player.id, { head: isHeadInMineralWater, feet: isFeetInMineralWater });
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
  if (id === "minecraft:snow_layer" || id === "minecraft:light_block" || id === "minecraft:fire" || id === "minecraft:soul_fire" || id === "minecraft:double_plant" || id === "minecraft:tallgrass" || id === "minecraft:short_grass" || id === "minecraft:deadbush" || id === "minecraft:web") return true;
  const vegetationTags = [
    "minecraft:is_plant",
    "flower",
    "plant",
    "double_plant",
    "minecraft:crop"
  ];
  if (vegetationTags.some((tag2) => blk.hasTag(tag2))) return true;
  if (id.includes("flower") || id.includes("sapling") || id.includes("bush") || id.includes("plant") || id.includes("leaf_litter")) return true;
  return false;
}
function processFluidBlock(block, dimension) {
  const typeId = block.typeId;
  let changesHappened = false;
  let currentStage = 0;
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
    currentStage = 0;
    baseId = typeId;
  }
  if (!fluidIDs.has(baseId)) return false;
  const currentTemplate = idToTemplate.get(baseId);
  if (currentTemplate) {
    const interactions = currentTemplate.getInteractions();
    for (const rule of interactions) {
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
        const isMatch = Array.isArray(rule.targetBlock) ? rule.targetBlock.includes(checkBlock.typeId) : checkBlock.typeId === rule.targetBlock;
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
          return true;
        }
      }
    }
  }
  let requiredParentTag = "";
  if (currentStage === 1) requiredParentTag = "template_full";
  else if (currentStage === 2) requiredParentTag = "template1";
  else if (currentStage === 3) requiredParentTag = "template2";
  if (currentStage > 0) {
    const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
    if (above) {
      const aboveId = above.typeId;
      const isAboveDown = aboveId === baseId + "_down";
      const isAboveHalf = aboveId === baseId + "1" || aboveId === baseId + "2" || aboveId === baseId + "3";
      if (isAboveDown || isAboveHalf) {
        const downId = baseId + "_down";
        if (block.isValid) {
          const vol = new BlockVolume2(block.location, block.location);
          dimension.fillBlocks(vol, BlockPermutation12.resolve(downId));
          changesHappened = true;
        }
        return changesHappened;
      }
    }
  }
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
        const vol = new BlockVolume2(block.location, block.location);
        dimension.fillBlocks(vol, BlockPermutation12.resolve("minecraft:air"));
        changesHappened = true;
      }
      return changesHappened;
    }
  } else if (currentStage === -1) {
    const above = dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
    if (!above) {
      if (block.isValid) {
        const vol = new BlockVolume2(block.location, block.location);
        dimension.fillBlocks(vol, BlockPermutation12.resolve("minecraft:air"));
        changesHappened = true;
      }
      return changesHappened;
    }
    const aboveId = above.typeId;
    const validParents = [baseId, baseId + "_down", baseId + "1", baseId + "2", baseId + "3"];
    if (!validParents.includes(aboveId)) {
      if (block.isValid) {
        const vol = new BlockVolume2(block.location, block.location);
        dimension.fillBlocks(vol, BlockPermutation12.resolve("minecraft:air"));
        changesHappened = true;
      }
      return changesHappened;
    }
  }
  const below = dimension.getBlock({ x: block.location.x, y: block.location.y - 1, z: block.location.z });
  let flowedDown = false;
  if (below && isReplaceable(below)) {
    const downId = baseId + "_down";
    const isDestructible = below.typeId !== "minecraft:air";
    if (below.isValid) {
      if (isDestructible) {
        below.dimension.runCommand(`setblock ${below.location.x} ${below.location.y} ${below.location.z} air destroy`);
      }
      const vol = new BlockVolume2(below.location, below.location);
      dimension.fillBlocks(vol, BlockPermutation12.resolve(downId));
      changesHappened = true;
    }
    flowedDown = true;
  } else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) {
    flowedDown = true;
  }
  const canSpread = currentStage === 0 || currentStage === -1 && !flowedDown || currentStage > 0 && currentStage < 3;
  if (canSpread) {
    const nextStageId = currentStage === 0 || currentStage === -1 ? baseId + "1" : baseId + (currentStage + 1).toString();
    for (const dir of DIRECTIONS) {
      const neighbor = dimension.getBlock({ x: block.location.x + dir.x, y: block.location.y, z: block.location.z + dir.z });
      if (neighbor) {
        let canOverwrite = false;
        if (isReplaceable(neighbor)) {
          canOverwrite = true;
        } else if (neighbor.typeId.startsWith(baseId)) {
          let neighborStage = 0;
          if (neighbor.typeId.endsWith("_down")) neighborStage = -1;
          else {
            const match = neighbor.typeId.match(/(\d)$/);
            if (match) neighborStage = parseInt(match[1]);
            else if (neighbor.typeId === baseId) neighborStage = 0;
            else neighborStage = -999;
          }
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
            const vol = new BlockVolume2(neighbor.location, neighbor.location);
            let direction = "north";
            if (dir.z === 1) direction = "south";
            else if (dir.x === 1) direction = "east";
            else if (dir.x === -1) direction = "west";
            const perm = BlockPermutation12.resolve(nextStageId, { "minecraft:cardinal_direction": direction });
            dimension.fillBlocks(vol, perm);
            changesHappened = true;
          }
        }
      }
    }
  }
  if (currentStage === 0 || currentStage === -1) {
    const perms = block.permutation.getAllStates();
    let changed = false;
    const checkDir = (dx, dy, dz, stateName) => {
      const neighbor = dimension.getBlock({ x: block.location.x + dx, y: block.location.y + dy, z: block.location.z + dz });
      const hasTag = neighbor && neighbor.hasTag("template_full");
      const val = hasTag ? 1 : 0;
      if (perms[stateName] !== void 0 && perms[stateName] !== val) {
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
      const newPerm = BlockPermutation12.resolve(typeId, perms);
      if (block.isValid) {
        const vol = new BlockVolume2(block.location, block.location);
        dimension.fillBlocks(vol, newPerm);
        changesHappened = true;
      }
    }
  }
  return changesHappened;
}
var FluidFlowComponent = class {
  constructor() {
    this.onTick = this.onTick.bind(this);
  }
  onTick(event) {
    if (PENDING_BLOCKS.size >= MAX_QUEUE_SIZE) return;
    const { block } = event;
    const key = `${block.location.x},${block.location.y},${block.location.z},${block.dimension.id}`;
    const lastActive = ACTIVE_FLUIDS.get(key);
    if (!lastActive) {
      ACTIVE_FLUIDS.set(key, system28.currentTick);
    }
    if (!PENDING_BLOCKS.has(key)) {
      PENDING_BLOCKS.set(key, { block, dimension: block.dimension });
    }
  }
};
function wakeNeighbors(location, dimension) {
  const locations = [
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 }
  ];
  for (const offset of locations) {
    const nx = location.x + offset.x;
    const ny = location.y + offset.y;
    const nz = location.z + offset.z;
    const key = `${nx},${ny},${nz},${dimension.id}`;
    ACTIVE_FLUIDS.set(key, system28.currentTick);
  }
}
world25.afterEvents.playerPlaceBlock.subscribe((event) => {
  wakeNeighbors(event.block.location, event.block.dimension);
});
world25.afterEvents.playerBreakBlock.subscribe((event) => {
  wakeNeighbors(event.block.location, event.block.dimension);
});
world25.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block, itemStack } = event;
  if (!itemStack) return;
  if (itemStack.typeId.startsWith("gaiadimension:") && itemStack.typeId.endsWith("_bucket")) {
    const fluidId = itemStack.typeId.replace("_bucket", "");
    const isFlowingVariant = (blk) => {
      return blk.typeId === fluidId + "1" || blk.typeId === fluidId + "2" || blk.typeId === fluidId + "3" || blk.typeId === fluidId + "_down";
    };
    if (isFlowingVariant(block)) {
      event.cancel = true;
      system28.run(() => {
        if (block.isValid) {
          const perm = BlockPermutation12.resolve(fluidId);
          block.setPermutation(perm);
          wakeNeighbors(block.location, block.dimension);
          const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
          const sound = isHot ? "bucket.empty_lava" : "bucket.empty_water";
          player.playSound(sound, { pitch: 1, volume: 1 });
          if (player.getGameMode() !== GameMode8.Creative) {
            const container = player.getComponent("minecraft:inventory")?.container;
            if (container) {
              const slot = player.selectedSlotIndex;
              const currentItem = container.getItem(slot);
              if (currentItem && currentItem.typeId === itemStack.typeId) {
                if (currentItem.amount > 1) {
                  currentItem.amount--;
                  container.setItem(slot, currentItem);
                  const emptyBucket = new ItemStack12("minecraft:bucket", 1);
                  const remainder = container.addItem(emptyBucket);
                  if (remainder) {
                    player.dimension.spawnItem(remainder, player.location);
                  }
                } else {
                  container.setItem(slot, new ItemStack12("minecraft:bucket", 1));
                }
              }
            }
          }
        }
      });
      return;
    }
    const raycast = player.getBlockFromViewDirection({ maxDistance: 10 });
    if (!raycast) return;
    const { face } = raycast;
    let targetLoc = { x: block.location.x, y: block.location.y, z: block.location.z };
    switch (face) {
      case "Up":
        targetLoc.y += 1;
        break;
      case "Down":
        targetLoc.y -= 1;
        break;
      case "North":
        targetLoc.z -= 1;
        break;
      case "South":
        targetLoc.z += 1;
        break;
      case "West":
        targetLoc.x -= 1;
        break;
      case "East":
        targetLoc.x += 1;
        break;
    }
    const dimension = player.dimension;
    const targetBlock = dimension.getBlock(targetLoc);
    if (targetBlock && (targetBlock.isAir || isReplaceable(targetBlock) || isFlowingVariant(targetBlock))) {
      if (targetBlock.typeId === fluidId) {
        event.cancel = true;
        system28.run(() => {
          targetBlock.setType("minecraft:air");
          wakeNeighbors(targetBlock.location, dimension);
        });
        return;
      }
      event.cancel = true;
      system28.run(() => {
        if (targetBlock.isValid) {
          const perm = BlockPermutation12.resolve(fluidId);
          targetBlock.setPermutation(perm);
          wakeNeighbors(targetBlock.location, dimension);
          const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
          const sound = isHot ? "bucket.empty_lava" : "bucket.empty_water";
          player.playSound(sound, { pitch: 1, volume: 1 });
          if (player.getGameMode() !== GameMode8.Creative) {
            const container = player.getComponent("minecraft:inventory")?.container;
            if (container) {
              const slot = player.selectedSlotIndex;
              const currentItem = container.getItem(slot);
              if (currentItem && currentItem.typeId === itemStack.typeId) {
                if (currentItem.amount > 1) {
                  currentItem.amount--;
                  container.setItem(slot, currentItem);
                  const emptyBucket = new ItemStack12("minecraft:bucket", 1);
                  const remainder = container.addItem(emptyBucket);
                  if (remainder) {
                    player.dimension.spawnItem(remainder, player.location);
                  }
                } else {
                  container.setItem(slot, new ItemStack12("minecraft:bucket", 1));
                }
              }
            }
          }
        }
      });
    }
    return;
  }
  if (fluidIDs.has(block.typeId) && itemStack.typeId === "minecraft:bucket") {
    const typeId = block.typeId;
    const isFlowing = typeId.endsWith("_down") || /[1-3]$/.test(typeId);
    if (!isFlowing) {
      let bucketId = typeId + "_bucket";
      event.cancel = true;
      system28.run(() => {
        if (player.getGameMode() !== GameMode8.Creative) {
          const container = player.getComponent("minecraft:inventory")?.container;
          if (container) {
            const slot = player.selectedSlotIndex;
            const currentItem = container.getItem(slot);
            if (currentItem && currentItem.typeId === "minecraft:bucket") {
              const filledBucket = new ItemStack12(bucketId, 1);
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
    system28.run(() => {
      if (block.isValid && itemStack) {
        try {
          const blockPerm = BlockPermutation12.resolve(itemStack.typeId);
          block.setPermutation(blockPerm);
          wakeNeighbors(block.location, block.dimension);
          player.playSound("stone.dig", { location: block.location });
          if (player.getGameMode() !== GameMode8.Creative) {
            const container = player.getComponent("minecraft:inventory")?.container;
            if (container) {
              const slot = player.selectedSlotIndex;
              if (itemStack.amount > 1) {
                itemStack.amount--;
                container.setItem(slot, itemStack);
              } else {
                container.setItem(slot, void 0);
              }
            }
          }
        } catch (e) {
        }
      }
    });
  }
});
world25.beforeEvents.playerBreakBlock.subscribe((event) => {
  const { player, block, itemStack } = event;
  if (fluidIDs.has(block.typeId)) {
    event.cancel = true;
  }
});
system28.runInterval(() => {
  for (const player of world25.getAllPlayers()) {
    const container = player.getComponent("minecraft:inventory")?.container;
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
          const bucket = new ItemStack12(bucketId, item.amount);
          container.setItem(i, bucket);
        } catch (e) {
        }
      }
    }
  }
}, 80);
function registerFluidComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:fluid_flow", new FluidFlowComponent());
}
function runBoatLogic() {
  const players = world25.getPlayers();
  if (players.length === 0) return;
  const activeDimensions = new Set(players.map((p) => p.dimension));
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
  const blockAt = dimension.getBlock(location);
  const blockBelow = dimension.getBlock({ x: location.x, y: location.y - 0.1, z: location.z });
  const isMineralWater = blockAt && blockAt.typeId.includes("mineral_water") || blockBelow && blockBelow.typeId.includes("mineral_water");
  if (isMineralWater) {
    if (blockAt && blockAt.typeId.includes("mineral_water")) {
      boat.applyImpulse({ x: 0, y: 0.2, z: 0 });
    }
    const rotation = boat.getRotation().y;
    const rad = (rotation + 90) * (Math.PI / 180);
    const dirX = -Math.sin(rotation * (Math.PI / 180));
    const dirZ = Math.cos(rotation * (Math.PI / 180));
    const vel = boat.getVelocity();
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed > 0.01) {
      boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
    }
    let waterTopY = Math.floor(location.y);
    const bAt = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) });
    if (bAt && bAt.typeId.includes("mineral_water")) {
      waterTopY = Math.floor(location.y) + 1;
    } else if (blockBelow && blockBelow.typeId.includes("mineral_water")) {
      waterTopY = Math.floor(location.y);
    }
    const holders = dimension.getEntities({
      type: "gaiadimension:boat_holder",
      location,
      maxDistance: 2
    });
    let holder = holders.length > 0 ? holders[0] : null;
    const targetHolderY = waterTopY - 0.55;
    if (!holder) {
      holder = dimension.spawnEntity("gaiadimension:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
    }
    try {
      if (holder && holder.isValid) {
        holder.teleport(
          { x: location.x, y: targetHolderY, z: location.z },
          { dimension, rotation: { x: 0, y: boat.getRotation().y } }
        );
      }
    } catch (e) {
    }
  } else {
    const holders = dimension.getEntities({
      type: "gaiadimension:boat_holder",
      location,
      maxDistance: 2
    });
    for (const h of holders) {
      if (h.isValid) h.remove();
    }
  }
}

// src/main/bedrock/ts/durability.ts
import { system as system29 } from "@minecraft/server";
function registerCustomTool() {
  system29.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("luminiae:durability", {
      onUseOn(e, params) {
        const { source, itemStack, block } = e;
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
  const unbreakingLevel = enchantable ? enchantable.getEnchantment("unbreaking")?.level || 0 : 0;
  const chance = 1 / (unbreakingLevel + 1);
  if (Math.random() > chance) return;
  const equippable = player.getComponent("minecraft:equippable");
  const newDamage = durability.damage + damageAmount;
  if (newDamage >= durability.maxDurability) {
    equippable.setEquipment("Mainhand", void 0);
    player.playSound("random.break", { location: player.location });
  } else {
    durability.damage = newDamage;
    equippable.setEquipment("Mainhand", itemStack);
  }
}

// src/main/bedrock/ts/systems/Commands.ts
import { Player as Player15, system as system30, CommandPermissionLevel, CustomCommandParamType } from "@minecraft/server";

// src/main/bedrock/ts/Vec3.ts
var Vec3 = class {
  static get zero() {
    return { x: 0, y: 0, z: 0 };
  }
  static add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
  }
  static subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
  }
  static multiply(v, scale) {
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
  }
  static divide(v, scale) {
    if (scale === 0) return this.zero;
    return { x: v.x / scale, y: v.y / scale, z: v.z / scale };
  }
  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  }
  static cross(v1, v2) {
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
  }
  static magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
  static normalize(v) {
    const mag = this.magnitude(v);
    if (mag === 0) return this.zero;
    return this.divide(v, mag);
  }
  static distance(v1, v2) {
    return this.magnitude(this.subtract(v1, v2));
  }
  static lerp(v1, v2, t) {
    return this.add(v1, this.multiply(this.subtract(v2, v1), t));
  }
  static floor(v) {
    return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
  }
  static ceil(v) {
    return { x: Math.ceil(v.x), y: Math.ceil(v.y), z: Math.ceil(v.z) };
  }
  static round(v) {
    return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
  }
  static abs(v) {
    return { x: Math.abs(v.x), y: Math.abs(v.y), z: Math.abs(v.z) };
  }
  static min(v1, v2) {
    return { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), z: Math.min(v1.z, v2.z) };
  }
  static max(v1, v2) {
    return { x: Math.max(v1.x, v2.x), y: Math.max(v1.y, v2.y), z: Math.max(v1.z, v2.z) };
  }
  static toString(v) {
    return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
  }
};

// src/main/bedrock/ts/systems/MathParser.ts
var MathParser = class _MathParser {
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
      if (!isNaN(token)) return Number(token);
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
  static tokenize(str) {
    const regex = /"[^"]*"|'[^']*'|[a-zA-Z_]+|[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?|\.|\(|\)|,|\+|\-|\*|\/|\^|\<=|\>=|\<|\>|\=/gi;
    return str.match(regex) || [];
  }
};

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
      if (!(part in current)) {
        current[part] = !isNaN(Number(parts[i + 1])) ? [] : {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return obj;
  }
  /**
   * Deep merges source into target
   */
  static deepMerge(target, source) {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], this.deepMerge(target[key], source[key]));
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
        player.sendMessage(`\xA78[\xA76Math\xA78] \xA7cError: ${e.message}`);
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
        player.sendMessage(`\xA78[\xA76TPMath\xA78] \xA7cError: ${e.message}`);
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
            if (!isNaN(rawVal)) finalVal = Number(rawVal);
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
        player.sendMessage(`\xA7cError: ${e.message}`);
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
      if (inGaia && GaiaDimension) {
        const biome = DimensionSystem.getBiome(player);
        player.sendMessage("\xA77Current Biome: \xA7e" + formatName(biome));
        coords = GaiaDimension.offset(player.location);
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
    if (!(player instanceof Player15)) return;
    system30.run(() => {
      player.sendMessage("\xA7d[Gaia Creator] \xA77She's the primordial architect who birthed the original Java realm. If you see crystals, thank her. If you see bugs, it's definitely the porter's fault.");
      player.sendMessage("\xA7b\u{1F517} https://www.curseforge.com/minecraft/mc-mods/gaia-dimension");
    });
    return { status: 0 };
  });
  registry.registerCommand({
    name: "gaiadimension:sen",
    description: "The Porter.",
    permissionLevel: CommandPermissionLevel.Any
  }, (origin) => {
    const player = origin.sourceEntity;
    if (!(player instanceof Player15)) return;
    system30.run(() => {
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
import { Player as Player16, system as system31, CommandPermissionLevel as CommandPermissionLevel2, CustomCommandParamType as CustomCommandParamType2 } from "@minecraft/server";

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
    if (!(player instanceof Player16)) return;
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
      system31.run(() => {
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
      const interval = system31.runInterval(() => {
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
          system31.clearRun(interval);
          dim.playSound("ui.toast.challenge_complete", center);
          player.sendMessage("\xA76[Gaia] \xA7aTransformation Complete.");
        }
      }, 1);
    }
    return { status: 0 };
  });
}

// src/main/bedrock/ts/items/FireStarter.ts
import { Player as Player17 } from "@minecraft/server";
function registerFireStarterComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:fire_starter", {
    onUseOn: (event) => {
      const { source: player, block, blockFace, itemStack } = event;
      if (!(player instanceof Player17)) return;
      const targetLocation = block.location;
      const placeLocation = {
        x: targetLocation.x + (blockFace === "East" ? 1 : blockFace === "West" ? -1 : 0),
        y: targetLocation.y + (blockFace === "Up" ? 1 : blockFace === "Down" ? -1 : 0),
        z: targetLocation.z + (blockFace === "South" ? 1 : blockFace === "North" ? -1 : 0)
      };
      const targetBlock = player.dimension.getBlock(placeLocation);
      if (!targetBlock) return;
      if (targetBlock.typeId === "gaiadimension:glittering_fire") return;
      if (block.typeId === "gaiadimension:glittering_fire" && blockFace === "Up") return;
      if (targetBlock.isAir || targetBlock.typeId === "minecraft:tallgrass" || targetBlock.typeId === "minecraft:yellow_flower" || targetBlock.typeId === "minecraft:red_flower") {
        targetBlock.setType("gaiadimension:glittering_fire");
        player.dimension.playSound("fire.ignite", placeLocation);
        if (player.getGameMode() !== "creative") {
          const durability = itemStack.getComponent("minecraft:durability");
          if (durability) {
            if (durability.damage + 1 >= durability.maxDurability) {
              const equippable = player.getComponent("minecraft:equippable");
              equippable?.setEquipment("Mainhand", void 0);
              player.playSound("random.break");
            } else {
              durability.damage += 1;
              const equippable = player.getComponent("minecraft:equippable");
              equippable?.setEquipment("Mainhand", itemStack);
            }
          }
        }
      }
    }
  });
}

// src/main/bedrock/ts/items/MagicStaff.ts
import { Player as Player18 } from "@minecraft/server";
function registerMagicStaffComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
    onUse: (event) => {
      const { source: player, itemStack } = event;
      if (!(player instanceof Player18)) return;
      const idParts = itemStack.typeId.split("_");
      if (idParts.length < 4) return;
      const elementStr = idParts[2];
      const behaviorStr = idParts[3];
      const element = {
        "physical": 0 /* PHYSICAL */,
        "fire": 1 /* FIRE */,
        "electric": 2 /* ELECTRIC */,
        "poison": 3 /* POISON */,
        "frost": 4 /* FROST */,
        "magic": 5 /* MAGIC */,
        "energy": 6 /* ENERGY */
      }[elementStr] ?? 0 /* PHYSICAL */;
      const behavior = {
        "basic": 0 /* BASIC */,
        "blast": 1 /* BLAST */,
        "burst": 2 /* BURST */,
        "linger": 3 /* LINGER */,
        "ricochet": 4 /* RICOCHET */,
        "scatter": 5 /* SCATTER */
      }[behaviorStr] ?? 0 /* BASIC */;
      const viewDir = player.getViewDirection();
      const spawnLoc = {
        x: player.location.x + viewDir.x * 1.5,
        y: player.location.y + player.getHeadLocation().y - player.location.y + viewDir.y * 1.5,
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

// src/main/bedrock/ts/systems/MagicStaffBehaviors.ts
import { world as world28, system as system32 } from "@minecraft/server";
var projectileCache = /* @__PURE__ */ new Map();
function initializeMagicStaffBehaviors() {
  system32.runInterval(() => {
    for (const dim of ["overworld", "nether", "the_end", "gaiadimension"]) {
      try {
        const dimension = world28.getDimension(dim);
        const projectiles = dimension.getEntities({ type: "gaiadimension:staff_projectile" });
        const activeIds = new Set(projectiles.map((p) => p.id));
        for (const proj of projectiles) {
          const vel = proj.getVelocity();
          if (vel.x !== 0 || vel.y !== 0 || vel.z !== 0 || !projectileCache.has(proj.id)) {
            projectileCache.set(proj.id, {
              velocity: vel,
              element: proj.getProperty("gaiadimension:element") ?? 0,
              behavior: proj.getProperty("gaiadimension:behavior") ?? 0,
              bounceCount: proj.getProperty("gaiadimension:bounce_count") ?? 0
            });
          }
        }
      } catch (e) {
      }
    }
    if (system32.currentTick % 100 === 0) {
    }
  }, 1);
  world28.afterEvents.projectileHitBlock.subscribe((event) => {
    if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
    const data = projectileCache.get(event.projectile.id);
    handleHit(event.projectile, data, event.location, event.face);
    projectileCache.delete(event.projectile.id);
  });
  world28.afterEvents.projectileHitEntity.subscribe((event) => {
    if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
    const data = projectileCache.get(event.projectile.id);
    handleHit(event.projectile, data, event.location);
    projectileCache.delete(event.projectile.id);
  });
}
function handleHit(projectile, data, location, face) {
  if (!data) return;
  const { element, behavior, bounceCount, velocity } = data;
  if (behavior === 4 /* RICOCHET */ && face && bounceCount > 0) {
    let newVel = { x: velocity.x, y: velocity.y, z: velocity.z };
    if (face === "North" || face === "South") newVel.z *= -1;
    if (face === "East" || face === "West") newVel.x *= -1;
    if (face === "Up" || face === "Down") newVel.y *= -1;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const currentSpeed = Math.sqrt(newVel.x ** 2 + newVel.y ** 2 + newVel.z ** 2);
    if (currentSpeed > 0) {
      const ratio = speed / currentSpeed;
      newVel.x *= ratio;
      newVel.y *= ratio;
      newVel.z *= ratio;
    }
    const offsetLoc = {
      x: location.x + (face === "East" ? 0.1 : face === "West" ? -0.1 : 0),
      y: location.y + (face === "Up" ? 0.1 : face === "Down" ? -0.1 : 0),
      z: location.z + (face === "South" ? 0.1 : face === "North" ? -0.1 : 0)
    };
    const newProj = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", offsetLoc);
    newProj.setProperty("gaiadimension:element", element);
    newProj.setProperty("gaiadimension:behavior", 4 /* RICOCHET */);
    newProj.setProperty("gaiadimension:bounce_count", bounceCount - 1);
    const projComp = newProj.getComponent("minecraft:projectile");
    if (projComp) {
      projComp.shoot(newVel);
    }
    projectile.dimension.playSound("random.bowhit", location, { pitch: 1.2 });
    return;
  }
  switch (behavior) {
    case 1 /* BLAST */:
      projectile.dimension.createExplosion(location, 2, { breaksBlocks: false, causesFire: false });
      break;
    case 2 /* BURST */:
      const dirs = [
        { x: 1, y: 0.5, z: 0 },
        { x: -1, y: 0.5, z: 0 },
        { x: 0, y: 0.5, z: 1 },
        { x: 0, y: 0.5, z: -1 }
      ];
      for (const d of dirs) {
        const sub = projectile.dimension.spawnEntity("gaiadimension:staff_projectile", location);
        sub.setProperty("gaiadimension:element", element);
        sub.setProperty("gaiadimension:behavior", 0 /* BASIC */);
        const projComp = sub.getComponent("minecraft:projectile");
        if (projComp) projComp.shoot(d);
      }
      break;
    case 3 /* LINGER */:
      projectile.dimension.spawnEntity("minecraft:area_effect_cloud", location);
      break;
  }
}

// src/main/bedrock/ts/systems/Cleaner.ts
import { world as world29, system as system33, BlockVolume as BlockVolume3, BlockPermutation as BlockPermutation14 } from "@minecraft/server";
var CLUTTER_TAGS = [
  "grass",
  "plant",
  "leaves",
  "log",
  "wood",
  "acacia",
  "birch",
  "dark_oak",
  "jungle",
  "oak",
  "spruce",
  "minecraft:is_shears_item_destructible",
  "minecraft:is_hoe_item_destructible",
  "minecraft:crop",
  "flower",
  "bush",
  "vine",
  "mushroom",
  "coral",
  "waterlily",
  "reeds"
];
var CLUTTER_TYPES = ["minecraft:deadbush", "minecraft:snow_layer", "minecraft:sugar_cane", "minecraft:bamboo", "minecraft:kelp", "minecraft:glow_lichen"];
var FILTER = {
  blockFilter: {
    includeTags: CLUTTER_TAGS,
    includeTypes: CLUTTER_TYPES
  },
  ignoreChunkBoundErrors: true
};
var AIR;
var DIM;
var SHARED_VOL;
var QUEUE = [];
var CACHE = /* @__PURE__ */ new Set();
var QUEUED = /* @__PURE__ */ new Set();
system33.run(() => {
  try {
    AIR = BlockPermutation14.resolve("minecraft:air");
    DIM = world29.getDimension("minecraft:overworld");
    SHARED_VOL = new BlockVolume3({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
  } catch (e) {
  }
});
system33.runInterval(() => {
  if (QUEUE.length < 2) return;
  const players = world29.getAllPlayers().filter((p) => p.dimension.id === "minecraft:overworld");
  if (players.length === 0) return;
  const pLoc = players[0].location;
  QUEUE.sort((a, b) => {
    const dA = Math.abs(a.x - pLoc.x) + Math.abs(a.z - pLoc.z);
    const dB = Math.abs(b.x - pLoc.x) + Math.abs(b.z - pLoc.z);
    return dA - dB;
  });
}, 100);
system33.runInterval(() => {
  if (QUEUE.length === 0 || !SHARED_VOL || !DIM || !AIR) return;
  const t = QUEUE[0];
  const players = world29.getAllPlayers();
  const isAnyPlayerNear = players.some((p) => {
    if (p.dimension.id !== "minecraft:overworld") return false;
    const loc = p.location;
    return Math.abs(loc.x - (t.x + 8)) < 128 && Math.abs(loc.z - (t.z + 8)) < 128;
  });
  if (!isAnyPlayerNear) {
    const item = QUEUE.shift();
    if (item) QUEUE.push(item);
    return;
  }
  const yMin = 85 + t.s * 32;
  const yMax = Math.min(yMin + 31, 200);
  SHARED_VOL.from = { x: t.x, y: yMin, z: t.z };
  SHARED_VOL.to = { x: t.x + 15, y: yMax, z: t.z + 15 };
  try {
    DIM.fillBlocks(SHARED_VOL, AIR, FILTER);
    t.s++;
    if (yMax >= 200) {
      CACHE.add(t.key);
      QUEUED.delete(t.key);
      QUEUE.shift();
    }
  } catch (e) {
    const item = QUEUE.shift();
    if (item) QUEUE.push(item);
  }
}, 1);
function registerCleanerComponent({ blockComponentRegistry }) {
  blockComponentRegistry.registerCustomComponent("gaiadimension:overworld_cleaner", {
    onTick({ block }) {
      const { x, z } = block.location;
      const cx = Math.floor(x) >> 4 << 4;
      const cz = Math.floor(z) >> 4 << 4;
      const key = cx * 1e6 + cz;
      if (CACHE.has(key)) {
        if (AIR) block.setPermutation(AIR);
        return;
      }
      if (QUEUED.has(key)) return;
      if (GaiaDimension && GaiaDimension.isInDimension({ x, z })) {
        QUEUED.add(key);
        QUEUE.push({ x: cx, z: cz, s: 0, key });
      }
    }
  });
}

// src/main/bedrock/ts/blocks/GlitterGrassSync.ts
import { world as world30, system as system34, ItemStack as ItemStack14 } from "@minecraft/server";
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
      const newItem = new ItemStack14(targetGrassId, item.amount);
      inventory.setItem(i, newItem);
    }
  }
}
function initializeGlitterGrassSync() {
  world30.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block } = event;
    if (GLITTER_GRASS_TYPES.includes(block.typeId)) {
      const biome = DimensionSystem.getBiomeAt(block.dimension, block.location);
      const targetGrassId = BIOME_TO_GRASS[biome];
      if (targetGrassId && block.typeId !== targetGrassId) {
        system34.run(() => {
          if (block.isValid) {
            block.setType(targetGrassId);
          }
        });
      }
    }
  });
  system34.runInterval(() => {
    for (const player of world30.getAllPlayers()) {
      if (DimensionSystem.isInGaia(player)) {
        syncInventory(player);
      }
    }
  }, 40);
  world30.afterEvents.playerInventoryItemChange.subscribe((event) => {
    const { player } = event;
    if (DimensionSystem.isInGaia(player)) {
      syncInventory(player);
    }
  });
}

// src/main/bedrock/ts/world/CoordinateDisplay.ts
import { world as world31, system as system35 } from "@minecraft/server";
function updateAllCoordinateDisplays() {
  const showCoords = world31.gameRules.showCoordinates;
  for (const player of world31.getAllPlayers()) {
    if (!player.isValid) continue;
    if (!showCoords) {
      if (player.hasTag("gaiadimension:showing_coords")) {
        player.onScreenDisplay.setActionBar("");
        player.removeTag("gaiadimension:showing_coords");
      }
      continue;
    }
    const location = player.location;
    const currentDimId = player.dimension.id;
    const modDim = ModDimension.getAll().find(
      (dim) => dim.inheritance.id === currentDimId && dim.isInDimension(location)
    );
    let x, y, z;
    if (modDim) {
      const offset = modDim.offset(location);
      x = Math.floor(offset.x);
      y = Math.floor(offset.y);
      z = Math.floor(offset.z);
    } else {
      x = Math.floor(location.x);
      y = Math.floor(location.y);
      z = Math.floor(location.z);
    }
    player.onScreenDisplay.setActionBar(`Position: ${x}, ${y}, ${z}`);
    if (!player.hasTag("gaiadimension:showing_coords")) player.addTag("gaiadimension:showing_coords");
  }
}
system35.runInterval(() => {
  try {
    updateAllCoordinateDisplays();
  } catch (e) {
  }
}, 1);

// src/main/bedrock/ts/world/Events.ts
import { world as world32, system as system36 } from "@minecraft/server";
var EventHandler = class {
  handlers = [];
  constructor() {
    this.handlers = [];
  }
  subscribe(callback) {
    this.handlers.push(callback);
  }
  trigger(data) {
    for (const handler of this.handlers) {
      try {
        handler(data);
      } catch (e) {
      }
    }
  }
};
var playerChangeBiome = new EventHandler();
var playerChangeBlock = new EventHandler();
var lastPlayerPositions = /* @__PURE__ */ new Map();
system36.runInterval(() => {
  for (const player of world32.getAllPlayers()) {
    if (!player.isValid) {
      lastPlayerPositions.delete(player.id);
      continue;
    }
    const currentPos = {
      x: Math.floor(player.location.x),
      y: Math.floor(player.location.y),
      z: Math.floor(player.location.z),
      dimension: player.dimension.id
    };
    const lastPos = lastPlayerPositions.get(player.id);
    if (!lastPos || lastPos.x !== currentPos.x || lastPos.y !== currentPos.y || lastPos.z !== currentPos.z || lastPos.dimension !== currentPos.dimension) {
      playerChangeBlock.trigger({ player });
      lastPlayerPositions.set(player.id, currentPos);
    }
  }
}, 5);

// src/main/bedrock/ts/world/Biome.ts
var BiomeSystem = class {
  /**
   * The biome each player is in
   */
  static #playerBiomes = {};
  /**
   * Checks and updates player biome
   * @param {Player} player Player to update biome of
   */
  static updateBiome(player) {
    const biome = DimensionSystem.getBiome(player);
    if (DimensionSystem.isInGaia(player)) {
      if (this.#playerBiomes[player.id] !== biome) {
        playerChangeBiome.trigger({ player, biome });
      }
    }
    this.#playerBiomes[player.id] = biome;
  }
  /**
   * Gets the biome a player is in
   * @param {Player} player Player to get biome of
   * @returns {string} Biome player is in
   */
  static getBiome(player) {
    return this.#playerBiomes[player.id];
  }
};
playerChangeBlock.subscribe((eventData) => {
  BiomeSystem.updateBiome(eventData.player);
});

// src/main/bedrock/ts/world/Fog.ts
var FogSystem = class {
  /**
   * The fogs the player has applied
   */
  static playerFogs = {};
  /**
   * Cache active biome to prevent command spam
   */
  static activeBiomes = {};
  /**
   * Track if the base Gaia fog is applied
   */
  static baseFogApplied = {};
  /**
   * Updates the fogs applied to the player
   * @param {Player} player Player to update fogs of
   * @param {string|null} biome Biome to update fog to
   */
  static updateFog(player, biome) {
    if (DimensionSystem.isInGaia(player)) {
      if (!this.baseFogApplied[player.id]) {
        try {
          player.runCommand(`fog @s push "gaiadimension:fog_gaia" "gaia_base"`);
          this.baseFogApplied[player.id] = true;
        } catch (e) {
        }
      }
      if (biome && this.activeBiomes[player.id] !== biome) {
        this.setBiomeFog(player, biome);
      }
    } else {
      this.clearAllFogs(player);
    }
  }
  /**
   * Removes all fogs, including the base dimension fog
   */
  static clearAllFogs(player) {
    this.clearBiomeFogs(player);
    if (this.baseFogApplied[player.id]) {
      try {
        player.runCommand(`fog @s remove "gaia_base"`);
      } catch (e) {
      }
      this.baseFogApplied[player.id] = false;
    }
  }
  /**
   * Removes only the biome-specific fogs
   */
  static clearBiomeFogs(player) {
    if (!this.playerFogs[player.id] || this.playerFogs[player.id].length === 0) return;
    for (const biome of this.playerFogs[player.id]) {
      try {
        player.runCommand(`fog @s remove "${biome}"`);
      } catch (e) {
      }
    }
    this.playerFogs[player.id] = [];
    this.activeBiomes[player.id] = null;
  }
  /**
   * Sets the biome-specific fog layer
   */
  static setBiomeFog(player, biome) {
    this.clearBiomeFogs(player);
    try {
      player.runCommand(`fog @s push "gaiadimension:${biome}_fog" "${biome}"`);
      if (!this.playerFogs[player.id]) this.playerFogs[player.id] = [];
      this.playerFogs[player.id].push(biome);
      this.activeBiomes[player.id] = biome;
    } catch (e) {
      console.warn(`[FogSystem] Failed to push fog for ${biome}: ${e}`);
    }
  }
};
playerChangeBiome.subscribe((eventData) => {
  FogSystem.updateFog(eventData.player, eventData.biome);
});
playerChangeBlock.subscribe((eventData) => {
  if (DimensionSystem.isInGaia(eventData.player) && !FogSystem.baseFogApplied[eventData.player.id]) {
    FogSystem.updateFog(eventData.player, null);
  } else if (!DimensionSystem.isInGaia(eventData.player) && FogSystem.baseFogApplied[eventData.player.id]) {
    FogSystem.clearAllFogs(eventData.player);
  }
});

// src/main/bedrock/ts/API/lib/EnchantmentLib.ts
import { world as world33, system as system37 } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
var EnchantmentManager = class {
  registry;
  constructor() {
    this.registry = /* @__PURE__ */ new Map();
    this.initEvents();
  }
  /**
   * Registers a new custom enchantment.
   * @param id - Unique identifier (e.g., 'luminiae:lifesteal')
   * @param config - Configuration object
   */
  register(id, config) {
    this.registry.set(id, {
      id,
      name: config.name,
      maxLevel: config.maxLevel || 1,
      appliesTo: config.appliesTo || [],
      onHit: config.onHit,
      onMine: config.onMine,
      onTick: config.onTick,
      costPerLevel: config.costPerLevel || ((lvl) => lvl * 3)
    });
  }
  initEvents() {
    system37.runInterval(() => this.manageVisuals(), 5);
    world33.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
      const { block, player } = ev;
      if (block.typeId === "minecraft:enchanting_table" && player.isSneaking) {
        ev.cancel = true;
        system37.run(() => {
          this.openEnchantmentUI(player);
        });
      }
    });
    world33.afterEvents.entityHitEntity.subscribe((ev) => {
      const { damagingEntity } = ev;
      if (!damagingEntity || !damagingEntity.getComponent("minecraft:equippable")) return;
      const equippable = damagingEntity.getComponent("minecraft:equippable");
      const mainHand = equippable.getEquipment("Mainhand");
      if (mainHand) {
        this.triggerEnchants(mainHand, "onHit", ev);
      }
    });
    world33.afterEvents.playerBreakBlock.subscribe((ev) => {
      const { itemStack } = ev;
      if (itemStack) {
        this.triggerEnchants(itemStack, "onMine", ev);
      }
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
   * Opens the Enchanting UI for the player.
   * @param player 
   */
  async openEnchantmentUI(player) {
    const equippable = player.getComponent("minecraft:equippable");
    const itemStack = equippable?.getEquipment("Mainhand");
    if (!itemStack) {
      player.sendMessage("\xA7cHold an item to enchant.");
      return;
    }
    const validEnchants = [];
    const currentEnchants = this.getEnchantments(itemStack);
    for (const [id, config] of this.registry) {
      const isCompatible = config.appliesTo.some((type2) => itemStack.typeId.includes(type2));
      if (!isCompatible) continue;
      const currentLevel = currentEnchants[id] || 0;
      if (currentLevel >= config.maxLevel) continue;
      const nextLevel = currentLevel + 1;
      const cost = typeof config.costPerLevel === "function" ? config.costPerLevel(nextLevel) : config.costPerLevel;
      validEnchants.push({ config, nextLevel, cost });
    }
    if (validEnchants.length === 0) {
      player.sendMessage("\xA7cNo available enchantments for this item (or maxed out).");
      return;
    }
    const form = new ActionFormData().title("Custom Enchanting").body(`\xA77Item: ${itemStack.typeId.split(":")[1]}
\xA77XP Level: ${player.level}`);
    validEnchants.forEach((e) => {
      const color = player.level >= e.cost ? "\xA72" : "\xA7c";
      form.button(`${e.config.name} ${this.toRoman(e.nextLevel)}
${color}Cost: ${e.cost} Lvl`);
    });
    const response = await form.show(player);
    if (response.canceled || response.selection === void 0) return;
    const selection = validEnchants[response.selection];
    this.applyEnchantmentTransaction(player, itemStack, selection);
  }
  /**
   * Handles the transaction of XP and applying the enchant.
   */
  applyEnchantmentTransaction(player, itemStack, selection) {
    const { config, nextLevel, cost } = selection;
    if (player.level < cost && player.getGameMode() !== "creative") {
      player.sendMessage(`\xA7cNot enough XP! Need ${cost} levels.`);
      player.playSound("note.bass");
      return;
    }
    const newItem = this.applyEnchantment(itemStack, config.id, nextLevel);
    const equippable = player.getComponent("minecraft:equippable");
    equippable.setEquipment("Mainhand", newItem);
    if (player.getGameMode() !== "creative") {
      player.addLevels(-cost);
    }
    player.dimension.playSound("random.levelup", player.location);
    player.sendMessage(`\xA7aEnchanted with ${config.name} ${this.toRoman(nextLevel)}!`);
  }
  /**
   * Applies an enchantment to an item stack (Data + Lore).
   * @returns The modified item stack.
   */
  applyEnchantment(itemStack, id, level) {
    const config = this.registry.get(id);
    if (!config) return itemStack;
    const enchants = this.getEnchantments(itemStack);
    enchants[id] = level;
    itemStack.setDynamicProperty("luminiae:enchants", JSON.stringify(enchants));
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
   * @param itemStack 
   * @param shouldHaveGlint 
   */
  updateGlint(itemStack, shouldHaveGlint = true) {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return;
    const hasDummy = itemStack.getDynamicProperty("luminiae:dummy_glint");
    const currentVanillas = enchantable.getEnchantments();
    if (shouldHaveGlint) {
      if (currentVanillas.length === 0) {
        try {
          enchantable.addEnchantment({ typeId: "unbreaking", level: 0 });
          itemStack.setDynamicProperty("luminiae:dummy_glint", true);
        } catch (e) {
          try {
            enchantable.addEnchantment({ typeId: "unbreaking", level: 1 });
            itemStack.setDynamicProperty("luminiae:dummy_glint", true);
          } catch (e2) {
          }
        }
      }
    } else {
      if (hasDummy) {
        const unbreaking = enchantable.getEnchantment("unbreaking");
        if (unbreaking && currentVanillas.length === 1) {
          enchantable.removeAllEnchantments();
          itemStack.setDynamicProperty("luminiae:dummy_glint", void 0);
        }
      }
    }
  }
  /**
   * Scans players to toggle glint state (Clean in cursor, Glint in inventory).
   */
  manageVisuals() {
    for (const player of world33.getAllPlayers()) {
      const cursorComp = player.getComponent("minecraft:cursor_inventory");
      if (cursorComp && cursorComp.item) {
        const item = cursorComp.item;
        if (this.hasCustomEnchants(item) && item.getDynamicProperty("luminiae:dummy_glint")) {
          this.updateGlint(item, false);
          cursorComp.item = item;
        }
      }
      const invComp = player.getComponent("minecraft:inventory");
      if (invComp && invComp.container) {
        const container = invComp.container;
        for (let i = 0; i < container.size; i++) {
          const item = container.getItem(i);
          if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("luminiae:dummy_glint")) {
            this.updateGlint(item, true);
            if (item.getDynamicProperty("luminiae:dummy_glint")) {
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
          if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("luminiae:dummy_glint")) {
            this.updateGlint(item, true);
            if (item.getDynamicProperty("luminiae:dummy_glint")) {
              equipComp.setEquipment(slot, item);
            }
          }
        }
      }
    }
  }
  hasCustomEnchants(item) {
    return !!item.getDynamicProperty("luminiae:enchants");
  }
  /**
   * Helper to retrieve custom enchantments object from item dynamic property.
   * @param itemStack 
   * @returns Key-value map of enchants
   */
  getEnchantments(itemStack) {
    if (!itemStack) return {};
    const data = itemStack.getDynamicProperty("luminiae:enchants");
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  /**
   * Converts a number to Roman numeral.
   * @param num 
   */
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
import { world as world34, system as system38 } from "@minecraft/server";
var MalachiteGuardSystem = class {
  constructor() {
    this.init();
  }
  init() {
    world34.afterEvents.entitySpawn.subscribe((event) => {
      const { entity } = event;
      if (entity.typeId === "gaiadimension:malachite_guard") {
        this.setupGuard(entity);
      }
    });
    system38.runInterval(() => {
      const overworld = world34.getDimension("overworld");
      const guards = overworld.getEntities({
        type: "gaiadimension:malachite_guard"
      });
      const activeGuardIds = /* @__PURE__ */ new Set();
      for (const guard of guards) {
        const guardId = guard.getDynamicProperty("gaiadimension:guard_id");
        if (guardId) {
          activeGuardIds.add(guardId);
          this.updateGuardState(guard, guardId);
        }
      }
      const allDrones = overworld.getEntities({
        type: "gaiadimension:malachite_drone"
      });
      for (const drone of allDrones) {
        const parentId = drone.getDynamicProperty("gaiadimension:parent_id");
        if (parentId && !activeGuardIds.has(parentId)) {
          drone.remove();
        }
      }
    }, 10);
  }
  /**
   * Initialize a new Malachite Guard
   * @param {Entity} guard 
   */
  setupGuard(guard) {
    const guardId = `mg_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    guard.setDynamicProperty("gaiadimension:guard_id", guardId);
    guard.addTag("gaiadimension:has_active_drones");
    system38.run(() => {
      if (!guard.isValid) return;
      guard.triggerEvent("mg_defend");
      this.spawnDrones(guard, guardId);
    });
  }
  /**
   * Spawns 4 drones linked to the guard
   * @param {Entity} guard 
   * @param {string} guardId 
   */
  spawnDrones(guard, guardId) {
    const dim = guard.dimension;
    const loc = guard.location;
    const offsets = [
      { x: 4, z: 0 },
      { x: -4, z: 0 },
      { x: 0, z: 4 },
      { x: 0, z: -4 }
    ];
    offsets.forEach((offset) => {
      try {
        const drone = dim.spawnEntity("gaiadimension:malachite_drone", {
          x: loc.x + offset.x,
          y: loc.y + 2,
          z: loc.z + offset.z
        });
        drone.addTag(`mg_parent:${guardId}`);
        drone.setDynamicProperty("gaiadimension:parent_id", guardId);
      } catch (e) {
      }
    });
  }
  /**
   * Check if drones are still alive and update Guard state
   * @param {Entity} guard 
   * @param {string} guardId
   */
  updateGuardState(guard, guardId) {
    const drones = guard.dimension.getEntities({
      type: "gaiadimension:malachite_drone",
      tags: [`mg_parent:${guardId}`]
    });
    const hasDrones = drones.length > 0;
    const currentlyFlagged = guard.hasTag("gaiadimension:has_active_drones");
    if (!hasDrones && currentlyFlagged) {
      guard.removeTag("gaiadimension:has_active_drones");
      guard.triggerEvent("no_mg_defend");
      world34.sendMessage("\xA7c[Malachite Guard] \xA77The drones have fallen! The Guard's core is exposed!");
    } else if (hasDrones && !currentlyFlagged) {
      guard.addTag("gaiadimension:has_active_drones");
      guard.triggerEvent("mg_defend");
    }
  }
};
var malachiteGuardSystem = new MalachiteGuardSystem();

// src/main/bedrock/ts/GaiaDimensionAddon.ts
initializeDestructionHandlers();
initializeEventManager();
initializeScriptEvents();
initializeGeyser();
initializeLightMixin();
initializeGlitterGrassSync();
initializeMagicStaffBehaviors();
registerCustomTool();
system39.beforeEvents.startup.subscribe((event) => {
  const { blockComponentRegistry, customCommandRegistry, itemComponentRegistry } = event;
  registerLeavesComponent({ blockComponentRegistry });
  registerInvisibleComponent({ blockComponentRegistry });
  registerCurtainComponent({ blockComponentRegistry });
  registerWoodComponent({ blockComponentRegistry });
  registerFenceComponent({ blockComponentRegistry });
  registerSaplingComponent({ blockComponentRegistry });
  registerWallComponent({ blockComponentRegistry });
  registerButtonComponent({ blockComponentRegistry });
  registerPressurePlateComponent({ blockComponentRegistry });
  registerStairsComponent({ blockComponentRegistry });
  registerGeyserComponent({ blockComponentRegistry });
  registerSandstoneComponent({ blockComponentRegistry });
  registerStoneSlabComponent({ blockComponentRegistry });
  registerGaiaFurnaceComponent({ blockComponentRegistry });
  registerGlitteringFireComponent();
  registerCleanerComponent({ blockComponentRegistry });
  registerCrudeStorageCrateComponent({ blockComponentRegistry });
  registerMegaStorageCrateComponent({ blockComponentRegistry });
  registerFluidComponent({ blockComponentRegistry });
  registerFireStarterComponent({ itemComponentRegistry });
  registerMagicStaffComponent({ itemComponentRegistry });
  registerGaiaCommands(customCommandRegistry);
  registerSetBiomeCommand(customCommandRegistry);
});
//# sourceMappingURL=GaiaDimensionAddon.js.map
