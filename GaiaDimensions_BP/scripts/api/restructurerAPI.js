import { BlockPermutation, ItemStack, system, world } from "@minecraft/server";
import { nativeRecipes, nativeShinyFuel, nativeEssenceFuel } from "./nativeRestructurerData.js";

export function restructurerLoad() {
  const dimensions = [
    world.getDimension('overworld'),
    world.getDimension('nether'),
    world.getDimension('the end'),
  ];

  system.runInterval(() => {
    const entities = dimensions.flatMap((dimension) => dimension.getEntities({ type: 'gaia:restructer_container' }));
    entities.forEach(entity => doRestructurer(entity, entity.dimension.getBlock(entity.location)));
  });
}

function doRestructurer(restructurer, block) {
  const inv = restructurer.getComponent('inventory').container;
  const shinyInput = inv.getItem(0);
  const essenceInput = inv.getItem(1);
  const ingredientInput = inv.getItem(2);
  const outputItem = inv.getItem(3);
  const byproductOutput = inv.getItem(4);

  const fuelValue = getScore(restructurer, 'fuelValue');
  const cookValue = getScore(restructurer, 'cookValue');
  const cookTime = getScore(restructurer, 'cookTime');

  if (fuelValue > 0) setScore(restructurer, 'fuelValue', fuelValue - 1);

  inv.setItem(5, new ItemStack(`forge:restructurer_flame_${fuelValue > 0 ? Math.floor((fuelValue * 12) / (cookTime * 3.5)) : 0}`));
  inv.setItem(6, new ItemStack(`forge:restructurer_arrow_${Math.ceil((cookValue * 23) / 700)}`));

  if (!shinyInput || !essenceInput) {
    if (cookValue > 0) setScore(restructurer, 'cookValue', cookValue - 1);
    return;
  }
  const recipe = nativeRecipes[ingredientInput.typeId];
  const output = new ItemStack(recipe.output);
  const byproduct = new ItemStack(recipe.byproduct)

  if (!recipe) {
    if (cookValue > 0) setScore(restructurer, 'cookValue', cookValue - 1);
    return;
  }

  if (fuelValue === 0) {
    if (!shinyInput && !essenceInput) return block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': false }));
    const fuelData = calculateBurnTime(nativeShinyFuel[shinyInput.typeId], nativeEssenceFuel[essenceInput.typeId]);
    if (!fuelData) return block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': false }));

    if (shinyInput.amount > 1) {
      shinyInput.amount--;
      inv.setItem(0, shinyInput);
    } else inv.setItem(0, undefined);

    if (essenceInput.amount > 1) {
      essenceInput.amount--;
      inv.setItem(1, essenceInput);
    } else inv.setItem(1, undefined);

    const burnTime = fuelData
    setScore(restructurer, 'fuelValue', burnTime * 3.5);

    setScore(restructurer, 'cookTime', burnTime);
  } else block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': true }));

  if (outputItem && (outputItem.typeId !== output.typeId || outputItem.amount === 64)) return;

  setScore(restructurer, 'cookValue', cookValue < 700 ? (cookValue + 1) : 0);
  if (cookValue < 700) return;

  if (outputItem) output.amount += outputItem.amount;
  if (byproductOutput) byproduct.amount += byproductOutput.amount;
  inv.setItem(3, output);
  inv.setItem(4, byproduct);

  if (ingredientInput.amount > 0) {
    ingredientInput.amount--;
    inv.setItem(2, ingredientInput);
  } else inv.setItem(2, undefined);
}

function getScore(entity, objectiveId) {
  const scoreboard = world.scoreboard;
  const score = scoreboard.getObjective(objectiveId) || scoreboard.addObjective(objectiveId, objectiveId);
  return score.hasParticipant(entity) ? score.getScore(entity) : 0;
}

function setScore(entity, objectiveId, value) {
  const scoreboard = world.scoreboard;
  const score = scoreboard.getObjective(objectiveId) || scoreboard.addObjective(objectiveId, objectiveId);
  score.setScore(entity, value);
}



const calculateBurnTime = (shinyBurnTime, essenceBurnTime) => {
  return Math.round((shinyBurnTime + essenceBurnTime) / 2)
}



