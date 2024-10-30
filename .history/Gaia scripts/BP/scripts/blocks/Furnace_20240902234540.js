import { world, system, ItemStack} from "@minecraft/server"
import { nativeRecipes, nativeFuels } from "../data/NativeFurnaceData.js"

ItemStack.prototype.decrementStack = function(decrementItemAmount=1) {
    if (this.amount > decrementItemAmount) {
        this.amount = this.amount - decrementItemAmount;
        return this;
    } else return undefined;
}
ItemStack.prototype.incrementStack = function() {
    if (this.amount < this.maxAmount) {
        this.amount++
    } return this;
}

const pickaxes = new Set([
	"minecraft:wooden_pickaxe",
	"minecraft:stone_pickaxe",
	"minecraft:iron_pickaxe",
	"minecraft:golden_pickaxe",
	"minecraft:diamond_pickaxe",
	"minecraft:netherite_pickaxe",
])

function compare_position(a, b) {
	if (!a || !b) return
	return a.x == b.x && a.y == b.y && a.z == b.z
}

function refuel(container, data, fuel) {
  if (typeof data == "number") {
    container.setItem(1, fuel.decrementStack()); return data
  } else {
    container.setItem(1, data.return); return data.burnTime
  }
}

function get_recipe(item) {
  if (!item) return
  if (nativeRecipes[item.typeId]) return nativeRecipes[item.typeId]
}

function get_fuel(item) {
  if (!item) return
  if (nativeFuels[item.typeId]) return nativeFuels[item.typeId]
  const tags = item.getTags()
  for (const tag of tags) {
    if (nativeFuels["tag:item:" + tag]) return nativeFuels["tag:item:" + tag]
  }
}

world.beforeEvents.worldInitialize.subscribe(({ blockComponentRegistry }) => {
	blockComponentRegistry.registerCustomComponent('gaia:furnace', {
	  beforeOnPlayerPlace(event) {
			const { block, dimension, player, permutationToPlace:furnace } = event
			const entity = dimension.spawnEntity("gaia:furnace", { ...block.center(), y: block.y })
			const location = block.location
			entity.nameTag = "gaia_stone_furnace_ui"
		},
		onPlayerDestroy({ block, dimension }) {
			null
		},
		onTick({ block, dimension }) {
			const nearbyPlayers = dimension.getPlayers({ location: block.location, maxDistance: 7 });
			let entity = dimension.getEntities({ families: ["furnace"], location: block.center(), maxDistance: 0.5 })[0]
			if (!entity) {
			  entity = dimension.spawnEntity("gaia:furnace", { ...block.center(), y: block.y })
			  entity.nameTag = "gaia_stone_furnace_ui"
			}
			tick(entity)
			nearbyPlayers.forEach(player => {
				const mainHand = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
				if (!pickaxes.has(mainHand?.typeId) && !(player.isSneaking && mainHand)) return;
				const view_block = player.getBlockFromViewDirection()?.block
				if (!compare_position(block?.location, view_block?.location)) return;
				entity.triggerEvent("gaia:shrink")
			})
		}
	})
})

function tick(furnace) {
  const container = furnace.getComponent('minecraft:inventory').container
  
  const [input_item, fuel_item, output_item, data_item] =
    [0, 1, 2, 5].map(slot => container.getItem(slot))
  
  const recipe = get_recipe(input_item)
  
  const has_space = !output_item || (output_item.typeId == recipe?.output && output_item.amount < output_item.maxAmount)
  
  const fuel_data = get_fuel(fuel_item)
  
  let [burn_time, burn_duration, progress] = [0, 1, 2].map(lore => data_item?.getLore()[lore] ?? 1)
  
  if (recipe && burn_time == 0 && fuel_data && has_space)
    burn_duration = burn_time = refuel(container, fuel_data, fuel_item)
  
  if (burn_time > 0) burn_time--
  
  if (recipe && has_space && burn_time > 0 && progress < 200) progress++
  
  if (progress > 0 && (!has_space || burn_time == 0)) progress--
  
  if (progress > 0 && !recipe) progress = 0
  
  if (progress == 200) {
		progress = 0
		container.setItem(0, input_item.decrementStack())
		if (output_item) container.setItem(2, output_item.incrementStack())
		else container.setItem(2, new ItemStack(recipe.output))
	}
	
	const counter = new ItemStack('gaia:ui')
	counter.nameTag = `ui:§burn${Math.ceil((burn_time / burn_duration) * 13)}`
	container.setItem(3, counter)
	counter.nameTag = `ui:§prog${Math.ceil((progress / 200) * 52)}`
	container.setItem(4, counter)
	counter.nameTag = ``
	counter.setLore(['' + burn_time, '' + burn_duration, '' + progress])
	container.setItem(5, counter)
}

system.afterEvents.scriptEventReceive.subscribe(({id, sourceEntity:furnace}) => {
  if (id != "gaia:despawn") return
  const content = furnace.getComponent('minecraft:inventory').container
  for (let i=0; i < content.size; i++) {
    if (content.getItem(i)?.typeId == "gaia:ui") content.setItem(i, undefined)
  }
  furnace.kill()
  furnace.remove()
})

world.afterEvents.itemUse.subscribe(({itemStack}) => {
  world.sendMessage(JSON.stringify(nativeFuels))
})