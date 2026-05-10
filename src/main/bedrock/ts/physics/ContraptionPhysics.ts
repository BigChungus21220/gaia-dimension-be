import { world, system, Block, Dimension, Entity, Player, Vector3 } from "@minecraft/server";
import * as CANNON from "cannon-es";

// ══════════════════════════════════════════════════════════════════════
//  ContraptionPhysics — Rigid-body physics powered by cannon-es
//  Converts any connected block structure into a physics-simulated body.
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

// ── Collision helper ────────────────────────────────────────────────

function isSolid(dim: Dimension, x: number, y: number, z: number): boolean {
    const b = dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
    return !!b && !b.isAir && !b.isLiquid;
}

// ── Cannon-ES World Singleton ───────────────────────────────────────

const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.8, 0),
});
physicsWorld.solver.iterations = 5;
physicsWorld.defaultContactMaterial.friction = 0.5;
physicsWorld.defaultContactMaterial.restitution = 0.1;
physicsWorld.allowSleep = true;

const FIXED_DT = 1 / 20;
const _eulerCache = new CANNON.Vec3();
const _sharedHalfBlock = new CANNON.Vec3(0.5, 0.5, 0.5);

/** Scan downward to find the top of the first solid block. */
function findSurfaceY(dim: Dimension, x: number, startY: number, z: number): number {
    for (let y = Math.floor(startY); y >= -64; y--) {
        if (isSolid(dim, x, y, z)) return y;
    }
    return -999;
}

// ── Terrain Collider ────────────────────────────────────────────────
// Per-body set of static boxes representing the terrain surface.

class TerrainCollider {
    private bodies = new Map<string, CANNON.Body>();
    private scanRadius: number;

    constructor(scanRadius: number) {
        this.scanRadius = scanRadius;
    }

    /** Rebuild terrain around (cx, cy, cz). Adds/removes only what changed. */
    rebuild(dim: Dimension, cx: number, cy: number, cz: number): void {
        const bx = Math.floor(cx);
        const bz = Math.floor(cz);
        const r = this.scanRadius;
        const needed = new Set<string>();

        for (let dx = -r; dx <= r; dx++) {
            for (let dz = -r; dz <= r; dz++) {
                const wx = bx + dx;
                const wz = bz + dz;
                const sy = findSurfaceY(dim, wx, Math.floor(cy) + 4, wz);
                if (sy < -64) continue;

                // Also add 1-2 blocks below surface for wall collision
                for (let depth = 0; depth < 3; depth++) {
                    const wy = sy - depth;
                    if (!isSolid(dim, wx, wy, wz)) continue;
                    const key = `${wx},${wy},${wz}`;
                    needed.add(key);

                    if (!this.bodies.has(key)) {
                        const body = new CANNON.Body({
                            mass: 0,
                            type: CANNON.Body.STATIC,
                            position: new CANNON.Vec3(wx + 0.5, wy + 0.5, wz + 0.5),
                        });
                        body.addShape(new CANNON.Box(_sharedHalfBlock));
                        physicsWorld.addBody(body);
                        this.bodies.set(key, body);
                    }
                }
            }
        }

        // Remove bodies that are no longer needed
        for (const [key, body] of this.bodies) {
            if (!needed.has(key)) {
                physicsWorld.removeBody(body);
                this.bodies.delete(key);
            }
        }
    }

    destroy(): void {
        for (const body of this.bodies.values()) {
            physicsWorld.removeBody(body);
        }
        this.bodies.clear();
    }
}

// ── Contraption Body ────────────────────────────────────────────────

export class ContraptionBody {
    center: Vector3;
    rotation: Vector3;
    children: ContraptionChild[];
    dimension: Dimension;
    state: "held" | "thrown" | "resting";
    holderId: string;
    tickCallback: number;
    config: Required<ContraptionConfig>;

    cannonBody: CANNON.Body;
    terrain: TerrainCollider;

    // Perf: dirty tracking
    private _lastPitchS: number = 0;
    private _lastYawS: number = 0;
    private _lastCenterX: number = 0;
    private _lastCenterY: number = 0;
    private _lastCenterZ: number = 0;
    private _terrainTick: number = 0;
    // Track last terrain rebuild position to avoid redundant scans
    private _lastTerrainBX: number = -99999;
    private _lastTerrainBZ: number = -99999;

    private constructor(
        center: Vector3,
        children: ContraptionChild[],
        dimension: Dimension,
        config: Required<ContraptionConfig>,
        cannonBody: CANNON.Body,
        terrain: TerrainCollider
    ) {
        this.center = center;
        this.rotation = { x: 0, y: 0, z: 0 };
        this.children = children;
        this.dimension = dimension;
        this.state = "held";
        this.holderId = "";
        this.tickCallback = 0;
        this.config = config;
        this.cannonBody = cannonBody;
        this.terrain = terrain;
    }

    /**
     * Assembles a contraption from world blocks using cannon-es compound body.
     */
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

        // Create cannon-es compound rigid body
        const body = new CANNON.Body({
            mass: blocks.length,  // 1 kg per block
            position: new CANNON.Vec3(center.x, center.y, center.z),
            linearDamping: 0.1,
            angularDamping: 0.3,
        });

        const halfBlock = new CANNON.Vec3(0.5, 0.5, 0.5);

        for (const block of blocks) {
            const relPos: Vector3 = {
                x: block.location.x - pivot.x,
                y: block.location.y - pivot.y,
                z: block.location.z - pivot.z,
            };
            const blockTypeId = block.typeId;

            // Add per-block box shape to compound body (accurate hitbox)
            body.addShape(
                new CANNON.Box(halfBlock),
                new CANNON.Vec3(relPos.x + 0.5, relPos.y + 0.5, relPos.z + 0.5)
            );

            // Spawn entity
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

        // Body starts kinematic (held)
        body.type = CANNON.Body.KINEMATIC;
        body.sleepSpeedLimit = 0.2;
        body.sleepTimeLimit = 1.5;
        physicsWorld.addBody(body);

        // Terrain collider — radius based on contraption footprint
        const scanRadius = Math.max(4, Math.ceil(Math.sqrt(blocks.length)) + 2);
        const terrain = new TerrainCollider(scanRadius);

        return new ContraptionBody(center, children, dimension, cfg, body, terrain);
    }

    hold(player: Player): void {
        this.state = "held";
        this.holderId = player.id;
        this.cannonBody.type = CANNON.Body.KINEMATIC;
        this.cannonBody.velocity.set(0, 0, 0);
        this.cannonBody.angularVelocity.set(0, 0, 0);
        this.cannonBody.quaternion.set(0, 0, 0, 1);
    }

    throw(direction: Vector3, force?: number): void {
        const f = force ?? this.config.throwForce;
        this.state = "thrown";
        this.holderId = "";

        // Build terrain collider immediately so body doesn't fall through
        this.terrain.rebuild(this.dimension, this.center.x, this.center.y, this.center.z);
        this._lastTerrainBX = Math.floor(this.center.x);
        this._lastTerrainBZ = Math.floor(this.center.z);

        // Switch to dynamic
        this.cannonBody.type = CANNON.Body.DYNAMIC;
        this.cannonBody.wakeUp();
        this.cannonBody.velocity.set(direction.x * f, direction.y * f, direction.z * f);
        this.cannonBody.angularVelocity.set(direction.z * 2, 0, -direction.x * 2);
    }

    /**
     * Physics tick:
     * 1. Refresh terrain collider when body moves to a new block column
     * 2. Step cannon-es
     * 3. Read back state and sync entities
     */
    physicsTick(): void {
        // Rebuild terrain when body moves to a new block position (every 5 ticks min)
        this._terrainTick++;
        if (this._terrainTick >= 5) {
            this._terrainTick = 0;
            const bx = Math.floor(this.center.x);
            const bz = Math.floor(this.center.z);
            if (bx !== this._lastTerrainBX || bz !== this._lastTerrainBZ) {
                this._lastTerrainBX = bx;
                this._lastTerrainBZ = bz;
                this.terrain.rebuild(this.dimension, this.center.x, this.center.y, this.center.z);
            }
        }

        // Step physics
        physicsWorld.step(FIXED_DT);

        // Read back position
        const pos = this.cannonBody.position;
        this.center.x = pos.x;
        this.center.y = pos.y;
        this.center.z = pos.z;

        // Read back rotation
        this.cannonBody.quaternion.toEuler(_eulerCache);
        this.rotation.x = _eulerCache.x;
        this.rotation.y = _eulerCache.y;

        // Sync entities
        this._syncProperties();

        // Sleep detection
        if (this.cannonBody.sleepState === CANNON.Body.SLEEPING) {
            this.state = "resting";
        }
    }

    /**
     * Syncs rotation/position properties and teleports entities.
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
        physicsWorld.removeBody(this.cannonBody);
        this.terrain.destroy();
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
                const holder = world.getEntity(body.holderId);
                if (!holder || !holder.isValid) {
                    body.state = "thrown";
                    body.cannonBody.type = CANNON.Body.DYNAMIC;
                    body.cannonBody.wakeUp();
                    this.active.delete(body.holderId);
                    this.active.set("thrown_" + Date.now(), body);
                    return;
                }
                const p = holder as Player;
                const headLoc = p.getHeadLocation();
                const viewDir = p.getViewDirection();
                const targetX = headLoc.x + viewDir.x * body.config.holdDistance;
                const targetY = headLoc.y + viewDir.y * body.config.holdDistance;
                const targetZ = headLoc.z + viewDir.z * body.config.holdDistance;
                // Move kinematic body to target
                body.cannonBody.position.set(targetX, targetY, targetZ);
                body.cannonBody.quaternion.set(0, 0, 0, 1);
                body.center = { x: targetX, y: targetY, z: targetZ };
                body.rotation = { x: 0, y: 0, z: 0 };
                body._syncProperties();
            } else if (body.state === "thrown") {
                body.physicsTick();
            }
            // Resting — cannon-es sleeping handles this
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
