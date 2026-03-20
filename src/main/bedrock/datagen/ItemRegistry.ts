export interface ItemDefinition {
    id: string;
    name: string;
    category: "equipment" | "items" | "nature" | "construction";
    stackSize?: number;
    texture?: string;
}

export const ITEM_REGISTRY: ItemDefinition[] = [
    // --- KITS / CHARMS ---
    { id: "blank_kit", name: "Blank Kit", category: "items" },
    { id: "repair_kit", name: "Repair Kit", category: "items", stackSize: 1 },
    { id: "scarlet_augment_kit", name: "Scarlet Augment Kit", category: "items", stackSize: 1 },
    { id: "auburn_augment_kit", name: "Auburn Augment Kit", category: "items", stackSize: 1 },
    { id: "gold_augment_kit", name: "Gold Augment Kit", category: "items", stackSize: 1 },
    { id: "mauve_augment_kit", name: "Mauve Augment Kit", category: "items", stackSize: 1 },
    { id: "beige_augment_kit", name: "Beige Augment Kit", category: "items", stackSize: 1 },
    { id: "ivory_augment_kit", name: "Ivory Augment Kit", category: "items", stackSize: 1 },
    { id: "scarlet_replace_kit", name: "Scarlet Replace Kit", category: "items", stackSize: 1 },
    { id: "auburn_replace_kit", name: "Auburn Replace Kit", category: "items", stackSize: 1 },
    { id: "gold_replace_kit", name: "Gold Replace Kit", category: "items", stackSize: 1 },
    { id: "mauve_replace_kit", name: "Mauve Replace Kit", category: "items", stackSize: 1 },
    { id: "beige_replace_kit", name: "Beige Replace Kit", category: "items", stackSize: 1 },
    { id: "ivory_replace_kit", name: "Ivory Replace Kit", category: "items", stackSize: 1 },
    { id: "construct_charm", name: "Construct Charm", category: "items", stackSize: 1 }
];
