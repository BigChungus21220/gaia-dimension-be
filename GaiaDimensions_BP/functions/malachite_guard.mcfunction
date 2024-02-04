
scoreboard objectives add mg_defend dummy
scoreboard players add @e[type=gaia:malachite_guard] mg_defend 0
scoreboard players remove @e[type=gaia:malachite_guard,scores={mg_defend=1..}] mg_defend 1

event entity @e[type=gaia:malachite_guard,scores={mg_defend=5..}] mg_defend
event entity @e[type=gaia:malachite_guard,scores={mg_defend=..4},tag=!mg_defend] no_mg_defend

execute as @e[name="MG_MINION"] run execute as @s positioned as @s run scoreboard players set @e[r=100,type=gaia:malachite_guard] mg_defend 7