import { system, world, Block, Entity, PlayerPlaceBlockAfterEvent, PlayerInteractWithBlockBeforeEvent, BlockComponentRegistry, PlayerBreakBlockBeforeEvent } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { registerPlaceHandler, registerBreakHandler, registerInteractHandler } from "../systems/event_manager.js";

const SIGN_CHAR_ENTITY = "gaiadimension:sign_char";

/** Characters per line on the sign */
const CHARS_PER_LINE = 10;
/** Max lines on the sign */
const MAX_LINES = 4;
/** Total size of the sign board after scaling (in blocks) */
const BOARD_WIDTH = 0.92;  // 24 * 0.615 / 16
const BOARD_HEIGHT = 0.46; // 12 * 0.615 / 16
/** Y position of board bottom relative to block origin (after transform) */
const BOARD_BOTTOM_Y = 0.45;
/** Z offset of the board's front face from block center */
const BOARD_Z_OFFSET = -0.04;

/** Size of each character cell = entity visual width (0.5 blocks * scale 0.18) */
const CHAR_WIDTH = 0.09;
const CHAR_HEIGHT = 0.09;
/** Entity scale to make the 0.5-block geometry fit into one character cell */
const CHAR_SCALE = 0.18;

/**
 * Finds all sign_char entities belonging to a specific sign block.
 */
function findSignChars(block: Block): Entity[] {
    const center = {
        x: block.location.x + 0.5,
        y: block.location.y + 0.5,
        z: block.location.z + 0.5
    };
    return Array.from(block.dimension.getEntities({
        location: center,
        maxDistance: 2.0,
        type: SIGN_CHAR_ENTITY
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
 */
function spawnSignText(block: Block, text: string): void {
    const lines = wrapText(text);
    const blockX = block.location.x + 0.5;
    const blockY = block.location.y;
    const blockZ = block.location.z + 0.5;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        // Left-align: start from the left edge of the board
        const boardLeft = BOARD_WIDTH / 2 - CHAR_WIDTH / 2;

        for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            // Skip spaces — no need to spawn an invisible entity
            if (char === " ") continue;

            const asciiCode = char.charCodeAt(0);

            const x = blockX + boardLeft - charIdx * CHAR_WIDTH;
            // Top-align: line 0 at top of board, going down
            const y = blockY + BOARD_BOTTOM_Y + BOARD_HEIGHT - (lineIdx * CHAR_HEIGHT) - CHAR_HEIGHT / 2;
            const z = blockZ + BOARD_Z_OFFSET;

            try {
                const entity = block.dimension.spawnEntity(SIGN_CHAR_ENTITY, { x, y, z });
                entity.setProperty("gaiadimension:char_index", asciiCode);
                entity.nameTag = `${char}=${asciiCode}`; // DEBUG: visual confirmation
                console.warn(`[Sign] Spawned '${char}' at index ${asciiCode} (col=${asciiCode % 16}, row=${Math.floor(asciiCode / 16)})`);
                // Store the sign's block location as a tag for easy lookup
                entity.addTag(`sign:${block.location.x},${block.location.y},${block.location.z}`);
            } catch (e) {
                console.warn(`Failed to spawn sign char: ${e}`);
            }
        }
    }

    // Store the raw text on the block so we can re-edit later
    block.setPermutation(block.permutation);
    // Use a dynamic property on the block dimension for the text
    const signKey = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    world.setDynamicProperty(signKey, text);
}

/**
 * Opens the sign edit UI for the player.
 */
function openSignUI(player: any, block: Block): void {
    const signKey = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
    
    const ui = new ModalFormData();
    ui.title("Edit Sign");
    ui.textField("Sign Text", "Type here...");

    ui.show(player).then(response => {
        if (response.canceled || !response.formValues) return;

        const rawInput = String(response.formValues[0] || "");
        if (rawInput.trim().length === 0) return;

        // Clear old characters
        clearSignChars(block);
        // Spawn new characters
        spawnSignText(block, rawInput.trim());
    });
}

export function registerSignComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:sign", {});

    // --- PLACE: Show edit UI immediately ---
    registerPlaceHandler({
        check: (block: Block) => block.typeId.includes("sign"),
        execute: (event: PlayerPlaceBlockAfterEvent) => {
            const { block, player } = event;
            system.runTimeout(() => {
                openSignUI(player, block);
            }, 5);
        }
    });

    // --- BREAK: Kill all sign_char entities ---
    registerBreakHandler({
        event: "before",
        check: (block: Block) => block.typeId.includes("sign"),
        execute: (event: PlayerBreakBlockBeforeEvent) => {
            const { block } = event;
            system.run(() => {
                clearSignChars(block);
                // Clean up stored text
                const signKey = `sign_${block.location.x}_${block.location.y}_${block.location.z}`;
                world.setDynamicProperty(signKey, undefined);
            });
        }
    });

    // --- INTERACT: Re-edit sign text ---
    registerInteractHandler({
        check: (block: Block) => block.typeId.includes("sign"),
        execute: (event: PlayerInteractWithBlockBeforeEvent) => {
            const { player, block } = event;

            if (player.isSneaking) return;

            event.cancel = true;

            system.run(() => {
                openSignUI(player, block);
            });
        }
    });
}
