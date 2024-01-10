import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";
import { nativeRecipes, nativeFuels } from "./nativeFurnaceData.js";

const scoreboard = world.scoreboard;

function setPermutation(block, args) {
  try {
    const argumentsPermutation = JSON.stringify(args).replace(/{|}|:/g, "");
    block.dimension.runCommandAsync(`setblock ${block.location.x} ${block.location.y} ${block.location.z} ${block.typeId} ${argumentsPermutation}`);
  } catch (error) {
    console.error("Error in setPermutation:", error);
  }
}

function getObjective(id) {
  return scoreboard.getObjective(id) ?? scoreboard.addObjective(id, id);
}

function score(entity, mode = "add", objectiveId, value) {
  const objective = getObjective(objectiveId);
  if (!objective) return;

  switch (mode) {
    case 'add':
      objective.addScore(entity, value);
      break;
    case 'set':
      objective.setScore(entity, value);
      break;
    case 'remove':
      const hasScore = objective.hasParticipant(entity);
      objective.setScore(entity, (hasScore ? objective.getScore(entity) : 0) - value);
      break;
    default:
      console.error("Invalid mode in score:", mode);
      break;
  }
}

function barStage(itemId, actualValue, valueMax, inv, value, slot) {
  try {
    if (actualValue === 0) inv.setItem(slot, new ItemStack(`${itemId}_0`));
    else
      for (let i = 0; i <= value; i++) {
        inv.setItem(slot, new ItemStack(`${itemId}_${i}`));
      }
  } catch (error) {
    console.error("Error in barStage:", error);
  }
}

function itemManipulate(inv, slot, itemStack, amountMode = "set", amount = 0) {
  if (amountMode === "remove" && amount > 0) {
    if (itemStack?.amount > 1 && amount < itemStack.maxAmount) {
      const itemReturn = itemStack.clone();
      itemReturn.amount -= amount;
      inv.setItem(slot, itemReturn);
    } else if (itemStack?.amount === amount) {
      inv.setItem(slot, new ItemStack("air"));
    }
  } else if (amountMode === "add" && amount > 0) {
    if (itemStack?.amount > 0 && amount < itemStack.maxAmount) {
      const itemReturn = itemStack.clone();
      itemReturn.amount += amount;
      inv.setItem(slot, itemReturn);
    }
  }
}

function getItemTags(itemStack, list) {
  const block = BlockPermutation.resolve(itemStack?.typeId);
  let tag;

  if (block) {
    const tags = block.getTags();
    for (const tag_ of tags) {
      if (`tag:block:${tag_}` in list) {
        tag = `tag:block:${tag_}`;
      }
    }
  } else {
    const tags = itemStack.getTags();
    for (const tag_ of tags) {
      if (`tag:item:${itemStack.getTags()[tag_]}` in list) {
        tag = `tag:item:${itemStack.getTags()[tag_]}`;
      }
    }
  }

  return tag;
}

export function furnacesLoad() {
  //Command example: scriptevent forge:furnaceLoad <prefix:String> <cooktimemax:Int> <flameid: String> <arrowId: String>
  system.afterEvents.scriptEventReceive.subscribe(({ sourceEntity, message, id }) => {
    if (!entity) return;

    switch (id) {
      case 'forge:furnaceProperties':
        score(entity, "add", "cookTime", 0);
        score(entity, "add", "burnTime", 0);
        score(entity, "add", "burnTimeMax", 0);
        break;

      case 'forge:furnaceLoad':
        const args = message.split(/ +/g, 5);
        const cookTimeDefault = Number(args[1]);
        const block = entity.dimension.getBlock(entity.location);

        furnaceReciper(block, entity, { prefix: args[0], cookTickMax: cookTimeDefault, flameId: args[2], arrowId: args[3] });
        break;

      default:
        break;
    }
  });
}

function furnaceReciper(blockOrigin, entity, data = { prefix: "forge", cookTickMax: 0, flameId: "forge:flame", arrowId: "forge:arrow" }) {
  try {
    const inventory = entity.getComponent("inventory").container;
    const slot1 = inventory.getItem(0);
    const slot2 = inventory.getItem(1);
    const slot3 = inventory.getItem(2);

    const objs = [
      getObjective("cookTime"),
      getObjective("burnTime"),
      getObjective("burnTimeMax")
    ];
    const cookTime = objs[0].hasParticipant(entity) ? objs[0].getScore(entity) : 0;
    const burnTime = objs[1].hasParticipant(entity) ? objs[1].getScore(entity) : 0;
    const burnTimeMax = objs[2].hasParticipant(entity) ? objs[2].getScore(entity) : 0;

    barStage(data.flameId, burnTime, burnTimeMax, inventory, 13, 3);
    barStage(data.arrowId, cookTime, data.cookTickMax, inventory, 16, 4);

    let tag;
    let outputTyped;
    let materialTyped;

    if (slot1 && nativeRecipes[slot1.typeId]) {
      const Data = nativeRecipes[slot1.typeId]

      if (!Data.blockState) materialTyped = slot1.clone();
      else if (Data.blockState) {
        const block = BlockPermutation.resolve(slot1.typeId, Data.blockState);
        materialTyped = block.getItemStack()
      }


      if (!Data.outputBlockState && !Data.scriptedOutput) outputTyped = new ItemStack(Data.output);
      else if (Data.outputBlockState && !Data.scriptedOutput) {
        const block = BlockPermutation.resolve(Data.output, Data.outputBlockState);
        outputTyped = block.getItemStack()
      } else if (Data.scriptedOutput) outputTyped = Data.scriptedOutput(slot1.clone());


      if (slot3) {
        if ((slot3.isStackableWith(outputTyped) && slot1.isStackableWith(materialTyped)) || (!slot3 && slot1.isStackableWith(materialTyped))) {
          if (slot2) {
            if (!tag) tag = getItemTags(slot2, nativeFuels)

            if (burnTime === 0) {
              const Data2 = nativeFuels[slot2.typeId];
              if (Data2) {
                if (!Data2.return) {
                  score(entity, "set", "burnTimeMax", nativeFuels[slot2.typeId]);
                  score(entity, "set", "burnTime", burnTimeMax);
                  system.run(() => itemManipulate(inventory, 1, slot2, "remove", 1));
                } else {
                  score(entity, "set", "burnTimeMax", Data2.burnTime);
                  score(entity, "set", "burnTime", burnTimeMax);
                  inventory.setItem(1, new ItemStack(Data2.return));
                }
              } else if (tag in nativeFuels) {
                if (!nativeFuels[tag]?.return) {
                  score(entity, "set", "burnTimeMax", nativeFuels[tag]);
                  score(entity, "set", "burnTime", burnTimeMax);
                  system.run(() => itemManipulate(inventory, 1, slot2, "remove", 1));
                } else {
                  score(entity, "set", "burnTimeMax", nativeFuels[tag]?.burnTime);
                  score(entity, "set", "burnTime", burnTimeMax);
                  inventory.setItem(1, new ItemStack(nativeFuels[tag]?.return));
                }
              }
            }
          }

          if (burnTime > 0 && cookTime < data.cookTickMax) {
            score(entity, "add", "cookTime", 1);
          } else if (burnTime > 0 && cookTime === data.cookTickMax) {
            score(entity, "set", "cookTime", 0);
            if (!slot3) {
              inventory.setItem(2, outputTyped.clone());
              itemManipulate(inventory, 0, slot1, "remove", 1);
            } else {
              itemManipulate(inventory, 2, slot3, "add", 1);
              itemManipulate(inventory, 0, slot1, "remove", 1);
            }
          }
        } else if (cookTime > 0) score(entity, "set", "cookTime", 0);
      }
    }


    if (burnTime > 0) {
      score(entity, "remove", "burnTime", 1);
      const blockPerms = blockOrigin.permutation.clone();
      setPermutation(blockOrigin, [{ "gaiadimension:direction": blockPerms.getState("gaiadimension:direction") }, { "gaiadimension:lit": true }, { "gaiadimension:entity": true }]);
    } else {
      const blockPerms = blockOrigin.permutation.clone();
      setPermutation(blockOrigin, [{ "gaiadimension:direction": blockPerms.getState("gaiadimension:direction") }, { "gaiadimension:lit": false }, { "gaiadimension:entity": true }]);
    }

    if (burnTime === 0 && cookTime > 0) {
      score(entity, "remove", "cookTime", 1);
    }

    if (!slot2 && burnTime === 0 && burnTimeMax > 0) {
      score(entity, "set", "burnTimeMax", 0);
    }
  } catch (error) {
    world.sendMessage(`${error}`);
  }
}