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