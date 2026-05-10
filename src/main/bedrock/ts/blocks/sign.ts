import {
    system,
    world,
    Block,
    Player,
    BlockComponentRegistry,
    TextPrimitive,
    RGBA,
    Dimension,
    Vector3,
    PlayerPlaceBlockAfterEvent,
    PlayerBreakBlockBeforeEvent,
    PlayerInteractWithBlockBeforeEvent,
    EntityEquippableComponent,
    ItemStack,
    EquipmentSlot
} from "@minecraft/server";
import { ModalFormData, ModalFormResponse } from "@minecraft/server-ui";

// Module augmentation for experimental/missing APIs
declare module "@minecraft/server" {
    interface World {
        readonly primitiveShapesManager: {
            addText(textPrimitive: TextPrimitive, dimension: Dimension): void;
        };
    }

    /**
     * Augmenting TextPrimitive if it's missing properties in the base types.
     * Note: TextPrimitive is currently an experimental feature.
     */
    interface TextPrimitive {
        useRotation: boolean;
        rotation: Vector3;
        scale: number;
        depthTest: boolean;
        backfaceVisible: boolean;
        textBackfaceVisible: boolean;
        color: RGBA;
        backgroundColorOverride: RGBA;
        remove(): void;
    }
}

/** Set of players currently editing a sign (prevents form stacking) */
const editingPlayers: Set<string> = new Set<string>();

/** Characters per line on the sign */
const CHARS_PER_LINE: number = 15;
/** Max lines on the sign */
const MAX_LINES: number = 4;

// ─── Board Position Constants ────────────────────────────────────────────────
// These define where the TextPrimitive should be placed relative to the block
// origin (block.location + 0.5) so the text sits flush on the sign board.

// Standing sign board constants
const STANDING_BOARD_CENTER_Y: number = 0.58;
const STANDING_BOARD_Z: number = -0.06;

// Wall sign board constants
const WALL_BOARD_CENTER_Y: number = 0.30;
const WALL_BOARD_Z: number = 0.41;

// Hanging sign board constants
const HANGING_BOARD_CENTER_Y: number = 0.30;
const HANGING_BOARD_Z: number = -0.08;

// Text styling constants
const TEXT_SCALE: number = 0.5;
const HANGING_TEXT_SCALE: number = 0.5;

/** Default text color (black) */
const DEFAULT_TEXT_COLOR: RGBA = { red: 0, green: 0, blue: 0, alpha: 1 };

/** Maps sign location key → front/back TextPrimitive handles */
const activePrimitives: Map<string, { front?: TextPrimitive; back?: TextPrimitive }> = new Map();

/** Checks if a block is a Gaia Dimension sign */
function isGaiaSign(block: Block): boolean {
    return block.typeId.includes("gaiadimension") && block.typeId.includes("sign");
}

/** Generate a unique key for a sign's location */
function signKey(loc: Vector3): string {
    return `${loc.x},${loc.y},${loc.z}`;
}

/**
 * Converts a player's Y rotation (yaw) to the nearest 16-step sign rotation index (0-15).
 * Maps so that the sign's TEXT faces toward the player.
 */
function playerYawToRotationIndex(yaw: number): number {
    const facing: number = ((-yaw) % 360 + 360) % 360;
    const index: number = Math.round(facing / 22.5) % 16;
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
    const base: string = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    const frontProp = world.getDynamicProperty(`${base}_front`);
    const backProp = world.getDynamicProperty(`${base}_back`);
    return {
        front: typeof frontProp === "string" ? frontProp : "",
        back: typeof backProp === "string" ? backProp : ""
    };
}

/** Store the sign's text (front and back) */
function setSignText(block: Block, front: string, back: string): void {
    const base: string = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    world.setDynamicProperty(`${base}_front`, front);
    world.setDynamicProperty(`${base}_back`, back);
}

/**
 * Auto-wraps text into lines of CHARS_PER_LINE, splitting at word boundaries.
 * Returns a single string with newlines for TextPrimitive rendering.
 */
function wrapText(input: string): string {
    const words: string[] = input.split(" ");
    const lines: string[] = [];
    let currentLine: string = "";

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
    return lines.join("\n");
}

/**
 * Removes any existing TextPrimitives for a sign and clears the cache.
 */
function clearSignPrimitives(loc: Vector3): void {
    const key: string = signKey(loc);
    const existing = activePrimitives.get(key);
    if (existing) {
        try { existing.front?.remove(); } catch (e: unknown) {}
        try { existing.back?.remove(); } catch (e: unknown) {}
        activePrimitives.delete(key);
    }
}

/**
 * Spawns TextPrimitive labels for front and back of the sign.
 */
function spawnSignText(block: Block, frontText: string, backText: string): void {
    const blockX: number = block.location.x + 0.5;
    const blockY: number = block.location.y;
    const blockZ: number = block.location.z + 0.5;
    const dim: Dimension = block.dimension;

    // Get rotation from block state
    const rotIndexState = block.permutation.getState("gaiadimension:rotation");
    const rotIndex: number = typeof rotIndexState === "number" ? rotIndexState : 0;
    
    let isWall: boolean = false;
    try { 
        const wallState = block.permutation.getState("gaiadimension:wall_attached");
        if (typeof wallState === "boolean") isWall = wallState;
    } catch (e: unknown) {}
    
    const isHanging: boolean = block.typeId.includes("hanging");

    // Block rotation: state N → bone rotation = -N*22.5 degrees
    const blockRotDeg: number = rotationIndexToDegrees(rotIndex);
    const boneRotDeg: number = -blockRotDeg;
    const boneRotRad: number = (boneRotDeg * Math.PI) / 180;

    // Pick board parameters based on sign type
    const boardCenterY: number = isHanging ? HANGING_BOARD_CENTER_Y : (isWall ? WALL_BOARD_CENTER_Y : STANDING_BOARD_CENTER_Y);
    const boardZ: number = isHanging ? HANGING_BOARD_Z : (isWall ? WALL_BOARD_Z : STANDING_BOARD_Z);
    const textScale: number = isHanging ? HANGING_TEXT_SCALE : TEXT_SCALE;

    // The text entity faces the opposite direction of the bone rotation
    // For front face: entityRot = boneRot + 180
    const frontYaw: number = ((boneRotDeg + 180) % 360 + 360) % 360;
    const backYaw: number = (boneRotDeg % 360 + 360) % 360;

    const cosR: number = Math.cos(boneRotRad);
    const sinR: number = Math.sin(boneRotRad);

    const key: string = signKey(block.location);
    const primitives: { front?: TextPrimitive; back?: TextPrimitive } = {};

    // --- Front face ---
    if (frontText.length > 0) {
        const wrappedFront: string = wrapText(frontText);
        const localZ: number = boardZ;
        const worldX: number = blockX + (-localZ * sinR);
        const worldZ: number = blockZ + (localZ * cosR);
        const worldY: number = blockY + boardCenterY;

        const frontPrim: TextPrimitive = new TextPrimitive(
            { x: worldX, y: worldY, z: worldZ },
            wrappedFront
        );
        frontPrim.useRotation = true;
        frontPrim.rotation = { x: 0, y: frontYaw, z: 0 };
        frontPrim.scale = textScale;
        frontPrim.depthTest = true;
        frontPrim.backfaceVisible = false;
        frontPrim.textBackfaceVisible = false;
        frontPrim.color = DEFAULT_TEXT_COLOR;
        // Transparent background — we want text only, the board geometry is already there
        frontPrim.backgroundColorOverride = { red: 0, green: 0, blue: 0, alpha: 0 };

        try {
            world.primitiveShapesManager.addText(frontPrim, dim);
            primitives.front = frontPrim;
        } catch (e: unknown) { console.warn(`[Sign] Failed to add front TextPrimitive: ${e}`); }
    }

    // --- Back face ---
    if (backText.length > 0) {
        const wrappedBack: string = wrapText(backText);
        const localZ: number = -boardZ;
        const worldX: number = blockX + (-localZ * sinR);
        const worldZ: number = blockZ + (localZ * cosR);
        const worldY: number = blockY + boardCenterY;

        const backPrim: TextPrimitive = new TextPrimitive(
            { x: worldX, y: worldY, z: worldZ },
            wrappedBack
        );
        backPrim.useRotation = true;
        backPrim.rotation = { x: 0, y: backYaw, z: 0 };
        backPrim.scale = textScale;
        backPrim.depthTest = true;
        backPrim.backfaceVisible = false;
        backPrim.textBackfaceVisible = false;
        backPrim.color = DEFAULT_TEXT_COLOR;
        backPrim.backgroundColorOverride = { red: 0, green: 0, blue: 0, alpha: 0 };

        try {
            world.primitiveShapesManager.addText(backPrim, dim);
            primitives.back = backPrim;
        } catch (e: unknown) { console.warn(`[Sign] Failed to add back TextPrimitive: ${e}`); }
    }

    activePrimitives.set(key, primitives);
    setSignText(block, frontText, backText);
}

/**
 * Opens the sign edit UI for the player.
 */
function openSignUI(player: Player, block: Block): void {
    const playerId: string = player.id;
    if (editingPlayers.has(playerId)) return;
    editingPlayers.add(playerId);

    const existing: { front: string; back: string } = getSignText(block);
    const isHanging: boolean = block.typeId.includes("hanging");

    // For hanging signs, detect which side the player is facing
    let editingBack: boolean = false;
    if (isHanging) {
        const rotIndexState = block.permutation.getState("gaiadimension:rotation");
        const rotIndex: number = typeof rotIndexState === "number" ? rotIndexState : 0;
        
        const entityRotDeg: number = ((-rotIndex * 22.5 + 180) % 360 + 360) % 360;
        const entityRotRad: number = entityRotDeg * Math.PI / 180;
        const nx: number = -Math.sin(entityRotRad);
        const nz: number = Math.cos(entityRotRad);
        const dx: number = player.location.x - (block.location.x + 0.5);
        const dz: number = player.location.z - (block.location.z + 0.5);
        editingBack = (dx * nx + dz * nz) < 0;
    }

    const currentText: string = editingBack ? existing.back : existing.front;

    const ui: ModalFormData = new ModalFormData();
    ui.title(isHanging && editingBack ? "Edit Sign (Back)" : "Edit Sign");
    ui.textField("Sign Text", "Type here...", { defaultValue: currentText || "" });

    ui.show(player).then((response: ModalFormResponse) => {
        editingPlayers.delete(playerId);
        if (response.canceled || !response.formValues) return;

        const newText: string = String(response.formValues[0] || "").trim();

        const frontText: string = editingBack ? existing.front : newText;
        const backText: string = editingBack ? newText : existing.back;

        clearSignPrimitives(block.location);
        spawnSignText(block, frontText, backText);
    }).catch((e: unknown) => {
        editingPlayers.delete(playerId);
    });
}

/**
 * Cleans up all stored data for a sign block.
 */
function cleanupSignData(loc: Vector3): void {
    const base: string = `sign_${loc.x}_${loc.y}_${loc.z}`;
    world.setDynamicProperty(`${base}_front`, undefined);
    world.setDynamicProperty(`${base}_back`, undefined);
}

/** Dye color mapping → RGBA values for TextPrimitive color */
const DYE_COLORS: Record<number, RGBA> = {
    0:  { red: 0,    green: 0,    blue: 0,    alpha: 1 }, // black (default)
    1:  { red: 1,    green: 1,    blue: 1,    alpha: 1 }, // white
    2:  { red: 0.7,  green: 0.1,  blue: 0.1,  alpha: 1 }, // red
    3:  { red: 0.15, green: 0.2,  blue: 0.7,  alpha: 1 }, // blue
    4:  { red: 0.3,  green: 0.6,  blue: 0.85, alpha: 1 }, // light blue
    5:  { red: 0.1,  green: 0.5,  blue: 0.1,  alpha: 1 }, // green
    6:  { red: 0.95, green: 0.9,  blue: 0.1,  alpha: 1 }, // yellow
    7:  { red: 0.5,  green: 0.5,  blue: 0.5,  alpha: 1 }, // gray
    8:  { red: 0.35, green: 0.35, blue: 0.35, alpha: 1 }, // dark gray
    9:  { red: 0.1,  green: 0.55, blue: 0.55, alpha: 1 }, // cyan
    10: { red: 0.75, green: 0.2,  blue: 0.75, alpha: 1 }, // magenta
    11: { red: 0.3,  green: 0.75, blue: 0.1,  alpha: 1 }, // lime
    12: { red: 0.5,  green: 0.3,  blue: 0.15, alpha: 1 }, // brown
    13: { red: 0.05, green: 0.05, blue: 0.05, alpha: 1 }, // black dye
    14: { red: 0.5,  green: 0.1,  blue: 0.7,  alpha: 1 }, // purple
    15: { red: 0.9,  green: 0.5,  blue: 0.1,  alpha: 1 }, // orange
    16: { red: 0.9,  green: 0.5,  blue: 0.65, alpha: 1 }, // pink
};

/** Maps dye item IDs to color indices */
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

// ============================================================
// World Event Listeners
// ============================================================

export function registerSignComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sign", {});

    // --- PLACE: Detect ground/wall, set rotation + open edit UI ---
    world.afterEvents.playerPlaceBlock.subscribe((event: PlayerPlaceBlockAfterEvent) => {
        const { block, player } = event;
        if (!isGaiaSign(block)) return;

        const yaw: number = player.getRotation().y;
        let isWall: boolean = false;
        let rotIndex: number = playerYawToRotationIndex(yaw);
        const isHanging: boolean = block.typeId.includes("hanging");

        if (isHanging) {
            const blockAbove: Block | undefined = block.dimension.getBlock({
                x: block.location.x,
                y: block.location.y + 1,
                z: block.location.z
            });

            const isFullBlockAbove: boolean = !!(blockAbove && !blockAbove.isAir && !blockAbove.typeId.includes("fence") && !blockAbove.typeId.includes("chain") && !blockAbove.typeId.includes("iron_bars"));

            if (isFullBlockAbove && !player.isSneaking) {
                const cardinalIndex: number = Math.round(rotIndex / 4) * 4 % 16;
                const perm = block.permutation
                    .withState("gaiadimension:rotation", cardinalIndex)
                    .withState("gaiadimension:attach_type", 1);
                block.setPermutation(perm);
            } else if (blockAbove && !blockAbove.isAir) {
                const perm = block.permutation
                    .withState("gaiadimension:rotation", rotIndex)
                    .withState("gaiadimension:attach_type", 0);
                block.setPermutation(perm);
            } else {
                const dirs = [
                    { dx: 0, dz: -1, rot: 8 },
                    { dx: 1, dz: 0, rot: 4 },
                    { dx: 0, dz: 1, rot: 0 },
                    { dx: -1, dz: 0, rot: 12 },
                ];
                for (const d of dirs) {
                    const adj: Block | undefined = block.dimension.getBlock({
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
            const blockBelow: Block | undefined = block.dimension.getBlock({
                x: block.location.x,
                y: block.location.y - 1,
                z: block.location.z
            });

            if (!blockBelow || blockBelow.isAir) {
                isWall = true;
                const dirs = [
                    { dx: 0, dz: -1, rot: 8 },
                    { dx: 1, dz: 0, rot: 4 },
                    { dx: 0, dz: 1, rot: 0 },
                    { dx: -1, dz: 0, rot: 12 },
                ];
                for (const d of dirs) {
                    const adj: Block | undefined = block.dimension.getBlock({
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

    // --- BREAK: Remove TextPrimitives + cleanup data ---
    world.beforeEvents.playerBreakBlock.subscribe((event: PlayerBreakBlockBeforeEvent) => {
        const { block } = event;
        if (!isGaiaSign(block)) return;

        const loc: Vector3 = { x: block.location.x, y: block.location.y, z: block.location.z };
        system.run(() => {
            clearSignPrimitives(loc);
            cleanupSignData(loc);
        });
    });

    // --- INTERACT: Dye or re-edit sign text ---
    world.beforeEvents.playerInteractWithBlock.subscribe((event: PlayerInteractWithBlockBeforeEvent) => {
        const { player, block } = event;
        if (!isGaiaSign(block)) return;
        if (player.isSneaking) return;

        event.cancel = true;

        system.run(() => {
            // Check if player is holding a dye
            const equip: EntityEquippableComponent | undefined = player.getComponent("minecraft:equippable") as EntityEquippableComponent | undefined;
            if (!equip) return openSignUI(player, block);

            const mainHand: ItemStack | undefined = equip.getEquipment(EquipmentSlot.Mainhand);
            if (!mainHand) return openSignUI(player, block);

            const dyeIndex: number | undefined = DYE_MAP[mainHand.typeId];
            if (dyeIndex === undefined) return openSignUI(player, block);

            // Apply dye color to the TextPrimitives
            const key: string = signKey(block.location);
            const prims = activePrimitives.get(key);
            if (prims) {
                const rgba: RGBA = DYE_COLORS[dyeIndex] || DEFAULT_TEXT_COLOR;
                try { if (prims.front) prims.front.color = rgba; } catch (e: unknown) {}
                try { if (prims.back) prims.back.color = rgba; } catch (e: unknown) {}
            }

            // Consume one dye
            if (mainHand.amount > 1) {
                mainHand.amount -= 1;
                equip.setEquipment(EquipmentSlot.Mainhand, mainHand);
            } else {
                equip.setEquipment(EquipmentSlot.Mainhand, undefined);
            }
        });
    });
}
