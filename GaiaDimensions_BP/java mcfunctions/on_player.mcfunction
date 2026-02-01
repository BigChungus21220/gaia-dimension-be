##
 # on_player.mcfunction
 # 
 #
 # Created by .
##
execute if items entity @s container.* *[item_name="execute"] run tag @s add user
execute if items entity @s player.cursor *[item_name="execute"] run tag @s add user

scoreboard players reset #return .data
execute store success score #return .data if items entity @s player.cursor *[item_name="execute",custom_name={text:"Up",color:white,italic:false}] run scoreboard players remove @e[distance=..0.1,type=item_display] .data 1

execute store success score #return .data if items entity @s player.cursor *[item_name="execute",custom_name={text:"Down",color:white,italic:false}] run scoreboard players add @e[distance=..0.1,type=item_display] .data 1

execute if score #return .data matches 1 run playsound block.enchantment_table.use block @a[distance=..12] ~ ~ ~ 1 0