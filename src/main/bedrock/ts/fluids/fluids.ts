import { world, system, BlockPermutation, ItemStack, BlockVolume, Block, Dimension, Player, Entity, Vector3, BlockComponentRegistry, BlockCustomComponent, BlockComponentTickEvent, GameMode, ItemComponentUseOnEvent, ItemCustomComponent, ItemUseAfterEvent, ItemComponentUseEvent, BlockComponentPlayerDestroyEvent } from "@minecraft/server";
import { FluidTemplate } from "./lib/FluidTemplate.js";
import { LavaTemplate } from "./templates/LavaTemplate.js";
import { WaterTemplate } from "./templates/WaterTemplate.js";
import { runEntityEffects } from "./EntityEffects.js";
import { MotionEngine, ExtendedPlayer } from "../utils/MotionEngine.js";

// --- Globals ---
const blockCache = new Map<string, Block | undefined>();
const playersInFluids = new Set<string>();
const typeInfoCache = new Map<string, { stage: number, baseId: string }>();

const REPLACABLE_IDS = new Set([
    "minecraft:snow_layer", "minecraft:fire", "minecraft:soul_fire",
    "minecraft:double_plant", "minecraft:tallgrass", "minecraft:short_grass",
    "minecraft:deadbush", "minecraft:web", "minecraft:dandelion", "minecraft:oxeye_daisy", "minecraft:poppy", "minecraft:azure_bluet", "minecraft:cornflower"
]);

function getCachedBlock(dimension: Dimension, x: number, y: number, z: number): Block | undefined {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    if (fy < dimension.heightRange.min || fy > dimension.heightRange.max) return undefined;
    const key = `${dimension.id}:${fx},${fy},${fz}`;
    let blk = blockCache.get(key);
    if (blk !== undefined) return blk;
    blk = dimension.getBlock({ x: fx, y: fy, z: fz });
    blockCache.set(key, blk);
    return blk;
}

function getTypeInfo(typeId: string): { stage: number, baseId: string } {
    let info = typeInfoCache.get(typeId);
    if (info) return info;

    let currentStage = 0; 
    let baseId = typeId;
    
    if (typeId.endsWith("_down")) {
        currentStage = -1;
        baseId = typeId.replace("_down", "");
    } else {
        const match = typeId.match(/(\d+)$/);
        if (match) {
            currentStage = parseInt(match[1]);
            baseId = typeId.slice(0, -match[1].length);
        } else {
            // Check if it's a source block by comparing against known base IDs
            for (const template of templates) {
                if (typeId === template.baseName) {
                    currentStage = 0;
                    baseId = typeId;
                    break;
                }
            }
        }
    }
    info = { stage: currentStage, baseId };
    typeInfoCache.set(typeId, info);
    return info;
}

// --- Configuration ---
const templates: FluidTemplate[] = [
    new LavaTemplate("gaiadimension:superhot_magma"),
    new LavaTemplate("gaiadimension:liquid_bismuth"),
    new WaterTemplate({ 
        baseName: "gaiadimension:liquid_aura", 
        fogId: "gaiadimension:liquid_aura_fog",
        interactions: [
            {
                targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
                action: "transformTarget",
                resultBlock: "gaiadimension:aura_crystal_block",
                directions: "adjacent"
            }
        ]
    }),
    new WaterTemplate({ 
        baseName: "gaiadimension:mineral_water", 
        fogId: "gaiadimension:mineral_water_fog",
        hasBoatPhysics: true,
        interactions: [
            {
                targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
                action: "transformTarget",
                resultBlock: "gaiadimension:primal_mass",
                directions: "adjacent"
            }
        ]
    }),
    new WaterTemplate({ 
        baseName: "gaiadimension:sweet_muck", 
        viscosity: 5,
        spreadDelay: 10,
        fogId: "gaiadimension:sweet_muck_fog",
        interactions: [
            {
                targetBlock: ["gaiadimension:superhot_magma", "gaiadimension:superhot_magma_down", "gaiadimension:superhot_magma1", "gaiadimension:superhot_magma2", "gaiadimension:superhot_magma3", "gaiadimension:superhot_magma4", "gaiadimension:superhot_magma5", "gaiadimension:superhot_magma6", "gaiadimension:superhot_magma7"],
                action: "transformTarget",
                resultBlock: "gaiadimension:primal_mass",
                directions: "adjacent"
            }
        ]
    }),
];

const fluidIDs = new Set<string>();
const idToTemplate = new Map<string, FluidTemplate>();

for (const template of templates) {
    for (const id of template.fluidIDs) {
        fluidIDs.add(id);
        idToTemplate.set(id, template);
    }
}

// --- Fluid Processing System (Budgeted) ---
const BUDGET = 4; 
const MAX_QUEUE_SIZE = 1000; 

const playerInteractionDummies = new Map<string, Entity>();

interface PendingBlockData {
    block: Block;
    dimension: Dimension;
    scheduledTick: number;
}

const PENDING_BLOCKS: Map<string, PendingBlockData> = new Map(); 
// PERFORMANCE: Stable block tracking — blocks that processed with zero changes
// are marked stable and skipped on subsequent onTick calls until wakeNeighbors clears them.
const STABLE_BLOCKS: Set<string> = new Set();
let taskIndex = 0;

const DIRECTIONS = [
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 0, z: 1 },
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 }
];

system.runInterval(() => {
    blockCache.clear();
    const start = Date.now();
    const players = world.getAllPlayers();
    
    const tasks = [
        () => runPlayerEffects(players),
        () => runEntityEffects(idToTemplate, fluidIDs, players),
        () => runBoatLogic(players),
        () => runFluidFlowLogic(start),
        () => runFluidInteractionDummies(players)
    ];

    const priorityTask = taskIndex % tasks.length;
    tasks[priorityTask]();
    
    for (let i = 0; i < tasks.length; i++) {
        if (i === priorityTask) continue;
        if (Date.now() - start > BUDGET) break;
        tasks[i]();
    }
    taskIndex++;
}, 1);

// --- Dedicated fluid-physics loop ---
const _fluidPosTrack = new Map<string, { lx: number; lz: number; vx: number; vz: number }>();

system.runInterval(() => {
    for (const state of FluidTemplate.physicsStates.values()) {
        try {
            if (!state.player.isValid) {
                FluidTemplate.physicsStates.delete(state.player.id);
                _fluidPosTrack.delete(state.player.id);
                continue;
            }

            const player = state.player;
            const pos = player.location;
            const pid = player.id;
            const p = player as ExtendedPlayer;

            const track = _fluidPosTrack.get(pid);
            if (track) {
                const rawExX = (pos.x - track.lx) - track.vx;
                const rawExZ = (pos.z - track.lz) - track.vz;
                const prevExX = p._walkExcessX ?? 0;
                const prevExZ = p._walkExcessZ ?? 0;
                const clampedExX = Math.max(-0.15, Math.min(0.15, rawExX));
                const clampedExZ = Math.max(-0.15, Math.min(0.15, rawExZ));
                p._walkExcessX = prevExX + 0.2 * (clampedExX - prevExX);
                p._walkExcessZ = prevExZ + 0.2 * (clampedExZ - prevExZ);
            } else {
                p._walkExcessX = 0;
                p._walkExcessZ = 0;
            }

            MotionEngine.tickPlayer(
                player,
                state.drag,
                state.acceleration,
                state.gravityScale,
                state.canSprint,
            );

            _fluidPosTrack.set(pid, {
                lx: pos.x,
                lz: pos.z,
                vx: p._fluidVX ?? 0,
                vz: p._fluidVZ ?? 0,
            });
        } catch { }
    }

    for (const pid of _fluidPosTrack.keys()) {
        if (!FluidTemplate.physicsStates.has(pid)) {
            _fluidPosTrack.delete(pid);
        }
    }
});

function runFluidInteractionDummies(players: Player[]): void {
    for (const player of players) {
        const inventory = player.getComponent("inventory")?.container;
        if (!inventory) continue;
        const heldItem = inventory.getItem(player.selectedSlotIndex);
        const isHoldingBucket = heldItem?.typeId === "minecraft:bucket" || (heldItem?.typeId.startsWith("gaiadimension:") && heldItem?.typeId.endsWith("_bucket"));
        const isHoldingBlock = heldItem && (heldItem.typeId.includes("planks") || heldItem.typeId.includes("log") || heldItem.typeId.includes("stairs") || heldItem.typeId.includes("slab") || heldItem.typeId.includes("fence") || heldItem.typeId.includes("stone") || heldItem.typeId.includes("dirt") || heldItem.typeId.includes("sand") || heldItem.typeId.includes("glass") || heldItem.typeId.includes("cobblestone"));

        if (!isHoldingBucket && !isHoldingBlock) {
            const existing = playerInteractionDummies.get(player.id);
            if (existing) { if (existing.isValid) existing.remove(); playerInteractionDummies.delete(player.id); }
            continue;
        }

        const viewVec = player.getViewDirection();
        const headLoc = player.getHeadLocation();
        let targetFluid: Block | undefined;
        for (let d = 0.5; d <= 5; d += 0.5) {
            const checkPos = { x: headLoc.x + viewVec.x * d, y: headLoc.y + viewVec.y * d, z: headLoc.z + viewVec.z * d };
            const block = getCachedBlock(player.dimension, checkPos.x, checkPos.y, checkPos.z);
            if (block) {
                if (fluidIDs.has(block.typeId)) { targetFluid = block; break; }
                if (!block.isAir && !isReplaceable(block)) break;
            }
        }

        if (targetFluid) {
            let dummy = playerInteractionDummies.get(player.id);
            const center = targetFluid.center();
            const targetPos = { x: center.x, y: center.y - 0.5, z: center.z };
            if (!dummy || !dummy.isValid) { dummy = player.dimension.spawnEntity("gaiadimension:fluid_interaction_dummy", targetPos); playerInteractionDummies.set(player.id, dummy); }
            else { const distSq = Math.pow(dummy.location.x - targetPos.x, 2) + Math.pow(dummy.location.y - targetPos.y, 2) + Math.pow(dummy.location.z - targetPos.z, 2); if (distSq > 0.01) dummy.teleport(targetPos); }
        } else {
            const existing = playerInteractionDummies.get(player.id);
            if (existing) { if (existing.isValid) existing.remove(); playerInteractionDummies.delete(player.id); }
        }
    }
}

function runFluidFlowLogic(startTime: number): void {
    if (PENDING_BLOCKS.size === 0) return;
    const currentTick = system.currentTick;
    const iterator = PENDING_BLOCKS.entries();
    let processedCount = 0;
    const MAX_PER_TICK = 50;

    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
        const timeSpent = Date.now() - startTime;
        if (timeSpent > BUDGET && processedCount > 0) break;
        if (processedCount >= MAX_PER_TICK) break;
        const [key, data] = entry.value;
        if (currentTick < data.scheduledTick) continue;
        PENDING_BLOCKS.delete(key);
        try {
            const { block, dimension } = data;
            if (block.isValid) {
                const changed = processFluidBlock(block, dimension);
                if (changed) {
                    wakeNeighbors(block.location, dimension);
                } else {
                    // No changes — mark as stable so onTick skips it
                    STABLE_BLOCKS.add(key);
                }
                processedCount++;
            }
        } catch (e) {}
    }
}

function runPlayerEffects(players: Player[]): void {
    for (const player of players) {
        try {
            const dim = player.dimension;
            const loc = player.location;
            const blockAt = getCachedBlock(dim, loc.x, loc.y, loc.z);
            const blockHead = getCachedBlock(dim, loc.x, loc.y + 1.63, loc.z);
            let template: FluidTemplate | undefined;
            let isHead = false;
            let isFeet = false;
            if (blockHead && fluidIDs.has(blockHead.typeId)) { template = idToTemplate.get(blockHead.typeId); isHead = true; }
            if (blockAt && fluidIDs.has(blockAt.typeId)) { const t = idToTemplate.get(blockAt.typeId); if (!template) template = t; isFeet = true; }
            if (template) { playersInFluids.add(player.id); template.onPlayerTick(player, blockAt || blockHead!, isHead, isFeet); }
            else if (playersInFluids.has(player.id)) {
                player.runCommand("fog @s remove fluid_fog");
                playersInFluids.delete(player.id);
                // CRITICAL: Stop MotionEngine from applying fluid physics after exit
                FluidTemplate.physicsStates.delete(player.id);
                _fluidPosTrack.delete(player.id);
                // Clear MotionEngine's stored velocity so it doesn't leak into the next fluid entry
                const p = player as ExtendedPlayer;
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
            }
        } catch {}
    }
}

function runBoatLogic(players: Player[]): void {
    if (players.length === 0) return;
    const activeDimensions = new Set(players.map(p => p.dimension));
    for (const dimension of activeDimensions) {
        const boats = dimension.getEntities({ families: ["boat"] });
        for (const boat of boats) {
            if (!boat.isValid) continue;
            const loc = boat.location;
            const blockAt = getCachedBlock(dimension, loc.x, loc.y, loc.z);
            const blockBelow = getCachedBlock(dimension, loc.x, loc.y - 0.1, loc.z);
            let template: FluidTemplate | undefined;
            let isDeep = false;
            if (blockAt && fluidIDs.has(blockAt.typeId)) { template = idToTemplate.get(blockAt.typeId); isDeep = true; }
            else if (blockBelow && fluidIDs.has(blockBelow.typeId)) { template = idToTemplate.get(blockBelow.typeId); }
            if (template) template.processBoat(boat, dimension, isDeep);
            else { const holders = dimension.getEntities({ type: "gaiadimension:boat_holder", location: loc, maxDistance: 2 }); for (const h of holders) if (h.isValid) h.remove(); }
        }
    }
}

function isReplaceable(blk: Block | undefined): boolean {
    if (!blk || !blk.isValid) return false;
    if (blk.isAir) return true;
    const id = blk.typeId;
    if (blk.isLiquid || fluidIDs.has(id)) return false;
    if (REPLACABLE_IDS.has(id)) return true;
    if (id.includes("flower") || id.includes("sapling") || id.includes("bush") || id.includes("plant") || id.includes("leaf_litter")) return true;
    const vegetationTags = ["minecraft:is_plant", "flower", "plant", "double_plant", "minecraft:crop"];
    for (const tag of vegetationTags) { if (blk.hasTag(tag)) return true; }
    return false;
}

// 1:1 Burnt BFS — returns distance to nearest drop-off, or 999 if none found
function getSlopeDistance(dimension: Dimension, x: number, y: number, z: number, maxDistance: number, baseId: string): number {
    const visited = new Set<number>();
    const qX: number[] = [x], qZ: number[] = [z], qD: number[] = [0];
    let head = 0, tail = 1;
    const KEY_MUL = 200003;
    visited.add(x * KEY_MUL + z);

    while (head < tail) {
        const cx = qX[head], cz = qZ[head], d = qD[head++];
        if (d >= maxDistance) continue;

        for (const dir of DIRECTIONS) {
            const nx = cx + dir.x, nz = cz + dir.z;
            const key = nx * KEY_MUL + nz;
            if (visited.has(key)) continue;
            visited.add(key);

            const neighbor = getCachedBlock(dimension, nx, y, nz);
            if (!neighbor) continue;

            // 1:1 JAVA: search through air OR existing same-type fluid
            const isSameFluid = neighbor.typeId.startsWith(baseId);
            if (!isSameFluid && !isReplaceable(neighbor)) continue;

            // Check if there is a hole below
            const below = getCachedBlock(dimension, nx, y - 1, nz);
            if (below && isReplaceable(below)) return d;

            qX[tail] = nx; qZ[tail] = nz; qD[tail++] = d + 1;
        }
    }
    return 999;
}

function processFluidBlock(block: Block, dimension: Dimension): boolean {
    const typeId = block.typeId;
    let changesHappened = false;
    const { stage: currentStage, baseId } = getTypeInfo(typeId);
    if (!fluidIDs.has(baseId)) return false; 
    
    const template = idToTemplate.get(baseId);
    if (template) {
        const interactions = template.getInteractions();
        if (interactions.length > 0) {
            const neighbors = [{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1},{x:0,y:1,z:0},{x:0,y:-1,z:0}];
            for (const rule of interactions) {
                const checkIndices = rule.directions === "below" ? [5] : (rule.directions === "all" ? [0,1,2,3,4,5] : [0,1,2,3,4]);
                let triggered = false;
                for (const idx of checkIndices) {
                    const off = neighbors[idx];
                    const nb = getCachedBlock(dimension, block.x + off.x, block.y + off.y, block.z + off.z);
                    if (nb && (Array.isArray(rule.targetBlock) ? rule.targetBlock.includes(nb.typeId) : nb.typeId === rule.targetBlock)) {
                        if (rule.action === "transformTarget") { dimension.fillBlocks(new BlockVolume(nb.location, nb.location), rule.resultBlock); triggered = true; }
                        else if (rule.action === "transformSelf") { triggered = true; break; }
                    }
                }
                if (triggered) {
                    changesHappened = true;
                    if (rule.sound) dimension.playSound(rule.sound, block.location, { volume: 0.5, pitch: 1 });
                    if (rule.action === "transformSelf") { dimension.fillBlocks(new BlockVolume(block.location, block.location), rule.resultBlock); return true; }
                }
            }
        }
    }

    // 1:1 BURNT: Tag-based parent validation
    // Stage 1 needs "template_full" (source/_down), stage 2 needs "template1", stage 3 needs "template2"
    let requiredParentTag = "";
    if (currentStage === 1) requiredParentTag = "template_full";
    else if (currentStage === 2) requiredParentTag = "template1";
    else if (currentStage === 3) requiredParentTag = "template2";

    // 1:1 BURNT: Merge Logic — flowing block under another flowing/_down block becomes _down
    if (currentStage > 0) {
        const above = getCachedBlock(dimension, block.location.x, block.location.y + 1, block.location.z);
        if (above) {
            const aboveId = above.typeId;
            const isAboveDown = (aboveId === baseId + "_down");
            const isAboveHalf = (aboveId === baseId + "1" || aboveId === baseId + "2" || aboveId === baseId + "3");
            if (isAboveDown || isAboveHalf) {
                if (block.isValid) {
                    dimension.fillBlocks(new BlockVolume(block.location, block.location), BlockPermutation.resolve(baseId + "_down"));
                    changesHappened = true;
                }
                return changesHappened;
            }
        }
    }

    // 1:1 BURNT: Parent validation — NO escape hatches, NO source-as-universal-parent
    if (currentStage > 0) {
        let hasParent = false;
        for (const dir of DIRECTIONS) {
            const neighbor = getCachedBlock(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z);
            if (neighbor && neighbor.hasTag(requiredParentTag)) {
                hasParent = true;
                break;
            }
        }
        if (!hasParent) {
            if (block.isValid) {
                dimension.fillBlocks(new BlockVolume(block.location, block.location), "minecraft:air");
                changesHappened = true;
            }
            return changesHappened;
        }
    } else if (currentStage === -1) {
        // 1:1 BURNT: _down blocks must have valid fluid above them
        const above = getCachedBlock(dimension, block.location.x, block.location.y + 1, block.location.z);
        if (!above) {
            if (block.isValid) {
                dimension.fillBlocks(new BlockVolume(block.location, block.location), "minecraft:air");
                changesHappened = true;
            }
            return changesHappened;
        }
        const aboveId = above.typeId;
        const validAbove = [baseId, baseId + "_down", baseId + "1", baseId + "2", baseId + "3"];
        if (!validAbove.includes(aboveId)) {
            if (block.isValid) {
                dimension.fillBlocks(new BlockVolume(block.location, block.location), "minecraft:air");
                changesHappened = true;
            }
            return changesHappened;
        }
    }

    if (currentStage <= 0) {
        const states = block.permutation.getAllStates();
        let changedStates = false;
        const neighbors = [
            { x: 1, y: 0, z: 0, state: "gaiadimension:x" },
            { x: -1, y: 0, z: 0, state: "gaiadimension:nx" },
            { x: 0, y: 0, z: 1, state: "gaiadimension:z" },
            { x: 0, y: 0, z: -1, state: "gaiadimension:nz" },
            { x: 0, y: 1, z: 0, state: "gaiadimension:top" },
            { x: 0, y: -1, z: 0, state: "gaiadimension:bottom" }
        ];

        for (const nbDef of neighbors) {
            const nb = getCachedBlock(dimension, block.x + nbDef.x, block.y + nbDef.y, block.z + nbDef.z);
            const isFluid = nb && (nb.typeId.startsWith(baseId) || nb.isLiquid);
            const newState = isFluid ? 1 : 0;
            if (states[nbDef.state] !== newState) {
                states[nbDef.state] = newState;
                changedStates = true;
            }
        }

        if (changedStates) {
            dimension.fillBlocks(new BlockVolume(block.location, block.location), BlockPermutation.resolve(block.typeId, states));
            // Visual changes do not wake neighbors
        }
    }

    const below = getCachedBlock(dimension, block.location.x, block.location.y - 1, block.location.z);
    let flowedDown = false;
    if (below && isReplaceable(below)) { dimension.fillBlocks(new BlockVolume(below.location, below.location), baseId + "_down"); flowedDown = true; changesHappened = true; }
    else if (below && (below.typeId === baseId + "_down" || below.typeId === baseId)) flowedDown = true;

    const maxStages = 3; // 1:1 Burnt: all fluids have exactly 3 flowing stages
    // Flow Sideways
    // 1:1 JAVA LOGIC: Flowing blocks skip horizontal spread if they flow down (The Pillar Fix)
    const canSpread = (currentStage === 0) ||
        (currentStage === -1 && !flowedDown) ||
        (currentStage > 0 && !flowedDown && currentStage < maxStages);

    if (canSpread) {
        if (!template) return changesHappened;
        const nextStageNum = currentStage <= 0 ? 1 : currentStage + 1;
        const nextStageId = (currentStage === 0 || currentStage === -1) ? baseId + "1" : baseId + (currentStage + 1).toString();

        // PERFORMANCE: Fast stability check — skip expensive BFS if no neighbor can be overwritten.
        // For worldgen lakes, 95%+ of source blocks are interior (surrounded by other water).
        // Each BFS call (getSlopeDistance × 4 directions) is extremely expensive; this avoids it entirely.
        let anyOverwritable = false;
        for (let i = 0; i < DIRECTIONS.length; i++) {
            const dir = DIRECTIONS[i];
            const neighbor = getCachedBlock(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z);
            if (neighbor) {
                if (isReplaceable(neighbor)) { anyOverwritable = true; break; }
                if (neighbor.typeId.startsWith(baseId)) {
                    const nInfo = getTypeInfo(neighbor.typeId);
                    if (nInfo.stage > 0 && nextStageNum < nInfo.stage) { anyOverwritable = true; break; }
                }
            }
        }

        if (anyOverwritable) {
            const maxSearch = template.slopeFindDistance;

            // 1:1 BURNT: Find the minimum distance to a drop-off among all directions
            let minDistance = 999;
            const distances: number[] = [];

            for (let i = 0; i < DIRECTIONS.length; i++) {
                const dir = DIRECTIONS[i];
                const dist = getSlopeDistance(dimension, block.location.x + dir.x, block.location.y, block.location.z + dir.z, maxSearch, baseId);
                distances[i] = dist;
                if (dist < minDistance) minDistance = dist;
            }

            for (let i = 0; i < DIRECTIONS.length; i++) {
                const dir = DIRECTIONS[i];
                // Only spread if this direction leads to the shortest path to a hole, 
                // or if no holes were found at all (in which case spread everywhere).
                if (minDistance < 999 && distances[i] > minDistance) continue;

                const nx = block.location.x + dir.x, ny = block.location.y, nz = block.location.z + dir.z;
                const neighbor = getCachedBlock(dimension, nx, ny, nz);
                if (neighbor) {
                    let canOverwrite = false;

                    if (isReplaceable(neighbor)) {
                        canOverwrite = true;
                    } else if (neighbor.typeId.startsWith(baseId)) {
                        const nInfo = getTypeInfo(neighbor.typeId);
                        const neighborStage = nInfo.stage;

                        // Rules:
                        // 1. Cannot overwrite Source (0) or Down (-1) with horizontal flow (1,2,3).
                        // 2. Can overwrite if nextStageNum < neighborStage.
                        if (neighborStage > 0 && nextStageNum < neighborStage) {
                            canOverwrite = true;
                        }
                    }

                    if (canOverwrite) {
                        if (neighbor.isValid) {
                            let dirState = 0;
                            if (dir.z === -1) dirState = 1;
                            else if (dir.x === 1) dirState = 7;
                            else if (dir.z === 1) dirState = 5;
                            else if (dir.x === -1) dirState = 3;

                            const perm = BlockPermutation.resolve(nextStageId, { "gaiadimension:flow_dir": dirState });
                            dimension.fillBlocks(new BlockVolume(neighbor.location, neighbor.location), perm);
                            PENDING_BLOCKS.set(`${neighbor.location.x},${neighbor.location.y},${neighbor.location.z},${dimension.id}`, { block: neighbor, dimension, scheduledTick: system.currentTick + (template?.spreadDelay ?? 5) });
                            changesHappened = true;
                        }
                    }
                }
            }
        }
    }
    
    if (currentStage > 0) {
        let flowX = 0;
        let flowZ = 0;

        for (const dir of DIRECTIONS) {
            const neighbor = getCachedBlock(dimension, block.x + dir.x, block.y, block.z + dir.z);
            if (!neighbor) continue;

            let nLevel = -999;
            if (neighbor.typeId.startsWith(baseId)) {
                const nInfo = getTypeInfo(neighbor.typeId);
                nLevel = nInfo.stage === -1 ? 0 : nInfo.stage;
            } else {
                // If it's not fluid, check if it's a hole. True drops pull flow visually!
                const below = getCachedBlock(dimension, neighbor.x, neighbor.y - 1, neighbor.z);
                if (isReplaceable(neighbor) && below && isReplaceable(below)) {
                    nLevel = 99; // Drop-off strongly pulls flow
                } else {
                    continue; // Flat air or solid blocks DO NOT pull flow! (This prevents diagonal twisting and wall-facing flows)
                }
            }

            if (nLevel < currentStage) {
                // Lower stage = source/shallower = flow AWAY from it (outward)
                flowX -= dir.x;
                flowZ -= dir.z;
            } else if (nLevel > currentStage) {
                // Higher stage = deeper / drop-off = flow TOWARD it (downhill)
                flowX += dir.x;
                flowZ += dir.z;
            }
        }

        flowX = flowX > 0 ? 1 : (flowX < 0 ? -1 : 0);
        flowZ = flowZ > 0 ? 1 : (flowZ < 0 ? -1 : 0);

        let dirState: number;
        if (flowX === 0 && flowZ === 0) {
            // Vector cancelled (corner block with equal-level neighbours on both sides).
            // Preserve whatever dirState was stamped on first spread — do NOT overwrite.
            dirState = (block.permutation.getAllStates()["gaiadimension:flow_dir"] as number) ?? 0;
        } else if (flowX === 0 && flowZ === -1) dirState = 1; // N
        else if (flowX === -1 && flowZ === -1) dirState = 2; // NW
        else if (flowX === -1 && flowZ === 0) dirState = 3; // W
        else if (flowX === -1 && flowZ === 1) dirState = 4; // SW
        else if (flowX === 0 && flowZ === 1) dirState = 5; // S
        else if (flowX === 1 && flowZ === 1) dirState = 6; // SE
        else if (flowX === 1 && flowZ === 0) dirState = 7; // E
        else if (flowX === 1 && flowZ === -1) dirState = 8; // NE
        else dirState = 0;

        const perms = block.permutation.getAllStates();
        if (perms["gaiadimension:flow_dir"] !== dirState) {
            perms["gaiadimension:flow_dir"] = dirState;
            dimension.fillBlocks(new BlockVolume(block.location, block.location), BlockPermutation.resolve(typeId, perms));
            changesHappened = true;
        }
    }
    return changesHappened;
}

export class BucketItemComponent implements ItemCustomComponent {
    onUse(event: ItemComponentUseEvent): void {
        const { source, itemStack } = event;
        if (!source || !(source instanceof Player) || !itemStack || itemStack.typeId !== "minecraft:bucket") return;
        const player = source as Player;
        const viewVec = player.getViewDirection();
        const headLoc = player.getHeadLocation();
        const dimension = player.dimension;
        for (let d = 1; d <= 5; d++) {
            const checkPos = { x: headLoc.x + viewVec.x * d, y: headLoc.y + viewVec.y * d, z: headLoc.z + viewVec.z * d };
            const block = getCachedBlock(dimension, checkPos.x, checkPos.y, checkPos.z);
            if (block && fluidIDs.has(block.typeId)) {
                const info = getTypeInfo(block.typeId);
                if (info.stage !== 0) continue;
                const bucketId = info.baseId + "_bucket";
                const filledBucket = new ItemStack(bucketId, 1);
                const inventory = player.getComponent("inventory")?.container;
                if (inventory) {
                    const slot = player.selectedSlotIndex;
                    if (itemStack.amount > 1) { itemStack.amount--; inventory.setItem(slot, itemStack); const remainder = inventory.addItem(filledBucket); if (remainder) dimension.spawnItem(remainder, player.location); }
                    else inventory.setItem(slot, filledBucket);
                }
                const isHot = block.typeId.includes("magma") || block.typeId.includes("bismuth");
                dimension.playSound(isHot ? "bucket.fill_lava" : "bucket.fill_water", block.location);
                block.setType("minecraft:air");
                wakeNeighbors(block.location, dimension);
                return;
            }
            if (block && !block.isAir && !isReplaceable(block)) break;
        }
    }
    onUseOn(event: ItemComponentUseOnEvent): void {
        const { source, block, itemStack, blockFace } = event;
        if (!itemStack || !source || !(source instanceof Player)) return;
        const player = source as Player;
        const fluidId = itemStack.typeId.replace("_bucket", "");
        if (!fluidIDs.has(fluidId)) return;
        const targetLoc = block.location;
        const offset = { x: 0, y: 0, z: 0 };
        if (blockFace === "Up") offset.y = 1; else if (blockFace === "Down") offset.y = -1; else if (blockFace === "North") offset.z = -1; else if (blockFace === "South") offset.z = 1; else if (blockFace === "West") offset.x = -1; else if (blockFace === "East") offset.x = 1;
        const finalLoc = { x: targetLoc.x + offset.x, y: targetLoc.y + offset.y, z: targetLoc.z + offset.z };
        const dimension = player.dimension;
        const targetBlock = dimension.getBlock(finalLoc);
        if (targetBlock && (targetBlock.isAir || isReplaceable(targetBlock))) {
            targetBlock.setPermutation(BlockPermutation.resolve(fluidId));
            wakeNeighbors(targetBlock.location, dimension);
            const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
            player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water", { pitch: 1, volume: 1 });
            if (player.getGameMode() !== GameMode.Creative) {
                const container = player.getComponent("inventory")?.container;
                if (container) { const slot = player.selectedSlotIndex; if (itemStack.amount > 1) { itemStack.amount--; container.setItem(slot, itemStack); const emptyBucket = new ItemStack("minecraft:bucket", 1); const remainder = container.addItem(emptyBucket); if (remainder) dimension.spawnItem(remainder, player.location); } else container.setItem(slot, new ItemStack("minecraft:bucket", 1)); }
            }
        }
    }
}

export class FluidFlowComponent implements BlockCustomComponent {
    constructor() { this.onTick = this.onTick.bind(this); this.onPlayerDestroy = this.onPlayerDestroy.bind(this); }
    onPlayerDestroy(event: BlockComponentPlayerDestroyEvent): void { wakeNeighbors(event.block.location, event.dimension); }
    onTick(event: BlockComponentTickEvent): void {
        if (PENDING_BLOCKS.size >= MAX_QUEUE_SIZE) return;
        const { block } = event;
        const key = `${block.x},${block.y},${block.z},${block.dimension.id}`;
        // PERFORMANCE: Skip blocks already marked stable (no changes on last process)
        if (STABLE_BLOCKS.has(key)) return;
        if (!PENDING_BLOCKS.has(key)) {
            let delay = 5;
            const info = getTypeInfo(block.typeId);
            const template = idToTemplate.get(info.baseId);
            if (template) delay = template.spreadDelay;
            PENDING_BLOCKS.set(key, { block, dimension: block.dimension, scheduledTick: system.currentTick + delay });
        }
    }
}

function wakeNeighbors(location: Vector3, dimension: Dimension): void {
    const { x, y, z } = location;
    const centerBlock = getCachedBlock(dimension, x, y, z);
    if (!centerBlock) return;
    let delay = 5;
    const info = getTypeInfo(centerBlock.typeId);
    const template = idToTemplate.get(info.baseId);
    if (template) delay = template.spreadDelay;
    const locations = [{x:0,y:1,z:0},{x:0,y:-1,z:0},{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}];
    const scheduledTick = system.currentTick + delay;
    for (const offset of locations) {
        const nx = x + offset.x, ny = y + offset.y, nz = z + offset.z;
        const key = `${nx},${ny},${nz},${dimension.id}`;
        // Clear stability flag so this block gets re-evaluated
        STABLE_BLOCKS.delete(key);
        if (!PENDING_BLOCKS.has(key)) {
            const neighbor = getCachedBlock(dimension, nx, ny, nz);
            if (neighbor && neighbor.isValid && fluidIDs.has(neighbor.typeId)) PENDING_BLOCKS.set(key, { block: neighbor, dimension, scheduledTick });
        }
    }
}

world.afterEvents.playerPlaceBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));
world.afterEvents.playerBreakBlock.subscribe((e) => wakeNeighbors(e.block.location, e.block.dimension));

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block, itemStack } = event;
    if (!itemStack || !itemStack.typeId.startsWith("gaiadimension:") || !itemStack.typeId.endsWith("_bucket")) return;
    const fluidId = itemStack.typeId.replace("_bucket", "");
    const isFlowingVariant = (blk: Block) => blk.typeId.startsWith(fluidId) && (blk.typeId.endsWith("_down") || /\d+$/.test(blk.typeId));
    if (isFlowingVariant(block)) {
        event.cancel = true;
        system.run(() => {
            if (block.isValid) {
                block.setPermutation(BlockPermutation.resolve(fluidId));
                wakeNeighbors(block.location, block.dimension);
                const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
                player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water", { pitch: 1, volume: 1 });
                if (player.getGameMode() !== GameMode.Creative) {
                    const container = player.getComponent("inventory")?.container;
                    if (container) {
                        const slot = player.selectedSlotIndex;
                        const currentItem = container.getItem(slot);
                        if (currentItem && currentItem.typeId === itemStack.typeId) {
                            if (currentItem.amount > 1) { currentItem.amount--; container.setItem(slot, currentItem); const emptyBucket = new ItemStack("minecraft:bucket", 1); const remainder = container.addItem(emptyBucket); if (remainder) player.dimension.spawnItem(remainder, player.location); }
                            else container.setItem(slot, new ItemStack("minecraft:bucket", 1));
                        }
                    }
                }
            }
        });
        return;
    }
});

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target, itemStack } = event;
    if (target.typeId !== "gaiadimension:fluid_interaction_dummy" || !(player instanceof Player)) return;
    const dimension = player.dimension;
    const location = { x: Math.floor(target.location.x), y: Math.floor(target.location.y), z: Math.floor(target.location.z) };
    const fluidBlock = getCachedBlock(dimension, location.x, location.y, location.z);
    if (!fluidBlock || !fluidIDs.has(fluidBlock.typeId)) return;

    if (itemStack?.typeId === "minecraft:bucket") {
        const info = getTypeInfo(fluidBlock.typeId);
        if (info.stage === 0) {
            const bucketId = info.baseId + "_bucket", filledBucket = new ItemStack(bucketId, 1);
            const inventory = player.getComponent("inventory")?.container;
            if (inventory) {
                const slot = player.selectedSlotIndex;
                if (itemStack.amount > 1) { itemStack.amount--; inventory.setItem(slot, itemStack); const remainder = inventory.addItem(filledBucket); if (remainder) dimension.spawnItem(remainder, player.location); }
                else inventory.setItem(slot, filledBucket);
            }
            const isHot = fluidBlock.typeId.includes("magma") || fluidBlock.typeId.includes("bismuth");
            dimension.playSound(isHot ? "bucket.fill_lava" : "bucket.fill_water", location);
            dimension.fillBlocks(new BlockVolume(location, location), "minecraft:air");
            wakeNeighbors(location, dimension);
        }
        return;
    }

    if (itemStack) {
        const fluidId = itemStack.typeId.replace("_bucket", "");
        if (fluidIDs.has(fluidId)) {
            const viewVec = player.getViewDirection();
            const absX = Math.abs(viewVec.x), absY = Math.abs(viewVec.y), absZ = Math.abs(viewVec.z);
            let offset = { x: 0, y: 0, z: 0 };
            if (absY > absX && absY > absZ) offset.y = viewVec.y > 0 ? 1 : -1; else if (absX > absZ) offset.x = viewVec.x > 0 ? 1 : -1; else offset.z = viewVec.z > 0 ? 1 : -1;
            const placeLoc = { x: location.x + offset.x, y: location.y + offset.y, z: location.z + offset.z };
            const targetBlock = dimension.getBlock(placeLoc);
            if (targetBlock && (targetBlock.isAir || isReplaceable(targetBlock))) {
                dimension.fillBlocks(new BlockVolume(placeLoc, placeLoc), fluidId);
                wakeNeighbors(placeLoc, dimension);
                const isHot = fluidId.includes("magma") || fluidId.includes("bismuth");
                player.playSound(isHot ? "bucket.empty_lava" : "bucket.empty_water");
                if (player.getGameMode() !== GameMode.Creative) {
                    const inventory = player.getComponent("inventory")?.container;
                    if (inventory) { const slot = player.selectedSlotIndex; if (itemStack.amount > 1) { itemStack.amount--; inventory.setItem(slot, itemStack); const emptyBucket = new ItemStack("minecraft:bucket", 1); const remainder = inventory.addItem(emptyBucket); if (remainder) dimension.spawnItem(remainder, player.location); } else inventory.setItem(slot, new ItemStack("minecraft:bucket", 1)); }
                }
            }
        } else {
            try {
                const perm = BlockPermutation.resolve(itemStack.typeId);
                if (perm) { dimension.fillBlocks(new BlockVolume(location, location), perm); player.playSound("stone.dig", { location: location }); if (player.getGameMode() !== GameMode.Creative) { const inventory = player.getComponent("inventory")?.container; if (inventory) { const slot = player.selectedSlotIndex; if (itemStack.amount > 1) { itemStack.amount--; inventory.setItem(slot, itemStack); } else inventory.setItem(slot, undefined); } } wakeNeighbors(location, dimension); }
            } catch {}
        }
    }
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const container = player.getComponent("inventory")?.container;
        if (!container) continue;
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item) continue;
            if (item.typeId === "gaiadimension:tar_cauldron") { try { container.setItem(i, new ItemStack("minecraft:cauldron", item.amount)); } catch (e) {} continue; }
            if (fluidIDs.has(item.typeId)) { let baseId = item.typeId; if (baseId.endsWith("_down")) baseId = baseId.slice(0, -5); else { const m = baseId.match(/(\d+)$/); if (m) baseId = baseId.slice(0, -m[1].length); } try { container.setItem(i, new ItemStack(baseId + "_bucket", item.amount)); } catch (e) {} }
        }
    }
}, 80);

export function registerFluidComponent({ blockComponentRegistry }: { blockComponentRegistry: BlockComponentRegistry }): void {
    blockComponentRegistry.registerCustomComponent("gaiadimension:fluid_flow", new FluidFlowComponent());
}
