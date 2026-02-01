
execute store result score #return .data run data modify entity @s item.components."minecraft:custom_data".inv set from block ~ ~-1 ~ Items

execute if score #return .data matches 0 run function lzenl:arcane_altar/set_ui