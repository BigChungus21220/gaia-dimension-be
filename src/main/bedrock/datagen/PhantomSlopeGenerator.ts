import path from "path";
import fs from "fs-extra";

/**
 * PhantomSlopeGenerator — Generates 512 invisible collision blocks
 * that approximate slopes at every possible resting angle.
 *
 * Architecture:
 *   4 block IDs × 128 angle permutations each = 512 total variants
 *   - gaiadimension:phantom_slope_n  (slope ascends toward +Z, north)
 *   - gaiadimension:phantom_slope_e  (slope ascends toward +X, east)
 *   - gaiadimension:phantom_slope_s  (slope ascends toward -Z, south)
 *   - gaiadimension:phantom_slope_w  (slope ascends toward -X, west)
 *
 * Each block uses an integer state `gaiadimension:slope_idx` (0-127)
 * where idx maps to a pitch angle from 0° (flat full block) to ~89.3° (near-vertical).
 *
 * Each permutation's collision_box is an array of 16 thin horizontal slices
 * (1 pixel deep along the slope axis) with heights computed via trigonometry
 * to approximate the slope at that angle.
 *
 * The blocks are:
 *   - Completely invisible (void texture, alpha_test render)
 *   - No selection box (can't be targeted)
 *   - No drops / no loot
 *   - Hidden from creative menu and commands
 *   - Zero light emission and dampening
 *
 * Usage: The ContraptionPhysics system places these when a contraption
 *        comes to rest. The `slope_idx` is computed from the contraption's
 *        final rotation angle, and the direction block is chosen based
 *        on which cardinal direction the slope faces.
 */

const ROOT = process.cwd();
const BLOCK_OUT = path.join(ROOT, "src/main/bedrock/data/blocks/gen/phantom");

const DIRECTIONS = ["n", "e", "s", "w"] as const;
type Dir = (typeof DIRECTIONS)[number];

const ANGLE_STEPS = 128;      // 128 angle increments per direction
const SLICES = 16;             // 16 collision slices per block (1 per pixel row along slope axis)

// Bedrock limit: 16 values per state. Split 128 into 8 × 16 = 128
const SLOPE_HI_COUNT = 8;     // slope_hi: 0-7  (8 values)
const SLOPE_LO_COUNT = 16;    // slope_lo: 0-15 (16 values)

/**
 * For a given pitch angle (radians), compute the collision_box array
 * of 16 thin horizontal slices that approximate the slope.
 */
function computeCollisionBoxes(
    angleIdx: number,
    dir: Dir
): { origin: number[]; size: number[] }[] {
    // Map angle index to radians: 0 → 0°, 127 → ~89.3°
    const angleDeg = (angleIdx / (ANGLE_STEPS - 1)) * 89.3;
    const angleRad = (angleDeg * Math.PI) / 180;

    const boxes: { origin: number[]; size: number[] }[] = [];

    for (let s = 0; s < SLICES; s++) {
        const t = s / (SLICES - 1);
        const h = Math.max(1, Math.round(16 * (1 - t * Math.sin(angleRad))));

        let origin: number[];
        let size: number[];

        switch (dir) {
            case "n":
                origin = [-8, 0, -8 + s];
                size = [16, h, 1];
                break;
            case "s":
                origin = [-8, 0, 7 - s];
                size = [16, h, 1];
                break;
            case "e":
                origin = [-8 + s, 0, -8];
                size = [1, h, 16];
                break;
            case "w":
                origin = [7 - s, 0, -8];
                size = [1, h, 16];
                break;
        }

        boxes.push({ origin, size });
    }

    return boxes;
}

/**
 * Generate a single phantom_slope block JSON for one direction.
 * Uses two states to work around Bedrock's 16-value-per-state limit:
 *   slope_hi (0-7) × slope_lo (0-15) = 128 combinations
 *   slope_idx = slope_hi * 16 + slope_lo
 */
function generateBlockJson(dir: Dir): object {
    const permutations: object[] = [];

    for (let hi = 0; hi < SLOPE_HI_COUNT; hi++) {
        for (let lo = 0; lo < SLOPE_LO_COUNT; lo++) {
            const idx = hi * SLOPE_LO_COUNT + lo;
            if (idx >= ANGLE_STEPS) break;

            const boxes = computeCollisionBoxes(idx, dir);

            permutations.push({
                condition: `q.block_state('gaiadimension:slope_hi') == ${hi} && q.block_state('gaiadimension:slope_lo') == ${lo}`,
                components: {
                    "minecraft:collision_box": boxes.map((b) => ({
                        origin: b.origin,
                        size: b.size,
                    })),
                },
            });
        }
    }

    // State arrays: [0, 1, 2, ..., N-1]
    const hiValues = Array.from({ length: SLOPE_HI_COUNT }, (_, i) => i);
    const loValues = Array.from({ length: SLOPE_LO_COUNT }, (_, i) => i);

    return {
        format_version: "1.26.10",
        "minecraft:block": {
            description: {
                identifier: `gaiadimension:phantom_slope_${dir}`,
                menu_category: {
                    category: "none",
                    is_hidden_in_commands: true,
                },
                states: {
                    "gaiadimension:slope_hi": hiValues,
                    "gaiadimension:slope_lo": loValues,
                },
            },
            permutations,
            components: {
                "minecraft:material_instances": {
                    "*": {
                        texture: "gaiadimension:phantom_void",
                        render_method: "alpha_test",
                    },
                },
                "minecraft:geometry": "minecraft:geometry.full_block",
                "minecraft:selection_box": false,
                "minecraft:collision_box": true,
                "minecraft:light_dampening": 0,
                "minecraft:light_emission": 0,
                "minecraft:loot": "loot_tables/empty.json",
                "minecraft:destructible_by_mining": {
                    seconds_to_destroy: 0,
                },
                "minecraft:destructible_by_explosion": {
                    explosion_resistance: 0,
                },
            },
        },
    };
}

/**
 * Also generate a full-cube phantom block (no slope, just invisible collision)
 * for blocks that don't need slope approximation.
 */
function generateFullPhantom(): object {
    return {
        format_version: "1.26.10",
        "minecraft:block": {
            description: {
                identifier: "gaiadimension:phantom_full",
                menu_category: {
                    category: "none",
                    is_hidden_in_commands: true,
                },
            },
            components: {
                "minecraft:material_instances": {
                    "*": {
                        texture: "gaiadimension:phantom_void",
                        render_method: "alpha_test",
                    },
                },
                "minecraft:geometry": "minecraft:geometry.full_block",
                "minecraft:selection_box": false,
                "minecraft:collision_box": true,
                "minecraft:light_dampening": 0,
                "minecraft:light_emission": 0,
                "minecraft:loot": "loot_tables/empty.json",
                "minecraft:destructible_by_mining": {
                    seconds_to_destroy: 0,
                },
                "minecraft:destructible_by_explosion": {
                    explosion_resistance: 0,
                },
            },
        },
    };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
    console.log("[PhantomSlopeGen] Generating 512 slope collision variants...");

    // Ensure output dir
    await fs.ensureDir(BLOCK_OUT);

    // 1. Generate full phantom block
    const fullPath = path.join(BLOCK_OUT, "phantom_full.json");
    await fs.writeJson(fullPath, generateFullPhantom(), { spaces: 2 });
    console.log(`  ✓ phantom_full.json`);

    // 2. Generate 4 directional slope blocks (128 angles each = 512 total)
    for (const dir of DIRECTIONS) {
        const blockJson = generateBlockJson(dir);
        const filePath = path.join(BLOCK_OUT, `phantom_slope_${dir}.json`);
        await fs.writeJson(filePath, blockJson, { spaces: 2 });

        // Count collision boxes in the generated file
        const jsonStr = JSON.stringify(blockJson);
        const boxCount = (jsonStr.match(/"origin"/g) || []).length;
        console.log(
            `  ✓ phantom_slope_${dir}.json — 128 permutations, ${boxCount} total collision boxes`
        );
    }

    console.log(
        `[PhantomSlopeGen] Done. 5 files generated (1 full + 4 × 128 slopes = 513 total variants).`
    );
    console.log(`  Output: ${BLOCK_OUT}`);
}

main().catch((e) => {
    console.error("[PhantomSlopeGen] FATAL:", e);
    process.exit(1);
});
