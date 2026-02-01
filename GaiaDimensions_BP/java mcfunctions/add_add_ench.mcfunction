##
 # add_add_ench.mcfunction
 # 
 #
 # Created by .
##
execute unless score @s .data = #show_add_ench_onpage .data run return fail
$item replace block ~ ~-1 ~ container.$(slot) with bow[item_name="execute",custom_name={"color":"green","italic":false,"text":"Add Enchantment"},item_model="green_stained_glass_pane",consumable={consume_seconds:999,animation:"none",sound:"intentionally_empty"}] 1