import { 
    Player, 
    system, 
    world, 
    CommandPermissionLevel, 
    CustomCommandParamType, 
    CustomCommandRegistry, 
    CommandOrigin, 
    BlockPermutation, 
    Vector3,
    Entity,
    Block
} from "@minecraft/server";
import { ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import { DimensionSystem } from "../world/Gaia.js";
import { Vec3 } from "../Vec3.js";
import { MathParser, MathContext } from "./MathParser.js";
import { DataSystem } from "./DataSystem.js";
import { ModConfig } from "../config/mod_config.js";

/**
 * Registers Gaia Utility Commands
 * @param {CustomCommandRegistry} registry 
 */
export function registerGaiaCommands(registry: CustomCommandRegistry): void {
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
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            try {
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter((p): p is string => p !== undefined).join(" ");
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:math <expression>");
                    return;
                }

                const pos: Vector3 = { x: player.location.x, y: player.location.y, z: player.location.z };
                const view = player.getViewDirection();
                const rot = player.getRotation();
                const contextExtra: MathContext = { 
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
                        output = Vec3.toString(result as Vector3);
                    } else {
                        output = JSON.stringify(result);
                    }
                } else {
                    output = String(result);
                }

                player.sendMessage(`§8[§6Math§8] §f${expression} §7= §a${output}`);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                player.sendMessage(`§8[§6Math§8] §cError: ${message}`);
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
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            try {
                const expression = [p1, p2, p3, p4, p5, p6, p7, p8].filter((p): p is string => p !== undefined).join(" ");
                if (!expression) {
                    player.sendMessage("§cUsage: /gaiadimension:tpmath <expression>");
                    return;
                }

                const pos: Vector3 = { x: player.location.x, y: player.location.y, z: player.location.z };
                const view = player.getViewDirection();
                const rot = player.getRotation();
                const contextExtra: MathContext = { 
                    pos, view, rot, 
                    self: player,
                    lp: pos,
                    lx: pos.x, ly: pos.y, lz: pos.z,
                    vx: view.x, vy: view.y, vz: view.z,
                    rx: rot.x, ry: rot.y
                };

                const result = MathParser.evaluate(expression, contextExtra);

                if (typeof result === 'object' && result !== null && 'x' in result && 'y' in result && 'z' in result) {
                    player.teleport(result as Vector3);
                    player.sendMessage(`§8[§6TPMath§8] §7Teleported to §a${Vec3.toString(result as Vector3)}`);
                } else {
                    player.sendMessage("§cError: The expression must result in a Vector3.");
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                player.sendMessage(`§8[§6TPMath§8] §cError: ${message}`);
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
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            try {
                const operation = op ? op.toLowerCase() : "get";
                const targetType = target ? target.toLowerCase() : "self";
                
                const getTarget = (type: string): Player | Entity | Block | null => {
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
                    const jsonStr = [path, v1, v2, v3, v4, v5].filter((p): p is string => p !== undefined).join(" ");
                    const source = JSON.parse(jsonStr);
                    DataSystem.deepMerge(data, source);
                    DataSystem.saveRoot(targetObj, data);
                    player.sendMessage(`Modified entity data of ${targetName}`);
                }
                else if (operation === "modify") {
                    const subOp = v1 ? v1.toLowerCase() : "set";
                    const sourceType = v2 ? v2.toLowerCase() : "value";
                    let finalVal: string | number | boolean | object | undefined = undefined;

                    if (sourceType === "value") {
                        const rawVal = [v3, v4, v5].filter((p): p is string => p !== undefined).join(" ");
                        finalVal = rawVal;
                        try { finalVal = JSON.parse(rawVal); } catch(e) {}
                        if (!isNaN(Number(rawVal)) && rawVal.trim() !== "") finalVal = Number(rawVal);
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
                    const expression = [v1, v2, v3, v4, v5].filter((p): p is string => p !== undefined).join(" ");
                    
                    const pos: Vector3 = { x: player.location.x, y: player.location.y, z: player.location.z };
                    const view = player.getViewDirection();
                    const rot = player.getRotation();
                    const contextExtra: MathContext = { 
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
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                player.sendMessage(`§cError: ${message}`);
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
        if (!(player instanceof Player)) return { status: 0 };

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
        if (!(player instanceof Player)) return { status: 0 };

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
        if (!(player instanceof Player)) return { status: 0 };

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
            if (inGaia) {
                const biome = DimensionSystem.getBiome(player);
                player.sendMessage("§7Current Biome: §e" + formatName(biome));
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
        if (!(player instanceof Player)) return { status: 0 };
        system.run(() => {
            player.sendMessage("§d[Gaia Creator] §7She's the primordial architect who birthed the original Java realm. If you see crystals, thank her. If you see bugs, it's definitely the porter's fault.");
            player.sendMessage("§b🔗 https://www.curseforge.com/minecraft/mc-mods/gaia-dimension");
        });
        return { status: 0 };
    });

    // /gaiadimension:settings
    registry.registerCommand({
        name: "gaiadimension:settings",
        description: "Configure Gaia Dimension settings.",
        permissionLevel: CommandPermissionLevel.GameDirectors,
    }, (origin: CommandOrigin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            const currentConfig = ModConfig.getAll();
            const form = new ModalFormData();
            form.title("§6Gaia Settings");
            
            form.toggle("Portal Biome Restriction\n§7(Only allowed biomes)", currentConfig.portalBiomeRestriction);
            form.toggle("Allow All Biomes\n§7(Bypass restriction)", currentConfig.allowAllBiomes);
            
            form.textField("Manually Add Biome ID", "Enter identifier...", "");

            // Sorted list of all discovered biomes for the toggle list
            const discovered = currentConfig.discoveredBiomes;
            const hotBiomes = new Set(currentConfig.hotBiomes);

            for (const biomeId of discovered) {
                const isAllowed = hotBiomes.has(biomeId);
                const label = isAllowed ? `§aAllowed: §f${biomeId}` : `§7Restricted: §f${biomeId}`;
                form.toggle(label, isAllowed);
            }

            form.show(player).then((response: ModalFormResponse) => {
                if (response.canceled || !response.formValues) return;
                
                const [portalRestriction, allowAll, manualBiome, ...biomeToggles] = response.formValues as [boolean, boolean, string, ...boolean[]];
                
                ModConfig.portalBiomeRestriction = portalRestriction;
                ModConfig.allowAllBiomes = allowAll;
                
                if (manualBiome && manualBiome.trim().length > 0) {
                    ModConfig.addHotBiome(manualBiome.trim());
                }

                // Process toggles
                const newHotBiomes: string[] = [];
                for (let i = 0; i < discovered.length; i++) {
                    if (biomeToggles[i]) {
                        newHotBiomes.push(discovered[i]);
                    }
                }
                ModConfig.hotBiomes = newHotBiomes;
                
                player.sendMessage(`§6[Gaia] §7Settings updated.`);
            }).catch((e: unknown) => {
                console.error("Failed to show settings form: " + (e instanceof Error ? e.message : String(e)));
            });
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
        if (!(player instanceof Player)) return { status: 0 };
        system.run(() => {
            player.sendMessage("§6[The Porter] §7Behold the one who dragged this entire dimension into Bedrock by its crystal ears.");
            player.sendMessage("§eIt only took 4 years, three gray hairs, and a questionable amount of sanity. Don't ask why it took so long... those gray hairs are just Albite dust, I promise.");
        });
        return { status: 0 };
    });
}

function formatName(id: string): string {
    return id.split(/[:_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
