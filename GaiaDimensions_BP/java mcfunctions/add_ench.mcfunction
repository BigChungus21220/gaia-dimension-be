##
 # add_ench.mcfunction
 # 
 #
 # Created by .
##
scoreboard players set #page_borderbottom .data 15
scoreboard players operation #page_borderbottom .data *= @s .data
function lzenl:arcane_altar/remove_bottom
execute store result score #page_bordertop .data run data get storage temp data.stored_ench
function lzenl:arcane_altar/remove_top

data modify storage temp data.stored_ench[0] merge value {Slot:3b}
data modify storage temp data.stored_ench[1] merge value {Slot:4b}
data modify storage temp data.stored_ench[2] merge value {Slot:5b}
data modify storage temp data.stored_ench[3] merge value {Slot:6b}
data modify storage temp data.stored_ench[4] merge value {Slot:7b}
data modify storage temp data.stored_ench[5] merge value {Slot:12b}
data modify storage temp data.stored_ench[6] merge value {Slot:13b}
data modify storage temp data.stored_ench[7] merge value {Slot:14b}
data modify storage temp data.stored_ench[8] merge value {Slot:15b}
data modify storage temp data.stored_ench[9] merge value {Slot:16b}
data modify storage temp data.stored_ench[10] merge value {Slot:21b}
data modify storage temp data.stored_ench[11] merge value {Slot:22b}
data modify storage temp data.stored_ench[12] merge value {Slot:23b}
data modify storage temp data.stored_ench[13] merge value {Slot:24b}
data modify storage temp data.stored_ench[14] merge value {Slot:25b}
