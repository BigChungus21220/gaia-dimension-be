import { system, ItemStack, ContainerSlot } from "@minecraft/server";

//
class barStaging {
static barStage(itemId, actualValue, valueMax, inv, value, slot) {
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
}


//Inventory Manipulation
class Inventory {
    setItem(slot, ItemStack) {
        return ContainerSlot.setItem(slot, ItemStack);
      // Implement the actual logic to set the item in the inventory
    }
}



//Animate a slot
  class AnimatedSlot {
    static Animate (inv , slot, itemStack, amountMode = "set", amount = 0) {
     //Checks if the ammount mode is remove and above 0
        if (amountMode === "remove" && amount > 0) {
            //Checks if itemStack ammount is greater than 1 and less than the max ammount
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
  }
  

  export default AnimatedSlot ; barStaging;