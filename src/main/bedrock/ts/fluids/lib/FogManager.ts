import { Player } from "@minecraft/server";

export class FogManager {
    static pushFog(player: Player, fogId: string, userFogId: string): void {
        try {
            player.runCommand(`fog @s push "${fogId}" "${userFogId}"`);
        } catch(e) {}
    }

    static popFog(player: Player, userFogId: string): void {
        try {
            player.runCommand(`fog @s remove "${userFogId}"`);
        } catch(e) {}
    }
}
