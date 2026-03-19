import { Player, system, world, CommandPermissionLevel, CustomCommandParamType, CustomCommandRegistry, CommandOrigin, Vector3 } from "@minecraft/server";
import { DimensionSystem } from "../world/Gaia.js";
import { BIOME_VISUALS } from "../config/biome_visuals.js";

/**
 * Formats snake_case IDs to Title Case
 */
function formatName(id: string): string {
    return id.split(/[:_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

/**
 * Registers the SetBiome command
 */
export function registerSetBiomeCommand(registry: CustomCommandRegistry) {
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
    }, (origin: CommandOrigin, biome?: string, radiusStr?: string, shape?: string, epic?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return;

        if (!biome || !radiusStr) {
            player.sendMessage('§cUsage: /gaiadimension:setbiome "biome" "radius" ["shape"] ["epic"]');
            return { status: 0 };
        }

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
                const metaBlock = dim.getBlock({ x: loc.x, y: 0, z: loc.z });
                if (metaBlock) metaBlock.setType(visuals.bedrock);

                let currentY = DimensionSystem.getTopBlock(dim, loc.x, loc.z, loc.y + 40);
                let surfaceBlock = null;

                while (currentY > dim.heightRange.min) {
                    const b = dim.getBlock({ x: loc.x, y: currentY - 1, z: loc.z });
                    if (!b || b.isAir) {
                        currentY--;
                        continue;
                    }

                    const tid = b.typeId;
                    if (tid.includes("log") || tid.includes("wood") || tid.includes("leaves") || tid.includes("stem") ||
                        tid.includes("flower") || tid === "minecraft:tallgrass" || tid === "minecraft:grass" || tid === "minecraft:mycelium" ||
                        tid.includes("crystal_growth") || tid.includes("agathum") || tid.includes("tucher") || 
                        tid.includes("sapling") || tid.includes("bush")) {
                        currentY--;
                        continue;
                    }

                    surfaceBlock = b;
                    break;
                }
                
                if (surfaceBlock && !surfaceBlock.isAir) {
                    surfaceBlock.setType(visuals.surface);
                    const dirtBlock = dim.getBlock({ x: loc.x, y: currentY - 2, z: loc.z });
                    if (dirtBlock) dirtBlock.setType(visuals.dirt);

                    const rand = Math.random();
                    if (rand < 0.05 && visuals.foliage.length > 0) {
                        const feature = visuals.foliage[Math.floor(Math.random() * visuals.foliage.length)];
                        dim.runCommand(`execute positioned ${loc.x} ${currentY} ${loc.z} run feature place ${feature}`);
                    } else if (rand < 0.15 && visuals.groundCover.length > 0) {
                        const feature = visuals.groundCover[Math.floor(Math.random() * visuals.groundCover.length)];
                        dim.runCommand(`execute positioned ${loc.x} ${currentY} ${loc.z} run feature place ${feature}`);
                    } else if (rand < 0.25) {
                        const flowers = ["gaiadimension:tilibl", "gaiadimension:tiligr", "gaiadimension:tilimy", "gaiadimension:tiliol", "gaiadimension:tiliou", "gaiadimension:tilipi", "gaiadimension:tilipu"];
                        const flower = flowers[Math.floor(Math.random() * flowers.length)];
                        const airBlock = dim.getBlock({ x: loc.x, y: currentY, z: loc.z });
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
}
