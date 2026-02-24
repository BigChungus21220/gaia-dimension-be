##
 # remove_bottom.mcfunction
 # 
 #
 # Created by .
##
execute if score #page_borderbottom .data matches 0 run return fail

scoreboard players remove #page_borderbottom .data 1
data remove storage temp data.stored_ench[0]

function lzenl:arcane_altar/remove_bottom