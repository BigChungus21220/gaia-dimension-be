import { Player } from "@minecraft/server";

/**
 * MotionEngine — 100% script-based fluid physics for Bedrock
 *
 * ALL movement inside fluids is controlled here via clearVelocity + applyImpulse.
 * Bedrock's native walk controller overpowers any delta-correction approach,
 * so we MUST take full control of velocity every tick.
 *
 * No slowness, no slow_falling, no levitation effects — zero FOV zoom.
 *
 * Java model (LivingEntity.travel):
 *   1. moveRelative(swimSpeed, movementInput)   // add input accel
 *   2. move(SELF, deltaMovement)                 // engine collision
 *   3. deltaMovement *= drag                     // decay velocity
 *   4. deltaMovement.y -= fluidGravity           // sink
 *
 * We replicate this with tracked velocity + clearVelocity + applyImpulse.
 */

const DEG2RAD = Math.PI / 180;

/** Java's fluid gravity — both water and lava use 0.02, NOT air's 0.08 */
const FLUID_GRAVITY = 0.02;

/** Java: swim-up impulse per tick when holding jump in fluid */
const SWIM_UP_FORCE = 0.04;

/** Velocity below this is zeroed to prevent micro-drift */
const DEADZONE = 0.003;

/** Max horizontal speed (blocks/tick) — prevents runaway acceleration */
const MAX_H_SPEED = 0.45;
const MAX_H_SPEED_SPRINT = 0.6;

/** Max vertical speed (blocks/tick) */
const MAX_V_SPEED = 2.0;

export class MotionEngine {
    /**
     * Java-parity fluid physics tick.
     *
     * @param player         Target player
     * @param drag           Per-tick XZ velocity multiplier — Java: 0.8 (water), 0.5 (lava)
     * @param acceleration   Per-tick input acceleration — Java: 0.02
     * @param gravityScale   Multiplier on FLUID_GRAVITY (0.02). 1.0 = vanilla water/lava
     * @param canSprint      Whether sprinting boosts drag (Java: true for water, false for lava)
     */
    static tickPlayer(
        player: Player,
        drag: number = 0.8,
        acceleration: number = 0.02,
        gravityScale: number = 1.0,
        canSprint: boolean = true,
    ) {
        const p = player as any;

        // ── Guards ───────────────────────────────────────────────────────
        if (player.isFlying || player.isGliding) {
            p._fluidVX = undefined;
            p._fluidVZ = undefined;
            p._fluidVY = undefined;
            p._lastSmoothImpX = undefined;
            p._lastSmoothImpZ = undefined;
            p._lastSmoothImpY = undefined;
            p._smoothDirX = undefined;
            p._smoothDirZ = undefined;
            p._walkExcessX = 0;
            p._walkExcessZ = 0;
            return;
        }

        // ── Capture momentum on first tick in fluid ─────────────────────
        if (p._fluidVX === undefined) {
            const v = player.getVelocity();
            p._fluidVX = v.x;
            p._fluidVZ = v.z;
            p._fluidVY = v.y;
        }

        // ── Read input ───────────────────────────────────────────────────
        let forward = 0;
        let right = 0;
        try {
            const mv = p.inputInfo.getMovementVector();
            forward = mv.y;
            right = -mv.x; // Bedrock: positive = rightward (D key), formula expects left-positive (Java)
        } catch { /* no inputInfo — standing still */ }

        const yaw = player.getRotation().y * DEG2RAD;
        const sinY = Math.sin(yaw);
        const cosY = Math.cos(yaw);
        const rawWorldX = right * cosY - forward * sinY;
        const rawWorldZ = forward * cosY + right * sinY;
        const inputLen = Math.sqrt(rawWorldX * rawWorldX + rawWorldZ * rawWorldZ);
        const rawInputMag = Math.min(inputLen, 1.0);
        const rawNormX = inputLen > 0.0001 ? rawWorldX / inputLen : 0;
        const rawNormZ = inputLen > 0.0001 ? rawWorldZ / inputLen : 0;

        // ── Smooth input direction ───────────────────────────────────────
        // Lerp the movement direction so diagonal/reversal transitions are
        // buttery instead of snapping. α=0.35 gives ~3 tick blend.
        const DIR_LERP = 0.35;
        let normX: number, normZ: number, inputMag: number;

        if (rawInputMag > 0.01) {
            if (p._smoothDirX === undefined) {
                p._smoothDirX = rawNormX * rawInputMag;
                p._smoothDirZ = rawNormZ * rawInputMag;
            } else {
                p._smoothDirX += DIR_LERP * (rawNormX * rawInputMag - p._smoothDirX);
                p._smoothDirZ += DIR_LERP * (rawNormZ * rawInputMag - p._smoothDirZ);
            }
        } else {
            if (p._smoothDirX !== undefined) {
                p._smoothDirX *= 0.7;
                p._smoothDirZ *= 0.7;
                if (p._smoothDirX * p._smoothDirX + p._smoothDirZ * p._smoothDirZ < 0.0001) {
                    p._smoothDirX = 0;
                    p._smoothDirZ = 0;
                }
            } else {
                p._smoothDirX = 0;
                p._smoothDirZ = 0;
            }
        }

        const smoothLen = Math.sqrt(p._smoothDirX * p._smoothDirX + p._smoothDirZ * p._smoothDirZ);
        inputMag = Math.min(smoothLen, 1.0);
        normX = smoothLen > 0.0001 ? p._smoothDirX / smoothLen : 0;
        normZ = smoothLen > 0.0001 ? p._smoothDirZ / smoothLen : 0;

        // ── Effective drag ───────────────────────────────────────────────
        let effectiveDrag = drag;
        if (canSprint && player.isSprinting && drag >= 0.7) {
            effectiveDrag = Math.min(drag + 0.1, 0.95);
        }

        // ── Effective acceleration ───────────────────────────────────────
        let swimSpeed = acceleration;
        if (canSprint && player.isSprinting) swimSpeed *= 1.3;
        const speedAmp = (player.getEffect('speed')?.amplifier ?? -1) + 1;
        const slowAmp = (player.getEffect('slowness')?.amplifier ?? -1) + 1;
        swimSpeed *= Math.max(0.1, 1.0 + (speedAmp - slowAmp) * 0.2);

        // ── Jump detection ───────────────────────────────────────────────
        let isJumping = false;
        try {
            const jumpState = p.inputInfo?.getButtonState?.('Jump');
            isJumping = jumpState === 1;
        } catch { }
        if (!isJumping) {
            try { isJumping = !!p.isJumping; } catch { }
        }

        const onGround = player.isOnGround;

        // =================================================================
        //  PHYSICS: accel → drag → gravity → buoyancy
        // =================================================================

        // ── Step 1: Input acceleration ───────────────────────────────────
        p._fluidVX += swimSpeed * normX * inputMag;
        p._fluidVZ += swimSpeed * normZ * inputMag;

        // ── Step 2: XZ Drag ─────────────────────────────────────────────
        p._fluidVX *= effectiveDrag;
        p._fluidVZ *= effectiveDrag;

        // ── Step 3: Vertical — proper fluid dynamics ────────────────────
        const yDrag = drag >= 0.7 ? 0.8 : drag;

        if (onGround) {
            if (p._fluidVY < 0) p._fluidVY = 0;
            // Drag on upward velocity so jump arcs decay gracefully
            if (p._fluidVY > 0) p._fluidVY *= yDrag;

            if (isJumping) {
                // Continuous upward force while held — blends toward target
                // rise speed for smooth buoyant lift, not an instant kick
                const targetRise = SWIM_UP_FORCE + effectiveDrag * 0.1;
                p._fluidVY += (targetRise - p._fluidVY) * 0.4;
            } else if (!player.isSneaking && drag >= 0.7) {
                // ── Passive buoyancy (water-like fluids only) ────────────
                // Java: submerged entities passively rise if not sneaking.
                // This is what creates the iconic bobbing — you sit on the
                // bottom for 1 tick, then buoyancy lifts you, gravity pulls
                // you back, lift again → oscillation.
                p._fluidVY += SWIM_UP_FORCE * 0.6;
            }
        } else {
            // Airborne in fluid — full fluid dynamics
            p._fluidVY *= yDrag;
            p._fluidVY -= FLUID_GRAVITY * gravityScale;

            // Continuous swim-up while jump held
            if (isJumping) {
                p._fluidVY += SWIM_UP_FORCE;
            }

            // Sneak descend
            if (player.isSneaking) {
                p._fluidVY -= FLUID_GRAVITY * 0.8;
            }

            // ── Surface buoyancy ─────────────────────────────────────────
            // When slowly sinking and not actively pressing anything,
            // dampen downward velocity aggressively to create natural bobbing.
            // The stronger dampening (0.4 for water) creates the float-at-surface feel.
            if (!isJumping && !player.isSneaking && p._fluidVY < 0 && p._fluidVY > -0.15) {
                const buoyancy = drag >= 0.7 ? 0.4 : 0.3;
                p._fluidVY *= buoyancy;
            }
        }

        // ── Step 4: Deadzone ────────────────────────────────────────────
        if (Math.abs(p._fluidVX) < DEADZONE && inputMag < 0.01) p._fluidVX = 0;
        if (Math.abs(p._fluidVZ) < DEADZONE && inputMag < 0.01) p._fluidVZ = 0;
        if (Math.abs(p._fluidVY) < 0.001 && !isJumping && (onGround || !player.isSneaking)) p._fluidVY = 0;

        // ── Step 5: Clamp ───────────────────────────────────────────────
        p._fluidVY = Math.max(-MAX_V_SPEED, Math.min(MAX_V_SPEED, p._fluidVY));
        const maxH = (canSprint && player.isSprinting) ? MAX_H_SPEED_SPRINT : MAX_H_SPEED;
        const hSpeed = Math.sqrt(p._fluidVX * p._fluidVX + p._fluidVZ * p._fluidVZ);
        if (hSpeed > maxH) {
            const scale = maxH / hSpeed;
            p._fluidVX *= scale;
            p._fluidVZ *= scale;
        }

        // ── Step 6: Wall collision ──────────────────────────────────────
        try {
            const headLoc = player.getHeadLocation();
            const hDir = Math.sqrt(p._fluidVX * p._fluidVX + p._fluidVZ * p._fluidVZ);
            if (hDir > 0.01) {
                const ray = player.dimension.getBlockFromRay(
                    headLoc,
                    { x: p._fluidVX / hDir, y: 0, z: p._fluidVZ / hDir },
                    { maxDistance: 0.45 },
                );
                if (ray && !ray.block.isAir && !ray.block.isLiquid) {
                    p._fluidVX *= 0.15;
                    p._fluidVZ *= 0.15;
                    if (p._fluidVY < 0.08) p._fluidVY += 0.04;
                }
            }
        } catch { /* chunk unloaded or invalid location */ }

        // ── Apply: walk compensation + triple smoothing ─────────────────
        const walkExX = p._walkExcessX ?? 0;
        const walkExZ = p._walkExcessZ ?? 0;

        let targetImpX = p._fluidVX - walkExX;
        let targetImpZ = p._fluidVZ - walkExZ;
        let targetImpY = p._fluidVY;

        // Smooth XZ impulse (α=0.6)
        const IMPULSE_LERP = 0.6;
        if (p._lastSmoothImpX !== undefined) {
            targetImpX = p._lastSmoothImpX + IMPULSE_LERP * (targetImpX - p._lastSmoothImpX);
            targetImpZ = p._lastSmoothImpZ + IMPULSE_LERP * (targetImpZ - p._lastSmoothImpZ);
        }
        p._lastSmoothImpX = targetImpX;
        p._lastSmoothImpZ = targetImpZ;

        // Smooth Y impulse (α=0.5) — prevents jarky jump/fall transitions
        const Y_LERP = 0.5;
        if (p._lastSmoothImpY !== undefined) {
            targetImpY = p._lastSmoothImpY + Y_LERP * (targetImpY - p._lastSmoothImpY);
        }
        p._lastSmoothImpY = targetImpY;

        player.clearVelocity();
        player.applyImpulse({
            x: targetImpX,
            y: targetImpY,
            z: targetImpZ,
        });
    }
}

// ─── Legacy re-exports (used by burntClimbables.ts / CustomFarmland.ts) ──────

type AxisKey = "x" | "y" | "z";
type AxisPair = [AxisKey, AxisKey];

export const Geo = new class {
    distance(v1: any, v2: any) {
        return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2 + (v1.z - v2.z) ** 2);
    }
    getDirection3D(v1: any, v2: any) {
        const d = this.distance(v1, v2) || 1;
        return { x: (v2.x - v1.x) / d, y: (v2.y - v1.y) / d, z: (v2.z - v1.z) / d };
    }
    rotate(offset: Partial<Record<AxisKey, number>>, angle: number, axis: AxisPair = ["x", "z"]) {
        const [pa, sa] = axis;
        const flat: any = { [pa]: offset[pa] ?? 0, [sa]: offset[sa] ?? 0 };
        let dir = this.getDirection3D({ x: 0, y: 0, z: 0 }, sumObjects({}, flat));
        let dist = this.distance({ x: 0, y: 0, z: 0 }, sumObjects({}, flat));
        angle += Math.acos(dir[pa]) * 57.2958 * ((dir[sa] ?? 0) < 0 ? -1 : 1);
        let d: any = { [pa]: Math.cos(angle / 57.2958), [sa]: Math.sin(angle / 57.2958) };
        return sumObjects({}, d, dist);
    }
};

export function sumObjects(v1: any, v2: any, multi = 1) {
    return {
        x: (v1.x || 0) + (v2.x || 0) * multi,
        y: (v1.y || 0) + (v2.y || 0) * multi,
        z: (v1.z || 0) + (v2.z || 0) * multi,
    };
}

export function getXZVelocity(player: Player, forceZeroSprint: boolean = false) {
    let vector: any = { x: 0, z: 0 };
    const input = (player as any).inputInfo.getMovementVector();
    vector = sumObjects(vector, Geo.rotate({
        x: input.y,
        z: input.x,
    }, player.getRotation().y + 90));
    const speedMod = (player.getEffect('speed')?.amplifier ?? -1) + 1 - ((player.getEffect('slowness')?.amplifier ?? -1) + 1);
    const base = forceZeroSprint ? 0.37 : (0.37 + (player.isSprinting ? 0.13 : 0) + speedMod / 10);
    return sumObjects({}, vector, base);
}
