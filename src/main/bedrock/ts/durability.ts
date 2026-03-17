import { system, Player, ItemStack } from "@minecraft/server";

export function registerCustomTool(): void {
    system.beforeEvents.startup.subscribe((event) => {
        // @ts-ignore
        event.itemComponentRegistry.registerCustomComponent('luminiae:durability', {
            onUseOn(e: any, params: any) {
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
            onMineBlock(e: any, params: any) {
                const { source, itemStack } = e;
                if (source.getGameMode() === 'creative') return;
                const mineDamage = params.mineDamage !== undefined ? params.mineDamage : 1;
                applyCustomDamage(source, itemStack, mineDamage);
            }
        });
    });
}

function applyCustomDamage(player: Player, itemStack: ItemStack, damageAmount: number): void {
    const durability = itemStack.getComponent('minecraft:durability') as any;
    if (!durability) return;

    const enchantable = itemStack.getComponent('minecraft:enchantable') as any;
    const unbreakingLevel = enchantable ? enchantable.getEnchantment('unbreaking')?.level || 0 : 0;

    // Unbreaking logic: Chance to ignore damage = 1 / (level + 1)
    const chance = 1 / (unbreakingLevel + 1);

    // If random value is greater than chance, damage is ignored (Unbreaking took effect)
    if (Math.random() > chance) return;

    const equippable = player.getComponent('minecraft:equippable') as any;
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
