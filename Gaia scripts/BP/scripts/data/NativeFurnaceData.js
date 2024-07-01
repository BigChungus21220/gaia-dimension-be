import * as MC from "@minecraft/server";
export const nativeRecipes = {
    "minecraft:raw_iron":{
        output: "minecraft:iron_ingot"
    },
    "minecraft:raw_gold":{
        output: "minecraft:gold_ingot"
    },
    "minecraft:raw_copper":{
        output: "minecraft:copper_ingot"
    },
    "minecraft:copper_ore":{
        output: "minecraft:copper_ingot"
    },
    "minecraft:iron_ore":{
        output: "minecraft:iron_ingot"
    },
    "minecraft:gold_ore":{
        output: "minecraft:gold_ingot"
    },
    "minecraft:diamond_ore":{
        output: "minecraft:diamond"
    },
    "minecraft:lapis_ore":{
        output: "minecraft:lapis_lazuli"
    },
    "minecraft:redstone_ore":{
        output: "minecraft:redstone"
    },
    "minecraft:coal_ore":{
        output: "minecraft:coal"
    },
    "minecraft:emerald_ore":{
        output: "minecraft:emerald"
    },
    "minecraft:deepslate_copper_ore":{
        output: "minecraft:copper_ingot"
    },
    "minecraft:deepslate_iron_ore":{
        output: "minecraft:iron_ingot"
    },
    "minecraft:deepslate_gold_ore":{
        output: "minecraft:gold_ingot"
    },
    "minecraft:deepslate_diamond_ore":{
        output: "minecraft:diamond"
    },
    "minecraft:deepslate_lapis_ore":{
        output: "minecraft:lapis_lazuli"
    },
    "minecraft:deepslate_redstone_ore":{
        output: "minecraft:redstone"
    },
    "minecraft:deepslate_coal_ore":{
        output: "minecraft:coal"
    },
    "minecraft:deepslate_emerald_ore":{
        output: "minecraft:emerald"
    },
    "minecraft:quartz_ore":{
        output: "minecraft:quartz"
    },
    "minecraft:ancient_debris":{
        output: "minecraft:netherite_scrap"
    },
    "minecraft:nether_gold_ore":{
        output: "minecraft:gold_ingot"
    },
    "minecraft:deepslate_emerald_ore":{
        output: "minecraft:emerald"
    },
    "minecraft:porkchop":{
        output: "minecraft:cooked_porkchop"
    },
    "minecraft:beef":{
        output: "minecraft:cooked_beef"
    },
    "minecraft:chicken":{
        output: "minecraft:cooked_chicken"
    },
    "minecraft:cod":{
        output: "minecraft:cooked_cod"
    },
    "minecraft:salmon":{
        output: "minecraft:cooked_salmon"
    },
    "minecraft:potato":{
        output: "minecraft:baked_potato"
    },
    "minecraft:mutton":{
        output: "minecraft:cooked_mutton"
    },
    "minecraft:rabbit":{
        output: "minecraft:cooked_rabbit"
    },
    "minecraft:kelp":{
        output: "minecraft:dried_kelp"
    },
    "minecraft:sand":{
        output: "minecraft:glass"
    },
    "minecraft:cobblestone":{
        output: "minecraft:stone"
    },
    "minecraft:sandstone":{
        output: "minecraft:sandstone",
        outputBlockState: {
            "sand_stone_type":  "smooth"
        },
        blockState: {
            "sand_stone_type": "default"
        }
    },
    "minecraft:red_sandstone":{
        output: "minecraft:red_sandstone",
        outputBlockState: {
            "sand_stone_type":  "smooth"
        },
        blockState: {
            "sand_stone_type": "default"
        }
    },
    "minecraft:stone":{
        output: "minecraft:smooth_stone",
        blockState: {
            "stone_type": "stone"
        }
    },
    "minecraft:quartz_block":{
        output: "minecraft:quartz_block",
        outputBlockState: {
            "chisel_type":  "smooth"
        },
        blockState: {
            "chisel_type": "default"
        }
    },
    "minecraft:clay_ball":{
        output: "minecraft:brick"
    },
    "minecraft:netherrack":{
        output: "minecraft:netherbrick"
    },
    "minecraft:nether_brick":{
        output: "minecraft:cracked_nether_bricks"
    },
    "minecraft:basalt":{
        output: "minecraft:smooth_basalt"
    },
    "minecraft:clay":{
        output: "minecraft:hardened_clay"
    },
    "minecraft:stonebrick":{
        output: "minecraft:stonebrick",
        outputBlockState: {
            "stone_brick_type":  "cracked"
        },
        blockState: {
            "stone_brick_type": "default"
        }
    },
    "minecraft:polished_blackstone_bricks":{
        output: "minecraft:cracked_polished_blackstone_bricks"
    },
    "minecraft:coobled_deepslate":{
        output: "minecraft:deepslate"
    },
    "minecraft:deepslate_bricks":{
        output: "minecraft:cracked_deepslate_bricks"
    },
    "minecraft:deepslate_tiles":{
        output: "minecraft:cracked_deepslate_tiles"
    },
    "minecraft:stained_hardened_clay":{
        //hardcoded
        scriptedOutput: function(item=MC.ItemStack("air")){
            let colorValues = MC.BlockStates.get("color").validValues
            for(let i = 0; i < colorValues.length; i++){
                let condition = `{"color": "${colorValues[i]}"}`
                let block = MC.BlockPermutation.resolve(item.typeId, JSON.parse(condition))
                let itemCompare = block.getItemStack(1)
                if(item.isStackableWith(itemCompare)){
                    let output = new MC.ItemStack(`minecraft:${colorValues[i]}_glazed_terracotta`) 
                    return output
                }
            }
        }
    },
    "minecraft:cactus":{
        output: "minecraft:green_dye"
    },
    "minecraft:oak_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:spruce_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:birch_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:jungle_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:acacia_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:dark_oak_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:cherry_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:mangrove_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_oak_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_spruce_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_birch_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_jungle_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_acacia_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_dark_oak_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_cherry_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:stripped_mangrove_log":{
        output: "minecraft:charcoal"
    },
    "minecraft:wood":{
        output: "minecraft:charcoal"
    },
    "minecraft:chorus_fruit":{
        output: "minecraft:popped_chorus_fruit"
    },
    "minecraft:sea_pickle":{
        output: "minecraft:lime_dye"
    },
    "gaia:green_opal_ore":{
        output: "gaia:green_opal"
    },
    "gaia:blue_opal_ore":{
        output: "gaia:blue_opal"
    },
    "gaia:red_opal_ore":{
        output: "gaia:red_opal"
    },
    "gaia:white_opal_ore":{
        output: "gaia:white_opal"
    },
    "gaia:tektite_ore":{
        output: "gaia:tektite"
    },
    "gaia:benitoite_ore":{
        output: "gaia:benitoite"
    },
    "gaia:chalcedony_ore":{
        output: "gaia:chalcedony"
    },
    "gaia:diopside_ore":{
        output:"gaia:diopside"
    },
    "gaia:ixiolite_ore":{
        output: "gaia:ixiolite"
    },
    "gaia:euclase_ore":{
        output: "gaia:euclase"
    },
    "gaia:leucite_ore":{
        output: "gaia:leucite"
    },
    "gaia:proustite_ore":{
        output: "gaia:proustite"
    },
    "gaia:chalcedony_ore":{
        output: "gaia:chalcedony"
    },
    "gaia:labradorite_ore":{
        output: "gaia:labradorite"
    },
    "gaia:moonstone_ore":{
         output: "gaia:moonstone"
    },
    "gaia:gaia_stone":{
        output: "gaia:pink_essence"
    },
    "gaia:gaia_cobblestone":{
        output: "gaia:gaia_stone"
    },
    "gaia:luggeroth_chop":{
        output: "gaia:cooked_luggeroth_chop"
      },
      "gaia:sugilite_ore":{
          output: "gaia:sugilite"
      },
      "gaia:pyrite_ore":{
          output: "gaia:pyrite"
      },
}
export const nativeFuels = {
    "minecraft:coal_block": 16000,
    "minecraft:dried_kelp_block": 4000,
    "minecraft:blaze_rod": 2400,
    "minecraft:lava_bucket":{
        burnTime: 20000,
        return: "minecraft:bucket"
    },
    "tag:wood": 1000,
    "tag:item:minecraft:coals": 1600,
    "tag:item:minecraft:boats": 1200,
    "tag:item:minecraft:wooden_tier": 200,
    "minecraft:scaffolding": 50,
    "minecraft:bamboo_mosaic": 300,
    "minecraft:beehive": 300,
    "minecraft:bee_nest": 300,
    "minecraft:chiseled_bookshelf": 300,
    "minecraft:bamboo_block": 300,
    "minecraft:stripped_bamboo_block": 300,
    "tag:item:minecraft:wooden_slabs": 150,
    "minecraft:oak_stairs": 150,
    "minecraft:spruce_stairs": 150,
    "minecraft:birch_stairs": 150,
    "minecraft:jungle_stairs": 150,
    "minecraft:acacia_stairs": 150,
    "minecraft:dark_oak_stairs": 150,
    "minecraft:mangrove_stairs": 150,
    "minecraft:cherry_stairs": 150,
    "minecraft:bamboo_stairs": 150,
    "minecraft:bamboo_mosaic_stairs": 150,
    "tag:block:wood": 300,
    "minecraft:crafting_table": 300,
    "minecraft:cartography_table": 300,
    "minecraft:fletching_table": 300,
    "minecraft:smithing_table": 300,
    "minecraft:loom": 300,
    "minecraft:bookshelf": 300,
    "minecraft:lectern": 300,
    "minecraft:composter": 300,
    "minecraft:chest": 300,
    "minecraft:trapped_chest": 300,
    "minecraft:jukebox": 300,
    "minecraft:noteblock": 300,
    "minecraft:banner": 300,
    "minecraft:crossbow": 300,
    "minecraft:bow": 300,
    "minecraft:fishing_rod": 300,
    "minecraft:oak_sign": 200,
    "minecraft:spruce_sign": 200,
    "minecraft:birch_sign": 200,
    "minecraft:acacia_sign": 200,
    "minecraft:jungle_sign": 200,
    "minecraft:dark_oak_sign": 200,
    "minecraft:mangrove_sign": 200,
    "minecraft:cherry_sign": 200,
    "minecraft:bamboo_sign": 200,
    "minecraft:bowl": 200,
    "minecraft:sapling": 100,
    "minecraft:mangrove_propagule": 100,
    "minecraft:cherry_sapling": 100,
    "minecraft:stick": 100,
    "minecraft:azalea": 100,
    "minecraft:flowering_azalea": 100,
    "tag:item:minecraft:wool": 100,
    "minecraft:carpet": 67,
    "minecraft:bamboo": 50,
}