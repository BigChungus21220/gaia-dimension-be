import { Player, system, world, CommandPermissionLevel, CustomCommandParamType, CustomCommandRegistry, CommandOrigin, BlockPermutation, Vector3 } from "@minecraft/server";
import { DimensionSystem, GaiaDimension } from "../world/Gaia.js";
import { Vec3 } from "../Vec3.js";
import { MathParser } from "./MathParser.js";
import { DataSystem } from "./DataSystem.js";
import { BIOME_VISUALS } from "../config/biome_visuals.js";

/**
 * Formats snake_case IDs to Title Case
 */
function formatName(id: string): string {
    return id.split(/[:_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/**
 * Registers Gaia Utility Commands
 * @param {CustomCommandRegistry} registry 
 */
export function registerGaiaCommands(registry: CustomCommandRegistry) {
    // /gaiadimension:setbiome <biome: string> <radius: string> [shape: string] [epic: string]
    registry.registerCommand({
        name: "gaiadimension:setbiome",
        description: 'Transform the biome. Usage: /gaiadimension:setbiome "crystal_plains" "20" "circle" "true"',
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            { name: "biome", type: CustomCommandParamType.String },
            { name: "radius", type: CustomCommandParamType.String },
            { name: "shape", type: CustomCommandParamType.String },
            { name: "epic", type: CustomCommandParamType.String }
        ]
    }, (origin: CommandOrigin, biome?: string, radiusStr?: string, shape: string = "circle", epic?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        if (!biome || !radiusStr) {
            player.sendMessage('§cUsage: /gaiadimension:setbiome "biome" "radius" ["shape"] ["epic"]');
            return { status: 0 };
        }

        // Strip quotes and parse
        const cleanBiome = biome.replace(/["']/g, "");
        const radius = Number(radiusStr.replace(/["']/g, ""));
        const cleanShape = (shape || "circle").replace(/["']/g, "");
        const isEpic = epic?.toLowerCase().replace(/["']/g, "") === "true" || epic?.toLowerCase().replace(/["']/g, "") === "epic";

        if (isNaN(radius)) {
            player.sendMessage("§cInvalid radius. Please provide a number.");
            return { status: 0 };
        }

        const visuals = BIOME_VISUALS[cleanBiome];
        if (!visuals) {
            player.sendMessage(`§cUnknown biome: ${cleanBiome}. Valid: ${Object.keys(BIOME_VISUALS).join(", ")}`);
            return { status: 0 };
        }

        const center = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
        const dim = player.dimension;

        player.sendMessage(`§6[Gaia] §7Commencing transformation to §e${formatName(cleanBiome)}§7...`);

        const transformLocation = (loc: Vector3) => {
            try {
                // 1. Change Metadata Bedrock
                const metaBlock = dim.getBlock({ x: loc.x, y: 0, z: loc.z });
                if (metaBlock) metaBlock.setType(visuals.bedrock);

                // 2. Change Surface
                const topY = DimensionSystem.getTopBlock(dim, loc.x, loc.z, loc.y + 10);
                const surfaceBlock = dim.getBlock({ x: loc.x, y: topY - 1, z: loc.z });
                if (surfaceBlock && !surfaceBlock.isAir) {
                    surfaceBlock.setType(visuals.surface);
                    
                    // 3. Dirt Layer
                    const dirtBlock = dim.getBlock({ x: loc.x, y: topY - 2, z: loc.z });
                    if (dirtBlock) dirtBlock.setType(visuals.dirt);

                    // 4. Random Foliage & Flowers
                    const rand = Math.random();
                    if (rand < 0.05 && visuals.foliage.length > 0) {
                        const feature = visuals.foliage[Math.floor(Math.random() * visuals.foliage.length)];
                        dim.runCommand(`execute positioned ${loc.x} ${topY} ${loc.z} run feature place ${feature}`);
                    } else if (rand < 0.15 && visuals.groundCover.length > 0) {
                        const feature = visuals.groundCover[Math.floor(Math.random() * visuals.groundCover.length)];
                        dim.runCommand(`execute positioned ${loc.x} ${topY} ${loc.z} run feature place ${feature}`);
                    } else if (rand < 0.25) {
                        const flowers = ["gaiadimension:tilibl", "gaiadimension:tiligr", "gaiadimension:tilimy", "gaiadimension:tiliol", "gaiadimension:tiliou", "gaiadimension:tilipi", "gaiadimension:tilipu"];
                        const flower = flowers[Math.floor(Math.random() * flowers.length)];
                        const airBlock = dim.getBlock({ x: loc.x, y: topY, z: loc.z });
                        if (airBlock && airBlock.isAir) airBlock.setType(flower);
                    }
                }
            } catch (e) {}
        };

        if (!isEpic) {
            system.run(() => {
                for (let x = -radius; x <= radius; x++) {
                    for (let z = -radius; z <= radius; z++) {
                        const dist = Math.sqrt(x * x + z * z);
                        if (cleanShape === "circle" && dist > radius) continue;
                        transformLocation({ x: center.x + x, y: center.y, z: center.z + z });
                    }
                }
                dim.spawnEntity("minecraft:lightning_bolt", center);
                dim.playSound("ambient.weather.thunder", center);
            });
        } else {
            let currentRadius = 0;
            const interval = system.runInterval(() => {
                const r = currentRadius;
                for (let theta = 0; theta < 360; theta += 2) {
                    const rad = (theta * Math.PI) / 180;
                    const x = Math.round(r * Math.cos(rad));
                    const z = Math.round(r * Math.sin(rad));
                    transformLocation({ x: center.x + x, y: center.y, z: center.z + z });
                }

                if (r % 5 === 0) {
                    const fxPos = { x: center.x + r, y: center.y, z: center.z };
                    dim.playSound("item.trident.thunder", fxPos, { volume: 0.5 });
                    if (Math.random() < 0.3) dim.spawnEntity("minecraft:lightning_bolt", { x: center.x + (Math.random() * r * 2 - r), y: center.y, z: center.z + (Math.random() * r * 2 - r) });
                }

                currentRadius++;
                if (currentRadius > radius) {
                    system.clearRun(interval);
                    dim.playSound("ui.toast.challenge_complete", center);
                    player.sendMessage("§6[Gaia] §aTransformation Complete.");
                }
            }, 1);
        }

        return { status: 0 };
    });

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
    }, (origin: CommandOrigin, p1?: string, p2?: string, p3?: string, p4?: string, p5?: string, p6?: string, p7?: string, p8?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            try {
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter(p => p !== undefined).join(" ");
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:math <expression>");
                    return;
                }

                const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
                const view = player.getViewDirection();
                const rot = player.getRotation();
                const contextExtra = { 
                    pos, view, rot, 
                    self: player,
                    lp: pos,
                    lx: pos.x, ly: pos.y, lz: pos.z,
                    vx: view.x, vy: view.y, vz: view.z,
                    rx: rot.x, ry: rot.y
                };

                const result = MathParser.evaluate(expression, contextExtra);

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
            } catch (e: any) {
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
    }, (origin: CommandOrigin, p1?: string, p2?: string, p3?: string, p4?: string, p5?: string, p6?: string, p7?: string, p8?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            try {
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter(p => p !== undefined).join(" ");
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:tpmath <expression>");
                    return;
                }

                const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
                const view = player.getViewDirection();
                const rot = player.getRotation();
                const contextExtra = { 
                    pos, view, rot, 
                    self: player,
                    lp: pos,
                    lx: pos.x, ly: pos.y, lz: pos.z,
                    vx: view.x, vy: view.y, vz: view.z,
                    rx: rot.x, ry: rot.y
                };

                const result = MathParser.evaluate(expression, contextExtra);

                if (typeof result === 'object' && result !== null && 'x' in result && 'y' in result && 'z' in result) {
                    player.teleport(result);
                    player.sendMessage(`§8[§6TPMath§8] §7Teleported to §a${Vec3.toString(result)}`);
                } else {
                    player.sendMessage("§cError: The expression must result in a Vector3.");
                }
            } catch (e: any) {
                player.sendMessage(`§8[§6TPMath§8] §cError: ${e.message}`);
            }
        });

        return { status: 0 };
    });

    // /gaiadimension:data <op> <target> [path] [value/expression/json]
    registry.registerCommand({
        name: "gaiadimension:data",
        description: "Allows you to get, merge, modify, and remove data from block entities and entities.",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            { name: "op", type: CustomCommandParamType.String },
            { name: "target", type: CustomCommandParamType.String },
            { name: "path", type: CustomCommandParamType.String },
            { name: "v1", type: CustomCommandParamType.String },
            { name: "v2", type: CustomCommandParamType.String },
            { name: "v3", type: CustomCommandParamType.String },
            { name: "v4", type: CustomCommandParamType.String },
            { name: "v5", type: CustomCommandParamType.String }
        ]
    }, (origin: CommandOrigin, op?: string, target?: string, path?: string, v1?: string, v2?: string, v3?: string, v4?: string, v5?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        system.run(() => {
            try {
                const operation = op ? op.toLowerCase() : "get";
                const targetType = target ? target.toLowerCase() : "self";
                
                const getTarget = (type: string) => {
                    if (type === "block") {
                        const ray = player.getBlockFromViewDirection({ maxDistance: 10 });
                        return ray ? ray.block : null;
                    } else if (type === "entity") {
                        const ray = player.getEntitiesFromViewDirection({ maxDistance: 10 });
                        return ray && ray.length > 0 ? ray[0].entity : null;
                    } else if (type === "self") {
                        return player;
                    }
                    return null;
                };

                let targetObj = getTarget(targetType);
                if (!targetObj) throw new Error(`Target '${targetType}' not found or out of range.`);

                const data = DataSystem.getRoot(targetObj);
                const targetName = targetType === "self" ? player.name : targetType;

                if (operation === "get") {
                    const val = DataSystem.getByPath(data, path as string);
                    if (path) {
                        player.sendMessage(`${targetName} has the following entity data: ${JSON.stringify(val, null, 2)}`);
                    } else {
                        player.sendMessage(`${targetName} has the following entity data: ${JSON.stringify(data, null, 2)}`);
                    }
                } 
                else if (operation === "merge") {
                    const jsonStr = [path, v1, v2, v3, v4, v5].filter(p => p !== undefined).join(" ");
                    const source = JSON.parse(jsonStr);
                    DataSystem.deepMerge(data, source);
                    DataSystem.saveRoot(targetObj, data);
                    player.sendMessage(`Modified entity data of ${targetName}`);
                }
                else if (operation === "modify") {
                    const subOp = v1 ? v1.toLowerCase() : "set";
                    const sourceType = v2 ? v2.toLowerCase() : "value";
                    let finalVal: any = undefined;

                    if (sourceType === "value") {
                        const rawVal = [v3, v4, v5].filter(p => p !== undefined).join(" ");
                        finalVal = rawVal;
                        try { finalVal = JSON.parse(rawVal); } catch(e) {}
                        if (!isNaN(rawVal as any)) finalVal = Number(rawVal);
                        if (rawVal === "true") finalVal = true;
                        if (rawVal === "false") finalVal = false;
                    } 
                    else if (sourceType === "from") {
                        const fromSourceType = v3 ? v3.toLowerCase() : "self";
                        const fromSourcePath = v4;
                        const sourceObj = getTarget(fromSourceType);
                        if (!sourceObj) throw new Error(`Source '${fromSourceType}' not found.`);
                        const sourceData = DataSystem.getRoot(sourceObj);
                        finalVal = DataSystem.getByPath(sourceData, fromSourcePath as string);
                    }

                    if (subOp === "set") {
                        DataSystem.setByPath(data, path as string, finalVal);
                    }
                    
                    DataSystem.saveRoot(targetObj, data);
                    player.sendMessage(`Modified entity data of ${targetName}`);
                }
                else if (operation === "remove") {
                    if (!path) throw new Error("Path required for remove.");
                    DataSystem.setByPath(data, path, undefined);
                    DataSystem.saveRoot(targetObj, data);
                    player.sendMessage(`Modified entity data of ${targetName}`);
                }
                else if (operation === "math") {
                    const expression = [v1, v2, v3, v4, v5].filter(p => p !== undefined).join(" ");
                    
                    const pos = { x: player.location.x, y: player.location.y, z: player.location.z };
                    const view = player.getViewDirection();
                    const rot = player.getRotation();
                    const contextExtra = { 
                        pos, view, rot, 
                        self: player,
                        lp: pos,
                        lx: pos.x, ly: pos.y, lz: pos.z,
                        vx: view.x, vy: view.y, vz: view.z,
                        rx: rot.x, ry: rot.y,
                        ...data 
                    };

                    const result = MathParser.evaluate(expression, contextExtra);
                    DataSystem.setByPath(data, path as string, result);
                    DataSystem.saveRoot(targetObj, data);
                    player.sendMessage(`Modified entity data of ${targetName}`);
                }
                else {
                    throw new Error("Unknown operation. Use get, merge, modify, remove, or math.");
                }
            } catch (e: any) {
                player.sendMessage(`§cError: ${e.message}`);
            }
        });

        return { status: 0 };
    });

    // /gaiadimension:gaiahelp
    registry.registerCommand({
        name: "gaiadimension:gaiahelp",
        description: "Technical information and lore regarding the Gaia Dimension Bedrock Port.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin: CommandOrigin) => {
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
    }, (origin: CommandOrigin) => {
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
    }, (origin: CommandOrigin) => {
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
    }, (origin: CommandOrigin) => {
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
    }, (origin: CommandOrigin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;
        system.run(() => {
            player.sendMessage("§6[The Porter] §7Behold the one who dragged this entire dimension into Bedrock by its crystal ears.");
            player.sendMessage("§eIt only took 4 years, three gray hairs, and a questionable amount of sanity. Don't ask why it took so long... those gray hairs are just Albite dust, I promise.");
        });
        return { status: 0 };
    });
}
