execute store result score #stored_ench_count .data run data get entity @s item.components."minecraft:custom_data".stored_ench

data modify storage temp data.stored_ench set from entity @s item.components."minecraft:custom_data".stored_ench


scoreboard players operation #show_add_ench_onslot .data = #stored_ench_count .data
scoreboard players operation #show_add_ench_onslot .data %= #15 .data
scoreboard players add #show_add_ench_onslot .data 3

scoreboard players set #15 .data 15
scoreboard players operation #show_add_ench_onpage .data = #stored_ench_count .data
scoreboard players operation #show_add_ench_onpage .data /= #15 .data

execute if score #show_add_ench_onslot .data matches 8.. run scoreboard players add #show_add_ench_onslot .data 4
execute if score #show_add_ench_onslot .data matches 17.. run scoreboard players add #show_add_ench_onslot .data 4


execute store result storage temp data.slot int 1 run scoreboard players get #show_add_ench_onslot .data
function lzenl:arcane_altar/set_add_ench_slot with storage temp data








