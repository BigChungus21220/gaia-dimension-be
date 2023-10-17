execute @e[tag=gaia_i] ~~~ detect ~ -64 ~ bedrock -1 execute @s[tag=gaia_i] ~~~ detect ~1~-1~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~-1~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~1~3~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~3~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~2~~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~-1~~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~2~1~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~-1~1~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~2~2~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~-1~2~ gaia:gaia_keystone -1 tag @s[tag=gaia_i] add gaiar
execute @e[tag=gaiar] ~~~ fill ~1 ~ ~ ~ ~2 ~ gaia:gaia_portal2
execute @e[tag=gaiar] ~~~ particle gaia:gaia_ignite ~~~
execute @e[tag=gaiar] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[tag=gaiar] ~~~ kill @e[tag=gaiar]
execute @e[tag=gaia_i] ~~~ detect ~ -64 ~ bedrock -1 execute @s[tag=gaia_i] ~~~ detect ~~-1~1 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~-1~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~3~1 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~3~ gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~~2 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~~-1 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~1~2 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~1~-1 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~2~2 gaia:gaia_keystone -1 execute @s[tag=gaia_i] ~~~ detect ~~2~-1 gaia:gaia_keystone -1 tag @s[tag=gaia_i] add gaiae
execute @e[tag=gaiae] ~~~ fill ~ ~ ~1 ~ ~2 ~ gaia:gaia_portal
execute @e[tag=gaiae] ~~~ particle gaia:gaia_ignite ~~~
execute @e[tag=gaiae] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[tag=gaiae] ~~~ kill @e[tag=gaiae]

execute @e[tag=2gaia_i] ~~~ execute @s[tag=2gaia_i] ~~~ detect ~1~-1~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~-1~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~1~3~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~3~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~2~~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~-1~~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~2~1~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~-1~1~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~2~2~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~-1~2~ gaia:gaia_keystone -1 tag @s[tag=2gaia_i] add 2gaiar
execute @e[tag=2gaiar] ~~~ fill ~1 ~ ~ ~ ~2 ~ gaia:gaia_portal2_e
execute @e[tag=2gaiar] ~~~ particle gaia:gaia_ignite ~~~
execute @e[tag=2gaiar] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[tag=2gaiar] ~~~ kill @e[tag=2gaiar]
execute @e[tag=2gaia_i] ~~~ execute @s[tag=2gaia_i] ~~~ detect ~~-1~1 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~-1~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~3~1 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~3~ gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~~2 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~~-1 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~1~2 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~1~-1 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~2~2 gaia:gaia_keystone -1 execute @s[tag=2gaia_i] ~~~ detect ~~2~-1 gaia:gaia_keystone -1 tag @s[tag=2gaia_i] add 2gaiae
execute @e[tag=2gaiae] ~~~ fill ~ ~ ~1 ~ ~2 ~ gaia:gaia_portal_e
execute @e[tag=2gaiae] ~~~ particle gaia:gaia_ignite ~~~
execute @e[tag=2gaiae] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[tag=2gaiae] ~~~ kill @e[tag=2gaiae]


execute @a ~~~ detect ~~~ gaia:gaia_portal -1 tag @s add gaia_tele

execute @a ~~~ detect ~~~ gaia:gaia_portal2 -1 tag @s add gaia_tele

execute @a[tag=gaia_tele] ~~~ execute @s[scores={over=3..}] ~~~ detect ~~~ gaia:gaia_portal -1 function gaia_tp
execute @a[tag=gaia_tele] ~~~ execute @s[scores={over=3..}] ~~~ detect ~~~ gaia:gaia_portal2 -1 function gaia_tp

execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ detect ~~~ gaia:gaia_portal_e -1 fill ~ 250 ~ ~ 250 ~ end_portal
execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ detect ~~~ gaia:gaia_portal_e -1 tp ~ 250 ~

execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ detect ~~~ gaia:gaia_portal2_e -1 fill ~ 250 ~ ~ 250 ~ end_portal
execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ detect ~~~ gaia:gaia_portal2_e -1 tp ~ 250 ~

execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia_comp] ~~~ fog @s push "gaia:fog_gaia" "gaia_fog"

execute @a[scores={the_end=1}] 200000 150 200000 execute @a[r=30] ~~~ tag @s[tag=!gaia_comp] add gaia_ex
execute @a[scores={the_end=1}] 200000 150 200000 execute @a[r=30] ~~~ tag @s[tag=!gaia_comp] add gaia_comp
execute @a[tag=gaia_tele] 200000 150 200000 execute @a[r=30] ~~~ tag @s remove gaia_tele

scoreboard objectives add gaia_s dummy
scoreboard players add @a gaia_s 0
scoreboard players remove @a[scores={gaia_s=1..}] gaia_s 1
execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ scoreboard players add @s[scores={gaia_s=..6}] gaia_s 2
execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[scores={gaia_s=4..6}] ~~~ tag @s add gaia_s

execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=gaia_s] ~~~ tag @s[tag=!gaia_s2] add d_ga_music1
execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=gaia_s] ~~~ tag @s[tag=!gaia_s2] add gaia_s2

execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[scores={gaia_s=4..6}] ~~~ tag @s add gaia_s2
execute @a[scores={gaia_s=..3}] ~~~ tag @s remove gaia_s
execute @a[scores={gaia_s=..3}] ~~~ tag @s remove gaia_s2
execute @a[scores={gaia_s=..3}] ~~~ tag @s remove d_ga_music1
execute @a[scores={gaia_s=..3}] ~~~ tag @s remove d_ga_music2

execute @a[scores={over=4..}] ~~~ tag @s remove gaia_comp
execute @a[scores={over=4..}] ~~~ tag @s remove gaia_s
execute @a[scores={over=4..}] ~~~ fog @s remove "gaia_fog"

execute @a[tag=gaia_ex] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=!gaia_ex2] ~~~ detect 200000 50 200000 bedrock -1 tag @s[tag=!gaia_ex2] add gaia_ex2
execute @a[tag=gaia_ex] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=!gaia_ex2] ~~~ spreadplayers ~ ~ 0 1 @s
execute @a[tag=gaia_ex] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=!gaia_ex2] ~~~ execute @s ~3 ~ ~ fill ~~~ ~3 ~4 ~ gaia:gaia_keystone
execute @a[tag=gaia_ex] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=!gaia_ex2] ~~~ execute @s ~3 ~ ~ fill ~1~~ ~1 ~2 ~ gaia:gaia_portal2_e
execute @a[tag=gaia_ex] ~~~ execute @s[scores={the_end=1}] ~~~ execute @s[tag=!gaia_ex2] ~~~ execute @s ~ ~ ~ fill 200000 50 200000 200000 50 200000 bedrock


scoreboard objectives add mg_defend dummy
scoreboard players add @e[type=gaia:malachite_guard] mg_defend 0
scoreboard players remove @e[type=gaia:malachite_guard,scores={mg_defend=1..}] mg_defend 1

event entity @e[type=gaia:malachite_guard,scores={mg_defend=5..}] mg_defend
event entity @e[type=gaia:malachite_guard,scores={mg_defend=..4},tag=!mg_defend] no_mg_defend

execute @e[name="MG_MINION"] ~~~ scoreboard players set @e[r=100,type=gaia:malachite_guard] mg_defend 7

scoreboard objectives add mg_slam dummy
scoreboard players add @e[type=gaia:malachite_guard] mg_slam 1
scoreboard players set @e[scores={mg_slam=100..}] mg_slam 0
execute @e[tag=mg_defend] ~~~ event entity @s[scores={mg_slam=99}] mg_slam
execute @e[tag=mg_defend] ~~~ playanimation @s[scores={mg_slam=99}] animation.malachite_guard.slam