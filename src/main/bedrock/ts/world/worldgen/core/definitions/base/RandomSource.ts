import { ProceduralRandom } from "../../utils/random";

export class RandomSource {
    constructor(private internal: ProceduralRandom) {}

    nextInt(bound: number): number {
        return Math.floor(this.internal.nextFloat() * bound);
    }

    nextFloat(): number {
        return this.internal.nextFloat();
    }

    nextBoolean(): boolean {
        return this.internal.nextFloat() > 0.5;
    }
}
