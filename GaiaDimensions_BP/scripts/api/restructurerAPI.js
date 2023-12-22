import {nativeEssenceFuel,nativeRecipeData,nativeShinyFuel} from './nativeRestructurerData'

function itemManipulate(inv, slot, itemStack, amountMode = "set", amount = 0) {
    try {
      if (amount > 0) {
        const itemReturn = itemStack?.clone();
  
        itemReturn.amount = (
          amountMode === "remove" && itemReturn?.amount > amount
            ? itemReturn.amount - amount
            : amountMode === "remove" && itemReturn?.amount === amount
              ? 0 
              : amountMode === "add" && itemReturn?.amount < itemReturn.maxAmount
                ? itemReturn.amount + amount
                : itemReturn?.amount
        );
  
        inv.setItem(slot, itemReturn);
      }
    } catch (error) {
      // Handle errors if needed
    }
  }
  