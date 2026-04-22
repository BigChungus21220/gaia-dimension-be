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
const STANDING_BOARD_Z = -0.04; // board front face Z offset from block center

// Wall sign: board Y range is 0.041 to 0.502 (model Y 6-18, scale 0.615, translation -0.19)  
const WALL_BOARD_BOTTOM_Y = 0.10;
const WALL_BOARD_Z = -0.28; // board front face at Z=-8 model, scaled = -8*0.615/16 = -0.307

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
    const facing = ((yaw) % 360 + 360) % 360;
    const index = Math.round(facing / 22.5) % 16;
    return index;
}

/**
 * Gets the rotation angle in degrees from a rotation index (0-15).
 */
function rotationIndexToDegrees(index: number): number {
    return (index * 22.5) % 360;
}

/** Get the sign's stored text */
function getSignText(block: Block): string {
    const key = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    return (world.getDynamicProperty(key) as string) ?? "";
}

/** Store the sign's text */
function setSignText(block: Block, text: string): void {
    const key = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    world.setDynamicProperty(key, text);
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
        try { entity.remove(); } catch (e) {}
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
function spawnSignText(block: Block, text: string): void {
    const lines = wrapText(text);
    const blockX = block.location.x + 0.5;
    const blockY = block.location.y;
    const blockZ = block.location.z + 0.5;

    // Get rotation from block state
    const rotIndex = block.permutation.getState("gaiadimension:rotation") as number ?? 0;
    const isWall = block.permutation.getState("gaiadimension:wall_attached") as boolean ?? false;

    // Block rotation: state N → block geometry rotated by -N*22.5 degrees
    // Sign text face is +Z (south) at state 0
    // Entity south face is textured → rotation matches block rotation directly
    const blockRotDeg = rotationIndexToDegrees(rotIndex);
    const entityRotDeg = blockRotDeg;
    const blockRotRad = (blockRotDeg * Math.PI) / 180;

    // Pick board parameters
    const boardBottomY = isWall ? WALL_BOARD_BOTTOM_Y : STANDING_BOARD_BOTTOM_Y;
    const boardZ = isWall ? WALL_BOARD_Z : STANDING_BOARD_Z;
    const boardHeight = isWall ? 0.36 : BOARD_HEIGHT;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        // Center the line horizontally on the board
        const lineOffsetX = (line.length * CHAR_WIDTH) / 2 - CHAR_WIDTH / 2;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === " ") continue;

            const asciiCode = char.charCodeAt(0);

            // Local position relative to block center (before rotation)
            // X = horizontal across the board, Z = depth (front face offset)
            const localX = lineOffsetX - charIdx * CHAR_WIDTH;
            const localY = boardBottomY + boardHeight - (lineIdx * CHAR_HEIGHT) - CHAR_HEIGHT / 2;
            const localZ = boardZ;

            // Rotate local X,Z around Y axis by the BLOCK's rotation angle
            const cosR = Math.cos(blockRotRad);
            const sinR = Math.sin(blockRotRad);
            const worldX = blockX + localX * cosR - localZ * sinR;
            const worldZ = blockZ + localX * sinR + localZ * cosR;
            const worldY = blockY + localY;

            try {
                const entity = block.dimension.spawnEntity(SIGN_CHAR_ENTITY, { x: worldX, y: worldY, z: worldZ });
                entity.setProperty("gaiadimension:char_index", asciiCode);
                // Entity faces same direction as sign's front face
                entity.setRotation({ x: 0, y: entityRotDeg });
                entity.addTag(`sign:${block.location.x},${block.location.y},${block.location.z}`);
            } catch (e) {}
        }
    }

    setSignText(block, text);
}

/**
 * Opens the sign edit UI for the player.
 */
function openSignUI(player: Player, block: Block): void {
    const playerId = player.id;
    if (editingPlayers.has(playerId)) return;
    editingPlayers.add(playerId);

    const existingText = getSignText(block);

    const ui = new ModalFormData();
    ui.title("Edit Sign");
    ui.textField("Sign Text", "Type here...", existingText || undefined);

    ui.show(player).then(response => {
        editingPlayers.delete(playerId);
        if (response.canceled || !response.formValues) return;

        const rawInput = String(response.formValues[0] || "");
        if (rawInput.trim().length === 0) return;

        clearSignChars(block);
        spawnSignText(block, rawInput.trim());
    }).catch(() => {
        editingPlayers.delete(playerId);
    });
}

/**
 * Cleans up all stored data for a sign block.
 */
function cleanupSignData(loc: { x: number; y: number; z: number }): void {
    world.setDynamicProperty(`sign_${loc.x}_${loc.y}_${loc.z}`, undefined);
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

        // Check if the block below is solid — if not, it's a wall placement
        const blockBelow = block.dimension.getBlock({
            x: block.location.x,
            y: block.location.y - 1,
            z: block.location.z
        });

        const yaw = player.getRotation().y;
        let isWall = false;
        let rotIndex = playerYawToRotationIndex(yaw);

        if (blockBelow && (blockBelow.typeId === "minecraft:air" || blockBelow.isAir)) {
            isWall = true;
            // Wall signs snap to 4 cardinal directions
            const cardinalIndex = Math.round(rotIndex / 4) * 4 % 16;
            rotIndex = cardinalIndex;
        }

        // Set block states for rotation + wall attachment
        const perm = block.permutation
            .withState("gaiadimension:rotation", rotIndex)
            .withState("gaiadimension:wall_attached", isWall);
        block.setPermutation(perm);

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
                try { entity.remove(); } catch (e) {}
            }
            cleanupSignData(loc);
        });
    });

    // --- INTERACT: Re-edit sign text ---
    world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
        const { player, block } = event;
        if (!isGaiaSign(block)) return;
        if (player.isSneaking) return;

        event.cancel = true;

        system.run(() => {
            openSignUI(player, block);
        });
    });
}
