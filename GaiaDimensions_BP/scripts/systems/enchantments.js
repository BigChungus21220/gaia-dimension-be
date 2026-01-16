import { enchantmentManager } from "../API/lib/EnchantmentLib.js";
import { world } from "@minecraft/server";

// Register 'Life Steal'
enchantmentManager.register("gaia:life_steal", {
    name: "Life Steal",
    maxLevel: 3,
    appliesTo: ["sword", "axe"],
    costPerLevel: (lvl) => lvl * 5,
    onHit: (event, level) => {
        const { damagingEntity } = event;
        // Heal 1 HP (0.5 hearts) per level
        const health = damagingEntity.getComponent("minecraft:health");
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
    onHit: (event, level) => {
        const { hitEntity, damagingEntity } = event;
        const dim = damagingEntity.dimension;
        // 20% chance
        if (Math.random() < 0.2) {
            dim.spawnEntity("minecraft:lightning_bolt", hitEntity.location);
        }
    }
});
