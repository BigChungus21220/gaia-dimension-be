import { system, world, Block, Entity, Player, BlockPermutation, BlockComponentRegistry } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

const SIGN_CHAR_ENTITY = "gaiadimension:sign_char";

/** Set of players currently editing a sign (prevents form stacking) */
const editingPlayers = new Set<string>();

/** Characters per line on the sign */
const CHARS_PER_LINE = 10;
/** Max lines on the sign */
const MAX_LINES = 4;
/** Total size of the sign board after scaling (in blocks) */
const BOARD_WIDTH = 0.92;
const BOARD_HEIGHT = 0.46;

// Standing sign: board Y range is 0.348 to 0.809 (model Y 14-26, scale 0.615, translation -0.19)
const STANDING_BOARD_BOTTOM_Y = 0.495;
const STANDING_BOARD_Z = -0.05; // text face (-Z side at rotation 0)

// ─── Wall Sign Transformation Notes ─────────────────────────────────────────
// Board geometry: model Y=6..18, scale 0.615, base translation Y=-0.19
// Scaled Y range: (6*0.615/16)-0.19 = 0.04  →  (18*0.615/16)-0.19 = 0.50
//
// Each wall sign direction gets its own minecraft:transformation in the block
// JSON permutations to push the scaled-down board flush against the wall.
// The 0.615 scale shrinks from the block center (0.5), so the board floats
// ~0.19 blocks away from the wall. We add a +0.19 translation on the axis
// pointing TOWARD the wall to compensate.
//
// ⚠️  BEDROCK EAST/WEST AXIS GOTCHA:
// Bedrock's minecraft:transformation translation is applied in WORLD SPACE,
// but the wall sign geometry uses bone Y-rotation to face different walls.
// A -90° Y rotation (sign_wall_4) rotates the board's local +Z to world +X,
// meaning it faces EAST. A -270° Y rotation (sign_wall_12) maps +Z to -X,
// facing WEST. This is counter-intuitive because negative Y rotation is
// CLOCKWISE when viewed from above in Bedrock's coordinate system:
//
//   sign_wall_0  → rot   0° → faces South (+Z) → translation Z = +0.19
//   sign_wall_4  → rot -90° → faces East  (+X) → translation X = +0.19
//   sign_wall_8  → rot 180° → faces North (-Z) → translation Z = -0.19
//   sign_wall_12 → rot 270° → faces West  (-X) → translation X = -0.19
//
// The east/west axis is always the one that breaks because the CW/CCW
// rotation direction is unintuitive — people expect -90° to go left (west)
// but Bedrock rotates clockwise from above, so -90° actually goes right (east).
// ─────────────────────────────────────────────────────────────────────────────
const WALL_BOARD_BOTTOM_Y = 0.22;
const WALL_BOARD_Z = 0.41; // text Z offset, matched to the push-back translation

// Hanging sign: board at model Y=0-10, scale 0.615, translation Y=+0.3
// Hanging sign: board at model Y=0-10, NO scale (full size)
const HANGING_BOARD_BOTTOM_Y = 0.05;
const HANGING_BOARD_Z = -0.08; // in front of board face (-0.0625)
const HANGING_BOARD_HEIGHT = 0.55;

/** Size of each character cell */
const CHAR_WIDTH = 0.05;
const CHAR_HEIGHT = 0.07;

/** Checks if a block is a Gaia Dimension sign */
function isGaiaSign(block: Block): boolean {
    return block.typeId.includes("gaiadimension") && block.typeId.includes("sign");
}

/**
 * Converts a player's Y rotation (yaw) to the nearest 16-step sign rotation index (0-15).
 * Maps so that the sign's TEXT faces toward the player.
 */
function playerYawToRotationIndex(yaw: number): number {
    // Sign board text face is +Z (south) at rotation 0
    // State N rotates by -N*22.5 degrees
    // Direct mapping: player yaw to rotation index
    const facing = ((-yaw) % 360 + 360) % 360;
    const index = Math.round(facing / 22.5) % 16;
    return index;
}

/**
 * Gets the rotation angle in degrees from a rotation index (0-15).
 */
function rotationIndexToDegrees(index: number): number {
    return (index * 22.5) % 360;
}

/** Get the sign's stored text (front and back) */
function getSignText(block: Block): { front: string; back: string } {
    const base = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    return {
        front: (world.getDynamicProperty(`${base}_front`) as string) ?? "",
        back: (world.getDynamicProperty(`${base}_back`) as string) ?? ""
    };
}

/** Store the sign's text (front and back) */
function setSignText(block: Block, front: string, back: string): void {
    const base = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    world.setDynamicProperty(`${base}_front`, front);
    world.setDynamicProperty(`${base}_back`, back);
}

/**
 * Finds all sign_char entities belonging to a specific sign block.
 */
function findSignChars(block: Block): Entity[] {
    const tag = `sign:${block.location.x},${block.location.y},${block.location.z}`;
    const center = {
        x: block.location.x + 0.5,
        y: block.location.y + 0.5,
        z: block.location.z + 0.5
    };
    return Array.from(block.dimension.getEntities({
        location: center,
        maxDistance: 2.0,
        type: SIGN_CHAR_ENTITY,
        tags: [tag]
    }));
}

/**
 * Removes all sign_char entities belonging to a sign block.
 */
function clearSignChars(block: Block): void {
    const chars = findSignChars(block);
    for (const entity of chars) {
        try { entity.remove(); } catch (e) { }
    }
}

/**
 * Auto-wraps text into lines of CHARS_PER_LINE, splitting at word boundaries.
 */
function wrapText(input: string): string[] {
    const words = input.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if (currentLine.length > 0 && (currentLine.length + 1 + word.length) > CHARS_PER_LINE) {
            lines.push(currentLine);
            currentLine = word;
            if (lines.length >= MAX_LINES) break;
        } else {
            currentLine = currentLine.length > 0 ? currentLine + " " + word : word;
        }
        while (currentLine.length > CHARS_PER_LINE && lines.length < MAX_LINES) {
            lines.push(currentLine.substring(0, CHARS_PER_LINE));
            currentLine = currentLine.substring(CHARS_PER_LINE);
        }
    }
    if (currentLine.length > 0 && lines.length < MAX_LINES) {
        lines.push(currentLine);
    }
    return lines;
}

/**
 * Spawns sign_char entities for each character of the given text on the sign.
 * Characters are rotated to face toward the player (same direction as sign face).
 */
function spawnSignText(block: Block, frontText: string, backText: string): void {
    const blockX = block.location.x + 0.5;
    const blockY = block.location.y;
    const blockZ = block.location.z + 0.5;

    // Get rotation from block state
    const rotIndex = block.permutation.getState("gaiadimension:rotation") as number ?? 0;
    let isWall = false;
    try { isWall = block.permutation.getState("gaiadimension:wall_attached") as boolean ?? false; } catch (_) {}
    const isHanging = block.typeId.includes("hanging");

    // Block rotation: state N → bone rotation = -N*22.5 degrees
    const blockRotDeg = rotationIndexToDegrees(rotIndex);
    const boneRotDeg = -blockRotDeg;
    const entityRotDeg = ((boneRotDeg + 180) % 360 + 360) % 360;
    const boneRotRad = (boneRotDeg * Math.PI) / 180;

    // Pick board parameters based on sign type
    const boardBottomY = isHanging ? HANGING_BOARD_BOTTOM_Y : (isWall ? WALL_BOARD_BOTTOM_Y : STANDING_BOARD_BOTTOM_Y);
    const boardZ = isHanging ? HANGING_BOARD_Z : (isWall ? WALL_BOARD_Z : STANDING_BOARD_Z);
    const boardHeight = isHanging ? HANGING_BOARD_HEIGHT : (isWall ? 0.46 : BOARD_HEIGHT);

    // Front face
    if (frontText.length > 0) {
        const frontLines = wrapText(frontText);
        spawnFaceChars(block, frontLines, boardBottomY, boardHeight, boardZ, entityRotDeg, boneRotRad, blockX, blockY, blockZ, false, isHanging);
    }

    // Back face (opposite Z, 180° rotated entity, mirrored X for correct reading order)
    if (backText.length > 0) {
        const backLines = wrapText(backText);
        const backEntityRot = (entityRotDeg + 180) % 360;
        spawnFaceChars(block, backLines, boardBottomY, boardHeight, -boardZ, backEntityRot, boneRotRad, blockX, blockY, blockZ, true, isHanging);
    }

    setSignText(block, frontText, backText);
}

/** Spawns characters for one face of the sign */
function spawnFaceChars(
    block: Block, lines: string[], boardBottomY: number, boardHeight: number,
    boardZ: number, entityRotDeg: number, boneRotRad: number,
    blockX: number, blockY: number, blockZ: number, mirrorX: boolean, isHanging: boolean
): void {
    const cosR = Math.cos(boneRotRad);
    const sinR = Math.sin(boneRotRad);
    // Hanging signs: 2x scale for vanilla-sized text
    const scaleFactor = isHanging ? 2.0 : 1.0;
    const charW = CHAR_WIDTH * scaleFactor;
    const charH = CHAR_HEIGHT * scaleFactor;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        const lineOffsetX = (line.length * charW) / 2 - charW / 2;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === " ") continue;
            const asciiCode = char.charCodeAt(0);

            const localX = mirrorX ? -(lineOffsetX - charIdx * charW) : (lineOffsetX - charIdx * charW);
            const localY = boardBottomY + boardHeight - (lineIdx * charH) - charH / 2;
            const localZ = boardZ;

            const worldX = blockX + localX * cosR - localZ * sinR;
            const worldZ = blockZ + localX * sinR + localZ * cosR;
            const worldY = blockY + localY;

            try {
                const entity = block.dimension.spawnEntity(SIGN_CHAR_ENTITY, { x: worldX, y: worldY, z: worldZ });
                entity.setProperty("gaiadimension:char_index", asciiCode);
                entity.setRotation({ x: 0, y: entityRotDeg });
                entity.addTag(`sign:${block.location.x},${block.location.y},${block.location.z}`);
                if (isHanging) {
                    entity.setProperty("gaiadimension:sign_scale", 0.28);
                }
            } catch (e) { console.warn(`[Sign] Failed to spawn char: ${e}`); }
        }
    }
}

/**
 * Opens the sign edit UI for the player.
 */
function openSignUI(player: Player, block: Block): void {
    const playerId = player.id;
    if (editingPlayers.has(playerId)) return;
    editingPlayers.add(playerId);

    const existing = getSignText(block);
    const isHanging = block.typeId.includes("hanging");

    // For hanging signs, detect which side the player is facing
    let editingBack = false;
    if (isHanging) {
        const rotIndex = block.permutation.getState("gaiadimension:rotation") as number ?? 0;
        const entityRotDeg = ((-rotIndex * 22.5 + 180) % 360 + 360) % 360;
        const entityRotRad = entityRotDeg * Math.PI / 180;
        // Sign front face normal vector points in direction of text entity
        const nx = -Math.sin(entityRotRad);
        const nz = Math.cos(entityRotRad);
        // Vector from sign center to player
        const dx = player.location.x - (block.location.x + 0.5);
        const dz = player.location.z - (block.location.z + 0.5);
        // Dot product: positive = player is on front side, negative = back side
        editingBack = (dx * nx + dz * nz) < 0;
    }

    const currentText = editingBack ? existing.back : existing.front;

    const ui = new ModalFormData();
    ui.title(isHanging && editingBack ? "Edit Sign (Back)" : "Edit Sign");
    ui.textField("Sign Text", "Type here...", { defaultValue: currentText || "" });

    ui.show(player).then(response => {
        editingPlayers.delete(playerId);
        if (response.canceled || !response.formValues) return;

        const newText = String(response.formValues[0] || "").trim();

        // Update only the side being edited
        const frontText = editingBack ? existing.front : newText;
        const backText = editingBack ? newText : existing.back;

        clearSignChars(block);
        spawnSignText(block, frontText, backText);
    }).catch(() => {
        editingPlayers.delete(playerId);
    });
}


/**
 * Cleans up all stored data for a sign block.
 */
function cleanupSignData(loc: { x: number; y: number; z: number }): void {
    const base = `sign_${loc.x}_${loc.y}_${loc.z}`;
    world.setDynamicProperty(`${base}_front`, undefined);
    world.setDynamicProperty(`${base}_back`, undefined);
}

// ============================================================
// World Event Listeners
// ============================================================

export function registerSignComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sign", {});

    // --- PLACE: Detect ground/wall, set rotation + open edit UI ---
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block, player } = event;
        if (!isGaiaSign(block)) return;

        const yaw = player.getRotation().y;
        let isWall = false;
        let rotIndex = playerYawToRotationIndex(yaw);
        const isHanging = block.typeId.includes("hanging");

        if (isHanging) {
            // Check block above to determine hanging mode
            const blockAbove = block.dimension.getBlock({
                x: block.location.x,
                y: block.location.y + 1,
                z: block.location.z
            });

            const isFullBlockAbove = blockAbove && !blockAbove.isAir && !blockAbove.typeId.includes("fence") && !blockAbove.typeId.includes("chain") && !blockAbove.typeId.includes("iron_bars");

            if (isFullBlockAbove && !player.isSneaking) {
                // Full block above, not sneaking → parallel chains, 4 cardinal directions
                const cardinalIndex = Math.round(rotIndex / 4) * 4 % 16;
                const perm = block.permutation
                    .withState("gaiadimension:rotation", cardinalIndex)
                    .withState("gaiadimension:attach_type", 1);
                block.setPermutation(perm);
            } else if (blockAbove && !blockAbove.isAir) {
                // Narrow block above → V-chains, 16 rotations
                const perm = block.permutation
                    .withState("gaiadimension:rotation", rotIndex)
                    .withState("gaiadimension:attach_type", 0);
                block.setPermutation(perm);
            } else {
                // No block above → wall-attached, find adjacent wall
                const dirs = [
                    { dx: 0, dz: -1, rot: 8 },
                    { dx: 1, dz: 0, rot: 4 },
                    { dx: 0, dz: 1, rot: 0 },
                    { dx: -1, dz: 0, rot: 12 },
                ];
                for (const d of dirs) {
                    const adj = block.dimension.getBlock({
                        x: block.location.x + d.dx,
                        y: block.location.y,
                        z: block.location.z + d.dz
                    });
                    if (adj && !adj.isAir) {
                        rotIndex = d.rot;
                        break;
                    }
                }
                const perm = block.permutation
                    .withState("gaiadimension:rotation", rotIndex)
                    .withState("gaiadimension:attach_type", 2);
                block.setPermutation(perm);
            }
        } else {
            // Check if block below is air — if so, it's a wall placement
            const blockBelow = block.dimension.getBlock({
                x: block.location.x,
                y: block.location.y - 1,
                z: block.location.z
            });

            if (!blockBelow || blockBelow.isAir) {
                isWall = true;
                // Find adjacent solid block (the wall) and orient sign facing away from it
                const dirs = [
                    { dx: 0, dz: -1, rot: 8 },   // Wall to north → face south (rot 8)
                    { dx: 1, dz: 0, rot: 4 },    // Wall to east → face west (rot 4)
                    { dx: 0, dz: 1, rot: 0 },    // Wall to south → face north (rot 0)
                    { dx: -1, dz: 0, rot: 12 },  // Wall to west → face east (rot 12)
                ];
                for (const d of dirs) {
                    const adj = block.dimension.getBlock({
                        x: block.location.x + d.dx,
                        y: block.location.y,
                        z: block.location.z + d.dz
                    });
                    if (adj && !adj.isAir) {
                        rotIndex = d.rot;
                        break;
                    }
                }
            }

            // Set block states for rotation + wall attachment
            const perm = block.permutation
                .withState("gaiadimension:rotation", rotIndex)
                .withState("gaiadimension:wall_attached", isWall);
            block.setPermutation(perm);
        }

        // Open sign edit form
        system.runTimeout(() => {
            openSignUI(player, block);
        }, 5);
    });

    // --- BREAK: Kill all sign_char entities + cleanup data ---
    world.beforeEvents.playerBreakBlock.subscribe((event) => {
        const { block } = event;
        if (!isGaiaSign(block)) return;

        const loc = { x: block.location.x, y: block.location.y, z: block.location.z };
        const dim = block.dimension;
        system.run(() => {
            const tag = `sign:${loc.x},${loc.y},${loc.z}`;
            const entities = dim.getEntities({
                location: { x: loc.x + 0.5, y: loc.y + 0.5, z: loc.z + 0.5 },
                maxDistance: 2.0,
                type: SIGN_CHAR_ENTITY,
                tags: [tag]
            });
            for (const entity of entities) {
                try { entity.remove(); } catch (e) { }
            }
            cleanupSignData(loc);
        });
    });

    // --- INTERACT: Dye or re-edit sign text ---
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        const { player, block } = event;
        if (!isGaiaSign(block)) return;
        if (player.isSneaking) return;

        event.cancel = true;

        system.run(() => {
            // Check if player is holding a dye
            const equip = player.getComponent("minecraft:equippable");
            if (!equip) return openSignUI(player, block);

            const mainHand = equip.getEquipment("Mainhand");
            if (!mainHand) return openSignUI(player, block);

            const dyeColor = DYE_MAP[mainHand.typeId];
            if (dyeColor === undefined) return openSignUI(player, block);

            // Apply dye color to all sign chars
            const tag = `sign:${block.location.x},${block.location.y},${block.location.z}`;
            const entities = block.dimension.getEntities({
                location: { x: block.location.x + 0.5, y: block.location.y + 0.5, z: block.location.z + 0.5 },
                maxDistance: 2.0,
                type: SIGN_CHAR_ENTITY,
                tags: [tag]
            });
            for (const entity of entities) {
                try { entity.setProperty("gaiadimension:text_color", dyeColor); } catch (_) {}
            }

            // Consume one dye
            if (mainHand.amount > 1) {
                mainHand.amount -= 1;
                equip.setEquipment("Mainhand", mainHand);
            } else {
                equip.setEquipment("Mainhand", undefined);
            }
        });
    });
}

/** Maps dye item IDs to text_color indices (0=black default, 1-16=dye colors) */
const DYE_MAP: Record<string, number> = {
    "minecraft:white_dye": 1,
    "minecraft:red_dye": 2,
    "minecraft:blue_dye": 3,
    "minecraft:light_blue_dye": 4,
    "minecraft:green_dye": 5,
    "minecraft:yellow_dye": 6,
    "minecraft:gray_dye": 7,
    "minecraft:dark_gray_dye": 8,
    "minecraft:cyan_dye": 9,
    "minecraft:magenta_dye": 10,
    "minecraft:lime_dye": 11,
    "minecraft:brown_dye": 12,
    "minecraft:black_dye": 13,
    "minecraft:purple_dye": 14,
    "minecraft:orange_dye": 15,
    "minecraft:pink_dye": 16,
};

