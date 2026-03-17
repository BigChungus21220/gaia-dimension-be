interface SaplingEntry {
    structures: string[];
    ground: string[];
    offset: { x: number; y: number; z: number };
}

export const saplingConfig: Record<string, SaplingEntry> = {
    "gaiadimension:aura_sapling": {
        structures: ["gaiadimension:aura1"],
        ground: ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:mycelium", "minecraft:sand"],
        offset: { x: -7, y: 0, z: -7 }
    },
    "gaiadimension:pink_agate_sapling": {
        structures: ["gaiadimension:pink_agate_tree"], // Placeholder structure name
        ground: ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:mycelium", "gaiadimension:pink_agate_moss"], // Assuming moss or similar exists, otherwise standard ground
        offset: { x: -2, y: 0, z: -2 } // Adjust offset based on tree size
    }
};
