##
 # locked_slot.mcfunction
 # 
 #
 # Created by .
##

execute if items block ~ ~-1 ~ container.1 * unless items block ~ ~-1 ~ container.1 *[item_name="execute"] run item replace entity @p[tag=user,distance=..10] player.cursor from block ~ ~-1 ~ container.1

execute if items block ~ ~-1 ~ container.19 gold_nugget[item_name="Enchanting Quill",enchantment_glint_override=true,rarity=rare,!damage=10,max_damage=10,max_stack_size=1,item_model=spectral_arrow] run return run item replace block ~ ~-1 ~ container.1 with air

#set item slot to locked

item replace block ~ ~-1 ~ container.1 with bow[item_name="execute",custom_name={text:"Requires Enchanting Quill!",italic:false,color:"red"},item_model="red_stained_glass_pane",consumable={consume_seconds:999,sound:"intentionally_empty",animation:"none"}] 1