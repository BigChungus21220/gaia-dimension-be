export interface CauldronConfig {
    block: string;
    maxLevel: number;
    returnItem: string;
}

export const CAULDRON_CONFIG: Record<string, CauldronConfig> = {
    "pu_bn:tar_bucket": {
        block: "pu_bn:tar_cauldron",
        maxLevel: 3,
        returnItem: "minecraft:bucket"
    },
    "pu_bn:liquid_magma_bucket": {
        block: "pu_bn:liquid_magma_cauldron",
        maxLevel: 3,
        returnItem: "minecraft:bucket"
    }
};