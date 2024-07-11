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

//Animate a slot
  class AnimatedSlot {
    static Animate (inv, slot, itemStack, amountMode = "set", amount = 0) {
     //
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
  }
  

  export default AnimatedSlot ; barStaging;