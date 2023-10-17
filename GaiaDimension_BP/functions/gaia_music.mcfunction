
scoreboard objectives add d_ga_music1 dummy
scoreboard players add @a[tag=d_ga_music1] d_ga_music1 1
execute @a[tag=d_ga_music1] ~~~ execute @s[scores={d_ga_music1=10..}] ~~~ playsound gaia.music @s
execute @a[tag=d_ga_music1] ~~~ execute @s[scores={d_ga_music1=10..}] ~~~ tag @s add d_ga_music2
execute @a[tag=d_ga_music1] ~~~ execute @s[scores={d_ga_music1=10..}] ~~~ tag @s remove d_ga_music1
execute @a[tag=!d_ga_music1] ~~~ scoreboard players set @s d_ga_music1 0

scoreboard objectives add d_ga_music2 dummy
scoreboard players add @a[tag=d_ga_music2] d_ga_music2 1
execute @a[tag=d_ga_music2] ~~~ execute @s[scores={d_ga_music2=3600..}] ~~~ tag @s add d_ga_music1
execute @a[tag=d_ga_music2] ~~~ execute @s[scores={d_ga_music2=3600..}] ~~~ tag @s remove d_ga_music2
execute @a[tag=!d_ga_music2] ~~~ scoreboard players set @s d_ga_music2 0

execute @a[tag=!gaia_s] ~~~ tag @s remove d_ga_music1
execute @a[tag=!gaia_s] ~~~ tag @s remove d_ga_music2
execute @a[tag=!gaia_s] ~~~ stopsound @s gaia.music
execute @a[tag=d_ga_music1] ~~~ execute @s[scores={the_end=1}] ~~~ function eliminate_music
execute @a[tag=d_ga_music2] ~~~ execute @s[scores={the_end=1}] ~~~ function eliminate_music


execute @a 100 50 0 execute @a[tag=gaia_comp,r=10] ~~~ tp @s 200000 150 200000