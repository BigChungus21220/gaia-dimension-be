import { world, system, Block, BlockPermutation, Entity, Dimension, Player, ItemComponentUseEvent, ItemComponentRegistry, Vector3, EntityProjectileComponent } from "@minecraft/server";

export enum Element {
    PHYSICAL = 0,
    FIRE = 1,
    ELECTRIC = 2,
    POISON = 3,
    FROST = 4,
    MAGIC = 5,
    ENERGY = 6
}

export enum Behavior {
    BASIC = 0,
    BLAST = 1,
    BURST = 2,
    LINGER = 3,
    RICOCHET = 4,
    SCATTER = 5
}

// ── Force Staff Rigid-Body Physics ──────────────────────────────────

interface ForceChild {
    entity: Entity;
    relPos: Vector3;
    blockTypeId: string;
}

interface ForceContraption {
    center: Vector3;
    velocity: Vector3;
    angularVel: Vector3;
    rotation: Vector3;
    children: ForceChild[];
    dimension: Dimension;
    state: 'held' | 'thrown';
    holderId: string;
    tickCallback: number;
    rotHistory: { x: number; y: number }[];
}

const activeContraptions = new Map<string, ForceContraption>();

// ── Rotation Math (Y then X — standard right-hand rotation matrices) ──

function applyRotation(p: Vector3, r: Vector3): Vector3 {
    // Match Bedrock animation bone rotation order: X first, then Y (XYZ intrinsic)
    // Rx(φ) = [[1, 0, 0], [0, cosφ, -sinφ], [0, sinφ, cosφ]]
    const cx = Math.cos(r.x), sx = Math.sin(r.x);
    const x1 = p.x;
    const y1 = p.y * cx - p.z * sx;
    const z1 = p.y * sx + p.z * cx;

    // Ry(θ) — negated for Bedrock left-handed coords (east/west flipped)
    const cy = Math.cos(r.y), sy = Math.sin(r.y);
    const x2 = x1 * cy - z1 * sy;
    const y2 = y1;
    const z2 = x1 * sy + z1 * cy;

    return { x: x2, y: y2, z: z2 };
}

// ── Separated-Axis Collision ────────────────────────────────────────
// Tests each axis independently. Only bounces on the colliding axis,
// preventing the "stuck in surface" infinite-bounce loop.

function isSolid(dim: Dimension, x: number, y: number, z: number): boolean {
    const b = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    return !!b && !b.isAir && !b.isLiquid;
}

// ── Physics Tick ────────────────────────────────────────────────────

function physicsTick(c: ForceContraption): void {
    // Gravity
    c.velocity.y -= 0.04;

    // Air drag
    c.velocity.x *= 0.99;
    c.velocity.y *= 0.99;
    c.velocity.z *= 0.99;

    // ── Separated-axis collision ──
    // X axis
    const nx = c.center.x + c.velocity.x;
    if (isSolid(c.dimension, nx, c.center.y, c.center.z)) {
        c.angularVel.y += c.velocity.x * 0.15;
        c.velocity.x *= -0.45;
    } else {
        c.center.x = nx;
    }

    // Y axis
    const ny = c.center.y + c.velocity.y;
    if (isSolid(c.dimension, c.center.x, ny, c.center.z)) {
        // GMod-style: ground hit generates strong tumble from horizontal velocity
        c.angularVel.x += c.velocity.z * 0.12;
        c.angularVel.y += c.velocity.x * 0.12;
        c.velocity.y *= -0.45;
        // Push out of ground — snap to top of collision block
        if (c.velocity.y > 0) {
            // Was falling, bounced up — place on top of solid block
            c.center.y = Math.floor(ny) + 1.01;
        }
    } else {
        c.center.y = ny;
    }

    // Z axis
    const nz = c.center.z + c.velocity.z;
    if (isSolid(c.dimension, c.center.x, c.center.y, nz)) {
        c.angularVel.y -= c.velocity.z * 0.15;
        c.velocity.z *= -0.45;
    } else {
        c.center.z = nz;
    }

    // Floor clamp
    if (c.center.y < -64) { c.center.y = -64; c.velocity.y = 0; }

    const maxAng = 0.5;

    c.angularVel.x = Math.max(-maxAng, Math.min(maxAng, c.angularVel.x));
    c.angularVel.y = Math.max(-maxAng, Math.min(maxAng, c.angularVel.y));

    // Update rotation + normalize to [-π, π] to prevent overflow
    c.rotation.x += c.angularVel.x;
    c.rotation.y += c.angularVel.y;
    const PI2 = Math.PI * 2;
    c.rotation.x = ((c.rotation.x % PI2) + PI2 + Math.PI) % PI2 - Math.PI;
    c.rotation.y = ((c.rotation.y % PI2) + PI2 + Math.PI) % PI2 - Math.PI;

    // Angular drag
    c.angularVel.x *= 0.96;
    c.angularVel.y *= 0.96;

    // ── Contraption: ALL movement via properties (100% sync) ──
    // Animation computes both rotation AND orbital position from properties
    const SCALE = 10000000;
    const toScaled = (rad: number) => {
        let d = (rad * 180 / Math.PI) % 360;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return Math.round(d * SCALE);
    };
    const pitchS = Math.max(-1800000000, Math.min(1800000000, toScaled(c.rotation.x)));
    const yawS = Math.max(-1800000000, Math.min(1800000000, toScaled(c.rotation.y)));

    for (const child of c.children) {
        if (!child.entity.isValid) continue;
        // ALL blocks go to center — animation handles the orbital offset
        child.entity.teleport({
            x: c.center.x,
            y: c.center.y,
            z: c.center.z
        });
        child.entity.setProperty("gaiadimension:tumble_a", pitchS);
        child.entity.setProperty("gaiadimension:tumble_b", yawS);
    }

    // Rest detection
    const speed = Math.sqrt(c.velocity.x ** 2 + c.velocity.y ** 2 + c.velocity.z ** 2);
    const angSpeed = Math.sqrt(c.angularVel.x ** 2 + c.angularVel.y ** 2);
    if (speed < 0.005 && angSpeed < 0.005) {
        c.velocity = { x: 0, y: 0, z: 0 };
        c.angularVel = { x: 0, y: 0, z: 0 };
    }
}

// ── Staff Component Registration ────────────────────────────────────

export function registerMagicStaffComponent({ itemComponentRegistry }: { itemComponentRegistry: ItemComponentRegistry }): void {
    itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
        onUse: (event: ItemComponentUseEvent) => {
            const { source: player, itemStack } = event;
            if (!(player instanceof Player) || !itemStack) return;

            const idParts = itemStack.typeId.split('_');
            if (idParts.length < 4) return;

            const elementStr = idParts[2];
            const behaviorStr = idParts[3];

            const elementMap: Record<string, Element> = {
                "physical": Element.PHYSICAL,
                "fire": Element.FIRE,
                "electric": Element.ELECTRIC,
                "poison": Element.POISON,
                "frost": Element.FROST,
                "magic": Element.MAGIC,
                "energy": Element.ENERGY
            };

            const behaviorMap: Record<string, Behavior> = {
                "basic": Behavior.BASIC,
                "blast": Behavior.BLAST,
                "burst": Behavior.BURST,
                "linger": Behavior.LINGER,
                "ricochet": Behavior.RICOCHET,
                "scatter": Behavior.SCATTER
            };

            const element = elementMap[elementStr] ?? Element.PHYSICAL;
            const behavior = behaviorMap[behaviorStr] ?? Behavior.BASIC;
            const stat = idParts[4];

            if (stat === 'force') {
                if (player.isSneaking) {
                    handleForceGrab(player);
                    return;
                } else if (activeContraptions.has(player.id)) {
                    handleForceThrow(player);
                    return;
                }
            }

            const viewDir = player.getViewDirection();
            const spawnLoc: Vector3 = {
                x: player.location.x + viewDir.x * 1.5,
                y: player.getHeadLocation().y + viewDir.y * 1.5,
                z: player.location.z + viewDir.z * 1.5
            };

            if (behavior === Behavior.SCATTER) {
                for (let i = -1; i <= 1; i++) {
                    const angle = i * 0.2;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const scatterDir: Vector3 = {
                        x: viewDir.x * cos - viewDir.z * sin,
                        y: viewDir.y,
                        z: viewDir.x * sin + viewDir.z * cos
                    };
                    spawnProjectile(player, spawnLoc, scatterDir, element, behavior);
                }
            } else {
                spawnProjectile(player, spawnLoc, viewDir, element, behavior);
            }

            player.dimension.playSound("random.bow", player.location, { pitch: 0.5 });
        }
    });
}

function spawnProjectile(player: Player, location: Vector3, direction: Vector3, element: Element, behavior: Behavior): void {
    const projectile = player.dimension.spawnEntity("gaiadimension:staff_projectile", location);
    projectile.setProperty("gaiadimension:element", element);
    projectile.setProperty("gaiadimension:behavior", behavior);
    const projectileComp = projectile.getComponent("minecraft:projectile") as EntityProjectileComponent;
    if (projectileComp) {
        projectileComp.shoot(direction);
    }
}

// ── Force Grab ──────────────────────────────────────────────────────

function handleForceGrab(player: Player): void {
    if (activeContraptions.has(player.id)) return;

    // 1) Try to re-grab a nearby thrown contraption
    for (const [key, c] of activeContraptions) {
        if (c.state !== 'thrown') continue;
        const dx = player.location.x - c.center.x;
        const dy = player.location.y - c.center.y;
        const dz = player.location.z - c.center.z;
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 8) {
            activeContraptions.delete(key);
            c.state = 'held';
            c.holderId = player.id;
            c.velocity = { x: 0, y: 0, z: 0 };
            c.angularVel = { x: 0, y: 0, z: 0 };
            c.rotation = { x: 0, y: 0, z: 0 };
            activeContraptions.set(player.id, c);
            player.dimension.playSound("random.orb", player.location);
            return;
        }
    }

    // 2) Scan blocks from view direction
    const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
    if (!blockHit) return;

    const center = blockHit.block.location;
    const children: ForceChild[] = [];

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const loc = { x: center.x + x, y: center.y + y, z: center.z + z };
                const block = player.dimension.getBlock(loc);
                if (block && !block.isAir && !block.isLiquid) {
                    const blockTypeId = block.typeId;
                    const entity = player.dimension.spawnEntity("gaiadimension:contraption", {
                        x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5
                    });
                    entity.setDynamicProperty("blockType", blockTypeId);
                    system.run(() => {
                        if (entity.isValid) {
                            entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${blockTypeId}`);
                        }
                    });
                    // Set grid position properties (used by animation for orbital offset)
                    entity.setProperty("gaiadimension:rel_x", x);
                    entity.setProperty("gaiadimension:rel_y", y);
                    entity.setProperty("gaiadimension:rel_z", z);
                    children.push({ entity, relPos: { x, y, z }, blockTypeId });
                    block.setType("minecraft:air");
                }
            }
        }
    }

    if (children.length === 0) return;

    const contraption: ForceContraption = {
        center: { x: center.x + 0.5, y: center.y, z: center.z + 0.5 },
        velocity: { x: 0, y: 0, z: 0 },
        angularVel: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        children,
        dimension: player.dimension,
        state: 'held',
        holderId: player.id,
        tickCallback: 0
    };

    const tickCallback = system.runInterval(() => {
        // Prune dead children
        contraption.children = contraption.children.filter(ch => ch.entity.isValid);
        if (contraption.children.length === 0) {
            system.clearRun(contraption.tickCallback);
            for (const [k, v] of activeContraptions) {
                if (v === contraption) { activeContraptions.delete(k); break; }
            }
            return;
        }

        if (contraption.state === 'held') {
            const holder = world.getEntity(contraption.holderId);
            if (!holder || !holder.isValid) {
                contraption.state = 'thrown';
                activeContraptions.delete(contraption.holderId);
                activeContraptions.set('thrown_' + Date.now(), contraption);
                return;
            }
            const p = holder as Player;
            const headLoc = p.getHeadLocation();
            const viewDir = p.getViewDirection();
            contraption.center = {
                x: headLoc.x + viewDir.x * 4,
                y: headLoc.y + viewDir.y * 4,
                z: headLoc.z + viewDir.z * 4
            };
            for (const child of contraption.children) {
                if (!child.entity.isValid) continue;
                child.entity.teleport({
                    x: contraption.center.x,
                    y: contraption.center.y,
                    z: contraption.center.z
                });
            }
        } else {
            physicsTick(contraption);
        }
    }, 1);

    contraption.tickCallback = tickCallback;
    activeContraptions.set(player.id, contraption);
    player.dimension.playSound("random.orb", player.location);
}

// ── Force Throw ─────────────────────────────────────────────────────

function handleForceThrow(player: Player): void {
    const contraption = activeContraptions.get(player.id);
    if (!contraption) return;

    activeContraptions.delete(player.id);
    contraption.state = 'thrown';

    const viewDir = player.getViewDirection();
    contraption.velocity = { x: viewDir.x * 1.8, y: viewDir.y * 1.8, z: viewDir.z * 1.8 };
    contraption.angularVel = {
        x: viewDir.z * 0.15,
        y: 0,
        z: -viewDir.x * 0.15
    };

    activeContraptions.set('thrown_' + Date.now(), contraption);
    player.dimension.playSound("random.explode", player.location, { volume: 0.3 });
}
