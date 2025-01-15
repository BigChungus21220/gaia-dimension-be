import { Player, world, system } from "@minecraft/server"


system.runInterval(MalachiteGuard.activate(),5)


class MalachiteGuard {
    // Static method to execute commands
    static activate(player) {
        // Check if player is an instance of Player
        if (!(player instanceof Player)) {
            throw new Error("The provided argument is not an instance of Player.");
        }

        // Command strings to be executed
        const commands = [
            "scoreboard objectives add mg_defend dummy",
            "scoreboard players add @e[type=gaia:malachite_guard] mg_defend 0",
            "scoreboard players remove @e[type=gaia:malachite_guard,scores={mg_defend=1..}] mg_defend 1",
            "event entity @e[type=gaia:malachite_guard,scores={mg_defend=5..}] mg_defend",
            "event entity @e[type=gaia:malachite_guard,scores={mg_defend=..4},tag=!mg_defend] no_mg_defend",
            "execute as @e[name='MG_MINION'] at @s run scoreboard players set @e[r=100,type=gaia:malachite_guard] mg_defend 7"
        ];

        // Execute each command using the player's instance method
        commands.forEach(command => {
            player.runCommand(command);
        });
    }
}

