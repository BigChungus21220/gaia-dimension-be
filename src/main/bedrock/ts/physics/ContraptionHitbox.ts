import { Player, Vector3 } from "@minecraft/server";
import type { ContraptionBody, ContraptionChild } from "./ContraptionPhysics.js";

// ══════════════════════════════════════════════════════════════════════
//  ContraptionHitbox — Script-side player collision for contraptions.
//  Completely separate from the visual/animation system.
//  Computes rotated AABB per-block and resolves player overlap.
// ══════════════════════════════════════════════════════════════════════

const PLAYER_HALF_W = 0.3;   // half player width
const BLOCK_HALF = 0.5;      // half block size
const PLAYER_H = 1.8;        // player height

/** Rotate relative position by pitch (X) then yaw (Y) */
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

/**
 * Resolve player collision against all blocks in a contraption.
 * Returns the displacement vector applied to the player.
 */
export function resolveContraptionCollision(
    player: Player,
    body: ContraptionBody
): Vector3 {
    if (!player.isValid) return { x: 0, y: 0, z: 0 };

    const px = player.location.x;
    const py = player.location.y;  // feet Y
    const pz = player.location.z;

    let totalPushX = 0;
    let totalPushY = 0;
    let totalPushZ = 0;

    for (const child of body.children) {
        if (!child.entity.isValid) continue;

        // Block world position (rotated)
        // Visual Y offset: root bone pivot [0,7,0] at scale 2.7
        const VISUAL_Y = 7 * 2.7 / 16;
        const rot = rotateRel(child.relPos, body.rotation.x, body.rotation.y);
        const bx = body.center.x + rot.x;
        const by = body.center.y + VISUAL_Y + rot.y;
        const bz = body.center.z + rot.z;

        // AABB overlap (player vs 1×1×1 block)
        const ox = (PLAYER_HALF_W + BLOCK_HALF) - Math.abs(px - bx);
        const oz = (PLAYER_HALF_W + BLOCK_HALF) - Math.abs(pz - bz);
        const oyBot = (by + 1.0) - py;       // block top vs player feet
        const oyTop = (py + PLAYER_H) - by;   // player head vs block bottom

        // No overlap
        if (ox <= 0 || oz <= 0 || oyBot <= 0 || oyTop <= 0) continue;

        // Find minimum penetration axis
        const penX = ox;
        const penY = Math.min(oyBot, oyTop);
        const penZ = oz;
        const minPen = Math.min(penX, penY, penZ);

        if (minPen === penY) {
            // Vertical resolution
            if (oyBot < oyTop) {
                // Player feet below block top — push UP (standing on block)
                totalPushY = Math.max(totalPushY, (by + 1.0) - py);
            } else {
                // Player head hitting block bottom — push DOWN
                totalPushY = Math.min(totalPushY, by - (py + PLAYER_H));
            }
        } else if (minPen === penX) {
            // Push along X
            const dir = px > bx ? 1 : -1;
            const push = dir * penX;
            if (Math.abs(push) > Math.abs(totalPushX)) totalPushX = push;
        } else {
            // Push along Z
            const dir = pz > bz ? 1 : -1;
            const push = dir * penZ;
            if (Math.abs(push) > Math.abs(totalPushZ)) totalPushZ = push;
        }
    }

    // Apply displacement
    if (totalPushX !== 0 || totalPushY !== 0 || totalPushZ !== 0) {
        try {
            player.teleport({
                x: px + totalPushX,
                y: py + totalPushY,
                z: pz + totalPushZ,
            });
        } catch {}
    }

    return { x: totalPushX, y: totalPushY, z: totalPushZ };
}
