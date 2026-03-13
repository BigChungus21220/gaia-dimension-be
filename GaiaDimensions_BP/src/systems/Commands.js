import { Player, system, CommandPermissionLevel, CustomCommandParamType } from "@minecraft/server";
import { DimensionSystem, GaiaDimension } from "../world/Gaia.js";
import { Vec3 } from "../Vec3.js";
import { MathParser } from "./MathParser.js";

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
    // /gaiadimension:math [expression...]
    registry.registerCommand({
        name: "gaiadimension:math",
        description: "Evaluates a mathematical expression with Vec3 and Math support.",
        permissionLevel: CommandPermissionLevel.Any,
        optionalParameters: [
            { name: "p1", type: CustomCommandParamType.String },
            { name: "p2", type: CustomCommandParamType.String },
            { name: "p3", type: CustomCommandParamType.String },
            { name: "p4", type: CustomCommandParamType.String },
            { name: "p5", type: CustomCommandParamType.String },
            { name: "p6", type: CustomCommandParamType.String },
            { name: "p7", type: CustomCommandParamType.String },
            { name: "p8", type: CustomCommandParamType.String }
        ]
    }, (origin, p1, p2, p3, p4, p5, p6, p7, p8) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            try {
                // Join all provided positional arguments
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter(p => p !== undefined).join(" ");
                
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:math <expression>");
                    player.sendMessage("§7Example: /gaiadimension:math \"sub(v(1,0,0), v(0,1,0))\"");
                    return;
                }

                // Evaluate the expression using the manual parser, passing current location as 'pos'
                const result = MathParser.evaluate(expression, { pos: player.location });

                let output = "";
                if (typeof result === 'object' && result !== null) {
                    if ('x' in result && 'y' in result && 'z' in result) {
                        output = Vec3.toString(result);
                    } else {
                        output = JSON.stringify(result);
                    }
                } else {
                    output = String(result);
                }

                player.sendMessage(`§8[§6Math§8] §f${expression} §7= §a${output}`);
            } catch (e) {
                player.sendMessage(`§8[§6Math§8] §cError: ${e.message}`);
            }
        });

        return { status: 0 };
    });

    // /gaiadimension:tpmath [expression...]
    registry.registerCommand({
        name: "gaiadimension:tpmath",
        description: "Calculates a location and teleports you there.",
        permissionLevel: CommandPermissionLevel.Any,
        optionalParameters: [
            { name: "p1", type: CustomCommandParamType.String },
            { name: "p2", type: CustomCommandParamType.String },
            { name: "p3", type: CustomCommandParamType.String },
            { name: "p4", type: CustomCommandParamType.String },
            { name: "p5", type: CustomCommandParamType.String },
            { name: "p6", type: CustomCommandParamType.String },
            { name: "p7", type: CustomCommandParamType.String },
            { name: "p8", type: CustomCommandParamType.String }
        ]
    }, (origin, p1, p2, p3, p4, p5, p6, p7, p8) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            try {
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter(p => p !== undefined).join(" ");
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:tpmath <expression>");
                    player.sendMessage("§7Example: /gaiadimension:tpmath \"pos + v(10, 0, 10)\"");
                    return;
                }

                const result = MathParser.evaluate(expression, { pos: player.location });

                if (typeof result === 'object' && result !== null && 'x' in result && 'y' in result && 'z' in result) {
                    player.teleport(result);
                    player.sendMessage(`§8[§6TPMath§8] §7Teleported to §a${Vec3.toString(result)}`);
                } else {
                    player.sendMessage("§cError: The expression must result in a Vector3 (v(x,y,z)).");
                    player.sendMessage(`§7Got: §f${result}`);
                }
            } catch (e) {
                player.sendMessage(`§8[§6TPMath§8] §cError: ${e.message}`);
            }
        });

        return { status: 0 };
    });

    // /gaiadimension:data <operation> <target> [property] [value/expression...]
    registry.registerCommand({
        name: "gaiadimension:data",
        description: "Manage dynamic properties on blocks, entities, or yourself.",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            { name: "op", type: CustomCommandParamType.String },
            { name: "target", type: CustomCommandParamType.String },
            { name: "key", type: CustomCommandParamType.String },
            { name: "v1", type: CustomCommandParamType.String },
            { name: "v2", type: CustomCommandParamType.String },
            { name: "v3", type: CustomCommandParamType.String },
            { name: "v4", type: CustomCommandParamType.String },
            { name: "v5", type: CustomCommandParamType.String }
        ]
    }, (origin, op, target, key, v1, v2, v3, v4, v5) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            const operation = op ? op.toLowerCase() : "get";
            const targetType = target ? target.toLowerCase() : "self";
            
            // Helper to get target object
            let targetObj = null;
            if (targetType === "block") {
                const ray = player.getBlockFromViewDirection({ maxDistance: 10 });
                targetObj = ray ? ray.block : null;
            } else if (targetType === "entity") {
                const ray = player.getEntitiesFromViewDirection({ maxDistance: 10 });
                targetObj = ray && ray.length > 0 ? ray[0].entity : null;
            } else if (targetType === "self") {
                targetObj = player;
            }

            if (!targetObj) {
                player.sendMessage(`§cTarget '${targetType}' not found or out of range.`);
                return;
            }

            try {
                if (operation === "get") {
                    if (key) {
                        const val = targetObj.getDynamicProperty(key);
                        player.sendMessage(`§8[§6Data§8] §a${key} §7= §f${typeof val === 'object' ? JSON.stringify(val) : val}`);
                    } else {
                        const ids = targetObj.getDynamicPropertyIds();
                        player.sendMessage(`§8[§6Data§8] §7Properties on §f${targetType}:`);
                        ids.forEach(id => {
                            const val = targetObj.getDynamicProperty(id);
                            player.sendMessage(`§7 - §a${id}§7: §f${typeof val === 'object' ? JSON.stringify(val) : val}`);
                        });
                    }
                } 
                else if (operation === "set") {
                    if (!key || v1 === undefined) {
                        player.sendMessage("§cUsage: /data set <target> <key> <value>");
                        return;
                    }
                    // Attempt to parse value
                    let value = v1;
                    if (v1 === "true") value = true;
                    else if (v1 === "false") value = false;
                    else if (!isNaN(v1)) value = Number(v1);
                    
                    targetObj.setDynamicProperty(key, value);
                    player.sendMessage(`§8[§6Data§8] §7Set §a${key} §7to §f${value} §7on §f${targetType}`);
                }
                else if (operation === "remove") {
                    if (!key) {
                        player.sendMessage("§cUsage: /data remove <target> <key>");
                        return;
                    }
                    targetObj.setDynamicProperty(key, undefined);
                    player.sendMessage(`§8[§6Data§8] §7Removed §a${key} §7from §f${targetType}`);
                }
                else if (operation === "math") {
                    if (!key || v1 === undefined) {
                        player.sendMessage("§cUsage: /data math <target> <key> <expression>");
                        return;
                    }
                    const expression = [v1, v2, v3, v4, v5].filter(p => p !== undefined).join(" ");
                    const result = MathParser.evaluate(expression, { pos: player.location });
                    
                    targetObj.setDynamicProperty(key, result);
                    player.sendMessage(`§8[§6Data§8] §7Stored result of §f'${expression}' §7into §a${key} §7(Result: §f${typeof result === 'object' ? Vec3.toString(result) : result}§7)`);
                }
                else {
                    player.sendMessage("§cUnknown operation. Use get, set, remove, or math.");
                }
            } catch (e) {
                player.sendMessage(`§8[§6Data§8] §cError: ${e.message}`);
            }
        });

        return { status: 0 };
    });

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
