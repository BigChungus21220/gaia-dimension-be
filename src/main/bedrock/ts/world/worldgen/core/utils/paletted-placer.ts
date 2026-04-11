import { BlockPermutation, Dimension, ListBlockVolume, Vector3 } from "@minecraft/server";

export class PalettedPlacer {
    public palettes: Map<BlockPermutation, Vector3[]>;

    constructor(){ 
        this.palettes = new Map(); 
    }

    /**@returns {Vector3[]} */
    getPaletteLocations(permutation: BlockPermutation): Vector3[] {
        return this.palettes.get(permutation) ?? [];
    }

    setPaletteLocations(permutation: BlockPermutation, locations: Vector3[]): void {
        this.palettes.set(permutation, locations);
    }

    setBlock(location: Vector3, permutation: BlockPermutation): void {
        const list = this.getPaletteLocations(permutation);
        list.push({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });
        this.palettes.set(permutation, list);
    }

    *flush(dimension: Dimension, filterOption?: any): Generator<void, void, unknown> {
        for (const [permutation, list] of this.palettes.entries()) {
            if (!list.length) continue;
            try {
                dimension.fillBlocks(new ListBlockVolume(list), permutation, filterOption ?? {});
            } catch (e) {
                // Silently handle out of bounds or chunk errors during gen
            }
            yield;
        }
        this.palettes.clear();
    }
}
