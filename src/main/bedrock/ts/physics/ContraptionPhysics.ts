import { world, system, Block, Dimension, Entity, Player, Vector3 } from "@minecraft/server";
import { resolveContraptionCollision } from "./ContraptionHitbox.js";

// ══════════════════════════════════════════════════════════════════════
//  ContraptionPhysics — GMod-style script-side physics.
//  Visual entities have NO engine physics (gravity/collision disabled).
//  Script drives: velocity, gravity, ground collision, angular velocity.
//  Animation system is UNTOUCHED — calibrated Molang handles visuals.
//  Hitbox is handled by separate ContraptionHitbox module.
// ══════════════════════════════════════════════════════════════════════

// ── Types ───────────────────────────────────────────────────────────

export interface ContraptionChild {
    entity: Entity;
    relPos: Vector3;
    blockTypeId: string;
}

export interface ContraptionConfig {
    entityType?: string;
    holdDistance?: number;
    throwForce?: number;
}

const DEFAULT_CONFIG: Required<ContraptionConfig> = {
    entityType: "gaiadimension:contraption",
    holdDistance: 4,
    throwForce: 1.8,
};

// ── Scanner ─────────────────────────────────────────────────────────

export class ContraptionScanner {
    private static readonly INVALID_BLOCKS = new Set([
        "minecraft:air", "minecraft:water", "minecraft:lava",
        "minecraft:flowing_water", "minecraft:flowing_lava",
    ]);

    static scan(startBlock: Block, dimension: Dimension, maxBlocks: number = 100000): Block[] {
        const queue: Block[] = [startBlock];
        const visited = new Set<string>();
        const result: Block[] = [];

        while (queue.length > 0 && result.length < maxBlocks) {
            const block = queue.shift()!;
            const key = `${block.location.x},${block.location.y},${block.location.z}`;
            if (visited.has(key)) continue;
            visited.add(key);
            if (!this.isValidBlock(block)) continue;
            result.push(block);

            const { x, y, z } = block.location;
            const offsets: Vector3[] = [
                { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
                { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
                { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
            ];
            for (const off of offsets) {
                const neighbor = dimension.getBlock({ x: x + off.x, y: y + off.y, z: z + off.z });
                if (neighbor) {
                    const nKey = `${neighbor.location.x},${neighbor.location.y},${neighbor.location.z}`;
                    if (!visited.has(nKey)) queue.push(neighbor);
                }
            }
        }
        return result;
    }

    static isValidBlock(block: Block): boolean {
        if (block.isAir || block.isLiquid) return false;
        if (this.INVALID_BLOCKS.has(block.typeId)) return false;
        const id = block.typeId;
        if (id.includes("slab") || id.includes("stair") || id.includes("fence") ||
            id.includes("wall") || id.includes("door") || id.includes("trapdoor") ||
            id.includes("sign") || id.includes("button") || id.includes("pressure_plate") ||
            id.includes("carpet") || id.includes("banner") || id.includes("torch") ||
            id.includes("lantern") || id.includes("chain") || id.includes("candle") ||
            id.includes("flower") || id.includes("sapling") || id.includes("mushroom") ||
            id.includes("skull") || id.includes("head") || id.includes("pot") ||
            id.includes("rail") || id.includes("lever") || id.includes("tripwire") ||
            id.includes("anvil") || id.includes("bell") || id.includes("cake") ||
            id.includes("bed") || id.includes("chest") || id.includes("barrel")) {
            return false;
        }
        return true;
    }
}

// ── World collision ─────────────────────────────────────────────────

function isSolid(dim: Dimension, x: number, y: number, z: number): boolean {
    try {
        const b = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
        return !!b && !b.isAir && !b.isLiquid;
    } catch { return false; }
}

/** Rotate a relative position by pitch (X) then yaw (Y) */
function rotateRel(rel: Vector3, pitch: number, yaw: number): Vector3 {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const y1 = rel.y * cp - rel.z * sp;
    const z1 = rel.y * sp + rel.z * cp;
    return {
        x: rel.x * cy - z1 * sy,
        y: y1,
        z: rel.x * sy + z1 * cy,
    };
}

// ── Physics constants ───────────────────────────────────────────────

const GRAVITY = 0.04;           // blocks/tick²
const LINEAR_DAMPING = 0.98;    // air friction
const ANGULAR_DAMPING = 0.96;   // spin friction
const BOUNCE = 0.3;             // ground bounce coefficient
const REST_THRESHOLD = 0.01;    // speed below this = resting

// ── GMod-style Contraption Body ─────────────────────────────────────

export class ContraptionBody {
    center: Vector3;
    rotation: Vector3;
    velocity: Vector3;
    angularVelocity: Vector3;
    children: ContraptionChild[];
    dimension: Dimension;
    state: "held" | "thrown" | "resting";
    holderId: string;
    tickCallback: number;
    config: Required<ContraptionConfig>;

    // Perf: dirty tracking
    private _lastPitchS: number = 0;
    private _lastYawS: number = 0;
    private _lastCenterX: number = 0;
    private _lastCenterY: number = 0;
    private _lastCenterZ: number = 0;
    private _restTicks: number = 0;

    private constructor(
        center: Vector3,
        children: ContraptionChild[],
        dimension: Dimension,
        config: Required<ContraptionConfig>
    ) {
        this.center = center;
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.children = children;
        this.dimension = dimension;
        this.state = "held";
        this.holderId = "";
        this.tickCallback = 0;
        this.config = config;
    }

    static assemble(
        blocks: Block[],
        pivot: Vector3,
        dimension: Dimension,
        config?: ContraptionConfig
    ): ContraptionBody {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const center = { x: pivot.x + 0.5, y: pivot.y, z: pivot.z + 0.5 };
        const children: ContraptionChild[] = [];
        const REL_SCALE = 1000;

        for (const block of blocks) {
            const relPos: Vector3 = {
                x: block.location.x - pivot.x,
                y: block.location.y - pivot.y,
                z: block.location.z - pivot.z,
            };
            const blockTypeId = block.typeId;

            const entity = dimension.spawnEntity(cfg.entityType, {
                x: center.x, y: center.y, z: center.z,
            });
            entity.setDynamicProperty("blockType", blockTypeId);
            system.run(() => {
                if (entity.isValid) {
                    entity.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${blockTypeId}`);
                }
            });
            entity.setProperty("gaiadimension:rel_x", Math.round(relPos.x * REL_SCALE));
            entity.setProperty("gaiadimension:rel_y", Math.round(relPos.y * REL_SCALE));
            entity.setProperty("gaiadimension:rel_z", Math.round(relPos.z * REL_SCALE));
            children.push({ entity, relPos, blockTypeId });
            block.setType("minecraft:air");
        }

        return new ContraptionBody(center, children, dimension, cfg);
    }

    hold(player: Player): void {
        this.state = "held";
        this.holderId = player.id;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 };
    }

    throw(direction: Vector3, force?: number): void {
        const f = force ?? this.config.throwForce;
        this.state = "thrown";
        this.holderId = "";
        this._restTicks = 0;
        this.velocity = {
            x: direction.x * f,
            y: direction.y * f + 0.3,
            z: direction.z * f,
        };
        this.angularVelocity = {
            x: direction.z * 0.15,
            y: 0,
            z: -direction.x * 0.15,
        };
    }

    /**
     * Script-side physics tick:
     * - Gravity applied to velocity
     * - Position updated by velocity
     * - Ground collision checked per-block at rotated positions
     * - Angular velocity updates rotation
     * - Damping applied
     * - Player collision resolved via hitbox module
     */
    physicsTick(): void {
        // Gravity
        this.velocity.y -= GRAVITY;

        // Move
        this.center.x += this.velocity.x;
        this.center.y += this.velocity.y;
        this.center.z += this.velocity.z;

        // Rotation
        this.rotation.x += this.angularVelocity.x;
        this.rotation.y += this.angularVelocity.y;
        // Ground collision — check lowest blocks at rotated positions
        let grounded = false;
        for (const child of this.children) {
            if (!child.entity.isValid) continue;
            const rot = rotateRel(child.relPos, this.rotation.x, this.rotation.y);
            const wx = this.center.x + rot.x;
            const wy = this.center.y + rot.y;
            const wz = this.center.z + rot.z;

            if (isSolid(this.dimension, wx, wy, wz)) {
                grounded = true;
                // Push center up so this block is above ground
                const groundTop = Math.floor(wy) + 1;
                this.center.y += groundTop - wy;
                break;
            }
        }

        if (grounded) {
            if (Math.abs(this.velocity.y) > 0.05) {
                this.velocity.y = -this.velocity.y * BOUNCE;
            } else {
                this.velocity.y = 0;
            }
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
            this.angularVelocity.x *= 0.85;
            this.angularVelocity.z *= 0.85;
        }

        // Air damping
        this.velocity.x *= LINEAR_DAMPING;
        this.velocity.z *= LINEAR_DAMPING;
        this.angularVelocity.x *= ANGULAR_DAMPING;
        this.angularVelocity.y *= ANGULAR_DAMPING;

        // Sync visual entities
        this._syncProperties();

        // Player collision via hitbox module
        for (const player of world.getAllPlayers()) {
            if (!player.isValid) continue;
            if (player.dimension.id !== this.dimension.id) continue;
            const dx = player.location.x - this.center.x;
            const dy = player.location.y - this.center.y;
            const dz = player.location.z - this.center.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) > this.children.length + 3) continue;
            resolveContraptionCollision(player, this);
        }

        // Rest detection
        const speed = Math.abs(this.velocity.x) + Math.abs(this.velocity.y) + Math.abs(this.velocity.z)
            + Math.abs(this.angularVelocity.x) + Math.abs(this.angularVelocity.y);
        if (speed < REST_THRESHOLD && grounded) {
            this._restTicks++;
            if (this._restTicks > 20) {
                this.state = "resting";
                this.velocity = { x: 0, y: 0, z: 0 };
                this.angularVelocity = { x: 0, y: 0, z: 0 };
            }
        } else {
            this._restTicks = 0;
        }
    }

    /**
     * Syncs rotation/position properties and teleports entities to CENTER.
     * Animation handles all visual offset via calibrated Molang.
     */
    _syncProperties(): void {
        const SCALE = 10000000;
        const toDeg = (rad: number): number => {
            let d = (rad * 180 / Math.PI) % 360;
            if (d > 180) d -= 360;
            if (d < -180) d += 360;
            return d;
        };
        const pitchDeg = toDeg(this.rotation.x);
        const yawDeg = toDeg(this.rotation.y);
        const pitchS = Math.max(-1800000000, Math.min(1800000000, Math.round(pitchDeg * SCALE)));
        const yawS = Math.max(-1800000000, Math.min(1800000000, Math.round(yawDeg * SCALE)));

        const rotDirty = pitchS !== this._lastPitchS || yawS !== this._lastYawS;
        const posDirty = this.center.x !== this._lastCenterX ||
            this.center.y !== this._lastCenterY ||
            this.center.z !== this._lastCenterZ;

        if (!rotDirty && !posDirty) return;

        if (rotDirty) { this._lastPitchS = pitchS; this._lastYawS = yawS; }
        if (posDirty) {
            this._lastCenterX = this.center.x;
            this._lastCenterY = this.center.y;
            this._lastCenterZ = this.center.z;
        }

        for (const child of this.children) {
            if (!child.entity.isValid) continue;
            if (posDirty) {
                child.entity.teleport({
                    x: this.center.x, y: this.center.y, z: this.center.z,
                });
            }
            if (rotDirty) {
                child.entity.setProperty("gaiadimension:tumble_a", pitchS);
                child.entity.setProperty("gaiadimension:tumble_b", yawS);
            }
        }
    }

    destroy(): void {
        for (const child of this.children) {
            if (child.entity.isValid) child.entity.triggerEvent("gaiadimension:despawn");
        }
        this.children = [];
    }

    prune(): boolean {
        this.children = this.children.filter(ch => ch.entity.isValid);
        return this.children.length > 0;
    }
}

// ── Manager ─────────────────────────────────────────────────────────

export class ContraptionManager {
    private static readonly active = new Map<string, ContraptionBody>();

    static get(id: string): ContraptionBody | undefined {
        return this.active.get(id);
    }

    static has(id: string): boolean {
        return this.active.has(id);
    }

    static delete(id: string): void {
        this.active.delete(id);
    }

    static register(id: string, body: ContraptionBody): void {
        this.active.set(id, body);

        const tickCallback = system.runInterval(() => {
            if (!body.prune()) {
                system.clearRun(body.tickCallback);
                body.destroy();
                for (const [k, v] of this.active) {
                    if (v === body) this.active.delete(k);
                }
                return;
            }

            if (body.state === "held") {
                const p = world.getAllPlayers().find(pl => pl.id === body.holderId);
                if (!p) {
                    body.state = "thrown";
                    this.active.delete(body.holderId);
                    this.active.set("thrown_" + Date.now(), body);
                    return;
                }
                const headLoc = p.getHeadLocation();
                const viewDir = p.getViewDirection();
                const targetX = headLoc.x + viewDir.x * body.config.holdDistance;
                const targetY = headLoc.y + viewDir.y * body.config.holdDistance;
                const targetZ = headLoc.z + viewDir.z * body.config.holdDistance;
                body.center = { x: targetX, y: targetY, z: targetZ };
                body.rotation = { x: 0, y: 0, z: 0 };
                body._syncProperties();
            } else if (body.state === "thrown" || body.state === "resting") {
                body.physicsTick();
            }
        }, 1);

        body.tickCallback = tickCallback;
    }

    static findNearby(position: Vector3, maxDistance: number = 8): { key: string; body: ContraptionBody } | undefined {
        for (const [key, body] of this.active) {
            if (body.state !== "thrown" && body.state !== "resting") continue;
            const dx = position.x - body.center.x;
            const dy = position.y - body.center.y;
            const dz = position.z - body.center.z;
            if (Math.sqrt(dx * dx + dy * dy + dz * dz) < maxDistance) {
                return { key, body };
            }
        }
        return undefined;
    }
}
