import { world, system } from "@minecraft/server";
import { Vec3 } from "./Vec3";
import { EnchantmentWrapper } from "./data/EnchantWrapper";

export class PouchManager {
  constructor() {
    this.forbiddenItems = ["shulker"];
    this.playerPropertiesCache = new Map();
  }

  setup() {
    system.beforeEvents.watchdogTerminate.subscribe(e => { e.cancel = true; });
    system.runTimeout(() => this.runIntervals(), 60);
  }

  runIntervals() {
    system.runInterval(() => this.checkItemChanges(), 1);
  }

  checkItemChanges() {
    for (const player of world.getAllPlayers()) {
      const prev = this.getPropertyJson(player);
      const inv = player.getComponent("inventory").container;
      const slot = player.selectedSlot;
      const item = inv.getItem(slot);
      const iface = {
        item: item?.typeId,
        slot,
        id: item?.getLore()?.[0]
      };
      const prevProp = player.getDynamicProperty("playerHeldItemStatus");
      if (prevProp !== undefined && JSON.stringify(iface) !== prevProp) {
        this.onChanged(player, inv, iface, prev);
      }
      player.setDynamicProperty("playerHeldItemStatus", JSON.stringify(iface));
      if (item?.typeId.includes("gaia:gem_pouch") && iface.id) {
        this.adjustPouchEntity(player, iface.id);
      }
    }
  }

  getPropertyJson(player) {
    if (this.playerPropertiesCache.has(player)) {
      return this.playerPropertiesCache.get(player);
    }
    const prop = player.getDynamicProperty("playerHeldItemStatus");
    const data = prop ? JSON.parse(prop) : { item: undefined, slot: player.selectedSlot, id: undefined };
    this.playerPropertiesCache.set(player, data);
    return data;
  }

  adjustPouchEntity(player, pouchId) {
    for (const ent of player.dimension.getEntities({ tags: [pouchId] })) {
      const loc = Vec3.from(ent.location).add(Vec3(0, 1.5, 0));
      ent.teleport(loc);
    }
  }

  onChanged(player, inv, cur, old) {
    const currentItem = inv.getItem(cur.slot);
    if (currentItem) {
      if (currentItem.typeId.includes("gaia:gem_pouch")) {
        this.adjustGemPouch(currentItem, player, old);
      } else {
        this.adjustNonPouchEntity(player, old);
      }
    } else if (old.id) {
      this.adjustNonPouchEntity(player, old);
    }
  }

  adjustGemPouch(item, player, old) {
    const lore = item.getLore();
    if (lore.length === 0) {
      this.createPouch(item, player);
    } else {
      for (const ent of player.dimension.getEntities({ tags: [old.id] })) {
        this.closePouch(ent, player, old);
      }
      this.openPouch(player, item);
    }
  }

  createPouch(item, player) {
    const inv = player.getComponent("inventory").container;
    const id = `gempouch_id:${Math.floor(Math.random() * 9999)}`;
    item.setLore([id]);
    inv.setItem(player.selectedSlot, item);
    const ent = player.dimension.spawnEntity("gaia:gem_pouch_container", player.location);
    ent.triggerEvent(EnchantmentWrapper.pouchType(item));
    ent.addTag(id);
    ent.nameTag = this.pouchName(item);
  }

  adjustNonPouchEntity(player, old) {
    for (const ent of player.dimension.getEntities({ tags: [old.id] })) {
      const bagInv = ent.getComponent("inventory").container;
      for (let i = 0; i < bagInv.size; i++) {
        const it = bagInv.getItem(i);
        if (it && this.forbiddenItems.some(f => it.typeId.includes(f))) {
          ent.dimension.spawnItem(it, ent.location);
          bagInv.setItem(i, undefined);
        }
      }
      this.closePouch(ent, player, old);
    }
  }

  closePouch(ent, player, old) {
    const hidden = Vec3.from(ent.location);
    hidden.y = -64;
    ent.teleport(hidden);
    let newLore = [];
    for (const pe of player.dimension.getEntities({ tags: [old.id] })) {
      newLore = this.recordItems(old.id, pe.getComponent("inventory").container);
    }
    const inv = player.getComponent("inventory").container;
    const hold = inv.getItem(old.slot);
    hold.setLore(newLore);
    inv.setItem(old.slot, hold);
  }

  recordItems(id, inv) {
    let count = 0, overflow = 0, backup = [], lore = [id];
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (!it) continue;
      if (this.forbiddenItems.some(f => it.typeId.includes(f))) {
        inv.setItem(i, undefined);
        continue;
      }
      backup.push(this.getItemProperties(it));
      const nameParts = it.typeId.split(":")[1].split("_").map(p => p.charAt(0).toUpperCase() + p.slice(1));
      const name = nameParts.join(" ");
      if (count < 5) lore.push(`§7${name}x${it.amount}`);
      else overflow++;
      count++;
    }
    if (overflow) lore.push(`§7and ${overflow} more...`);
    world.setDynamicProperty(id, JSON.stringify(backup));
    return lore;
  }

  getItemProperties(item) {
    const ench = new EnchantmentWrapper(item).getEnchantments().map(e => ({ name: e.type, level: e.level }));
    return {
      id: item.typeId,
      amount: item.amount,
      durability: item.hasComponent("durability") ? item.getComponent("durability").damage : undefined,
      lore: item.getLore().length ? item.getLore() : undefined,
      enchant: ench.length ? ench : undefined,
      name: item.nameTag || undefined
    };
  }
}

const pouchManager = new PouchManager();
pouchManager.setup();
