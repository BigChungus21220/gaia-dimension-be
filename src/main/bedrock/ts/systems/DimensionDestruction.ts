import {
    world, system, Player, Dimension, Vector3,
    CommandPermissionLevel, CustomCommandParamType,
    CustomCommandRegistry, CommandOrigin,
    BlockVolume, EffectTypes
} from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// ══════════════════════════════════════════════════════════════════════
//  Dimension Destruction — Exterminatus-level dimensional obliteration
// ══════════════════════════════════════════════════════════════════════

// ── Dimension Registry ──────────────────────────────────────────────

interface DimEntry {
    id: string;
    name: string;
    lore: string;
    color: string;
}

/** Hardcoded dimension definitions (always available) */
const CORE_DIMENSIONS: DimEntry[] = [
    { id: "minecraft:overworld",              name: "Overworld",        lore: "The familiar realm of sun and earth.",                                                              color: "§a" },
    { id: "minecraft:nether",                 name: "Nether",           lore: "A hellscape of fire and brimstone.",                                                                color: "§c" },
    { id: "minecraft:the_end",                name: "The End",          lore: "The void beyond the stars.",                                                                        color: "§5" },
    { id: "gaiadimension:gaia_dimension",     name: "Gaia Dimension 1", lore: "Crystalline paradise preserved in eternal sun.",                                                    color: "§6" },
];

/** Dynamic realm pool — registered at startup, unique Gaia-variant worlds */
export const REALM_COUNT = 16;
export const REALM_PREFIX = "gaiadimension:realm_";

function getRealmDims(): DimEntry[] {
    const realms: DimEntry[] = [];
    const themes: { lore: string; color: string }[] = [
        { lore: "Another... crystal world. Sure. Why not.",                                            color: "§b" },
        { lore: "It's a crystal world... again. Yep. Another one.",                                    color: "§e" },
        { lore: "Yet ANOTHER Gaia dimension. Are you serious right now.",                              color: "§d" },
        { lore: "Four. FOUR Gaia dimensions. Who approved this.",                                      color: "§9" },
        { lore: "HOW MANY GAIA DIMENSIONS ARE THERE.",                                                 color: "§c" },
        { lore: "I am begging you. Please. No more crystals. I have a family.",                        color: "§5" },
        { lore: "JESUS MARY THEY ARE ALL MINERALS.",                                                   color: "§4" },
        { lore: "By Androsa, that's A LOT of Gaia dimensions!",                                        color: "§6" },
        { lore: "okay at this point i'm convinced the universe is just vibes and malachite.",          color: "§3" },
        { lore: "The crystals... they're MULTIPLYING.",                                                 color: "§c" },
        { lore: "Whoever designed this place needs to be evaluated by a professional.",                color: "§2" },
        { lore: "I have counted twelve Gaia dimensions. I need to lie down.",                          color: "§9" },
        { lore: "Androsa WHY. ANDROSA. W H Y.",                                                        color: "§d" },
        { lore: "At this point I think Gaia IS the universe and everything else is the anomaly.",      color: "§5" },
        { lore: "SIXTEEN. There are SIXTEEN of these. I quit.",                                        color: "§c" },
        { lore: "This is the last one. It has to be. Please let it be the last one.",                  color: "§8" },
    ];
    for (let i = 0; i < REALM_COUNT; i++) {
        const t = themes[i];
        realms.push({
            id: `${REALM_PREFIX}${i}`,
            name: `Gaia Dimension ${i + 2}`,
            lore: t.lore,
            color: t.color,
        });
    }
    return realms;
}

/** All known dimensions */
function getAllDimensions(): DimEntry[] {
    return [...CORE_DIMENSIONS, ...getRealmDims()];
}

/** Get alive (non-destroyed) dimensions */
function getAliveDimensions(): DimEntry[] {
    return getAllDimensions().filter(d => !isDimensionDestroyed(d.id));
}

// ── Persistent Destruction State ────────────────────────────────────

function isDimensionDestroyed(dimId: string): boolean {
    return world.getDynamicProperty(`destroyed:${dimId}`) === true;
}

function setDimensionDestroyed(dimId: string, destroyed: boolean): void {
    world.setDynamicProperty(`destroyed:${dimId}`, destroyed);
}

/** Find the first alive dimension that isn't the given one */
function findFallbackDimension(excludeId: string): DimEntry | undefined {
    return getAliveDimensions().find(d => d.id !== excludeId);
}

// ── Dimension Navigator (CustomForm) ────────────────────────────────

function showDimensionNavigator(player: Player): void {
    const alive = getAliveDimensions();
    if (alive.length === 0) {
        player.sendMessage("§c§lAll dimensions have been obliterated. There is nothing left.");
        return;
    }

    const currentDim = player.dimension.id;
    const form = new ActionFormData()
        .title("§l§8[ §fDimensional Navigator §8]")
        .body("§7Choose a dimension to traverse to:");

    // Build button list — track which dims map to which index
    const dimList: DimEntry[] = [];
    for (const dim of alive) {
        const isCurrent = dim.id === currentDim;
        const label = isCurrent
            ? `${dim.color}§l${dim.name}\n§r§8(you are here)`
            : `${dim.color}${dim.name}\n§8§o${dim.lore}`;
        form.button(label);
        dimList.push(dim);
    }

    form.show(player).then(response => {
        if (response.canceled || response.selection === undefined) return;
        const selected = dimList[response.selection];
        if (!selected) return;
        if (selected.id === currentDim) {
            player.sendMessage("§7You are already in this dimension.");
            return;
        }
        teleportToDimension(player, selected);
    }).catch(() => { /* player closed */ });
}

function teleportToDimension(player: Player, dim: DimEntry): void {
    system.run(() => {
        try {
            const targetDim = world.getDimension(dim.id);
            player.sendMessage(`${dim.color}§l» §r§7Traversing to ${dim.color}${dim.name}§7...`);

            // Teleport to y=100 to be safe
            player.teleport(
                { x: player.location.x, y: 100, z: player.location.z },
                { dimension: targetDim }
            );

            system.runTimeout(() => {
                if (player.isValid) {
                    player.sendMessage(`${dim.color}§l» §r§7Arrived in ${dim.color}${dim.name}§7.`);
                }
            }, 20);
        } catch (e) {
            player.sendMessage(`§cFailed to traverse: ${e instanceof Error ? e.message : String(e)}`);
        }
    });
}

// ── Epic Text Lines ─────────────────────────────────────────────────

const OMEN_LINES: string[] = [
    "§4§lNow I am become Death, the destroyer of worlds.",
    "§7§o— J. Robert Oppenheimer",
    "",
    "§c§lThe stars themselves shall weep.",
    "§8§oThe dimensional fabric shudders...",
    "§4If the radiance of a thousand suns were to burst at once into the sky,",
    "§4that would be like the splendor of the mighty one.",
    "§7§o— Bhagavad Gita, XI.12",
];

const FRACTURE_LINES: string[] = [
    "§c§l D E A T H",
    "§4§l T H E",
    "§c§l D E S T R O Y E R",
    "§4§l O F   W O R L D S",
    "",
    "§6§lThe power of a god flows through your fingertips.",
    "§e§lRagnarök!",
    "§8§oThe sky cracks. The earth splits. The void hungers.",
    "",
    "§5§lFeel it. The weight of an entire reality... collapsing.",
    "§7§oA trillion souls, silenced in an instant.",
    "§4§lThis is what it means to unmake a world.",
];

const DEVOURER_LINES: string[] = [
    "§8§l━━━━━━ §4TRANSMISSIONS RECEIVED §8§l━━━━━━",
    "",
    "§5§l[UNICRON] §f§o\"Magnificent. You destroy with the elegance of a true herald. I approve.\"",
    "§4§l[GALACTUS] §f§o\"Another world consumed. The cosmic balance shifts. Welcome to the hunger.\"",
    "§2§l[ABELOTH] §f§o\"Delicious. The chaos of an unraveling dimension... I can taste it from here.\"",
    "§c§l[THANOS] §f§o\"You could not live with your own failure. So you erased the whole thing. Respect.\"",
    "§6§l[SAURON] §f§o\"One does not simply walk into a dimension that no longer exists.\"",
    "§e§l[Cyn] §f§o\"Haha, you actually did it. §e[giggle]§f That's adorable. §e[giggle] §e[giggle]§f\"",
    "§b§l[BILL CIPHER] §f§o\"WOW! A FLAT CIRCLE WHERE A WORLD USED TO BE! NOW THAT'S MY KIND OF GEOMETRY!\"",
    "§d§l[DORMAMMU] §f§o\"I've come to bargain— wait. There's nothing left to bargain for. Well played.\"",
    "§3§l[THE VOID] §f§o\"...\"",
    "§3§l[THE VOID] §f§o\"...thank you for the meal.\"",
    "",
    "§8§l━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
];

const AFTERMATH_LINES: string[] = [
    "",
    "§7§oIn the silence that follows...",
    "§7§oyou realize the screaming was yours.",
    "",
    "§f§lA world unmade. A history erased.",
    "§f§lEvery mountain. Every ocean. Every sunset.",
    "§f§lGone.",
    "",
    "§4§l\"I have become death.\"",
    "§7§oAnd you didn't even flinch.",
    "",
    "§8§o[The dimensional navigator will open shortly...]",
];

/** Broadcast a line to all players */
function broadcast(msg: string): void {
    for (const p of world.getAllPlayers()) {
        if (p.isValid) p.sendMessage(msg);
    }
}

/** Spam an array of lines at 3-tick intervals starting at startTick */
function scheduleLines(lines: string[], startTick: number, tickRef: number, dimName: string, dimColor: string): void {
    for (let i = 0; i < lines.length; i++) {
        const targetTick = startTick + i * 3;
        if (tickRef === targetTick) {
            const line = lines[i].replace("{DIM}", `${dimColor}${dimName}§r`);
            broadcast(line);
        }
    }
}

// ── Destruction Cinematic Sequencer ─────────────────────────────────

class DestructionSequencer {
    private player: Player;
    private dimId: string;
    private dimName: string;
    private dimColor: string;
    private tick: number = 0;
    private interval: number = 0;
    private affectedPlayers: Player[] = [];

    constructor(player: Player, dimId: string, dimName: string, dimColor: string) {
        this.player = player;
        this.dimId = dimId;
        this.dimName = dimName;
        this.dimColor = dimColor;
    }

    start(): void {
        this.affectedPlayers = world.getAllPlayers().filter(p => p.dimension.id === this.dimId);

        broadcast(`§4§l⚠ ${this.dimColor}${this.dimName} §4§lis being obliterated... ⚠`);
        broadcast(`§8§oDimensional collapse initiated by §f${this.player.name}`);

        this.interval = system.runInterval(() => {
            this.tick++;
            this.processTick();
        }, 1);
    }

    private processTick(): void {
        this.affectedPlayers = this.affectedPlayers.filter(p => p.isValid && p.dimension.id === this.dimId);

        // ── PHASE I: OMEN (ticks 1-40) — Poetry + darkness ─────
        if (this.tick === 1) {
            for (const p of this.affectedPlayers) {
                p.onScreenDisplay.setTitle("§4§l⚠ DIMENSIONAL COLLAPSE ⚠", {
                    fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 10,
                });
                p.addEffect("darkness", 300, { amplifier: 0, showParticles: false });
                p.dimension.playSound("ambient.weather.thunder", p.location, { volume: 2.0, pitch: 0.3 });
            }
        }

        // Spam omen lines into chat (ticks 5-29, every 3 ticks)
        for (let i = 0; i < OMEN_LINES.length; i++) {
            if (this.tick === 5 + i * 3) broadcast(OMEN_LINES[i]);
        }

        // Night vision flicker
        if (this.tick > 5 && this.tick < 40 && this.tick % 6 === 0) {
            for (const p of this.affectedPlayers) {
                p.addEffect("night_vision", 5, { amplifier: 0, showParticles: false });
            }
        }

        // ── PHASE II: TREMOR (ticks 40-80) — Shake + explosions ─
        if (this.tick === 40) {
            for (const p of this.affectedPlayers) {
                p.onScreenDisplay.setTitle("§c§lTHE GROUND TREMBLES", {
                    fadeInDuration: 5, stayDuration: 30, fadeOutDuration: 5,
                });
            }
        }

        if (this.tick >= 40 && this.tick < 80) {
            for (const p of this.affectedPlayers) {
                if (this.tick % 2 === 0) {
                    const shake = 0.05 + (this.tick - 40) * 0.004;
                    p.teleport({
                        x: p.location.x + (Math.random() - 0.5) * shake,
                        y: p.location.y,
                        z: p.location.z + (Math.random() - 0.5) * shake,
                    });
                }
                if (this.tick % 5 === 0) {
                    try {
                        p.dimension.spawnParticle("minecraft:huge_explosion_emitter", {
                            x: p.location.x + (Math.random() - 0.5) * 20,
                            y: p.location.y + Math.random() * 10,
                            z: p.location.z + (Math.random() - 0.5) * 20,
                        });
                    } catch {}
                }
                if (this.tick % 8 === 0) {
                    p.dimension.playSound("random.explode", p.location, { volume: 1.5, pitch: 0.2 + Math.random() * 0.3 });
                }
            }
        }

        // ── PHASE III: FRACTURE (ticks 80-130) — DEATH THE DESTROYER chat spam + block destruction ─
        if (this.tick === 80) {
            for (const p of this.affectedPlayers) {
                p.onScreenDisplay.setTitle("§c§l§kXX§r §4§lTHE FABRIC IS TEARING §c§l§kXX", {
                    fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 5,
                });
                p.dimension.playSound("mob.enderdragon.growl", p.location, { volume: 3.0, pitch: 0.5 });
            }
        }

        // Spam FRACTURE lines (ticks 82-118)
        for (let i = 0; i < FRACTURE_LINES.length; i++) {
            if (this.tick === 82 + i * 3) broadcast(FRACTURE_LINES[i]);
        }

        if (this.tick >= 80 && this.tick < 130) {
            for (const p of this.affectedPlayers) {
                // Spiral particles
                if (this.tick % 3 === 0) {
                    const angle = (this.tick - 80) * 0.3;
                    const radius = 3 + (this.tick - 80) * 0.1;
                    try {
                        p.dimension.spawnParticle("minecraft:dragon_breath_trail", {
                            x: p.location.x + Math.cos(angle) * radius,
                            y: p.location.y + 1 + ((this.tick - 80) % 10) * 0.3,
                            z: p.location.z + Math.sin(angle) * radius,
                        });
                        p.dimension.spawnParticle("minecraft:end_chest", {
                            x: p.location.x + Math.cos(angle + Math.PI) * radius,
                            y: p.location.y + 2,
                            z: p.location.z + Math.sin(angle + Math.PI) * radius,
                        });
                    } catch {}
                }

                // Block destruction
                if (this.tick % 10 === 0) {
                    const r = Math.floor((this.tick - 80) / 10) + 2;
                    const px = Math.floor(p.location.x);
                    const py = Math.floor(p.location.y);
                    const pz = Math.floor(p.location.z);
                    try {
                        p.dimension.fillBlocks(
                            new BlockVolume(
                                { x: px - r, y: py - 1, z: pz - r },
                                { x: px + r, y: py + r, z: pz + r }
                            ),
                            "minecraft:air",
                            { ignoreChunkBoundErrors: true }
                        );
                    } catch {}
                }

                // Intensifying shake
                const shake = 0.15 + (this.tick - 80) * 0.006;
                p.teleport({
                    x: p.location.x + (Math.random() - 0.5) * shake,
                    y: p.location.y,
                    z: p.location.z + (Math.random() - 0.5) * shake,
                });

                if (this.tick % 6 === 0) {
                    p.dimension.playSound("random.explode", p.location, { volume: 2.0, pitch: 0.1 + Math.random() * 0.2 });
                    p.dimension.playSound("ambient.weather.thunder", p.location, { volume: 2.5, pitch: 0.2 });
                }
            }
        }

        // ── PHASE IV: DEVOURER CONGRATULATIONS (ticks 130-175) ──
        for (let i = 0; i < DEVOURER_LINES.length; i++) {
            if (this.tick === 130 + i * 3) {
                broadcast(DEVOURER_LINES[i]);
                // Explosion burst with each message
                if (DEVOURER_LINES[i].includes("[") && this.tick % 2 === 0) {
                    for (const p of this.affectedPlayers) {
                        if (!p.isValid) continue;
                        p.dimension.playSound("random.explode", p.location, { volume: 1.0, pitch: 0.5 + Math.random() * 0.5 });
                        try {
                            p.dimension.spawnParticle("minecraft:huge_explosion_emitter", {
                                x: p.location.x + (Math.random() - 0.5) * 15,
                                y: p.location.y + Math.random() * 8,
                                z: p.location.z + (Math.random() - 0.5) * 15,
                            });
                        } catch {}
                    }
                }
            }
        }

        // ── PHASE V: ANNIHILATION (ticks 180-200) — White flash ─
        if (this.tick === 180) {
            for (const p of this.affectedPlayers) {
                p.onScreenDisplay.setTitle("§f§l.", {
                    fadeInDuration: 2, stayDuration: 30, fadeOutDuration: 10,
                });
                p.addEffect("blindness", 80, { amplifier: 255, showParticles: false });
                p.addEffect("nausea", 80, { amplifier: 3, showParticles: false });
                p.dimension.playSound("beacon.activate", p.location, { volume: 5.0, pitch: 2.0 });
            }
            broadcast(`§8§l[§4§l✦§8§l] §f${this.dimColor}${this.dimName} §fhas been §4§lerased from existence§f.`);
        }

        // ── PHASE VI: VOID TELEPORT (tick 200) ──────────────────
        if (this.tick === 200) {
            setDimensionDestroyed(this.dimId, true);

            const fallback = findFallbackDimension(this.dimId);
            for (const p of this.affectedPlayers) {
                if (!p.isValid) continue;
                try {
                    if (fallback) {
                        const targetDim = world.getDimension(fallback.id);
                        p.teleport({ x: 0, y: 100, z: 0 }, { dimension: targetDim });
                    }
                    p.addEffect("slow_falling", 200, { amplifier: 0, showParticles: false });
                    p.addEffect("resistance", 200, { amplifier: 4, showParticles: false });
                } catch {}
            }
        }

        // ── PHASE VII: AFTERMATH POETRY (ticks 210-250) ─────────
        for (let i = 0; i < AFTERMATH_LINES.length; i++) {
            if (this.tick === 210 + i * 4) broadcast(AFTERMATH_LINES[i]);
        }

        if (this.tick === 215) {
            for (const p of world.getAllPlayers()) {
                if (!p.isValid) continue;
                p.onScreenDisplay.setTitle("§7§oThis world has been erased from existence.", {
                    fadeInDuration: 20, stayDuration: 60, fadeOutDuration: 20,
                });
                p.dimension.playSound("beacon.deactivate", p.location, { volume: 2.0, pitch: 0.5 });
            }
        }

        // ── NAVIGATOR (tick 260) ────────────────────────────────
        if (this.tick === 260) {
            for (const p of this.affectedPlayers) {
                if (p.isValid) {
                    system.runTimeout(() => {
                        if (p.isValid) showDimensionNavigator(p);
                    }, 20);
                }
            }
            system.clearRun(this.interval);
        }
    }
}

// ── Destroyed Dimension Guard (tick loop) ───────────────────────────

export function initDestroyedDimensionGuard(): void {
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            if (!player.isValid) continue;
            const dimId = player.dimension.id;
            if (isDimensionDestroyed(dimId)) {
                const fallback = findFallbackDimension(dimId);
                if (fallback) {
                    try {
                        const targetDim = world.getDimension(fallback.id);
                        player.teleport({ x: 0, y: 100, z: 0 }, { dimension: targetDim });
                        player.sendMessage(`§4§l⚠ §c${dimId} §4no longer exists. §7You have been redirected.`);
                        system.runTimeout(() => {
                            if (player.isValid) showDimensionNavigator(player);
                        }, 40);
                    } catch {}
                }
            }
        }
    }, 20);
}

// ── Realm Registration ──────────────────────────────────────────────

export function registerRealmDimensions(registry: { registerCustomDimension(id: string): void }): void {
    for (let i = 0; i < REALM_COUNT; i++) {
        try {
            registry.registerCustomDimension(`${REALM_PREFIX}${i}`);
        } catch {
            // Already registered on reload
        }
    }
}

// ── Command Registration ────────────────────────────────────────────

export function registerDestructionCommands(registry: CustomCommandRegistry): void {

    // /gaiadimension:obliterate <dimension>
    registry.registerCommand({
        name: "gaiadimension:obliterate",
        description: "Obliterate an entire dimension from existence.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [
            { name: "dimension", type: CustomCommandParamType.String }
        ]
    }, (origin: CommandOrigin, dimension?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            if (!dimension) {
                player.sendMessage("§cUsage: /gaiadimension:obliterate <overworld|nether|the_end|gaia>");
                return;
            }

            const dimMap: Record<string, DimEntry> = {};
            for (const d of CORE_DIMENSIONS) {
                const short = d.id.split(":")[1] || d.id;
                dimMap[short] = d;
                dimMap[d.id] = d;
            }
            // Common aliases
            dimMap["gaia"] = CORE_DIMENSIONS[3];
            dimMap["end"] = CORE_DIMENSIONS[2];

            const target = dimMap[dimension.toLowerCase()];
            if (!target) {
                player.sendMessage(`§cUnknown dimension '${dimension}'. Valid: overworld, nether, the_end, gaia`);
                return;
            }

            if (isDimensionDestroyed(target.id)) {
                player.sendMessage(`§7${target.color}${target.name} §7has already been obliterated.`);
                return;
            }

            // Check that at least one dimension will remain
            const aliveAfter = getAliveDimensions().filter(d => d.id !== target.id);
            if (aliveAfter.length === 0) {
                player.sendMessage("§c§lCannot obliterate the last remaining dimension.");
                return;
            }

            player.sendMessage(`§4§lInitiating dimensional collapse of ${target.color}${target.name}§4§l...`);
            const sequencer = new DestructionSequencer(player, target.id, target.name, target.color);
            sequencer.start();
        });

        return { status: 0 };
    });

    // /gaiadimension:dimensions — opens the navigator
    registry.registerCommand({
        name: "gaiadimension:dimensions",
        description: "Open the Dimensional Navigator to traverse between worlds.",
        permissionLevel: CommandPermissionLevel.Any,
    }, (origin: CommandOrigin) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            showDimensionNavigator(player);
        });

        return { status: 0 };
    });

    // /gaiadimension:restore <dimension> — undo destruction
    registry.registerCommand({
        name: "gaiadimension:restore",
        description: "Restore a previously obliterated dimension.",
        permissionLevel: CommandPermissionLevel.Any,
        mandatoryParameters: [
            { name: "dimension", type: CustomCommandParamType.String }
        ]
    }, (origin: CommandOrigin, dimension?: string) => {
        const player = origin.sourceEntity;
        if (!(player instanceof Player)) return { status: 0 };

        system.run(() => {
            if (!dimension) {
                player.sendMessage("§cUsage: /gaiadimension:restore <overworld|nether|the_end|gaia>");
                return;
            }

            const dimMap: Record<string, DimEntry> = {};
            for (const d of CORE_DIMENSIONS) {
                const short = d.id.split(":")[1] || d.id;
                dimMap[short] = d;
                dimMap[d.id] = d;
            }
            dimMap["gaia"] = CORE_DIMENSIONS[3];
            dimMap["end"] = CORE_DIMENSIONS[2];

            const target = dimMap[dimension.toLowerCase()];
            if (!target) {
                player.sendMessage(`§cUnknown dimension '${dimension}'.`);
                return;
            }

            if (!isDimensionDestroyed(target.id)) {
                player.sendMessage(`§7${target.color}${target.name} §7is not destroyed.`);
                return;
            }

            setDimensionDestroyed(target.id, false);
            for (const p of world.getAllPlayers()) {
                p.sendMessage(`§a§l✦ ${target.color}${target.name} §a§lhas been restored!`);
                p.dimension.playSound("random.levelup", p.location, { volume: 1.0, pitch: 1.5 });
            }
        });

        return { status: 0 };
    });
}
