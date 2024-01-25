import { BlockPermutation,ItemStack, system, world } from "@minecraft/server";
import { nativeRecipes, nativeFuels } from "./nativeFurnaceData.js";

export function furnacesLoad() {
	const dimensions = [
		world.getDimension('overworld'),
		world.getDimension('nether'),
		world.getDimension('the end'),
	];

	system.runInterval(() => {
		const entities = dimensions.flatMap((dimension) => dimension.getEntities({ type: 'gaiadimension:furnace_entity' }));
		entities.forEach(entity => doFurnace(entity, entity.dimension.getBlock(entity.location)));
	});
}

function doFurnace(furnace, block) {
	const inv = furnace.getComponent('inventory').container;

	const inputItem = inv.getItem(0);
	const fuelItem = inv.getItem(1);
	const outputItem = inv.getItem(2);

	const fuelValue = getScore(furnace, 'fuelValue');
	const cookValue = getScore(furnace, 'cookValue');
	const cookTime = getScore(furnace, 'cookTime');

	if (fuelValue > 0) setScore(furnace, 'fuelValue', fuelValue - 1);

	inv.setItem(3, new ItemStack(`forge:flame_${fuelValue > 0 ? Math.floor((fuelValue * 13) / (cookTime * 3.5)) : 0}`));
	inv.setItem(4, new ItemStack(`forge:arrow_${Math.ceil((cookValue * 16) / 700)}`));

	if (!inputItem) {
		if (cookValue > 0) setScore(furnace, 'cookValue', cookValue - 1);
		return;
	}
	const recipe = nativeRecipes[inputItem.typeId];
	let output;

	if (!recipe) {
		if (cookValue > 0) setScore(furnace, 'cookValue', cookValue - 1);
		return;
	}
	if (!recipe.outputBlockState && !recipe.scriptedOutput) output = new ItemStack(recipe.output);
	else if (recipe.outputBlockState && !recipe.scriptedOutput) {
		const block = BlockPermutation.resolve(recipe.output, recipe.outputBlockState);
		output = block.getItemStack();
	} else output = recipe.scriptedOutput(inputItem.clone());

	if (fuelValue === 0) {
		if (!fuelItem) return block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': false }));;

		const fuelData = nativeFuels[fuelItem.typeId] || fuelItem.getTags().flatMap(t => nativeFuels[`tag:item:${t}`] || nativeFuels[`tag:block:${t}`] || [])[0];
		if (!fuelData) return block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': false }));

		if (typeof fuelData === 'number') {
			if (fuelItem.amount > 1) {
				fuelItem.amount--;
				inv.setItem(1, fuelItem);
			} else inv.setItem(1, undefined);
		} else inv.setItem(1, new ItemStack(fuelData.return));

		const burnTime = typeof fuelData === 'number' ? fuelData : fuelData.burnTime;
		setScore(furnace, 'fuelValue', burnTime * 3.5);

		setScore(furnace, 'cookTime', burnTime);
	} else block.setPermutation(BlockPermutation.resolve(block.typeId, { 'gaiadimension:lit': true }));

	if (outputItem && (outputItem.typeId !== output.typeId || outputItem.amount === 64)) return;

	setScore(furnace, 'cookValue', cookValue < 700 ? (cookValue + 1) : 0);
	if (cookValue < 700) return;

	if (outputItem) output.amount += outputItem.amount;
	inv.setItem(2, output);

	if (inputItem.amount > 0) {
		inputItem.amount--;
		inv.setItem(0, inputItem);
	} else inv.setItem(0, undefined);
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
