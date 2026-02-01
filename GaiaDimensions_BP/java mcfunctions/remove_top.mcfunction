##
 # remove_top.mcfunction
 # 
 #
 # Created by .
##
execute unless score #page_bordertop .data matches 16.. run return fail
scoreboard players remove #page_bordertop .data 1
data remove storage temp data.stored_ench[-1]
function lzenl:arcane_altar/remove_top