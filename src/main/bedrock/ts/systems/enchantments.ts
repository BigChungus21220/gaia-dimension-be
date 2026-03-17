import { enchantmentManager } from "../API/lib/EnchantmentLib.js";
import { world, EntityHitEntityAfterEvent, EntityHealthComponent } from "@minecraft/server";

// Register 'Life Steal'
enchantmentManager.register("gaia:life_steal", {
    name: "Life Steal",
    maxLevel: 3,
    appliesTo: ["sword", "axe"],
    costPerLevel: (lvl: number) => lvl * 5,
    onHit: (event: EntityHitEntityAfterEvent, level: number) => {
        const { damagingEntity } = event;
        if (!damagingEntity) return;
        // Heal 1 HP (0.5 hearts) per level
        const health = damagingEntity.getComponent("minecraft:health") as EntityHealthComponent;
        if (health) {
            health.setCurrentValue(Math.min(health.currentValue + level, health.effectiveMax));
        }
    }
});

// Register 'Thunder Strike'
enchantmentManager.register("gaia:thunder_strike", {
    name: "Thunder Strike",
    maxLevel: 1,
    appliesTo: ["sword", "trident"],
    costPerLevel: 10,
    onHit: (event: EntityHitEntityAfterEvent, level: number) => {
        const { hitEntity, damagingEntity } = event;
        if (!damagingEntity || !hitEntity) return;
        const dim = damagingEntity.dimension;
        // 20% chance
        if (Math.random() < 0.2) {
            dim.spawnEntity("minecraft:lightning_bolt", hitEntity.location);
        }
    }
});

