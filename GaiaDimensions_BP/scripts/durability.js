import { system } from "@minecraft/server";

export function registerCustomTool() {
    system.beforeEvents.startup.subscribe((event) => {
        event.itemComponentRegistry.registerCustomComponent('compycraft_era:durability', {
            onUseOn(e, params) {
                const { source, itemStack, block } = e;
                if (!itemStack.hasTag('minecraft:is_axe')) return;
                const typeId = block.typeId;
                const isWood = typeId.includes('wood') || typeId.includes('log') || typeId.includes('hyphae') || typeId.includes('minecraft:');
                if (!isWood) return;
                source.playSound('use.wood', { location: block.location });
                if (source.getGameMode() === 'creative') return;
                const stripDamage = params.stripDamage !== undefined ? params.stripDamage : 1;
                applyCustomDamage(source, itemStack, stripDamage);
            },
            onMineBlock(e, params) {
                const { source, itemStack } = e;
                if (source.getGameMode() === 'creative') return;
                const mineDamage = params.mineDamage !== undefined ? params.mineDamage : 1;
                applyCustomDamage(source, itemStack, mineDamage);
            }
        });
    });
}

function applyCustomDamage(player, itemStack, damageAmount) {
    const durability = itemStack.getComponent('minecraft:durability');
    if (!durability) return;

    const enchantable = itemStack.getComponent('minecraft:enchantable');
    const unbreakingLevel = enchantable ? enchantable.getEnchantment('unbreaking')?.level || 0 : 0;

    // Unbreaking logic: Chance to ignore damage = 1 / (level + 1)
    const chance = 1 / (unbreakingLevel + 1);

    // If random value is greater than chance, damage is ignored (Unbreaking took effect)
    if (Math.random() > chance) return;

    const equippable = player.getComponent('minecraft:equippable');
    const newDamage = durability.damage + damageAmount;

    if (newDamage >= durability.maxDurability) {
        // Item breaks
        equippable.setEquipment('Mainhand', undefined);
        player.playSound('random.break', { location: player.location });
    } else {
        // Apply damage
        durability.damage = newDamage;
        equippable.setEquipment('Mainhand', itemStack);
    }
}
