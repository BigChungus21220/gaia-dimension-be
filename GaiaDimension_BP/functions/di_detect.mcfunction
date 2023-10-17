scoreboard objectives add over dummy
scoreboard players add @a over 0
scoreboard players remove @a[scores={over=0..}] over 1
execute @a ~~~ detect ~ 0 ~ bedrock -1 scoreboard players set @s over 0
execute @a ~~~ detect ~ -64 ~ bedrock -1 scoreboard players set @s over 5
execute @a[scores={the_end=1}] ~~~ scoreboard players set @s over 0

scoreboard objectives add netherr dummy
scoreboard players add @a netherr 0
execute @a ~~~ detect ~ 0 ~ bedrock -1 scoreboard players set @s netherr 1
execute @a ~~~ detect ~ -64 ~ bedrock -1 scoreboard players set @s netherr 0
execute @a[scores={the_end=1}] ~~~ scoreboard players set @s netherr 0

scoreboard objectives add the_end dummy
scoreboard players add @a the_end 0
execute @a[scores={over=..3}] ~~~ execute @s[scores={netherr=0}] ~~~ scoreboard players set @s the_end 1
execute @a ~~~ detect ~ 0 ~ bedrock -1 scoreboard players set @s the_end 0
execute @a ~~~ detect ~ -64 ~ bedrock -1 scoreboard players set @s the_end 0