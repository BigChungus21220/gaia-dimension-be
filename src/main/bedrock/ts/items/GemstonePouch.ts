import { world, system, Player, Entity, ItemStack, EntityInventoryComponent, Container, EquipmentSlot } from "@minecraft/server";

// §-encoded routing name for chest_screen matching: "gem_pouch" → "§g§e§m§_§p§o§u§c§h"
const UI_ROUTING_NAME = `§${"gem_pouch".split('').join('§')}`;

// Allowed gems (tag: gem_pouch_items in Java)
const ALLOWED_GEMS = new Set([
    "gaiadimension:sugilite", "gaiadimension:hematite", "gaiadimension:cinnabar",
    "gaiadimension:labradorite", "gaiadimension:moonstone", "gaiadimension:red_opal",
    "gaiadimension:blue_opal", "gaiadimension:green_opal", "gaiadimension:white_opal",
    "gaiadimension:stibnite", "gaiadimension:proustite", "gaiadimension:euclase",
    "gaiadimension:albite", "gaiadimension:carnelian", "gaiadimension:benitoite",
    "gaiadimension:diopside", "gaiadimension:goshenite", "gaiadimension:pyrite",
    "gaiadimension:tektite", "gaiadimension:goldstone", "gaiadimension:aura_cluster",
    "gaiadimension:bismuth_crystal", "gaiadimension:opalite", "gaiadimension:celestine"
]);

const MAX_STACK_PER_SLOT = 16;
const POUCH_ENTITY_ID = "gaiadimension:gem_pouch_container";

// Track active pouch entities per player
const activePouches: Map<string, { entity: Entity, pouchId: string }> = new Map();

// Track which players were crouching last check (to detect crouch START)
const wasCrouching: Set<string> = new Set();

// Cooldown to prevent rapid spawning
const spawnCooldown: Map<string, number> = new Map();

// ── Persistence ─────────────────────────────────────────────────────

interface SerializedSlot {
    slot: number;
    typeId: string;
    amount: number;
}

function getPouchId(itemStack: ItemStack): string {
    const lore = itemStack.getLore();
    for (const line of lore) {
        if (line.startsWith("§r§0pouch:")) {
            return line.substring("§r§0pouch:".length);
        }
    }
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newLore = [...lore, `§r§0pouch:${id}`];
    itemStack.setLore(newLore);
    return id;
}

function savePouchContents(pouchId: string, container: Container): void {
    const slots: SerializedSlot[] = [];
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item) {
            slots.push({ slot: i, typeId: item.typeId, amount: item.amount });
        }
    }
    world.setDynamicProperty(`pouch:${pouchId}`, JSON.stringify(slots));
}

function loadPouchContents(pouchId: string, container: Container): void {
    const data = world.getDynamicProperty(`pouch:${pouchId}`) as string | undefined;
    if (!data) return;
    
    try {
        const slots: SerializedSlot[] = JSON.parse(data);
        for (const slot of slots) {
            try {
                container.setItem(slot.slot, new ItemStack(slot.typeId, slot.amount));
            } catch (e) {}
        }
    } catch (e) {
        console.warn(`[GemPouch] Failed to load pouch ${pouchId}: ${e}`);
    }
}

function cleanupPouch(playerId: string): void {
    const pouch = activePouches.get(playerId);
    if (!pouch) return;
    
    try {
        const invComp = pouch.entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
        if (invComp && invComp.container) {
            savePouchContents(pouch.pouchId, invComp.container);
        }
        if (pouch.entity.isValid) pouch.entity.remove();
    } catch (e) {
        console.warn(`[GemPouch] Error cleaning up pouch entity: ${e}`);
    }
    activePouches.delete(playerId);
}

// ── Crouch Detection ────────────────────────────────────────────────

system.runInterval(() => {
    const currentTick = (system as any).currentTick || 0;
    
    for (const player of world.getAllPlayers()) {
        try {
            const isCrouching = player.isSneaking;
            const pid = player.id;
            const wasAlready = wasCrouching.has(pid);
            
            if (isCrouching && !wasAlready) {
                // Player just started crouching
                wasCrouching.add(pid);
                
                // Check cooldown
                const lastSpawn = spawnCooldown.get(pid) || 0;
                if (currentTick - lastSpawn < 40) continue; // 2 second cooldown
                
                // Already has an active pouch?
                if (activePouches.has(pid)) continue;
                
                // Check if holding gem pouch
                const equippable = player.getComponent("minecraft:equippable") as any;
                if (!equippable) continue;
                
                const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand) as ItemStack | undefined;
                if (!mainhand || mainhand.typeId !== "gaiadimension:gem_pouch") continue;
                
                // Get or create pouch ID
                const pouchId = getPouchId(mainhand);
                // Write updated item back (with pouch ID in lore)
                equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
                
                spawnCooldown.set(pid, currentTick);
                
                // Spawn entity next tick
                const playerRef = player;
                system.run(() => {
                    try {
                        if (!playerRef.isValid) return;
                        
                        const loc = playerRef.location;
                        const entity = playerRef.dimension.spawnEntity(POUCH_ENTITY_ID, {
                            x: loc.x,
                            y: loc.y,
                            z: loc.z
                        });
                        
                        // Set nameTag for UI routing IMMEDIATELY
                        entity.nameTag = UI_ROUTING_NAME;
                        entity.setDynamicProperty("pouchId", pouchId);
                        entity.setDynamicProperty("ownerId", pid);
                        
                        // Load saved contents
                        const invComp = entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
                        if (invComp && invComp.container) {
                            loadPouchContents(pouchId, invComp.container);
                        }
                        
                        activePouches.set(pid, { entity, pouchId });
                        console.warn(`[GemPouch] Spawned pouch entity for ${pid}, nameTag=${entity.nameTag}`);
                    } catch (e) {
                        console.warn(`[GemPouch] Failed to spawn: ${e}`);
                    }
                });
                
            } else if (!isCrouching && wasAlready) {
                wasCrouching.delete(pid);
            }
        } catch (e) {}
    }
}, 2);

// ── Pouch Entity Monitor (save & despawn when player walks away) ────

system.runInterval(() => {
    for (const [playerId, pouch] of activePouches) {
        const { entity, pouchId } = pouch;
        
        if (!entity || !entity.isValid) {
            activePouches.delete(playerId);
            continue;
        }

        let playerNearby = false;
        try {
            for (const player of world.getAllPlayers()) {
                if (player.id === playerId) {
                    const dx = player.location.x - entity.location.x;
                    const dy = player.location.y - entity.location.y;
                    const dz = player.location.z - entity.location.z;
                    if (dx * dx + dy * dy + dz * dz < 64) { // 8 blocks
                        playerNearby = true;
                    }
                    break;
                }
            }
        } catch (e) {}

        if (!playerNearby) {
            cleanupPouch(playerId);
        }
    }
}, 20);

// ── Item Filter ─────────────────────────────────────────────────────

system.runInterval(() => {
    for (const [playerId, pouch] of activePouches) {
        const { entity } = pouch;
        if (!entity || !entity.isValid) continue;
        
        try {
            const invComp = entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
            if (!invComp || !invComp.container) continue;
            const container = invComp.container;
            
            for (let i = 0; i < container.size; i++) {
                const item = container.getItem(i);
                if (!item) continue;
                
                if (!ALLOWED_GEMS.has(item.typeId)) {
                    container.setItem(i, undefined);
                    try {
                        for (const player of world.getAllPlayers()) {
                            if (player.id === playerId) {
                                const pInv = (player.getComponent("minecraft:inventory") as EntityInventoryComponent)?.container;
                                if (pInv) {
                                    for (let j = 0; j < pInv.size; j++) {
                                        if (!pInv.getItem(j)) { pInv.setItem(j, item); break; }
                                    }
                                }
                                break;
                            }
                        }
                    } catch (e) {}
                }
                
                if (item.amount > MAX_STACK_PER_SLOT) {
                    const overflow = item.amount - MAX_STACK_PER_SLOT;
                    container.setItem(i, new ItemStack(item.typeId, MAX_STACK_PER_SLOT));
                    try {
                        const overflowItem = new ItemStack(item.typeId, overflow);
                        for (const player of world.getAllPlayers()) {
                            if (player.id === playerId) {
                                const pInv = (player.getComponent("minecraft:inventory") as EntityInventoryComponent)?.container;
                                if (pInv) {
                                    for (let j = 0; j < pInv.size; j++) {
                                        if (!pInv.getItem(j)) { pInv.setItem(j, overflowItem); break; }
                                    }
                                }
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }
}, 5);

// ── Player leave cleanup ────────────────────────────────────────────

(world.afterEvents as any).playerLeave?.subscribe((event: any) => {
    cleanupPouch(event.playerId);
});
