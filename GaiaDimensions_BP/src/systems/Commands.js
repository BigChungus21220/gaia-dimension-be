import { Player, system, CommandPermissionLevel } from "@minecraft/server";
import { DimensionSystem, GaiaDimension } from "../world/Gaia.js";

/**
 * Formats snake_case IDs to Title Case
 */
function formatName(id) {
    return id.split(/[:_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/**
 * Registers Gaia Utility Commands
 * @param {import("@minecraft/server").CustomCommandRegistry} registry 
 */
export function registerGaiaCommands(registry) {
    // /gaiadimension:gaiahelp
    registry.registerCommand({
        name: "gaiadimension:gaiahelp",
        description: "Technical information and lore regarding the Gaia Dimension Bedrock Port.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            player.sendMessage("§8§l========================================");
            player.sendMessage("§6§lGAIA DIMENSION BEDROCK PORT");
            player.sendMessage("§7Basked under an eternal sun, a world preserved in time, a land sprouting with crystals and minerals, the ground seeping a mysterious energy.");
            player.sendMessage("");
            player.sendMessage("§eWelcome to Gaia. Now its on Bedrock.");
            player.sendMessage("§bThis is a Bedrock port of the Java Mod Gaia Dimension.");
            player.sendMessage("§8§l========================================");
        });

        return { status: 0 };
    });

    // /gaiadimension:whereami
    registry.registerCommand({
        name: "gaiadimension:whereami",
        description: "Identify your current dimensional location.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            const inGaia = DimensionSystem.isInGaia(player);
            const dimId = player.dimension.id;
            
            let dimensionName = "§7" + dimId;
            if (inGaia) {
                dimensionName = "§6Gaia Dimension";
            } else if (dimId === "minecraft:overworld") {
                dimensionName = "§aOverworld";
            } else if (dimId === "minecraft:nether") {
                dimensionName = "§cNether";
            } else if (dimId === "minecraft:the_end") {
                dimensionName = "§dThe End";
            }

            player.sendMessage("§8[§6Gaia§8] §7Current Location: " + dimensionName);
        });

        return { status: 0 };
    });

    // /gaiadimension:gaiainfo
    registry.registerCommand({
        name: "gaiadimension:gaiainfo",
        description: "Display technical status within the Gaia Dimension.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            const inGaia = DimensionSystem.isInGaia(player);
            const dimId = player.dimension.id;
            
            let dimensionName = "§7" + dimId;
            if (inGaia) dimensionName = "§6Gaia Dimension";
            else if (dimId === "minecraft:overworld") dimensionName = "§aOverworld";
            else if (dimId === "minecraft:nether") dimensionName = "§cNether";
            else if (dimId === "minecraft:the_end") dimensionName = "§dThe End";

            player.sendMessage("§8§l========================================");
            player.sendMessage("§6§lGAIA STATUS REPORT");
            player.sendMessage("§7Location: " + dimensionName);
            player.sendMessage("§7Synchronization: " + (inGaia ? "§aStable" : "§cExternal"));
            
            let coords = player.location;
            if (inGaia && GaiaDimension) {
                const biome = DimensionSystem.getBiome(player);
                player.sendMessage("§7Current Biome: §e" + formatName(biome));
                // Map real world coordinates to Gaia-relative coordinates (250,000 -> 0)
                coords = GaiaDimension.offset(player.location);
            }
            
            player.sendMessage("§7Coordinates: §f" + Math.floor(coords.x) + ", " + Math.floor(coords.y) + ", " + Math.floor(coords.z));
            player.sendMessage("§8§l========================================");
        });

        return { status: 0 };
    });

    // /gaiadimension:androsa
    registry.registerCommand({
        name: "gaiadimension:androsa",
        description: "The Architect.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;
        system.run(() => {
            player.sendMessage("§d[Gaia Creator] §7She's the primordial architect who birthed the original Java realm. If you see crystals, thank her. If you see bugs, it's definitely the porter's fault.");
            player.sendMessage("§b🔗 https://www.curseforge.com/minecraft/mc-mods/gaia-dimension");
        });
        return { status: 0 };
    });

    // /gaiadimension:sen
    registry.registerCommand({
        name: "gaiadimension:sen",
        description: "The Porter.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;
        system.run(() => {
            player.sendMessage("§6[The Porter] §7Behold the one who dragged this entire dimension into Bedrock by its crystal ears.");
            player.sendMessage("§eIt only took 4 years, three gray hairs, and a questionable amount of sanity. Don't ask why it took so long... those gray hairs are just Albite dust, I promise.");
        });
        return { status: 0 };
    });
}
