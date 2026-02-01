execute at @s as @a[distance=..7] run function lzenl:arcane_altar/on_player

function lzenl:arcane_altar/remove_ench

function lzenl:arcane_altar/set_ench

execute unless score @s .data matches 0.. run scoreboard players set @s .data 0
#respect player items
execute if items block ~ ~-1 ~ container.0 * unless items block ~ ~-1 ~ container.0 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.0
execute if items block ~ ~-1 ~ container.2 * unless items block ~ ~-1 ~ container.2 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.2
execute if items block ~ ~-1 ~ container.8 * unless items block ~ ~-1 ~ container.8 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.8
execute if items block ~ ~-1 ~ container.9 * unless items block ~ ~-1 ~ container.9 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.9
execute if items block ~ ~-1 ~ container.10 * unless items block ~ ~-1 ~ container.10 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.10
execute if items block ~ ~-1 ~ container.11 * unless items block ~ ~-1 ~ container.11 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.11
execute if items block ~ ~-1 ~ container.17 * unless items block ~ ~-1 ~ container.17 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.17
execute if items block ~ ~-1 ~ container.18 * unless items block ~ ~-1 ~ container.18 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.18
execute if items block ~ ~-1 ~ container.20 * unless items block ~ ~-1 ~ container.20 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.20
execute if items block ~ ~-1 ~ container.26 * unless items block ~ ~-1 ~ container.26 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.26

execute if items block ~ ~-1 ~ container.3 * unless items block ~ ~-1 ~ container.3 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.3
execute if items block ~ ~-1 ~ container.4 * unless items block ~ ~-1 ~ container.4 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.4
execute if items block ~ ~-1 ~ container.5 * unless items block ~ ~-1 ~ container.5 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.5
execute if items block ~ ~-1 ~ container.6 * unless items block ~ ~-1 ~ container.6 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.6
execute if items block ~ ~-1 ~ container.7 * unless items block ~ ~-1 ~ container.7 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.7
execute if items block ~ ~-1 ~ container.12 * unless items block ~ ~-1 ~ container.12 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.12
execute if items block ~ ~-1 ~ container.13 * unless items block ~ ~-1 ~ container.13 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.13
execute if items block ~ ~-1 ~ container.14 * unless items block ~ ~-1 ~ container.14 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.14
execute if items block ~ ~-1 ~ container.15 * unless items block ~ ~-1 ~ container.15 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.15
execute if items block ~ ~-1 ~ container.16 * unless items block ~ ~-1 ~ container.16 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.16
execute if items block ~ ~-1 ~ container.21 * unless items block ~ ~-1 ~ container.21 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.21
execute if items block ~ ~-1 ~ container.22 * unless items block ~ ~-1 ~ container.22 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.22
execute if items block ~ ~-1 ~ container.23 * unless items block ~ ~-1 ~ container.23 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.23
execute if items block ~ ~-1 ~ container.24 * unless items block ~ ~-1 ~ container.24 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.24
execute if items block ~ ~-1 ~ container.25 * unless items block ~ ~-1 ~ container.25 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.25



data modify block ~ ~-1 ~ Items set from storage temp data.stored_ench

execute unless items block ~ ~-1 ~ container.3 *[item_name="execute"] run item replace block ~ ~-1 ~ container.3 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.4 *[item_name="execute"] run item replace block ~ ~-1 ~ container.4 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.5 *[item_name="execute"] run item replace block ~ ~-1 ~ container.5 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.6 *[item_name="execute"] run item replace block ~ ~-1 ~ container.6 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.7 *[item_name="execute"] run item replace block ~ ~-1 ~ container.7 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.12 *[item_name="execute"] run item replace block ~ ~-1 ~ container.12 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.13 *[item_name="execute"] run item replace block ~ ~-1 ~ container.13 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.14 *[item_name="execute"] run item replace block ~ ~-1 ~ container.14 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.15 *[item_name="execute"] run item replace block ~ ~-1 ~ container.15 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.16 *[item_name="execute"] run item replace block ~ ~-1 ~ container.16 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.21 *[item_name="execute"] run item replace block ~ ~-1 ~ container.21 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.22 *[item_name="execute"] run item replace block ~ ~-1 ~ container.22 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.23 *[item_name="execute"] run item replace block ~ ~-1 ~ container.23 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.24 *[item_name="execute"] run item replace block ~ ~-1 ~ container.24 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
execute unless items block ~ ~-1 ~ container.25 *[item_name="execute"] run item replace block ~ ~-1 ~ container.25 with bow[item_name="execute",custom_name="",item_model="light_gray_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1

#set borders
item replace block ~ ~-1 ~ container.0 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.2 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1


execute if score @s .data matches 1.. run item replace block ~ ~-1 ~ container.8 with bow[item_name="execute",custom_name={text:"Up",color:white,italic:false},item_model="flint",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hidden_components:["tooltip_display"]}] 1

execute if score @s .data matches 0 run item replace block ~ ~-1 ~ container.8 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1



item replace block ~ ~-1 ~ container.9 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.10 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.11 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.17 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.18 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1
item replace block ~ ~-1 ~ container.20 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1


execute if score @s .data < #show_add_ench_onpage .data run item replace block ~ ~-1 ~ container.26 with bow[item_name="execute",custom_name={text:"Down",color:white,italic:false},item_model="hopper",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hidden_components:["tooltip_display"]}] 1

execute if score @s .data >= #show_add_ench_onpage .data run item replace block ~ ~-1 ~ container.26 with bow[item_name="execute",custom_name="",item_model="black_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"},tooltip_display={hide_tooltip:true}] 1



function lzenl:arcane_altar/locked_slot

function lzenl:arcane_altar/add_add_ench with storage minecraft:temp data.ench_adder


execute as @a[distance=..7,tag=user] if items entity @s player.cursor *[item_name="execute"] run item replace entity @s player.cursor with air

tag @a[distance=..7,tag=user] remove user
