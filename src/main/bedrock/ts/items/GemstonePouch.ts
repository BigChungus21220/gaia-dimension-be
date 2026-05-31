import { world, system, Player, Entity, ItemStack, EntityInventoryComponent, Container, EquipmentSlot } from "@minecraft/server";
import { QIDB } from "../API/lib/QIDB.js";

// §-encoded routing name for chest_screen matching: "gem_pouch" -> "§g§e§m§_§p§o§u§c§h"
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

const MACHINE_ENTITY_TYPES = new Set([
    "gaiadimension:crude_storage_crate",
    "gaiadimension:mega_storage_crate",
    "luminiae_generic:block_entity",
    "luminiae_generic:block_entity_large"
]);

// Initialize QIDB database
const pouchDB = new QIDB("g_pouch", 50, 1);

// Track active pouches: playerId -> { entity, pouchId }
const activePouches: Map<string, { entity: Entity, pouchId: string }> = new Map();

function getPouchId(itemStack: ItemStack): string {
    const lore = itemStack.getLore();
    let existingId: string | null = null;
    let loreIndex = -1;
    for (let i = 0; i < lore.length; i++) {
        if (lore[i].startsWith("§r§0pouch:")) {
            existingId = lore[i].substring("§r§0pouch:".length);
            loreIndex = i;
            break;
        }
    }
    
    // If ID exists and is reasonably short (valid), return it
    if (existingId && existingId.length <= 12) {
        return existingId;
    }

    // Generate new short ID
    const id = Math.random().toString(36).substring(2, 10);
    const newLore = [...lore];
    if (loreIndex >= 0) {
        newLore[loreIndex] = `§r§0pouch:${id}`; // Replace long/invalid ID
    } else {
        newLore.push(`§r§0pouch:${id}`);
    }
    itemStack.setLore(newLore);
    return id;
}

function savePouchContents(pouchId: string, container: Container): void {
    const items: ItemStack[] = [];
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item) {
            items[i] = item;
        }
    }
    try {
        pouchDB.set(pouchId, items);
    } catch (e) {
        console.warn(`[GemPouch] Failed to save QIDB for ${pouchId}: ${e}`);
    }
}

function loadPouchContents(pouchId: string, container: Container): void {
    if (!pouchDB.has(pouchId)) return;
    try {
        const items = pouchDB.get(pouchId);
        if (Array.isArray(items)) {
            for (let i = 0; i < container.size; i++) {
                if (items[i]) {
                    container.setItem(i, items[i] as ItemStack);
                }
            }
        }
    } catch (e) {
        console.warn(`[GemPouch] Failed to load QIDB for ${pouchId}: ${e}`);
    }
}

function cleanupPouch(playerId: string): void {
    const pouch = activePouches.get(playerId);
    if (!pouch) return;
    
    try {
        if (pouch.entity.isValid) {
            const invComp = pouch.entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
            if (invComp && invComp.container) {
                savePouchContents(pouch.pouchId, invComp.container);
            }
            pouch.entity.remove();
        }
    } catch (e) {
        console.warn(`[GemPouch] Error cleaning up pouch entity: ${e}`);
    }
    activePouches.delete(playerId);
}

// ── Pouch Entity Tracker ────────────────────────────────────────────

const spawnCooldown: Map<string, number> = new Map();

world.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (itemStack.typeId !== "gaiadimension:gem_pouch") return;

    const pid = player.id;
    const currentTick = (system as any).currentTick || 0;
    const lastSpawn = spawnCooldown.get(pid) || 0;

    if (currentTick - lastSpawn < 10) return;
    spawnCooldown.set(pid, currentTick);

    system.run(() => {
        const pouch = activePouches.get(pid);
        if (pouch) cleanupPouch(pid);

        const pouchId = getPouchId(itemStack);
        const headLoc = player.getHeadLocation();
        const view = player.getViewDirection();
        const entity = player.dimension.spawnEntity(POUCH_ENTITY_ID, {
            x: headLoc.x + view.x * 1.5,
            y: headLoc.y + view.y * 1.5 - 1.25,
            z: headLoc.z + view.z * 1.5
        });

        entity.nameTag = UI_ROUTING_NAME;
        entity.setDynamicProperty("pouchId", pouchId);
        entity.setDynamicProperty("ownerId", pid);
        entity.addEffect("invisibility", 999999, { showParticles: false });

        const invComp = entity.getComponent("minecraft:inventory") as EntityInventoryComponent;
        if (invComp && invComp.container) {
            loadPouchContents(pouchId, invComp.container);
        }

        activePouches.set(pid, { entity, pouchId });
    });
});

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        try {
            const pid = player.id;
            const equippable = player.getComponent("minecraft:equippable") as any;
            if (!equippable) continue;
            
            const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand) as ItemStack | undefined;
            const isHoldingPouch = mainhand && mainhand.typeId === "gaiadimension:gem_pouch";
            
            const pouch = activePouches.get(pid);
            
            if (isHoldingPouch) {
                // Keep lore up to date
                const pouchId = getPouchId(mainhand);
                const currentLore = mainhand.getLore();
                if (!currentLore.some(l => l.startsWith("A rA 0pouch:"))) {
                    equippable.setEquipment(EquipmentSlot.Mainhand, mainhand);
                }
                
                // If they switched pouches while one was open, cleanup
                if (pouch && pouch.pouchId !== pouchId) {
                    cleanupPouch(pid);
                }
                
                // Cleanup if they walk too far from the stationary pouch
                if (pouch && pouch.entity.isValid) {
                    const dx = player.location.x - pouch.entity.location.x;
                    const dy = player.location.y - pouch.entity.location.y;
                    const dz = player.location.z - pouch.entity.location.z;
                    if (dx * dx + dy * dy + dz * dz > 64) {
                        cleanupPouch(pid);
                    }
                }
                
            } else {
                // Despawn & save instantly when unequipped
                if (pouch) {
                    cleanupPouch(pid);
                }
            }
        } catch (e) {
            console.warn(`[GemPouch] Error in tracker for ${player.name}: ${e}`);
        }
    }
}, 2);

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
