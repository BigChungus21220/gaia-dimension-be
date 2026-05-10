import { 
    system, 
    Player, 
    ItemStack, 
    ItemComponentUseOnEvent, 
    ItemComponentMineBlockEvent, 
    ItemDurabilityComponent, 
    ItemEnchantableComponent, 
    EntityEquippableComponent, 
    EquipmentSlot,
    ItemComponentRegistry,
    StartupEvent
} from "@minecraft/server";

interface DurabilityParams {
    stripDamage?: number;
    mineDamage?: number;
}

export function registerCustomTool(): void {
    system.beforeEvents.startup.subscribe((event: StartupEvent) => {
        event.itemComponentRegistry.registerCustomComponent('luminiae:durability', {
            onUseOn(e: ItemComponentUseOnEvent, params: DurabilityParams) {
                const { source, itemStack, block } = e;
                if (!source || !itemStack || !block) return;
                if (!itemStack.hasTag('minecraft:is_axe')) return;
                const typeId = block.typeId;
                const isWood = typeId.includes('wood') || typeId.includes('log') || typeId.includes('hyphae') || typeId.includes('minecraft:');
                if (!isWood) return;
                source.playSound('use.wood', { location: block.location });
                if (source.getGameMode() === 'creative') return;
                const stripDamage = params.stripDamage !== undefined ? params.stripDamage : 1;
                applyCustomDamage(source, itemStack, stripDamage);
            },
            onMineBlock(e: ItemComponentMineBlockEvent, params: DurabilityParams) {
                const { source, itemStack } = e;
                if (!source || !itemStack) return;
                if (source.getGameMode() === 'creative') return;
                const mineDamage = params.mineDamage !== undefined ? params.mineDamage : 1;
                applyCustomDamage(source, itemStack, mineDamage);
            }
        });
    });
}

function applyCustomDamage(player: Player, itemStack: ItemStack, damageAmount: number): void {
    const durability = itemStack.getComponent('minecraft:durability') as ItemDurabilityComponent;
    if (!durability) return;

    const enchantable = itemStack.getComponent('minecraft:enchantable') as ItemEnchantableComponent;
    const unbreakingLevel = enchantable ? (enchantable.getEnchantment('unbreaking')?.level ?? 0) : 0;

    // Unbreaking logic: Chance to ignore damage = 1 / (level + 1)
    const chance = 1 / (unbreakingLevel + 1);

    // If random value is greater than chance, damage is ignored (Unbreaking took effect)
    if (Math.random() > chance) return;

    const equippable = player.getComponent('minecraft:equippable') as EntityEquippableComponent;
    if (!equippable) return;

    const newDamage = durability.damage + damageAmount;

    if (newDamage >= durability.maxDurability) {
        // Item breaks
        equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
        player.playSound('random.break', { location: player.location });
    } else {
        // Apply damage
        durability.damage = newDamage;
        equippable.setEquipment(EquipmentSlot.Mainhand, itemStack);
    }
}
