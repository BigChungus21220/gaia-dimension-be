import { BlockPermutation } from "@minecraft/server";
import { BlockPos } from "./BlockPos";
import { RandomSource } from "./RandomSource";
import { PalettedPlacer } from "../../utils/paletted-placer";

export class FoliageAttachment {
    constructor(public pos: BlockPos, public radius: number, public doubleTrunk: boolean) {}
}

export abstract class TrunkPlacer {
    constructor(public baseHeight: number, public heightRandA: number, public heightRandB: number) {}

    abstract place(placer: PalettedPlacer, random: RandomSource, origin: BlockPos, config: TreeFeatureConfig): FoliageAttachment[];

    protected placeLog(placer: PalettedPlacer, pos: BlockPos, config: TreeFeatureConfig): void {
        placer.setBlock(pos, config.trunkProvider);
    }
}

export abstract class FoliagePlacer {
    constructor(public radius: number, public offset: number) {}

    abstract place(placer: PalettedPlacer, random: RandomSource, attachment: FoliageAttachment, config: TreeFeatureConfig): void;

    protected placeLeaves(placer: PalettedPlacer, pos: BlockPos, config: TreeFeatureConfig): void {
        placer.setBlock(pos, config.foliageProvider);
    }
}

export class TreeFeatureConfig {
    constructor(
        public trunkProvider: BlockPermutation,
        public foliageProvider: BlockPermutation
    ) {}
}
