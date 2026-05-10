import { BlockPos } from "./base/BlockPos";
import { RandomSource } from "./base/RandomSource";
import { TreeFeatureConfig, TrunkPlacer, FoliagePlacer } from "./base/JavaPlacer";
import { TreeDefinition } from "./definition-tree";
import { Vector3 } from "@minecraft/server";
import { PalettedPlacer, ProceduralRandom } from "../utils";

export class JavaTreeDefinition extends TreeDefinition {
    constructor(
        public id: string,
        private config: TreeFeatureConfig,
        private trunkPlacer: TrunkPlacer,
        private foliagePlacer: FoliagePlacer
    ) {
        super(id);
    }

    *build(location: Vector3, seed: ProceduralRandom, placer: PalettedPlacer): Generator<void, void, unknown> {
        const random = new RandomSource(seed);
        const origin = new BlockPos(location.x, location.y, location.z);

        // 1. Generate Trunk
        const attachments = this.trunkPlacer.place(placer, random, origin, this.config);
        yield;

        // 2. Generate Foliage from attachments
        for (const attachment of attachments) {
            this.foliagePlacer.place(placer, random, attachment, this.config);
            yield;
        }
    }
}
