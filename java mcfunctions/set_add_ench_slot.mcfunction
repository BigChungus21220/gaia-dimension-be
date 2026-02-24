
scoreboard players reset #return .data
$execute store success score #return .data if items block ~ ~-1 ~ container.$(slot) enchanted_book[!minecraft:stored_enchantments={},!item_name="execute"] run data modify entity @s item.components."minecraft:custom_data".stored_ench append from block ~ ~-1 ~ Items[{Slot:$(slot)b}]




data modify storage temp data.stored_ench[] merge value {components:{"minecraft:item_name":"execute"}}




function lzenl:arcane_altar/add_ench


$data modify storage temp data.ench_adder set value {slot:$(slot)}

$execute if score #return .data matches 1 run item replace block ~ ~-1 ~ container.$(slot) with air
execute if score #return .data matches 1 run playsound block.end_portal_frame.fill block @a[distance=..15] ~ ~ ~ 1 1.5
