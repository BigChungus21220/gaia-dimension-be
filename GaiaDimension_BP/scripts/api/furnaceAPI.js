import * as MC from "@minecraft/server";
import {nativeRecipes, nativeFuels} from "./nativeFurnaceData.js"
function setPermutation(block, args){
  let argumentsPermutation = String(JSON.stringify(args).replaceAll("{", "")).replaceAll("}", "")
  block.dimension.runCommandAsync(`setblock ${block.location.x} ${block.location.y} ${block.location.z} ${block.typeId} ${argumentsPermutation}`)
}
function temp(block){
  let test = [
    {"gaiadimension:direction": 0},
    {"gaiadimension:lit":false}
  ]
  setPermutation(block, test)
}
function getObjective(id){
  let objective = MC.world.scoreboard.getObjective(id)
  return objective
}
function score(entity, mode="add", objectiveId, value){
  if(mode=="add"){
    entity.runCommandAsync(`scoreboard players add @s ${objectiveId} ${value}`)
   }else if(mode == "set"){
    entity.runCommandAsync(`scoreboard players set @s ${objectiveId} ${value}`)
   }else if(mode == "remove"){
    entity.runCommandAsync(`scoreboard players remove @s ${objectiveId} ${value}`)
  }
}

function percentage(partialValue, totalValue) {
  return (100 * partialValue) / totalValue;
} 
function barStage(itemId, actualValue, valueMax, inv, value, slot){
  if(actualValue == 0){
      let barstage = new MC.ItemStack(`${itemId}_0`)
      inv.setItem(slot, barstage)
  }
  for(let i = 0; i <= value; i++){
      let valueCurrent = Math.floor(percentage(actualValue, valueMax));
      if(actualValue > 0 &&  valueCurrent == Math.floor(percentage(i, value))){
          let barstage = new MC.ItemStack(`${itemId}_${i}`)
          inv.setItem(slot, barstage)
      }
  }
}
function itemManipulate(inv, slot, itemStack, amountMode="set", amount=0){
  if(amountMode == "remove" && amount > 0){
      if(itemStack.amount > 1 && amount < itemStack.maxAmount){
        let itemReturn = itemStack.clone()
        itemReturn.amount -= amount
        inv.setItem(slot, itemReturn)
      }else if(itemStack.amount == amount){
        let itemReturn = new MC.ItemStack("air")
        inv.setItem(slot, itemReturn)
      }
  }else if(amountMode == "add" && amount > 0){
    if(itemStack.amount > 0 && amount < itemStack.maxAmount){
      let itemReturn = itemStack.clone()
      itemReturn.amount += amount
      inv.setItem(slot, itemReturn)
    }
  }
}
function getItemTags(itemStack, list){
  let block = undefined
  let tag = undefined
  try{
    block = MC.BlockPermutation.resolve(itemStack.typeId)
  }catch(e){
    block = undefined
  }
  if(block){
    for(let tags = 0; tags < block.getTags().length; tags++){
      if(tag == undefined && `tag:block:${block.getTags()[tags]}` in list){
        tag = `tag:block:${block.getTags()[tags]}`
      }
    }
  }
  if(itemStack){
    for(let tags = 0; tags < itemStack.getTags().length; tags++){
      if(tag == undefined && `tag:item:${itemStack.getTags()[tags]}` in list){
        tag = `tag:item:${itemStack.getTags()[tags]}`
      }
    }
  }
  return tag
}
export function furnacesLoad(){
  MC.system.afterEvents.scriptEventReceive.subscribe(data=>{
    const { sourceEntity: entity, message, id } = data;
     if(id == "forge:furnaceProperties"){
      score(entity, "add", "cookTime", 0)
      score(entity, "add", "burnTime", 0)
      score(entity, "add", "burnTimeMax", 0)
    }
    if(id == "forge:furnaceLoad"){
       //command exemple: scriptevent forge:furnaceLoad <prefix:String> <cooktimemax:Int> <flameid: String> <arrowId: String>
        let args = message.split(" ", 5)
        let cookTimeDefault = Number(args[1]);
        const block = entity.dimension.getBlock({x:entity.location.x, y:entity.location.y, z:entity.location.z})
        furnaceReciper(block, entity, {prefix: args[0], cookTickMax: cookTimeDefault, flameId: args[2], arrowId: args[3]})
    }
  })
}


function furnaceReciper(blockOrigin, entity, data={prefix:"forge", cookTickMax: 0, flameId:"forge:flame", arrowId: "forge:arrow"}){
   let inventory = entity.getComponent("inventory").container
   let slots = [
     inventory.getItem(0),
     inventory.getItem(1),
     inventory.getItem(2)
   ]
   let cookTime = getObjective("cookTime").getScore(entity)
   let burnTime = getObjective("burnTime").getScore(entity)
   let burnTimeMax = getObjective("burnTimeMax").getScore(entity);
   barStage(data.flameId, burnTime, burnTimeMax, inventory, 13, 3)
   barStage(data.arrowId, cookTime, data.cookTickMax, inventory, 16, 4)
   let tag = undefined
   let outputTyped = undefined
   let materialTyped = undefined
  if((slots[0] && slots[0].typeId in nativeRecipes) && nativeRecipes[slots[0].typeId].blockState == undefined){
    materialTyped = slots[0].clone()
   }else if((slots[0] && slots[0].typeId in nativeRecipes) && nativeRecipes[slots[0].typeId].blockState){
    let block = MC.BlockPermutation.resolve(slots[0].typeId, nativeRecipes[slots[0].typeId].blockState)
    materialTyped = block.getItemStack()
   }
   if((slots[0] && slots[0].typeId in nativeRecipes) && nativeRecipes[slots[0].typeId].outputBlockState == undefined && nativeRecipes[slots[0].typeId].scriptedOutput == undefined){
    outputTyped = new MC.ItemStack(nativeRecipes[slots[0].typeId].output)
   }else if((slots[0] && slots[0].typeId in nativeRecipes) && nativeRecipes[slots[0].typeId].outputBlockState && nativeRecipes[slots[0].typeId].scriptedOutput == undefined){
    let block = MC.BlockPermutation.resolve(nativeRecipes[slots[0].typeId].output, nativeRecipes[slots[0].typeId].outputBlockState)
    outputTyped = block.getItemStack()
   }else if((slots[0] && slots[0].typeId in nativeRecipes) && nativeRecipes[slots[0].typeId].scriptedOutput != undefined){
     outputTyped = nativeRecipes[slots[0].typeId].scriptedOutput(slots[0].clone())
   }
   if((slots[0] && slots[0].typeId in nativeRecipes && slots[2] && slots[2].isStackableWith(outputTyped) && slots[0].isStackableWith(materialTyped)) || (slots[0] && slots[0].typeId in nativeRecipes && slots[2] == undefined && slots[0].isStackableWith(materialTyped))){
    if(slots[1]){
      if(tag == undefined){
        tag = getItemTags(slots[1], nativeFuels)
      }
      if(burnTime == 0){
        if(slots[1].typeId in nativeFuels){
          if(nativeFuels[slots[1].typeId].return == undefined){
            score(entity, "set", "burnTime", burnTimeMax)
            MC.system.runTimeout(()=>{
              itemManipulate(inventory, 1, slots[1], "remove", 1)
            }, 1)
            score(entity, "set", "burnTimeMax", nativeFuels[slots[1].typeId])
            
           }else{
            score(entity, "set", "burnTime", burnTimeMax)
            inventory.setItem(1, new MC.ItemStack(nativeFuels[slots[1].typeId].return))
            score(entity, "set", "burnTimeMax", nativeFuels[slots[1].typeId].burnTime)
           }
        }else if(tag in nativeFuels){
          if(nativeFuels[tag].return == undefined){
            score(entity, "set", "burnTime", burnTimeMax)
            MC.system.runTimeout(()=>{
              itemManipulate(inventory, 1, slots[1], "remove", 1)
            }, 1)
            score(entity, "set", "burnTimeMax", nativeFuels[tag])
            
           }else{
            score(entity, "set", "burnTime", burnTimeMax)
            inventory.setItem(1, new MC.ItemStack(nativeFuels[tag].return))
            score(entity, "set", "burnTimeMax", nativeFuels[tag].burnTime)
           }
         }
      }
    }

    if(burnTime > 0 && cookTime < data.cookTickMax){
      score(entity, "add", "cookTime", 1)
    }else if(burnTime > 0 && cookTime == data.cookTickMax){
      score(entity, "set", "cookTime", 0)
      if(slots[2] == undefined){
        inventory.setItem(2, outputTyped.clone())
        itemManipulate(inventory, 0, slots[0], "remove", 1)
      }else{
        itemManipulate(inventory, 2, slots[2], "add", 1)
        itemManipulate(inventory, 0, slots[0], "remove", 1)
      }
    }
   }else{
    if(cookTime > 0){score(entity, "set", "cookTime", 0)}
   }
   if(burnTime > 0){
    score(entity, "remove", "burnTime", 1) 
    let blockPerms = blockOrigin.permutation.clone()
    setPermutation(blockOrigin, [{"gaiadimension:direction": blockPerms.getState("gaiadimension:direction")}, {"gaiadimension:lit": true}, {"gaiadimension:entity": true}])
   }else{
    let blockPerms = blockOrigin.permutation.clone()
    setPermutation(blockOrigin, [{"gaiadimension:direction": blockPerms.getState("gaiadimension:direction")}, {"gaiadimension:lit": false}, {"gaiadimension:entity": true}])
   }
   if(burnTime == 0 && cookTime > 0){score(entity, "remove", "cookTime", 1)}
   if(!slots[1] && burnTime == 0 && burnTimeMax > 0){
    score(entity, "set", "burnTimeMax", 0)
  }
}