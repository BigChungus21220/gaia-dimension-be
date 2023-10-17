scoreboard objectives add gaia_pex dummy
scoreboard players add @a gaia_pex 0
scoreboard players remove @a[scores={gaia_pex=1..}] gaia_pex 1
execute @a ~~~ detect ~~~ gaia:gaia_portal -1 scoreboard players set @s gaia_pex 5
scoreboard objectives add gaia_port dummy
scoreboard players add @a gaia_port 0
execute @a[scores={gaia_port=1}] ~~~ playsound portal.trigger @s
execute @a[scores={over=4..}] ~~~ detect ~~~ gaia:gaia_portal -1 scoreboard players add @s[scores={gaia_port=..101}] gaia_port 1
execute @a[scores={over=4..}] ~~~ detect ~~~ gaia:gaia_portal -1 effect @s nausea 11 1 true
execute @a[scores={gaia_pex=..3}] ~~~ scoreboard players set @s gaia_port 0

execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia_go] ~~~ execute @s[tag=!gaia] ~~~ tag @s add gaia
execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia_go] ~~~ execute @s[tag=!gaia_comp] ~~~ tag @s add gaia_comp
execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia_go] ~~~ execute @s[tag=gaia_comp] ~~~ tag @s remove gaia_go

execute @a[scores={over=4..}] ~~~ execute @s[scores={gaia_port=99..}] ~~~ detect ~~~ gaia:gaia_portal -1 tag @s add gaia_go
execute @a[scores={over=4..}] ~~~ execute @s[scores={gaia_port=99..}] ~~~ detect ~~~ gaia:gaia_portal -1 function gaia_tp
execute @a[scores={over=4..}] ~~~ tag @s remove the_endmusic_stop

execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia] ~~~ fog @s push "gaia:fog_gaia2" "gaia_fog"
execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia] ~~~ tag @a[tag=!gaia] add gaia_gen_no
execute @a[scores={the_end=1}] ~~~ execute @s[tag=gaia] ~~~ tag @s add the_endmusic_stop
execute @a[tag=the_endmusic_stop] ~~~ stopsound @s music.game.end



execute @a[scores={over=4..}] ~~~ fog @s remove "gaia_fog"
execute @a[scores={over=4..}] ~~~ tag @s remove gaia_comp
execute @a[scores={over=4..}] ~~~ tag @s remove gaia


execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~ -64 ~ bedrock -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~1~-1~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~-1~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~1~3~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~3~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~2~~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~-1~~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~2~1~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~-1~1~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~2~2~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~-1~2~ mossy_cobblestone -1 tag @e[type=item,name="Multi-Inflicted Ender Pearl"] add gaiar
execute @e[type=item,tag=gaiar] ~~~ fill ~1 ~ ~ ~ ~2 ~ gaia:gaia_portal
execute @e[type=item,tag=gaiar] ~~~ particle gaia:gaia_ignite ~~~
execute @e[type=item,tag=gaiar] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[type=item,tag=gaiar] ~~~ kill @e[type=item,tag=gaiar]
execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~ -64 ~ bedrock -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~-1~1 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~-1~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~3~1 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~3~ mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~~2 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~~-1 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~1~2 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~1~-1 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~2~2 mossy_cobblestone -1 execute @e[type=item,name="Multi-Inflicted Ender Pearl"] ~~~ detect ~~2~-1 mossy_cobblestone -1 tag @e[type=item,name="Multi-Inflicted Ender Pearl"] add gaiae
execute @e[type=item,tag=gaiae] ~~~ fill ~ ~ ~1 ~ ~2 ~ gaia:gaia_portal
execute @e[type=item,tag=gaiae] ~~~ particle gaia:gaia_ignite ~~~
execute @e[type=item,tag=gaiae] ~~~ playsound block.end_portal.spawn @a[r=25]
execute @e[type=item,tag=gaiae] ~~~ kill @e[type=item,tag=gaiae]

execute @e[type=gaia:nuclear_golem] ~~~ event entity @s[tag=!no_more] random


execute @a[tag=gaia_comp] ~~~ execute @s[scores={the_end=1}] ~~~ detect 75000 75 -25000 air -1 summon gaia:multi_portaler 75000 75 -25000 minecraft:explode

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