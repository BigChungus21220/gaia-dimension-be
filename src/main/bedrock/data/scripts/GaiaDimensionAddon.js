// src/main/bedrock/ts/GaiaDimensionAddon.ts
import { system as system44, CommandPermissionLevel as CommandPermissionLevel3, Player as Player25, CustomCommandStatus } from "@minecraft/server";

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
  const entry2 = activeCurtains.find((c) => c.location.x === location.x && c.location.y === location.y && c.location.z === location.z);
  if (entry2) {
    entry2.typeId = newTypeId;
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
                const container2 = inventory.container;
                const item = container2.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container2.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container2.setItem(player.selectedSlot, item);
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
                const container2 = inventory.container;
                const item = container2.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container2.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container2.setItem(player.selectedSlot, item);
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
                const container2 = inventory.container;
                const item = container2.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container2.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container2.setItem(player.selectedSlot, item);
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
                const container2 = inventory.container;
                const item = container2.getItem(player.selectedSlot);
                if (item) {
                  if (item.amount === 1) {
                    container2.setItem(player.selectedSlot, void 0);
                  } else {
                    item.amount--;
                    container2.setItem(player.selectedSlot, item);
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
      const container2 = inventory.container;
      for (let i = 0; i < container2.size; i++) {
        const item = container2.getItem(i);
        if (this.isUiItem(item)) {
          container2.setItem(i, void 0);
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
import { world as world18, system as system20, ItemStack as ItemStack9 } from "@minecraft/server";
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
    world18.afterEvents.entityLoad.subscribe((ev) => {
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
        const dim = world18.getDimension(data.dimId);
        if (dim) this.startTest(inputId, data.location, dim);
      } catch (e) {
      }
    }
  }
  loadState() {
    try {
      const activeRaw = world18.getDynamicProperty(`${DB_PREFIX}tests`);
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        for (const [k, v] of Object.entries(parsed)) this.activeTests.set(k, v);
      }
      const customRaw = world18.getDynamicProperty(`${DB_PREFIX}recipes`);
      if (customRaw) {
        this.customRecipes = JSON.parse(customRaw);
        this.applyRecipes();
      }
    } catch (e) {
    }
  }
  saveState(key) {
    try {
      if (key === "tests") world18.setDynamicProperty(`${DB_PREFIX}tests`, JSON.stringify(Object.fromEntries(this.activeTests)));
      else if (key === "recipes") world18.setDynamicProperty(`${DB_PREFIX}recipes`, JSON.stringify(this.customRecipes));
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
import { world as world19, system as system21 } from "@minecraft/server";
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
    world19.afterEvents.playerPlaceBlock.subscribe(this.handlePlayerPlaceBlock.bind(this));
    world19.beforeEvents.playerBreakBlock.subscribe(this.handlePlayerBreakBlock.bind(this));
    world19.afterEvents.explosion.subscribe(this.handleExplosion.bind(this));
    system21.runInterval(this.handlePlayerViewCheck.bind(this), 5);
    system21.runInterval(this.handleMachineTick.bind(this), 1);
    world19.afterEvents.worldLoad.subscribe(this.handleWorldLoad.bind(this));
    world19.afterEvents.entityLoad.subscribe(this.handleEntityLoad.bind(this));
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
    for (const player of world19.getAllPlayers()) {
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
    const dimensions = ["overworld", "nether", "the_end"].map((id) => world19.getDimension(id));
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
import { world as world22, system as system23 } from "@minecraft/server";

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

// src/main/bedrock/ts/config/mod_config.ts
import { world as world21 } from "@minecraft/server";

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
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    return root.portalBiomeRestriction ?? true;
  }
  static set portalBiomeRestriction(value) {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    root.portalBiomeRestriction = value;
    DataSystem.saveRoot(world21, root, CONFIG_KEY);
  }
  /**
   * Allow All Biomes Setting
   */
  static get allowAllBiomes() {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    return root.allowAllBiomes ?? false;
  }
  static set allowAllBiomes(value) {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    root.allowAllBiomes = value;
    DataSystem.saveRoot(world21, root, CONFIG_KEY);
  }
  /**
   * List of biomes where the portal can be ignited
   */
  static get hotBiomes() {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    return root.hotBiomes ?? [...DEFAULT_HOT_BIOMES];
  }
  static set hotBiomes(value) {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    root.hotBiomes = value;
    DataSystem.saveRoot(world21, root, CONFIG_KEY);
  }
  /**
   * Comprehensive list of all biomes encountered by players
   */
  static get discoveredBiomes() {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    const discovered = root.discoveredBiomes ?? [...DEFAULT_HOT_BIOMES];
    return discovered;
  }
  static set discoveredBiomes(value) {
    const root = DataSystem.getRoot(world21, CONFIG_KEY);
    root.discoveredBiomes = value;
    DataSystem.saveRoot(world21, root, CONFIG_KEY);
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
  system23.runInterval(() => {
    for (const player of world22.getAllPlayers()) {
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
  world22.afterEvents.playerLeave.subscribe((event) => {
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
  world22.afterEvents.entityHitEntity.subscribe((event) => {
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
  world22.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      system23.run(() => {
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
  world22.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block } = event;
    if (block.typeId === "gaiadimension:glittering_fire") {
      event.cancel = true;
    }
  });
  world22.afterEvents.playerBreakBlock.subscribe((event) => {
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
import { world as world24, system as system25, BlockPermutation as BlockPermutation11 } from "@minecraft/server";

// src/main/bedrock/ts/world/Gaia.ts
import { world as world23, system as system24, BlockPermutation as BlockPermutation10, BlockVolume as BlockVolume2 } from "@minecraft/server";
var GAIA_DIMENSION_ID = "gaiadimension:gaia";
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
    const targetDim = world23.getDimension(targetDimId);
    const isToGaia = targetDimId === GAIA_DIMENSION_ID;
    const targetX = player.location.x / (isToGaia ? 4 : 0.25);
    const targetZ = player.location.z / (isToGaia ? 4 : 0.25);
    const targetY = isToGaia ? 100 : 70;
    const spawn = { x: targetX, y: targetY, z: targetZ };
    const tickingAreaId = `teleport_${player.id}`;
    player.sendMessage(`\xA7eLoading Gaia Dimension...`);
    await world23.tickingAreaManager.createTickingArea(tickingAreaId, {
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
    const portalPerm = BlockPermutation10.resolve(portal, { "gaiadimension:perm_dim": 0 });
    for (let ix = 0; ix <= 1; ix++) {
      for (let iy = 1; iy <= 3; iy++) {
        targetDim.getBlock({ x: px + ix, y: py + iy, z: pz })?.setPermutation(portalPerm);
      }
    }
    player.teleport({ x: px + 0.5, y: py + 1, z: pz + 0.5 }, { dimension: targetDim });
    system24.runTimeout(() => {
      try {
        world23.tickingAreaManager.removeTickingArea(tickingAreaId);
      } catch (e) {
      }
    }, 100);
  }
};
system24.runInterval(() => {
  for (const player of world23.getAllPlayers()) {
    if (!player.isValid) continue;
    const block = player.dimension.getBlock(player.location);
    if (block && block.typeId === "gaiadimension:gaia_dimension_portal") {
      const lastTeleport = player.getDynamicProperty("last_teleport") ?? 0;
      if (system24.currentTick - lastTeleport < 150) continue;
      player.setDynamicProperty("last_teleport", system24.currentTick);
      const targetDim = DimensionSystem.isInGaia(player) ? "minecraft:overworld" : GAIA_DIMENSION_ID;
      DimensionSystem.teleport(player, targetDim);
    }
  }
}, 10);

// src/main/bedrock/ts/mixins/LightMixin.ts
var lightBlockPermutation;
system25.run(() => {
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
  world24.afterEvents.playerPlaceBlock.subscribe((event) => {
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
  world24.afterEvents.playerBreakBlock.subscribe((event) => {
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
import { system as system26, ItemStack as ItemStack11 } from "@minecraft/server";
function initializeScriptEvents() {
  system26.afterEvents.scriptEventReceive.subscribe((event) => {
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
import { world as world26, system as system29, BlockPermutation as BlockPermutation12, ItemStack as ItemStack12, BlockVolume as BlockVolume3, Player as Player15, GameMode as GameMode8 } from "@minecraft/server";

// src/main/bedrock/ts/fluids/lib/FluidTemplate.ts
var FluidTemplate = class {
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
    baseName + "3",
    baseName + "4",
    baseName + "5",
    baseName + "6",
    baseName + "7"
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
import { system as system28 } from "@minecraft/server";

// src/main/bedrock/ts/API/MotionEngine.ts
import { system as system27 } from "@minecraft/server";
var Geo = new class {
  distance(vector1, vector2) {
    return Math.sqrt(Math.abs(vector1.x - vector2.x) ** 2 + Math.abs(vector1.y - vector2.y) ** 2 + Math.abs(vector1.z - vector2.z) ** 2);
  }
  getDirection3D(vector1, vector2) {
    let dist = this.distance(vector1, vector2) || 1;
    return {
      x: (vector2.x - vector1.x) / dist,
      y: (vector2.y - vector1.y) / dist,
      z: (vector2.z - vector1.z) / dist
    };
  }
  rotate(offset, angle, axis = ["x", "z"]) {
    const [primaryAxis, secondaryAxis] = axis;
    const flatOffset = {
      [primaryAxis]: offset[primaryAxis] ?? 0,
      [secondaryAxis]: offset[secondaryAxis] ?? 0
    };
    let offsetDir = this.getDirection3D({ x: 0, y: 0, z: 0 }, sumObjects({}, flatOffset));
    let offsetDist = this.distance({ x: 0, y: 0, z: 0 }, sumObjects({}, flatOffset));
    angle += Math.acos(offsetDir[primaryAxis]) * 57.2958 * (offsetDir[secondaryAxis] < 0 ? -1 : 1);
    let direction = {
      [primaryAxis]: Math.cos(angle / 57.2958),
      [secondaryAxis]: Math.sin(angle / 57.2958)
    };
    return sumObjects({}, direction, offsetDist);
  }
}();
function sumObjects(vector1, vector2, multi = 1) {
  return {
    x: (vector1.x || 0) + (vector2.x || 0) * multi,
    y: (vector1.y || 0) + (vector2.y || 0) * multi,
    z: (vector1.z || 0) + (vector2.z || 0) * multi
  };
}
function getXZVelocity(player, forceZeroSprint = false) {
  let vector = { x: 0, z: 0 };
  const input = player.inputInfo.getMovementVector();
  const strafeInput = input.y;
  const forwardInput = -input.x;
  vector = sumObjects(vector, Geo.rotate({ x: strafeInput, z: forwardInput }, player.getRotation().y + 90));
  const speedModifier = (player.getEffect("speed")?.amplifier ?? -1) + 1 - ((player.getEffect("slowness")?.amplifier ?? -1) + 1);
  const baseSpeed = forceZeroSprint ? 0.37 : 0.37 + (player.isSprinting ? 0.13 : 0) + speedModifier / 10;
  vector = sumObjects({}, vector, baseSpeed);
  return vector;
}
var MotionEngine = class {
  static tickPlayer(player, gravityValue, speedMultiplier = 1, resistance = 5, forceZeroSprint = false, viscosity = 0) {
    const p = player;
    if (player.isOnGround) {
      if (p.fallingVelocity > 0.5 && !player.getEffect("slow_falling")) {
        let damage = (p.fallingVelocity * 2) ** 1.7;
        if (damage >= 1) player.applyDamage(damage, { cause: "fall" });
      }
      p.fallVelocity = 0;
      p.fallingVelocity = 0;
      p.onGroundTick = system27.currentTick;
    }
    if (p.isJumping && p.onGroundTick >= system27.currentTick - 1) {
      if (viscosity < 5) {
        p.fallVelocity -= 0.2 * 9.8 / ((gravityValue + 9.8 * 0.2) / 1.2) + ((player.getEffect("jump_boost")?.amplifier ?? -1) + 1) / 10;
      } else {
        p.fallVelocity = 0.05;
      }
    }
    if (player.isOnGround && viscosity === 0 || player.isFlying || player.isGliding) {
      p.fallVelocity = 0;
      p.fallingTime = 0;
      p.savedXZ = void 0;
      return;
    }
    p.fallVelocity = p.fallVelocity || 0;
    p.fallingTime = (p.fallingTime || 0) + 1;
    if (viscosity > 0) {
      const sinkSpeed = 5e-3 * viscosity;
      p.fallVelocity = p.fallVelocity * 0.5 + sinkSpeed * 0.5;
    } else {
      p.fallVelocity += (9.8 * 1.5 + gravityValue) / 2.5 / Math.min(300, 190 + p.fallingTime * (9.8 - gravityValue));
    }
    let xz = getXZVelocity(player, forceZeroSprint || viscosity > 5);
    const effectiveMultiplier = speedMultiplier / (1 + viscosity);
    xz.x *= effectiveMultiplier;
    xz.z *= effectiveMultiplier;
    p.savedXZ = sumObjects({}, sumObjects(xz, p.savedXZ || xz, resistance), 1 / (resistance + 1));
    xz = p.savedXZ;
    const xzPower = Geo.distance({ x: 0, y: 0, z: 0 }, xz);
    const xzDir = Geo.getDirection3D({ x: 0, y: 0, z: 0 }, xz);
    if (player.isOnGround && p.fallVelocity < 0) p.fallVelocity = 0;
    if (player.dimension.heightRange.min <= player.location.y || player.dimension.heightRange.max - 2 >= player.location.y) {
      let above = player.dimension.getBlockFromRay(player.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 1 });
      if (above && !above.block.isAir && !above.block.isLiquid && p.fallVelocity < 0) p.fallVelocity = 0;
      const locations = [sumObjects(player.location, { y: 0.55 }), player.getHeadLocation()];
      if (locations.map((loc) => player.dimension.getBlockFromRay(loc, xzDir)).some((ray2, index) => {
        if (ray2 == void 0) return false;
        if (Geo.distance(sumObjects(ray2.faceLocation, ray2.block.location), locations[index]) < 0.6 && !ray2.block.isAir) return true;
      })) {
        xz = { x: 0, z: 0 };
        p.savedXZ = xz;
      }
    }
    if (p.fallVelocity != 0) player.applyKnockback({ x: 0, z: 0 }, 0);
    player.applyKnockback({ x: xzDir.x * xzPower, z: xzDir.z * xzPower }, -p.fallVelocity);
    let ray = player.dimension.getBlockFromRay(player.location, { x: 0, y: -1, z: 0 });
    if (ray != void 0) {
      let distance = player.location.y - sumObjects(ray.block.location, ray.faceLocation).y;
      p.distance = distance;
      if (distance < -player.getVelocity().y * 3) player.addEffect("slow_falling", 5, { amplifier: 0, showParticles: false });
    }
    p.fallingVelocity = p.fallVelocity / 2;
  }
};

// src/main/bedrock/ts/fluids/templates/LavaTemplate.ts
var LavaTemplate = class extends FluidTemplate {
  _ids;
  playerState = /* @__PURE__ */ new Map();
  constructor(baseName) {
    super();
    this._ids = generateFluidIDs(baseName);
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
        resultBlock: "gaiadimension:primal_mass",
        directions: "adjacent",
        sound: "random.fizz"
      },
      {
        targetBlock: ["minecraft:water", "minecraft:flowing_water"],
        action: "transformTarget",
        resultBlock: "gaiadimension:primal_mass",
        directions: "below",
        sound: "random.fizz"
      },
      {
        targetBlock: ["minecraft:water", "minecraft:flowing_water"],
        action: "transformSelf",
        resultBlock: "gaiadimension:primal_mass",
        directions: "below",
        sound: "random.fizz"
      }
    ];
  }
  onPlayerTick(player, block, isHeadInside, isFeetInside) {
    const prevState = this.playerState.get(player.id) || { head: false, fovSet: false };
    let gravityVal = 9.8;
    let slownessLevel = 0;
    let amplifier = 0;
    if (isHeadInside) {
      gravityVal = 0.5;
      slownessLevel = 10;
      amplifier = 2;
    } else if (isFeetInside) {
      const blockMid = player.dimension.getBlock({ x: player.location.x, y: player.location.y + 0.8, z: player.location.z });
      if (blockMid && this._ids.includes(blockMid.typeId)) {
        gravityVal = 2;
        slownessLevel = 8;
        amplifier = 1;
      } else {
        gravityVal = 5;
        slownessLevel = 6;
        amplifier = 0;
      }
    }
    if (player.isSneaking) {
      gravityVal = Math.max(0.2, gravityVal - 1);
      slownessLevel = Math.min(15, slownessLevel + 2);
      amplifier = Math.min(2, amplifier + 1);
    }
    if (isHeadInside || isFeetInside) {
      MotionEngine.tickPlayer(player, gravityVal, 0.1, 25, true);
      player.addEffect("slowness", 5, { amplifier: slownessLevel, showParticles: false });
      player.addEffect("slow_falling", 4, { amplifier, showParticles: false });
      if (player.isJumping) {
        player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
      }
      const fovAdjustment = Math.min(170, 70 + slownessLevel * 21);
      player.runCommand(`camera @s set minecraft:first_person fov ${fovAdjustment}`);
      prevState.fovSet = true;
    } else if (prevState.fovSet) {
      player.runCommand("camera @s clear");
      prevState.fovSet = false;
    }
    player.setOnFire(10, true);
    if (system28.currentTick % 20 === 0) {
      player.applyDamage(4, { cause: "lava" });
    }
    const userFogId = "fluid_fog";
    if (isHeadInside) {
      FogManager.pushFog(player, "gaiadimension:liquid_magma_fog", userFogId);
    } else if (prevState.head) {
      FogManager.popFog(player, userFogId);
    }
    this.playerState.set(player.id, { head: isHeadInside, fovSet: prevState.fovSet });
  }
  onEntityTick(entity, block) {
    if (entity.typeId === "minecraft:item") {
      entity.setOnFire(5, true);
      return;
    }
    entity.setOnFire(10, true);
    if (system28.currentTick % 20 === 0) {
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
  config;
  playerState = /* @__PURE__ */ new Map();
  constructor(config) {
    super();
    this.config = config;
    this._ids = generateFluidIDs(config.baseName);
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
    const prevState = this.playerState.get(player.id) || { head: false, feet: false, fovSet: false };
    let gravityVal = 9.8;
    let slownessLevel = 0;
    let amplifier = 0;
    let viscosity = 0;
    if (this.config.viscosity !== void 0 && this.config.viscosity > 1) {
      viscosity = this.config.viscosity;
      gravityVal = 0.5;
      slownessLevel = Math.min(10, viscosity);
      amplifier = 2;
    } else {
      if (isHeadInside) {
        gravityVal = 0.5;
        slownessLevel = 4;
        amplifier = 2;
      } else if (isFeetInside) {
        const blockMid = player.dimension.getBlock({ x: player.location.x, y: player.location.y + 0.8, z: player.location.z });
        if (blockMid && this._ids.includes(blockMid.typeId)) {
          gravityVal = 2;
          slownessLevel = 3;
          amplifier = 1;
        } else {
          gravityVal = 5;
          slownessLevel = 2;
          amplifier = 0;
        }
      }
    }
    if (player.isSneaking) {
      gravityVal = Math.max(0.2, gravityVal - 1);
      slownessLevel = Math.min(6, slownessLevel + 1);
      amplifier = Math.min(2, amplifier + 1);
    }
    if (isHeadInside || isFeetInside) {
      MotionEngine.tickPlayer(player, gravityVal, 0.2, 15, true, viscosity);
      player.addEffect("slowness", 5, { amplifier: slownessLevel, showParticles: false });
      player.addEffect("slow_falling", 4, { amplifier, showParticles: false });
      if (player.isJumping && viscosity < 5) {
        player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
      }
      const fovAdjustment = Math.min(170, 70 + slownessLevel * 21);
      player.runCommand(`camera @s set minecraft:first_person fov ${fovAdjustment}`);
      prevState.fovSet = true;
    } else if (prevState.fovSet) {
      player.runCommand("camera @s clear");
      prevState.fovSet = false;
    }
    const userFogId = "fluid_fog";
    if (isHeadInside) {
      if (this.config.fogId) FogManager.pushFog(player, this.config.fogId, userFogId);
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
    this.playerState.set(player.id, { head: isHeadInside, feet: isFeetInside, fovSet: prevState.fovSet });
  }
  processBoat(boat, dimension, isDeep) {
    if (!this.config.hasBoatPhysics) return;
    if (isDeep) boat.applyImpulse({ x: 0, y: 0.2, z: 0 });
    const rotation = boat.getRotation().y;
    const dirX = -Math.sin(rotation * (Math.PI / 180));
    const dirZ = Math.cos(rotation * (Math.PI / 180));
    const vel = boat.getVelocity();
    const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    if (speed > 0.01) boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
    this.manageBoatHolder(boat, dimension);
  }
  manageBoatHolder(boat, dimension) {
    const location = boat.location;
    const holders = dimension.getEntities({ type: "gaiadimension:boat_holder", location, maxDistance: 2 });
    let holder = holders.length > 0 ? holders[0] : null;
    const targetHolderY = Math.floor(location.y) + 1 - 0.55;
    if (!holder) holder = dimension.spawnEntity("gaiadimension:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
    if (holder && holder.isValid) {
      try {
        holder.teleport({ x: location.x, y: targetHolderY, z: location.z }, { dimension, rotation: { x: 0, y: boat.getRotation().y } });
      } catch {
      }
    }
  }
};

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
var taskIndex = 0;
var DIRECTIONS = [
  { x: 0, y: 0, z: -1, name: "north", straight: 1 },
  { x: 0, y: 0, z: 1, name: "south", straight: 5 },
  { x: 1, y: 0, z: 0, name: "east", straight: 3 },
  { x: -1, y: 0, z: 0, name: "west", straight: 7 }
];
system29.runInterval(() => {
  blockCache.clear();
  const start = Date.now();
  const players = world26.getAllPlayers();
  const tasks = [
    () => runPlayerEffects(players),
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
        const distSq = Math.pow(dummy.location.x - targetPos.x, 2) + Math.pow(dummy.location.y - targetPos.y, 2) + Math.pow(dummy.location.z - targetPos.z, 2);
        if (distSq > 0.01) dummy.teleport(targetPos);
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
  const currentTick = system29.currentTick;
  const iterator = PENDING_BLOCKS.entries();
  let processedCount = 0;
  const MAX_PER_TICK = 50;
  for (let entry2 = iterator.next(); !entry2.done; entry2 = iterator.next()) {
    const timeSpent = Date.now() - startTime;
    if (timeSpent > BUDGET && processedCount > 0) break;
    if (processedCount >= MAX_PER_TICK) break;
    const [key, data] = entry2.value;
    if (currentTick < data.scheduledTick) continue;
    PENDING_BLOCKS.delete(key);
    try {
      const { block, dimension } = data;
      if (block.isValid) {
        if (processFluidBlock(block, dimension)) wakeNeighbors(block.location, dimension);
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
function findClosestSlope(dimension, startLoc, searchDist, baseId) {
  const queue = [{ loc: startLoc, dist: 0 }];
  const visited = /* @__PURE__ */ new Set();
  const foundSlopes = [];
  let minDist = 999;
  while (queue.length > 0) {
    const { loc, dist } = queue.shift();
    if (dist > searchDist) continue;
    if (dist > minDist) break;
    for (const dir of DIRECTIONS) {
      const next = { x: loc.x + dir.x, y: loc.y, z: loc.z + dir.z };
      const key = `${next.x},${next.y},${next.z}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const block = getCachedBlock(dimension, next.x, next.y, next.z);
      if (!block) continue;
      const below = getCachedBlock(dimension, next.x, next.y - 1, next.z);
      if (below && isReplaceable(below)) {
        if (dist + 1 < minDist) {
          minDist = dist + 1;
          foundSlopes.length = 0;
        }
        if (dist + 1 === minDist) foundSlopes.push({ x: next.x, y: next.y, z: next.z });
      } else if (isReplaceable(block)) {
        queue.push({ loc: next, dist: dist + 1 });
      }
    }
  }
  return foundSlopes;
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
  if (currentStage > 0) {
    let hasParent = false;
    const parentTag = currentStage === 1 ? "template" : `template${currentStage - 1}`;
    for (const dir of DIRECTIONS) {
      const neighbor = getCachedBlock(dimension, block.x + dir.x, block.y, block.z + dir.z);
      if (neighbor && (neighbor.typeId === baseId || neighbor.hasTag(parentTag))) {
        hasParent = true;
        break;
      }
    }
    if (!hasParent) {
      const above = getCachedBlock(dimension, block.x, block.y + 1, block.z);
      if (!(above && (above.typeId === baseId || above.typeId === baseId + "_down"))) {
        dimension.fillBlocks(new BlockVolume3(block.location, block.location), "minecraft:air");
        return true;
      }
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
      dimension.fillBlocks(new BlockVolume3(block.location, block.location), BlockPermutation12.resolve(block.typeId, states));
    }
  }
  const below = getCachedBlock(dimension, block.location.x, block.location.y - 1, block.location.z);
  let flowedDown = false;
  if (below && isReplaceable(below)) {
    dimension.fillBlocks(new BlockVolume3(below.location, below.location), baseId + "_down");
    flowedDown = true;
    changesHappened = true;
  } else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) flowedDown = true;
  const maxStages = 7;
  const canSpread = currentStage === 0 || currentStage === -1 && !flowedDown || currentStage > 0 && currentStage < maxStages;
  if (canSpread) {
    const nextStageNum = currentStage <= 0 ? 1 : currentStage + 1;
    const nextId = baseId + nextStageNum;
    const searchDist = template?.slopeFindDistance ?? 4;
    const slopes = findClosestSlope(dimension, block.location, searchDist, baseId);
    for (const dir of DIRECTIONS) {
      const neighbor = getCachedBlock(dimension, block.x + dir.x, block.y, block.z + dir.z);
      if (neighbor) {
        let shouldFlow = slopes.length === 0;
        if (slopes.length > 0) {
          const distToSlope = (s) => Math.abs(s.x - (block.x + dir.x)) + Math.abs(s.z - (block.z + dir.z));
          shouldFlow = slopes.some((s) => distToSlope(s) < Math.abs(s.x - block.x) + Math.abs(s.z - block.z));
        }
        if (shouldFlow) {
          let canOverwrite = false;
          if (isReplaceable(neighbor)) canOverwrite = true;
          else if (neighbor.typeId.startsWith(baseId)) {
            const nInfo = getTypeInfo(neighbor.typeId);
            if (nInfo.stage > 0 && nextStageNum < nInfo.stage) canOverwrite = true;
          }
          if (canOverwrite) {
            const perm = BlockPermutation12.resolve(nextId, { "gaiadimension:flow_dir": dir.straight });
            dimension.fillBlocks(new BlockVolume3(neighbor.location, neighbor.location), perm);
            PENDING_BLOCKS.set(`${neighbor.x},${neighbor.y},${neighbor.z},${dimension.id}`, { block: neighbor, dimension, scheduledTick: system29.currentTick + (template?.spreadDelay ?? 5) });
            changesHappened = true;
          }
        }
      }
    }
  }
  if (currentStage > 0) {
    let flowX = 0, flowZ = 0;
    for (const dir of DIRECTIONS) {
      const nb = getCachedBlock(dimension, block.x + dir.x, block.y, block.z + dir.z);
      let nLevel = 999;
      if (nb && isReplaceable(nb) && !fluidIDs.has(nb.typeId)) nLevel = 99;
      else if (nb && nb.typeId.startsWith(baseId)) {
        const nInfo = getTypeInfo(nb.typeId);
        nLevel = nInfo.stage === -1 ? 0 : nInfo.stage;
      }
      if (nLevel < currentStage) {
        flowX += dir.x;
        flowZ += dir.z;
      } else if (nLevel > currentStage) {
        flowX -= dir.x;
        flowZ -= dir.z;
      }
    }
    flowX = flowX > 0 ? 1 : flowX < 0 ? -1 : 0;
    flowZ = flowZ > 0 ? 1 : flowZ < 0 ? -1 : 0;
    let dirState = 5;
    if (flowX === 0 && flowZ === -1) dirState = 1;
    else if (flowX === 1 && flowZ === -1) dirState = 2;
    else if (flowX === 1 && flowZ === 0) dirState = 3;
    else if (flowX === 1 && flowZ === 1) dirState = 4;
    else if (flowX === 0 && flowZ === 1) dirState = 5;
    else if (flowX === -1 && flowZ === 1) dirState = 6;
    else if (flowX === -1 && flowZ === 0) dirState = 7;
    else if (flowX === -1 && flowZ === -1) dirState = 8;
    const perms = block.permutation.getAllStates();
    if (perms["gaiadimension:flow_dir"] !== dirState) {
      perms["gaiadimension:flow_dir"] = dirState;
      dimension.fillBlocks(new BlockVolume3(block.location, block.location), BlockPermutation12.resolve(typeId, perms));
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
    if (!PENDING_BLOCKS.has(key)) {
      let delay2 = 5;
      const info = getTypeInfo(block.typeId);
      const template = idToTemplate.get(info.baseId);
      if (template) delay2 = template.spreadDelay;
      PENDING_BLOCKS.set(key, { block, dimension: block.dimension, scheduledTick: system29.currentTick + delay2 });
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
  const scheduledTick = system29.currentTick + delay2;
  for (const offset of locations) {
    const nx = x + offset.x, ny = y + offset.y, nz = z + offset.z;
    const key = `${nx},${ny},${nz},${dimension.id}`;
    if (!PENDING_BLOCKS.has(key)) {
      const neighbor = getCachedBlock(dimension, nx, ny, nz);
      if (neighbor && neighbor.isValid && fluidIDs.has(neighbor.typeId)) PENDING_BLOCKS.set(key, { block: neighbor, dimension, scheduledTick });
    }
  }
}
world26.afterEvents.playerPlaceBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));
world26.afterEvents.playerBreakBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));
world26.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  const { player, block, itemStack } = event;
  if (!itemStack || !itemStack.typeId.startsWith("gaiadimension:") || !itemStack.typeId.endsWith("_bucket")) return;
  const fluidId = itemStack.typeId.replace("_bucket", "");
  const isFlowingVariant = (blk) => blk.typeId.startsWith(fluidId) && (blk.typeId.endsWith("_down") || /\d+$/.test(blk.typeId));
  if (isFlowingVariant(block)) {
    event.cancel = true;
    system29.run(() => {
      if (block.isValid) {
        block.setPermutation(BlockPermutation12.resolve(fluidId));
        wakeNeighbors(block.location, block.dimension);
        const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
        player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water", { pitch: 1, volume: 1 });
        if (player.getGameMode() !== GameMode8.Creative) {
          const container2 = player.getComponent("inventory")?.container;
          if (container2) {
            const slot = player.selectedSlotIndex;
            const currentItem = container2.getItem(slot);
            if (currentItem && currentItem.typeId === itemStack.typeId) {
              if (currentItem.amount > 1) {
                currentItem.amount--;
                container2.setItem(slot, currentItem);
                const emptyBucket = new ItemStack12("minecraft:bucket", 1);
                const remainder = container2.addItem(emptyBucket);
                if (remainder) player.dimension.spawnItem(remainder, player.location);
              } else container2.setItem(slot, new ItemStack12("minecraft:bucket", 1));
            }
          }
        }
      }
    });
    return;
  }
});
world26.afterEvents.playerInteractWithEntity.subscribe((event) => {
  const { player, target, itemStack } = event;
  if (target.typeId !== "gaiadimension:fluid_interaction_dummy" || !(player instanceof Player15)) return;
  const dimension = player.dimension;
  const location = { x: Math.floor(target.location.x), y: Math.floor(target.location.y), z: Math.floor(target.location.z) };
  const fluidBlock = getCachedBlock(dimension, location.x, location.y, location.z);
  if (!fluidBlock || !fluidIDs.has(fluidBlock.typeId)) return;
  if (itemStack?.typeId === "minecraft:bucket") {
    const info = getTypeInfo(fluidBlock.typeId);
    if (info.stage === 0) {
      const bucketId = info.baseId + "_bucket", filledBucket = new ItemStack12(bucketId, 1);
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
        if (player.getGameMode() !== GameMode8.Creative) {
          const inventory = player.getComponent("inventory")?.container;
          if (inventory) {
            const slot = player.selectedSlotIndex;
            if (itemStack.amount > 1) {
              itemStack.amount--;
              inventory.setItem(slot, itemStack);
              const emptyBucket = new ItemStack12("minecraft:bucket", 1);
              const remainder = container.addItem(emptyBucket);
              if (remainder) dimension.spawnItem(remainder, player.location);
            } else inventory.setItem(slot, new ItemStack12("minecraft:bucket", 1));
          }
        }
      }
    } else {
      try {
        const perm = BlockPermutation12.resolve(itemStack.typeId);
        if (perm) {
          dimension.fillBlocks(new BlockVolume3(location, location), perm);
          player.playSound("stone.dig", { location });
          if (player.getGameMode() !== GameMode8.Creative) {
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
system29.runInterval(() => {
  for (const player of world26.getAllPlayers()) {
    const container2 = player.getComponent("inventory")?.container;
    if (!container2) continue;
    for (let i = 0; i < container2.size; i++) {
      const item = container2.getItem(i);
      if (!item) continue;
      if (item.typeId === "gaiadimension:tar_cauldron") {
        try {
          container2.setItem(i, new ItemStack12("minecraft:cauldron", item.amount));
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
          container2.setItem(i, new ItemStack12(baseId + "_bucket", item.amount));
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
import { system as system30 } from "@minecraft/server";
function registerCustomTool() {
  system30.beforeEvents.startup.subscribe((event) => {
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
import { Player as Player17, system as system31, CommandPermissionLevel, CustomCommandParamType } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
      const currentConfig = ModConfig.getAll();
      const form = new ModalFormData();
      form.title("\xA76Gaia Settings");
      form.toggle("Portal Biome Restriction\n\xA77(Only allowed biomes)", { defaultValue: currentConfig.portalBiomeRestriction });
      form.toggle("Allow All Biomes\n\xA77(Bypass restriction)", { defaultValue: currentConfig.allowAllBiomes });
      form.textField("Manually Add Biome ID", "Enter identifier...", { defaultValue: "" });
      const discovered = currentConfig.discoveredBiomes;
      const hotBiomes = new Set(currentConfig.hotBiomes);
      for (const biomeId of discovered) {
        const isAllowed = hotBiomes.has(biomeId);
        const label = isAllowed ? `\xA7aAllowed: \xA7f${biomeId}` : `\xA77Restricted: \xA7f${biomeId}`;
        form.toggle(label, { defaultValue: isAllowed });
      }
      form.show(player).then((response) => {
        if (response.canceled) return;
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
        console.error("Failed to show settings form: " + e);
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
    if (!(player instanceof Player17)) return;
    system31.run(() => {
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
import { Player as Player18, system as system32, CommandPermissionLevel as CommandPermissionLevel2, CustomCommandParamType as CustomCommandParamType2 } from "@minecraft/server";

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
    if (!(player instanceof Player18)) return;
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
      system32.run(() => {
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
      const interval = system32.runInterval(() => {
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
          system32.clearRun(interval);
          dim.playSound("ui.toast.challenge_complete", center);
          player.sendMessage("\xA76[Gaia] \xA7aTransformation Complete.");
        }
      }, 1);
    }
    return { status: 0 };
  });
}

// src/main/bedrock/ts/items/FireStarter.ts
import { Player as Player19 } from "@minecraft/server";
function registerFireStarterComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:fire_starter", {
    onUseOn: (event) => {
      const { source: player, block, blockFace, itemStack } = event;
      if (!(player instanceof Player19)) return;
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
import { Player as Player20 } from "@minecraft/server";
function registerMagicStaffComponent({ itemComponentRegistry }) {
  itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
    onUse: (event) => {
      const { source: player, itemStack } = event;
      if (!(player instanceof Player20)) return;
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
import { world as world29, system as system33, MolangVariableMap } from "@minecraft/server";
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
  world29.afterEvents.entitySpawn.subscribe((event) => {
    if (event.entity.typeId === "gaiadimension:staff_projectile") {
      activeProjectiles.add(event.entity.id);
    }
  });
  system33.runInterval(() => {
    if (activeProjectiles.size === 0) return;
    for (const id of activeProjectiles) {
      const entity = world29.getEntity(id);
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
    if (system33.currentTick % 200 === 0) {
      for (const id of projectileCache.keys()) {
        if (!activeProjectiles.has(id) && !world29.getEntity(id)) {
          projectileCache.delete(id);
        }
      }
    }
  }, 1);
  world29.afterEvents.projectileHitBlock.subscribe((event) => {
    if (event.projectile.typeId !== "gaiadimension:staff_projectile") return;
    const data = projectileCache.get(event.projectile.id);
    if (data) {
      handleHit(event.projectile, data, event.location, event.face);
      activeProjectiles.delete(event.projectile.id);
      projectileCache.delete(event.projectile.id);
    }
  });
  world29.afterEvents.projectileHitEntity.subscribe((event) => {
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
    return vec && vec[isVec3Symbol] === true;
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
    if (arguments.length === 7 && arguments[3] instanceof Vector319) {
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
    if (arguments.length === 1 && arguments[0] instanceof Vector319) {
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
    if (arguments.length === 1 && arguments[0] instanceof Vector319) {
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
    if (arguments.length === 1 && arguments[0] instanceof Vector319) {
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
    if (arguments.length === 7 && arguments[3] instanceof Vector319) {
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
var Vector319 = class {
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
Array.prototype.random = function random(r = Math.random()) {
  return this[Math.floor(r * this.length)];
};
String.prototype.toArray = function toArray(num) {
  return new Array(num ?? 1).fill(this);
};

// src/main/bedrock/ts/world/worldgen/core/utils/ease-ing.ts
function proximityEaseing(x, proximityFactor) {
  return 1 / (1 + Math.exp(-proximityFactor * (x - 0.5)));
}
function easeOutQuad(x) {
  return 1 - (1 - x) * (1 - x);
}
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
  /**@returns {Vector3[]} */
  getPaletteLocations(permutation) {
    return this.palettes.get(permutation) ?? [];
  }
  setPaletteLocations(permutation, locations) {
    this.palettes.set(permutation, locations);
  }
  setBlock(location, permutation) {
    let list = this.palettes.get(permutation);
    if (!list) this.palettes.set(permutation, list = []);
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
        if (!sliceList) slices.set(key, sliceList = []);
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
    repeat = repeat ?? 1;
    while (repeat--) this.permutations.push(type2);
    return this;
  }
  addArray(list) {
    for (const entry2 of list) this.add(entry2);
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
BlockPermutation15.prototype.toPermutation = function toPermutation(r) {
  return this;
};
String.prototype.toPermutation = function toPermutation2(r) {
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
import { system as system35 } from "@minecraft/server";
var delay = system35.waitTicks.bind(system35);

// src/main/bedrock/ts/world/worldgen/core/client/index.ts
import { world as world34 } from "@minecraft/server";
import { ModalFormData as ModalFormData2 } from "@minecraft/server-ui";

// src/main/bedrock/ts/world/worldgen/core/client/local-chunks.ts
import { system as system38 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-manager.ts
import { world as world31, system as system37 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/definitions/biome-manager.ts
var BiomeManager = class {
  definition;
  biomes;
  table;
  default;
  /**@param {any} definition @param {BiomeDefinition} defaultBiome */
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
  /**@returns {BiomeDefinition} */
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

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-tree.ts
import { ListBlockVolume as ListBlockVolume2 } from "@minecraft/server";
var CompiledTreeSmaple = class {
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
      for (const empty of this.build({ x: 0, y: 0, z: 0 }, seed2, placer)) ;
      const sample = new CompiledTreeSmaple();
      for (const [p, list] of placer.palettes.entries()) {
        const volume = new ListBlockVolume2(list);
        const newList = [];
        for (const a of volume.getBlockLocationIterator()) newList.push(a);
        sample.lists.set(p, newList);
      }
      this.samples.push(sample);
    }
  }
  /**@returns {CompiledTreeSmaple} */
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
var CuttedSpruceTreeDefinition = class extends PillarTreeDefinition {
  carpetPaletted;
  constructor() {
    super("cut_spruce");
    this.carpetPaletted = "minecraft:moss_carpet";
  }
  setCarpetPaletted(p) {
    this.carpetPaletted = p;
    return this;
  }
  *build(location, seed2, placer) {
    const { x, y, z } = location;
    const h = seed2.nextFloat() * (this.height[1] - this.height[0]) + this.height[0];
    let lastHeights = [0, 0, 0, 0];
    for (let Y = -2; Y < h; Y++) {
      if (Y < h - 1) {
        placer.setBlock({ x: x + 1, y: lastHeights[0] = y + Y, z: z + 1 }, this.logPaletted.toPermutation(seed2.nextFloat()));
        placer.setBlock({ x: x + 1, y: lastHeights[1] = y + Y, z }, this.logPaletted.toPermutation(seed2.nextFloat()));
        placer.setBlock({ x, y: lastHeights[2] = y + Y, z: z + 1 }, this.logPaletted.toPermutation(seed2.nextFloat()));
        placer.setBlock({ x, y: lastHeights[3] = y + Y, z }, this.logPaletted.toPermutation(seed2.nextFloat()));
      } else {
        if (seed2.nextFloat() < 0.4) placer.setBlock({ x: x + 1, y: lastHeights[0] = y + Y, z: z + 1 }, this.logPaletted.toPermutation(seed2.nextFloat()));
        if (seed2.nextFloat() < 0.4) placer.setBlock({ x: x + 1, y: lastHeights[1] = y + Y, z }, this.logPaletted.toPermutation(seed2.nextFloat()));
        if (seed2.nextFloat() < 0.4) placer.setBlock({ x, y: lastHeights[2] = y + Y, z: z + 1 }, this.logPaletted.toPermutation(seed2.nextFloat()));
        if (seed2.nextFloat() < 0.4) placer.setBlock({ x, y: lastHeights[3] = y + Y, z }, this.logPaletted.toPermutation(seed2.nextFloat()));
      }
    }
    placer.setBlock({ x: x + 1, y: lastHeights[0] + 1, z: z + 1 }, this.carpetPaletted.toPermutation(seed2.nextFloat()));
    placer.setBlock({ x: x + 1, y: lastHeights[1] + 1, z }, this.carpetPaletted.toPermutation(seed2.nextFloat()));
    placer.setBlock({ x, y: lastHeights[2] + 1, z: z + 1 }, this.carpetPaletted.toPermutation(seed2.nextFloat()));
    placer.setBlock({ x, y: lastHeights[3] + 1, z }, this.carpetPaletted.toPermutation(seed2.nextFloat()));
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
  /**@returns {TreeDefinition} */
  get(random2) {
    return this.trees.random(random2);
  }
  onPrecalculate(samples, seed2) {
    for (const tree of this.trees) if (!tree.IsPrecalculated) tree.onPrecalculate(samples, seed2);
  }
};

// src/main/bedrock/ts/world/worldgen/core/definitions/definition-biome.ts
var BiomeDefinition = class {
  id;
  trees;
  treesChance;
  treeAreaChance;
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
  /**@param {string} id */
  constructor(id) {
    this.id = id;
    this.trees = new TreePalette();
    this.treesChance = 0.02;
    this.treeAreaChance = 0.5;
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
  /**@default 0.02 */
  setTreesChance(p) {
    this.treesChance = p;
    return this;
  }
  /**@default 0.5 */
  setTreesAreaChance(p) {
    this.treeAreaChance = p;
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
  getTreeDefinition(random2) {
    return this.trees.get(random2.nextFloat());
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
    system37.run(() => {
      this.__precalculated = world31.getDynamicProperty("property-precalculated") ?? true;
      this.__precalculatedSamples = world31.getDynamicProperty("property-precalculated-sampling") ?? 15;
      if (this.__precalculatedSamples > 50) this.__precalculatedSamples = 50;
    });
  }
  get IsPrecalculated() {
    return this.__precalculated;
  }
  set IsPrecalculated(v) {
    this.__precalculated = v;
    world31.setDynamicProperty("property-precalculated", v);
  }
  get PrecalculatedSamples() {
    return this.__precalculatedSamples;
  }
  set PrecalculatedSamples(v) {
    this.__precalculatedSamples = v;
    world31.setDynamicProperty("property-precalculated-sampling", v);
  }
  get IsPrecalculatedVariable() {
    return world31.getDynamicProperty("property-precalculated") ?? false;
  }
  get IsPrecalculatedSamplesVariable() {
    return world31.getDynamicProperty("property-precalculated-sampling") ?? 10;
  }
  triggerFinialize(seed2) {
    system37.run(() => {
      this.finialize.subscribe(() => {
        let time = Date.now();
        this.biomeManager.selfFinialize();
        console.warn("PRECALUCLATION WITH SAMPLES: " + this.__precalculatedSamples);
        if (this.__precalculated) this.biomeManager.onPrecalculate(this.__precalculatedSamples, seed2);
        console.warn("PRECALCULATED IN " + (Date.now() - time) + " ms");
      });
      this.finialize.trigger(seed2);
    });
  }
};

// src/main/bedrock/ts/world/worldgen/core/definitions/index.ts
var DEFINITION_MANAGER = new DefinitionManager();

// src/main/bedrock/ts/world/worldgen/core/client/local-chunks.ts
var CLIENT_CHUNKS = /* @__PURE__ */ new WeakMap();
var ClientChunk = class {
  /**@param {Player} player @param {SessionManager} sessionManager @returns {ClientChunk} */
  static open(sessionManager, player) {
    let m = CLIENT_CHUNKS.get(player);
    if (!m) CLIENT_CHUNKS.set(player, m = new this(player, sessionManager));
    return m;
  }
  player;
  manager;
  biomes;
  lastChunks = [];
  viewDistance = 8;
  maxJobs = 4;
  lastVisitedChunk = "";
  tasks = /* @__PURE__ */ new Set();
  currentArea = /* @__PURE__ */ new Set();
  knownUnrenderedChunks = /* @__PURE__ */ new Map();
  id = void 0;
  runTick = 0n;
  priorities = [];
  /**@param {Player} player @param {SessionManager} sessionManager */
  constructor(player, sessionManager) {
    this.player = player;
    this.manager = sessionManager;
    this.biomes = DEFINITION_MANAGER.biomeManager;
  }
  get emptyTasks() {
    return this.maxJobs - this.tasks.size;
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
  isGenerated() {
    const gen = this.currentGenerator;
    return gen ? gen.isGenerated(this.getKey(this.chunkXZ)) : true;
  }
  getKey(loc) {
    return `${loc.x};${loc.z}`;
  }
  start() {
    this.id = system38.runInterval(() => this._tick().catch((e) => console.error(e, e?.stack)));
  }
  stop() {
    if (this.isRunning && this.id !== void 0) system38.clearRun(this.id);
  }
  _recalc2(X, Z) {
    this.priorities = [];
    const newArea = /* @__PURE__ */ new Set();
    const r = this.viewDistance;
    let power = r ** 2;
    for (let x = -r; x < r; x++) {
      for (let z = -r; z < r; z++) {
        const R = x ** 2 + z ** 2;
        if (R > power) continue;
        const xx = X + x;
        const zz = Z + z;
        const key = `${xx};${zz}`;
        newArea.add(key);
        const priority = Math.floor(R ** 0.5);
        const p = this.priorities[priority] ?? (this.priorities[priority] = []);
        if (!this.currentArea.delete(key)) this.knownUnrenderedChunks.set(key, { x: xx, z: zz, key });
        if (this.knownUnrenderedChunks.has(key)) p.push(key);
      }
    }
    for (const key of this.currentArea) this.knownUnrenderedChunks.delete(key);
    this.currentArea = newArea;
    return this.priorities;
  }
  _generateChunk(x, z, hash) {
    const gen = this.currentGenerator;
    if (!gen) return Promise.resolve();
    const task = gen.buildChunk(x, z, hash).catch((e) => console.error(e, e?.stack));
    task.finally(() => this.tasks.delete(task));
    this.tasks.add(task);
    return task;
  }
  async _tick() {
    const { x: X, z: Z } = this.chunkXZ;
    const key = `${X};${Z}`;
    let emptyTasks = this.emptyTasks;
    const gen = this.currentGenerator;
    if (!gen) return;
    const { x, z } = this.player.location;
    if (this.player._debug) {
      const a = gen.getStats(x, z);
      const { temperature, humidity } = a;
      const biome = this.biomes.getBiome(temperature, humidity);
      if (this.runTick++ & 1n) this._showDebug(biome);
    }
    if (!emptyTasks) return;
    const priorities = this.lastVisitedChunk === (this.lastVisitedChunk = key) ? this.priorities : this._recalc2(X, Z);
    let i = 0;
    main: for (let o = 0; o < priorities.length; o++) {
      const major = priorities[o] ?? [];
      while (major.length) {
        if (++i > emptyTasks) break main;
        const key2 = major.shift();
        const loc = this.knownUnrenderedChunks.get(key2);
        if (loc) {
          this.knownUnrenderedChunks.delete(key2);
          this._generateChunk(loc.x, loc.z, key2);
        }
      }
    }
  }
  _showDebug(b) {
    this.player.onScreenDisplay.setActionBar([
      `\xA77Running Tasks:\xA7n\xA7l ${this.tasks.size} \xA77/\xA7n\xA7l ${this.maxJobs}`,
      `\xA77Queue: \xA7n\xA7l${this.knownUnrenderedChunks.size}\xA7r\xA77 chunks`,
      `\xA77Biome: \xA7n\xA7l${b.id}`,
      "\xA77Radius: \xA7n\xA7l" + this.viewDistance + "\xA7r\xA77 chunks",
      "\xA77Seed: \xA7n\xA7l" + this.manager.seed
    ].join("\n\xA7r"));
  }
};

// src/main/bedrock/ts/world/worldgen/core/world_gen/index.ts
import { world as world33, system as system40 } from "@minecraft/server";

// src/main/bedrock/ts/world/worldgen/core/world_gen/session-manager.ts
import { world as world32 } from "@minecraft/server";

// node_modules/@minecraft/vanilla-data/lib/index.js
var MinecraftBiomeTypes = ((MinecraftBiomeTypes2) => {
  MinecraftBiomeTypes2["BambooJungle"] = "minecraft:bamboo_jungle";
  MinecraftBiomeTypes2["BambooJungleHills"] = "minecraft:bamboo_jungle_hills";
  MinecraftBiomeTypes2["BasaltDeltas"] = "minecraft:basalt_deltas";
  MinecraftBiomeTypes2["Beach"] = "minecraft:beach";
  MinecraftBiomeTypes2["BirchForest"] = "minecraft:birch_forest";
  MinecraftBiomeTypes2["BirchForestHills"] = "minecraft:birch_forest_hills";
  MinecraftBiomeTypes2["BirchForestHillsMutated"] = "minecraft:birch_forest_hills_mutated";
  MinecraftBiomeTypes2["BirchForestMutated"] = "minecraft:birch_forest_mutated";
  MinecraftBiomeTypes2["CherryGrove"] = "minecraft:cherry_grove";
  MinecraftBiomeTypes2["ColdBeach"] = "minecraft:cold_beach";
  MinecraftBiomeTypes2["ColdOcean"] = "minecraft:cold_ocean";
  MinecraftBiomeTypes2["ColdTaiga"] = "minecraft:cold_taiga";
  MinecraftBiomeTypes2["ColdTaigaHills"] = "minecraft:cold_taiga_hills";
  MinecraftBiomeTypes2["ColdTaigaMutated"] = "minecraft:cold_taiga_mutated";
  MinecraftBiomeTypes2["CrimsonForest"] = "minecraft:crimson_forest";
  MinecraftBiomeTypes2["DeepColdOcean"] = "minecraft:deep_cold_ocean";
  MinecraftBiomeTypes2["DeepDark"] = "minecraft:deep_dark";
  MinecraftBiomeTypes2["DeepFrozenOcean"] = "minecraft:deep_frozen_ocean";
  MinecraftBiomeTypes2["DeepLukewarmOcean"] = "minecraft:deep_lukewarm_ocean";
  MinecraftBiomeTypes2["DeepOcean"] = "minecraft:deep_ocean";
  MinecraftBiomeTypes2["DeepWarmOcean"] = "minecraft:deep_warm_ocean";
  MinecraftBiomeTypes2["Desert"] = "minecraft:desert";
  MinecraftBiomeTypes2["DesertHills"] = "minecraft:desert_hills";
  MinecraftBiomeTypes2["DesertMutated"] = "minecraft:desert_mutated";
  MinecraftBiomeTypes2["DripstoneCaves"] = "minecraft:dripstone_caves";
  MinecraftBiomeTypes2["ExtremeHills"] = "minecraft:extreme_hills";
  MinecraftBiomeTypes2["ExtremeHillsEdge"] = "minecraft:extreme_hills_edge";
  MinecraftBiomeTypes2["ExtremeHillsMutated"] = "minecraft:extreme_hills_mutated";
  MinecraftBiomeTypes2["ExtremeHillsPlusTrees"] = "minecraft:extreme_hills_plus_trees";
  MinecraftBiomeTypes2["ExtremeHillsPlusTreesMutated"] = "minecraft:extreme_hills_plus_trees_mutated";
  MinecraftBiomeTypes2["FlowerForest"] = "minecraft:flower_forest";
  MinecraftBiomeTypes2["Forest"] = "minecraft:forest";
  MinecraftBiomeTypes2["ForestHills"] = "minecraft:forest_hills";
  MinecraftBiomeTypes2["FrozenOcean"] = "minecraft:frozen_ocean";
  MinecraftBiomeTypes2["FrozenPeaks"] = "minecraft:frozen_peaks";
  MinecraftBiomeTypes2["FrozenRiver"] = "minecraft:frozen_river";
  MinecraftBiomeTypes2["Grove"] = "minecraft:grove";
  MinecraftBiomeTypes2["Hell"] = "minecraft:hell";
  MinecraftBiomeTypes2["IceMountains"] = "minecraft:ice_mountains";
  MinecraftBiomeTypes2["IcePlains"] = "minecraft:ice_plains";
  MinecraftBiomeTypes2["IcePlainsSpikes"] = "minecraft:ice_plains_spikes";
  MinecraftBiomeTypes2["JaggedPeaks"] = "minecraft:jagged_peaks";
  MinecraftBiomeTypes2["Jungle"] = "minecraft:jungle";
  MinecraftBiomeTypes2["JungleEdge"] = "minecraft:jungle_edge";
  MinecraftBiomeTypes2["JungleEdgeMutated"] = "minecraft:jungle_edge_mutated";
  MinecraftBiomeTypes2["JungleHills"] = "minecraft:jungle_hills";
  MinecraftBiomeTypes2["JungleMutated"] = "minecraft:jungle_mutated";
  MinecraftBiomeTypes2["LegacyFrozenOcean"] = "minecraft:legacy_frozen_ocean";
  MinecraftBiomeTypes2["LukewarmOcean"] = "minecraft:lukewarm_ocean";
  MinecraftBiomeTypes2["LushCaves"] = "minecraft:lush_caves";
  MinecraftBiomeTypes2["MangroveSwamp"] = "minecraft:mangrove_swamp";
  MinecraftBiomeTypes2["Meadow"] = "minecraft:meadow";
  MinecraftBiomeTypes2["MegaTaiga"] = "minecraft:mega_taiga";
  MinecraftBiomeTypes2["MegaTaigaHills"] = "minecraft:mega_taiga_hills";
  MinecraftBiomeTypes2["Mesa"] = "minecraft:mesa";
  MinecraftBiomeTypes2["MesaBryce"] = "minecraft:mesa_bryce";
  MinecraftBiomeTypes2["MesaPlateau"] = "minecraft:mesa_plateau";
  MinecraftBiomeTypes2["MesaPlateauMutated"] = "minecraft:mesa_plateau_mutated";
  MinecraftBiomeTypes2["MesaPlateauStone"] = "minecraft:mesa_plateau_stone";
  MinecraftBiomeTypes2["MesaPlateauStoneMutated"] = "minecraft:mesa_plateau_stone_mutated";
  MinecraftBiomeTypes2["MushroomIsland"] = "minecraft:mushroom_island";
  MinecraftBiomeTypes2["MushroomIslandShore"] = "minecraft:mushroom_island_shore";
  MinecraftBiomeTypes2["Ocean"] = "minecraft:ocean";
  MinecraftBiomeTypes2["PaleGarden"] = "minecraft:pale_garden";
  MinecraftBiomeTypes2["Plains"] = "minecraft:plains";
  MinecraftBiomeTypes2["RedwoodTaigaHillsMutated"] = "minecraft:redwood_taiga_hills_mutated";
  MinecraftBiomeTypes2["RedwoodTaigaMutated"] = "minecraft:redwood_taiga_mutated";
  MinecraftBiomeTypes2["River"] = "minecraft:river";
  MinecraftBiomeTypes2["RoofedForest"] = "minecraft:roofed_forest";
  MinecraftBiomeTypes2["RoofedForestMutated"] = "minecraft:roofed_forest_mutated";
  MinecraftBiomeTypes2["Savanna"] = "minecraft:savanna";
  MinecraftBiomeTypes2["SavannaMutated"] = "minecraft:savanna_mutated";
  MinecraftBiomeTypes2["SavannaPlateau"] = "minecraft:savanna_plateau";
  MinecraftBiomeTypes2["SavannaPlateauMutated"] = "minecraft:savanna_plateau_mutated";
  MinecraftBiomeTypes2["SnowySlopes"] = "minecraft:snowy_slopes";
  MinecraftBiomeTypes2["SoulsandValley"] = "minecraft:soulsand_valley";
  MinecraftBiomeTypes2["StoneBeach"] = "minecraft:stone_beach";
  MinecraftBiomeTypes2["StonyPeaks"] = "minecraft:stony_peaks";
  MinecraftBiomeTypes2["SunflowerPlains"] = "minecraft:sunflower_plains";
  MinecraftBiomeTypes2["Swampland"] = "minecraft:swampland";
  MinecraftBiomeTypes2["SwamplandMutated"] = "minecraft:swampland_mutated";
  MinecraftBiomeTypes2["Taiga"] = "minecraft:taiga";
  MinecraftBiomeTypes2["TaigaHills"] = "minecraft:taiga_hills";
  MinecraftBiomeTypes2["TaigaMutated"] = "minecraft:taiga_mutated";
  MinecraftBiomeTypes2["TheEnd"] = "minecraft:the_end";
  MinecraftBiomeTypes2["WarmOcean"] = "minecraft:warm_ocean";
  MinecraftBiomeTypes2["WarpedForest"] = "minecraft:warped_forest";
  return MinecraftBiomeTypes2;
})(MinecraftBiomeTypes || {});
var MinecraftBlockTypes = ((MinecraftBlockTypes2) => {
  MinecraftBlockTypes2["AcaciaButton"] = "minecraft:acacia_button";
  MinecraftBlockTypes2["AcaciaDoor"] = "minecraft:acacia_door";
  MinecraftBlockTypes2["AcaciaDoubleSlab"] = "minecraft:acacia_double_slab";
  MinecraftBlockTypes2["AcaciaFence"] = "minecraft:acacia_fence";
  MinecraftBlockTypes2["AcaciaFenceGate"] = "minecraft:acacia_fence_gate";
  MinecraftBlockTypes2["AcaciaHangingSign"] = "minecraft:acacia_hanging_sign";
  MinecraftBlockTypes2["AcaciaLeaves"] = "minecraft:acacia_leaves";
  MinecraftBlockTypes2["AcaciaLog"] = "minecraft:acacia_log";
  MinecraftBlockTypes2["AcaciaPlanks"] = "minecraft:acacia_planks";
  MinecraftBlockTypes2["AcaciaPressurePlate"] = "minecraft:acacia_pressure_plate";
  MinecraftBlockTypes2["AcaciaSapling"] = "minecraft:acacia_sapling";
  MinecraftBlockTypes2["AcaciaShelf"] = "minecraft:acacia_shelf";
  MinecraftBlockTypes2["AcaciaSlab"] = "minecraft:acacia_slab";
  MinecraftBlockTypes2["AcaciaStairs"] = "minecraft:acacia_stairs";
  MinecraftBlockTypes2["AcaciaStandingSign"] = "minecraft:acacia_standing_sign";
  MinecraftBlockTypes2["AcaciaTrapdoor"] = "minecraft:acacia_trapdoor";
  MinecraftBlockTypes2["AcaciaWallSign"] = "minecraft:acacia_wall_sign";
  MinecraftBlockTypes2["AcaciaWood"] = "minecraft:acacia_wood";
  MinecraftBlockTypes2["ActivatorRail"] = "minecraft:activator_rail";
  MinecraftBlockTypes2["Air"] = "minecraft:air";
  MinecraftBlockTypes2["Allium"] = "minecraft:allium";
  MinecraftBlockTypes2["Allow"] = "minecraft:allow";
  MinecraftBlockTypes2["AmethystBlock"] = "minecraft:amethyst_block";
  MinecraftBlockTypes2["AmethystCluster"] = "minecraft:amethyst_cluster";
  MinecraftBlockTypes2["AncientDebris"] = "minecraft:ancient_debris";
  MinecraftBlockTypes2["Andesite"] = "minecraft:andesite";
  MinecraftBlockTypes2["AndesiteDoubleSlab"] = "minecraft:andesite_double_slab";
  MinecraftBlockTypes2["AndesiteSlab"] = "minecraft:andesite_slab";
  MinecraftBlockTypes2["AndesiteStairs"] = "minecraft:andesite_stairs";
  MinecraftBlockTypes2["AndesiteWall"] = "minecraft:andesite_wall";
  MinecraftBlockTypes2["Anvil"] = "minecraft:anvil";
  MinecraftBlockTypes2["Azalea"] = "minecraft:azalea";
  MinecraftBlockTypes2["AzaleaLeaves"] = "minecraft:azalea_leaves";
  MinecraftBlockTypes2["AzaleaLeavesFlowered"] = "minecraft:azalea_leaves_flowered";
  MinecraftBlockTypes2["AzureBluet"] = "minecraft:azure_bluet";
  MinecraftBlockTypes2["Bamboo"] = "minecraft:bamboo";
  MinecraftBlockTypes2["BambooBlock"] = "minecraft:bamboo_block";
  MinecraftBlockTypes2["BambooButton"] = "minecraft:bamboo_button";
  MinecraftBlockTypes2["BambooDoor"] = "minecraft:bamboo_door";
  MinecraftBlockTypes2["BambooDoubleSlab"] = "minecraft:bamboo_double_slab";
  MinecraftBlockTypes2["BambooFence"] = "minecraft:bamboo_fence";
  MinecraftBlockTypes2["BambooFenceGate"] = "minecraft:bamboo_fence_gate";
  MinecraftBlockTypes2["BambooHangingSign"] = "minecraft:bamboo_hanging_sign";
  MinecraftBlockTypes2["BambooMosaic"] = "minecraft:bamboo_mosaic";
  MinecraftBlockTypes2["BambooMosaicDoubleSlab"] = "minecraft:bamboo_mosaic_double_slab";
  MinecraftBlockTypes2["BambooMosaicSlab"] = "minecraft:bamboo_mosaic_slab";
  MinecraftBlockTypes2["BambooMosaicStairs"] = "minecraft:bamboo_mosaic_stairs";
  MinecraftBlockTypes2["BambooPlanks"] = "minecraft:bamboo_planks";
  MinecraftBlockTypes2["BambooPressurePlate"] = "minecraft:bamboo_pressure_plate";
  MinecraftBlockTypes2["BambooSapling"] = "minecraft:bamboo_sapling";
  MinecraftBlockTypes2["BambooShelf"] = "minecraft:bamboo_shelf";
  MinecraftBlockTypes2["BambooSlab"] = "minecraft:bamboo_slab";
  MinecraftBlockTypes2["BambooStairs"] = "minecraft:bamboo_stairs";
  MinecraftBlockTypes2["BambooStandingSign"] = "minecraft:bamboo_standing_sign";
  MinecraftBlockTypes2["BambooTrapdoor"] = "minecraft:bamboo_trapdoor";
  MinecraftBlockTypes2["BambooWallSign"] = "minecraft:bamboo_wall_sign";
  MinecraftBlockTypes2["Barrel"] = "minecraft:barrel";
  MinecraftBlockTypes2["Barrier"] = "minecraft:barrier";
  MinecraftBlockTypes2["Basalt"] = "minecraft:basalt";
  MinecraftBlockTypes2["Beacon"] = "minecraft:beacon";
  MinecraftBlockTypes2["Bed"] = "minecraft:bed";
  MinecraftBlockTypes2["Bedrock"] = "minecraft:bedrock";
  MinecraftBlockTypes2["BeeNest"] = "minecraft:bee_nest";
  MinecraftBlockTypes2["Beehive"] = "minecraft:beehive";
  MinecraftBlockTypes2["Beetroot"] = "minecraft:beetroot";
  MinecraftBlockTypes2["Bell"] = "minecraft:bell";
  MinecraftBlockTypes2["BigDripleaf"] = "minecraft:big_dripleaf";
  MinecraftBlockTypes2["BirchButton"] = "minecraft:birch_button";
  MinecraftBlockTypes2["BirchDoor"] = "minecraft:birch_door";
  MinecraftBlockTypes2["BirchDoubleSlab"] = "minecraft:birch_double_slab";
  MinecraftBlockTypes2["BirchFence"] = "minecraft:birch_fence";
  MinecraftBlockTypes2["BirchFenceGate"] = "minecraft:birch_fence_gate";
  MinecraftBlockTypes2["BirchHangingSign"] = "minecraft:birch_hanging_sign";
  MinecraftBlockTypes2["BirchLeaves"] = "minecraft:birch_leaves";
  MinecraftBlockTypes2["BirchLog"] = "minecraft:birch_log";
  MinecraftBlockTypes2["BirchPlanks"] = "minecraft:birch_planks";
  MinecraftBlockTypes2["BirchPressurePlate"] = "minecraft:birch_pressure_plate";
  MinecraftBlockTypes2["BirchSapling"] = "minecraft:birch_sapling";
  MinecraftBlockTypes2["BirchShelf"] = "minecraft:birch_shelf";
  MinecraftBlockTypes2["BirchSlab"] = "minecraft:birch_slab";
  MinecraftBlockTypes2["BirchStairs"] = "minecraft:birch_stairs";
  MinecraftBlockTypes2["BirchStandingSign"] = "minecraft:birch_standing_sign";
  MinecraftBlockTypes2["BirchTrapdoor"] = "minecraft:birch_trapdoor";
  MinecraftBlockTypes2["BirchWallSign"] = "minecraft:birch_wall_sign";
  MinecraftBlockTypes2["BirchWood"] = "minecraft:birch_wood";
  MinecraftBlockTypes2["BlackCandle"] = "minecraft:black_candle";
  MinecraftBlockTypes2["BlackCandleCake"] = "minecraft:black_candle_cake";
  MinecraftBlockTypes2["BlackCarpet"] = "minecraft:black_carpet";
  MinecraftBlockTypes2["BlackConcrete"] = "minecraft:black_concrete";
  MinecraftBlockTypes2["BlackConcretePowder"] = "minecraft:black_concrete_powder";
  MinecraftBlockTypes2["BlackGlazedTerracotta"] = "minecraft:black_glazed_terracotta";
  MinecraftBlockTypes2["BlackShulkerBox"] = "minecraft:black_shulker_box";
  MinecraftBlockTypes2["BlackStainedGlass"] = "minecraft:black_stained_glass";
  MinecraftBlockTypes2["BlackStainedGlassPane"] = "minecraft:black_stained_glass_pane";
  MinecraftBlockTypes2["BlackTerracotta"] = "minecraft:black_terracotta";
  MinecraftBlockTypes2["BlackWool"] = "minecraft:black_wool";
  MinecraftBlockTypes2["Blackstone"] = "minecraft:blackstone";
  MinecraftBlockTypes2["BlackstoneDoubleSlab"] = "minecraft:blackstone_double_slab";
  MinecraftBlockTypes2["BlackstoneSlab"] = "minecraft:blackstone_slab";
  MinecraftBlockTypes2["BlackstoneStairs"] = "minecraft:blackstone_stairs";
  MinecraftBlockTypes2["BlackstoneWall"] = "minecraft:blackstone_wall";
  MinecraftBlockTypes2["BlastFurnace"] = "minecraft:blast_furnace";
  MinecraftBlockTypes2["BlueCandle"] = "minecraft:blue_candle";
  MinecraftBlockTypes2["BlueCandleCake"] = "minecraft:blue_candle_cake";
  MinecraftBlockTypes2["BlueCarpet"] = "minecraft:blue_carpet";
  MinecraftBlockTypes2["BlueConcrete"] = "minecraft:blue_concrete";
  MinecraftBlockTypes2["BlueConcretePowder"] = "minecraft:blue_concrete_powder";
  MinecraftBlockTypes2["BlueGlazedTerracotta"] = "minecraft:blue_glazed_terracotta";
  MinecraftBlockTypes2["BlueIce"] = "minecraft:blue_ice";
  MinecraftBlockTypes2["BlueOrchid"] = "minecraft:blue_orchid";
  MinecraftBlockTypes2["BlueShulkerBox"] = "minecraft:blue_shulker_box";
  MinecraftBlockTypes2["BlueStainedGlass"] = "minecraft:blue_stained_glass";
  MinecraftBlockTypes2["BlueStainedGlassPane"] = "minecraft:blue_stained_glass_pane";
  MinecraftBlockTypes2["BlueTerracotta"] = "minecraft:blue_terracotta";
  MinecraftBlockTypes2["BlueWool"] = "minecraft:blue_wool";
  MinecraftBlockTypes2["BoneBlock"] = "minecraft:bone_block";
  MinecraftBlockTypes2["Bookshelf"] = "minecraft:bookshelf";
  MinecraftBlockTypes2["BorderBlock"] = "minecraft:border_block";
  MinecraftBlockTypes2["BrainCoral"] = "minecraft:brain_coral";
  MinecraftBlockTypes2["BrainCoralBlock"] = "minecraft:brain_coral_block";
  MinecraftBlockTypes2["BrainCoralFan"] = "minecraft:brain_coral_fan";
  MinecraftBlockTypes2["BrainCoralWallFan"] = "minecraft:brain_coral_wall_fan";
  MinecraftBlockTypes2["BrewingStand"] = "minecraft:brewing_stand";
  MinecraftBlockTypes2["BrickBlock"] = "minecraft:brick_block";
  MinecraftBlockTypes2["BrickDoubleSlab"] = "minecraft:brick_double_slab";
  MinecraftBlockTypes2["BrickSlab"] = "minecraft:brick_slab";
  MinecraftBlockTypes2["BrickStairs"] = "minecraft:brick_stairs";
  MinecraftBlockTypes2["BrickWall"] = "minecraft:brick_wall";
  MinecraftBlockTypes2["BrownCandle"] = "minecraft:brown_candle";
  MinecraftBlockTypes2["BrownCandleCake"] = "minecraft:brown_candle_cake";
  MinecraftBlockTypes2["BrownCarpet"] = "minecraft:brown_carpet";
  MinecraftBlockTypes2["BrownConcrete"] = "minecraft:brown_concrete";
  MinecraftBlockTypes2["BrownConcretePowder"] = "minecraft:brown_concrete_powder";
  MinecraftBlockTypes2["BrownGlazedTerracotta"] = "minecraft:brown_glazed_terracotta";
  MinecraftBlockTypes2["BrownMushroom"] = "minecraft:brown_mushroom";
  MinecraftBlockTypes2["BrownMushroomBlock"] = "minecraft:brown_mushroom_block";
  MinecraftBlockTypes2["BrownShulkerBox"] = "minecraft:brown_shulker_box";
  MinecraftBlockTypes2["BrownStainedGlass"] = "minecraft:brown_stained_glass";
  MinecraftBlockTypes2["BrownStainedGlassPane"] = "minecraft:brown_stained_glass_pane";
  MinecraftBlockTypes2["BrownTerracotta"] = "minecraft:brown_terracotta";
  MinecraftBlockTypes2["BrownWool"] = "minecraft:brown_wool";
  MinecraftBlockTypes2["BubbleColumn"] = "minecraft:bubble_column";
  MinecraftBlockTypes2["BubbleCoral"] = "minecraft:bubble_coral";
  MinecraftBlockTypes2["BubbleCoralBlock"] = "minecraft:bubble_coral_block";
  MinecraftBlockTypes2["BubbleCoralFan"] = "minecraft:bubble_coral_fan";
  MinecraftBlockTypes2["BubbleCoralWallFan"] = "minecraft:bubble_coral_wall_fan";
  MinecraftBlockTypes2["BuddingAmethyst"] = "minecraft:budding_amethyst";
  MinecraftBlockTypes2["Bush"] = "minecraft:bush";
  MinecraftBlockTypes2["Cactus"] = "minecraft:cactus";
  MinecraftBlockTypes2["CactusFlower"] = "minecraft:cactus_flower";
  MinecraftBlockTypes2["Cake"] = "minecraft:cake";
  MinecraftBlockTypes2["Calcite"] = "minecraft:calcite";
  MinecraftBlockTypes2["CalibratedSculkSensor"] = "minecraft:calibrated_sculk_sensor";
  MinecraftBlockTypes2["Camera"] = "minecraft:camera";
  MinecraftBlockTypes2["Campfire"] = "minecraft:campfire";
  MinecraftBlockTypes2["Candle"] = "minecraft:candle";
  MinecraftBlockTypes2["CandleCake"] = "minecraft:candle_cake";
  MinecraftBlockTypes2["Carrots"] = "minecraft:carrots";
  MinecraftBlockTypes2["CartographyTable"] = "minecraft:cartography_table";
  MinecraftBlockTypes2["CarvedPumpkin"] = "minecraft:carved_pumpkin";
  MinecraftBlockTypes2["Cauldron"] = "minecraft:cauldron";
  MinecraftBlockTypes2["CaveVines"] = "minecraft:cave_vines";
  MinecraftBlockTypes2["CaveVinesBodyWithBerries"] = "minecraft:cave_vines_body_with_berries";
  MinecraftBlockTypes2["CaveVinesHeadWithBerries"] = "minecraft:cave_vines_head_with_berries";
  MinecraftBlockTypes2["ChainCommandBlock"] = "minecraft:chain_command_block";
  MinecraftBlockTypes2["ChemicalHeat"] = "minecraft:chemical_heat";
  MinecraftBlockTypes2["CherryButton"] = "minecraft:cherry_button";
  MinecraftBlockTypes2["CherryDoor"] = "minecraft:cherry_door";
  MinecraftBlockTypes2["CherryDoubleSlab"] = "minecraft:cherry_double_slab";
  MinecraftBlockTypes2["CherryFence"] = "minecraft:cherry_fence";
  MinecraftBlockTypes2["CherryFenceGate"] = "minecraft:cherry_fence_gate";
  MinecraftBlockTypes2["CherryHangingSign"] = "minecraft:cherry_hanging_sign";
  MinecraftBlockTypes2["CherryLeaves"] = "minecraft:cherry_leaves";
  MinecraftBlockTypes2["CherryLog"] = "minecraft:cherry_log";
  MinecraftBlockTypes2["CherryPlanks"] = "minecraft:cherry_planks";
  MinecraftBlockTypes2["CherryPressurePlate"] = "minecraft:cherry_pressure_plate";
  MinecraftBlockTypes2["CherrySapling"] = "minecraft:cherry_sapling";
  MinecraftBlockTypes2["CherryShelf"] = "minecraft:cherry_shelf";
  MinecraftBlockTypes2["CherrySlab"] = "minecraft:cherry_slab";
  MinecraftBlockTypes2["CherryStairs"] = "minecraft:cherry_stairs";
  MinecraftBlockTypes2["CherryStandingSign"] = "minecraft:cherry_standing_sign";
  MinecraftBlockTypes2["CherryTrapdoor"] = "minecraft:cherry_trapdoor";
  MinecraftBlockTypes2["CherryWallSign"] = "minecraft:cherry_wall_sign";
  MinecraftBlockTypes2["CherryWood"] = "minecraft:cherry_wood";
  MinecraftBlockTypes2["Chest"] = "minecraft:chest";
  MinecraftBlockTypes2["ChippedAnvil"] = "minecraft:chipped_anvil";
  MinecraftBlockTypes2["ChiseledBookshelf"] = "minecraft:chiseled_bookshelf";
  MinecraftBlockTypes2["ChiseledCopper"] = "minecraft:chiseled_copper";
  MinecraftBlockTypes2["ChiseledDeepslate"] = "minecraft:chiseled_deepslate";
  MinecraftBlockTypes2["ChiseledNetherBricks"] = "minecraft:chiseled_nether_bricks";
  MinecraftBlockTypes2["ChiseledPolishedBlackstone"] = "minecraft:chiseled_polished_blackstone";
  MinecraftBlockTypes2["ChiseledQuartzBlock"] = "minecraft:chiseled_quartz_block";
  MinecraftBlockTypes2["ChiseledRedSandstone"] = "minecraft:chiseled_red_sandstone";
  MinecraftBlockTypes2["ChiseledResinBricks"] = "minecraft:chiseled_resin_bricks";
  MinecraftBlockTypes2["ChiseledSandstone"] = "minecraft:chiseled_sandstone";
  MinecraftBlockTypes2["ChiseledStoneBricks"] = "minecraft:chiseled_stone_bricks";
  MinecraftBlockTypes2["ChiseledTuff"] = "minecraft:chiseled_tuff";
  MinecraftBlockTypes2["ChiseledTuffBricks"] = "minecraft:chiseled_tuff_bricks";
  MinecraftBlockTypes2["ChorusFlower"] = "minecraft:chorus_flower";
  MinecraftBlockTypes2["ChorusPlant"] = "minecraft:chorus_plant";
  MinecraftBlockTypes2["Clay"] = "minecraft:clay";
  MinecraftBlockTypes2["ClosedEyeblossom"] = "minecraft:closed_eyeblossom";
  MinecraftBlockTypes2["CoalBlock"] = "minecraft:coal_block";
  MinecraftBlockTypes2["CoalOre"] = "minecraft:coal_ore";
  MinecraftBlockTypes2["CoarseDirt"] = "minecraft:coarse_dirt";
  MinecraftBlockTypes2["CobbledDeepslate"] = "minecraft:cobbled_deepslate";
  MinecraftBlockTypes2["CobbledDeepslateDoubleSlab"] = "minecraft:cobbled_deepslate_double_slab";
  MinecraftBlockTypes2["CobbledDeepslateSlab"] = "minecraft:cobbled_deepslate_slab";
  MinecraftBlockTypes2["CobbledDeepslateStairs"] = "minecraft:cobbled_deepslate_stairs";
  MinecraftBlockTypes2["CobbledDeepslateWall"] = "minecraft:cobbled_deepslate_wall";
  MinecraftBlockTypes2["Cobblestone"] = "minecraft:cobblestone";
  MinecraftBlockTypes2["CobblestoneDoubleSlab"] = "minecraft:cobblestone_double_slab";
  MinecraftBlockTypes2["CobblestoneSlab"] = "minecraft:cobblestone_slab";
  MinecraftBlockTypes2["CobblestoneWall"] = "minecraft:cobblestone_wall";
  MinecraftBlockTypes2["Cocoa"] = "minecraft:cocoa";
  MinecraftBlockTypes2["ColoredTorchBlue"] = "minecraft:colored_torch_blue";
  MinecraftBlockTypes2["ColoredTorchGreen"] = "minecraft:colored_torch_green";
  MinecraftBlockTypes2["ColoredTorchPurple"] = "minecraft:colored_torch_purple";
  MinecraftBlockTypes2["ColoredTorchRed"] = "minecraft:colored_torch_red";
  MinecraftBlockTypes2["CommandBlock"] = "minecraft:command_block";
  MinecraftBlockTypes2["Composter"] = "minecraft:composter";
  MinecraftBlockTypes2["CompoundCreator"] = "minecraft:compound_creator";
  MinecraftBlockTypes2["Conduit"] = "minecraft:conduit";
  MinecraftBlockTypes2["CopperBars"] = "minecraft:copper_bars";
  MinecraftBlockTypes2["CopperBlock"] = "minecraft:copper_block";
  MinecraftBlockTypes2["CopperBulb"] = "minecraft:copper_bulb";
  MinecraftBlockTypes2["CopperChain"] = "minecraft:copper_chain";
  MinecraftBlockTypes2["CopperChest"] = "minecraft:copper_chest";
  MinecraftBlockTypes2["CopperDoor"] = "minecraft:copper_door";
  MinecraftBlockTypes2["CopperGolemStatue"] = "minecraft:copper_golem_statue";
  MinecraftBlockTypes2["CopperGrate"] = "minecraft:copper_grate";
  MinecraftBlockTypes2["CopperLantern"] = "minecraft:copper_lantern";
  MinecraftBlockTypes2["CopperOre"] = "minecraft:copper_ore";
  MinecraftBlockTypes2["CopperTorch"] = "minecraft:copper_torch";
  MinecraftBlockTypes2["CopperTrapdoor"] = "minecraft:copper_trapdoor";
  MinecraftBlockTypes2["Cornflower"] = "minecraft:cornflower";
  MinecraftBlockTypes2["CrackedDeepslateBricks"] = "minecraft:cracked_deepslate_bricks";
  MinecraftBlockTypes2["CrackedDeepslateTiles"] = "minecraft:cracked_deepslate_tiles";
  MinecraftBlockTypes2["CrackedNetherBricks"] = "minecraft:cracked_nether_bricks";
  MinecraftBlockTypes2["CrackedPolishedBlackstoneBricks"] = "minecraft:cracked_polished_blackstone_bricks";
  MinecraftBlockTypes2["CrackedStoneBricks"] = "minecraft:cracked_stone_bricks";
  MinecraftBlockTypes2["Crafter"] = "minecraft:crafter";
  MinecraftBlockTypes2["CraftingTable"] = "minecraft:crafting_table";
  MinecraftBlockTypes2["CreakingHeart"] = "minecraft:creaking_heart";
  MinecraftBlockTypes2["CreeperHead"] = "minecraft:creeper_head";
  MinecraftBlockTypes2["CrimsonButton"] = "minecraft:crimson_button";
  MinecraftBlockTypes2["CrimsonDoor"] = "minecraft:crimson_door";
  MinecraftBlockTypes2["CrimsonDoubleSlab"] = "minecraft:crimson_double_slab";
  MinecraftBlockTypes2["CrimsonFence"] = "minecraft:crimson_fence";
  MinecraftBlockTypes2["CrimsonFenceGate"] = "minecraft:crimson_fence_gate";
  MinecraftBlockTypes2["CrimsonFungus"] = "minecraft:crimson_fungus";
  MinecraftBlockTypes2["CrimsonHangingSign"] = "minecraft:crimson_hanging_sign";
  MinecraftBlockTypes2["CrimsonHyphae"] = "minecraft:crimson_hyphae";
  MinecraftBlockTypes2["CrimsonNylium"] = "minecraft:crimson_nylium";
  MinecraftBlockTypes2["CrimsonPlanks"] = "minecraft:crimson_planks";
  MinecraftBlockTypes2["CrimsonPressurePlate"] = "minecraft:crimson_pressure_plate";
  MinecraftBlockTypes2["CrimsonRoots"] = "minecraft:crimson_roots";
  MinecraftBlockTypes2["CrimsonShelf"] = "minecraft:crimson_shelf";
  MinecraftBlockTypes2["CrimsonSlab"] = "minecraft:crimson_slab";
  MinecraftBlockTypes2["CrimsonStairs"] = "minecraft:crimson_stairs";
  MinecraftBlockTypes2["CrimsonStandingSign"] = "minecraft:crimson_standing_sign";
  MinecraftBlockTypes2["CrimsonStem"] = "minecraft:crimson_stem";
  MinecraftBlockTypes2["CrimsonTrapdoor"] = "minecraft:crimson_trapdoor";
  MinecraftBlockTypes2["CrimsonWallSign"] = "minecraft:crimson_wall_sign";
  MinecraftBlockTypes2["CryingObsidian"] = "minecraft:crying_obsidian";
  MinecraftBlockTypes2["CutCopper"] = "minecraft:cut_copper";
  MinecraftBlockTypes2["CutCopperSlab"] = "minecraft:cut_copper_slab";
  MinecraftBlockTypes2["CutCopperStairs"] = "minecraft:cut_copper_stairs";
  MinecraftBlockTypes2["CutRedSandstone"] = "minecraft:cut_red_sandstone";
  MinecraftBlockTypes2["CutRedSandstoneDoubleSlab"] = "minecraft:cut_red_sandstone_double_slab";
  MinecraftBlockTypes2["CutRedSandstoneSlab"] = "minecraft:cut_red_sandstone_slab";
  MinecraftBlockTypes2["CutSandstone"] = "minecraft:cut_sandstone";
  MinecraftBlockTypes2["CutSandstoneDoubleSlab"] = "minecraft:cut_sandstone_double_slab";
  MinecraftBlockTypes2["CutSandstoneSlab"] = "minecraft:cut_sandstone_slab";
  MinecraftBlockTypes2["CyanCandle"] = "minecraft:cyan_candle";
  MinecraftBlockTypes2["CyanCandleCake"] = "minecraft:cyan_candle_cake";
  MinecraftBlockTypes2["CyanCarpet"] = "minecraft:cyan_carpet";
  MinecraftBlockTypes2["CyanConcrete"] = "minecraft:cyan_concrete";
  MinecraftBlockTypes2["CyanConcretePowder"] = "minecraft:cyan_concrete_powder";
  MinecraftBlockTypes2["CyanGlazedTerracotta"] = "minecraft:cyan_glazed_terracotta";
  MinecraftBlockTypes2["CyanShulkerBox"] = "minecraft:cyan_shulker_box";
  MinecraftBlockTypes2["CyanStainedGlass"] = "minecraft:cyan_stained_glass";
  MinecraftBlockTypes2["CyanStainedGlassPane"] = "minecraft:cyan_stained_glass_pane";
  MinecraftBlockTypes2["CyanTerracotta"] = "minecraft:cyan_terracotta";
  MinecraftBlockTypes2["CyanWool"] = "minecraft:cyan_wool";
  MinecraftBlockTypes2["DamagedAnvil"] = "minecraft:damaged_anvil";
  MinecraftBlockTypes2["Dandelion"] = "minecraft:dandelion";
  MinecraftBlockTypes2["DarkOakButton"] = "minecraft:dark_oak_button";
  MinecraftBlockTypes2["DarkOakDoor"] = "minecraft:dark_oak_door";
  MinecraftBlockTypes2["DarkOakDoubleSlab"] = "minecraft:dark_oak_double_slab";
  MinecraftBlockTypes2["DarkOakFence"] = "minecraft:dark_oak_fence";
  MinecraftBlockTypes2["DarkOakFenceGate"] = "minecraft:dark_oak_fence_gate";
  MinecraftBlockTypes2["DarkOakHangingSign"] = "minecraft:dark_oak_hanging_sign";
  MinecraftBlockTypes2["DarkOakLeaves"] = "minecraft:dark_oak_leaves";
  MinecraftBlockTypes2["DarkOakLog"] = "minecraft:dark_oak_log";
  MinecraftBlockTypes2["DarkOakPlanks"] = "minecraft:dark_oak_planks";
  MinecraftBlockTypes2["DarkOakPressurePlate"] = "minecraft:dark_oak_pressure_plate";
  MinecraftBlockTypes2["DarkOakSapling"] = "minecraft:dark_oak_sapling";
  MinecraftBlockTypes2["DarkOakShelf"] = "minecraft:dark_oak_shelf";
  MinecraftBlockTypes2["DarkOakSlab"] = "minecraft:dark_oak_slab";
  MinecraftBlockTypes2["DarkOakStairs"] = "minecraft:dark_oak_stairs";
  MinecraftBlockTypes2["DarkOakTrapdoor"] = "minecraft:dark_oak_trapdoor";
  MinecraftBlockTypes2["DarkOakWood"] = "minecraft:dark_oak_wood";
  MinecraftBlockTypes2["DarkPrismarine"] = "minecraft:dark_prismarine";
  MinecraftBlockTypes2["DarkPrismarineDoubleSlab"] = "minecraft:dark_prismarine_double_slab";
  MinecraftBlockTypes2["DarkPrismarineSlab"] = "minecraft:dark_prismarine_slab";
  MinecraftBlockTypes2["DarkPrismarineStairs"] = "minecraft:dark_prismarine_stairs";
  MinecraftBlockTypes2["DarkoakStandingSign"] = "minecraft:darkoak_standing_sign";
  MinecraftBlockTypes2["DarkoakWallSign"] = "minecraft:darkoak_wall_sign";
  MinecraftBlockTypes2["DaylightDetector"] = "minecraft:daylight_detector";
  MinecraftBlockTypes2["DaylightDetectorInverted"] = "minecraft:daylight_detector_inverted";
  MinecraftBlockTypes2["DeadBrainCoral"] = "minecraft:dead_brain_coral";
  MinecraftBlockTypes2["DeadBrainCoralBlock"] = "minecraft:dead_brain_coral_block";
  MinecraftBlockTypes2["DeadBrainCoralFan"] = "minecraft:dead_brain_coral_fan";
  MinecraftBlockTypes2["DeadBrainCoralWallFan"] = "minecraft:dead_brain_coral_wall_fan";
  MinecraftBlockTypes2["DeadBubbleCoral"] = "minecraft:dead_bubble_coral";
  MinecraftBlockTypes2["DeadBubbleCoralBlock"] = "minecraft:dead_bubble_coral_block";
  MinecraftBlockTypes2["DeadBubbleCoralFan"] = "minecraft:dead_bubble_coral_fan";
  MinecraftBlockTypes2["DeadBubbleCoralWallFan"] = "minecraft:dead_bubble_coral_wall_fan";
  MinecraftBlockTypes2["DeadFireCoral"] = "minecraft:dead_fire_coral";
  MinecraftBlockTypes2["DeadFireCoralBlock"] = "minecraft:dead_fire_coral_block";
  MinecraftBlockTypes2["DeadFireCoralFan"] = "minecraft:dead_fire_coral_fan";
  MinecraftBlockTypes2["DeadFireCoralWallFan"] = "minecraft:dead_fire_coral_wall_fan";
  MinecraftBlockTypes2["DeadHornCoral"] = "minecraft:dead_horn_coral";
  MinecraftBlockTypes2["DeadHornCoralBlock"] = "minecraft:dead_horn_coral_block";
  MinecraftBlockTypes2["DeadHornCoralFan"] = "minecraft:dead_horn_coral_fan";
  MinecraftBlockTypes2["DeadHornCoralWallFan"] = "minecraft:dead_horn_coral_wall_fan";
  MinecraftBlockTypes2["DeadTubeCoral"] = "minecraft:dead_tube_coral";
  MinecraftBlockTypes2["DeadTubeCoralBlock"] = "minecraft:dead_tube_coral_block";
  MinecraftBlockTypes2["DeadTubeCoralFan"] = "minecraft:dead_tube_coral_fan";
  MinecraftBlockTypes2["DeadTubeCoralWallFan"] = "minecraft:dead_tube_coral_wall_fan";
  MinecraftBlockTypes2["Deadbush"] = "minecraft:deadbush";
  MinecraftBlockTypes2["DecoratedPot"] = "minecraft:decorated_pot";
  MinecraftBlockTypes2["Deepslate"] = "minecraft:deepslate";
  MinecraftBlockTypes2["DeepslateBrickDoubleSlab"] = "minecraft:deepslate_brick_double_slab";
  MinecraftBlockTypes2["DeepslateBrickSlab"] = "minecraft:deepslate_brick_slab";
  MinecraftBlockTypes2["DeepslateBrickStairs"] = "minecraft:deepslate_brick_stairs";
  MinecraftBlockTypes2["DeepslateBrickWall"] = "minecraft:deepslate_brick_wall";
  MinecraftBlockTypes2["DeepslateBricks"] = "minecraft:deepslate_bricks";
  MinecraftBlockTypes2["DeepslateCoalOre"] = "minecraft:deepslate_coal_ore";
  MinecraftBlockTypes2["DeepslateCopperOre"] = "minecraft:deepslate_copper_ore";
  MinecraftBlockTypes2["DeepslateDiamondOre"] = "minecraft:deepslate_diamond_ore";
  MinecraftBlockTypes2["DeepslateEmeraldOre"] = "minecraft:deepslate_emerald_ore";
  MinecraftBlockTypes2["DeepslateGoldOre"] = "minecraft:deepslate_gold_ore";
  MinecraftBlockTypes2["DeepslateIronOre"] = "minecraft:deepslate_iron_ore";
  MinecraftBlockTypes2["DeepslateLapisOre"] = "minecraft:deepslate_lapis_ore";
  MinecraftBlockTypes2["DeepslateRedstoneOre"] = "minecraft:deepslate_redstone_ore";
  MinecraftBlockTypes2["DeepslateTileDoubleSlab"] = "minecraft:deepslate_tile_double_slab";
  MinecraftBlockTypes2["DeepslateTileSlab"] = "minecraft:deepslate_tile_slab";
  MinecraftBlockTypes2["DeepslateTileStairs"] = "minecraft:deepslate_tile_stairs";
  MinecraftBlockTypes2["DeepslateTileWall"] = "minecraft:deepslate_tile_wall";
  MinecraftBlockTypes2["DeepslateTiles"] = "minecraft:deepslate_tiles";
  MinecraftBlockTypes2["Deny"] = "minecraft:deny";
  MinecraftBlockTypes2["DetectorRail"] = "minecraft:detector_rail";
  MinecraftBlockTypes2["DiamondBlock"] = "minecraft:diamond_block";
  MinecraftBlockTypes2["DiamondOre"] = "minecraft:diamond_ore";
  MinecraftBlockTypes2["Diorite"] = "minecraft:diorite";
  MinecraftBlockTypes2["DioriteDoubleSlab"] = "minecraft:diorite_double_slab";
  MinecraftBlockTypes2["DioriteSlab"] = "minecraft:diorite_slab";
  MinecraftBlockTypes2["DioriteStairs"] = "minecraft:diorite_stairs";
  MinecraftBlockTypes2["DioriteWall"] = "minecraft:diorite_wall";
  MinecraftBlockTypes2["Dirt"] = "minecraft:dirt";
  MinecraftBlockTypes2["DirtWithRoots"] = "minecraft:dirt_with_roots";
  MinecraftBlockTypes2["Dispenser"] = "minecraft:dispenser";
  MinecraftBlockTypes2["DoubleCutCopperSlab"] = "minecraft:double_cut_copper_slab";
  MinecraftBlockTypes2["DragonEgg"] = "minecraft:dragon_egg";
  MinecraftBlockTypes2["DragonHead"] = "minecraft:dragon_head";
  MinecraftBlockTypes2["DriedGhast"] = "minecraft:dried_ghast";
  MinecraftBlockTypes2["DriedKelpBlock"] = "minecraft:dried_kelp_block";
  MinecraftBlockTypes2["DripstoneBlock"] = "minecraft:dripstone_block";
  MinecraftBlockTypes2["Dropper"] = "minecraft:dropper";
  MinecraftBlockTypes2["Element0"] = "minecraft:element_0";
  MinecraftBlockTypes2["Element1"] = "minecraft:element_1";
  MinecraftBlockTypes2["Element10"] = "minecraft:element_10";
  MinecraftBlockTypes2["Element100"] = "minecraft:element_100";
  MinecraftBlockTypes2["Element101"] = "minecraft:element_101";
  MinecraftBlockTypes2["Element102"] = "minecraft:element_102";
  MinecraftBlockTypes2["Element103"] = "minecraft:element_103";
  MinecraftBlockTypes2["Element104"] = "minecraft:element_104";
  MinecraftBlockTypes2["Element105"] = "minecraft:element_105";
  MinecraftBlockTypes2["Element106"] = "minecraft:element_106";
  MinecraftBlockTypes2["Element107"] = "minecraft:element_107";
  MinecraftBlockTypes2["Element108"] = "minecraft:element_108";
  MinecraftBlockTypes2["Element109"] = "minecraft:element_109";
  MinecraftBlockTypes2["Element11"] = "minecraft:element_11";
  MinecraftBlockTypes2["Element110"] = "minecraft:element_110";
  MinecraftBlockTypes2["Element111"] = "minecraft:element_111";
  MinecraftBlockTypes2["Element112"] = "minecraft:element_112";
  MinecraftBlockTypes2["Element113"] = "minecraft:element_113";
  MinecraftBlockTypes2["Element114"] = "minecraft:element_114";
  MinecraftBlockTypes2["Element115"] = "minecraft:element_115";
  MinecraftBlockTypes2["Element116"] = "minecraft:element_116";
  MinecraftBlockTypes2["Element117"] = "minecraft:element_117";
  MinecraftBlockTypes2["Element118"] = "minecraft:element_118";
  MinecraftBlockTypes2["Element12"] = "minecraft:element_12";
  MinecraftBlockTypes2["Element13"] = "minecraft:element_13";
  MinecraftBlockTypes2["Element14"] = "minecraft:element_14";
  MinecraftBlockTypes2["Element15"] = "minecraft:element_15";
  MinecraftBlockTypes2["Element16"] = "minecraft:element_16";
  MinecraftBlockTypes2["Element17"] = "minecraft:element_17";
  MinecraftBlockTypes2["Element18"] = "minecraft:element_18";
  MinecraftBlockTypes2["Element19"] = "minecraft:element_19";
  MinecraftBlockTypes2["Element2"] = "minecraft:element_2";
  MinecraftBlockTypes2["Element20"] = "minecraft:element_20";
  MinecraftBlockTypes2["Element21"] = "minecraft:element_21";
  MinecraftBlockTypes2["Element22"] = "minecraft:element_22";
  MinecraftBlockTypes2["Element23"] = "minecraft:element_23";
  MinecraftBlockTypes2["Element24"] = "minecraft:element_24";
  MinecraftBlockTypes2["Element25"] = "minecraft:element_25";
  MinecraftBlockTypes2["Element26"] = "minecraft:element_26";
  MinecraftBlockTypes2["Element27"] = "minecraft:element_27";
  MinecraftBlockTypes2["Element28"] = "minecraft:element_28";
  MinecraftBlockTypes2["Element29"] = "minecraft:element_29";
  MinecraftBlockTypes2["Element3"] = "minecraft:element_3";
  MinecraftBlockTypes2["Element30"] = "minecraft:element_30";
  MinecraftBlockTypes2["Element31"] = "minecraft:element_31";
  MinecraftBlockTypes2["Element32"] = "minecraft:element_32";
  MinecraftBlockTypes2["Element33"] = "minecraft:element_33";
  MinecraftBlockTypes2["Element34"] = "minecraft:element_34";
  MinecraftBlockTypes2["Element35"] = "minecraft:element_35";
  MinecraftBlockTypes2["Element36"] = "minecraft:element_36";
  MinecraftBlockTypes2["Element37"] = "minecraft:element_37";
  MinecraftBlockTypes2["Element38"] = "minecraft:element_38";
  MinecraftBlockTypes2["Element39"] = "minecraft:element_39";
  MinecraftBlockTypes2["Element4"] = "minecraft:element_4";
  MinecraftBlockTypes2["Element40"] = "minecraft:element_40";
  MinecraftBlockTypes2["Element41"] = "minecraft:element_41";
  MinecraftBlockTypes2["Element42"] = "minecraft:element_42";
  MinecraftBlockTypes2["Element43"] = "minecraft:element_43";
  MinecraftBlockTypes2["Element44"] = "minecraft:element_44";
  MinecraftBlockTypes2["Element45"] = "minecraft:element_45";
  MinecraftBlockTypes2["Element46"] = "minecraft:element_46";
  MinecraftBlockTypes2["Element47"] = "minecraft:element_47";
  MinecraftBlockTypes2["Element48"] = "minecraft:element_48";
  MinecraftBlockTypes2["Element49"] = "minecraft:element_49";
  MinecraftBlockTypes2["Element5"] = "minecraft:element_5";
  MinecraftBlockTypes2["Element50"] = "minecraft:element_50";
  MinecraftBlockTypes2["Element51"] = "minecraft:element_51";
  MinecraftBlockTypes2["Element52"] = "minecraft:element_52";
  MinecraftBlockTypes2["Element53"] = "minecraft:element_53";
  MinecraftBlockTypes2["Element54"] = "minecraft:element_54";
  MinecraftBlockTypes2["Element55"] = "minecraft:element_55";
  MinecraftBlockTypes2["Element56"] = "minecraft:element_56";
  MinecraftBlockTypes2["Element57"] = "minecraft:element_57";
  MinecraftBlockTypes2["Element58"] = "minecraft:element_58";
  MinecraftBlockTypes2["Element59"] = "minecraft:element_59";
  MinecraftBlockTypes2["Element6"] = "minecraft:element_6";
  MinecraftBlockTypes2["Element60"] = "minecraft:element_60";
  MinecraftBlockTypes2["Element61"] = "minecraft:element_61";
  MinecraftBlockTypes2["Element62"] = "minecraft:element_62";
  MinecraftBlockTypes2["Element63"] = "minecraft:element_63";
  MinecraftBlockTypes2["Element64"] = "minecraft:element_64";
  MinecraftBlockTypes2["Element65"] = "minecraft:element_65";
  MinecraftBlockTypes2["Element66"] = "minecraft:element_66";
  MinecraftBlockTypes2["Element67"] = "minecraft:element_67";
  MinecraftBlockTypes2["Element68"] = "minecraft:element_68";
  MinecraftBlockTypes2["Element69"] = "minecraft:element_69";
  MinecraftBlockTypes2["Element7"] = "minecraft:element_7";
  MinecraftBlockTypes2["Element70"] = "minecraft:element_70";
  MinecraftBlockTypes2["Element71"] = "minecraft:element_71";
  MinecraftBlockTypes2["Element72"] = "minecraft:element_72";
  MinecraftBlockTypes2["Element73"] = "minecraft:element_73";
  MinecraftBlockTypes2["Element74"] = "minecraft:element_74";
  MinecraftBlockTypes2["Element75"] = "minecraft:element_75";
  MinecraftBlockTypes2["Element76"] = "minecraft:element_76";
  MinecraftBlockTypes2["Element77"] = "minecraft:element_77";
  MinecraftBlockTypes2["Element78"] = "minecraft:element_78";
  MinecraftBlockTypes2["Element79"] = "minecraft:element_79";
  MinecraftBlockTypes2["Element8"] = "minecraft:element_8";
  MinecraftBlockTypes2["Element80"] = "minecraft:element_80";
  MinecraftBlockTypes2["Element81"] = "minecraft:element_81";
  MinecraftBlockTypes2["Element82"] = "minecraft:element_82";
  MinecraftBlockTypes2["Element83"] = "minecraft:element_83";
  MinecraftBlockTypes2["Element84"] = "minecraft:element_84";
  MinecraftBlockTypes2["Element85"] = "minecraft:element_85";
  MinecraftBlockTypes2["Element86"] = "minecraft:element_86";
  MinecraftBlockTypes2["Element87"] = "minecraft:element_87";
  MinecraftBlockTypes2["Element88"] = "minecraft:element_88";
  MinecraftBlockTypes2["Element89"] = "minecraft:element_89";
  MinecraftBlockTypes2["Element9"] = "minecraft:element_9";
  MinecraftBlockTypes2["Element90"] = "minecraft:element_90";
  MinecraftBlockTypes2["Element91"] = "minecraft:element_91";
  MinecraftBlockTypes2["Element92"] = "minecraft:element_92";
  MinecraftBlockTypes2["Element93"] = "minecraft:element_93";
  MinecraftBlockTypes2["Element94"] = "minecraft:element_94";
  MinecraftBlockTypes2["Element95"] = "minecraft:element_95";
  MinecraftBlockTypes2["Element96"] = "minecraft:element_96";
  MinecraftBlockTypes2["Element97"] = "minecraft:element_97";
  MinecraftBlockTypes2["Element98"] = "minecraft:element_98";
  MinecraftBlockTypes2["Element99"] = "minecraft:element_99";
  MinecraftBlockTypes2["ElementConstructor"] = "minecraft:element_constructor";
  MinecraftBlockTypes2["EmeraldBlock"] = "minecraft:emerald_block";
  MinecraftBlockTypes2["EmeraldOre"] = "minecraft:emerald_ore";
  MinecraftBlockTypes2["EnchantingTable"] = "minecraft:enchanting_table";
  MinecraftBlockTypes2["EndBrickStairs"] = "minecraft:end_brick_stairs";
  MinecraftBlockTypes2["EndBricks"] = "minecraft:end_bricks";
  MinecraftBlockTypes2["EndPortal"] = "minecraft:end_portal";
  MinecraftBlockTypes2["EndPortalFrame"] = "minecraft:end_portal_frame";
  MinecraftBlockTypes2["EndRod"] = "minecraft:end_rod";
  MinecraftBlockTypes2["EndStone"] = "minecraft:end_stone";
  MinecraftBlockTypes2["EndStoneBrickDoubleSlab"] = "minecraft:end_stone_brick_double_slab";
  MinecraftBlockTypes2["EndStoneBrickSlab"] = "minecraft:end_stone_brick_slab";
  MinecraftBlockTypes2["EndStoneBrickWall"] = "minecraft:end_stone_brick_wall";
  MinecraftBlockTypes2["EnderChest"] = "minecraft:ender_chest";
  MinecraftBlockTypes2["ExposedChiseledCopper"] = "minecraft:exposed_chiseled_copper";
  MinecraftBlockTypes2["ExposedCopper"] = "minecraft:exposed_copper";
  MinecraftBlockTypes2["ExposedCopperBars"] = "minecraft:exposed_copper_bars";
  MinecraftBlockTypes2["ExposedCopperBulb"] = "minecraft:exposed_copper_bulb";
  MinecraftBlockTypes2["ExposedCopperChain"] = "minecraft:exposed_copper_chain";
  MinecraftBlockTypes2["ExposedCopperChest"] = "minecraft:exposed_copper_chest";
  MinecraftBlockTypes2["ExposedCopperDoor"] = "minecraft:exposed_copper_door";
  MinecraftBlockTypes2["ExposedCopperGolemStatue"] = "minecraft:exposed_copper_golem_statue";
  MinecraftBlockTypes2["ExposedCopperGrate"] = "minecraft:exposed_copper_grate";
  MinecraftBlockTypes2["ExposedCopperLantern"] = "minecraft:exposed_copper_lantern";
  MinecraftBlockTypes2["ExposedCopperTrapdoor"] = "minecraft:exposed_copper_trapdoor";
  MinecraftBlockTypes2["ExposedCutCopper"] = "minecraft:exposed_cut_copper";
  MinecraftBlockTypes2["ExposedCutCopperSlab"] = "minecraft:exposed_cut_copper_slab";
  MinecraftBlockTypes2["ExposedCutCopperStairs"] = "minecraft:exposed_cut_copper_stairs";
  MinecraftBlockTypes2["ExposedDoubleCutCopperSlab"] = "minecraft:exposed_double_cut_copper_slab";
  MinecraftBlockTypes2["ExposedLightningRod"] = "minecraft:exposed_lightning_rod";
  MinecraftBlockTypes2["Farmland"] = "minecraft:farmland";
  MinecraftBlockTypes2["FenceGate"] = "minecraft:fence_gate";
  MinecraftBlockTypes2["Fern"] = "minecraft:fern";
  MinecraftBlockTypes2["Fire"] = "minecraft:fire";
  MinecraftBlockTypes2["FireCoral"] = "minecraft:fire_coral";
  MinecraftBlockTypes2["FireCoralBlock"] = "minecraft:fire_coral_block";
  MinecraftBlockTypes2["FireCoralFan"] = "minecraft:fire_coral_fan";
  MinecraftBlockTypes2["FireCoralWallFan"] = "minecraft:fire_coral_wall_fan";
  MinecraftBlockTypes2["FireflyBush"] = "minecraft:firefly_bush";
  MinecraftBlockTypes2["FletchingTable"] = "minecraft:fletching_table";
  MinecraftBlockTypes2["FlowerPot"] = "minecraft:flower_pot";
  MinecraftBlockTypes2["FloweringAzalea"] = "minecraft:flowering_azalea";
  MinecraftBlockTypes2["FlowingLava"] = "minecraft:flowing_lava";
  MinecraftBlockTypes2["FlowingWater"] = "minecraft:flowing_water";
  MinecraftBlockTypes2["Frame"] = "minecraft:frame";
  MinecraftBlockTypes2["FrogSpawn"] = "minecraft:frog_spawn";
  MinecraftBlockTypes2["FrostedIce"] = "minecraft:frosted_ice";
  MinecraftBlockTypes2["Furnace"] = "minecraft:furnace";
  MinecraftBlockTypes2["GildedBlackstone"] = "minecraft:gilded_blackstone";
  MinecraftBlockTypes2["Glass"] = "minecraft:glass";
  MinecraftBlockTypes2["GlassPane"] = "minecraft:glass_pane";
  MinecraftBlockTypes2["GlowFrame"] = "minecraft:glow_frame";
  MinecraftBlockTypes2["GlowLichen"] = "minecraft:glow_lichen";
  MinecraftBlockTypes2["Glowstone"] = "minecraft:glowstone";
  MinecraftBlockTypes2["GoldBlock"] = "minecraft:gold_block";
  MinecraftBlockTypes2["GoldOre"] = "minecraft:gold_ore";
  MinecraftBlockTypes2["GoldenDandelion"] = "minecraft:golden_dandelion";
  MinecraftBlockTypes2["GoldenRail"] = "minecraft:golden_rail";
  MinecraftBlockTypes2["Granite"] = "minecraft:granite";
  MinecraftBlockTypes2["GraniteDoubleSlab"] = "minecraft:granite_double_slab";
  MinecraftBlockTypes2["GraniteSlab"] = "minecraft:granite_slab";
  MinecraftBlockTypes2["GraniteStairs"] = "minecraft:granite_stairs";
  MinecraftBlockTypes2["GraniteWall"] = "minecraft:granite_wall";
  MinecraftBlockTypes2["GrassBlock"] = "minecraft:grass_block";
  MinecraftBlockTypes2["GrassPath"] = "minecraft:grass_path";
  MinecraftBlockTypes2["Gravel"] = "minecraft:gravel";
  MinecraftBlockTypes2["GrayCandle"] = "minecraft:gray_candle";
  MinecraftBlockTypes2["GrayCandleCake"] = "minecraft:gray_candle_cake";
  MinecraftBlockTypes2["GrayCarpet"] = "minecraft:gray_carpet";
  MinecraftBlockTypes2["GrayConcrete"] = "minecraft:gray_concrete";
  MinecraftBlockTypes2["GrayConcretePowder"] = "minecraft:gray_concrete_powder";
  MinecraftBlockTypes2["GrayGlazedTerracotta"] = "minecraft:gray_glazed_terracotta";
  MinecraftBlockTypes2["GrayShulkerBox"] = "minecraft:gray_shulker_box";
  MinecraftBlockTypes2["GrayStainedGlass"] = "minecraft:gray_stained_glass";
  MinecraftBlockTypes2["GrayStainedGlassPane"] = "minecraft:gray_stained_glass_pane";
  MinecraftBlockTypes2["GrayTerracotta"] = "minecraft:gray_terracotta";
  MinecraftBlockTypes2["GrayWool"] = "minecraft:gray_wool";
  MinecraftBlockTypes2["GreenCandle"] = "minecraft:green_candle";
  MinecraftBlockTypes2["GreenCandleCake"] = "minecraft:green_candle_cake";
  MinecraftBlockTypes2["GreenCarpet"] = "minecraft:green_carpet";
  MinecraftBlockTypes2["GreenConcrete"] = "minecraft:green_concrete";
  MinecraftBlockTypes2["GreenConcretePowder"] = "minecraft:green_concrete_powder";
  MinecraftBlockTypes2["GreenGlazedTerracotta"] = "minecraft:green_glazed_terracotta";
  MinecraftBlockTypes2["GreenShulkerBox"] = "minecraft:green_shulker_box";
  MinecraftBlockTypes2["GreenStainedGlass"] = "minecraft:green_stained_glass";
  MinecraftBlockTypes2["GreenStainedGlassPane"] = "minecraft:green_stained_glass_pane";
  MinecraftBlockTypes2["GreenTerracotta"] = "minecraft:green_terracotta";
  MinecraftBlockTypes2["GreenWool"] = "minecraft:green_wool";
  MinecraftBlockTypes2["Grindstone"] = "minecraft:grindstone";
  MinecraftBlockTypes2["HangingRoots"] = "minecraft:hanging_roots";
  MinecraftBlockTypes2["HardBlackStainedGlass"] = "minecraft:hard_black_stained_glass";
  MinecraftBlockTypes2["HardBlackStainedGlassPane"] = "minecraft:hard_black_stained_glass_pane";
  MinecraftBlockTypes2["HardBlueStainedGlass"] = "minecraft:hard_blue_stained_glass";
  MinecraftBlockTypes2["HardBlueStainedGlassPane"] = "minecraft:hard_blue_stained_glass_pane";
  MinecraftBlockTypes2["HardBrownStainedGlass"] = "minecraft:hard_brown_stained_glass";
  MinecraftBlockTypes2["HardBrownStainedGlassPane"] = "minecraft:hard_brown_stained_glass_pane";
  MinecraftBlockTypes2["HardCyanStainedGlass"] = "minecraft:hard_cyan_stained_glass";
  MinecraftBlockTypes2["HardCyanStainedGlassPane"] = "minecraft:hard_cyan_stained_glass_pane";
  MinecraftBlockTypes2["HardGlass"] = "minecraft:hard_glass";
  MinecraftBlockTypes2["HardGlassPane"] = "minecraft:hard_glass_pane";
  MinecraftBlockTypes2["HardGrayStainedGlass"] = "minecraft:hard_gray_stained_glass";
  MinecraftBlockTypes2["HardGrayStainedGlassPane"] = "minecraft:hard_gray_stained_glass_pane";
  MinecraftBlockTypes2["HardGreenStainedGlass"] = "minecraft:hard_green_stained_glass";
  MinecraftBlockTypes2["HardGreenStainedGlassPane"] = "minecraft:hard_green_stained_glass_pane";
  MinecraftBlockTypes2["HardLightBlueStainedGlass"] = "minecraft:hard_light_blue_stained_glass";
  MinecraftBlockTypes2["HardLightBlueStainedGlassPane"] = "minecraft:hard_light_blue_stained_glass_pane";
  MinecraftBlockTypes2["HardLightGrayStainedGlass"] = "minecraft:hard_light_gray_stained_glass";
  MinecraftBlockTypes2["HardLightGrayStainedGlassPane"] = "minecraft:hard_light_gray_stained_glass_pane";
  MinecraftBlockTypes2["HardLimeStainedGlass"] = "minecraft:hard_lime_stained_glass";
  MinecraftBlockTypes2["HardLimeStainedGlassPane"] = "minecraft:hard_lime_stained_glass_pane";
  MinecraftBlockTypes2["HardMagentaStainedGlass"] = "minecraft:hard_magenta_stained_glass";
  MinecraftBlockTypes2["HardMagentaStainedGlassPane"] = "minecraft:hard_magenta_stained_glass_pane";
  MinecraftBlockTypes2["HardOrangeStainedGlass"] = "minecraft:hard_orange_stained_glass";
  MinecraftBlockTypes2["HardOrangeStainedGlassPane"] = "minecraft:hard_orange_stained_glass_pane";
  MinecraftBlockTypes2["HardPinkStainedGlass"] = "minecraft:hard_pink_stained_glass";
  MinecraftBlockTypes2["HardPinkStainedGlassPane"] = "minecraft:hard_pink_stained_glass_pane";
  MinecraftBlockTypes2["HardPurpleStainedGlass"] = "minecraft:hard_purple_stained_glass";
  MinecraftBlockTypes2["HardPurpleStainedGlassPane"] = "minecraft:hard_purple_stained_glass_pane";
  MinecraftBlockTypes2["HardRedStainedGlass"] = "minecraft:hard_red_stained_glass";
  MinecraftBlockTypes2["HardRedStainedGlassPane"] = "minecraft:hard_red_stained_glass_pane";
  MinecraftBlockTypes2["HardWhiteStainedGlass"] = "minecraft:hard_white_stained_glass";
  MinecraftBlockTypes2["HardWhiteStainedGlassPane"] = "minecraft:hard_white_stained_glass_pane";
  MinecraftBlockTypes2["HardYellowStainedGlass"] = "minecraft:hard_yellow_stained_glass";
  MinecraftBlockTypes2["HardYellowStainedGlassPane"] = "minecraft:hard_yellow_stained_glass_pane";
  MinecraftBlockTypes2["HardenedClay"] = "minecraft:hardened_clay";
  MinecraftBlockTypes2["HayBlock"] = "minecraft:hay_block";
  MinecraftBlockTypes2["HeavyCore"] = "minecraft:heavy_core";
  MinecraftBlockTypes2["HeavyWeightedPressurePlate"] = "minecraft:heavy_weighted_pressure_plate";
  MinecraftBlockTypes2["HoneyBlock"] = "minecraft:honey_block";
  MinecraftBlockTypes2["HoneycombBlock"] = "minecraft:honeycomb_block";
  MinecraftBlockTypes2["Hopper"] = "minecraft:hopper";
  MinecraftBlockTypes2["HornCoral"] = "minecraft:horn_coral";
  MinecraftBlockTypes2["HornCoralBlock"] = "minecraft:horn_coral_block";
  MinecraftBlockTypes2["HornCoralFan"] = "minecraft:horn_coral_fan";
  MinecraftBlockTypes2["HornCoralWallFan"] = "minecraft:horn_coral_wall_fan";
  MinecraftBlockTypes2["Ice"] = "minecraft:ice";
  MinecraftBlockTypes2["InfestedChiseledStoneBricks"] = "minecraft:infested_chiseled_stone_bricks";
  MinecraftBlockTypes2["InfestedCobblestone"] = "minecraft:infested_cobblestone";
  MinecraftBlockTypes2["InfestedCrackedStoneBricks"] = "minecraft:infested_cracked_stone_bricks";
  MinecraftBlockTypes2["InfestedDeepslate"] = "minecraft:infested_deepslate";
  MinecraftBlockTypes2["InfestedMossyStoneBricks"] = "minecraft:infested_mossy_stone_bricks";
  MinecraftBlockTypes2["InfestedStone"] = "minecraft:infested_stone";
  MinecraftBlockTypes2["InfestedStoneBricks"] = "minecraft:infested_stone_bricks";
  MinecraftBlockTypes2["IronBars"] = "minecraft:iron_bars";
  MinecraftBlockTypes2["IronBlock"] = "minecraft:iron_block";
  MinecraftBlockTypes2["IronChain"] = "minecraft:iron_chain";
  MinecraftBlockTypes2["IronDoor"] = "minecraft:iron_door";
  MinecraftBlockTypes2["IronOre"] = "minecraft:iron_ore";
  MinecraftBlockTypes2["IronTrapdoor"] = "minecraft:iron_trapdoor";
  MinecraftBlockTypes2["Jigsaw"] = "minecraft:jigsaw";
  MinecraftBlockTypes2["Jukebox"] = "minecraft:jukebox";
  MinecraftBlockTypes2["JungleButton"] = "minecraft:jungle_button";
  MinecraftBlockTypes2["JungleDoor"] = "minecraft:jungle_door";
  MinecraftBlockTypes2["JungleDoubleSlab"] = "minecraft:jungle_double_slab";
  MinecraftBlockTypes2["JungleFence"] = "minecraft:jungle_fence";
  MinecraftBlockTypes2["JungleFenceGate"] = "minecraft:jungle_fence_gate";
  MinecraftBlockTypes2["JungleHangingSign"] = "minecraft:jungle_hanging_sign";
  MinecraftBlockTypes2["JungleLeaves"] = "minecraft:jungle_leaves";
  MinecraftBlockTypes2["JungleLog"] = "minecraft:jungle_log";
  MinecraftBlockTypes2["JunglePlanks"] = "minecraft:jungle_planks";
  MinecraftBlockTypes2["JunglePressurePlate"] = "minecraft:jungle_pressure_plate";
  MinecraftBlockTypes2["JungleSapling"] = "minecraft:jungle_sapling";
  MinecraftBlockTypes2["JungleShelf"] = "minecraft:jungle_shelf";
  MinecraftBlockTypes2["JungleSlab"] = "minecraft:jungle_slab";
  MinecraftBlockTypes2["JungleStairs"] = "minecraft:jungle_stairs";
  MinecraftBlockTypes2["JungleStandingSign"] = "minecraft:jungle_standing_sign";
  MinecraftBlockTypes2["JungleTrapdoor"] = "minecraft:jungle_trapdoor";
  MinecraftBlockTypes2["JungleWallSign"] = "minecraft:jungle_wall_sign";
  MinecraftBlockTypes2["JungleWood"] = "minecraft:jungle_wood";
  MinecraftBlockTypes2["Kelp"] = "minecraft:kelp";
  MinecraftBlockTypes2["LabTable"] = "minecraft:lab_table";
  MinecraftBlockTypes2["Ladder"] = "minecraft:ladder";
  MinecraftBlockTypes2["Lantern"] = "minecraft:lantern";
  MinecraftBlockTypes2["LapisBlock"] = "minecraft:lapis_block";
  MinecraftBlockTypes2["LapisOre"] = "minecraft:lapis_ore";
  MinecraftBlockTypes2["LargeAmethystBud"] = "minecraft:large_amethyst_bud";
  MinecraftBlockTypes2["LargeFern"] = "minecraft:large_fern";
  MinecraftBlockTypes2["Lava"] = "minecraft:lava";
  MinecraftBlockTypes2["LeafLitter"] = "minecraft:leaf_litter";
  MinecraftBlockTypes2["Lectern"] = "minecraft:lectern";
  MinecraftBlockTypes2["Lever"] = "minecraft:lever";
  MinecraftBlockTypes2["LightBlock0"] = "minecraft:light_block_0";
  MinecraftBlockTypes2["LightBlock1"] = "minecraft:light_block_1";
  MinecraftBlockTypes2["LightBlock10"] = "minecraft:light_block_10";
  MinecraftBlockTypes2["LightBlock11"] = "minecraft:light_block_11";
  MinecraftBlockTypes2["LightBlock12"] = "minecraft:light_block_12";
  MinecraftBlockTypes2["LightBlock13"] = "minecraft:light_block_13";
  MinecraftBlockTypes2["LightBlock14"] = "minecraft:light_block_14";
  MinecraftBlockTypes2["LightBlock15"] = "minecraft:light_block_15";
  MinecraftBlockTypes2["LightBlock2"] = "minecraft:light_block_2";
  MinecraftBlockTypes2["LightBlock3"] = "minecraft:light_block_3";
  MinecraftBlockTypes2["LightBlock4"] = "minecraft:light_block_4";
  MinecraftBlockTypes2["LightBlock5"] = "minecraft:light_block_5";
  MinecraftBlockTypes2["LightBlock6"] = "minecraft:light_block_6";
  MinecraftBlockTypes2["LightBlock7"] = "minecraft:light_block_7";
  MinecraftBlockTypes2["LightBlock8"] = "minecraft:light_block_8";
  MinecraftBlockTypes2["LightBlock9"] = "minecraft:light_block_9";
  MinecraftBlockTypes2["LightBlueCandle"] = "minecraft:light_blue_candle";
  MinecraftBlockTypes2["LightBlueCandleCake"] = "minecraft:light_blue_candle_cake";
  MinecraftBlockTypes2["LightBlueCarpet"] = "minecraft:light_blue_carpet";
  MinecraftBlockTypes2["LightBlueConcrete"] = "minecraft:light_blue_concrete";
  MinecraftBlockTypes2["LightBlueConcretePowder"] = "minecraft:light_blue_concrete_powder";
  MinecraftBlockTypes2["LightBlueGlazedTerracotta"] = "minecraft:light_blue_glazed_terracotta";
  MinecraftBlockTypes2["LightBlueShulkerBox"] = "minecraft:light_blue_shulker_box";
  MinecraftBlockTypes2["LightBlueStainedGlass"] = "minecraft:light_blue_stained_glass";
  MinecraftBlockTypes2["LightBlueStainedGlassPane"] = "minecraft:light_blue_stained_glass_pane";
  MinecraftBlockTypes2["LightBlueTerracotta"] = "minecraft:light_blue_terracotta";
  MinecraftBlockTypes2["LightBlueWool"] = "minecraft:light_blue_wool";
  MinecraftBlockTypes2["LightGrayCandle"] = "minecraft:light_gray_candle";
  MinecraftBlockTypes2["LightGrayCandleCake"] = "minecraft:light_gray_candle_cake";
  MinecraftBlockTypes2["LightGrayCarpet"] = "minecraft:light_gray_carpet";
  MinecraftBlockTypes2["LightGrayConcrete"] = "minecraft:light_gray_concrete";
  MinecraftBlockTypes2["LightGrayConcretePowder"] = "minecraft:light_gray_concrete_powder";
  MinecraftBlockTypes2["LightGrayShulkerBox"] = "minecraft:light_gray_shulker_box";
  MinecraftBlockTypes2["LightGrayStainedGlass"] = "minecraft:light_gray_stained_glass";
  MinecraftBlockTypes2["LightGrayStainedGlassPane"] = "minecraft:light_gray_stained_glass_pane";
  MinecraftBlockTypes2["LightGrayTerracotta"] = "minecraft:light_gray_terracotta";
  MinecraftBlockTypes2["LightGrayWool"] = "minecraft:light_gray_wool";
  MinecraftBlockTypes2["LightWeightedPressurePlate"] = "minecraft:light_weighted_pressure_plate";
  MinecraftBlockTypes2["LightningRod"] = "minecraft:lightning_rod";
  MinecraftBlockTypes2["Lilac"] = "minecraft:lilac";
  MinecraftBlockTypes2["LilyOfTheValley"] = "minecraft:lily_of_the_valley";
  MinecraftBlockTypes2["LimeCandle"] = "minecraft:lime_candle";
  MinecraftBlockTypes2["LimeCandleCake"] = "minecraft:lime_candle_cake";
  MinecraftBlockTypes2["LimeCarpet"] = "minecraft:lime_carpet";
  MinecraftBlockTypes2["LimeConcrete"] = "minecraft:lime_concrete";
  MinecraftBlockTypes2["LimeConcretePowder"] = "minecraft:lime_concrete_powder";
  MinecraftBlockTypes2["LimeGlazedTerracotta"] = "minecraft:lime_glazed_terracotta";
  MinecraftBlockTypes2["LimeShulkerBox"] = "minecraft:lime_shulker_box";
  MinecraftBlockTypes2["LimeStainedGlass"] = "minecraft:lime_stained_glass";
  MinecraftBlockTypes2["LimeStainedGlassPane"] = "minecraft:lime_stained_glass_pane";
  MinecraftBlockTypes2["LimeTerracotta"] = "minecraft:lime_terracotta";
  MinecraftBlockTypes2["LimeWool"] = "minecraft:lime_wool";
  MinecraftBlockTypes2["LitBlastFurnace"] = "minecraft:lit_blast_furnace";
  MinecraftBlockTypes2["LitDeepslateRedstoneOre"] = "minecraft:lit_deepslate_redstone_ore";
  MinecraftBlockTypes2["LitFurnace"] = "minecraft:lit_furnace";
  MinecraftBlockTypes2["LitPumpkin"] = "minecraft:lit_pumpkin";
  MinecraftBlockTypes2["LitRedstoneLamp"] = "minecraft:lit_redstone_lamp";
  MinecraftBlockTypes2["LitRedstoneOre"] = "minecraft:lit_redstone_ore";
  MinecraftBlockTypes2["LitSmoker"] = "minecraft:lit_smoker";
  MinecraftBlockTypes2["Lodestone"] = "minecraft:lodestone";
  MinecraftBlockTypes2["Loom"] = "minecraft:loom";
  MinecraftBlockTypes2["MagentaCandle"] = "minecraft:magenta_candle";
  MinecraftBlockTypes2["MagentaCandleCake"] = "minecraft:magenta_candle_cake";
  MinecraftBlockTypes2["MagentaCarpet"] = "minecraft:magenta_carpet";
  MinecraftBlockTypes2["MagentaConcrete"] = "minecraft:magenta_concrete";
  MinecraftBlockTypes2["MagentaConcretePowder"] = "minecraft:magenta_concrete_powder";
  MinecraftBlockTypes2["MagentaGlazedTerracotta"] = "minecraft:magenta_glazed_terracotta";
  MinecraftBlockTypes2["MagentaShulkerBox"] = "minecraft:magenta_shulker_box";
  MinecraftBlockTypes2["MagentaStainedGlass"] = "minecraft:magenta_stained_glass";
  MinecraftBlockTypes2["MagentaStainedGlassPane"] = "minecraft:magenta_stained_glass_pane";
  MinecraftBlockTypes2["MagentaTerracotta"] = "minecraft:magenta_terracotta";
  MinecraftBlockTypes2["MagentaWool"] = "minecraft:magenta_wool";
  MinecraftBlockTypes2["Magma"] = "minecraft:magma";
  MinecraftBlockTypes2["MangroveButton"] = "minecraft:mangrove_button";
  MinecraftBlockTypes2["MangroveDoor"] = "minecraft:mangrove_door";
  MinecraftBlockTypes2["MangroveDoubleSlab"] = "minecraft:mangrove_double_slab";
  MinecraftBlockTypes2["MangroveFence"] = "minecraft:mangrove_fence";
  MinecraftBlockTypes2["MangroveFenceGate"] = "minecraft:mangrove_fence_gate";
  MinecraftBlockTypes2["MangroveHangingSign"] = "minecraft:mangrove_hanging_sign";
  MinecraftBlockTypes2["MangroveLeaves"] = "minecraft:mangrove_leaves";
  MinecraftBlockTypes2["MangroveLog"] = "minecraft:mangrove_log";
  MinecraftBlockTypes2["MangrovePlanks"] = "minecraft:mangrove_planks";
  MinecraftBlockTypes2["MangrovePressurePlate"] = "minecraft:mangrove_pressure_plate";
  MinecraftBlockTypes2["MangrovePropagule"] = "minecraft:mangrove_propagule";
  MinecraftBlockTypes2["MangroveRoots"] = "minecraft:mangrove_roots";
  MinecraftBlockTypes2["MangroveShelf"] = "minecraft:mangrove_shelf";
  MinecraftBlockTypes2["MangroveSlab"] = "minecraft:mangrove_slab";
  MinecraftBlockTypes2["MangroveStairs"] = "minecraft:mangrove_stairs";
  MinecraftBlockTypes2["MangroveStandingSign"] = "minecraft:mangrove_standing_sign";
  MinecraftBlockTypes2["MangroveTrapdoor"] = "minecraft:mangrove_trapdoor";
  MinecraftBlockTypes2["MangroveWallSign"] = "minecraft:mangrove_wall_sign";
  MinecraftBlockTypes2["MangroveWood"] = "minecraft:mangrove_wood";
  MinecraftBlockTypes2["MaterialReducer"] = "minecraft:material_reducer";
  MinecraftBlockTypes2["MediumAmethystBud"] = "minecraft:medium_amethyst_bud";
  MinecraftBlockTypes2["MelonBlock"] = "minecraft:melon_block";
  MinecraftBlockTypes2["MelonStem"] = "minecraft:melon_stem";
  MinecraftBlockTypes2["MobSpawner"] = "minecraft:mob_spawner";
  MinecraftBlockTypes2["MossBlock"] = "minecraft:moss_block";
  MinecraftBlockTypes2["MossCarpet"] = "minecraft:moss_carpet";
  MinecraftBlockTypes2["MossyCobblestone"] = "minecraft:mossy_cobblestone";
  MinecraftBlockTypes2["MossyCobblestoneDoubleSlab"] = "minecraft:mossy_cobblestone_double_slab";
  MinecraftBlockTypes2["MossyCobblestoneSlab"] = "minecraft:mossy_cobblestone_slab";
  MinecraftBlockTypes2["MossyCobblestoneStairs"] = "minecraft:mossy_cobblestone_stairs";
  MinecraftBlockTypes2["MossyCobblestoneWall"] = "minecraft:mossy_cobblestone_wall";
  MinecraftBlockTypes2["MossyStoneBrickDoubleSlab"] = "minecraft:mossy_stone_brick_double_slab";
  MinecraftBlockTypes2["MossyStoneBrickSlab"] = "minecraft:mossy_stone_brick_slab";
  MinecraftBlockTypes2["MossyStoneBrickStairs"] = "minecraft:mossy_stone_brick_stairs";
  MinecraftBlockTypes2["MossyStoneBrickWall"] = "minecraft:mossy_stone_brick_wall";
  MinecraftBlockTypes2["MossyStoneBricks"] = "minecraft:mossy_stone_bricks";
  MinecraftBlockTypes2["Mud"] = "minecraft:mud";
  MinecraftBlockTypes2["MudBrickDoubleSlab"] = "minecraft:mud_brick_double_slab";
  MinecraftBlockTypes2["MudBrickSlab"] = "minecraft:mud_brick_slab";
  MinecraftBlockTypes2["MudBrickStairs"] = "minecraft:mud_brick_stairs";
  MinecraftBlockTypes2["MudBrickWall"] = "minecraft:mud_brick_wall";
  MinecraftBlockTypes2["MudBricks"] = "minecraft:mud_bricks";
  MinecraftBlockTypes2["MuddyMangroveRoots"] = "minecraft:muddy_mangrove_roots";
  MinecraftBlockTypes2["MushroomStem"] = "minecraft:mushroom_stem";
  MinecraftBlockTypes2["Mycelium"] = "minecraft:mycelium";
  MinecraftBlockTypes2["NetherBrick"] = "minecraft:nether_brick";
  MinecraftBlockTypes2["NetherBrickDoubleSlab"] = "minecraft:nether_brick_double_slab";
  MinecraftBlockTypes2["NetherBrickFence"] = "minecraft:nether_brick_fence";
  MinecraftBlockTypes2["NetherBrickSlab"] = "minecraft:nether_brick_slab";
  MinecraftBlockTypes2["NetherBrickStairs"] = "minecraft:nether_brick_stairs";
  MinecraftBlockTypes2["NetherBrickWall"] = "minecraft:nether_brick_wall";
  MinecraftBlockTypes2["NetherGoldOre"] = "minecraft:nether_gold_ore";
  MinecraftBlockTypes2["NetherSprouts"] = "minecraft:nether_sprouts";
  MinecraftBlockTypes2["NetherWart"] = "minecraft:nether_wart";
  MinecraftBlockTypes2["NetherWartBlock"] = "minecraft:nether_wart_block";
  MinecraftBlockTypes2["NetheriteBlock"] = "minecraft:netherite_block";
  MinecraftBlockTypes2["Netherrack"] = "minecraft:netherrack";
  MinecraftBlockTypes2["NormalStoneDoubleSlab"] = "minecraft:normal_stone_double_slab";
  MinecraftBlockTypes2["NormalStoneSlab"] = "minecraft:normal_stone_slab";
  MinecraftBlockTypes2["NormalStoneStairs"] = "minecraft:normal_stone_stairs";
  MinecraftBlockTypes2["Noteblock"] = "minecraft:noteblock";
  MinecraftBlockTypes2["OakDoubleSlab"] = "minecraft:oak_double_slab";
  MinecraftBlockTypes2["OakFence"] = "minecraft:oak_fence";
  MinecraftBlockTypes2["OakHangingSign"] = "minecraft:oak_hanging_sign";
  MinecraftBlockTypes2["OakLeaves"] = "minecraft:oak_leaves";
  MinecraftBlockTypes2["OakLog"] = "minecraft:oak_log";
  MinecraftBlockTypes2["OakPlanks"] = "minecraft:oak_planks";
  MinecraftBlockTypes2["OakSapling"] = "minecraft:oak_sapling";
  MinecraftBlockTypes2["OakShelf"] = "minecraft:oak_shelf";
  MinecraftBlockTypes2["OakSlab"] = "minecraft:oak_slab";
  MinecraftBlockTypes2["OakStairs"] = "minecraft:oak_stairs";
  MinecraftBlockTypes2["OakWood"] = "minecraft:oak_wood";
  MinecraftBlockTypes2["Observer"] = "minecraft:observer";
  MinecraftBlockTypes2["Obsidian"] = "minecraft:obsidian";
  MinecraftBlockTypes2["OchreFroglight"] = "minecraft:ochre_froglight";
  MinecraftBlockTypes2["OpenEyeblossom"] = "minecraft:open_eyeblossom";
  MinecraftBlockTypes2["OrangeCandle"] = "minecraft:orange_candle";
  MinecraftBlockTypes2["OrangeCandleCake"] = "minecraft:orange_candle_cake";
  MinecraftBlockTypes2["OrangeCarpet"] = "minecraft:orange_carpet";
  MinecraftBlockTypes2["OrangeConcrete"] = "minecraft:orange_concrete";
  MinecraftBlockTypes2["OrangeConcretePowder"] = "minecraft:orange_concrete_powder";
  MinecraftBlockTypes2["OrangeGlazedTerracotta"] = "minecraft:orange_glazed_terracotta";
  MinecraftBlockTypes2["OrangeShulkerBox"] = "minecraft:orange_shulker_box";
  MinecraftBlockTypes2["OrangeStainedGlass"] = "minecraft:orange_stained_glass";
  MinecraftBlockTypes2["OrangeStainedGlassPane"] = "minecraft:orange_stained_glass_pane";
  MinecraftBlockTypes2["OrangeTerracotta"] = "minecraft:orange_terracotta";
  MinecraftBlockTypes2["OrangeTulip"] = "minecraft:orange_tulip";
  MinecraftBlockTypes2["OrangeWool"] = "minecraft:orange_wool";
  MinecraftBlockTypes2["OxeyeDaisy"] = "minecraft:oxeye_daisy";
  MinecraftBlockTypes2["OxidizedChiseledCopper"] = "minecraft:oxidized_chiseled_copper";
  MinecraftBlockTypes2["OxidizedCopper"] = "minecraft:oxidized_copper";
  MinecraftBlockTypes2["OxidizedCopperBars"] = "minecraft:oxidized_copper_bars";
  MinecraftBlockTypes2["OxidizedCopperBulb"] = "minecraft:oxidized_copper_bulb";
  MinecraftBlockTypes2["OxidizedCopperChain"] = "minecraft:oxidized_copper_chain";
  MinecraftBlockTypes2["OxidizedCopperChest"] = "minecraft:oxidized_copper_chest";
  MinecraftBlockTypes2["OxidizedCopperDoor"] = "minecraft:oxidized_copper_door";
  MinecraftBlockTypes2["OxidizedCopperGolemStatue"] = "minecraft:oxidized_copper_golem_statue";
  MinecraftBlockTypes2["OxidizedCopperGrate"] = "minecraft:oxidized_copper_grate";
  MinecraftBlockTypes2["OxidizedCopperLantern"] = "minecraft:oxidized_copper_lantern";
  MinecraftBlockTypes2["OxidizedCopperTrapdoor"] = "minecraft:oxidized_copper_trapdoor";
  MinecraftBlockTypes2["OxidizedCutCopper"] = "minecraft:oxidized_cut_copper";
  MinecraftBlockTypes2["OxidizedCutCopperSlab"] = "minecraft:oxidized_cut_copper_slab";
  MinecraftBlockTypes2["OxidizedCutCopperStairs"] = "minecraft:oxidized_cut_copper_stairs";
  MinecraftBlockTypes2["OxidizedDoubleCutCopperSlab"] = "minecraft:oxidized_double_cut_copper_slab";
  MinecraftBlockTypes2["OxidizedLightningRod"] = "minecraft:oxidized_lightning_rod";
  MinecraftBlockTypes2["PackedIce"] = "minecraft:packed_ice";
  MinecraftBlockTypes2["PackedMud"] = "minecraft:packed_mud";
  MinecraftBlockTypes2["PaleHangingMoss"] = "minecraft:pale_hanging_moss";
  MinecraftBlockTypes2["PaleMossBlock"] = "minecraft:pale_moss_block";
  MinecraftBlockTypes2["PaleMossCarpet"] = "minecraft:pale_moss_carpet";
  MinecraftBlockTypes2["PaleOakButton"] = "minecraft:pale_oak_button";
  MinecraftBlockTypes2["PaleOakDoor"] = "minecraft:pale_oak_door";
  MinecraftBlockTypes2["PaleOakDoubleSlab"] = "minecraft:pale_oak_double_slab";
  MinecraftBlockTypes2["PaleOakFence"] = "minecraft:pale_oak_fence";
  MinecraftBlockTypes2["PaleOakFenceGate"] = "minecraft:pale_oak_fence_gate";
  MinecraftBlockTypes2["PaleOakHangingSign"] = "minecraft:pale_oak_hanging_sign";
  MinecraftBlockTypes2["PaleOakLeaves"] = "minecraft:pale_oak_leaves";
  MinecraftBlockTypes2["PaleOakLog"] = "minecraft:pale_oak_log";
  MinecraftBlockTypes2["PaleOakPlanks"] = "minecraft:pale_oak_planks";
  MinecraftBlockTypes2["PaleOakPressurePlate"] = "minecraft:pale_oak_pressure_plate";
  MinecraftBlockTypes2["PaleOakSapling"] = "minecraft:pale_oak_sapling";
  MinecraftBlockTypes2["PaleOakShelf"] = "minecraft:pale_oak_shelf";
  MinecraftBlockTypes2["PaleOakSlab"] = "minecraft:pale_oak_slab";
  MinecraftBlockTypes2["PaleOakStairs"] = "minecraft:pale_oak_stairs";
  MinecraftBlockTypes2["PaleOakStandingSign"] = "minecraft:pale_oak_standing_sign";
  MinecraftBlockTypes2["PaleOakTrapdoor"] = "minecraft:pale_oak_trapdoor";
  MinecraftBlockTypes2["PaleOakWallSign"] = "minecraft:pale_oak_wall_sign";
  MinecraftBlockTypes2["PaleOakWood"] = "minecraft:pale_oak_wood";
  MinecraftBlockTypes2["PearlescentFroglight"] = "minecraft:pearlescent_froglight";
  MinecraftBlockTypes2["Peony"] = "minecraft:peony";
  MinecraftBlockTypes2["PetrifiedOakDoubleSlab"] = "minecraft:petrified_oak_double_slab";
  MinecraftBlockTypes2["PetrifiedOakSlab"] = "minecraft:petrified_oak_slab";
  MinecraftBlockTypes2["PiglinHead"] = "minecraft:piglin_head";
  MinecraftBlockTypes2["PinkCandle"] = "minecraft:pink_candle";
  MinecraftBlockTypes2["PinkCandleCake"] = "minecraft:pink_candle_cake";
  MinecraftBlockTypes2["PinkCarpet"] = "minecraft:pink_carpet";
  MinecraftBlockTypes2["PinkConcrete"] = "minecraft:pink_concrete";
  MinecraftBlockTypes2["PinkConcretePowder"] = "minecraft:pink_concrete_powder";
  MinecraftBlockTypes2["PinkGlazedTerracotta"] = "minecraft:pink_glazed_terracotta";
  MinecraftBlockTypes2["PinkPetals"] = "minecraft:pink_petals";
  MinecraftBlockTypes2["PinkShulkerBox"] = "minecraft:pink_shulker_box";
  MinecraftBlockTypes2["PinkStainedGlass"] = "minecraft:pink_stained_glass";
  MinecraftBlockTypes2["PinkStainedGlassPane"] = "minecraft:pink_stained_glass_pane";
  MinecraftBlockTypes2["PinkTerracotta"] = "minecraft:pink_terracotta";
  MinecraftBlockTypes2["PinkTulip"] = "minecraft:pink_tulip";
  MinecraftBlockTypes2["PinkWool"] = "minecraft:pink_wool";
  MinecraftBlockTypes2["Piston"] = "minecraft:piston";
  MinecraftBlockTypes2["PistonArmCollision"] = "minecraft:piston_arm_collision";
  MinecraftBlockTypes2["PitcherCrop"] = "minecraft:pitcher_crop";
  MinecraftBlockTypes2["PitcherPlant"] = "minecraft:pitcher_plant";
  MinecraftBlockTypes2["PlayerHead"] = "minecraft:player_head";
  MinecraftBlockTypes2["Podzol"] = "minecraft:podzol";
  MinecraftBlockTypes2["PointedDripstone"] = "minecraft:pointed_dripstone";
  MinecraftBlockTypes2["PolishedAndesite"] = "minecraft:polished_andesite";
  MinecraftBlockTypes2["PolishedAndesiteDoubleSlab"] = "minecraft:polished_andesite_double_slab";
  MinecraftBlockTypes2["PolishedAndesiteSlab"] = "minecraft:polished_andesite_slab";
  MinecraftBlockTypes2["PolishedAndesiteStairs"] = "minecraft:polished_andesite_stairs";
  MinecraftBlockTypes2["PolishedBasalt"] = "minecraft:polished_basalt";
  MinecraftBlockTypes2["PolishedBlackstone"] = "minecraft:polished_blackstone";
  MinecraftBlockTypes2["PolishedBlackstoneBrickDoubleSlab"] = "minecraft:polished_blackstone_brick_double_slab";
  MinecraftBlockTypes2["PolishedBlackstoneBrickSlab"] = "minecraft:polished_blackstone_brick_slab";
  MinecraftBlockTypes2["PolishedBlackstoneBrickStairs"] = "minecraft:polished_blackstone_brick_stairs";
  MinecraftBlockTypes2["PolishedBlackstoneBrickWall"] = "minecraft:polished_blackstone_brick_wall";
  MinecraftBlockTypes2["PolishedBlackstoneBricks"] = "minecraft:polished_blackstone_bricks";
  MinecraftBlockTypes2["PolishedBlackstoneButton"] = "minecraft:polished_blackstone_button";
  MinecraftBlockTypes2["PolishedBlackstoneDoubleSlab"] = "minecraft:polished_blackstone_double_slab";
  MinecraftBlockTypes2["PolishedBlackstonePressurePlate"] = "minecraft:polished_blackstone_pressure_plate";
  MinecraftBlockTypes2["PolishedBlackstoneSlab"] = "minecraft:polished_blackstone_slab";
  MinecraftBlockTypes2["PolishedBlackstoneStairs"] = "minecraft:polished_blackstone_stairs";
  MinecraftBlockTypes2["PolishedBlackstoneWall"] = "minecraft:polished_blackstone_wall";
  MinecraftBlockTypes2["PolishedDeepslate"] = "minecraft:polished_deepslate";
  MinecraftBlockTypes2["PolishedDeepslateDoubleSlab"] = "minecraft:polished_deepslate_double_slab";
  MinecraftBlockTypes2["PolishedDeepslateSlab"] = "minecraft:polished_deepslate_slab";
  MinecraftBlockTypes2["PolishedDeepslateStairs"] = "minecraft:polished_deepslate_stairs";
  MinecraftBlockTypes2["PolishedDeepslateWall"] = "minecraft:polished_deepslate_wall";
  MinecraftBlockTypes2["PolishedDiorite"] = "minecraft:polished_diorite";
  MinecraftBlockTypes2["PolishedDioriteDoubleSlab"] = "minecraft:polished_diorite_double_slab";
  MinecraftBlockTypes2["PolishedDioriteSlab"] = "minecraft:polished_diorite_slab";
  MinecraftBlockTypes2["PolishedDioriteStairs"] = "minecraft:polished_diorite_stairs";
  MinecraftBlockTypes2["PolishedGranite"] = "minecraft:polished_granite";
  MinecraftBlockTypes2["PolishedGraniteDoubleSlab"] = "minecraft:polished_granite_double_slab";
  MinecraftBlockTypes2["PolishedGraniteSlab"] = "minecraft:polished_granite_slab";
  MinecraftBlockTypes2["PolishedGraniteStairs"] = "minecraft:polished_granite_stairs";
  MinecraftBlockTypes2["PolishedTuff"] = "minecraft:polished_tuff";
  MinecraftBlockTypes2["PolishedTuffDoubleSlab"] = "minecraft:polished_tuff_double_slab";
  MinecraftBlockTypes2["PolishedTuffSlab"] = "minecraft:polished_tuff_slab";
  MinecraftBlockTypes2["PolishedTuffStairs"] = "minecraft:polished_tuff_stairs";
  MinecraftBlockTypes2["PolishedTuffWall"] = "minecraft:polished_tuff_wall";
  MinecraftBlockTypes2["Poppy"] = "minecraft:poppy";
  MinecraftBlockTypes2["Portal"] = "minecraft:portal";
  MinecraftBlockTypes2["Potatoes"] = "minecraft:potatoes";
  MinecraftBlockTypes2["PowderSnow"] = "minecraft:powder_snow";
  MinecraftBlockTypes2["PoweredComparator"] = "minecraft:powered_comparator";
  MinecraftBlockTypes2["PoweredRepeater"] = "minecraft:powered_repeater";
  MinecraftBlockTypes2["Prismarine"] = "minecraft:prismarine";
  MinecraftBlockTypes2["PrismarineBrickDoubleSlab"] = "minecraft:prismarine_brick_double_slab";
  MinecraftBlockTypes2["PrismarineBrickSlab"] = "minecraft:prismarine_brick_slab";
  MinecraftBlockTypes2["PrismarineBricks"] = "minecraft:prismarine_bricks";
  MinecraftBlockTypes2["PrismarineBricksStairs"] = "minecraft:prismarine_bricks_stairs";
  MinecraftBlockTypes2["PrismarineDoubleSlab"] = "minecraft:prismarine_double_slab";
  MinecraftBlockTypes2["PrismarineSlab"] = "minecraft:prismarine_slab";
  MinecraftBlockTypes2["PrismarineStairs"] = "minecraft:prismarine_stairs";
  MinecraftBlockTypes2["PrismarineWall"] = "minecraft:prismarine_wall";
  MinecraftBlockTypes2["Pumpkin"] = "minecraft:pumpkin";
  MinecraftBlockTypes2["PumpkinStem"] = "minecraft:pumpkin_stem";
  MinecraftBlockTypes2["PurpleCandle"] = "minecraft:purple_candle";
  MinecraftBlockTypes2["PurpleCandleCake"] = "minecraft:purple_candle_cake";
  MinecraftBlockTypes2["PurpleCarpet"] = "minecraft:purple_carpet";
  MinecraftBlockTypes2["PurpleConcrete"] = "minecraft:purple_concrete";
  MinecraftBlockTypes2["PurpleConcretePowder"] = "minecraft:purple_concrete_powder";
  MinecraftBlockTypes2["PurpleGlazedTerracotta"] = "minecraft:purple_glazed_terracotta";
  MinecraftBlockTypes2["PurpleShulkerBox"] = "minecraft:purple_shulker_box";
  MinecraftBlockTypes2["PurpleStainedGlass"] = "minecraft:purple_stained_glass";
  MinecraftBlockTypes2["PurpleStainedGlassPane"] = "minecraft:purple_stained_glass_pane";
  MinecraftBlockTypes2["PurpleTerracotta"] = "minecraft:purple_terracotta";
  MinecraftBlockTypes2["PurpleWool"] = "minecraft:purple_wool";
  MinecraftBlockTypes2["PurpurBlock"] = "minecraft:purpur_block";
  MinecraftBlockTypes2["PurpurDoubleSlab"] = "minecraft:purpur_double_slab";
  MinecraftBlockTypes2["PurpurPillar"] = "minecraft:purpur_pillar";
  MinecraftBlockTypes2["PurpurSlab"] = "minecraft:purpur_slab";
  MinecraftBlockTypes2["PurpurStairs"] = "minecraft:purpur_stairs";
  MinecraftBlockTypes2["QuartzBlock"] = "minecraft:quartz_block";
  MinecraftBlockTypes2["QuartzBricks"] = "minecraft:quartz_bricks";
  MinecraftBlockTypes2["QuartzDoubleSlab"] = "minecraft:quartz_double_slab";
  MinecraftBlockTypes2["QuartzOre"] = "minecraft:quartz_ore";
  MinecraftBlockTypes2["QuartzPillar"] = "minecraft:quartz_pillar";
  MinecraftBlockTypes2["QuartzSlab"] = "minecraft:quartz_slab";
  MinecraftBlockTypes2["QuartzStairs"] = "minecraft:quartz_stairs";
  MinecraftBlockTypes2["Rail"] = "minecraft:rail";
  MinecraftBlockTypes2["RawCopperBlock"] = "minecraft:raw_copper_block";
  MinecraftBlockTypes2["RawGoldBlock"] = "minecraft:raw_gold_block";
  MinecraftBlockTypes2["RawIronBlock"] = "minecraft:raw_iron_block";
  MinecraftBlockTypes2["RedCandle"] = "minecraft:red_candle";
  MinecraftBlockTypes2["RedCandleCake"] = "minecraft:red_candle_cake";
  MinecraftBlockTypes2["RedCarpet"] = "minecraft:red_carpet";
  MinecraftBlockTypes2["RedConcrete"] = "minecraft:red_concrete";
  MinecraftBlockTypes2["RedConcretePowder"] = "minecraft:red_concrete_powder";
  MinecraftBlockTypes2["RedGlazedTerracotta"] = "minecraft:red_glazed_terracotta";
  MinecraftBlockTypes2["RedMushroom"] = "minecraft:red_mushroom";
  MinecraftBlockTypes2["RedMushroomBlock"] = "minecraft:red_mushroom_block";
  MinecraftBlockTypes2["RedNetherBrick"] = "minecraft:red_nether_brick";
  MinecraftBlockTypes2["RedNetherBrickDoubleSlab"] = "minecraft:red_nether_brick_double_slab";
  MinecraftBlockTypes2["RedNetherBrickSlab"] = "minecraft:red_nether_brick_slab";
  MinecraftBlockTypes2["RedNetherBrickStairs"] = "minecraft:red_nether_brick_stairs";
  MinecraftBlockTypes2["RedNetherBrickWall"] = "minecraft:red_nether_brick_wall";
  MinecraftBlockTypes2["RedSand"] = "minecraft:red_sand";
  MinecraftBlockTypes2["RedSandstone"] = "minecraft:red_sandstone";
  MinecraftBlockTypes2["RedSandstoneDoubleSlab"] = "minecraft:red_sandstone_double_slab";
  MinecraftBlockTypes2["RedSandstoneSlab"] = "minecraft:red_sandstone_slab";
  MinecraftBlockTypes2["RedSandstoneStairs"] = "minecraft:red_sandstone_stairs";
  MinecraftBlockTypes2["RedSandstoneWall"] = "minecraft:red_sandstone_wall";
  MinecraftBlockTypes2["RedShulkerBox"] = "minecraft:red_shulker_box";
  MinecraftBlockTypes2["RedStainedGlass"] = "minecraft:red_stained_glass";
  MinecraftBlockTypes2["RedStainedGlassPane"] = "minecraft:red_stained_glass_pane";
  MinecraftBlockTypes2["RedTerracotta"] = "minecraft:red_terracotta";
  MinecraftBlockTypes2["RedTulip"] = "minecraft:red_tulip";
  MinecraftBlockTypes2["RedWool"] = "minecraft:red_wool";
  MinecraftBlockTypes2["RedstoneBlock"] = "minecraft:redstone_block";
  MinecraftBlockTypes2["RedstoneLamp"] = "minecraft:redstone_lamp";
  MinecraftBlockTypes2["RedstoneOre"] = "minecraft:redstone_ore";
  MinecraftBlockTypes2["RedstoneTorch"] = "minecraft:redstone_torch";
  MinecraftBlockTypes2["RedstoneWire"] = "minecraft:redstone_wire";
  MinecraftBlockTypes2["Reeds"] = "minecraft:reeds";
  MinecraftBlockTypes2["ReinforcedDeepslate"] = "minecraft:reinforced_deepslate";
  MinecraftBlockTypes2["RepeatingCommandBlock"] = "minecraft:repeating_command_block";
  MinecraftBlockTypes2["ResinBlock"] = "minecraft:resin_block";
  MinecraftBlockTypes2["ResinBrickDoubleSlab"] = "minecraft:resin_brick_double_slab";
  MinecraftBlockTypes2["ResinBrickSlab"] = "minecraft:resin_brick_slab";
  MinecraftBlockTypes2["ResinBrickStairs"] = "minecraft:resin_brick_stairs";
  MinecraftBlockTypes2["ResinBrickWall"] = "minecraft:resin_brick_wall";
  MinecraftBlockTypes2["ResinBricks"] = "minecraft:resin_bricks";
  MinecraftBlockTypes2["ResinClump"] = "minecraft:resin_clump";
  MinecraftBlockTypes2["RespawnAnchor"] = "minecraft:respawn_anchor";
  MinecraftBlockTypes2["RoseBush"] = "minecraft:rose_bush";
  MinecraftBlockTypes2["Sand"] = "minecraft:sand";
  MinecraftBlockTypes2["Sandstone"] = "minecraft:sandstone";
  MinecraftBlockTypes2["SandstoneDoubleSlab"] = "minecraft:sandstone_double_slab";
  MinecraftBlockTypes2["SandstoneSlab"] = "minecraft:sandstone_slab";
  MinecraftBlockTypes2["SandstoneStairs"] = "minecraft:sandstone_stairs";
  MinecraftBlockTypes2["SandstoneWall"] = "minecraft:sandstone_wall";
  MinecraftBlockTypes2["Scaffolding"] = "minecraft:scaffolding";
  MinecraftBlockTypes2["Sculk"] = "minecraft:sculk";
  MinecraftBlockTypes2["SculkCatalyst"] = "minecraft:sculk_catalyst";
  MinecraftBlockTypes2["SculkSensor"] = "minecraft:sculk_sensor";
  MinecraftBlockTypes2["SculkShrieker"] = "minecraft:sculk_shrieker";
  MinecraftBlockTypes2["SculkVein"] = "minecraft:sculk_vein";
  MinecraftBlockTypes2["SeaLantern"] = "minecraft:sea_lantern";
  MinecraftBlockTypes2["SeaPickle"] = "minecraft:sea_pickle";
  MinecraftBlockTypes2["Seagrass"] = "minecraft:seagrass";
  MinecraftBlockTypes2["ShortDryGrass"] = "minecraft:short_dry_grass";
  MinecraftBlockTypes2["ShortGrass"] = "minecraft:short_grass";
  MinecraftBlockTypes2["Shroomlight"] = "minecraft:shroomlight";
  MinecraftBlockTypes2["SilverGlazedTerracotta"] = "minecraft:silver_glazed_terracotta";
  MinecraftBlockTypes2["SkeletonSkull"] = "minecraft:skeleton_skull";
  MinecraftBlockTypes2["Slime"] = "minecraft:slime";
  MinecraftBlockTypes2["SmallAmethystBud"] = "minecraft:small_amethyst_bud";
  MinecraftBlockTypes2["SmallDripleafBlock"] = "minecraft:small_dripleaf_block";
  MinecraftBlockTypes2["SmithingTable"] = "minecraft:smithing_table";
  MinecraftBlockTypes2["Smoker"] = "minecraft:smoker";
  MinecraftBlockTypes2["SmoothBasalt"] = "minecraft:smooth_basalt";
  MinecraftBlockTypes2["SmoothQuartz"] = "minecraft:smooth_quartz";
  MinecraftBlockTypes2["SmoothQuartzDoubleSlab"] = "minecraft:smooth_quartz_double_slab";
  MinecraftBlockTypes2["SmoothQuartzSlab"] = "minecraft:smooth_quartz_slab";
  MinecraftBlockTypes2["SmoothQuartzStairs"] = "minecraft:smooth_quartz_stairs";
  MinecraftBlockTypes2["SmoothRedSandstone"] = "minecraft:smooth_red_sandstone";
  MinecraftBlockTypes2["SmoothRedSandstoneDoubleSlab"] = "minecraft:smooth_red_sandstone_double_slab";
  MinecraftBlockTypes2["SmoothRedSandstoneSlab"] = "minecraft:smooth_red_sandstone_slab";
  MinecraftBlockTypes2["SmoothRedSandstoneStairs"] = "minecraft:smooth_red_sandstone_stairs";
  MinecraftBlockTypes2["SmoothSandstone"] = "minecraft:smooth_sandstone";
  MinecraftBlockTypes2["SmoothSandstoneDoubleSlab"] = "minecraft:smooth_sandstone_double_slab";
  MinecraftBlockTypes2["SmoothSandstoneSlab"] = "minecraft:smooth_sandstone_slab";
  MinecraftBlockTypes2["SmoothSandstoneStairs"] = "minecraft:smooth_sandstone_stairs";
  MinecraftBlockTypes2["SmoothStone"] = "minecraft:smooth_stone";
  MinecraftBlockTypes2["SmoothStoneDoubleSlab"] = "minecraft:smooth_stone_double_slab";
  MinecraftBlockTypes2["SmoothStoneSlab"] = "minecraft:smooth_stone_slab";
  MinecraftBlockTypes2["SnifferEgg"] = "minecraft:sniffer_egg";
  MinecraftBlockTypes2["Snow"] = "minecraft:snow";
  MinecraftBlockTypes2["SnowLayer"] = "minecraft:snow_layer";
  MinecraftBlockTypes2["SoulCampfire"] = "minecraft:soul_campfire";
  MinecraftBlockTypes2["SoulFire"] = "minecraft:soul_fire";
  MinecraftBlockTypes2["SoulLantern"] = "minecraft:soul_lantern";
  MinecraftBlockTypes2["SoulSand"] = "minecraft:soul_sand";
  MinecraftBlockTypes2["SoulSoil"] = "minecraft:soul_soil";
  MinecraftBlockTypes2["SoulTorch"] = "minecraft:soul_torch";
  MinecraftBlockTypes2["Sponge"] = "minecraft:sponge";
  MinecraftBlockTypes2["SporeBlossom"] = "minecraft:spore_blossom";
  MinecraftBlockTypes2["SpruceButton"] = "minecraft:spruce_button";
  MinecraftBlockTypes2["SpruceDoor"] = "minecraft:spruce_door";
  MinecraftBlockTypes2["SpruceDoubleSlab"] = "minecraft:spruce_double_slab";
  MinecraftBlockTypes2["SpruceFence"] = "minecraft:spruce_fence";
  MinecraftBlockTypes2["SpruceFenceGate"] = "minecraft:spruce_fence_gate";
  MinecraftBlockTypes2["SpruceHangingSign"] = "minecraft:spruce_hanging_sign";
  MinecraftBlockTypes2["SpruceLeaves"] = "minecraft:spruce_leaves";
  MinecraftBlockTypes2["SpruceLog"] = "minecraft:spruce_log";
  MinecraftBlockTypes2["SprucePlanks"] = "minecraft:spruce_planks";
  MinecraftBlockTypes2["SprucePressurePlate"] = "minecraft:spruce_pressure_plate";
  MinecraftBlockTypes2["SpruceSapling"] = "minecraft:spruce_sapling";
  MinecraftBlockTypes2["SpruceShelf"] = "minecraft:spruce_shelf";
  MinecraftBlockTypes2["SpruceSlab"] = "minecraft:spruce_slab";
  MinecraftBlockTypes2["SpruceStairs"] = "minecraft:spruce_stairs";
  MinecraftBlockTypes2["SpruceStandingSign"] = "minecraft:spruce_standing_sign";
  MinecraftBlockTypes2["SpruceTrapdoor"] = "minecraft:spruce_trapdoor";
  MinecraftBlockTypes2["SpruceWallSign"] = "minecraft:spruce_wall_sign";
  MinecraftBlockTypes2["SpruceWood"] = "minecraft:spruce_wood";
  MinecraftBlockTypes2["StandingBanner"] = "minecraft:standing_banner";
  MinecraftBlockTypes2["StandingSign"] = "minecraft:standing_sign";
  MinecraftBlockTypes2["StickyPiston"] = "minecraft:sticky_piston";
  MinecraftBlockTypes2["StickyPistonArmCollision"] = "minecraft:sticky_piston_arm_collision";
  MinecraftBlockTypes2["Stone"] = "minecraft:stone";
  MinecraftBlockTypes2["StoneBrickDoubleSlab"] = "minecraft:stone_brick_double_slab";
  MinecraftBlockTypes2["StoneBrickSlab"] = "minecraft:stone_brick_slab";
  MinecraftBlockTypes2["StoneBrickStairs"] = "minecraft:stone_brick_stairs";
  MinecraftBlockTypes2["StoneBrickWall"] = "minecraft:stone_brick_wall";
  MinecraftBlockTypes2["StoneBricks"] = "minecraft:stone_bricks";
  MinecraftBlockTypes2["StoneButton"] = "minecraft:stone_button";
  MinecraftBlockTypes2["StonePressurePlate"] = "minecraft:stone_pressure_plate";
  MinecraftBlockTypes2["StoneStairs"] = "minecraft:stone_stairs";
  MinecraftBlockTypes2["StonecutterBlock"] = "minecraft:stonecutter_block";
  MinecraftBlockTypes2["StrippedAcaciaLog"] = "minecraft:stripped_acacia_log";
  MinecraftBlockTypes2["StrippedAcaciaWood"] = "minecraft:stripped_acacia_wood";
  MinecraftBlockTypes2["StrippedBambooBlock"] = "minecraft:stripped_bamboo_block";
  MinecraftBlockTypes2["StrippedBirchLog"] = "minecraft:stripped_birch_log";
  MinecraftBlockTypes2["StrippedBirchWood"] = "minecraft:stripped_birch_wood";
  MinecraftBlockTypes2["StrippedCherryLog"] = "minecraft:stripped_cherry_log";
  MinecraftBlockTypes2["StrippedCherryWood"] = "minecraft:stripped_cherry_wood";
  MinecraftBlockTypes2["StrippedCrimsonHyphae"] = "minecraft:stripped_crimson_hyphae";
  MinecraftBlockTypes2["StrippedCrimsonStem"] = "minecraft:stripped_crimson_stem";
  MinecraftBlockTypes2["StrippedDarkOakLog"] = "minecraft:stripped_dark_oak_log";
  MinecraftBlockTypes2["StrippedDarkOakWood"] = "minecraft:stripped_dark_oak_wood";
  MinecraftBlockTypes2["StrippedJungleLog"] = "minecraft:stripped_jungle_log";
  MinecraftBlockTypes2["StrippedJungleWood"] = "minecraft:stripped_jungle_wood";
  MinecraftBlockTypes2["StrippedMangroveLog"] = "minecraft:stripped_mangrove_log";
  MinecraftBlockTypes2["StrippedMangroveWood"] = "minecraft:stripped_mangrove_wood";
  MinecraftBlockTypes2["StrippedOakLog"] = "minecraft:stripped_oak_log";
  MinecraftBlockTypes2["StrippedOakWood"] = "minecraft:stripped_oak_wood";
  MinecraftBlockTypes2["StrippedPaleOakLog"] = "minecraft:stripped_pale_oak_log";
  MinecraftBlockTypes2["StrippedPaleOakWood"] = "minecraft:stripped_pale_oak_wood";
  MinecraftBlockTypes2["StrippedSpruceLog"] = "minecraft:stripped_spruce_log";
  MinecraftBlockTypes2["StrippedSpruceWood"] = "minecraft:stripped_spruce_wood";
  MinecraftBlockTypes2["StrippedWarpedHyphae"] = "minecraft:stripped_warped_hyphae";
  MinecraftBlockTypes2["StrippedWarpedStem"] = "minecraft:stripped_warped_stem";
  MinecraftBlockTypes2["StructureBlock"] = "minecraft:structure_block";
  MinecraftBlockTypes2["StructureVoid"] = "minecraft:structure_void";
  MinecraftBlockTypes2["Sunflower"] = "minecraft:sunflower";
  MinecraftBlockTypes2["SuspiciousGravel"] = "minecraft:suspicious_gravel";
  MinecraftBlockTypes2["SuspiciousSand"] = "minecraft:suspicious_sand";
  MinecraftBlockTypes2["SweetBerryBush"] = "minecraft:sweet_berry_bush";
  MinecraftBlockTypes2["TallDryGrass"] = "minecraft:tall_dry_grass";
  MinecraftBlockTypes2["TallGrass"] = "minecraft:tall_grass";
  MinecraftBlockTypes2["Target"] = "minecraft:target";
  MinecraftBlockTypes2["TintedGlass"] = "minecraft:tinted_glass";
  MinecraftBlockTypes2["Tnt"] = "minecraft:tnt";
  MinecraftBlockTypes2["Torch"] = "minecraft:torch";
  MinecraftBlockTypes2["Torchflower"] = "minecraft:torchflower";
  MinecraftBlockTypes2["TorchflowerCrop"] = "minecraft:torchflower_crop";
  MinecraftBlockTypes2["Trapdoor"] = "minecraft:trapdoor";
  MinecraftBlockTypes2["TrappedChest"] = "minecraft:trapped_chest";
  MinecraftBlockTypes2["TrialSpawner"] = "minecraft:trial_spawner";
  MinecraftBlockTypes2["TripWire"] = "minecraft:trip_wire";
  MinecraftBlockTypes2["TripwireHook"] = "minecraft:tripwire_hook";
  MinecraftBlockTypes2["TubeCoral"] = "minecraft:tube_coral";
  MinecraftBlockTypes2["TubeCoralBlock"] = "minecraft:tube_coral_block";
  MinecraftBlockTypes2["TubeCoralFan"] = "minecraft:tube_coral_fan";
  MinecraftBlockTypes2["TubeCoralWallFan"] = "minecraft:tube_coral_wall_fan";
  MinecraftBlockTypes2["Tuff"] = "minecraft:tuff";
  MinecraftBlockTypes2["TuffBrickDoubleSlab"] = "minecraft:tuff_brick_double_slab";
  MinecraftBlockTypes2["TuffBrickSlab"] = "minecraft:tuff_brick_slab";
  MinecraftBlockTypes2["TuffBrickStairs"] = "minecraft:tuff_brick_stairs";
  MinecraftBlockTypes2["TuffBrickWall"] = "minecraft:tuff_brick_wall";
  MinecraftBlockTypes2["TuffBricks"] = "minecraft:tuff_bricks";
  MinecraftBlockTypes2["TuffDoubleSlab"] = "minecraft:tuff_double_slab";
  MinecraftBlockTypes2["TuffSlab"] = "minecraft:tuff_slab";
  MinecraftBlockTypes2["TuffStairs"] = "minecraft:tuff_stairs";
  MinecraftBlockTypes2["TuffWall"] = "minecraft:tuff_wall";
  MinecraftBlockTypes2["TurtleEgg"] = "minecraft:turtle_egg";
  MinecraftBlockTypes2["TwistingVines"] = "minecraft:twisting_vines";
  MinecraftBlockTypes2["UnderwaterTnt"] = "minecraft:underwater_tnt";
  MinecraftBlockTypes2["UnderwaterTorch"] = "minecraft:underwater_torch";
  MinecraftBlockTypes2["UndyedShulkerBox"] = "minecraft:undyed_shulker_box";
  MinecraftBlockTypes2["Unknown"] = "minecraft:unknown";
  MinecraftBlockTypes2["UnlitRedstoneTorch"] = "minecraft:unlit_redstone_torch";
  MinecraftBlockTypes2["UnpoweredComparator"] = "minecraft:unpowered_comparator";
  MinecraftBlockTypes2["UnpoweredRepeater"] = "minecraft:unpowered_repeater";
  MinecraftBlockTypes2["Vault"] = "minecraft:vault";
  MinecraftBlockTypes2["VerdantFroglight"] = "minecraft:verdant_froglight";
  MinecraftBlockTypes2["Vine"] = "minecraft:vine";
  MinecraftBlockTypes2["WallBanner"] = "minecraft:wall_banner";
  MinecraftBlockTypes2["WallSign"] = "minecraft:wall_sign";
  MinecraftBlockTypes2["WarpedButton"] = "minecraft:warped_button";
  MinecraftBlockTypes2["WarpedDoor"] = "minecraft:warped_door";
  MinecraftBlockTypes2["WarpedDoubleSlab"] = "minecraft:warped_double_slab";
  MinecraftBlockTypes2["WarpedFence"] = "minecraft:warped_fence";
  MinecraftBlockTypes2["WarpedFenceGate"] = "minecraft:warped_fence_gate";
  MinecraftBlockTypes2["WarpedFungus"] = "minecraft:warped_fungus";
  MinecraftBlockTypes2["WarpedHangingSign"] = "minecraft:warped_hanging_sign";
  MinecraftBlockTypes2["WarpedHyphae"] = "minecraft:warped_hyphae";
  MinecraftBlockTypes2["WarpedNylium"] = "minecraft:warped_nylium";
  MinecraftBlockTypes2["WarpedPlanks"] = "minecraft:warped_planks";
  MinecraftBlockTypes2["WarpedPressurePlate"] = "minecraft:warped_pressure_plate";
  MinecraftBlockTypes2["WarpedRoots"] = "minecraft:warped_roots";
  MinecraftBlockTypes2["WarpedShelf"] = "minecraft:warped_shelf";
  MinecraftBlockTypes2["WarpedSlab"] = "minecraft:warped_slab";
  MinecraftBlockTypes2["WarpedStairs"] = "minecraft:warped_stairs";
  MinecraftBlockTypes2["WarpedStandingSign"] = "minecraft:warped_standing_sign";
  MinecraftBlockTypes2["WarpedStem"] = "minecraft:warped_stem";
  MinecraftBlockTypes2["WarpedTrapdoor"] = "minecraft:warped_trapdoor";
  MinecraftBlockTypes2["WarpedWallSign"] = "minecraft:warped_wall_sign";
  MinecraftBlockTypes2["WarpedWartBlock"] = "minecraft:warped_wart_block";
  MinecraftBlockTypes2["Water"] = "minecraft:water";
  MinecraftBlockTypes2["Waterlily"] = "minecraft:waterlily";
  MinecraftBlockTypes2["WaxedChiseledCopper"] = "minecraft:waxed_chiseled_copper";
  MinecraftBlockTypes2["WaxedCopper"] = "minecraft:waxed_copper";
  MinecraftBlockTypes2["WaxedCopperBars"] = "minecraft:waxed_copper_bars";
  MinecraftBlockTypes2["WaxedCopperBulb"] = "minecraft:waxed_copper_bulb";
  MinecraftBlockTypes2["WaxedCopperChain"] = "minecraft:waxed_copper_chain";
  MinecraftBlockTypes2["WaxedCopperChest"] = "minecraft:waxed_copper_chest";
  MinecraftBlockTypes2["WaxedCopperDoor"] = "minecraft:waxed_copper_door";
  MinecraftBlockTypes2["WaxedCopperGolemStatue"] = "minecraft:waxed_copper_golem_statue";
  MinecraftBlockTypes2["WaxedCopperGrate"] = "minecraft:waxed_copper_grate";
  MinecraftBlockTypes2["WaxedCopperLantern"] = "minecraft:waxed_copper_lantern";
  MinecraftBlockTypes2["WaxedCopperTrapdoor"] = "minecraft:waxed_copper_trapdoor";
  MinecraftBlockTypes2["WaxedCutCopper"] = "minecraft:waxed_cut_copper";
  MinecraftBlockTypes2["WaxedCutCopperSlab"] = "minecraft:waxed_cut_copper_slab";
  MinecraftBlockTypes2["WaxedCutCopperStairs"] = "minecraft:waxed_cut_copper_stairs";
  MinecraftBlockTypes2["WaxedDoubleCutCopperSlab"] = "minecraft:waxed_double_cut_copper_slab";
  MinecraftBlockTypes2["WaxedExposedChiseledCopper"] = "minecraft:waxed_exposed_chiseled_copper";
  MinecraftBlockTypes2["WaxedExposedCopper"] = "minecraft:waxed_exposed_copper";
  MinecraftBlockTypes2["WaxedExposedCopperBars"] = "minecraft:waxed_exposed_copper_bars";
  MinecraftBlockTypes2["WaxedExposedCopperBulb"] = "minecraft:waxed_exposed_copper_bulb";
  MinecraftBlockTypes2["WaxedExposedCopperChain"] = "minecraft:waxed_exposed_copper_chain";
  MinecraftBlockTypes2["WaxedExposedCopperChest"] = "minecraft:waxed_exposed_copper_chest";
  MinecraftBlockTypes2["WaxedExposedCopperDoor"] = "minecraft:waxed_exposed_copper_door";
  MinecraftBlockTypes2["WaxedExposedCopperGolemStatue"] = "minecraft:waxed_exposed_copper_golem_statue";
  MinecraftBlockTypes2["WaxedExposedCopperGrate"] = "minecraft:waxed_exposed_copper_grate";
  MinecraftBlockTypes2["WaxedExposedCopperLantern"] = "minecraft:waxed_exposed_copper_lantern";
  MinecraftBlockTypes2["WaxedExposedCopperTrapdoor"] = "minecraft:waxed_exposed_copper_trapdoor";
  MinecraftBlockTypes2["WaxedExposedCutCopper"] = "minecraft:waxed_exposed_cut_copper";
  MinecraftBlockTypes2["WaxedExposedCutCopperSlab"] = "minecraft:waxed_exposed_cut_copper_slab";
  MinecraftBlockTypes2["WaxedExposedCutCopperStairs"] = "minecraft:waxed_exposed_cut_copper_stairs";
  MinecraftBlockTypes2["WaxedExposedDoubleCutCopperSlab"] = "minecraft:waxed_exposed_double_cut_copper_slab";
  MinecraftBlockTypes2["WaxedExposedLightningRod"] = "minecraft:waxed_exposed_lightning_rod";
  MinecraftBlockTypes2["WaxedLightningRod"] = "minecraft:waxed_lightning_rod";
  MinecraftBlockTypes2["WaxedOxidizedChiseledCopper"] = "minecraft:waxed_oxidized_chiseled_copper";
  MinecraftBlockTypes2["WaxedOxidizedCopper"] = "minecraft:waxed_oxidized_copper";
  MinecraftBlockTypes2["WaxedOxidizedCopperBars"] = "minecraft:waxed_oxidized_copper_bars";
  MinecraftBlockTypes2["WaxedOxidizedCopperBulb"] = "minecraft:waxed_oxidized_copper_bulb";
  MinecraftBlockTypes2["WaxedOxidizedCopperChain"] = "minecraft:waxed_oxidized_copper_chain";
  MinecraftBlockTypes2["WaxedOxidizedCopperChest"] = "minecraft:waxed_oxidized_copper_chest";
  MinecraftBlockTypes2["WaxedOxidizedCopperDoor"] = "minecraft:waxed_oxidized_copper_door";
  MinecraftBlockTypes2["WaxedOxidizedCopperGolemStatue"] = "minecraft:waxed_oxidized_copper_golem_statue";
  MinecraftBlockTypes2["WaxedOxidizedCopperGrate"] = "minecraft:waxed_oxidized_copper_grate";
  MinecraftBlockTypes2["WaxedOxidizedCopperLantern"] = "minecraft:waxed_oxidized_copper_lantern";
  MinecraftBlockTypes2["WaxedOxidizedCopperTrapdoor"] = "minecraft:waxed_oxidized_copper_trapdoor";
  MinecraftBlockTypes2["WaxedOxidizedCutCopper"] = "minecraft:waxed_oxidized_cut_copper";
  MinecraftBlockTypes2["WaxedOxidizedCutCopperSlab"] = "minecraft:waxed_oxidized_cut_copper_slab";
  MinecraftBlockTypes2["WaxedOxidizedCutCopperStairs"] = "minecraft:waxed_oxidized_cut_copper_stairs";
  MinecraftBlockTypes2["WaxedOxidizedDoubleCutCopperSlab"] = "minecraft:waxed_oxidized_double_cut_copper_slab";
  MinecraftBlockTypes2["WaxedOxidizedLightningRod"] = "minecraft:waxed_oxidized_lightning_rod";
  MinecraftBlockTypes2["WaxedWeatheredChiseledCopper"] = "minecraft:waxed_weathered_chiseled_copper";
  MinecraftBlockTypes2["WaxedWeatheredCopper"] = "minecraft:waxed_weathered_copper";
  MinecraftBlockTypes2["WaxedWeatheredCopperBars"] = "minecraft:waxed_weathered_copper_bars";
  MinecraftBlockTypes2["WaxedWeatheredCopperBulb"] = "minecraft:waxed_weathered_copper_bulb";
  MinecraftBlockTypes2["WaxedWeatheredCopperChain"] = "minecraft:waxed_weathered_copper_chain";
  MinecraftBlockTypes2["WaxedWeatheredCopperChest"] = "minecraft:waxed_weathered_copper_chest";
  MinecraftBlockTypes2["WaxedWeatheredCopperDoor"] = "minecraft:waxed_weathered_copper_door";
  MinecraftBlockTypes2["WaxedWeatheredCopperGolemStatue"] = "minecraft:waxed_weathered_copper_golem_statue";
  MinecraftBlockTypes2["WaxedWeatheredCopperGrate"] = "minecraft:waxed_weathered_copper_grate";
  MinecraftBlockTypes2["WaxedWeatheredCopperLantern"] = "minecraft:waxed_weathered_copper_lantern";
  MinecraftBlockTypes2["WaxedWeatheredCopperTrapdoor"] = "minecraft:waxed_weathered_copper_trapdoor";
  MinecraftBlockTypes2["WaxedWeatheredCutCopper"] = "minecraft:waxed_weathered_cut_copper";
  MinecraftBlockTypes2["WaxedWeatheredCutCopperSlab"] = "minecraft:waxed_weathered_cut_copper_slab";
  MinecraftBlockTypes2["WaxedWeatheredCutCopperStairs"] = "minecraft:waxed_weathered_cut_copper_stairs";
  MinecraftBlockTypes2["WaxedWeatheredDoubleCutCopperSlab"] = "minecraft:waxed_weathered_double_cut_copper_slab";
  MinecraftBlockTypes2["WaxedWeatheredLightningRod"] = "minecraft:waxed_weathered_lightning_rod";
  MinecraftBlockTypes2["WeatheredChiseledCopper"] = "minecraft:weathered_chiseled_copper";
  MinecraftBlockTypes2["WeatheredCopper"] = "minecraft:weathered_copper";
  MinecraftBlockTypes2["WeatheredCopperBars"] = "minecraft:weathered_copper_bars";
  MinecraftBlockTypes2["WeatheredCopperBulb"] = "minecraft:weathered_copper_bulb";
  MinecraftBlockTypes2["WeatheredCopperChain"] = "minecraft:weathered_copper_chain";
  MinecraftBlockTypes2["WeatheredCopperChest"] = "minecraft:weathered_copper_chest";
  MinecraftBlockTypes2["WeatheredCopperDoor"] = "minecraft:weathered_copper_door";
  MinecraftBlockTypes2["WeatheredCopperGolemStatue"] = "minecraft:weathered_copper_golem_statue";
  MinecraftBlockTypes2["WeatheredCopperGrate"] = "minecraft:weathered_copper_grate";
  MinecraftBlockTypes2["WeatheredCopperLantern"] = "minecraft:weathered_copper_lantern";
  MinecraftBlockTypes2["WeatheredCopperTrapdoor"] = "minecraft:weathered_copper_trapdoor";
  MinecraftBlockTypes2["WeatheredCutCopper"] = "minecraft:weathered_cut_copper";
  MinecraftBlockTypes2["WeatheredCutCopperSlab"] = "minecraft:weathered_cut_copper_slab";
  MinecraftBlockTypes2["WeatheredCutCopperStairs"] = "minecraft:weathered_cut_copper_stairs";
  MinecraftBlockTypes2["WeatheredDoubleCutCopperSlab"] = "minecraft:weathered_double_cut_copper_slab";
  MinecraftBlockTypes2["WeatheredLightningRod"] = "minecraft:weathered_lightning_rod";
  MinecraftBlockTypes2["Web"] = "minecraft:web";
  MinecraftBlockTypes2["WeepingVines"] = "minecraft:weeping_vines";
  MinecraftBlockTypes2["WetSponge"] = "minecraft:wet_sponge";
  MinecraftBlockTypes2["Wheat"] = "minecraft:wheat";
  MinecraftBlockTypes2["WhiteCandle"] = "minecraft:white_candle";
  MinecraftBlockTypes2["WhiteCandleCake"] = "minecraft:white_candle_cake";
  MinecraftBlockTypes2["WhiteCarpet"] = "minecraft:white_carpet";
  MinecraftBlockTypes2["WhiteConcrete"] = "minecraft:white_concrete";
  MinecraftBlockTypes2["WhiteConcretePowder"] = "minecraft:white_concrete_powder";
  MinecraftBlockTypes2["WhiteGlazedTerracotta"] = "minecraft:white_glazed_terracotta";
  MinecraftBlockTypes2["WhiteShulkerBox"] = "minecraft:white_shulker_box";
  MinecraftBlockTypes2["WhiteStainedGlass"] = "minecraft:white_stained_glass";
  MinecraftBlockTypes2["WhiteStainedGlassPane"] = "minecraft:white_stained_glass_pane";
  MinecraftBlockTypes2["WhiteTerracotta"] = "minecraft:white_terracotta";
  MinecraftBlockTypes2["WhiteTulip"] = "minecraft:white_tulip";
  MinecraftBlockTypes2["WhiteWool"] = "minecraft:white_wool";
  MinecraftBlockTypes2["Wildflowers"] = "minecraft:wildflowers";
  MinecraftBlockTypes2["WitherRose"] = "minecraft:wither_rose";
  MinecraftBlockTypes2["WitherSkeletonSkull"] = "minecraft:wither_skeleton_skull";
  MinecraftBlockTypes2["WoodenButton"] = "minecraft:wooden_button";
  MinecraftBlockTypes2["WoodenDoor"] = "minecraft:wooden_door";
  MinecraftBlockTypes2["WoodenPressurePlate"] = "minecraft:wooden_pressure_plate";
  MinecraftBlockTypes2["YellowCandle"] = "minecraft:yellow_candle";
  MinecraftBlockTypes2["YellowCandleCake"] = "minecraft:yellow_candle_cake";
  MinecraftBlockTypes2["YellowCarpet"] = "minecraft:yellow_carpet";
  MinecraftBlockTypes2["YellowConcrete"] = "minecraft:yellow_concrete";
  MinecraftBlockTypes2["YellowConcretePowder"] = "minecraft:yellow_concrete_powder";
  MinecraftBlockTypes2["YellowGlazedTerracotta"] = "minecraft:yellow_glazed_terracotta";
  MinecraftBlockTypes2["YellowShulkerBox"] = "minecraft:yellow_shulker_box";
  MinecraftBlockTypes2["YellowStainedGlass"] = "minecraft:yellow_stained_glass";
  MinecraftBlockTypes2["YellowStainedGlassPane"] = "minecraft:yellow_stained_glass_pane";
  MinecraftBlockTypes2["YellowTerracotta"] = "minecraft:yellow_terracotta";
  MinecraftBlockTypes2["YellowWool"] = "minecraft:yellow_wool";
  MinecraftBlockTypes2["ZombieHead"] = "minecraft:zombie_head";
  return MinecraftBlockTypes2;
})(MinecraftBlockTypes || {});
var MinecraftCameraPresetsTypes = ((MinecraftCameraPresetsTypes2) => {
  MinecraftCameraPresetsTypes2["ControlSchemeCamera"] = "minecraft:control_scheme_camera";
  MinecraftCameraPresetsTypes2["FirstPerson"] = "minecraft:first_person";
  MinecraftCameraPresetsTypes2["FixedBoom"] = "minecraft:fixed_boom";
  MinecraftCameraPresetsTypes2["FollowOrbit"] = "minecraft:follow_orbit";
  MinecraftCameraPresetsTypes2["Free"] = "minecraft:free";
  MinecraftCameraPresetsTypes2["ThirdPerson"] = "minecraft:third_person";
  MinecraftCameraPresetsTypes2["ThirdPersonFront"] = "minecraft:third_person_front";
  return MinecraftCameraPresetsTypes2;
})(MinecraftCameraPresetsTypes || {});
var MinecraftCooldownCategoryTypes = ((MinecraftCooldownCategoryTypes2) => {
  MinecraftCooldownCategoryTypes2["Chorusfruit"] = "minecraft:chorusfruit";
  MinecraftCooldownCategoryTypes2["EnderPearl"] = "minecraft:ender_pearl";
  MinecraftCooldownCategoryTypes2["GoatHorn"] = "minecraft:goat_horn";
  MinecraftCooldownCategoryTypes2["Shield"] = "minecraft:shield";
  MinecraftCooldownCategoryTypes2["Spear"] = "minecraft:spear";
  MinecraftCooldownCategoryTypes2["WindCharge"] = "minecraft:wind_charge";
  return MinecraftCooldownCategoryTypes2;
})(MinecraftCooldownCategoryTypes || {});
var MinecraftDimensionTypes = ((MinecraftDimensionTypes2) => {
  MinecraftDimensionTypes2["Nether"] = "minecraft:nether";
  MinecraftDimensionTypes2["Overworld"] = "minecraft:overworld";
  MinecraftDimensionTypes2["TheEnd"] = "minecraft:the_end";
  return MinecraftDimensionTypes2;
})(MinecraftDimensionTypes || {});
var MinecraftEffectTypes = ((MinecraftEffectTypes2) => {
  MinecraftEffectTypes2["Absorption"] = "minecraft:absorption";
  MinecraftEffectTypes2["BadOmen"] = "minecraft:bad_omen";
  MinecraftEffectTypes2["Blindness"] = "minecraft:blindness";
  MinecraftEffectTypes2["BreathOfTheNautilus"] = "minecraft:breath_of_the_nautilus";
  MinecraftEffectTypes2["ConduitPower"] = "minecraft:conduit_power";
  MinecraftEffectTypes2["Darkness"] = "minecraft:darkness";
  MinecraftEffectTypes2["FatalPoison"] = "minecraft:fatal_poison";
  MinecraftEffectTypes2["FireResistance"] = "minecraft:fire_resistance";
  MinecraftEffectTypes2["Haste"] = "minecraft:haste";
  MinecraftEffectTypes2["HealthBoost"] = "minecraft:health_boost";
  MinecraftEffectTypes2["Hunger"] = "minecraft:hunger";
  MinecraftEffectTypes2["Infested"] = "minecraft:infested";
  MinecraftEffectTypes2["InstantDamage"] = "minecraft:instant_damage";
  MinecraftEffectTypes2["InstantHealth"] = "minecraft:instant_health";
  MinecraftEffectTypes2["Invisibility"] = "minecraft:invisibility";
  MinecraftEffectTypes2["JumpBoost"] = "minecraft:jump_boost";
  MinecraftEffectTypes2["Levitation"] = "minecraft:levitation";
  MinecraftEffectTypes2["MiningFatigue"] = "minecraft:mining_fatigue";
  MinecraftEffectTypes2["Nausea"] = "minecraft:nausea";
  MinecraftEffectTypes2["NightVision"] = "minecraft:night_vision";
  MinecraftEffectTypes2["Oozing"] = "minecraft:oozing";
  MinecraftEffectTypes2["Poison"] = "minecraft:poison";
  MinecraftEffectTypes2["RaidOmen"] = "minecraft:raid_omen";
  MinecraftEffectTypes2["Regeneration"] = "minecraft:regeneration";
  MinecraftEffectTypes2["Resistance"] = "minecraft:resistance";
  MinecraftEffectTypes2["Saturation"] = "minecraft:saturation";
  MinecraftEffectTypes2["SlowFalling"] = "minecraft:slow_falling";
  MinecraftEffectTypes2["Slowness"] = "minecraft:slowness";
  MinecraftEffectTypes2["Speed"] = "minecraft:speed";
  MinecraftEffectTypes2["Strength"] = "minecraft:strength";
  MinecraftEffectTypes2["TrialOmen"] = "minecraft:trial_omen";
  MinecraftEffectTypes2["VillageHero"] = "minecraft:village_hero";
  MinecraftEffectTypes2["WaterBreathing"] = "minecraft:water_breathing";
  MinecraftEffectTypes2["Weakness"] = "minecraft:weakness";
  MinecraftEffectTypes2["Weaving"] = "minecraft:weaving";
  MinecraftEffectTypes2["WindCharged"] = "minecraft:wind_charged";
  MinecraftEffectTypes2["Wither"] = "minecraft:wither";
  return MinecraftEffectTypes2;
})(MinecraftEffectTypes || {});
var MinecraftEnchantmentTypes = ((MinecraftEnchantmentTypes2) => {
  MinecraftEnchantmentTypes2["AquaAffinity"] = "minecraft:aqua_affinity";
  MinecraftEnchantmentTypes2["BaneOfArthropods"] = "minecraft:bane_of_arthropods";
  MinecraftEnchantmentTypes2["Binding"] = "minecraft:binding";
  MinecraftEnchantmentTypes2["BlastProtection"] = "minecraft:blast_protection";
  MinecraftEnchantmentTypes2["BowInfinity"] = "minecraft:infinity";
  MinecraftEnchantmentTypes2["Breach"] = "minecraft:breach";
  MinecraftEnchantmentTypes2["Channeling"] = "minecraft:channeling";
  MinecraftEnchantmentTypes2["Density"] = "minecraft:density";
  MinecraftEnchantmentTypes2["DepthStrider"] = "minecraft:depth_strider";
  MinecraftEnchantmentTypes2["Efficiency"] = "minecraft:efficiency";
  MinecraftEnchantmentTypes2["FeatherFalling"] = "minecraft:feather_falling";
  MinecraftEnchantmentTypes2["FireAspect"] = "minecraft:fire_aspect";
  MinecraftEnchantmentTypes2["FireProtection"] = "minecraft:fire_protection";
  MinecraftEnchantmentTypes2["Flame"] = "minecraft:flame";
  MinecraftEnchantmentTypes2["Fortune"] = "minecraft:fortune";
  MinecraftEnchantmentTypes2["FrostWalker"] = "minecraft:frost_walker";
  MinecraftEnchantmentTypes2["Impaling"] = "minecraft:impaling";
  MinecraftEnchantmentTypes2["Knockback"] = "minecraft:knockback";
  MinecraftEnchantmentTypes2["Looting"] = "minecraft:looting";
  MinecraftEnchantmentTypes2["Loyalty"] = "minecraft:loyalty";
  MinecraftEnchantmentTypes2["LuckOfTheSea"] = "minecraft:luck_of_the_sea";
  MinecraftEnchantmentTypes2["Lunge"] = "minecraft:lunge";
  MinecraftEnchantmentTypes2["Lure"] = "minecraft:lure";
  MinecraftEnchantmentTypes2["Mending"] = "minecraft:mending";
  MinecraftEnchantmentTypes2["Multishot"] = "minecraft:multishot";
  MinecraftEnchantmentTypes2["Piercing"] = "minecraft:piercing";
  MinecraftEnchantmentTypes2["Power"] = "minecraft:power";
  MinecraftEnchantmentTypes2["ProjectileProtection"] = "minecraft:projectile_protection";
  MinecraftEnchantmentTypes2["Protection"] = "minecraft:protection";
  MinecraftEnchantmentTypes2["Punch"] = "minecraft:punch";
  MinecraftEnchantmentTypes2["QuickCharge"] = "minecraft:quick_charge";
  MinecraftEnchantmentTypes2["Respiration"] = "minecraft:respiration";
  MinecraftEnchantmentTypes2["Riptide"] = "minecraft:riptide";
  MinecraftEnchantmentTypes2["Sharpness"] = "minecraft:sharpness";
  MinecraftEnchantmentTypes2["SilkTouch"] = "minecraft:silk_touch";
  MinecraftEnchantmentTypes2["Smite"] = "minecraft:smite";
  MinecraftEnchantmentTypes2["SoulSpeed"] = "minecraft:soul_speed";
  MinecraftEnchantmentTypes2["SwiftSneak"] = "minecraft:swift_sneak";
  MinecraftEnchantmentTypes2["Thorns"] = "minecraft:thorns";
  MinecraftEnchantmentTypes2["Unbreaking"] = "minecraft:unbreaking";
  MinecraftEnchantmentTypes2["Vanishing"] = "minecraft:vanishing";
  MinecraftEnchantmentTypes2["WindBurst"] = "minecraft:wind_burst";
  return MinecraftEnchantmentTypes2;
})(MinecraftEnchantmentTypes || {});
var MinecraftEntityTypes = ((MinecraftEntityTypes2) => {
  MinecraftEntityTypes2["Agent"] = "minecraft:agent";
  MinecraftEntityTypes2["Allay"] = "minecraft:allay";
  MinecraftEntityTypes2["AreaEffectCloud"] = "minecraft:area_effect_cloud";
  MinecraftEntityTypes2["Armadillo"] = "minecraft:armadillo";
  MinecraftEntityTypes2["ArmorStand"] = "minecraft:armor_stand";
  MinecraftEntityTypes2["Arrow"] = "minecraft:arrow";
  MinecraftEntityTypes2["Axolotl"] = "minecraft:axolotl";
  MinecraftEntityTypes2["Bat"] = "minecraft:bat";
  MinecraftEntityTypes2["Bee"] = "minecraft:bee";
  MinecraftEntityTypes2["Blaze"] = "minecraft:blaze";
  MinecraftEntityTypes2["Boat"] = "minecraft:boat";
  MinecraftEntityTypes2["Bogged"] = "minecraft:bogged";
  MinecraftEntityTypes2["Breeze"] = "minecraft:breeze";
  MinecraftEntityTypes2["BreezeWindChargeProjectile"] = "minecraft:breeze_wind_charge_projectile";
  MinecraftEntityTypes2["Camel"] = "minecraft:camel";
  MinecraftEntityTypes2["CamelHusk"] = "minecraft:camel_husk";
  MinecraftEntityTypes2["Cat"] = "minecraft:cat";
  MinecraftEntityTypes2["CaveSpider"] = "minecraft:cave_spider";
  MinecraftEntityTypes2["ChestBoat"] = "minecraft:chest_boat";
  MinecraftEntityTypes2["ChestMinecart"] = "minecraft:chest_minecart";
  MinecraftEntityTypes2["Chicken"] = "minecraft:chicken";
  MinecraftEntityTypes2["Cod"] = "minecraft:cod";
  MinecraftEntityTypes2["CommandBlockMinecart"] = "minecraft:command_block_minecart";
  MinecraftEntityTypes2["CopperGolem"] = "minecraft:copper_golem";
  MinecraftEntityTypes2["Cow"] = "minecraft:cow";
  MinecraftEntityTypes2["Creaking"] = "minecraft:creaking";
  MinecraftEntityTypes2["Creeper"] = "minecraft:creeper";
  MinecraftEntityTypes2["Dolphin"] = "minecraft:dolphin";
  MinecraftEntityTypes2["Donkey"] = "minecraft:donkey";
  MinecraftEntityTypes2["DragonFireball"] = "minecraft:dragon_fireball";
  MinecraftEntityTypes2["Drowned"] = "minecraft:drowned";
  MinecraftEntityTypes2["Egg"] = "minecraft:egg";
  MinecraftEntityTypes2["ElderGuardian"] = "minecraft:elder_guardian";
  MinecraftEntityTypes2["EnderCrystal"] = "minecraft:ender_crystal";
  MinecraftEntityTypes2["EnderDragon"] = "minecraft:ender_dragon";
  MinecraftEntityTypes2["EnderPearl"] = "minecraft:ender_pearl";
  MinecraftEntityTypes2["Enderman"] = "minecraft:enderman";
  MinecraftEntityTypes2["Endermite"] = "minecraft:endermite";
  MinecraftEntityTypes2["EvocationIllager"] = "minecraft:evocation_illager";
  MinecraftEntityTypes2["EyeOfEnderSignal"] = "minecraft:eye_of_ender_signal";
  MinecraftEntityTypes2["Fireball"] = "minecraft:fireball";
  MinecraftEntityTypes2["FireworksRocket"] = "minecraft:fireworks_rocket";
  MinecraftEntityTypes2["FishingHook"] = "minecraft:fishing_hook";
  MinecraftEntityTypes2["Fox"] = "minecraft:fox";
  MinecraftEntityTypes2["Frog"] = "minecraft:frog";
  MinecraftEntityTypes2["Ghast"] = "minecraft:ghast";
  MinecraftEntityTypes2["GlowSquid"] = "minecraft:glow_squid";
  MinecraftEntityTypes2["Goat"] = "minecraft:goat";
  MinecraftEntityTypes2["Guardian"] = "minecraft:guardian";
  MinecraftEntityTypes2["HappyGhast"] = "minecraft:happy_ghast";
  MinecraftEntityTypes2["Hoglin"] = "minecraft:hoglin";
  MinecraftEntityTypes2["HopperMinecart"] = "minecraft:hopper_minecart";
  MinecraftEntityTypes2["Horse"] = "minecraft:horse";
  MinecraftEntityTypes2["Husk"] = "minecraft:husk";
  MinecraftEntityTypes2["IronGolem"] = "minecraft:iron_golem";
  MinecraftEntityTypes2["LightningBolt"] = "minecraft:lightning_bolt";
  MinecraftEntityTypes2["LingeringPotion"] = "minecraft:lingering_potion";
  MinecraftEntityTypes2["Llama"] = "minecraft:llama";
  MinecraftEntityTypes2["LlamaSpit"] = "minecraft:llama_spit";
  MinecraftEntityTypes2["MagmaCube"] = "minecraft:magma_cube";
  MinecraftEntityTypes2["Minecart"] = "minecraft:minecart";
  MinecraftEntityTypes2["Mooshroom"] = "minecraft:mooshroom";
  MinecraftEntityTypes2["Mule"] = "minecraft:mule";
  MinecraftEntityTypes2["Nautilus"] = "minecraft:nautilus";
  MinecraftEntityTypes2["Npc"] = "minecraft:npc";
  MinecraftEntityTypes2["Ocelot"] = "minecraft:ocelot";
  MinecraftEntityTypes2["OminousItemSpawner"] = "minecraft:ominous_item_spawner";
  MinecraftEntityTypes2["Panda"] = "minecraft:panda";
  MinecraftEntityTypes2["Parched"] = "minecraft:parched";
  MinecraftEntityTypes2["Parrot"] = "minecraft:parrot";
  MinecraftEntityTypes2["Phantom"] = "minecraft:phantom";
  MinecraftEntityTypes2["Pig"] = "minecraft:pig";
  MinecraftEntityTypes2["Piglin"] = "minecraft:piglin";
  MinecraftEntityTypes2["PiglinBrute"] = "minecraft:piglin_brute";
  MinecraftEntityTypes2["Pillager"] = "minecraft:pillager";
  MinecraftEntityTypes2["Player"] = "minecraft:player";
  MinecraftEntityTypes2["PolarBear"] = "minecraft:polar_bear";
  MinecraftEntityTypes2["Pufferfish"] = "minecraft:pufferfish";
  MinecraftEntityTypes2["Rabbit"] = "minecraft:rabbit";
  MinecraftEntityTypes2["Ravager"] = "minecraft:ravager";
  MinecraftEntityTypes2["Salmon"] = "minecraft:salmon";
  MinecraftEntityTypes2["Sheep"] = "minecraft:sheep";
  MinecraftEntityTypes2["Shulker"] = "minecraft:shulker";
  MinecraftEntityTypes2["ShulkerBullet"] = "minecraft:shulker_bullet";
  MinecraftEntityTypes2["Silverfish"] = "minecraft:silverfish";
  MinecraftEntityTypes2["Skeleton"] = "minecraft:skeleton";
  MinecraftEntityTypes2["SkeletonHorse"] = "minecraft:skeleton_horse";
  MinecraftEntityTypes2["Slime"] = "minecraft:slime";
  MinecraftEntityTypes2["SmallFireball"] = "minecraft:small_fireball";
  MinecraftEntityTypes2["Sniffer"] = "minecraft:sniffer";
  MinecraftEntityTypes2["SnowGolem"] = "minecraft:snow_golem";
  MinecraftEntityTypes2["Snowball"] = "minecraft:snowball";
  MinecraftEntityTypes2["Spider"] = "minecraft:spider";
  MinecraftEntityTypes2["SplashPotion"] = "minecraft:splash_potion";
  MinecraftEntityTypes2["Squid"] = "minecraft:squid";
  MinecraftEntityTypes2["Stray"] = "minecraft:stray";
  MinecraftEntityTypes2["Strider"] = "minecraft:strider";
  MinecraftEntityTypes2["Tadpole"] = "minecraft:tadpole";
  MinecraftEntityTypes2["ThrownTrident"] = "minecraft:thrown_trident";
  MinecraftEntityTypes2["Tnt"] = "minecraft:tnt";
  MinecraftEntityTypes2["TntMinecart"] = "minecraft:tnt_minecart";
  MinecraftEntityTypes2["TraderLlama"] = "minecraft:trader_llama";
  MinecraftEntityTypes2["TripodCamera"] = "minecraft:tripod_camera";
  MinecraftEntityTypes2["Tropicalfish"] = "minecraft:tropicalfish";
  MinecraftEntityTypes2["Turtle"] = "minecraft:turtle";
  MinecraftEntityTypes2["Vex"] = "minecraft:vex";
  MinecraftEntityTypes2["Villager"] = "minecraft:villager";
  MinecraftEntityTypes2["VillagerV2"] = "minecraft:villager_v2";
  MinecraftEntityTypes2["Vindicator"] = "minecraft:vindicator";
  MinecraftEntityTypes2["WanderingTrader"] = "minecraft:wandering_trader";
  MinecraftEntityTypes2["Warden"] = "minecraft:warden";
  MinecraftEntityTypes2["WindChargeProjectile"] = "minecraft:wind_charge_projectile";
  MinecraftEntityTypes2["Witch"] = "minecraft:witch";
  MinecraftEntityTypes2["Wither"] = "minecraft:wither";
  MinecraftEntityTypes2["WitherSkeleton"] = "minecraft:wither_skeleton";
  MinecraftEntityTypes2["WitherSkull"] = "minecraft:wither_skull";
  MinecraftEntityTypes2["WitherSkullDangerous"] = "minecraft:wither_skull_dangerous";
  MinecraftEntityTypes2["Wolf"] = "minecraft:wolf";
  MinecraftEntityTypes2["XpBottle"] = "minecraft:xp_bottle";
  MinecraftEntityTypes2["XpOrb"] = "minecraft:xp_orb";
  MinecraftEntityTypes2["Zoglin"] = "minecraft:zoglin";
  MinecraftEntityTypes2["Zombie"] = "minecraft:zombie";
  MinecraftEntityTypes2["ZombieHorse"] = "minecraft:zombie_horse";
  MinecraftEntityTypes2["ZombieNautilus"] = "minecraft:zombie_nautilus";
  MinecraftEntityTypes2["ZombiePigman"] = "minecraft:zombie_pigman";
  MinecraftEntityTypes2["ZombieVillager"] = "minecraft:zombie_villager";
  MinecraftEntityTypes2["ZombieVillagerV2"] = "minecraft:zombie_villager_v2";
  return MinecraftEntityTypes2;
})(MinecraftEntityTypes || {});
var MinecraftFeatureTypes = ((MinecraftFeatureTypes2) => {
  MinecraftFeatureTypes2["AncientCity"] = "minecraft:ancient_city";
  MinecraftFeatureTypes2["BastionRemnant"] = "minecraft:bastion_remnant";
  MinecraftFeatureTypes2["BuriedTreasure"] = "minecraft:buried_treasure";
  MinecraftFeatureTypes2["EndCity"] = "minecraft:end_city";
  MinecraftFeatureTypes2["Fortress"] = "minecraft:fortress";
  MinecraftFeatureTypes2["Mansion"] = "minecraft:mansion";
  MinecraftFeatureTypes2["Mineshaft"] = "minecraft:mineshaft";
  MinecraftFeatureTypes2["Monument"] = "minecraft:monument";
  MinecraftFeatureTypes2["PillagerOutpost"] = "minecraft:pillager_outpost";
  MinecraftFeatureTypes2["RuinedPortal"] = "minecraft:ruined_portal";
  MinecraftFeatureTypes2["Ruins"] = "minecraft:ruins";
  MinecraftFeatureTypes2["Shipwreck"] = "minecraft:shipwreck";
  MinecraftFeatureTypes2["Stronghold"] = "minecraft:stronghold";
  MinecraftFeatureTypes2["Temple"] = "minecraft:temple";
  MinecraftFeatureTypes2["TrailRuins"] = "minecraft:trail_ruins";
  MinecraftFeatureTypes2["TrialChambers"] = "minecraft:trial_chambers";
  MinecraftFeatureTypes2["Village"] = "minecraft:village";
  return MinecraftFeatureTypes2;
})(MinecraftFeatureTypes || {});
var MinecraftItemTypes = ((MinecraftItemTypes2) => {
  MinecraftItemTypes2["AcaciaBoat"] = "minecraft:acacia_boat";
  MinecraftItemTypes2["AcaciaButton"] = "minecraft:acacia_button";
  MinecraftItemTypes2["AcaciaChestBoat"] = "minecraft:acacia_chest_boat";
  MinecraftItemTypes2["AcaciaDoor"] = "minecraft:acacia_door";
  MinecraftItemTypes2["AcaciaFence"] = "minecraft:acacia_fence";
  MinecraftItemTypes2["AcaciaFenceGate"] = "minecraft:acacia_fence_gate";
  MinecraftItemTypes2["AcaciaHangingSign"] = "minecraft:acacia_hanging_sign";
  MinecraftItemTypes2["AcaciaLeaves"] = "minecraft:acacia_leaves";
  MinecraftItemTypes2["AcaciaLog"] = "minecraft:acacia_log";
  MinecraftItemTypes2["AcaciaPlanks"] = "minecraft:acacia_planks";
  MinecraftItemTypes2["AcaciaPressurePlate"] = "minecraft:acacia_pressure_plate";
  MinecraftItemTypes2["AcaciaSapling"] = "minecraft:acacia_sapling";
  MinecraftItemTypes2["AcaciaShelf"] = "minecraft:acacia_shelf";
  MinecraftItemTypes2["AcaciaSign"] = "minecraft:acacia_sign";
  MinecraftItemTypes2["AcaciaSlab"] = "minecraft:acacia_slab";
  MinecraftItemTypes2["AcaciaStairs"] = "minecraft:acacia_stairs";
  MinecraftItemTypes2["AcaciaTrapdoor"] = "minecraft:acacia_trapdoor";
  MinecraftItemTypes2["AcaciaWood"] = "minecraft:acacia_wood";
  MinecraftItemTypes2["ActivatorRail"] = "minecraft:activator_rail";
  MinecraftItemTypes2["AllaySpawnEgg"] = "minecraft:allay_spawn_egg";
  MinecraftItemTypes2["Allium"] = "minecraft:allium";
  MinecraftItemTypes2["Allow"] = "minecraft:allow";
  MinecraftItemTypes2["AmethystBlock"] = "minecraft:amethyst_block";
  MinecraftItemTypes2["AmethystCluster"] = "minecraft:amethyst_cluster";
  MinecraftItemTypes2["AmethystShard"] = "minecraft:amethyst_shard";
  MinecraftItemTypes2["AncientDebris"] = "minecraft:ancient_debris";
  MinecraftItemTypes2["Andesite"] = "minecraft:andesite";
  MinecraftItemTypes2["AndesiteSlab"] = "minecraft:andesite_slab";
  MinecraftItemTypes2["AndesiteStairs"] = "minecraft:andesite_stairs";
  MinecraftItemTypes2["AndesiteWall"] = "minecraft:andesite_wall";
  MinecraftItemTypes2["AnglerPotterySherd"] = "minecraft:angler_pottery_sherd";
  MinecraftItemTypes2["Anvil"] = "minecraft:anvil";
  MinecraftItemTypes2["Apple"] = "minecraft:apple";
  MinecraftItemTypes2["ArcherPotterySherd"] = "minecraft:archer_pottery_sherd";
  MinecraftItemTypes2["ArmadilloScute"] = "minecraft:armadillo_scute";
  MinecraftItemTypes2["ArmadilloSpawnEgg"] = "minecraft:armadillo_spawn_egg";
  MinecraftItemTypes2["ArmorStand"] = "minecraft:armor_stand";
  MinecraftItemTypes2["ArmsUpPotterySherd"] = "minecraft:arms_up_pottery_sherd";
  MinecraftItemTypes2["Arrow"] = "minecraft:arrow";
  MinecraftItemTypes2["AxolotlBucket"] = "minecraft:axolotl_bucket";
  MinecraftItemTypes2["AxolotlSpawnEgg"] = "minecraft:axolotl_spawn_egg";
  MinecraftItemTypes2["Azalea"] = "minecraft:azalea";
  MinecraftItemTypes2["AzaleaLeaves"] = "minecraft:azalea_leaves";
  MinecraftItemTypes2["AzaleaLeavesFlowered"] = "minecraft:azalea_leaves_flowered";
  MinecraftItemTypes2["AzureBluet"] = "minecraft:azure_bluet";
  MinecraftItemTypes2["BakedPotato"] = "minecraft:baked_potato";
  MinecraftItemTypes2["Bamboo"] = "minecraft:bamboo";
  MinecraftItemTypes2["BambooBlock"] = "minecraft:bamboo_block";
  MinecraftItemTypes2["BambooButton"] = "minecraft:bamboo_button";
  MinecraftItemTypes2["BambooChestRaft"] = "minecraft:bamboo_chest_raft";
  MinecraftItemTypes2["BambooDoor"] = "minecraft:bamboo_door";
  MinecraftItemTypes2["BambooFence"] = "minecraft:bamboo_fence";
  MinecraftItemTypes2["BambooFenceGate"] = "minecraft:bamboo_fence_gate";
  MinecraftItemTypes2["BambooHangingSign"] = "minecraft:bamboo_hanging_sign";
  MinecraftItemTypes2["BambooMosaic"] = "minecraft:bamboo_mosaic";
  MinecraftItemTypes2["BambooMosaicSlab"] = "minecraft:bamboo_mosaic_slab";
  MinecraftItemTypes2["BambooMosaicStairs"] = "minecraft:bamboo_mosaic_stairs";
  MinecraftItemTypes2["BambooPlanks"] = "minecraft:bamboo_planks";
  MinecraftItemTypes2["BambooPressurePlate"] = "minecraft:bamboo_pressure_plate";
  MinecraftItemTypes2["BambooRaft"] = "minecraft:bamboo_raft";
  MinecraftItemTypes2["BambooShelf"] = "minecraft:bamboo_shelf";
  MinecraftItemTypes2["BambooSign"] = "minecraft:bamboo_sign";
  MinecraftItemTypes2["BambooSlab"] = "minecraft:bamboo_slab";
  MinecraftItemTypes2["BambooStairs"] = "minecraft:bamboo_stairs";
  MinecraftItemTypes2["BambooTrapdoor"] = "minecraft:bamboo_trapdoor";
  MinecraftItemTypes2["Banner"] = "minecraft:banner";
  MinecraftItemTypes2["Barrel"] = "minecraft:barrel";
  MinecraftItemTypes2["Barrier"] = "minecraft:barrier";
  MinecraftItemTypes2["Basalt"] = "minecraft:basalt";
  MinecraftItemTypes2["BatSpawnEgg"] = "minecraft:bat_spawn_egg";
  MinecraftItemTypes2["Beacon"] = "minecraft:beacon";
  MinecraftItemTypes2["Bed"] = "minecraft:bed";
  MinecraftItemTypes2["Bedrock"] = "minecraft:bedrock";
  MinecraftItemTypes2["BeeNest"] = "minecraft:bee_nest";
  MinecraftItemTypes2["BeeSpawnEgg"] = "minecraft:bee_spawn_egg";
  MinecraftItemTypes2["Beef"] = "minecraft:beef";
  MinecraftItemTypes2["Beehive"] = "minecraft:beehive";
  MinecraftItemTypes2["Beetroot"] = "minecraft:beetroot";
  MinecraftItemTypes2["BeetrootSeeds"] = "minecraft:beetroot_seeds";
  MinecraftItemTypes2["BeetrootSoup"] = "minecraft:beetroot_soup";
  MinecraftItemTypes2["Bell"] = "minecraft:bell";
  MinecraftItemTypes2["BigDripleaf"] = "minecraft:big_dripleaf";
  MinecraftItemTypes2["BirchBoat"] = "minecraft:birch_boat";
  MinecraftItemTypes2["BirchButton"] = "minecraft:birch_button";
  MinecraftItemTypes2["BirchChestBoat"] = "minecraft:birch_chest_boat";
  MinecraftItemTypes2["BirchDoor"] = "minecraft:birch_door";
  MinecraftItemTypes2["BirchFence"] = "minecraft:birch_fence";
  MinecraftItemTypes2["BirchFenceGate"] = "minecraft:birch_fence_gate";
  MinecraftItemTypes2["BirchHangingSign"] = "minecraft:birch_hanging_sign";
  MinecraftItemTypes2["BirchLeaves"] = "minecraft:birch_leaves";
  MinecraftItemTypes2["BirchLog"] = "minecraft:birch_log";
  MinecraftItemTypes2["BirchPlanks"] = "minecraft:birch_planks";
  MinecraftItemTypes2["BirchPressurePlate"] = "minecraft:birch_pressure_plate";
  MinecraftItemTypes2["BirchSapling"] = "minecraft:birch_sapling";
  MinecraftItemTypes2["BirchShelf"] = "minecraft:birch_shelf";
  MinecraftItemTypes2["BirchSign"] = "minecraft:birch_sign";
  MinecraftItemTypes2["BirchSlab"] = "minecraft:birch_slab";
  MinecraftItemTypes2["BirchStairs"] = "minecraft:birch_stairs";
  MinecraftItemTypes2["BirchTrapdoor"] = "minecraft:birch_trapdoor";
  MinecraftItemTypes2["BirchWood"] = "minecraft:birch_wood";
  MinecraftItemTypes2["BlackBundle"] = "minecraft:black_bundle";
  MinecraftItemTypes2["BlackCandle"] = "minecraft:black_candle";
  MinecraftItemTypes2["BlackCarpet"] = "minecraft:black_carpet";
  MinecraftItemTypes2["BlackConcrete"] = "minecraft:black_concrete";
  MinecraftItemTypes2["BlackConcretePowder"] = "minecraft:black_concrete_powder";
  MinecraftItemTypes2["BlackDye"] = "minecraft:black_dye";
  MinecraftItemTypes2["BlackGlazedTerracotta"] = "minecraft:black_glazed_terracotta";
  MinecraftItemTypes2["BlackHarness"] = "minecraft:black_harness";
  MinecraftItemTypes2["BlackShulkerBox"] = "minecraft:black_shulker_box";
  MinecraftItemTypes2["BlackStainedGlass"] = "minecraft:black_stained_glass";
  MinecraftItemTypes2["BlackStainedGlassPane"] = "minecraft:black_stained_glass_pane";
  MinecraftItemTypes2["BlackTerracotta"] = "minecraft:black_terracotta";
  MinecraftItemTypes2["BlackWool"] = "minecraft:black_wool";
  MinecraftItemTypes2["Blackstone"] = "minecraft:blackstone";
  MinecraftItemTypes2["BlackstoneSlab"] = "minecraft:blackstone_slab";
  MinecraftItemTypes2["BlackstoneStairs"] = "minecraft:blackstone_stairs";
  MinecraftItemTypes2["BlackstoneWall"] = "minecraft:blackstone_wall";
  MinecraftItemTypes2["BladePotterySherd"] = "minecraft:blade_pottery_sherd";
  MinecraftItemTypes2["BlastFurnace"] = "minecraft:blast_furnace";
  MinecraftItemTypes2["BlazePowder"] = "minecraft:blaze_powder";
  MinecraftItemTypes2["BlazeRod"] = "minecraft:blaze_rod";
  MinecraftItemTypes2["BlazeSpawnEgg"] = "minecraft:blaze_spawn_egg";
  MinecraftItemTypes2["BlueBundle"] = "minecraft:blue_bundle";
  MinecraftItemTypes2["BlueCandle"] = "minecraft:blue_candle";
  MinecraftItemTypes2["BlueCarpet"] = "minecraft:blue_carpet";
  MinecraftItemTypes2["BlueConcrete"] = "minecraft:blue_concrete";
  MinecraftItemTypes2["BlueConcretePowder"] = "minecraft:blue_concrete_powder";
  MinecraftItemTypes2["BlueDye"] = "minecraft:blue_dye";
  MinecraftItemTypes2["BlueEgg"] = "minecraft:blue_egg";
  MinecraftItemTypes2["BlueGlazedTerracotta"] = "minecraft:blue_glazed_terracotta";
  MinecraftItemTypes2["BlueHarness"] = "minecraft:blue_harness";
  MinecraftItemTypes2["BlueIce"] = "minecraft:blue_ice";
  MinecraftItemTypes2["BlueOrchid"] = "minecraft:blue_orchid";
  MinecraftItemTypes2["BlueShulkerBox"] = "minecraft:blue_shulker_box";
  MinecraftItemTypes2["BlueStainedGlass"] = "minecraft:blue_stained_glass";
  MinecraftItemTypes2["BlueStainedGlassPane"] = "minecraft:blue_stained_glass_pane";
  MinecraftItemTypes2["BlueTerracotta"] = "minecraft:blue_terracotta";
  MinecraftItemTypes2["BlueWool"] = "minecraft:blue_wool";
  MinecraftItemTypes2["BoggedSpawnEgg"] = "minecraft:bogged_spawn_egg";
  MinecraftItemTypes2["BoltArmorTrimSmithingTemplate"] = "minecraft:bolt_armor_trim_smithing_template";
  MinecraftItemTypes2["Bone"] = "minecraft:bone";
  MinecraftItemTypes2["BoneBlock"] = "minecraft:bone_block";
  MinecraftItemTypes2["BoneMeal"] = "minecraft:bone_meal";
  MinecraftItemTypes2["Book"] = "minecraft:book";
  MinecraftItemTypes2["Bookshelf"] = "minecraft:bookshelf";
  MinecraftItemTypes2["BorderBlock"] = "minecraft:border_block";
  MinecraftItemTypes2["BordureIndentedBannerPattern"] = "minecraft:bordure_indented_banner_pattern";
  MinecraftItemTypes2["Bow"] = "minecraft:bow";
  MinecraftItemTypes2["Bowl"] = "minecraft:bowl";
  MinecraftItemTypes2["BrainCoral"] = "minecraft:brain_coral";
  MinecraftItemTypes2["BrainCoralBlock"] = "minecraft:brain_coral_block";
  MinecraftItemTypes2["BrainCoralFan"] = "minecraft:brain_coral_fan";
  MinecraftItemTypes2["Bread"] = "minecraft:bread";
  MinecraftItemTypes2["BreezeRod"] = "minecraft:breeze_rod";
  MinecraftItemTypes2["BreezeSpawnEgg"] = "minecraft:breeze_spawn_egg";
  MinecraftItemTypes2["BrewerPotterySherd"] = "minecraft:brewer_pottery_sherd";
  MinecraftItemTypes2["BrewingStand"] = "minecraft:brewing_stand";
  MinecraftItemTypes2["Brick"] = "minecraft:brick";
  MinecraftItemTypes2["BrickBlock"] = "minecraft:brick_block";
  MinecraftItemTypes2["BrickSlab"] = "minecraft:brick_slab";
  MinecraftItemTypes2["BrickStairs"] = "minecraft:brick_stairs";
  MinecraftItemTypes2["BrickWall"] = "minecraft:brick_wall";
  MinecraftItemTypes2["BrownBundle"] = "minecraft:brown_bundle";
  MinecraftItemTypes2["BrownCandle"] = "minecraft:brown_candle";
  MinecraftItemTypes2["BrownCarpet"] = "minecraft:brown_carpet";
  MinecraftItemTypes2["BrownConcrete"] = "minecraft:brown_concrete";
  MinecraftItemTypes2["BrownConcretePowder"] = "minecraft:brown_concrete_powder";
  MinecraftItemTypes2["BrownDye"] = "minecraft:brown_dye";
  MinecraftItemTypes2["BrownEgg"] = "minecraft:brown_egg";
  MinecraftItemTypes2["BrownGlazedTerracotta"] = "minecraft:brown_glazed_terracotta";
  MinecraftItemTypes2["BrownHarness"] = "minecraft:brown_harness";
  MinecraftItemTypes2["BrownMushroom"] = "minecraft:brown_mushroom";
  MinecraftItemTypes2["BrownMushroomBlock"] = "minecraft:brown_mushroom_block";
  MinecraftItemTypes2["BrownShulkerBox"] = "minecraft:brown_shulker_box";
  MinecraftItemTypes2["BrownStainedGlass"] = "minecraft:brown_stained_glass";
  MinecraftItemTypes2["BrownStainedGlassPane"] = "minecraft:brown_stained_glass_pane";
  MinecraftItemTypes2["BrownTerracotta"] = "minecraft:brown_terracotta";
  MinecraftItemTypes2["BrownWool"] = "minecraft:brown_wool";
  MinecraftItemTypes2["Brush"] = "minecraft:brush";
  MinecraftItemTypes2["BubbleCoral"] = "minecraft:bubble_coral";
  MinecraftItemTypes2["BubbleCoralBlock"] = "minecraft:bubble_coral_block";
  MinecraftItemTypes2["BubbleCoralFan"] = "minecraft:bubble_coral_fan";
  MinecraftItemTypes2["Bucket"] = "minecraft:bucket";
  MinecraftItemTypes2["BuddingAmethyst"] = "minecraft:budding_amethyst";
  MinecraftItemTypes2["Bundle"] = "minecraft:bundle";
  MinecraftItemTypes2["BurnPotterySherd"] = "minecraft:burn_pottery_sherd";
  MinecraftItemTypes2["Bush"] = "minecraft:bush";
  MinecraftItemTypes2["Cactus"] = "minecraft:cactus";
  MinecraftItemTypes2["CactusFlower"] = "minecraft:cactus_flower";
  MinecraftItemTypes2["Cake"] = "minecraft:cake";
  MinecraftItemTypes2["Calcite"] = "minecraft:calcite";
  MinecraftItemTypes2["CalibratedSculkSensor"] = "minecraft:calibrated_sculk_sensor";
  MinecraftItemTypes2["CamelHuskSpawnEgg"] = "minecraft:camel_husk_spawn_egg";
  MinecraftItemTypes2["CamelSpawnEgg"] = "minecraft:camel_spawn_egg";
  MinecraftItemTypes2["Campfire"] = "minecraft:campfire";
  MinecraftItemTypes2["Candle"] = "minecraft:candle";
  MinecraftItemTypes2["Carrot"] = "minecraft:carrot";
  MinecraftItemTypes2["CarrotOnAStick"] = "minecraft:carrot_on_a_stick";
  MinecraftItemTypes2["CartographyTable"] = "minecraft:cartography_table";
  MinecraftItemTypes2["CarvedPumpkin"] = "minecraft:carved_pumpkin";
  MinecraftItemTypes2["CatSpawnEgg"] = "minecraft:cat_spawn_egg";
  MinecraftItemTypes2["Cauldron"] = "minecraft:cauldron";
  MinecraftItemTypes2["CaveSpiderSpawnEgg"] = "minecraft:cave_spider_spawn_egg";
  MinecraftItemTypes2["ChainCommandBlock"] = "minecraft:chain_command_block";
  MinecraftItemTypes2["ChainmailBoots"] = "minecraft:chainmail_boots";
  MinecraftItemTypes2["ChainmailChestplate"] = "minecraft:chainmail_chestplate";
  MinecraftItemTypes2["ChainmailHelmet"] = "minecraft:chainmail_helmet";
  MinecraftItemTypes2["ChainmailLeggings"] = "minecraft:chainmail_leggings";
  MinecraftItemTypes2["Charcoal"] = "minecraft:charcoal";
  MinecraftItemTypes2["CherryBoat"] = "minecraft:cherry_boat";
  MinecraftItemTypes2["CherryButton"] = "minecraft:cherry_button";
  MinecraftItemTypes2["CherryChestBoat"] = "minecraft:cherry_chest_boat";
  MinecraftItemTypes2["CherryDoor"] = "minecraft:cherry_door";
  MinecraftItemTypes2["CherryFence"] = "minecraft:cherry_fence";
  MinecraftItemTypes2["CherryFenceGate"] = "minecraft:cherry_fence_gate";
  MinecraftItemTypes2["CherryHangingSign"] = "minecraft:cherry_hanging_sign";
  MinecraftItemTypes2["CherryLeaves"] = "minecraft:cherry_leaves";
  MinecraftItemTypes2["CherryLog"] = "minecraft:cherry_log";
  MinecraftItemTypes2["CherryPlanks"] = "minecraft:cherry_planks";
  MinecraftItemTypes2["CherryPressurePlate"] = "minecraft:cherry_pressure_plate";
  MinecraftItemTypes2["CherrySapling"] = "minecraft:cherry_sapling";
  MinecraftItemTypes2["CherryShelf"] = "minecraft:cherry_shelf";
  MinecraftItemTypes2["CherrySign"] = "minecraft:cherry_sign";
  MinecraftItemTypes2["CherrySlab"] = "minecraft:cherry_slab";
  MinecraftItemTypes2["CherryStairs"] = "minecraft:cherry_stairs";
  MinecraftItemTypes2["CherryTrapdoor"] = "minecraft:cherry_trapdoor";
  MinecraftItemTypes2["CherryWood"] = "minecraft:cherry_wood";
  MinecraftItemTypes2["Chest"] = "minecraft:chest";
  MinecraftItemTypes2["ChestMinecart"] = "minecraft:chest_minecart";
  MinecraftItemTypes2["Chicken"] = "minecraft:chicken";
  MinecraftItemTypes2["ChickenSpawnEgg"] = "minecraft:chicken_spawn_egg";
  MinecraftItemTypes2["ChippedAnvil"] = "minecraft:chipped_anvil";
  MinecraftItemTypes2["ChiseledBookshelf"] = "minecraft:chiseled_bookshelf";
  MinecraftItemTypes2["ChiseledCopper"] = "minecraft:chiseled_copper";
  MinecraftItemTypes2["ChiseledDeepslate"] = "minecraft:chiseled_deepslate";
  MinecraftItemTypes2["ChiseledNetherBricks"] = "minecraft:chiseled_nether_bricks";
  MinecraftItemTypes2["ChiseledPolishedBlackstone"] = "minecraft:chiseled_polished_blackstone";
  MinecraftItemTypes2["ChiseledQuartzBlock"] = "minecraft:chiseled_quartz_block";
  MinecraftItemTypes2["ChiseledRedSandstone"] = "minecraft:chiseled_red_sandstone";
  MinecraftItemTypes2["ChiseledResinBricks"] = "minecraft:chiseled_resin_bricks";
  MinecraftItemTypes2["ChiseledSandstone"] = "minecraft:chiseled_sandstone";
  MinecraftItemTypes2["ChiseledStoneBricks"] = "minecraft:chiseled_stone_bricks";
  MinecraftItemTypes2["ChiseledTuff"] = "minecraft:chiseled_tuff";
  MinecraftItemTypes2["ChiseledTuffBricks"] = "minecraft:chiseled_tuff_bricks";
  MinecraftItemTypes2["ChorusFlower"] = "minecraft:chorus_flower";
  MinecraftItemTypes2["ChorusFruit"] = "minecraft:chorus_fruit";
  MinecraftItemTypes2["ChorusPlant"] = "minecraft:chorus_plant";
  MinecraftItemTypes2["Clay"] = "minecraft:clay";
  MinecraftItemTypes2["ClayBall"] = "minecraft:clay_ball";
  MinecraftItemTypes2["Clock"] = "minecraft:clock";
  MinecraftItemTypes2["ClosedEyeblossom"] = "minecraft:closed_eyeblossom";
  MinecraftItemTypes2["Coal"] = "minecraft:coal";
  MinecraftItemTypes2["CoalBlock"] = "minecraft:coal_block";
  MinecraftItemTypes2["CoalOre"] = "minecraft:coal_ore";
  MinecraftItemTypes2["CoarseDirt"] = "minecraft:coarse_dirt";
  MinecraftItemTypes2["CoastArmorTrimSmithingTemplate"] = "minecraft:coast_armor_trim_smithing_template";
  MinecraftItemTypes2["CobbledDeepslate"] = "minecraft:cobbled_deepslate";
  MinecraftItemTypes2["CobbledDeepslateSlab"] = "minecraft:cobbled_deepslate_slab";
  MinecraftItemTypes2["CobbledDeepslateStairs"] = "minecraft:cobbled_deepslate_stairs";
  MinecraftItemTypes2["CobbledDeepslateWall"] = "minecraft:cobbled_deepslate_wall";
  MinecraftItemTypes2["Cobblestone"] = "minecraft:cobblestone";
  MinecraftItemTypes2["CobblestoneSlab"] = "minecraft:cobblestone_slab";
  MinecraftItemTypes2["CobblestoneWall"] = "minecraft:cobblestone_wall";
  MinecraftItemTypes2["CocoaBeans"] = "minecraft:cocoa_beans";
  MinecraftItemTypes2["Cod"] = "minecraft:cod";
  MinecraftItemTypes2["CodBucket"] = "minecraft:cod_bucket";
  MinecraftItemTypes2["CodSpawnEgg"] = "minecraft:cod_spawn_egg";
  MinecraftItemTypes2["CommandBlock"] = "minecraft:command_block";
  MinecraftItemTypes2["CommandBlockMinecart"] = "minecraft:command_block_minecart";
  MinecraftItemTypes2["Comparator"] = "minecraft:comparator";
  MinecraftItemTypes2["Compass"] = "minecraft:compass";
  MinecraftItemTypes2["Composter"] = "minecraft:composter";
  MinecraftItemTypes2["Conduit"] = "minecraft:conduit";
  MinecraftItemTypes2["CookedBeef"] = "minecraft:cooked_beef";
  MinecraftItemTypes2["CookedChicken"] = "minecraft:cooked_chicken";
  MinecraftItemTypes2["CookedCod"] = "minecraft:cooked_cod";
  MinecraftItemTypes2["CookedMutton"] = "minecraft:cooked_mutton";
  MinecraftItemTypes2["CookedPorkchop"] = "minecraft:cooked_porkchop";
  MinecraftItemTypes2["CookedRabbit"] = "minecraft:cooked_rabbit";
  MinecraftItemTypes2["CookedSalmon"] = "minecraft:cooked_salmon";
  MinecraftItemTypes2["Cookie"] = "minecraft:cookie";
  MinecraftItemTypes2["CopperAxe"] = "minecraft:copper_axe";
  MinecraftItemTypes2["CopperBars"] = "minecraft:copper_bars";
  MinecraftItemTypes2["CopperBlock"] = "minecraft:copper_block";
  MinecraftItemTypes2["CopperBoots"] = "minecraft:copper_boots";
  MinecraftItemTypes2["CopperBulb"] = "minecraft:copper_bulb";
  MinecraftItemTypes2["CopperChain"] = "minecraft:copper_chain";
  MinecraftItemTypes2["CopperChest"] = "minecraft:copper_chest";
  MinecraftItemTypes2["CopperChestplate"] = "minecraft:copper_chestplate";
  MinecraftItemTypes2["CopperDoor"] = "minecraft:copper_door";
  MinecraftItemTypes2["CopperGolemSpawnEgg"] = "minecraft:copper_golem_spawn_egg";
  MinecraftItemTypes2["CopperGolemStatue"] = "minecraft:copper_golem_statue";
  MinecraftItemTypes2["CopperGrate"] = "minecraft:copper_grate";
  MinecraftItemTypes2["CopperHelmet"] = "minecraft:copper_helmet";
  MinecraftItemTypes2["CopperHoe"] = "minecraft:copper_hoe";
  MinecraftItemTypes2["CopperHorseArmor"] = "minecraft:copper_horse_armor";
  MinecraftItemTypes2["CopperIngot"] = "minecraft:copper_ingot";
  MinecraftItemTypes2["CopperLantern"] = "minecraft:copper_lantern";
  MinecraftItemTypes2["CopperLeggings"] = "minecraft:copper_leggings";
  MinecraftItemTypes2["CopperNautilusArmor"] = "minecraft:copper_nautilus_armor";
  MinecraftItemTypes2["CopperNugget"] = "minecraft:copper_nugget";
  MinecraftItemTypes2["CopperOre"] = "minecraft:copper_ore";
  MinecraftItemTypes2["CopperPickaxe"] = "minecraft:copper_pickaxe";
  MinecraftItemTypes2["CopperShovel"] = "minecraft:copper_shovel";
  MinecraftItemTypes2["CopperSpear"] = "minecraft:copper_spear";
  MinecraftItemTypes2["CopperSword"] = "minecraft:copper_sword";
  MinecraftItemTypes2["CopperTorch"] = "minecraft:copper_torch";
  MinecraftItemTypes2["CopperTrapdoor"] = "minecraft:copper_trapdoor";
  MinecraftItemTypes2["Cornflower"] = "minecraft:cornflower";
  MinecraftItemTypes2["CowSpawnEgg"] = "minecraft:cow_spawn_egg";
  MinecraftItemTypes2["CrackedDeepslateBricks"] = "minecraft:cracked_deepslate_bricks";
  MinecraftItemTypes2["CrackedDeepslateTiles"] = "minecraft:cracked_deepslate_tiles";
  MinecraftItemTypes2["CrackedNetherBricks"] = "minecraft:cracked_nether_bricks";
  MinecraftItemTypes2["CrackedPolishedBlackstoneBricks"] = "minecraft:cracked_polished_blackstone_bricks";
  MinecraftItemTypes2["CrackedStoneBricks"] = "minecraft:cracked_stone_bricks";
  MinecraftItemTypes2["Crafter"] = "minecraft:crafter";
  MinecraftItemTypes2["CraftingTable"] = "minecraft:crafting_table";
  MinecraftItemTypes2["CreakingHeart"] = "minecraft:creaking_heart";
  MinecraftItemTypes2["CreakingSpawnEgg"] = "minecraft:creaking_spawn_egg";
  MinecraftItemTypes2["CreeperBannerPattern"] = "minecraft:creeper_banner_pattern";
  MinecraftItemTypes2["CreeperHead"] = "minecraft:creeper_head";
  MinecraftItemTypes2["CreeperSpawnEgg"] = "minecraft:creeper_spawn_egg";
  MinecraftItemTypes2["CrimsonButton"] = "minecraft:crimson_button";
  MinecraftItemTypes2["CrimsonDoor"] = "minecraft:crimson_door";
  MinecraftItemTypes2["CrimsonFence"] = "minecraft:crimson_fence";
  MinecraftItemTypes2["CrimsonFenceGate"] = "minecraft:crimson_fence_gate";
  MinecraftItemTypes2["CrimsonFungus"] = "minecraft:crimson_fungus";
  MinecraftItemTypes2["CrimsonHangingSign"] = "minecraft:crimson_hanging_sign";
  MinecraftItemTypes2["CrimsonHyphae"] = "minecraft:crimson_hyphae";
  MinecraftItemTypes2["CrimsonNylium"] = "minecraft:crimson_nylium";
  MinecraftItemTypes2["CrimsonPlanks"] = "minecraft:crimson_planks";
  MinecraftItemTypes2["CrimsonPressurePlate"] = "minecraft:crimson_pressure_plate";
  MinecraftItemTypes2["CrimsonRoots"] = "minecraft:crimson_roots";
  MinecraftItemTypes2["CrimsonShelf"] = "minecraft:crimson_shelf";
  MinecraftItemTypes2["CrimsonSign"] = "minecraft:crimson_sign";
  MinecraftItemTypes2["CrimsonSlab"] = "minecraft:crimson_slab";
  MinecraftItemTypes2["CrimsonStairs"] = "minecraft:crimson_stairs";
  MinecraftItemTypes2["CrimsonStem"] = "minecraft:crimson_stem";
  MinecraftItemTypes2["CrimsonTrapdoor"] = "minecraft:crimson_trapdoor";
  MinecraftItemTypes2["Crossbow"] = "minecraft:crossbow";
  MinecraftItemTypes2["CryingObsidian"] = "minecraft:crying_obsidian";
  MinecraftItemTypes2["CutCopper"] = "minecraft:cut_copper";
  MinecraftItemTypes2["CutCopperSlab"] = "minecraft:cut_copper_slab";
  MinecraftItemTypes2["CutCopperStairs"] = "minecraft:cut_copper_stairs";
  MinecraftItemTypes2["CutRedSandstone"] = "minecraft:cut_red_sandstone";
  MinecraftItemTypes2["CutRedSandstoneSlab"] = "minecraft:cut_red_sandstone_slab";
  MinecraftItemTypes2["CutSandstone"] = "minecraft:cut_sandstone";
  MinecraftItemTypes2["CutSandstoneSlab"] = "minecraft:cut_sandstone_slab";
  MinecraftItemTypes2["CyanBundle"] = "minecraft:cyan_bundle";
  MinecraftItemTypes2["CyanCandle"] = "minecraft:cyan_candle";
  MinecraftItemTypes2["CyanCarpet"] = "minecraft:cyan_carpet";
  MinecraftItemTypes2["CyanConcrete"] = "minecraft:cyan_concrete";
  MinecraftItemTypes2["CyanConcretePowder"] = "minecraft:cyan_concrete_powder";
  MinecraftItemTypes2["CyanDye"] = "minecraft:cyan_dye";
  MinecraftItemTypes2["CyanGlazedTerracotta"] = "minecraft:cyan_glazed_terracotta";
  MinecraftItemTypes2["CyanHarness"] = "minecraft:cyan_harness";
  MinecraftItemTypes2["CyanShulkerBox"] = "minecraft:cyan_shulker_box";
  MinecraftItemTypes2["CyanStainedGlass"] = "minecraft:cyan_stained_glass";
  MinecraftItemTypes2["CyanStainedGlassPane"] = "minecraft:cyan_stained_glass_pane";
  MinecraftItemTypes2["CyanTerracotta"] = "minecraft:cyan_terracotta";
  MinecraftItemTypes2["CyanWool"] = "minecraft:cyan_wool";
  MinecraftItemTypes2["DamagedAnvil"] = "minecraft:damaged_anvil";
  MinecraftItemTypes2["Dandelion"] = "minecraft:dandelion";
  MinecraftItemTypes2["DangerPotterySherd"] = "minecraft:danger_pottery_sherd";
  MinecraftItemTypes2["DarkOakBoat"] = "minecraft:dark_oak_boat";
  MinecraftItemTypes2["DarkOakButton"] = "minecraft:dark_oak_button";
  MinecraftItemTypes2["DarkOakChestBoat"] = "minecraft:dark_oak_chest_boat";
  MinecraftItemTypes2["DarkOakDoor"] = "minecraft:dark_oak_door";
  MinecraftItemTypes2["DarkOakFence"] = "minecraft:dark_oak_fence";
  MinecraftItemTypes2["DarkOakFenceGate"] = "minecraft:dark_oak_fence_gate";
  MinecraftItemTypes2["DarkOakHangingSign"] = "minecraft:dark_oak_hanging_sign";
  MinecraftItemTypes2["DarkOakLeaves"] = "minecraft:dark_oak_leaves";
  MinecraftItemTypes2["DarkOakLog"] = "minecraft:dark_oak_log";
  MinecraftItemTypes2["DarkOakPlanks"] = "minecraft:dark_oak_planks";
  MinecraftItemTypes2["DarkOakPressurePlate"] = "minecraft:dark_oak_pressure_plate";
  MinecraftItemTypes2["DarkOakSapling"] = "minecraft:dark_oak_sapling";
  MinecraftItemTypes2["DarkOakShelf"] = "minecraft:dark_oak_shelf";
  MinecraftItemTypes2["DarkOakSign"] = "minecraft:dark_oak_sign";
  MinecraftItemTypes2["DarkOakSlab"] = "minecraft:dark_oak_slab";
  MinecraftItemTypes2["DarkOakStairs"] = "minecraft:dark_oak_stairs";
  MinecraftItemTypes2["DarkOakTrapdoor"] = "minecraft:dark_oak_trapdoor";
  MinecraftItemTypes2["DarkOakWood"] = "minecraft:dark_oak_wood";
  MinecraftItemTypes2["DarkPrismarine"] = "minecraft:dark_prismarine";
  MinecraftItemTypes2["DarkPrismarineSlab"] = "minecraft:dark_prismarine_slab";
  MinecraftItemTypes2["DarkPrismarineStairs"] = "minecraft:dark_prismarine_stairs";
  MinecraftItemTypes2["DaylightDetector"] = "minecraft:daylight_detector";
  MinecraftItemTypes2["DeadBrainCoral"] = "minecraft:dead_brain_coral";
  MinecraftItemTypes2["DeadBrainCoralBlock"] = "minecraft:dead_brain_coral_block";
  MinecraftItemTypes2["DeadBrainCoralFan"] = "minecraft:dead_brain_coral_fan";
  MinecraftItemTypes2["DeadBubbleCoral"] = "minecraft:dead_bubble_coral";
  MinecraftItemTypes2["DeadBubbleCoralBlock"] = "minecraft:dead_bubble_coral_block";
  MinecraftItemTypes2["DeadBubbleCoralFan"] = "minecraft:dead_bubble_coral_fan";
  MinecraftItemTypes2["DeadFireCoral"] = "minecraft:dead_fire_coral";
  MinecraftItemTypes2["DeadFireCoralBlock"] = "minecraft:dead_fire_coral_block";
  MinecraftItemTypes2["DeadFireCoralFan"] = "minecraft:dead_fire_coral_fan";
  MinecraftItemTypes2["DeadHornCoral"] = "minecraft:dead_horn_coral";
  MinecraftItemTypes2["DeadHornCoralBlock"] = "minecraft:dead_horn_coral_block";
  MinecraftItemTypes2["DeadHornCoralFan"] = "minecraft:dead_horn_coral_fan";
  MinecraftItemTypes2["DeadTubeCoral"] = "minecraft:dead_tube_coral";
  MinecraftItemTypes2["DeadTubeCoralBlock"] = "minecraft:dead_tube_coral_block";
  MinecraftItemTypes2["DeadTubeCoralFan"] = "minecraft:dead_tube_coral_fan";
  MinecraftItemTypes2["Deadbush"] = "minecraft:deadbush";
  MinecraftItemTypes2["DecoratedPot"] = "minecraft:decorated_pot";
  MinecraftItemTypes2["Deepslate"] = "minecraft:deepslate";
  MinecraftItemTypes2["DeepslateBrickSlab"] = "minecraft:deepslate_brick_slab";
  MinecraftItemTypes2["DeepslateBrickStairs"] = "minecraft:deepslate_brick_stairs";
  MinecraftItemTypes2["DeepslateBrickWall"] = "minecraft:deepslate_brick_wall";
  MinecraftItemTypes2["DeepslateBricks"] = "minecraft:deepslate_bricks";
  MinecraftItemTypes2["DeepslateCoalOre"] = "minecraft:deepslate_coal_ore";
  MinecraftItemTypes2["DeepslateCopperOre"] = "minecraft:deepslate_copper_ore";
  MinecraftItemTypes2["DeepslateDiamondOre"] = "minecraft:deepslate_diamond_ore";
  MinecraftItemTypes2["DeepslateEmeraldOre"] = "minecraft:deepslate_emerald_ore";
  MinecraftItemTypes2["DeepslateGoldOre"] = "minecraft:deepslate_gold_ore";
  MinecraftItemTypes2["DeepslateIronOre"] = "minecraft:deepslate_iron_ore";
  MinecraftItemTypes2["DeepslateLapisOre"] = "minecraft:deepslate_lapis_ore";
  MinecraftItemTypes2["DeepslateRedstoneOre"] = "minecraft:deepslate_redstone_ore";
  MinecraftItemTypes2["DeepslateTileSlab"] = "minecraft:deepslate_tile_slab";
  MinecraftItemTypes2["DeepslateTileStairs"] = "minecraft:deepslate_tile_stairs";
  MinecraftItemTypes2["DeepslateTileWall"] = "minecraft:deepslate_tile_wall";
  MinecraftItemTypes2["DeepslateTiles"] = "minecraft:deepslate_tiles";
  MinecraftItemTypes2["Deny"] = "minecraft:deny";
  MinecraftItemTypes2["DetectorRail"] = "minecraft:detector_rail";
  MinecraftItemTypes2["Diamond"] = "minecraft:diamond";
  MinecraftItemTypes2["DiamondAxe"] = "minecraft:diamond_axe";
  MinecraftItemTypes2["DiamondBlock"] = "minecraft:diamond_block";
  MinecraftItemTypes2["DiamondBoots"] = "minecraft:diamond_boots";
  MinecraftItemTypes2["DiamondChestplate"] = "minecraft:diamond_chestplate";
  MinecraftItemTypes2["DiamondHelmet"] = "minecraft:diamond_helmet";
  MinecraftItemTypes2["DiamondHoe"] = "minecraft:diamond_hoe";
  MinecraftItemTypes2["DiamondHorseArmor"] = "minecraft:diamond_horse_armor";
  MinecraftItemTypes2["DiamondLeggings"] = "minecraft:diamond_leggings";
  MinecraftItemTypes2["DiamondNautilusArmor"] = "minecraft:diamond_nautilus_armor";
  MinecraftItemTypes2["DiamondOre"] = "minecraft:diamond_ore";
  MinecraftItemTypes2["DiamondPickaxe"] = "minecraft:diamond_pickaxe";
  MinecraftItemTypes2["DiamondShovel"] = "minecraft:diamond_shovel";
  MinecraftItemTypes2["DiamondSpear"] = "minecraft:diamond_spear";
  MinecraftItemTypes2["DiamondSword"] = "minecraft:diamond_sword";
  MinecraftItemTypes2["Diorite"] = "minecraft:diorite";
  MinecraftItemTypes2["DioriteSlab"] = "minecraft:diorite_slab";
  MinecraftItemTypes2["DioriteStairs"] = "minecraft:diorite_stairs";
  MinecraftItemTypes2["DioriteWall"] = "minecraft:diorite_wall";
  MinecraftItemTypes2["Dirt"] = "minecraft:dirt";
  MinecraftItemTypes2["DirtWithRoots"] = "minecraft:dirt_with_roots";
  MinecraftItemTypes2["DiscFragment5"] = "minecraft:disc_fragment_5";
  MinecraftItemTypes2["Dispenser"] = "minecraft:dispenser";
  MinecraftItemTypes2["DolphinSpawnEgg"] = "minecraft:dolphin_spawn_egg";
  MinecraftItemTypes2["DonkeySpawnEgg"] = "minecraft:donkey_spawn_egg";
  MinecraftItemTypes2["DragonBreath"] = "minecraft:dragon_breath";
  MinecraftItemTypes2["DragonEgg"] = "minecraft:dragon_egg";
  MinecraftItemTypes2["DragonHead"] = "minecraft:dragon_head";
  MinecraftItemTypes2["DriedGhast"] = "minecraft:dried_ghast";
  MinecraftItemTypes2["DriedKelp"] = "minecraft:dried_kelp";
  MinecraftItemTypes2["DriedKelpBlock"] = "minecraft:dried_kelp_block";
  MinecraftItemTypes2["DripstoneBlock"] = "minecraft:dripstone_block";
  MinecraftItemTypes2["Dropper"] = "minecraft:dropper";
  MinecraftItemTypes2["DrownedSpawnEgg"] = "minecraft:drowned_spawn_egg";
  MinecraftItemTypes2["DuneArmorTrimSmithingTemplate"] = "minecraft:dune_armor_trim_smithing_template";
  MinecraftItemTypes2["EchoShard"] = "minecraft:echo_shard";
  MinecraftItemTypes2["Egg"] = "minecraft:egg";
  MinecraftItemTypes2["ElderGuardianSpawnEgg"] = "minecraft:elder_guardian_spawn_egg";
  MinecraftItemTypes2["Elytra"] = "minecraft:elytra";
  MinecraftItemTypes2["Emerald"] = "minecraft:emerald";
  MinecraftItemTypes2["EmeraldBlock"] = "minecraft:emerald_block";
  MinecraftItemTypes2["EmeraldOre"] = "minecraft:emerald_ore";
  MinecraftItemTypes2["EmptyMap"] = "minecraft:empty_map";
  MinecraftItemTypes2["EnchantedBook"] = "minecraft:enchanted_book";
  MinecraftItemTypes2["EnchantedGoldenApple"] = "minecraft:enchanted_golden_apple";
  MinecraftItemTypes2["EnchantingTable"] = "minecraft:enchanting_table";
  MinecraftItemTypes2["EndBrickStairs"] = "minecraft:end_brick_stairs";
  MinecraftItemTypes2["EndBricks"] = "minecraft:end_bricks";
  MinecraftItemTypes2["EndCrystal"] = "minecraft:end_crystal";
  MinecraftItemTypes2["EndPortalFrame"] = "minecraft:end_portal_frame";
  MinecraftItemTypes2["EndRod"] = "minecraft:end_rod";
  MinecraftItemTypes2["EndStone"] = "minecraft:end_stone";
  MinecraftItemTypes2["EndStoneBrickSlab"] = "minecraft:end_stone_brick_slab";
  MinecraftItemTypes2["EndStoneBrickWall"] = "minecraft:end_stone_brick_wall";
  MinecraftItemTypes2["EnderChest"] = "minecraft:ender_chest";
  MinecraftItemTypes2["EnderDragonSpawnEgg"] = "minecraft:ender_dragon_spawn_egg";
  MinecraftItemTypes2["EnderEye"] = "minecraft:ender_eye";
  MinecraftItemTypes2["EnderPearl"] = "minecraft:ender_pearl";
  MinecraftItemTypes2["EndermanSpawnEgg"] = "minecraft:enderman_spawn_egg";
  MinecraftItemTypes2["EndermiteSpawnEgg"] = "minecraft:endermite_spawn_egg";
  MinecraftItemTypes2["EvokerSpawnEgg"] = "minecraft:evoker_spawn_egg";
  MinecraftItemTypes2["ExperienceBottle"] = "minecraft:experience_bottle";
  MinecraftItemTypes2["ExplorerPotterySherd"] = "minecraft:explorer_pottery_sherd";
  MinecraftItemTypes2["ExposedChiseledCopper"] = "minecraft:exposed_chiseled_copper";
  MinecraftItemTypes2["ExposedCopper"] = "minecraft:exposed_copper";
  MinecraftItemTypes2["ExposedCopperBars"] = "minecraft:exposed_copper_bars";
  MinecraftItemTypes2["ExposedCopperBulb"] = "minecraft:exposed_copper_bulb";
  MinecraftItemTypes2["ExposedCopperChain"] = "minecraft:exposed_copper_chain";
  MinecraftItemTypes2["ExposedCopperChest"] = "minecraft:exposed_copper_chest";
  MinecraftItemTypes2["ExposedCopperDoor"] = "minecraft:exposed_copper_door";
  MinecraftItemTypes2["ExposedCopperGolemStatue"] = "minecraft:exposed_copper_golem_statue";
  MinecraftItemTypes2["ExposedCopperGrate"] = "minecraft:exposed_copper_grate";
  MinecraftItemTypes2["ExposedCopperLantern"] = "minecraft:exposed_copper_lantern";
  MinecraftItemTypes2["ExposedCopperTrapdoor"] = "minecraft:exposed_copper_trapdoor";
  MinecraftItemTypes2["ExposedCutCopper"] = "minecraft:exposed_cut_copper";
  MinecraftItemTypes2["ExposedCutCopperSlab"] = "minecraft:exposed_cut_copper_slab";
  MinecraftItemTypes2["ExposedCutCopperStairs"] = "minecraft:exposed_cut_copper_stairs";
  MinecraftItemTypes2["ExposedLightningRod"] = "minecraft:exposed_lightning_rod";
  MinecraftItemTypes2["EyeArmorTrimSmithingTemplate"] = "minecraft:eye_armor_trim_smithing_template";
  MinecraftItemTypes2["Farmland"] = "minecraft:farmland";
  MinecraftItemTypes2["Feather"] = "minecraft:feather";
  MinecraftItemTypes2["FenceGate"] = "minecraft:fence_gate";
  MinecraftItemTypes2["FermentedSpiderEye"] = "minecraft:fermented_spider_eye";
  MinecraftItemTypes2["Fern"] = "minecraft:fern";
  MinecraftItemTypes2["FieldMasonedBannerPattern"] = "minecraft:field_masoned_banner_pattern";
  MinecraftItemTypes2["FilledMap"] = "minecraft:filled_map";
  MinecraftItemTypes2["FireCharge"] = "minecraft:fire_charge";
  MinecraftItemTypes2["FireCoral"] = "minecraft:fire_coral";
  MinecraftItemTypes2["FireCoralBlock"] = "minecraft:fire_coral_block";
  MinecraftItemTypes2["FireCoralFan"] = "minecraft:fire_coral_fan";
  MinecraftItemTypes2["FireflyBush"] = "minecraft:firefly_bush";
  MinecraftItemTypes2["FireworkRocket"] = "minecraft:firework_rocket";
  MinecraftItemTypes2["FireworkStar"] = "minecraft:firework_star";
  MinecraftItemTypes2["FishingRod"] = "minecraft:fishing_rod";
  MinecraftItemTypes2["FletchingTable"] = "minecraft:fletching_table";
  MinecraftItemTypes2["Flint"] = "minecraft:flint";
  MinecraftItemTypes2["FlintAndSteel"] = "minecraft:flint_and_steel";
  MinecraftItemTypes2["FlowArmorTrimSmithingTemplate"] = "minecraft:flow_armor_trim_smithing_template";
  MinecraftItemTypes2["FlowBannerPattern"] = "minecraft:flow_banner_pattern";
  MinecraftItemTypes2["FlowPotterySherd"] = "minecraft:flow_pottery_sherd";
  MinecraftItemTypes2["FlowerBannerPattern"] = "minecraft:flower_banner_pattern";
  MinecraftItemTypes2["FlowerPot"] = "minecraft:flower_pot";
  MinecraftItemTypes2["FloweringAzalea"] = "minecraft:flowering_azalea";
  MinecraftItemTypes2["FoxSpawnEgg"] = "minecraft:fox_spawn_egg";
  MinecraftItemTypes2["Frame"] = "minecraft:frame";
  MinecraftItemTypes2["FriendPotterySherd"] = "minecraft:friend_pottery_sherd";
  MinecraftItemTypes2["FrogSpawn"] = "minecraft:frog_spawn";
  MinecraftItemTypes2["FrogSpawnEgg"] = "minecraft:frog_spawn_egg";
  MinecraftItemTypes2["FrostedIce"] = "minecraft:frosted_ice";
  MinecraftItemTypes2["Furnace"] = "minecraft:furnace";
  MinecraftItemTypes2["GhastSpawnEgg"] = "minecraft:ghast_spawn_egg";
  MinecraftItemTypes2["GhastTear"] = "minecraft:ghast_tear";
  MinecraftItemTypes2["GildedBlackstone"] = "minecraft:gilded_blackstone";
  MinecraftItemTypes2["Glass"] = "minecraft:glass";
  MinecraftItemTypes2["GlassBottle"] = "minecraft:glass_bottle";
  MinecraftItemTypes2["GlassPane"] = "minecraft:glass_pane";
  MinecraftItemTypes2["GlisteringMelonSlice"] = "minecraft:glistering_melon_slice";
  MinecraftItemTypes2["GlobeBannerPattern"] = "minecraft:globe_banner_pattern";
  MinecraftItemTypes2["GlowBerries"] = "minecraft:glow_berries";
  MinecraftItemTypes2["GlowFrame"] = "minecraft:glow_frame";
  MinecraftItemTypes2["GlowInkSac"] = "minecraft:glow_ink_sac";
  MinecraftItemTypes2["GlowLichen"] = "minecraft:glow_lichen";
  MinecraftItemTypes2["GlowSquidSpawnEgg"] = "minecraft:glow_squid_spawn_egg";
  MinecraftItemTypes2["Glowstone"] = "minecraft:glowstone";
  MinecraftItemTypes2["GlowstoneDust"] = "minecraft:glowstone_dust";
  MinecraftItemTypes2["GoatHorn"] = "minecraft:goat_horn";
  MinecraftItemTypes2["GoatSpawnEgg"] = "minecraft:goat_spawn_egg";
  MinecraftItemTypes2["GoldBlock"] = "minecraft:gold_block";
  MinecraftItemTypes2["GoldIngot"] = "minecraft:gold_ingot";
  MinecraftItemTypes2["GoldNugget"] = "minecraft:gold_nugget";
  MinecraftItemTypes2["GoldOre"] = "minecraft:gold_ore";
  MinecraftItemTypes2["GoldenApple"] = "minecraft:golden_apple";
  MinecraftItemTypes2["GoldenAxe"] = "minecraft:golden_axe";
  MinecraftItemTypes2["GoldenBoots"] = "minecraft:golden_boots";
  MinecraftItemTypes2["GoldenCarrot"] = "minecraft:golden_carrot";
  MinecraftItemTypes2["GoldenChestplate"] = "minecraft:golden_chestplate";
  MinecraftItemTypes2["GoldenDandelion"] = "minecraft:golden_dandelion";
  MinecraftItemTypes2["GoldenHelmet"] = "minecraft:golden_helmet";
  MinecraftItemTypes2["GoldenHoe"] = "minecraft:golden_hoe";
  MinecraftItemTypes2["GoldenHorseArmor"] = "minecraft:golden_horse_armor";
  MinecraftItemTypes2["GoldenLeggings"] = "minecraft:golden_leggings";
  MinecraftItemTypes2["GoldenNautilusArmor"] = "minecraft:golden_nautilus_armor";
  MinecraftItemTypes2["GoldenPickaxe"] = "minecraft:golden_pickaxe";
  MinecraftItemTypes2["GoldenRail"] = "minecraft:golden_rail";
  MinecraftItemTypes2["GoldenShovel"] = "minecraft:golden_shovel";
  MinecraftItemTypes2["GoldenSpear"] = "minecraft:golden_spear";
  MinecraftItemTypes2["GoldenSword"] = "minecraft:golden_sword";
  MinecraftItemTypes2["Granite"] = "minecraft:granite";
  MinecraftItemTypes2["GraniteSlab"] = "minecraft:granite_slab";
  MinecraftItemTypes2["GraniteStairs"] = "minecraft:granite_stairs";
  MinecraftItemTypes2["GraniteWall"] = "minecraft:granite_wall";
  MinecraftItemTypes2["GrassBlock"] = "minecraft:grass_block";
  MinecraftItemTypes2["GrassPath"] = "minecraft:grass_path";
  MinecraftItemTypes2["Gravel"] = "minecraft:gravel";
  MinecraftItemTypes2["GrayBundle"] = "minecraft:gray_bundle";
  MinecraftItemTypes2["GrayCandle"] = "minecraft:gray_candle";
  MinecraftItemTypes2["GrayCarpet"] = "minecraft:gray_carpet";
  MinecraftItemTypes2["GrayConcrete"] = "minecraft:gray_concrete";
  MinecraftItemTypes2["GrayConcretePowder"] = "minecraft:gray_concrete_powder";
  MinecraftItemTypes2["GrayDye"] = "minecraft:gray_dye";
  MinecraftItemTypes2["GrayGlazedTerracotta"] = "minecraft:gray_glazed_terracotta";
  MinecraftItemTypes2["GrayHarness"] = "minecraft:gray_harness";
  MinecraftItemTypes2["GrayShulkerBox"] = "minecraft:gray_shulker_box";
  MinecraftItemTypes2["GrayStainedGlass"] = "minecraft:gray_stained_glass";
  MinecraftItemTypes2["GrayStainedGlassPane"] = "minecraft:gray_stained_glass_pane";
  MinecraftItemTypes2["GrayTerracotta"] = "minecraft:gray_terracotta";
  MinecraftItemTypes2["GrayWool"] = "minecraft:gray_wool";
  MinecraftItemTypes2["GreenBundle"] = "minecraft:green_bundle";
  MinecraftItemTypes2["GreenCandle"] = "minecraft:green_candle";
  MinecraftItemTypes2["GreenCarpet"] = "minecraft:green_carpet";
  MinecraftItemTypes2["GreenConcrete"] = "minecraft:green_concrete";
  MinecraftItemTypes2["GreenConcretePowder"] = "minecraft:green_concrete_powder";
  MinecraftItemTypes2["GreenDye"] = "minecraft:green_dye";
  MinecraftItemTypes2["GreenGlazedTerracotta"] = "minecraft:green_glazed_terracotta";
  MinecraftItemTypes2["GreenHarness"] = "minecraft:green_harness";
  MinecraftItemTypes2["GreenShulkerBox"] = "minecraft:green_shulker_box";
  MinecraftItemTypes2["GreenStainedGlass"] = "minecraft:green_stained_glass";
  MinecraftItemTypes2["GreenStainedGlassPane"] = "minecraft:green_stained_glass_pane";
  MinecraftItemTypes2["GreenTerracotta"] = "minecraft:green_terracotta";
  MinecraftItemTypes2["GreenWool"] = "minecraft:green_wool";
  MinecraftItemTypes2["Grindstone"] = "minecraft:grindstone";
  MinecraftItemTypes2["GuardianSpawnEgg"] = "minecraft:guardian_spawn_egg";
  MinecraftItemTypes2["Gunpowder"] = "minecraft:gunpowder";
  MinecraftItemTypes2["GusterBannerPattern"] = "minecraft:guster_banner_pattern";
  MinecraftItemTypes2["GusterPotterySherd"] = "minecraft:guster_pottery_sherd";
  MinecraftItemTypes2["HangingRoots"] = "minecraft:hanging_roots";
  MinecraftItemTypes2["HappyGhastSpawnEgg"] = "minecraft:happy_ghast_spawn_egg";
  MinecraftItemTypes2["HardenedClay"] = "minecraft:hardened_clay";
  MinecraftItemTypes2["HayBlock"] = "minecraft:hay_block";
  MinecraftItemTypes2["HeartOfTheSea"] = "minecraft:heart_of_the_sea";
  MinecraftItemTypes2["HeartPotterySherd"] = "minecraft:heart_pottery_sherd";
  MinecraftItemTypes2["HeartbreakPotterySherd"] = "minecraft:heartbreak_pottery_sherd";
  MinecraftItemTypes2["HeavyCore"] = "minecraft:heavy_core";
  MinecraftItemTypes2["HeavyWeightedPressurePlate"] = "minecraft:heavy_weighted_pressure_plate";
  MinecraftItemTypes2["HoglinSpawnEgg"] = "minecraft:hoglin_spawn_egg";
  MinecraftItemTypes2["HoneyBlock"] = "minecraft:honey_block";
  MinecraftItemTypes2["HoneyBottle"] = "minecraft:honey_bottle";
  MinecraftItemTypes2["Honeycomb"] = "minecraft:honeycomb";
  MinecraftItemTypes2["HoneycombBlock"] = "minecraft:honeycomb_block";
  MinecraftItemTypes2["Hopper"] = "minecraft:hopper";
  MinecraftItemTypes2["HopperMinecart"] = "minecraft:hopper_minecart";
  MinecraftItemTypes2["HornCoral"] = "minecraft:horn_coral";
  MinecraftItemTypes2["HornCoralBlock"] = "minecraft:horn_coral_block";
  MinecraftItemTypes2["HornCoralFan"] = "minecraft:horn_coral_fan";
  MinecraftItemTypes2["HorseSpawnEgg"] = "minecraft:horse_spawn_egg";
  MinecraftItemTypes2["HostArmorTrimSmithingTemplate"] = "minecraft:host_armor_trim_smithing_template";
  MinecraftItemTypes2["HowlPotterySherd"] = "minecraft:howl_pottery_sherd";
  MinecraftItemTypes2["HuskSpawnEgg"] = "minecraft:husk_spawn_egg";
  MinecraftItemTypes2["Ice"] = "minecraft:ice";
  MinecraftItemTypes2["InfestedChiseledStoneBricks"] = "minecraft:infested_chiseled_stone_bricks";
  MinecraftItemTypes2["InfestedCobblestone"] = "minecraft:infested_cobblestone";
  MinecraftItemTypes2["InfestedCrackedStoneBricks"] = "minecraft:infested_cracked_stone_bricks";
  MinecraftItemTypes2["InfestedDeepslate"] = "minecraft:infested_deepslate";
  MinecraftItemTypes2["InfestedMossyStoneBricks"] = "minecraft:infested_mossy_stone_bricks";
  MinecraftItemTypes2["InfestedStone"] = "minecraft:infested_stone";
  MinecraftItemTypes2["InfestedStoneBricks"] = "minecraft:infested_stone_bricks";
  MinecraftItemTypes2["InkSac"] = "minecraft:ink_sac";
  MinecraftItemTypes2["IronAxe"] = "minecraft:iron_axe";
  MinecraftItemTypes2["IronBars"] = "minecraft:iron_bars";
  MinecraftItemTypes2["IronBlock"] = "minecraft:iron_block";
  MinecraftItemTypes2["IronBoots"] = "minecraft:iron_boots";
  MinecraftItemTypes2["IronChain"] = "minecraft:iron_chain";
  MinecraftItemTypes2["IronChestplate"] = "minecraft:iron_chestplate";
  MinecraftItemTypes2["IronDoor"] = "minecraft:iron_door";
  MinecraftItemTypes2["IronGolemSpawnEgg"] = "minecraft:iron_golem_spawn_egg";
  MinecraftItemTypes2["IronHelmet"] = "minecraft:iron_helmet";
  MinecraftItemTypes2["IronHoe"] = "minecraft:iron_hoe";
  MinecraftItemTypes2["IronHorseArmor"] = "minecraft:iron_horse_armor";
  MinecraftItemTypes2["IronIngot"] = "minecraft:iron_ingot";
  MinecraftItemTypes2["IronLeggings"] = "minecraft:iron_leggings";
  MinecraftItemTypes2["IronNautilusArmor"] = "minecraft:iron_nautilus_armor";
  MinecraftItemTypes2["IronNugget"] = "minecraft:iron_nugget";
  MinecraftItemTypes2["IronOre"] = "minecraft:iron_ore";
  MinecraftItemTypes2["IronPickaxe"] = "minecraft:iron_pickaxe";
  MinecraftItemTypes2["IronShovel"] = "minecraft:iron_shovel";
  MinecraftItemTypes2["IronSpear"] = "minecraft:iron_spear";
  MinecraftItemTypes2["IronSword"] = "minecraft:iron_sword";
  MinecraftItemTypes2["IronTrapdoor"] = "minecraft:iron_trapdoor";
  MinecraftItemTypes2["Jigsaw"] = "minecraft:jigsaw";
  MinecraftItemTypes2["Jukebox"] = "minecraft:jukebox";
  MinecraftItemTypes2["JungleBoat"] = "minecraft:jungle_boat";
  MinecraftItemTypes2["JungleButton"] = "minecraft:jungle_button";
  MinecraftItemTypes2["JungleChestBoat"] = "minecraft:jungle_chest_boat";
  MinecraftItemTypes2["JungleDoor"] = "minecraft:jungle_door";
  MinecraftItemTypes2["JungleFence"] = "minecraft:jungle_fence";
  MinecraftItemTypes2["JungleFenceGate"] = "minecraft:jungle_fence_gate";
  MinecraftItemTypes2["JungleHangingSign"] = "minecraft:jungle_hanging_sign";
  MinecraftItemTypes2["JungleLeaves"] = "minecraft:jungle_leaves";
  MinecraftItemTypes2["JungleLog"] = "minecraft:jungle_log";
  MinecraftItemTypes2["JunglePlanks"] = "minecraft:jungle_planks";
  MinecraftItemTypes2["JunglePressurePlate"] = "minecraft:jungle_pressure_plate";
  MinecraftItemTypes2["JungleSapling"] = "minecraft:jungle_sapling";
  MinecraftItemTypes2["JungleShelf"] = "minecraft:jungle_shelf";
  MinecraftItemTypes2["JungleSign"] = "minecraft:jungle_sign";
  MinecraftItemTypes2["JungleSlab"] = "minecraft:jungle_slab";
  MinecraftItemTypes2["JungleStairs"] = "minecraft:jungle_stairs";
  MinecraftItemTypes2["JungleTrapdoor"] = "minecraft:jungle_trapdoor";
  MinecraftItemTypes2["JungleWood"] = "minecraft:jungle_wood";
  MinecraftItemTypes2["Kelp"] = "minecraft:kelp";
  MinecraftItemTypes2["Ladder"] = "minecraft:ladder";
  MinecraftItemTypes2["Lantern"] = "minecraft:lantern";
  MinecraftItemTypes2["LapisBlock"] = "minecraft:lapis_block";
  MinecraftItemTypes2["LapisLazuli"] = "minecraft:lapis_lazuli";
  MinecraftItemTypes2["LapisOre"] = "minecraft:lapis_ore";
  MinecraftItemTypes2["LargeAmethystBud"] = "minecraft:large_amethyst_bud";
  MinecraftItemTypes2["LargeFern"] = "minecraft:large_fern";
  MinecraftItemTypes2["LavaBucket"] = "minecraft:lava_bucket";
  MinecraftItemTypes2["Lead"] = "minecraft:lead";
  MinecraftItemTypes2["LeafLitter"] = "minecraft:leaf_litter";
  MinecraftItemTypes2["Leather"] = "minecraft:leather";
  MinecraftItemTypes2["LeatherBoots"] = "minecraft:leather_boots";
  MinecraftItemTypes2["LeatherChestplate"] = "minecraft:leather_chestplate";
  MinecraftItemTypes2["LeatherHelmet"] = "minecraft:leather_helmet";
  MinecraftItemTypes2["LeatherHorseArmor"] = "minecraft:leather_horse_armor";
  MinecraftItemTypes2["LeatherLeggings"] = "minecraft:leather_leggings";
  MinecraftItemTypes2["Lectern"] = "minecraft:lectern";
  MinecraftItemTypes2["Lever"] = "minecraft:lever";
  MinecraftItemTypes2["LightBlock0"] = "minecraft:light_block_0";
  MinecraftItemTypes2["LightBlock1"] = "minecraft:light_block_1";
  MinecraftItemTypes2["LightBlock10"] = "minecraft:light_block_10";
  MinecraftItemTypes2["LightBlock11"] = "minecraft:light_block_11";
  MinecraftItemTypes2["LightBlock12"] = "minecraft:light_block_12";
  MinecraftItemTypes2["LightBlock13"] = "minecraft:light_block_13";
  MinecraftItemTypes2["LightBlock14"] = "minecraft:light_block_14";
  MinecraftItemTypes2["LightBlock15"] = "minecraft:light_block_15";
  MinecraftItemTypes2["LightBlock2"] = "minecraft:light_block_2";
  MinecraftItemTypes2["LightBlock3"] = "minecraft:light_block_3";
  MinecraftItemTypes2["LightBlock4"] = "minecraft:light_block_4";
  MinecraftItemTypes2["LightBlock5"] = "minecraft:light_block_5";
  MinecraftItemTypes2["LightBlock6"] = "minecraft:light_block_6";
  MinecraftItemTypes2["LightBlock7"] = "minecraft:light_block_7";
  MinecraftItemTypes2["LightBlock8"] = "minecraft:light_block_8";
  MinecraftItemTypes2["LightBlock9"] = "minecraft:light_block_9";
  MinecraftItemTypes2["LightBlueBundle"] = "minecraft:light_blue_bundle";
  MinecraftItemTypes2["LightBlueCandle"] = "minecraft:light_blue_candle";
  MinecraftItemTypes2["LightBlueCarpet"] = "minecraft:light_blue_carpet";
  MinecraftItemTypes2["LightBlueConcrete"] = "minecraft:light_blue_concrete";
  MinecraftItemTypes2["LightBlueConcretePowder"] = "minecraft:light_blue_concrete_powder";
  MinecraftItemTypes2["LightBlueDye"] = "minecraft:light_blue_dye";
  MinecraftItemTypes2["LightBlueGlazedTerracotta"] = "minecraft:light_blue_glazed_terracotta";
  MinecraftItemTypes2["LightBlueHarness"] = "minecraft:light_blue_harness";
  MinecraftItemTypes2["LightBlueShulkerBox"] = "minecraft:light_blue_shulker_box";
  MinecraftItemTypes2["LightBlueStainedGlass"] = "minecraft:light_blue_stained_glass";
  MinecraftItemTypes2["LightBlueStainedGlassPane"] = "minecraft:light_blue_stained_glass_pane";
  MinecraftItemTypes2["LightBlueTerracotta"] = "minecraft:light_blue_terracotta";
  MinecraftItemTypes2["LightBlueWool"] = "minecraft:light_blue_wool";
  MinecraftItemTypes2["LightGrayBundle"] = "minecraft:light_gray_bundle";
  MinecraftItemTypes2["LightGrayCandle"] = "minecraft:light_gray_candle";
  MinecraftItemTypes2["LightGrayCarpet"] = "minecraft:light_gray_carpet";
  MinecraftItemTypes2["LightGrayConcrete"] = "minecraft:light_gray_concrete";
  MinecraftItemTypes2["LightGrayConcretePowder"] = "minecraft:light_gray_concrete_powder";
  MinecraftItemTypes2["LightGrayDye"] = "minecraft:light_gray_dye";
  MinecraftItemTypes2["LightGrayHarness"] = "minecraft:light_gray_harness";
  MinecraftItemTypes2["LightGrayShulkerBox"] = "minecraft:light_gray_shulker_box";
  MinecraftItemTypes2["LightGrayStainedGlass"] = "minecraft:light_gray_stained_glass";
  MinecraftItemTypes2["LightGrayStainedGlassPane"] = "minecraft:light_gray_stained_glass_pane";
  MinecraftItemTypes2["LightGrayTerracotta"] = "minecraft:light_gray_terracotta";
  MinecraftItemTypes2["LightGrayWool"] = "minecraft:light_gray_wool";
  MinecraftItemTypes2["LightWeightedPressurePlate"] = "minecraft:light_weighted_pressure_plate";
  MinecraftItemTypes2["LightningRod"] = "minecraft:lightning_rod";
  MinecraftItemTypes2["Lilac"] = "minecraft:lilac";
  MinecraftItemTypes2["LilyOfTheValley"] = "minecraft:lily_of_the_valley";
  MinecraftItemTypes2["LimeBundle"] = "minecraft:lime_bundle";
  MinecraftItemTypes2["LimeCandle"] = "minecraft:lime_candle";
  MinecraftItemTypes2["LimeCarpet"] = "minecraft:lime_carpet";
  MinecraftItemTypes2["LimeConcrete"] = "minecraft:lime_concrete";
  MinecraftItemTypes2["LimeConcretePowder"] = "minecraft:lime_concrete_powder";
  MinecraftItemTypes2["LimeDye"] = "minecraft:lime_dye";
  MinecraftItemTypes2["LimeGlazedTerracotta"] = "minecraft:lime_glazed_terracotta";
  MinecraftItemTypes2["LimeHarness"] = "minecraft:lime_harness";
  MinecraftItemTypes2["LimeShulkerBox"] = "minecraft:lime_shulker_box";
  MinecraftItemTypes2["LimeStainedGlass"] = "minecraft:lime_stained_glass";
  MinecraftItemTypes2["LimeStainedGlassPane"] = "minecraft:lime_stained_glass_pane";
  MinecraftItemTypes2["LimeTerracotta"] = "minecraft:lime_terracotta";
  MinecraftItemTypes2["LimeWool"] = "minecraft:lime_wool";
  MinecraftItemTypes2["LingeringPotion"] = "minecraft:lingering_potion";
  MinecraftItemTypes2["LitPumpkin"] = "minecraft:lit_pumpkin";
  MinecraftItemTypes2["LlamaSpawnEgg"] = "minecraft:llama_spawn_egg";
  MinecraftItemTypes2["Lodestone"] = "minecraft:lodestone";
  MinecraftItemTypes2["LodestoneCompass"] = "minecraft:lodestone_compass";
  MinecraftItemTypes2["Loom"] = "minecraft:loom";
  MinecraftItemTypes2["Mace"] = "minecraft:mace";
  MinecraftItemTypes2["MagentaBundle"] = "minecraft:magenta_bundle";
  MinecraftItemTypes2["MagentaCandle"] = "minecraft:magenta_candle";
  MinecraftItemTypes2["MagentaCarpet"] = "minecraft:magenta_carpet";
  MinecraftItemTypes2["MagentaConcrete"] = "minecraft:magenta_concrete";
  MinecraftItemTypes2["MagentaConcretePowder"] = "minecraft:magenta_concrete_powder";
  MinecraftItemTypes2["MagentaDye"] = "minecraft:magenta_dye";
  MinecraftItemTypes2["MagentaGlazedTerracotta"] = "minecraft:magenta_glazed_terracotta";
  MinecraftItemTypes2["MagentaHarness"] = "minecraft:magenta_harness";
  MinecraftItemTypes2["MagentaShulkerBox"] = "minecraft:magenta_shulker_box";
  MinecraftItemTypes2["MagentaStainedGlass"] = "minecraft:magenta_stained_glass";
  MinecraftItemTypes2["MagentaStainedGlassPane"] = "minecraft:magenta_stained_glass_pane";
  MinecraftItemTypes2["MagentaTerracotta"] = "minecraft:magenta_terracotta";
  MinecraftItemTypes2["MagentaWool"] = "minecraft:magenta_wool";
  MinecraftItemTypes2["Magma"] = "minecraft:magma";
  MinecraftItemTypes2["MagmaCream"] = "minecraft:magma_cream";
  MinecraftItemTypes2["MagmaCubeSpawnEgg"] = "minecraft:magma_cube_spawn_egg";
  MinecraftItemTypes2["MangroveBoat"] = "minecraft:mangrove_boat";
  MinecraftItemTypes2["MangroveButton"] = "minecraft:mangrove_button";
  MinecraftItemTypes2["MangroveChestBoat"] = "minecraft:mangrove_chest_boat";
  MinecraftItemTypes2["MangroveDoor"] = "minecraft:mangrove_door";
  MinecraftItemTypes2["MangroveFence"] = "minecraft:mangrove_fence";
  MinecraftItemTypes2["MangroveFenceGate"] = "minecraft:mangrove_fence_gate";
  MinecraftItemTypes2["MangroveHangingSign"] = "minecraft:mangrove_hanging_sign";
  MinecraftItemTypes2["MangroveLeaves"] = "minecraft:mangrove_leaves";
  MinecraftItemTypes2["MangroveLog"] = "minecraft:mangrove_log";
  MinecraftItemTypes2["MangrovePlanks"] = "minecraft:mangrove_planks";
  MinecraftItemTypes2["MangrovePressurePlate"] = "minecraft:mangrove_pressure_plate";
  MinecraftItemTypes2["MangrovePropagule"] = "minecraft:mangrove_propagule";
  MinecraftItemTypes2["MangroveRoots"] = "minecraft:mangrove_roots";
  MinecraftItemTypes2["MangroveShelf"] = "minecraft:mangrove_shelf";
  MinecraftItemTypes2["MangroveSign"] = "minecraft:mangrove_sign";
  MinecraftItemTypes2["MangroveSlab"] = "minecraft:mangrove_slab";
  MinecraftItemTypes2["MangroveStairs"] = "minecraft:mangrove_stairs";
  MinecraftItemTypes2["MangroveTrapdoor"] = "minecraft:mangrove_trapdoor";
  MinecraftItemTypes2["MangroveWood"] = "minecraft:mangrove_wood";
  MinecraftItemTypes2["MediumAmethystBud"] = "minecraft:medium_amethyst_bud";
  MinecraftItemTypes2["MelonBlock"] = "minecraft:melon_block";
  MinecraftItemTypes2["MelonSeeds"] = "minecraft:melon_seeds";
  MinecraftItemTypes2["MelonSlice"] = "minecraft:melon_slice";
  MinecraftItemTypes2["MilkBucket"] = "minecraft:milk_bucket";
  MinecraftItemTypes2["Minecart"] = "minecraft:minecart";
  MinecraftItemTypes2["MinerPotterySherd"] = "minecraft:miner_pottery_sherd";
  MinecraftItemTypes2["MobSpawner"] = "minecraft:mob_spawner";
  MinecraftItemTypes2["MojangBannerPattern"] = "minecraft:mojang_banner_pattern";
  MinecraftItemTypes2["MooshroomSpawnEgg"] = "minecraft:mooshroom_spawn_egg";
  MinecraftItemTypes2["MossBlock"] = "minecraft:moss_block";
  MinecraftItemTypes2["MossCarpet"] = "minecraft:moss_carpet";
  MinecraftItemTypes2["MossyCobblestone"] = "minecraft:mossy_cobblestone";
  MinecraftItemTypes2["MossyCobblestoneSlab"] = "minecraft:mossy_cobblestone_slab";
  MinecraftItemTypes2["MossyCobblestoneStairs"] = "minecraft:mossy_cobblestone_stairs";
  MinecraftItemTypes2["MossyCobblestoneWall"] = "minecraft:mossy_cobblestone_wall";
  MinecraftItemTypes2["MossyStoneBrickSlab"] = "minecraft:mossy_stone_brick_slab";
  MinecraftItemTypes2["MossyStoneBrickStairs"] = "minecraft:mossy_stone_brick_stairs";
  MinecraftItemTypes2["MossyStoneBrickWall"] = "minecraft:mossy_stone_brick_wall";
  MinecraftItemTypes2["MossyStoneBricks"] = "minecraft:mossy_stone_bricks";
  MinecraftItemTypes2["MournerPotterySherd"] = "minecraft:mourner_pottery_sherd";
  MinecraftItemTypes2["Mud"] = "minecraft:mud";
  MinecraftItemTypes2["MudBrickSlab"] = "minecraft:mud_brick_slab";
  MinecraftItemTypes2["MudBrickStairs"] = "minecraft:mud_brick_stairs";
  MinecraftItemTypes2["MudBrickWall"] = "minecraft:mud_brick_wall";
  MinecraftItemTypes2["MudBricks"] = "minecraft:mud_bricks";
  MinecraftItemTypes2["MuddyMangroveRoots"] = "minecraft:muddy_mangrove_roots";
  MinecraftItemTypes2["MuleSpawnEgg"] = "minecraft:mule_spawn_egg";
  MinecraftItemTypes2["MushroomStem"] = "minecraft:mushroom_stem";
  MinecraftItemTypes2["MushroomStew"] = "minecraft:mushroom_stew";
  MinecraftItemTypes2["MusicDisc11"] = "minecraft:music_disc_11";
  MinecraftItemTypes2["MusicDisc13"] = "minecraft:music_disc_13";
  MinecraftItemTypes2["MusicDisc5"] = "minecraft:music_disc_5";
  MinecraftItemTypes2["MusicDiscBlocks"] = "minecraft:music_disc_blocks";
  MinecraftItemTypes2["MusicDiscCat"] = "minecraft:music_disc_cat";
  MinecraftItemTypes2["MusicDiscChirp"] = "minecraft:music_disc_chirp";
  MinecraftItemTypes2["MusicDiscCreator"] = "minecraft:music_disc_creator";
  MinecraftItemTypes2["MusicDiscCreatorMusicBox"] = "minecraft:music_disc_creator_music_box";
  MinecraftItemTypes2["MusicDiscFar"] = "minecraft:music_disc_far";
  MinecraftItemTypes2["MusicDiscLavaChicken"] = "minecraft:music_disc_lava_chicken";
  MinecraftItemTypes2["MusicDiscMall"] = "minecraft:music_disc_mall";
  MinecraftItemTypes2["MusicDiscMellohi"] = "minecraft:music_disc_mellohi";
  MinecraftItemTypes2["MusicDiscOtherside"] = "minecraft:music_disc_otherside";
  MinecraftItemTypes2["MusicDiscPigstep"] = "minecraft:music_disc_pigstep";
  MinecraftItemTypes2["MusicDiscPrecipice"] = "minecraft:music_disc_precipice";
  MinecraftItemTypes2["MusicDiscRelic"] = "minecraft:music_disc_relic";
  MinecraftItemTypes2["MusicDiscStal"] = "minecraft:music_disc_stal";
  MinecraftItemTypes2["MusicDiscStrad"] = "minecraft:music_disc_strad";
  MinecraftItemTypes2["MusicDiscTears"] = "minecraft:music_disc_tears";
  MinecraftItemTypes2["MusicDiscWait"] = "minecraft:music_disc_wait";
  MinecraftItemTypes2["MusicDiscWard"] = "minecraft:music_disc_ward";
  MinecraftItemTypes2["Mutton"] = "minecraft:mutton";
  MinecraftItemTypes2["Mycelium"] = "minecraft:mycelium";
  MinecraftItemTypes2["NameTag"] = "minecraft:name_tag";
  MinecraftItemTypes2["NautilusShell"] = "minecraft:nautilus_shell";
  MinecraftItemTypes2["NautilusSpawnEgg"] = "minecraft:nautilus_spawn_egg";
  MinecraftItemTypes2["NetherBrick"] = "minecraft:nether_brick";
  MinecraftItemTypes2["NetherBrickFence"] = "minecraft:nether_brick_fence";
  MinecraftItemTypes2["NetherBrickSlab"] = "minecraft:nether_brick_slab";
  MinecraftItemTypes2["NetherBrickStairs"] = "minecraft:nether_brick_stairs";
  MinecraftItemTypes2["NetherBrickWall"] = "minecraft:nether_brick_wall";
  MinecraftItemTypes2["NetherGoldOre"] = "minecraft:nether_gold_ore";
  MinecraftItemTypes2["NetherSprouts"] = "minecraft:nether_sprouts";
  MinecraftItemTypes2["NetherStar"] = "minecraft:nether_star";
  MinecraftItemTypes2["NetherWart"] = "minecraft:nether_wart";
  MinecraftItemTypes2["NetherWartBlock"] = "minecraft:nether_wart_block";
  MinecraftItemTypes2["Netherbrick"] = "minecraft:netherbrick";
  MinecraftItemTypes2["NetheriteAxe"] = "minecraft:netherite_axe";
  MinecraftItemTypes2["NetheriteBlock"] = "minecraft:netherite_block";
  MinecraftItemTypes2["NetheriteBoots"] = "minecraft:netherite_boots";
  MinecraftItemTypes2["NetheriteChestplate"] = "minecraft:netherite_chestplate";
  MinecraftItemTypes2["NetheriteHelmet"] = "minecraft:netherite_helmet";
  MinecraftItemTypes2["NetheriteHoe"] = "minecraft:netherite_hoe";
  MinecraftItemTypes2["NetheriteHorseArmor"] = "minecraft:netherite_horse_armor";
  MinecraftItemTypes2["NetheriteIngot"] = "minecraft:netherite_ingot";
  MinecraftItemTypes2["NetheriteLeggings"] = "minecraft:netherite_leggings";
  MinecraftItemTypes2["NetheriteNautilusArmor"] = "minecraft:netherite_nautilus_armor";
  MinecraftItemTypes2["NetheritePickaxe"] = "minecraft:netherite_pickaxe";
  MinecraftItemTypes2["NetheriteScrap"] = "minecraft:netherite_scrap";
  MinecraftItemTypes2["NetheriteShovel"] = "minecraft:netherite_shovel";
  MinecraftItemTypes2["NetheriteSpear"] = "minecraft:netherite_spear";
  MinecraftItemTypes2["NetheriteSword"] = "minecraft:netherite_sword";
  MinecraftItemTypes2["NetheriteUpgradeSmithingTemplate"] = "minecraft:netherite_upgrade_smithing_template";
  MinecraftItemTypes2["Netherrack"] = "minecraft:netherrack";
  MinecraftItemTypes2["NormalStoneSlab"] = "minecraft:normal_stone_slab";
  MinecraftItemTypes2["NormalStoneStairs"] = "minecraft:normal_stone_stairs";
  MinecraftItemTypes2["Noteblock"] = "minecraft:noteblock";
  MinecraftItemTypes2["OakBoat"] = "minecraft:oak_boat";
  MinecraftItemTypes2["OakChestBoat"] = "minecraft:oak_chest_boat";
  MinecraftItemTypes2["OakFence"] = "minecraft:oak_fence";
  MinecraftItemTypes2["OakHangingSign"] = "minecraft:oak_hanging_sign";
  MinecraftItemTypes2["OakLeaves"] = "minecraft:oak_leaves";
  MinecraftItemTypes2["OakLog"] = "minecraft:oak_log";
  MinecraftItemTypes2["OakPlanks"] = "minecraft:oak_planks";
  MinecraftItemTypes2["OakSapling"] = "minecraft:oak_sapling";
  MinecraftItemTypes2["OakShelf"] = "minecraft:oak_shelf";
  MinecraftItemTypes2["OakSign"] = "minecraft:oak_sign";
  MinecraftItemTypes2["OakSlab"] = "minecraft:oak_slab";
  MinecraftItemTypes2["OakStairs"] = "minecraft:oak_stairs";
  MinecraftItemTypes2["OakWood"] = "minecraft:oak_wood";
  MinecraftItemTypes2["Observer"] = "minecraft:observer";
  MinecraftItemTypes2["Obsidian"] = "minecraft:obsidian";
  MinecraftItemTypes2["OcelotSpawnEgg"] = "minecraft:ocelot_spawn_egg";
  MinecraftItemTypes2["OchreFroglight"] = "minecraft:ochre_froglight";
  MinecraftItemTypes2["OminousBottle"] = "minecraft:ominous_bottle";
  MinecraftItemTypes2["OminousTrialKey"] = "minecraft:ominous_trial_key";
  MinecraftItemTypes2["OpenEyeblossom"] = "minecraft:open_eyeblossom";
  MinecraftItemTypes2["OrangeBundle"] = "minecraft:orange_bundle";
  MinecraftItemTypes2["OrangeCandle"] = "minecraft:orange_candle";
  MinecraftItemTypes2["OrangeCarpet"] = "minecraft:orange_carpet";
  MinecraftItemTypes2["OrangeConcrete"] = "minecraft:orange_concrete";
  MinecraftItemTypes2["OrangeConcretePowder"] = "minecraft:orange_concrete_powder";
  MinecraftItemTypes2["OrangeDye"] = "minecraft:orange_dye";
  MinecraftItemTypes2["OrangeGlazedTerracotta"] = "minecraft:orange_glazed_terracotta";
  MinecraftItemTypes2["OrangeHarness"] = "minecraft:orange_harness";
  MinecraftItemTypes2["OrangeShulkerBox"] = "minecraft:orange_shulker_box";
  MinecraftItemTypes2["OrangeStainedGlass"] = "minecraft:orange_stained_glass";
  MinecraftItemTypes2["OrangeStainedGlassPane"] = "minecraft:orange_stained_glass_pane";
  MinecraftItemTypes2["OrangeTerracotta"] = "minecraft:orange_terracotta";
  MinecraftItemTypes2["OrangeTulip"] = "minecraft:orange_tulip";
  MinecraftItemTypes2["OrangeWool"] = "minecraft:orange_wool";
  MinecraftItemTypes2["OxeyeDaisy"] = "minecraft:oxeye_daisy";
  MinecraftItemTypes2["OxidizedChiseledCopper"] = "minecraft:oxidized_chiseled_copper";
  MinecraftItemTypes2["OxidizedCopper"] = "minecraft:oxidized_copper";
  MinecraftItemTypes2["OxidizedCopperBars"] = "minecraft:oxidized_copper_bars";
  MinecraftItemTypes2["OxidizedCopperBulb"] = "minecraft:oxidized_copper_bulb";
  MinecraftItemTypes2["OxidizedCopperChain"] = "minecraft:oxidized_copper_chain";
  MinecraftItemTypes2["OxidizedCopperChest"] = "minecraft:oxidized_copper_chest";
  MinecraftItemTypes2["OxidizedCopperDoor"] = "minecraft:oxidized_copper_door";
  MinecraftItemTypes2["OxidizedCopperGolemStatue"] = "minecraft:oxidized_copper_golem_statue";
  MinecraftItemTypes2["OxidizedCopperGrate"] = "minecraft:oxidized_copper_grate";
  MinecraftItemTypes2["OxidizedCopperLantern"] = "minecraft:oxidized_copper_lantern";
  MinecraftItemTypes2["OxidizedCopperTrapdoor"] = "minecraft:oxidized_copper_trapdoor";
  MinecraftItemTypes2["OxidizedCutCopper"] = "minecraft:oxidized_cut_copper";
  MinecraftItemTypes2["OxidizedCutCopperSlab"] = "minecraft:oxidized_cut_copper_slab";
  MinecraftItemTypes2["OxidizedCutCopperStairs"] = "minecraft:oxidized_cut_copper_stairs";
  MinecraftItemTypes2["OxidizedLightningRod"] = "minecraft:oxidized_lightning_rod";
  MinecraftItemTypes2["PackedIce"] = "minecraft:packed_ice";
  MinecraftItemTypes2["PackedMud"] = "minecraft:packed_mud";
  MinecraftItemTypes2["Painting"] = "minecraft:painting";
  MinecraftItemTypes2["PaleHangingMoss"] = "minecraft:pale_hanging_moss";
  MinecraftItemTypes2["PaleMossBlock"] = "minecraft:pale_moss_block";
  MinecraftItemTypes2["PaleMossCarpet"] = "minecraft:pale_moss_carpet";
  MinecraftItemTypes2["PaleOakBoat"] = "minecraft:pale_oak_boat";
  MinecraftItemTypes2["PaleOakButton"] = "minecraft:pale_oak_button";
  MinecraftItemTypes2["PaleOakChestBoat"] = "minecraft:pale_oak_chest_boat";
  MinecraftItemTypes2["PaleOakDoor"] = "minecraft:pale_oak_door";
  MinecraftItemTypes2["PaleOakFence"] = "minecraft:pale_oak_fence";
  MinecraftItemTypes2["PaleOakFenceGate"] = "minecraft:pale_oak_fence_gate";
  MinecraftItemTypes2["PaleOakHangingSign"] = "minecraft:pale_oak_hanging_sign";
  MinecraftItemTypes2["PaleOakLeaves"] = "minecraft:pale_oak_leaves";
  MinecraftItemTypes2["PaleOakLog"] = "minecraft:pale_oak_log";
  MinecraftItemTypes2["PaleOakPlanks"] = "minecraft:pale_oak_planks";
  MinecraftItemTypes2["PaleOakPressurePlate"] = "minecraft:pale_oak_pressure_plate";
  MinecraftItemTypes2["PaleOakSapling"] = "minecraft:pale_oak_sapling";
  MinecraftItemTypes2["PaleOakShelf"] = "minecraft:pale_oak_shelf";
  MinecraftItemTypes2["PaleOakSign"] = "minecraft:pale_oak_sign";
  MinecraftItemTypes2["PaleOakSlab"] = "minecraft:pale_oak_slab";
  MinecraftItemTypes2["PaleOakStairs"] = "minecraft:pale_oak_stairs";
  MinecraftItemTypes2["PaleOakTrapdoor"] = "minecraft:pale_oak_trapdoor";
  MinecraftItemTypes2["PaleOakWood"] = "minecraft:pale_oak_wood";
  MinecraftItemTypes2["PandaSpawnEgg"] = "minecraft:panda_spawn_egg";
  MinecraftItemTypes2["Paper"] = "minecraft:paper";
  MinecraftItemTypes2["ParchedSpawnEgg"] = "minecraft:parched_spawn_egg";
  MinecraftItemTypes2["ParrotSpawnEgg"] = "minecraft:parrot_spawn_egg";
  MinecraftItemTypes2["PearlescentFroglight"] = "minecraft:pearlescent_froglight";
  MinecraftItemTypes2["Peony"] = "minecraft:peony";
  MinecraftItemTypes2["PetrifiedOakSlab"] = "minecraft:petrified_oak_slab";
  MinecraftItemTypes2["PhantomMembrane"] = "minecraft:phantom_membrane";
  MinecraftItemTypes2["PhantomSpawnEgg"] = "minecraft:phantom_spawn_egg";
  MinecraftItemTypes2["PigSpawnEgg"] = "minecraft:pig_spawn_egg";
  MinecraftItemTypes2["PiglinBannerPattern"] = "minecraft:piglin_banner_pattern";
  MinecraftItemTypes2["PiglinBruteSpawnEgg"] = "minecraft:piglin_brute_spawn_egg";
  MinecraftItemTypes2["PiglinHead"] = "minecraft:piglin_head";
  MinecraftItemTypes2["PiglinSpawnEgg"] = "minecraft:piglin_spawn_egg";
  MinecraftItemTypes2["PillagerSpawnEgg"] = "minecraft:pillager_spawn_egg";
  MinecraftItemTypes2["PinkBundle"] = "minecraft:pink_bundle";
  MinecraftItemTypes2["PinkCandle"] = "minecraft:pink_candle";
  MinecraftItemTypes2["PinkCarpet"] = "minecraft:pink_carpet";
  MinecraftItemTypes2["PinkConcrete"] = "minecraft:pink_concrete";
  MinecraftItemTypes2["PinkConcretePowder"] = "minecraft:pink_concrete_powder";
  MinecraftItemTypes2["PinkDye"] = "minecraft:pink_dye";
  MinecraftItemTypes2["PinkGlazedTerracotta"] = "minecraft:pink_glazed_terracotta";
  MinecraftItemTypes2["PinkHarness"] = "minecraft:pink_harness";
  MinecraftItemTypes2["PinkPetals"] = "minecraft:pink_petals";
  MinecraftItemTypes2["PinkShulkerBox"] = "minecraft:pink_shulker_box";
  MinecraftItemTypes2["PinkStainedGlass"] = "minecraft:pink_stained_glass";
  MinecraftItemTypes2["PinkStainedGlassPane"] = "minecraft:pink_stained_glass_pane";
  MinecraftItemTypes2["PinkTerracotta"] = "minecraft:pink_terracotta";
  MinecraftItemTypes2["PinkTulip"] = "minecraft:pink_tulip";
  MinecraftItemTypes2["PinkWool"] = "minecraft:pink_wool";
  MinecraftItemTypes2["Piston"] = "minecraft:piston";
  MinecraftItemTypes2["PitcherPlant"] = "minecraft:pitcher_plant";
  MinecraftItemTypes2["PitcherPod"] = "minecraft:pitcher_pod";
  MinecraftItemTypes2["PlayerHead"] = "minecraft:player_head";
  MinecraftItemTypes2["PlentyPotterySherd"] = "minecraft:plenty_pottery_sherd";
  MinecraftItemTypes2["Podzol"] = "minecraft:podzol";
  MinecraftItemTypes2["PointedDripstone"] = "minecraft:pointed_dripstone";
  MinecraftItemTypes2["PoisonousPotato"] = "minecraft:poisonous_potato";
  MinecraftItemTypes2["PolarBearSpawnEgg"] = "minecraft:polar_bear_spawn_egg";
  MinecraftItemTypes2["PolishedAndesite"] = "minecraft:polished_andesite";
  MinecraftItemTypes2["PolishedAndesiteSlab"] = "minecraft:polished_andesite_slab";
  MinecraftItemTypes2["PolishedAndesiteStairs"] = "minecraft:polished_andesite_stairs";
  MinecraftItemTypes2["PolishedBasalt"] = "minecraft:polished_basalt";
  MinecraftItemTypes2["PolishedBlackstone"] = "minecraft:polished_blackstone";
  MinecraftItemTypes2["PolishedBlackstoneBrickSlab"] = "minecraft:polished_blackstone_brick_slab";
  MinecraftItemTypes2["PolishedBlackstoneBrickStairs"] = "minecraft:polished_blackstone_brick_stairs";
  MinecraftItemTypes2["PolishedBlackstoneBrickWall"] = "minecraft:polished_blackstone_brick_wall";
  MinecraftItemTypes2["PolishedBlackstoneBricks"] = "minecraft:polished_blackstone_bricks";
  MinecraftItemTypes2["PolishedBlackstoneButton"] = "minecraft:polished_blackstone_button";
  MinecraftItemTypes2["PolishedBlackstonePressurePlate"] = "minecraft:polished_blackstone_pressure_plate";
  MinecraftItemTypes2["PolishedBlackstoneSlab"] = "minecraft:polished_blackstone_slab";
  MinecraftItemTypes2["PolishedBlackstoneStairs"] = "minecraft:polished_blackstone_stairs";
  MinecraftItemTypes2["PolishedBlackstoneWall"] = "minecraft:polished_blackstone_wall";
  MinecraftItemTypes2["PolishedDeepslate"] = "minecraft:polished_deepslate";
  MinecraftItemTypes2["PolishedDeepslateSlab"] = "minecraft:polished_deepslate_slab";
  MinecraftItemTypes2["PolishedDeepslateStairs"] = "minecraft:polished_deepslate_stairs";
  MinecraftItemTypes2["PolishedDeepslateWall"] = "minecraft:polished_deepslate_wall";
  MinecraftItemTypes2["PolishedDiorite"] = "minecraft:polished_diorite";
  MinecraftItemTypes2["PolishedDioriteSlab"] = "minecraft:polished_diorite_slab";
  MinecraftItemTypes2["PolishedDioriteStairs"] = "minecraft:polished_diorite_stairs";
  MinecraftItemTypes2["PolishedGranite"] = "minecraft:polished_granite";
  MinecraftItemTypes2["PolishedGraniteSlab"] = "minecraft:polished_granite_slab";
  MinecraftItemTypes2["PolishedGraniteStairs"] = "minecraft:polished_granite_stairs";
  MinecraftItemTypes2["PolishedTuff"] = "minecraft:polished_tuff";
  MinecraftItemTypes2["PolishedTuffSlab"] = "minecraft:polished_tuff_slab";
  MinecraftItemTypes2["PolishedTuffStairs"] = "minecraft:polished_tuff_stairs";
  MinecraftItemTypes2["PolishedTuffWall"] = "minecraft:polished_tuff_wall";
  MinecraftItemTypes2["PoppedChorusFruit"] = "minecraft:popped_chorus_fruit";
  MinecraftItemTypes2["Poppy"] = "minecraft:poppy";
  MinecraftItemTypes2["Porkchop"] = "minecraft:porkchop";
  MinecraftItemTypes2["Potato"] = "minecraft:potato";
  MinecraftItemTypes2["Potion"] = "minecraft:potion";
  MinecraftItemTypes2["PowderSnowBucket"] = "minecraft:powder_snow_bucket";
  MinecraftItemTypes2["Prismarine"] = "minecraft:prismarine";
  MinecraftItemTypes2["PrismarineBrickSlab"] = "minecraft:prismarine_brick_slab";
  MinecraftItemTypes2["PrismarineBricks"] = "minecraft:prismarine_bricks";
  MinecraftItemTypes2["PrismarineBricksStairs"] = "minecraft:prismarine_bricks_stairs";
  MinecraftItemTypes2["PrismarineCrystals"] = "minecraft:prismarine_crystals";
  MinecraftItemTypes2["PrismarineShard"] = "minecraft:prismarine_shard";
  MinecraftItemTypes2["PrismarineSlab"] = "minecraft:prismarine_slab";
  MinecraftItemTypes2["PrismarineStairs"] = "minecraft:prismarine_stairs";
  MinecraftItemTypes2["PrismarineWall"] = "minecraft:prismarine_wall";
  MinecraftItemTypes2["PrizePotterySherd"] = "minecraft:prize_pottery_sherd";
  MinecraftItemTypes2["Pufferfish"] = "minecraft:pufferfish";
  MinecraftItemTypes2["PufferfishBucket"] = "minecraft:pufferfish_bucket";
  MinecraftItemTypes2["PufferfishSpawnEgg"] = "minecraft:pufferfish_spawn_egg";
  MinecraftItemTypes2["Pumpkin"] = "minecraft:pumpkin";
  MinecraftItemTypes2["PumpkinPie"] = "minecraft:pumpkin_pie";
  MinecraftItemTypes2["PumpkinSeeds"] = "minecraft:pumpkin_seeds";
  MinecraftItemTypes2["PurpleBundle"] = "minecraft:purple_bundle";
  MinecraftItemTypes2["PurpleCandle"] = "minecraft:purple_candle";
  MinecraftItemTypes2["PurpleCarpet"] = "minecraft:purple_carpet";
  MinecraftItemTypes2["PurpleConcrete"] = "minecraft:purple_concrete";
  MinecraftItemTypes2["PurpleConcretePowder"] = "minecraft:purple_concrete_powder";
  MinecraftItemTypes2["PurpleDye"] = "minecraft:purple_dye";
  MinecraftItemTypes2["PurpleGlazedTerracotta"] = "minecraft:purple_glazed_terracotta";
  MinecraftItemTypes2["PurpleHarness"] = "minecraft:purple_harness";
  MinecraftItemTypes2["PurpleShulkerBox"] = "minecraft:purple_shulker_box";
  MinecraftItemTypes2["PurpleStainedGlass"] = "minecraft:purple_stained_glass";
  MinecraftItemTypes2["PurpleStainedGlassPane"] = "minecraft:purple_stained_glass_pane";
  MinecraftItemTypes2["PurpleTerracotta"] = "minecraft:purple_terracotta";
  MinecraftItemTypes2["PurpleWool"] = "minecraft:purple_wool";
  MinecraftItemTypes2["PurpurBlock"] = "minecraft:purpur_block";
  MinecraftItemTypes2["PurpurPillar"] = "minecraft:purpur_pillar";
  MinecraftItemTypes2["PurpurSlab"] = "minecraft:purpur_slab";
  MinecraftItemTypes2["PurpurStairs"] = "minecraft:purpur_stairs";
  MinecraftItemTypes2["Quartz"] = "minecraft:quartz";
  MinecraftItemTypes2["QuartzBlock"] = "minecraft:quartz_block";
  MinecraftItemTypes2["QuartzBricks"] = "minecraft:quartz_bricks";
  MinecraftItemTypes2["QuartzOre"] = "minecraft:quartz_ore";
  MinecraftItemTypes2["QuartzPillar"] = "minecraft:quartz_pillar";
  MinecraftItemTypes2["QuartzSlab"] = "minecraft:quartz_slab";
  MinecraftItemTypes2["QuartzStairs"] = "minecraft:quartz_stairs";
  MinecraftItemTypes2["Rabbit"] = "minecraft:rabbit";
  MinecraftItemTypes2["RabbitFoot"] = "minecraft:rabbit_foot";
  MinecraftItemTypes2["RabbitHide"] = "minecraft:rabbit_hide";
  MinecraftItemTypes2["RabbitSpawnEgg"] = "minecraft:rabbit_spawn_egg";
  MinecraftItemTypes2["RabbitStew"] = "minecraft:rabbit_stew";
  MinecraftItemTypes2["Rail"] = "minecraft:rail";
  MinecraftItemTypes2["RaiserArmorTrimSmithingTemplate"] = "minecraft:raiser_armor_trim_smithing_template";
  MinecraftItemTypes2["RavagerSpawnEgg"] = "minecraft:ravager_spawn_egg";
  MinecraftItemTypes2["RawCopper"] = "minecraft:raw_copper";
  MinecraftItemTypes2["RawCopperBlock"] = "minecraft:raw_copper_block";
  MinecraftItemTypes2["RawGold"] = "minecraft:raw_gold";
  MinecraftItemTypes2["RawGoldBlock"] = "minecraft:raw_gold_block";
  MinecraftItemTypes2["RawIron"] = "minecraft:raw_iron";
  MinecraftItemTypes2["RawIronBlock"] = "minecraft:raw_iron_block";
  MinecraftItemTypes2["RecoveryCompass"] = "minecraft:recovery_compass";
  MinecraftItemTypes2["RedBundle"] = "minecraft:red_bundle";
  MinecraftItemTypes2["RedCandle"] = "minecraft:red_candle";
  MinecraftItemTypes2["RedCarpet"] = "minecraft:red_carpet";
  MinecraftItemTypes2["RedConcrete"] = "minecraft:red_concrete";
  MinecraftItemTypes2["RedConcretePowder"] = "minecraft:red_concrete_powder";
  MinecraftItemTypes2["RedDye"] = "minecraft:red_dye";
  MinecraftItemTypes2["RedGlazedTerracotta"] = "minecraft:red_glazed_terracotta";
  MinecraftItemTypes2["RedHarness"] = "minecraft:red_harness";
  MinecraftItemTypes2["RedMushroom"] = "minecraft:red_mushroom";
  MinecraftItemTypes2["RedMushroomBlock"] = "minecraft:red_mushroom_block";
  MinecraftItemTypes2["RedNetherBrick"] = "minecraft:red_nether_brick";
  MinecraftItemTypes2["RedNetherBrickSlab"] = "minecraft:red_nether_brick_slab";
  MinecraftItemTypes2["RedNetherBrickStairs"] = "minecraft:red_nether_brick_stairs";
  MinecraftItemTypes2["RedNetherBrickWall"] = "minecraft:red_nether_brick_wall";
  MinecraftItemTypes2["RedSand"] = "minecraft:red_sand";
  MinecraftItemTypes2["RedSandstone"] = "minecraft:red_sandstone";
  MinecraftItemTypes2["RedSandstoneSlab"] = "minecraft:red_sandstone_slab";
  MinecraftItemTypes2["RedSandstoneStairs"] = "minecraft:red_sandstone_stairs";
  MinecraftItemTypes2["RedSandstoneWall"] = "minecraft:red_sandstone_wall";
  MinecraftItemTypes2["RedShulkerBox"] = "minecraft:red_shulker_box";
  MinecraftItemTypes2["RedStainedGlass"] = "minecraft:red_stained_glass";
  MinecraftItemTypes2["RedStainedGlassPane"] = "minecraft:red_stained_glass_pane";
  MinecraftItemTypes2["RedTerracotta"] = "minecraft:red_terracotta";
  MinecraftItemTypes2["RedTulip"] = "minecraft:red_tulip";
  MinecraftItemTypes2["RedWool"] = "minecraft:red_wool";
  MinecraftItemTypes2["Redstone"] = "minecraft:redstone";
  MinecraftItemTypes2["RedstoneBlock"] = "minecraft:redstone_block";
  MinecraftItemTypes2["RedstoneLamp"] = "minecraft:redstone_lamp";
  MinecraftItemTypes2["RedstoneOre"] = "minecraft:redstone_ore";
  MinecraftItemTypes2["RedstoneTorch"] = "minecraft:redstone_torch";
  MinecraftItemTypes2["ReinforcedDeepslate"] = "minecraft:reinforced_deepslate";
  MinecraftItemTypes2["Repeater"] = "minecraft:repeater";
  MinecraftItemTypes2["RepeatingCommandBlock"] = "minecraft:repeating_command_block";
  MinecraftItemTypes2["ResinBlock"] = "minecraft:resin_block";
  MinecraftItemTypes2["ResinBrick"] = "minecraft:resin_brick";
  MinecraftItemTypes2["ResinBrickSlab"] = "minecraft:resin_brick_slab";
  MinecraftItemTypes2["ResinBrickStairs"] = "minecraft:resin_brick_stairs";
  MinecraftItemTypes2["ResinBrickWall"] = "minecraft:resin_brick_wall";
  MinecraftItemTypes2["ResinBricks"] = "minecraft:resin_bricks";
  MinecraftItemTypes2["ResinClump"] = "minecraft:resin_clump";
  MinecraftItemTypes2["RespawnAnchor"] = "minecraft:respawn_anchor";
  MinecraftItemTypes2["RibArmorTrimSmithingTemplate"] = "minecraft:rib_armor_trim_smithing_template";
  MinecraftItemTypes2["RoseBush"] = "minecraft:rose_bush";
  MinecraftItemTypes2["RottenFlesh"] = "minecraft:rotten_flesh";
  MinecraftItemTypes2["Saddle"] = "minecraft:saddle";
  MinecraftItemTypes2["Salmon"] = "minecraft:salmon";
  MinecraftItemTypes2["SalmonBucket"] = "minecraft:salmon_bucket";
  MinecraftItemTypes2["SalmonSpawnEgg"] = "minecraft:salmon_spawn_egg";
  MinecraftItemTypes2["Sand"] = "minecraft:sand";
  MinecraftItemTypes2["Sandstone"] = "minecraft:sandstone";
  MinecraftItemTypes2["SandstoneSlab"] = "minecraft:sandstone_slab";
  MinecraftItemTypes2["SandstoneStairs"] = "minecraft:sandstone_stairs";
  MinecraftItemTypes2["SandstoneWall"] = "minecraft:sandstone_wall";
  MinecraftItemTypes2["Scaffolding"] = "minecraft:scaffolding";
  MinecraftItemTypes2["ScrapePotterySherd"] = "minecraft:scrape_pottery_sherd";
  MinecraftItemTypes2["Sculk"] = "minecraft:sculk";
  MinecraftItemTypes2["SculkCatalyst"] = "minecraft:sculk_catalyst";
  MinecraftItemTypes2["SculkSensor"] = "minecraft:sculk_sensor";
  MinecraftItemTypes2["SculkShrieker"] = "minecraft:sculk_shrieker";
  MinecraftItemTypes2["SculkVein"] = "minecraft:sculk_vein";
  MinecraftItemTypes2["SeaLantern"] = "minecraft:sea_lantern";
  MinecraftItemTypes2["SeaPickle"] = "minecraft:sea_pickle";
  MinecraftItemTypes2["Seagrass"] = "minecraft:seagrass";
  MinecraftItemTypes2["SentryArmorTrimSmithingTemplate"] = "minecraft:sentry_armor_trim_smithing_template";
  MinecraftItemTypes2["ShaperArmorTrimSmithingTemplate"] = "minecraft:shaper_armor_trim_smithing_template";
  MinecraftItemTypes2["SheafPotterySherd"] = "minecraft:sheaf_pottery_sherd";
  MinecraftItemTypes2["Shears"] = "minecraft:shears";
  MinecraftItemTypes2["SheepSpawnEgg"] = "minecraft:sheep_spawn_egg";
  MinecraftItemTypes2["ShelterPotterySherd"] = "minecraft:shelter_pottery_sherd";
  MinecraftItemTypes2["Shield"] = "minecraft:shield";
  MinecraftItemTypes2["ShortDryGrass"] = "minecraft:short_dry_grass";
  MinecraftItemTypes2["ShortGrass"] = "minecraft:short_grass";
  MinecraftItemTypes2["Shroomlight"] = "minecraft:shroomlight";
  MinecraftItemTypes2["ShulkerShell"] = "minecraft:shulker_shell";
  MinecraftItemTypes2["ShulkerSpawnEgg"] = "minecraft:shulker_spawn_egg";
  MinecraftItemTypes2["SilenceArmorTrimSmithingTemplate"] = "minecraft:silence_armor_trim_smithing_template";
  MinecraftItemTypes2["SilverGlazedTerracotta"] = "minecraft:silver_glazed_terracotta";
  MinecraftItemTypes2["SilverfishSpawnEgg"] = "minecraft:silverfish_spawn_egg";
  MinecraftItemTypes2["SkeletonHorseSpawnEgg"] = "minecraft:skeleton_horse_spawn_egg";
  MinecraftItemTypes2["SkeletonSkull"] = "minecraft:skeleton_skull";
  MinecraftItemTypes2["SkeletonSpawnEgg"] = "minecraft:skeleton_spawn_egg";
  MinecraftItemTypes2["SkullBannerPattern"] = "minecraft:skull_banner_pattern";
  MinecraftItemTypes2["SkullPotterySherd"] = "minecraft:skull_pottery_sherd";
  MinecraftItemTypes2["Slime"] = "minecraft:slime";
  MinecraftItemTypes2["SlimeBall"] = "minecraft:slime_ball";
  MinecraftItemTypes2["SlimeSpawnEgg"] = "minecraft:slime_spawn_egg";
  MinecraftItemTypes2["SmallAmethystBud"] = "minecraft:small_amethyst_bud";
  MinecraftItemTypes2["SmallDripleafBlock"] = "minecraft:small_dripleaf_block";
  MinecraftItemTypes2["SmithingTable"] = "minecraft:smithing_table";
  MinecraftItemTypes2["Smoker"] = "minecraft:smoker";
  MinecraftItemTypes2["SmoothBasalt"] = "minecraft:smooth_basalt";
  MinecraftItemTypes2["SmoothQuartz"] = "minecraft:smooth_quartz";
  MinecraftItemTypes2["SmoothQuartzSlab"] = "minecraft:smooth_quartz_slab";
  MinecraftItemTypes2["SmoothQuartzStairs"] = "minecraft:smooth_quartz_stairs";
  MinecraftItemTypes2["SmoothRedSandstone"] = "minecraft:smooth_red_sandstone";
  MinecraftItemTypes2["SmoothRedSandstoneSlab"] = "minecraft:smooth_red_sandstone_slab";
  MinecraftItemTypes2["SmoothRedSandstoneStairs"] = "minecraft:smooth_red_sandstone_stairs";
  MinecraftItemTypes2["SmoothSandstone"] = "minecraft:smooth_sandstone";
  MinecraftItemTypes2["SmoothSandstoneSlab"] = "minecraft:smooth_sandstone_slab";
  MinecraftItemTypes2["SmoothSandstoneStairs"] = "minecraft:smooth_sandstone_stairs";
  MinecraftItemTypes2["SmoothStone"] = "minecraft:smooth_stone";
  MinecraftItemTypes2["SmoothStoneSlab"] = "minecraft:smooth_stone_slab";
  MinecraftItemTypes2["SnifferEgg"] = "minecraft:sniffer_egg";
  MinecraftItemTypes2["SnifferSpawnEgg"] = "minecraft:sniffer_spawn_egg";
  MinecraftItemTypes2["SnortPotterySherd"] = "minecraft:snort_pottery_sherd";
  MinecraftItemTypes2["SnoutArmorTrimSmithingTemplate"] = "minecraft:snout_armor_trim_smithing_template";
  MinecraftItemTypes2["Snow"] = "minecraft:snow";
  MinecraftItemTypes2["SnowGolemSpawnEgg"] = "minecraft:snow_golem_spawn_egg";
  MinecraftItemTypes2["SnowLayer"] = "minecraft:snow_layer";
  MinecraftItemTypes2["Snowball"] = "minecraft:snowball";
  MinecraftItemTypes2["SoulCampfire"] = "minecraft:soul_campfire";
  MinecraftItemTypes2["SoulLantern"] = "minecraft:soul_lantern";
  MinecraftItemTypes2["SoulSand"] = "minecraft:soul_sand";
  MinecraftItemTypes2["SoulSoil"] = "minecraft:soul_soil";
  MinecraftItemTypes2["SoulTorch"] = "minecraft:soul_torch";
  MinecraftItemTypes2["SpiderEye"] = "minecraft:spider_eye";
  MinecraftItemTypes2["SpiderSpawnEgg"] = "minecraft:spider_spawn_egg";
  MinecraftItemTypes2["SpireArmorTrimSmithingTemplate"] = "minecraft:spire_armor_trim_smithing_template";
  MinecraftItemTypes2["SplashPotion"] = "minecraft:splash_potion";
  MinecraftItemTypes2["Sponge"] = "minecraft:sponge";
  MinecraftItemTypes2["SporeBlossom"] = "minecraft:spore_blossom";
  MinecraftItemTypes2["SpruceBoat"] = "minecraft:spruce_boat";
  MinecraftItemTypes2["SpruceButton"] = "minecraft:spruce_button";
  MinecraftItemTypes2["SpruceChestBoat"] = "minecraft:spruce_chest_boat";
  MinecraftItemTypes2["SpruceDoor"] = "minecraft:spruce_door";
  MinecraftItemTypes2["SpruceFence"] = "minecraft:spruce_fence";
  MinecraftItemTypes2["SpruceFenceGate"] = "minecraft:spruce_fence_gate";
  MinecraftItemTypes2["SpruceHangingSign"] = "minecraft:spruce_hanging_sign";
  MinecraftItemTypes2["SpruceLeaves"] = "minecraft:spruce_leaves";
  MinecraftItemTypes2["SpruceLog"] = "minecraft:spruce_log";
  MinecraftItemTypes2["SprucePlanks"] = "minecraft:spruce_planks";
  MinecraftItemTypes2["SprucePressurePlate"] = "minecraft:spruce_pressure_plate";
  MinecraftItemTypes2["SpruceSapling"] = "minecraft:spruce_sapling";
  MinecraftItemTypes2["SpruceShelf"] = "minecraft:spruce_shelf";
  MinecraftItemTypes2["SpruceSign"] = "minecraft:spruce_sign";
  MinecraftItemTypes2["SpruceSlab"] = "minecraft:spruce_slab";
  MinecraftItemTypes2["SpruceStairs"] = "minecraft:spruce_stairs";
  MinecraftItemTypes2["SpruceTrapdoor"] = "minecraft:spruce_trapdoor";
  MinecraftItemTypes2["SpruceWood"] = "minecraft:spruce_wood";
  MinecraftItemTypes2["Spyglass"] = "minecraft:spyglass";
  MinecraftItemTypes2["SquidSpawnEgg"] = "minecraft:squid_spawn_egg";
  MinecraftItemTypes2["Stick"] = "minecraft:stick";
  MinecraftItemTypes2["StickyPiston"] = "minecraft:sticky_piston";
  MinecraftItemTypes2["Stone"] = "minecraft:stone";
  MinecraftItemTypes2["StoneAxe"] = "minecraft:stone_axe";
  MinecraftItemTypes2["StoneBrickSlab"] = "minecraft:stone_brick_slab";
  MinecraftItemTypes2["StoneBrickStairs"] = "minecraft:stone_brick_stairs";
  MinecraftItemTypes2["StoneBrickWall"] = "minecraft:stone_brick_wall";
  MinecraftItemTypes2["StoneBricks"] = "minecraft:stone_bricks";
  MinecraftItemTypes2["StoneButton"] = "minecraft:stone_button";
  MinecraftItemTypes2["StoneHoe"] = "minecraft:stone_hoe";
  MinecraftItemTypes2["StonePickaxe"] = "minecraft:stone_pickaxe";
  MinecraftItemTypes2["StonePressurePlate"] = "minecraft:stone_pressure_plate";
  MinecraftItemTypes2["StoneShovel"] = "minecraft:stone_shovel";
  MinecraftItemTypes2["StoneSpear"] = "minecraft:stone_spear";
  MinecraftItemTypes2["StoneStairs"] = "minecraft:stone_stairs";
  MinecraftItemTypes2["StoneSword"] = "minecraft:stone_sword";
  MinecraftItemTypes2["StonecutterBlock"] = "minecraft:stonecutter_block";
  MinecraftItemTypes2["StraySpawnEgg"] = "minecraft:stray_spawn_egg";
  MinecraftItemTypes2["StriderSpawnEgg"] = "minecraft:strider_spawn_egg";
  MinecraftItemTypes2["String"] = "minecraft:string";
  MinecraftItemTypes2["StrippedAcaciaLog"] = "minecraft:stripped_acacia_log";
  MinecraftItemTypes2["StrippedAcaciaWood"] = "minecraft:stripped_acacia_wood";
  MinecraftItemTypes2["StrippedBambooBlock"] = "minecraft:stripped_bamboo_block";
  MinecraftItemTypes2["StrippedBirchLog"] = "minecraft:stripped_birch_log";
  MinecraftItemTypes2["StrippedBirchWood"] = "minecraft:stripped_birch_wood";
  MinecraftItemTypes2["StrippedCherryLog"] = "minecraft:stripped_cherry_log";
  MinecraftItemTypes2["StrippedCherryWood"] = "minecraft:stripped_cherry_wood";
  MinecraftItemTypes2["StrippedCrimsonHyphae"] = "minecraft:stripped_crimson_hyphae";
  MinecraftItemTypes2["StrippedCrimsonStem"] = "minecraft:stripped_crimson_stem";
  MinecraftItemTypes2["StrippedDarkOakLog"] = "minecraft:stripped_dark_oak_log";
  MinecraftItemTypes2["StrippedDarkOakWood"] = "minecraft:stripped_dark_oak_wood";
  MinecraftItemTypes2["StrippedJungleLog"] = "minecraft:stripped_jungle_log";
  MinecraftItemTypes2["StrippedJungleWood"] = "minecraft:stripped_jungle_wood";
  MinecraftItemTypes2["StrippedMangroveLog"] = "minecraft:stripped_mangrove_log";
  MinecraftItemTypes2["StrippedMangroveWood"] = "minecraft:stripped_mangrove_wood";
  MinecraftItemTypes2["StrippedOakLog"] = "minecraft:stripped_oak_log";
  MinecraftItemTypes2["StrippedOakWood"] = "minecraft:stripped_oak_wood";
  MinecraftItemTypes2["StrippedPaleOakLog"] = "minecraft:stripped_pale_oak_log";
  MinecraftItemTypes2["StrippedPaleOakWood"] = "minecraft:stripped_pale_oak_wood";
  MinecraftItemTypes2["StrippedSpruceLog"] = "minecraft:stripped_spruce_log";
  MinecraftItemTypes2["StrippedSpruceWood"] = "minecraft:stripped_spruce_wood";
  MinecraftItemTypes2["StrippedWarpedHyphae"] = "minecraft:stripped_warped_hyphae";
  MinecraftItemTypes2["StrippedWarpedStem"] = "minecraft:stripped_warped_stem";
  MinecraftItemTypes2["StructureBlock"] = "minecraft:structure_block";
  MinecraftItemTypes2["StructureVoid"] = "minecraft:structure_void";
  MinecraftItemTypes2["Sugar"] = "minecraft:sugar";
  MinecraftItemTypes2["SugarCane"] = "minecraft:sugar_cane";
  MinecraftItemTypes2["Sunflower"] = "minecraft:sunflower";
  MinecraftItemTypes2["SuspiciousGravel"] = "minecraft:suspicious_gravel";
  MinecraftItemTypes2["SuspiciousSand"] = "minecraft:suspicious_sand";
  MinecraftItemTypes2["SuspiciousStew"] = "minecraft:suspicious_stew";
  MinecraftItemTypes2["SweetBerries"] = "minecraft:sweet_berries";
  MinecraftItemTypes2["TadpoleBucket"] = "minecraft:tadpole_bucket";
  MinecraftItemTypes2["TadpoleSpawnEgg"] = "minecraft:tadpole_spawn_egg";
  MinecraftItemTypes2["TallDryGrass"] = "minecraft:tall_dry_grass";
  MinecraftItemTypes2["TallGrass"] = "minecraft:tall_grass";
  MinecraftItemTypes2["Target"] = "minecraft:target";
  MinecraftItemTypes2["TideArmorTrimSmithingTemplate"] = "minecraft:tide_armor_trim_smithing_template";
  MinecraftItemTypes2["TintedGlass"] = "minecraft:tinted_glass";
  MinecraftItemTypes2["Tnt"] = "minecraft:tnt";
  MinecraftItemTypes2["TntMinecart"] = "minecraft:tnt_minecart";
  MinecraftItemTypes2["Torch"] = "minecraft:torch";
  MinecraftItemTypes2["Torchflower"] = "minecraft:torchflower";
  MinecraftItemTypes2["TorchflowerSeeds"] = "minecraft:torchflower_seeds";
  MinecraftItemTypes2["TotemOfUndying"] = "minecraft:totem_of_undying";
  MinecraftItemTypes2["TraderLlamaSpawnEgg"] = "minecraft:trader_llama_spawn_egg";
  MinecraftItemTypes2["Trapdoor"] = "minecraft:trapdoor";
  MinecraftItemTypes2["TrappedChest"] = "minecraft:trapped_chest";
  MinecraftItemTypes2["TrialKey"] = "minecraft:trial_key";
  MinecraftItemTypes2["TrialSpawner"] = "minecraft:trial_spawner";
  MinecraftItemTypes2["Trident"] = "minecraft:trident";
  MinecraftItemTypes2["TripwireHook"] = "minecraft:tripwire_hook";
  MinecraftItemTypes2["TropicalFish"] = "minecraft:tropical_fish";
  MinecraftItemTypes2["TropicalFishBucket"] = "minecraft:tropical_fish_bucket";
  MinecraftItemTypes2["TropicalFishSpawnEgg"] = "minecraft:tropical_fish_spawn_egg";
  MinecraftItemTypes2["TubeCoral"] = "minecraft:tube_coral";
  MinecraftItemTypes2["TubeCoralBlock"] = "minecraft:tube_coral_block";
  MinecraftItemTypes2["TubeCoralFan"] = "minecraft:tube_coral_fan";
  MinecraftItemTypes2["Tuff"] = "minecraft:tuff";
  MinecraftItemTypes2["TuffBrickSlab"] = "minecraft:tuff_brick_slab";
  MinecraftItemTypes2["TuffBrickStairs"] = "minecraft:tuff_brick_stairs";
  MinecraftItemTypes2["TuffBrickWall"] = "minecraft:tuff_brick_wall";
  MinecraftItemTypes2["TuffBricks"] = "minecraft:tuff_bricks";
  MinecraftItemTypes2["TuffSlab"] = "minecraft:tuff_slab";
  MinecraftItemTypes2["TuffStairs"] = "minecraft:tuff_stairs";
  MinecraftItemTypes2["TuffWall"] = "minecraft:tuff_wall";
  MinecraftItemTypes2["TurtleEgg"] = "minecraft:turtle_egg";
  MinecraftItemTypes2["TurtleHelmet"] = "minecraft:turtle_helmet";
  MinecraftItemTypes2["TurtleScute"] = "minecraft:turtle_scute";
  MinecraftItemTypes2["TurtleSpawnEgg"] = "minecraft:turtle_spawn_egg";
  MinecraftItemTypes2["TwistingVines"] = "minecraft:twisting_vines";
  MinecraftItemTypes2["UndyedShulkerBox"] = "minecraft:undyed_shulker_box";
  MinecraftItemTypes2["Vault"] = "minecraft:vault";
  MinecraftItemTypes2["VerdantFroglight"] = "minecraft:verdant_froglight";
  MinecraftItemTypes2["VexArmorTrimSmithingTemplate"] = "minecraft:vex_armor_trim_smithing_template";
  MinecraftItemTypes2["VexSpawnEgg"] = "minecraft:vex_spawn_egg";
  MinecraftItemTypes2["VillagerSpawnEgg"] = "minecraft:villager_spawn_egg";
  MinecraftItemTypes2["VindicatorSpawnEgg"] = "minecraft:vindicator_spawn_egg";
  MinecraftItemTypes2["Vine"] = "minecraft:vine";
  MinecraftItemTypes2["WanderingTraderSpawnEgg"] = "minecraft:wandering_trader_spawn_egg";
  MinecraftItemTypes2["WardArmorTrimSmithingTemplate"] = "minecraft:ward_armor_trim_smithing_template";
  MinecraftItemTypes2["WardenSpawnEgg"] = "minecraft:warden_spawn_egg";
  MinecraftItemTypes2["WarpedButton"] = "minecraft:warped_button";
  MinecraftItemTypes2["WarpedDoor"] = "minecraft:warped_door";
  MinecraftItemTypes2["WarpedFence"] = "minecraft:warped_fence";
  MinecraftItemTypes2["WarpedFenceGate"] = "minecraft:warped_fence_gate";
  MinecraftItemTypes2["WarpedFungus"] = "minecraft:warped_fungus";
  MinecraftItemTypes2["WarpedFungusOnAStick"] = "minecraft:warped_fungus_on_a_stick";
  MinecraftItemTypes2["WarpedHangingSign"] = "minecraft:warped_hanging_sign";
  MinecraftItemTypes2["WarpedHyphae"] = "minecraft:warped_hyphae";
  MinecraftItemTypes2["WarpedNylium"] = "minecraft:warped_nylium";
  MinecraftItemTypes2["WarpedPlanks"] = "minecraft:warped_planks";
  MinecraftItemTypes2["WarpedPressurePlate"] = "minecraft:warped_pressure_plate";
  MinecraftItemTypes2["WarpedRoots"] = "minecraft:warped_roots";
  MinecraftItemTypes2["WarpedShelf"] = "minecraft:warped_shelf";
  MinecraftItemTypes2["WarpedSign"] = "minecraft:warped_sign";
  MinecraftItemTypes2["WarpedSlab"] = "minecraft:warped_slab";
  MinecraftItemTypes2["WarpedStairs"] = "minecraft:warped_stairs";
  MinecraftItemTypes2["WarpedStem"] = "minecraft:warped_stem";
  MinecraftItemTypes2["WarpedTrapdoor"] = "minecraft:warped_trapdoor";
  MinecraftItemTypes2["WarpedWartBlock"] = "minecraft:warped_wart_block";
  MinecraftItemTypes2["WaterBucket"] = "minecraft:water_bucket";
  MinecraftItemTypes2["Waterlily"] = "minecraft:waterlily";
  MinecraftItemTypes2["WaxedChiseledCopper"] = "minecraft:waxed_chiseled_copper";
  MinecraftItemTypes2["WaxedCopper"] = "minecraft:waxed_copper";
  MinecraftItemTypes2["WaxedCopperBars"] = "minecraft:waxed_copper_bars";
  MinecraftItemTypes2["WaxedCopperBulb"] = "minecraft:waxed_copper_bulb";
  MinecraftItemTypes2["WaxedCopperChain"] = "minecraft:waxed_copper_chain";
  MinecraftItemTypes2["WaxedCopperChest"] = "minecraft:waxed_copper_chest";
  MinecraftItemTypes2["WaxedCopperDoor"] = "minecraft:waxed_copper_door";
  MinecraftItemTypes2["WaxedCopperGolemStatue"] = "minecraft:waxed_copper_golem_statue";
  MinecraftItemTypes2["WaxedCopperGrate"] = "minecraft:waxed_copper_grate";
  MinecraftItemTypes2["WaxedCopperLantern"] = "minecraft:waxed_copper_lantern";
  MinecraftItemTypes2["WaxedCopperTrapdoor"] = "minecraft:waxed_copper_trapdoor";
  MinecraftItemTypes2["WaxedCutCopper"] = "minecraft:waxed_cut_copper";
  MinecraftItemTypes2["WaxedCutCopperSlab"] = "minecraft:waxed_cut_copper_slab";
  MinecraftItemTypes2["WaxedCutCopperStairs"] = "minecraft:waxed_cut_copper_stairs";
  MinecraftItemTypes2["WaxedExposedChiseledCopper"] = "minecraft:waxed_exposed_chiseled_copper";
  MinecraftItemTypes2["WaxedExposedCopper"] = "minecraft:waxed_exposed_copper";
  MinecraftItemTypes2["WaxedExposedCopperBars"] = "minecraft:waxed_exposed_copper_bars";
  MinecraftItemTypes2["WaxedExposedCopperBulb"] = "minecraft:waxed_exposed_copper_bulb";
  MinecraftItemTypes2["WaxedExposedCopperChain"] = "minecraft:waxed_exposed_copper_chain";
  MinecraftItemTypes2["WaxedExposedCopperChest"] = "minecraft:waxed_exposed_copper_chest";
  MinecraftItemTypes2["WaxedExposedCopperDoor"] = "minecraft:waxed_exposed_copper_door";
  MinecraftItemTypes2["WaxedExposedCopperGolemStatue"] = "minecraft:waxed_exposed_copper_golem_statue";
  MinecraftItemTypes2["WaxedExposedCopperGrate"] = "minecraft:waxed_exposed_copper_grate";
  MinecraftItemTypes2["WaxedExposedCopperLantern"] = "minecraft:waxed_exposed_copper_lantern";
  MinecraftItemTypes2["WaxedExposedCopperTrapdoor"] = "minecraft:waxed_exposed_copper_trapdoor";
  MinecraftItemTypes2["WaxedExposedCutCopper"] = "minecraft:waxed_exposed_cut_copper";
  MinecraftItemTypes2["WaxedExposedCutCopperSlab"] = "minecraft:waxed_exposed_cut_copper_slab";
  MinecraftItemTypes2["WaxedExposedCutCopperStairs"] = "minecraft:waxed_exposed_cut_copper_stairs";
  MinecraftItemTypes2["WaxedExposedLightningRod"] = "minecraft:waxed_exposed_lightning_rod";
  MinecraftItemTypes2["WaxedLightningRod"] = "minecraft:waxed_lightning_rod";
  MinecraftItemTypes2["WaxedOxidizedChiseledCopper"] = "minecraft:waxed_oxidized_chiseled_copper";
  MinecraftItemTypes2["WaxedOxidizedCopper"] = "minecraft:waxed_oxidized_copper";
  MinecraftItemTypes2["WaxedOxidizedCopperBars"] = "minecraft:waxed_oxidized_copper_bars";
  MinecraftItemTypes2["WaxedOxidizedCopperBulb"] = "minecraft:waxed_oxidized_copper_bulb";
  MinecraftItemTypes2["WaxedOxidizedCopperChain"] = "minecraft:waxed_oxidized_copper_chain";
  MinecraftItemTypes2["WaxedOxidizedCopperChest"] = "minecraft:waxed_oxidized_copper_chest";
  MinecraftItemTypes2["WaxedOxidizedCopperDoor"] = "minecraft:waxed_oxidized_copper_door";
  MinecraftItemTypes2["WaxedOxidizedCopperGolemStatue"] = "minecraft:waxed_oxidized_copper_golem_statue";
  MinecraftItemTypes2["WaxedOxidizedCopperGrate"] = "minecraft:waxed_oxidized_copper_grate";
  MinecraftItemTypes2["WaxedOxidizedCopperLantern"] = "minecraft:waxed_oxidized_copper_lantern";
  MinecraftItemTypes2["WaxedOxidizedCopperTrapdoor"] = "minecraft:waxed_oxidized_copper_trapdoor";
  MinecraftItemTypes2["WaxedOxidizedCutCopper"] = "minecraft:waxed_oxidized_cut_copper";
  MinecraftItemTypes2["WaxedOxidizedCutCopperSlab"] = "minecraft:waxed_oxidized_cut_copper_slab";
  MinecraftItemTypes2["WaxedOxidizedCutCopperStairs"] = "minecraft:waxed_oxidized_cut_copper_stairs";
  MinecraftItemTypes2["WaxedOxidizedLightningRod"] = "minecraft:waxed_oxidized_lightning_rod";
  MinecraftItemTypes2["WaxedWeatheredChiseledCopper"] = "minecraft:waxed_weathered_chiseled_copper";
  MinecraftItemTypes2["WaxedWeatheredCopper"] = "minecraft:waxed_weathered_copper";
  MinecraftItemTypes2["WaxedWeatheredCopperBars"] = "minecraft:waxed_weathered_copper_bars";
  MinecraftItemTypes2["WaxedWeatheredCopperBulb"] = "minecraft:waxed_weathered_copper_bulb";
  MinecraftItemTypes2["WaxedWeatheredCopperChain"] = "minecraft:waxed_weathered_copper_chain";
  MinecraftItemTypes2["WaxedWeatheredCopperChest"] = "minecraft:waxed_weathered_copper_chest";
  MinecraftItemTypes2["WaxedWeatheredCopperDoor"] = "minecraft:waxed_weathered_copper_door";
  MinecraftItemTypes2["WaxedWeatheredCopperGolemStatue"] = "minecraft:waxed_weathered_copper_golem_statue";
  MinecraftItemTypes2["WaxedWeatheredCopperGrate"] = "minecraft:waxed_weathered_copper_grate";
  MinecraftItemTypes2["WaxedWeatheredCopperLantern"] = "minecraft:waxed_weathered_copper_lantern";
  MinecraftItemTypes2["WaxedWeatheredCopperTrapdoor"] = "minecraft:waxed_weathered_copper_trapdoor";
  MinecraftItemTypes2["WaxedWeatheredCutCopper"] = "minecraft:waxed_weathered_cut_copper";
  MinecraftItemTypes2["WaxedWeatheredCutCopperSlab"] = "minecraft:waxed_weathered_cut_copper_slab";
  MinecraftItemTypes2["WaxedWeatheredCutCopperStairs"] = "minecraft:waxed_weathered_cut_copper_stairs";
  MinecraftItemTypes2["WaxedWeatheredLightningRod"] = "minecraft:waxed_weathered_lightning_rod";
  MinecraftItemTypes2["WayfinderArmorTrimSmithingTemplate"] = "minecraft:wayfinder_armor_trim_smithing_template";
  MinecraftItemTypes2["WeatheredChiseledCopper"] = "minecraft:weathered_chiseled_copper";
  MinecraftItemTypes2["WeatheredCopper"] = "minecraft:weathered_copper";
  MinecraftItemTypes2["WeatheredCopperBars"] = "minecraft:weathered_copper_bars";
  MinecraftItemTypes2["WeatheredCopperBulb"] = "minecraft:weathered_copper_bulb";
  MinecraftItemTypes2["WeatheredCopperChain"] = "minecraft:weathered_copper_chain";
  MinecraftItemTypes2["WeatheredCopperChest"] = "minecraft:weathered_copper_chest";
  MinecraftItemTypes2["WeatheredCopperDoor"] = "minecraft:weathered_copper_door";
  MinecraftItemTypes2["WeatheredCopperGolemStatue"] = "minecraft:weathered_copper_golem_statue";
  MinecraftItemTypes2["WeatheredCopperGrate"] = "minecraft:weathered_copper_grate";
  MinecraftItemTypes2["WeatheredCopperLantern"] = "minecraft:weathered_copper_lantern";
  MinecraftItemTypes2["WeatheredCopperTrapdoor"] = "minecraft:weathered_copper_trapdoor";
  MinecraftItemTypes2["WeatheredCutCopper"] = "minecraft:weathered_cut_copper";
  MinecraftItemTypes2["WeatheredCutCopperSlab"] = "minecraft:weathered_cut_copper_slab";
  MinecraftItemTypes2["WeatheredCutCopperStairs"] = "minecraft:weathered_cut_copper_stairs";
  MinecraftItemTypes2["WeatheredLightningRod"] = "minecraft:weathered_lightning_rod";
  MinecraftItemTypes2["Web"] = "minecraft:web";
  MinecraftItemTypes2["WeepingVines"] = "minecraft:weeping_vines";
  MinecraftItemTypes2["WetSponge"] = "minecraft:wet_sponge";
  MinecraftItemTypes2["Wheat"] = "minecraft:wheat";
  MinecraftItemTypes2["WheatSeeds"] = "minecraft:wheat_seeds";
  MinecraftItemTypes2["WhiteBundle"] = "minecraft:white_bundle";
  MinecraftItemTypes2["WhiteCandle"] = "minecraft:white_candle";
  MinecraftItemTypes2["WhiteCarpet"] = "minecraft:white_carpet";
  MinecraftItemTypes2["WhiteConcrete"] = "minecraft:white_concrete";
  MinecraftItemTypes2["WhiteConcretePowder"] = "minecraft:white_concrete_powder";
  MinecraftItemTypes2["WhiteDye"] = "minecraft:white_dye";
  MinecraftItemTypes2["WhiteGlazedTerracotta"] = "minecraft:white_glazed_terracotta";
  MinecraftItemTypes2["WhiteHarness"] = "minecraft:white_harness";
  MinecraftItemTypes2["WhiteShulkerBox"] = "minecraft:white_shulker_box";
  MinecraftItemTypes2["WhiteStainedGlass"] = "minecraft:white_stained_glass";
  MinecraftItemTypes2["WhiteStainedGlassPane"] = "minecraft:white_stained_glass_pane";
  MinecraftItemTypes2["WhiteTerracotta"] = "minecraft:white_terracotta";
  MinecraftItemTypes2["WhiteTulip"] = "minecraft:white_tulip";
  MinecraftItemTypes2["WhiteWool"] = "minecraft:white_wool";
  MinecraftItemTypes2["WildArmorTrimSmithingTemplate"] = "minecraft:wild_armor_trim_smithing_template";
  MinecraftItemTypes2["Wildflowers"] = "minecraft:wildflowers";
  MinecraftItemTypes2["WindCharge"] = "minecraft:wind_charge";
  MinecraftItemTypes2["WitchSpawnEgg"] = "minecraft:witch_spawn_egg";
  MinecraftItemTypes2["WitherRose"] = "minecraft:wither_rose";
  MinecraftItemTypes2["WitherSkeletonSkull"] = "minecraft:wither_skeleton_skull";
  MinecraftItemTypes2["WitherSkeletonSpawnEgg"] = "minecraft:wither_skeleton_spawn_egg";
  MinecraftItemTypes2["WitherSpawnEgg"] = "minecraft:wither_spawn_egg";
  MinecraftItemTypes2["WolfArmor"] = "minecraft:wolf_armor";
  MinecraftItemTypes2["WolfSpawnEgg"] = "minecraft:wolf_spawn_egg";
  MinecraftItemTypes2["WoodenAxe"] = "minecraft:wooden_axe";
  MinecraftItemTypes2["WoodenButton"] = "minecraft:wooden_button";
  MinecraftItemTypes2["WoodenDoor"] = "minecraft:wooden_door";
  MinecraftItemTypes2["WoodenHoe"] = "minecraft:wooden_hoe";
  MinecraftItemTypes2["WoodenPickaxe"] = "minecraft:wooden_pickaxe";
  MinecraftItemTypes2["WoodenPressurePlate"] = "minecraft:wooden_pressure_plate";
  MinecraftItemTypes2["WoodenShovel"] = "minecraft:wooden_shovel";
  MinecraftItemTypes2["WoodenSpear"] = "minecraft:wooden_spear";
  MinecraftItemTypes2["WoodenSword"] = "minecraft:wooden_sword";
  MinecraftItemTypes2["WritableBook"] = "minecraft:writable_book";
  MinecraftItemTypes2["YellowBundle"] = "minecraft:yellow_bundle";
  MinecraftItemTypes2["YellowCandle"] = "minecraft:yellow_candle";
  MinecraftItemTypes2["YellowCarpet"] = "minecraft:yellow_carpet";
  MinecraftItemTypes2["YellowConcrete"] = "minecraft:yellow_concrete";
  MinecraftItemTypes2["YellowConcretePowder"] = "minecraft:yellow_concrete_powder";
  MinecraftItemTypes2["YellowDye"] = "minecraft:yellow_dye";
  MinecraftItemTypes2["YellowGlazedTerracotta"] = "minecraft:yellow_glazed_terracotta";
  MinecraftItemTypes2["YellowHarness"] = "minecraft:yellow_harness";
  MinecraftItemTypes2["YellowShulkerBox"] = "minecraft:yellow_shulker_box";
  MinecraftItemTypes2["YellowStainedGlass"] = "minecraft:yellow_stained_glass";
  MinecraftItemTypes2["YellowStainedGlassPane"] = "minecraft:yellow_stained_glass_pane";
  MinecraftItemTypes2["YellowTerracotta"] = "minecraft:yellow_terracotta";
  MinecraftItemTypes2["YellowWool"] = "minecraft:yellow_wool";
  MinecraftItemTypes2["ZoglinSpawnEgg"] = "minecraft:zoglin_spawn_egg";
  MinecraftItemTypes2["ZombieHead"] = "minecraft:zombie_head";
  MinecraftItemTypes2["ZombieHorseSpawnEgg"] = "minecraft:zombie_horse_spawn_egg";
  MinecraftItemTypes2["ZombieNautilusSpawnEgg"] = "minecraft:zombie_nautilus_spawn_egg";
  MinecraftItemTypes2["ZombiePigmanSpawnEgg"] = "minecraft:zombie_pigman_spawn_egg";
  MinecraftItemTypes2["ZombieSpawnEgg"] = "minecraft:zombie_spawn_egg";
  MinecraftItemTypes2["ZombieVillagerSpawnEgg"] = "minecraft:zombie_villager_spawn_egg";
  return MinecraftItemTypes2;
})(MinecraftItemTypes || {});
var MinecraftPotionDeliveryTypes = ((MinecraftPotionDeliveryTypes2) => {
  MinecraftPotionDeliveryTypes2["Consume"] = "Consume";
  MinecraftPotionDeliveryTypes2["ThrownLingering"] = "ThrownLingering";
  MinecraftPotionDeliveryTypes2["ThrownSplash"] = "ThrownSplash";
  return MinecraftPotionDeliveryTypes2;
})(MinecraftPotionDeliveryTypes || {});
var MinecraftPotionEffectTypes = ((MinecraftPotionEffectTypes2) => {
  MinecraftPotionEffectTypes2["Awkward"] = "minecraft:awkward";
  MinecraftPotionEffectTypes2["FireResistance"] = "minecraft:fire_resistance";
  MinecraftPotionEffectTypes2["Harming"] = "minecraft:harming";
  MinecraftPotionEffectTypes2["Healing"] = "minecraft:healing";
  MinecraftPotionEffectTypes2["Infested"] = "minecraft:infested";
  MinecraftPotionEffectTypes2["Invisibility"] = "minecraft:invisibility";
  MinecraftPotionEffectTypes2["Leaping"] = "minecraft:leaping";
  MinecraftPotionEffectTypes2["LongFireResistance"] = "minecraft:long_fire_resistance";
  MinecraftPotionEffectTypes2["LongInvisibility"] = "minecraft:long_invisibility";
  MinecraftPotionEffectTypes2["LongLeaping"] = "minecraft:long_leaping";
  MinecraftPotionEffectTypes2["LongMundane"] = "minecraft:long_mundane";
  MinecraftPotionEffectTypes2["LongNightvision"] = "minecraft:long_nightvision";
  MinecraftPotionEffectTypes2["LongPoison"] = "minecraft:long_poison";
  MinecraftPotionEffectTypes2["LongRegeneration"] = "minecraft:long_regeneration";
  MinecraftPotionEffectTypes2["LongSlowFalling"] = "minecraft:long_slow_falling";
  MinecraftPotionEffectTypes2["LongSlowness"] = "minecraft:long_slowness";
  MinecraftPotionEffectTypes2["LongStrength"] = "minecraft:long_strength";
  MinecraftPotionEffectTypes2["LongSwiftness"] = "minecraft:long_swiftness";
  MinecraftPotionEffectTypes2["LongTurtleMaster"] = "minecraft:long_turtle_master";
  MinecraftPotionEffectTypes2["LongWaterBreathing"] = "minecraft:long_water_breathing";
  MinecraftPotionEffectTypes2["LongWeakness"] = "minecraft:long_weakness";
  MinecraftPotionEffectTypes2["Mundane"] = "minecraft:mundane";
  MinecraftPotionEffectTypes2["Nightvision"] = "minecraft:nightvision";
  MinecraftPotionEffectTypes2["Oozing"] = "minecraft:oozing";
  MinecraftPotionEffectTypes2["Poison"] = "minecraft:poison";
  MinecraftPotionEffectTypes2["Regeneration"] = "minecraft:regeneration";
  MinecraftPotionEffectTypes2["SlowFalling"] = "minecraft:slow_falling";
  MinecraftPotionEffectTypes2["Slowness"] = "minecraft:slowness";
  MinecraftPotionEffectTypes2["Strength"] = "minecraft:strength";
  MinecraftPotionEffectTypes2["StrongHarming"] = "minecraft:strong_harming";
  MinecraftPotionEffectTypes2["StrongHealing"] = "minecraft:strong_healing";
  MinecraftPotionEffectTypes2["StrongLeaping"] = "minecraft:strong_leaping";
  MinecraftPotionEffectTypes2["StrongPoison"] = "minecraft:strong_poison";
  MinecraftPotionEffectTypes2["StrongRegeneration"] = "minecraft:strong_regeneration";
  MinecraftPotionEffectTypes2["StrongSlowness"] = "minecraft:strong_slowness";
  MinecraftPotionEffectTypes2["StrongStrength"] = "minecraft:strong_strength";
  MinecraftPotionEffectTypes2["StrongSwiftness"] = "minecraft:strong_swiftness";
  MinecraftPotionEffectTypes2["StrongTurtleMaster"] = "minecraft:strong_turtle_master";
  MinecraftPotionEffectTypes2["Swiftness"] = "minecraft:swiftness";
  MinecraftPotionEffectTypes2["Thick"] = "minecraft:thick";
  MinecraftPotionEffectTypes2["TurtleMaster"] = "minecraft:turtle_master";
  MinecraftPotionEffectTypes2["Water"] = "minecraft:water";
  MinecraftPotionEffectTypes2["WaterBreathing"] = "minecraft:water_breathing";
  MinecraftPotionEffectTypes2["Weakness"] = "minecraft:weakness";
  MinecraftPotionEffectTypes2["Weaving"] = "minecraft:weaving";
  MinecraftPotionEffectTypes2["WindCharged"] = "minecraft:wind_charged";
  MinecraftPotionEffectTypes2["Wither"] = "minecraft:wither";
  return MinecraftPotionEffectTypes2;
})(MinecraftPotionEffectTypes || {});

// src/main/bedrock/ts/world/worldgen/core/world_gen/generator.ts
import { BlockPermutation as BlockPermutation17, BlockVolume as BlockVolume4, system as system39 } from "@minecraft/server";
var air;
var water;
system39.run(() => {
  air = BlockPermutation17.resolve("air");
  water = BlockPermutation17.resolve("water");
});
var seaLevel = -40;
var entry = -60;
var SOIL_DEPTH = 4;
var STATS_CACHE = /* @__PURE__ */ new Map();
var ChunkGenerator = class {
  seaLevel;
  entry;
  manager;
  dimension;
  dimensionId;
  range;
  building;
  seed;
  isGenerating = /* @__PURE__ */ new Set();
  base;
  spikes;
  kind;
  overall;
  deep;
  trees;
  temp;
  humi;
  constructor(sessionManager, dimension, seed2) {
    this.seaLevel = seaLevel;
    this.entry = entry;
    this.manager = sessionManager;
    this.dimension = dimension;
    this.dimensionId = dimension.id;
    this.range = dimension.heightRange;
    this.building = /* @__PURE__ */ new Set();
    this.seed = seed2;
    const biomeFactor = 1 / (this.manager.definition.biomeManager.biomes.length * 2 + 10) / 200;
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
    this.temp = new FastNoiseLite(seed2.nextInt());
    this.temp.SetFrequency(biomeFactor * 0.5);
    this.humi = new FastNoiseLite(seed2.nextInt());
    this.humi.SetFrequency(biomeFactor * 0.75);
  }
  getStats(x, z) {
    const key = `${this.dimensionId}:${x},${z}`;
    if (STATS_CACHE.has(key)) return STATS_CACHE.get(key);
    const { base, spikes, kind, overall, deep, temp, humi } = this;
    const s = spikes.GetNoise(x, z) * 0.7 + 1, b = base.GetNoise(x, z) + 1, k = kind.GetNoise(x, z) / 2, o = (overall.GetNoise(x, z) + 1) / 2, d = (deep.GetNoise(x, z) + 1) / 2;
    const waterPropriety = proximityEaseing(d, 20);
    const temperature = (temp.GetNoise(x, z) + 1) / 2;
    const humidity = (humi.GetNoise(x, z) + 1) / 2;
    const height = (s * 2.5 * (0.8 + k) + b * proximityEaseing(0.5 + k, 10) * 8 + proximityEaseing(o, 7) * (0.8 + k)) * (waterPropriety / 2 + 0.5) + waterPropriety * 3.5;
    const stats = { s, b, k, o, d, waterPropriety, temperature, humidity, height };
    if (STATS_CACHE.size > 1e4) STATS_CACHE.clear();
    STATS_CACHE.set(key, stats);
    return stats;
  }
  getHeight(x, z) {
    const stats = this.getStats(x, z);
    const biome = this.getBiome(stats.temperature, stats.humidity);
    const h = stats.height * 10 * (1 + biome.scale) + biome.depth * 40 + this.entry;
    return Math.max(Math.floor(h), this.seaLevel + 1);
  }
  buildChunk(X, Z, hash) {
    if (this.isGenerating.has(hash)) return Promise.resolve();
    if (this.isGenerated(hash)) return Promise.resolve();
    const task = new Promise((r, j) => system39.runJob(this.generate(X, Z, r, j)));
    this.isGenerating.add(hash);
    task.then(() => this.setGenerated(hash)).catch((e) => console.error(e, e.stack)).finally(() => this.isGenerating.delete(hash));
    return task;
  }
  isGenerated(hash) {
    return this.manager.isGenerated(hash + this.dimensionId);
  }
  setGenerated(hash) {
    this.manager.setGenerated(hash + this.dimensionId);
  }
  /**
   * DETERMINISTIC column-by-column terrain generator.
   * 
   * Each column ALWAYS gets:
   *   Y = terrain:                  1 block of groundPalette (grass)
   *   Y = terrain-1 to terrain-4:   4 blocks of underGroundPalette (soil)
   *   Y = terrain-5 to globalFloor: gaia_stone (filled per-column)
   *   Y < globalFloor:              gaia_stone (filled chunk-wide)
   *
   * Uses only BlockVolume (AABB) fills — the most reliable Bedrock API.
   * No ListBlockVolume for terrain. No probabilistic layer selection.
   */
  *generate(X, Z, res, rej) {
    if (!air || !water) {
      system39.run(() => system39.runJob(this.generate(X, Z, res, rej)));
      return;
    }
    const { seaLevel: seaLevel2, entry: entry2, dimension: d } = this;
    try {
      let theLowest = Infinity;
      const random2 = this.seed.getSeqence(X, Z);
      const worldX = X * 16, worldZ = Z * 16;
      const terrainHeights = new Array(256);
      const biomeData = new Array(256);
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          const idx = x * 16 + z;
          const xx = worldX + x, zz = worldZ + z;
          const stats = this.getStats(xx, zz);
          const biome = this.getBiome(stats.temperature, stats.humidity);
          let terrain = Math.floor(stats.height * 10 * (1 + biome.scale) + biome.depth * 40 + entry2);
          if (isNaN(terrain) || !isFinite(terrain)) terrain = entry2;
          terrain = Math.max(this.range.min, Math.min(this.range.max - 1, terrain));
          if (terrain < theLowest) theLowest = terrain;
          terrainHeights[idx] = terrain;
          biomeData[idx] = biome;
        }
        yield;
      }
      const globalFloor = Math.max(this.range.min, theLowest - SOIL_DEPTH);
      const trees = [];
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          const idx = x * 16 + z;
          const xx = worldX + x, zz = worldZ + z;
          const terrain = terrainHeights[idx];
          const biome = biomeData[idx];
          const underSea = terrain < seaLevel2;
          const groundId = biome.groundPaletted.toBlockId(0);
          const underId = biome.underGroundPaletted.toBlockId(0);
          const surfaceId = underSea ? underId : groundId;
          try {
            d.fillBlocks(
              new BlockVolume4(
                { x: xx, y: terrain, z: zz },
                { x: xx, y: terrain, z: zz }
              ),
              surfaceId,
              { ignoreChunkBoundErrors: true }
            );
          } catch (_) {
          }
          const soilBottom = Math.max(globalFloor, terrain - SOIL_DEPTH);
          if (terrain - 1 >= soilBottom) {
            try {
              d.fillBlocks(
                new BlockVolume4(
                  { x: xx, y: terrain - 1, z: zz },
                  { x: xx, y: soilBottom, z: zz }
                ),
                underId,
                { ignoreChunkBoundErrors: true }
              );
            } catch (_) {
            }
          }
          if (soilBottom - 1 >= globalFloor) {
            try {
              d.fillBlocks(
                new BlockVolume4(
                  { x: xx, y: soilBottom - 1, z: zz },
                  { x: xx, y: globalFloor, z: zz }
                ),
                "gaiadimension:gaia_stone",
                { ignoreChunkBoundErrors: true }
              );
            } catch (_) {
            }
          }
          if (!underSea && biome.vegetationPalette.permutations.length > 0) {
            if (random2.nextFloat() < biome.vegetationChance) {
              const vegId = biome.vegetationPalette.toBlockId(random2.nextFloat());
              const vegY = Math.min(this.range.max - 1, terrain + 1);
              try {
                d.fillBlocks(
                  new BlockVolume4(
                    { x: xx, y: vegY, z: zz },
                    { x: xx, y: vegY, z: zz }
                  ),
                  vegId,
                  { ignoreChunkBoundErrors: true }
                );
              } catch (_) {
              }
            }
          }
          if (!underSea && biome.hasTrees) {
            if (random2.nextFloat() < biome.treesChance && easeOutQuad((this.trees.GetNoise(xx, zz) + 1) / 2) < biome.treeAreaChance) {
              trees.push({
                x: xx,
                y: Math.min(this.range.max - 1, terrain + 1),
                z: zz,
                treePalete: biome.trees,
                dimension: d
              });
            }
          }
        }
        yield;
      }
      yield;
      const treePlacer = new PalettedPlacer();
      if (this.manager.definition.IsPrecalculated) {
        for (let loc of trees) {
          const treedDef = loc.treePalete.get(random2.nextFloat());
          const offSetCalculator = (v) => Vec32.add(loc, v);
          try {
            if (treedDef.canPlaceValidator(loc)) {
              const sample = treedDef.getCompiledSample(random2.nextFloat());
              for (const [permutation, list] of sample) {
                treePlacer.setPaletteLocations(
                  permutation,
                  treePlacer.getPaletteLocations(permutation).concat(list.map(offSetCalculator))
                );
              }
            }
          } catch (_) {
          }
          yield;
        }
      } else {
        for (const loc of trees) {
          const treedDef = loc.treePalete.get(random2.nextFloat());
          try {
            if (treedDef.canPlaceValidator(loc)) yield* treedDef.place(loc, random2, treePlacer);
          } catch (_) {
          }
        }
      }
      yield;
      yield* treePlacer.flush(d, { ignoreChunkBoundErrors: true, blockFilter: { includePermutations: [air] } });
      yield;
      if (theLowest !== Infinity) {
        const stoneBottom = Math.max(this.range.min, globalFloor - 60);
        let currY = globalFloor - 1;
        while (currY > stoneBottom) {
          const nextY = Math.max(stoneBottom, currY - 16);
          try {
            d.fillBlocks(
              new BlockVolume4(
                { x: worldX, y: currY, z: worldZ },
                { x: worldX + 15, y: nextY, z: worldZ + 15 }
              ),
              "gaiadimension:gaia_stone",
              {
                blockFilter: { includePermutations: [air] },
                ignoreChunkBoundErrors: true
              }
            );
          } catch (_) {
          }
          currY = nextY;
          yield;
        }
      }
      yield;
      if (theLowest !== Infinity && theLowest < seaLevel2) {
        try {
          d.fillBlocks(
            new BlockVolume4(
              { x: worldX, y: seaLevel2, z: worldZ },
              { x: worldX + 15, y: theLowest, z: worldZ + 15 }
            ),
            water,
            {
              blockFilter: { includePermutations: [air], includeTags: ["water"] },
              ignoreChunkBoundErrors: true
            }
          );
        } catch (_) {
        }
      }
      res();
    } catch (e) {
      console.error(`[GaiaDim] Chunk ${X},${Z} error:`, e);
      res();
    }
  }
  getBiome(temp, humi) {
    return this.manager.getBiome(temp, humi);
  }
};

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
    [
      MinecraftDimensionTypes.Overworld,
      MinecraftDimensionTypes.Nether,
      MinecraftDimensionTypes.TheEnd
    ].forEach((id) => this.getOrCreateGenerator(id));
  }
  getOrCreateGenerator(dimensionId) {
    if (this.generators.has(dimensionId)) return this.generators.get(dimensionId);
    try {
      const dimension = world32.getDimension(dimensionId);
      const gen = new ChunkGenerator(this, dimension, this.procedural);
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
    return world32.getDynamicProperty(hash);
  }
  setGenerated(hash) {
    world32.setDynamicProperty(hash, true);
  }
  getBiome(temp, humi) {
    return this.definition.biomeManager.getBiome(temp, humi);
  }
};

// src/main/bedrock/ts/world/worldgen/core/world_gen/index.ts
var seed;
system40.run(() => {
  let savedSeed = world33.getDynamicProperty("seed");
  if (!savedSeed) {
    savedSeed = Math.ceil(Date.now() * Math.random() * 2);
    world33.setDynamicProperty("seed", savedSeed);
  }
  seed = savedSeed;
  SESSION_MANAGER.init(seed);
});
var SESSION_MANAGER = new class {
  _instance;
  init(seed2) {
    this._instance = new SessionManager(seed2);
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
}();

// src/main/bedrock/ts/world/worldgen/core/client/index.ts
world34.afterEvents.worldLoad.subscribe((e) => {
  for (const p of world34.getAllPlayers()) {
    playerInitialize(p).catch((e2) => console.error(e2, e2.stack));
  }
});
world34.beforeEvents.playerLeave.subscribe((e) => {
  ClientChunk.open(SESSION_MANAGER, e.player).stop();
});
world34.afterEvents.worldLoad.subscribe(() => (async () => {
  await null;
  DEFINITION_MANAGER.triggerFinialize(SESSION_MANAGER.procedural);
})().catch((e) => console.error(e, e.stack)));
async function playerInitialize(player) {
  await null;
  const local = ClientChunk.open(SESSION_MANAGER, player);
  local.start();
  const { x, z } = player.location;
  const gen = local.currentGenerator;
  if (gen) {
    const y = gen.getHeight(x, z);
    player.teleport({ x, y: y + 1, z });
  }
  player.sendMessage("\xA77World generation initialized.");
  player.sendMessage("\xA77Type \xA7r\xA7l!debug\xA7r\xA77 to show debug stats.");
}
world34.beforeEvents.chatSend.subscribe(async (e) => {
  const msg = e.message.toLowerCase();
  const player = e.sender;
  if (msg === "!stats") {
    while (!player.isSneaking) await delay(1);
    const form = new ModalFormData2();
    form.title("\xA7t\xA7lWorld Gen Settings");
    form.textField("\nSeed", Date.now() + "", "" + SESSION_MANAGER.seed);
    form.toggle("Precomputed Features", DEFINITION_MANAGER.IsPrecalculatedVariable);
    form.slider("Precomputed Samples", 5, 30, 1, DEFINITION_MANAGER.IsPrecalculatedSamplesVariable);
    const data = await form.show(player);
    if (!data.canceled) {
      DEFINITION_MANAGER.IsPrecalculated = data.formValues[1];
      DEFINITION_MANAGER.PrecalculatedSamples = data.formValues[2];
      let newSeed = parseInt(data.formValues[0]);
      if (isFinite(newSeed)) world34.setDynamicProperty("seed", newSeed);
      player.sendMessage("Successfully Updated\nRejoin to active these changes.");
    }
  } else if (msg === "!debug") {
    player._debug = !player._debug;
  }
});

// src/main/bedrock/ts/world/worldgen/core/my_world/biomes.ts
var pinkAgateTree = new SpruceTreeDefinition();
pinkAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:pink_agate_log"));
pinkAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:pink_agate_leaves"));
pinkAgateTree.setHeight(5, 9);
var blueAgateTree = new SpruceTreeDefinition();
blueAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:blue_agate_log"));
blueAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:blue_agate_leaves"));
blueAgateTree.setHeight(6, 10);
var greenAgateTree = new SpruceTreeDefinition();
greenAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:green_agate_log"));
greenAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:green_agate_leaves"));
greenAgateTree.setHeight(7, 12);
var purpleAgateTree = new SpruceTreeDefinition();
purpleAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:purple_agate_log"));
purpleAgateTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:purple_agate_leaves"));
purpleAgateTree.setHeight(5, 8);
var corruptedTree = new SpruceTreeDefinition();
corruptedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:corrupted_log"));
corruptedTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:corrupted_leaves"));
corruptedTree.setHeight(4, 7);
var burntAgateTree = new PillarTreeDefinition("burnt_agate");
burntAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:burnt_agate_log"));
burntAgateTree.setHeight(3, 6);
var goldenTree = new SpruceTreeDefinition();
goldenTree.setLogPaletted(new PalettedBrush().add("gaiadimension:golden_log"));
goldenTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:golden_leaves"));
goldenTree.setHeight(5, 9);
var auraTree = new SpruceTreeDefinition();
auraTree.setLogPaletted(new PalettedBrush().add("gaiadimension:aura_log"));
auraTree.setLeavesPaletted(new PalettedBrush().add("gaiadimension:aura_leaves"));
auraTree.setHeight(4, 8);
var fireAgateTree = new PillarTreeDefinition("fire_agate");
fireAgateTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fire_agate_log"));
fireAgateTree.setHeight(3, 5);
var fossilizedTree = new CuttedSpruceTreeDefinition();
fossilizedTree.setLogPaletted(new PalettedBrush().add("gaiadimension:fossilized_log"));
fossilizedTree.setCarpetPaletted(new PalettedBrush().add("gaiadimension:fossilized_leaves"));
fossilizedTree.setHeight(3, 6);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:crystal_plains").setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:aura_crystal_growth", 5).add("gaiadimension:thiscus", 3).add("gaiadimension:pink_crystal_growth", 2).add("gaiadimension:blue_crystal_growth", 2)
  ).setVegetationChance(0.12).setTemperature(0.5, 0.8).setHumidity(0.3, 0.6).setDepth(0.125).setScale(0.05)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:pink_agate_forest").setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:pink_crystal_growth", 4).add("gaiadimension:peach_crystal_growth", 3).add("gaiadimension:spotted_kersei", 2).add("gaiadimension:bulbous_hobina", 1)
  ).setVegetationChance(0.15).setTrees(new TreePalette().add(pinkAgateTree)).setTreesChance(0.06).setTreesAreaChance(0.6).setTemperature(0.6, 0.9).setHumidity(0.6, 0.9).setDepth(0.2).setScale(0.2)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:blue_agate_taiga").setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:blue_crystal_growth", 4).add("gaiadimension:mystical_murgni", 2).add("gaiadimension:thorny_wiltha", 1)
  ).setVegetationChance(0.1).setTrees(new TreePalette().add(blueAgateTree)).setTreesChance(0.05).setTreesAreaChance(0.55).setTemperature(0.1, 0.4).setHumidity(0.4, 0.7).setDepth(0.3).setScale(0.4)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:green_agate_jungle").setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:heavy_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:green_crystal_growth", 4).add("gaiadimension:agathum", 2).add("gaiadimension:stickly_cupsir", 2).add("gaiadimension:ouzium", 1)
  ).setVegetationChance(0.2).setTrees(new TreePalette().add(greenAgateTree)).setTreesChance(0.08).setTreesAreaChance(0.7).setTemperature(0.8, 1).setHumidity(0.8, 1).setDepth(0.1).setScale(0.4)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:purple_agate_swamp").setGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:corrupted_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:purple_crystal_growth", 4).add("gaiadimension:corrupted_gaia_eye", 2).add("gaiadimension:corrupt_varloom", 2).add("gaiadimension:roofed_agaric", 1)
  ).setVegetationChance(0.18).setTrees(new TreePalette().add(purpleAgateTree).add(corruptedTree)).setTreesChance(0.04).setTreesAreaChance(0.45).setTemperature(0.5, 0.8).setHumidity(0.7, 1).setDepth(-0.2).setScale(0.1)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:volcanic_lands").setGroundPalette(new PalettedBrush().add("gaiadimension:volcanic_rock")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:cinder")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:singed_crystal_growth", 3).add("gaiadimension:red_crystal_growth", 2)
  ).setVegetationChance(0.04).setTrees(new TreePalette().add(burntAgateTree)).setTreesChance(0.01).setTreesAreaChance(0.2).setTemperature(0.9, 1).setHumidity(0, 0.2).setDepth(0.4).setScale(0.5)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:static_wasteland").setGroundPalette(new PalettedBrush().add("gaiadimension:wasteland_stone")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:static_stone")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:mutant_crystal_growth", 3).add("gaiadimension:black_crystal_growth", 2)
  ).setVegetationChance(0.03).setTrees(new TreePalette().add(fossilizedTree)).setTreesChance(0.01).setTreesAreaChance(0.15).setTemperature(0.2, 0.5).setHumidity(0, 0.3).setDepth(0.1).setScale(0.1)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:salt_dunes").setGroundPalette(new PalettedBrush().add("gaiadimension:salt")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:salt_rock")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:yellow_crystal_growth", 3).add("gaiadimension:gold_orb_tucher", 1)
  ).setVegetationChance(0.02).setTemperature(0.8, 1).setHumidity(0, 0.1).setDepth(0.5).setScale(0.6)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:mookaite_mesa").setGroundPalette(new PalettedBrush().add("gaiadimension:precious_rock")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:impure_rock")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:red_crystal_growth", 2).add("gaiadimension:gold_orb_tucher", 1)
  ).setVegetationChance(0.03).setTemperature(0.7, 1).setHumidity(0.1, 0.4).setDepth(0.4).setScale(0.3)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:shining_grove").setGroundPalette(new PalettedBrush().add("gaiadimension:soft_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:light_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:aura_crystal_growth", 5).add("gaiadimension:thiscus", 3).add("gaiadimension:spotted_kersei", 2)
  ).setVegetationChance(0.15).setTrees(new TreePalette().add(auraTree)).setTreesChance(0.05).setTreesAreaChance(0.5).setTemperature(0.4, 0.7).setHumidity(0.5, 0.8).setDepth(0.125).setScale(0.05)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:smoldering_bog").setGroundPalette(new PalettedBrush().add("gaiadimension:murky_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:boggy_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:singed_crystal_growth", 3).add("gaiadimension:roofed_agaric", 2).add("gaiadimension:corrupt_varloom", 1)
  ).setVegetationChance(0.12).setTrees(new TreePalette().add(fireAgateTree)).setTreesChance(0.03).setTreesAreaChance(0.35).setTemperature(0.6, 0.9).setHumidity(0.7, 1).setDepth(-0.1).setScale(0.1)
);
DEFINITION_MANAGER.biomeManager.addBiome(
  new BiomeDefinition("gaiadimension:golden_forest").setGroundPalette(new PalettedBrush().add("gaiadimension:charred_grass")).setUnderGroundPalette(new PalettedBrush().add("gaiadimension:aurum_soil")).setVegetationPalette(
    new PalettedBrush().add("gaiadimension:yellow_crystal_growth", 4).add("gaiadimension:gold_orb_tucher", 3).add("gaiadimension:bulbous_hobina", 1)
  ).setVegetationChance(0.14).setTrees(new TreePalette().add(goldenTree)).setTreesChance(0.06).setTreesAreaChance(0.6).setTemperature(0.7, 1).setHumidity(0.5, 0.8).setDepth(0.2).setScale(0.2)
);

// src/main/bedrock/ts/API/lib/EnchantmentLib.ts
import { world as world35, system as system42 } from "@minecraft/server";
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
    system42.runInterval(() => this.manageVisuals(), 5);
    world35.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
      const { block, player } = ev;
      if (block.typeId === "minecraft:enchanting_table" && player.isSneaking) {
        ev.cancel = true;
        system42.run(() => {
          this.openEnchantmentUI(player);
        });
      }
    });
    world35.afterEvents.entityHitEntity.subscribe((ev) => {
      const { damagingEntity } = ev;
      if (!damagingEntity || !damagingEntity.getComponent("minecraft:equippable")) return;
      const equippable = damagingEntity.getComponent("minecraft:equippable");
      const mainHand = equippable.getEquipment("Mainhand");
      if (mainHand) {
        this.triggerEnchants(mainHand, "onHit", ev);
      }
    });
    world35.afterEvents.playerBreakBlock.subscribe((ev) => {
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
    for (const player of world35.getAllPlayers()) {
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
        const container2 = invComp.container;
        for (let i = 0; i < container2.size; i++) {
          const item = container2.getItem(i);
          if (item && this.hasCustomEnchants(item) && !item.getDynamicProperty("luminiae:dummy_glint")) {
            this.updateGlint(item, true);
            if (item.getDynamicProperty("luminiae:dummy_glint")) {
              container2.setItem(i, item);
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
import { world as world36, system as system43 } from "@minecraft/server";
var MalachiteGuardSystem = class {
  constructor() {
    this.init();
  }
  init() {
    world36.afterEvents.entitySpawn.subscribe((event) => {
      const { entity } = event;
      if (entity.typeId === "gaiadimension:malachite_guard") {
        this.setupGuard(entity);
      }
    });
    system43.runInterval(() => {
      const overworld = world36.getDimension("overworld");
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
    system43.run(() => {
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
      world36.sendMessage("\xA7c[Malachite Guard] \xA77The drones have fallen! The Guard's core is exposed!");
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
system44.beforeEvents.startup.subscribe((event) => {
  const { blockComponentRegistry, customCommandRegistry, itemComponentRegistry, dimensionRegistry } = event;
  dimensionRegistry.registerCustomDimension("gaiadimension:gaia");
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
  registerCrudeStorageCrateComponent({ blockComponentRegistry });
  registerMegaStorageCrateComponent({ blockComponentRegistry });
  registerFluidComponent({ blockComponentRegistry });
  registerFireStarterComponent({ itemComponentRegistry });
  registerMagicStaffComponent({ itemComponentRegistry });
  customCommandRegistry.registerCommand({
    name: "gaiadimension:travel",
    description: "Travel to the Gaia Dimension",
    permissionLevel: CommandPermissionLevel3.Any,
    cheatsRequired: false
  }, (origin) => {
    const player = origin.sourceEntity;
    if (player instanceof Player25) {
      return { status: CustomCommandStatus.Success };
    }
    return { status: CustomCommandStatus.Failure, message: "Only players can use this command." };
  });
  registerGaiaCommands(customCommandRegistry);
  registerSetBiomeCommand(customCommandRegistry);
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
