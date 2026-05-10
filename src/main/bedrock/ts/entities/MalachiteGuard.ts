import { world, system, Entity, Player, EquipmentSlot, GameMode, EntityComponentTypes, EntityDamageCause, EntityHealthComponent, EntityMarkVariantComponent, EntityEquippableComponent, Dimension } from "@minecraft/server";

// ─── Enums & Types ───────────────────────────────────────────────────
enum GuardPhase {
    Defence = 0,
    Attack = 1,
    Resist = 2
}

enum GuardAnimState {
    Default = 0, // idle + walk
    StompWindup = 1, // raising leg
    ChargeCrouch = 2, // crouching + shaking (bide)
    StompExecute = 3, // slam impact
    BlastExecute = 4 // arms spread, explosion
}

interface DroneOffset {
    readonly x: number;
    readonly z: number;
}

// ─── Constants ───────────────────────────────────────────────────────
const GUARD_ID: string = "gaiadimension:malachite_guard";
const DRONE_ID: string = "gaiadimension:malachite_drone";
const BATON_ID: string = "gaiadimension:malachite_guard_baton";

// Timing (ticks)
const STOMP_WINDUP_TICKS: number = 20;
const STOMP_COOLDOWN: number = 120;
const CHARGE_DURATION: number = 100;
const CHARGE_COOLDOWN: number = 60;
const BLAST_LINGER: number = 20;

// Drone spawn offsets (fixed 4 drones — difficulty-agnostic for Bedrock)
const DRONE_OFFSETS: DroneOffset[] = [
    { x:  2, z:  1 },
    { x:  2, z: -1 },
    { x: -2, z:  1 },
    { x: -2, z: -1 }
];

// Dynamic property keys
const P = {
    GUARD_ID:        "gd:guard_id",
    PHASE:           "gd:phase",
    STOMP_COOLDOWN:  "gd:stomp_cd",
    CHARGE_COOLDOWN: "gd:charge_cd",
    STOMP_TIMER:     "gd:stomp_t",
    CHARGE_TIMER:    "gd:charge_t",
    BLAST_TIMER:     "gd:blast_t",
    BIDE_DAMAGE:     "gd:bide_dmg",
    HAS_DRONES:      "gd:has_drones",
    DRONES_SPAWNED:  "gd:drones_spawned",
    PARENT_ID:       "gd:parent_id"
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────
function getNum(e: Entity, key: string, def: number = 0): number {
    return (e.getDynamicProperty(key) as number) ?? def;
}
function setNum(e: Entity, key: string, v: number): void {
    e.setDynamicProperty(key, v);
}
function getBool(e: Entity, key: string, def: boolean = false): boolean {
    return (e.getDynamicProperty(key) as boolean) ?? def;
}
function setBool(e: Entity, key: string, v: boolean): void {
    e.setDynamicProperty(key, v);
}
function getStr(e: Entity, key: string, def: string = ""): string {
    return (e.getDynamicProperty(key) as string) ?? def;
}

function setAnimState(guard: Entity, state: GuardAnimState): void {
    try {
        const mv = guard.getComponent(EntityComponentTypes.MarkVariant) as EntityMarkVariantComponent;
        if (mv) mv.value = state;
    } catch {}
}

function distSq(a: Entity, b: Entity): number {
    const al = a.location, bl = b.location;
    const dx = al.x - bl.x, dy = al.y - bl.y, dz = al.z - bl.z;
    return dx*dx + dy*dy + dz*dz;
}

function isValidPlayer(e: Entity): e is Player {
    if (!(e instanceof Player)) return false;
    try {
        const gm = (e as Player).getGameMode();
        return gm !== GameMode.creative && gm !== GameMode.spectator;
    } catch { return false; }
}

// ─── Damage multiplier curve (Java getMultiplier) ────────────────────
// Easy difficulty approximation (we use a single curve since Bedrock doesn't expose difficulty cleanly)
function getDamageMultiplier(baseDmg: number): number {
    if (baseDmg > 100) return 0.0;
    if (baseDmg > 50)  return 0.125;
    if (baseDmg > 25)  return 0.25;
    if (baseDmg > 10)  return 0.5;
    return 1.0;
}

// ─── Main System ─────────────────────────────────────────────────────
class MalachiteGuardSystem {
    constructor() {
        this.init();
    }

    private init(): void {
        // ── Setup new guards on spawn ──
        world.afterEvents.entitySpawn.subscribe((event) => {
            const { entity } = event;
            if (entity.typeId === GUARD_ID) {
                this.setupGuard(entity);
            }
        });

        // ── Core tick loop (every 1 tick for precise timing) ──
        system.runInterval(() => {
            const overworld: Dimension = world.getDimension("overworld");
            const guards: Entity[] = overworld.getEntities({ type: GUARD_ID });
            for (const guard of guards) {
                if (!guard.isValid) continue;
                try { this.tickGuard(guard); } catch {}
            }
        }, 1);

        // ── Damage interception: phase-based damage routing ──
        world.afterEvents.entityHurt.subscribe((event) => {
            const { hurtEntity, damage, damageSource } = event;
            if (hurtEntity.typeId !== GUARD_ID || !hurtEntity.isValid) return;

            const phase: number = getNum(hurtEntity, P.PHASE, GuardPhase.Defence);
            const health = hurtEntity.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
            if (!health) return;

            const maxHp: number = health.effectiveMax;
            const curHp: number = health.currentValue;
            const attacker: Entity | undefined = damageSource.damagingEntity;

            // ── Bide accumulation during charge phase ──
            const chargeTimer: number = getNum(hurtEntity, P.CHARGE_TIMER, 0);
            if (chargeTimer > 0 && attacker && isValidPlayer(attacker)) {
                const bide: number = getNum(hurtEntity, P.BIDE_DAMAGE, 0);
                setNum(hurtEntity, P.BIDE_DAMAGE, bide + damage * 0.5);
            }

            // ── DEFENCE phase: damage is blocked natively by damage_sensor in "defend" component group ──
            // If we somehow still get a hurt event in defence, just ignore it
            if (phase === GuardPhase.Defence) {
                return;
            }

            // ── ATTACK phase: clamp HP to never drop below 50% - 2 ──
            if (phase === GuardPhase.Attack) {
                const threshold: number = (maxHp / 2.0) - 2.0;
                if (curHp < threshold) {
                    system.run(() => {
                        try {
                            if (hurtEntity.isValid && health) {
                                health.setCurrentValue(threshold);
                            }
                        } catch {}
                    });
                }
                return;
            }

            // ── RESIST phase: only player-sourced direct damage, with multiplier curve ──
            if (phase === GuardPhase.Resist) {
                if (!attacker || !isValidPlayer(attacker)) {
                    // Not a valid player hit — heal back
                    if (hurtEntity.location.y > -64) {
                        system.run(() => {
                            try {
                                if (hurtEntity.isValid && health) {
                                    health.setCurrentValue(Math.min(curHp + damage, maxHp));
                                }
                            } catch {}
                        });
                    }
                    return;
                }

                // Apply damage multiplier curve
                const mult: number = getDamageMultiplier(damage);
                if (mult < 1.0) {
                    const reduction: number = damage * (1.0 - mult);
                    system.run(() => {
                        try {
                            if (hurtEntity.isValid && health) {
                                health.setCurrentValue(Math.min(curHp + reduction, maxHp));
                            }
                        } catch {}
                    });
                }
            }
        });

        // ── Armor stripping + baton knockback on Guard melee hit ──
        world.afterEvents.entityHitEntity.subscribe((event) => {
            const { damagingEntity, hitEntity } = event;

            // ── Baton knockback ──
            if (damagingEntity instanceof Player && hitEntity.isValid) {
                try {
                    const equip = damagingEntity.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
                    const mainhand = equip?.getEquipment(EquipmentSlot.Mainhand);
                    if (mainhand?.typeId === BATON_ID) {
                        const yaw: number = damagingEntity.getRotation().y;
                        const rad: number = yaw * (Math.PI / 180);
                        const kbX: number = -Math.sin(rad) * 1.5;
                        const kbZ: number =  Math.cos(rad) * 1.5;
                        hitEntity.applyKnockback(kbX, kbZ, 1.5, 0.4);
                    }
                } catch {}
            }

            // ── Guard strips player armor ──
            if (damagingEntity.typeId === GUARD_ID && hitEntity instanceof Player) {
                if (!hitEntity.isValid) return;

                // 1 in 12 chance (between Java's Normal 1/16 and Hard 1/8)
                if (Math.random() > (1 / 12)) return;

                try {
                    const equip = hitEntity.getComponent(EntityComponentTypes.Equippable) as EntityEquippableComponent;
                    if (!equip) return;

                    const slots: EquipmentSlot[] = [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];
                    const slot: EquipmentSlot = slots[Math.floor(Math.random() * slots.length)];
                    const item = equip.getEquipment(slot);

                    if (item) {
                        // Drop the item and clear the slot
                        const dim: Dimension = hitEntity.dimension;
                        const loc = hitEntity.location;
                        system.run(() => {
                            try {
                                dim.spawnItem(item, { x: loc.x, y: loc.y + 0.5, z: loc.z });
                                equip.setEquipment(slot, undefined);
                                hitEntity.playSound("random.break");
                            } catch {}
                        });
                    }
                } catch {}
            }
        });

        // ── Drone death → notify guard ──
        world.afterEvents.entityDie.subscribe((event) => {
            const { deadEntity } = event;
            if (deadEntity.typeId !== DRONE_ID) return;

            const parentId: string = getStr(deadEntity, P.PARENT_ID);
            if (!parentId) return;

            // Find the parent guard and re-check drone count
            // (handled automatically in tickGuard via tag query)
        });
    }

    // ────────────────────────────────────────────────────────────────────
    // Setup
    // ────────────────────────────────────────────────────────────────────
    private setupGuard(guard: Entity): void {
        const guardId: string = `mg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        guard.setDynamicProperty(P.GUARD_ID, guardId);
        setNum(guard, P.PHASE, GuardPhase.Defence);
        setNum(guard, P.STOMP_COOLDOWN, 0);
        setNum(guard, P.CHARGE_COOLDOWN, 0);
        setNum(guard, P.STOMP_TIMER, 0);
        setNum(guard, P.CHARGE_TIMER, 0);
        setNum(guard, P.BLAST_TIMER, 0);
        setNum(guard, P.BIDE_DAMAGE, 0);
        setBool(guard, P.HAS_DRONES, true);
        setBool(guard, P.DRONES_SPAWNED, false);

        system.run(() => {
            if (!guard.isValid) return;
            try {
                guard.triggerEvent("mg_defend");
                setAnimState(guard, GuardAnimState.Default);
            } catch {}
        });
    }

    // ────────────────────────────────────────────────────────────────────
    // Per-tick guard logic
    // ────────────────────────────────────────────────────────────────────
    private tickGuard(guard: Entity): void {
        const phase: number = getNum(guard, P.PHASE, GuardPhase.Defence);
        const guardId: string = getStr(guard, P.GUARD_ID);
        if (!guardId) return;

        const health = guard.getComponent(EntityComponentTypes.Health) as EntityHealthComponent;
        if (!health) return;
        const maxHp: number = health.effectiveMax;
        const curHp: number = health.currentValue;

        // ── PHASE STATE MACHINE ──
        switch (phase) {
            case GuardPhase.Defence:
                this.tickDefencePhase(guard, guardId, curHp, maxHp);
                break;
            case GuardPhase.Attack:
                this.tickAttackPhase(guard, guardId, curHp, maxHp);
                break;
            case GuardPhase.Resist:
                this.tickResistPhase(guard, guardId, curHp, maxHp);
                break;
        }

        // ── COOLDOWN TICKING ──
        const stompCd: number = getNum(guard, P.STOMP_COOLDOWN, 0);
        if (stompCd > 0) setNum(guard, P.STOMP_COOLDOWN, stompCd - 1);

        const chargeCd: number = getNum(guard, P.CHARGE_COOLDOWN, 0);
        if (chargeCd > 0) setNum(guard, P.CHARGE_COOLDOWN, chargeCd - 1);

        // ── STOMP ATTACK TICK ──
        this.tickStomp(guard);

        // ── BLAST ATTACK TICK ──
        this.tickBlast(guard);
    }

    // ────────────────────────────────────────────────────────────────────
    // DEFENCE phase: immobile, spawn drones, wait for drones to die
    // ────────────────────────────────────────────────────────────────────
    private tickDefencePhase(guard: Entity, guardId: string, curHp: number, maxHp: number): void {
        // Spawn drones if not yet done
        if (!getBool(guard, P.DRONES_SPAWNED, false)) {
            this.spawnDrones(guard, guardId);
            setBool(guard, P.DRONES_SPAWNED, true);
        }

        // Check if all drones are dead
        const drones: Entity[] = guard.dimension.getEntities({
            type: DRONE_ID,
            tags: [`mg_parent:${guardId}`],
            location: guard.location,
            maxDistance: 200
        });

        if (drones.length <= 0 && getBool(guard, P.DRONES_SPAWNED, false)) {
            // All drones dead → transition to ATTACK
            setNum(guard, P.PHASE, GuardPhase.Attack);
            setBool(guard, P.HAS_DRONES, false);
            guard.triggerEvent("no_mg_defend");
            setAnimState(guard, GuardAnimState.Default);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // ATTACK phase: normal combat, transition to RESIST at <= 50% HP
    // ────────────────────────────────────────────────────────────────────
    private tickAttackPhase(guard: Entity, guardId: string, curHp: number, maxHp: number): void {
        if (curHp <= maxHp / 2) {
            setNum(guard, P.PHASE, GuardPhase.Resist);
            guard.triggerEvent("mg_resist");
        }

        // Check for stomp/blast opportunities
        this.checkAttackOpportunities(guard);
    }

    // ────────────────────────────────────────────────────────────────────
    // RESIST phase: enraged, restricted damage, slower. Revert to ATTACK if healed > 50%
    // ────────────────────────────────────────────────────────────────────
    private tickResistPhase(guard: Entity, guardId: string, curHp: number, maxHp: number): void {
        if (curHp > maxHp / 2) {
            setNum(guard, P.PHASE, GuardPhase.Attack);
            guard.triggerEvent("no_mg_resist");
        }

        // Check for stomp/blast opportunities
        this.checkAttackOpportunities(guard);
    }

    // ────────────────────────────────────────────────────────────────────
    // Drone spawning
    // ────────────────────────────────────────────────────────────────────
    private spawnDrones(guard: Entity, guardId: string): void {
        const dim: Dimension = guard.dimension;
        const loc = guard.location;

        for (const offset of DRONE_OFFSETS) {
            try {
                const drone: Entity = dim.spawnEntity(DRONE_ID, {
                    x: loc.x + offset.x,
                    y: loc.y + 1,
                    z: loc.z + offset.z
                });
                drone.addTag(`mg_parent:${guardId}`);
                drone.setDynamicProperty(P.PARENT_ID, guardId);
            } catch {}
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // Opportunity detection for stomp and blast attacks
    // ────────────────────────────────────────────────────────────────────
    private checkAttackOpportunities(guard: Entity): void {
        const phase: number = getNum(guard, P.PHASE);
        if (phase === GuardPhase.Defence) return; // Can't attack in defence

        const stompTimer: number = getNum(guard, P.STOMP_TIMER, 0);
        const chargeTimer: number = getNum(guard, P.CHARGE_TIMER, 0);
        const blastTimer: number = getNum(guard, P.BLAST_TIMER, 0);

        // Don't start new attacks if one is already active
        if (stompTimer > 0 || chargeTimer > 0 || blastTimer > 0) return;

        const gl = guard.location;

        // Get nearby valid players
        const nearbyPlayers: Player[] = guard.dimension.getEntities({
            type: "minecraft:player",
            location: gl,
            maxDistance: 6
        }).filter((e: Entity): e is Player => isValidPlayer(e));

        if (nearbyPlayers.length === 0) return;

        // ── BLAST check: player is above or below the guard (Y diff > 1) ──
        const chargeCd: number = getNum(guard, P.CHARGE_COOLDOWN, 0);
        const stompCd: number = getNum(guard, P.STOMP_COOLDOWN, 0);

        if (chargeCd <= 0) {
            for (const player of nearbyPlayers) {
                const yDiff: number = player.location.y - gl.y;
                if (Math.abs(yDiff) > 1.0) {
                    // Start blast charge
                    this.startBlastAttack(guard);
                    return;
                }
            }
        }

        // ── STOMP check: player on ground, within 2-4 blocks horizontal ──
        if (stompCd <= 0) {
            for (const player of nearbyPlayers) {
                const dSq: number = distSq(guard, player);
                if (dSq > 1.0 && dSq < 16.0 && player.isOnGround) {
                    this.startStompAttack(guard);
                    return;
                }
            }
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // STOMP ATTACK — Java StompAttackGoal port
    // ────────────────────────────────────────────────────────────────────
    private startStompAttack(guard: Entity): void {
        setNum(guard, P.STOMP_TIMER, STOMP_WINDUP_TICKS);
        guard.triggerEvent("mg_stomp_start");
        setAnimState(guard, GuardAnimState.StompWindup);
    }

    private tickStomp(guard: Entity): void {
        const timer: number = getNum(guard, P.STOMP_TIMER, 0);
        if (timer <= 0) return;

        const newTimer: number = timer - 1;
        setNum(guard, P.STOMP_TIMER, newTimer);

        // ── Execute stomp at timer == 0 ──
        if (newTimer <= 0) {
            setAnimState(guard, GuardAnimState.StompExecute);

            const gl = guard.location;
            const dim: Dimension = guard.dimension;

            // Damage + launch all non-malachite entities in 3-block radius
            const targets: Entity[] = dim.getEntities({
                location: gl,
                maxDistance: 3.5
            }).filter((e: Entity) => e.id !== guard.id && e.typeId !== DRONE_ID && e.typeId !== GUARD_ID);

            // Play stomp sound
            try { dim.playSound("mob.ravager.stomp", gl); } catch {}

            for (const target of targets) {
                try {
                    target.applyDamage(5, { cause: EntityDamageCause.EntityAttack, damagingEntity: guard });
                    target.applyKnockback(0, 0, 0, 0.6); // Vertical launch
                } catch {}
            }

            // Block particle effects (Java: 7x7 grid of block crack particles)
            try {
                dim.runCommand(`particle minecraft:terrain_explosion ${gl.x} ${gl.y} ${gl.z}`);
            } catch {}

            // Start cooldown after a short linger
            system.runTimeout(() => {
                if (!guard.isValid) return;
                setNum(guard, P.STOMP_COOLDOWN, STOMP_COOLDOWN);
                guard.triggerEvent("mg_stomp_end");
                setAnimState(guard, GuardAnimState.Default);
            }, 10);
        }
    }

    // ────────────────────────────────────────────────────────────────────
    // BLAST ATTACK (BIDE) — Java BlastAttackGoal port
    // ────────────────────────────────────────────────────────────────────
    private startBlastAttack(guard: Entity): void {
        setNum(guard, P.CHARGE_TIMER, CHARGE_DURATION);
        setNum(guard, P.BIDE_DAMAGE, 0);
        guard.triggerEvent("mg_charge_start");
        setAnimState(guard, GuardAnimState.ChargeCrouch);
    }

    private tickBlast(guard: Entity): void {
        const chargeTimer: number = getNum(guard, P.CHARGE_TIMER, 0);
        const blastTimer: number = getNum(guard, P.BLAST_TIMER, 0);

        // ── Charging phase ──
        if (chargeTimer > 0) {
            const newCharge: number = chargeTimer - 1;
            setNum(guard, P.CHARGE_TIMER, newCharge);

            // Charge particles (Java: 3 malachite_magic particles per tick during charge)
            if (newCharge % 3 === 0) {
                try {
                    const gl = guard.location;
                    guard.dimension.spawnParticle("gaiadimension:malachite_magic", {
                        x: gl.x + (Math.random() - 0.5) * 6,
                        y: gl.y + Math.random() * 0.25,
                        z: gl.z + (Math.random() - 0.5) * 6
                    });
                } catch {}
            }

            // ── Charge complete → EXECUTE ──
            if (newCharge <= 0) {
                setAnimState(guard, GuardAnimState.BlastExecute);
                setNum(guard, P.BLAST_TIMER, BLAST_LINGER);

                const gl = guard.location;
                const dim: Dimension = guard.dimension;
                const bideDmg: number = getNum(guard, P.BIDE_DAMAGE, 0);

                // Damage all non-malachite entities in 4-block radius
                const targets: Entity[] = dim.getEntities({
                    location: gl,
                    maxDistance: 4.5
                }).filter((e: Entity) => e.id !== guard.id && e.typeId !== DRONE_ID && e.typeId !== GUARD_ID);

                // Blast sound
                try { dim.playSound("random.explode", gl, { volume: 1.5, pitch: 0.7 }); } catch {}

                for (const target of targets) {
                    try {
                        // Java: 8.0F + bideDamage
                        target.applyDamage(8 + bideDmg, { cause: EntityDamageCause.EntityAttack, damagingEntity: guard });

                        // Directional knockback away from guard
                        const dx: number = target.location.x - gl.x;
                        const dz: number = target.location.z - gl.z;
                        const dist: number = Math.sqrt(dx*dx + dz*dz) || 1;
                        target.applyKnockback(dx / dist, dz / dist, 2.0, 0.3);
                    } catch {}
                }
            }
            return;
        }

        // ── Blast lingering / particle phase ──
        if (blastTimer > 0) {
            const newBlast: number = blastTimer - 1;
            setNum(guard, P.BLAST_TIMER, newBlast);

            // Explosion particles during linger
            if (newBlast % 2 === 0) {
                try {
                    const gl = guard.location;
                    for (let i = 0; i < 5; i++) {
                        guard.dimension.spawnParticle("gaiadimension:malachite_magic", {
                            x: gl.x + (Math.random() - 0.5) * 2,
                            y: gl.y + Math.random() * 3,
                            z: gl.z + (Math.random() - 0.5) * 2
                        });
                    }
                } catch {}
            }

            if (newBlast <= 0) {
                // Done — start cooldown
                setNum(guard, P.CHARGE_COOLDOWN, CHARGE_COOLDOWN);
                setNum(guard, P.BIDE_DAMAGE, 0);
                guard.triggerEvent("mg_charge_end");
                setAnimState(guard, GuardAnimState.Default);
            }
        }
    }
}

export const malachiteGuardSystem: MalachiteGuardSystem = new MalachiteGuardSystem();
