import * as MC from '@minecraft/server'
import { nativeEssenceFuel, nativeRecipes, nativeShinyFuel } from './nativeRestructurerData'

const scoreboard = MC.world.scoreboard;

function setPermutation(block, args) {
  try {
    const argumentsPermutation = String(JSON.stringify(args).replaceAll("{", "").replaceAll("}", "").replaceAll(':', '='));
    block.dimension.runCommandAsync(`setblock ${block.location.x} ${block.location.y} ${block.location.z} ${block.typeId} ${argumentsPermutation}`);
  } catch (error) {
    console.error("Error in setPermutation:", error);
  }
}

function getObjective(id) {
  try {
    return scoreboard.getObjective(id) ?? scoreboard.addObjective(id, id);
  } catch (error) {

    return null;
  }
}

function score(entity, mode = "add", objectiveId, value) {
  try {
    const objective = getObjective(objectiveId);
    if (objective) {
      switch (mode) {
        case 'add':
          objective.addScore(entity, value);
          break;
        case 'set':
          objective.setScore(entity, value);
          break;
        case 'remove':
          objective.setScore(entity, objective.getScore(entity) - value);
          break;
        default:
          console.error("Invalid mode in score:", mode);
          break;
      }
    }
  } catch (error) {

  }
}

function percentage(partialValue, totalValue) {
  return Math.round(((100 * partialValue) / totalValue));
}

function itemManipulate(inv, slot, itemStack, amountMode = "set", amount = 0) {
  try {
    switch (amountMode) {
      case "remove":
        if (amount > 0) {
          if (itemStack?.amount > 1 && amount < itemStack.maxAmount) {
            const itemReturn = itemStack.clone();
            itemReturn.amount -= amount;
            inv.setItem(slot, itemReturn);
          } else if (itemStack?.amount === amount) {
            inv.setItem(slot, new MC.ItemStack("air"));
          }
        }
        break;

      case "add":
        if (amount > 0) {
          if (itemStack?.amount > 0 && amount < itemStack.maxAmount) {
            const itemReturn = itemStack.clone();
            itemReturn.amount += amount;
            inv.setItem(slot, itemReturn);
          }
        }
        break;
      default:
        break;
    } 


  } catch (error) {
    // Handle errors if needed
  }
}

const calculateBurnTime = (shinyBurnTime,essenceBurnTime) =>{
  return Math.round((shinyBurnTime + essenceBurnTime) / 2)
}
function barStage(itemId, actualValue, valueMax, inv, value, slot) {
  try {
    if (actualValue === 0) {
      inv.setItem(slot, new MC.ItemStack(`${itemId}_0`));
    } else {
      const valueCurrent = Math.floor(percentage(actualValue, valueMax));
      for (let i = 0; i <= value; i++) {
        if (actualValue > 0 && Math.abs(valueCurrent - Math.floor(percentage(i, value))) < 0.0001) {
        inv.setItem(slot, new MC.ItemStack(`${itemId}_${i}`));
        }
      }
    }
  } catch (error) {

  }
}


export function restructurerLoad() {
  //Command example: scriptevent forge:restructurerLoad <prefix:String> <cooktimemax:Int> <arrowId: String> <flameId:String>
  MC.system.afterEvents.scriptEventReceive.subscribe(data => {
    try {
      const { sourceEntity: entity, message, id } = data;

      switch (id) {
        case 'forge:restructurerProperties':
          score(entity, "add", "cookTime", 0);
          score(entity, "add", "burnTime", 0);
          score(entity, "add", "burnTimeMax", 0);
          break;

        case 'forge:restructurerLoad':
          const args = message.split(" ", 5);
          const cookTimeDefault = Number(args[1]);
          const block = entity.dimension.getBlock({ x: entity.location.x, y: entity.location.y, z: entity.location.z });
          restructurerReciper(block, entity, { prefix: args[0], cookTickMax: cookTimeDefault, arrowId: args[2], flameId:args[3] });
          break;

        default:
          break;
      }
    } catch (error) {

    }
  });
}

/**
 * 
 * @param {MC.Block} blockOrigin 
 * @param {MC.Entity} entity 
 * @param {Object.< prefix: string, cookTickMax: number, arrowId: string,flameId:string >} data 
 */
function restructurerReciper(blockOrigin, entity, data = { prefix: "forge", cookTickMax: 0, arrowId: "forge:restructurer_arrow",flameId:"forge:restructurer_flame"}) {
  try {
    const inv = entity.getComponent('inventory').container
    const slots = [
      inv.getItem(0), //First input(shiny item) slot
      inv.getItem(1), //Second input(essence item) slot
      inv.getItem(2), //Third input slot(ingredient input)
      inv.getItem(3), //Output slot,
      inv.getItem(4)  //Residue slot
    ]
    const cookTime = getObjective("cookTime")?.getScore(entity);
    const burnTime = getObjective("burnTime")?.getScore(entity);
    const burnTimeMax = getObjective("burnTimeMax")?.getScore(entity);
    barStage(data.flameId, burnTime, burnTimeMax, inv, 7, 5);
    barStage(data.arrowId, cookTime, data.cookTickMax, inv, 7, 6);
    let output, byproduct;
    if (slots[3].typeId in nativeRecipes){
      output = new MC.ItemStack(nativeRecipes[slots[3].typeId].output)
      byproduct = new MC.ItemStack(nativeRecipes[slots[3].typeId].byproduct)
    }
if (((slots[3].typeId in nativeRecipes && slots[4] && slots[4].isStackableWith(output)) || (slots[3]?.typeId in nativeRecipes && slots[4] == undefined))){
  if (slots[0] && slots[1]){
  if (burnTime <= 0){
  if (slots[0].typeId in nativeShinyFuel && slots[1].typeId in nativeEssenceFuel){
    score(entity, "set", "burnTimeMax", calculateBurnTime(nativeShinyFuel[slots[0].typeId],nativeEssenceFuel[slots[1].typeId]))
    score(entity, "set", "burnTime", burnTimeMax);
    MC.system.runTimeout(() => {
      itemManipulate(inv, 0, slots[0], "remove", 1);
      itemManipulate(inv, 1, slots[1], "remove", 1);
    }, 1);
  }
}
}

if (burnTime > 0 && cookTime < data.cookTickMax) {
  score(entity, "add", "cookTime", 1);
} else if (burnTime > 0 && cookTime === data.cookTickMax) {
  score(entity, "set", "cookTime", 0);
  if (slots[4] === undefined) {
    if (slots[5] === undefined) {
      inv.setItem(5, byproduct.clone());
    } else {
      itemManipulate(inv, 5, slots[5], "add", 1);
    }
    inv.setItem(4, output.clone());
    itemManipulate(inv, 0, slots[0], "remove", 1);
    itemManipulate(inv, 1, slots[1], "remove", 1);
  } else {
    itemManipulate(inv, 4, slots[4], "add", 1);
    itemManipulate(inv, 0, slots[0], "remove", 1);
    itemManipulate(inv, 1, slots[1], "remove", 1);
  }
}  
}
else {
  if (cookTime > 0) {
    score(entity, "set", "cookTime", 0);
  }
}
if (burnTime > 0) {
  score(entity, "remove", "burnTime", 1);
  const blockPerms = blockOrigin.permutation.clone();
  setPermutation(blockOrigin, [{"gaiadimension:direction": blockPerms.getState("gaiadimension:direction") }, { "gaiadimension:lit": true}, {"gaiadimension:entity": true }]);
} else {
  const blockPerms = blockOrigin.permutation.clone();
  setPermutation(blockOrigin, [{"gaiadimension:direction": blockPerms.getState("gaiadimension:direction") }, { "gaiadimension:lit": false}, {"gaiadimension:entity": true}]);
}

if (burnTime === 0 && cookTime > 0) {
  score(entity, "remove", "cookTime", 1);
}

if (!(slots[0] && slots[1]) && burnTime === 0 && burnTimeMax > 0) {
  score(entity, "set", "burnTimeMax", 0);
}
  } catch (e) {

  }
}
