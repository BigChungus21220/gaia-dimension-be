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
        let list = this.palettes.get(permutation);
        if (!list) this.palettes.set(permutation, list = []);
        list.push(location);
    }

    *flush(dimension: Dimension, filterOption?: any): Generator<void, void, unknown> {
        for (const [permutation, list] of this.palettes.entries()) {
            if (!list.length) continue;
            
            // To rigidly prevent exceeding the 32768 BlockVolume AABB limit (which crashes fillBlocks), 
            // we split the list into 16x16x16 spatial sub-chunks. 
            // This guarantees the AABB volume of any slice is at most 4096, even if trees overflow chunk borders.
            const slices = new Map<string, Vector3[]>();
            for (const loc of list) {
                const cx = Math.floor(loc.x / 16);
                const cy = Math.floor(loc.y / 16);
                const cz = Math.floor(loc.z / 16);
                const key = `${cx},${cy},${cz}`;
                let sliceList = slices.get(key);
                if (!sliceList) slices.set(key, sliceList = []);
                sliceList.push(loc);
            }

            for (const sliceList of slices.values()) {
                dimension.fillBlocks(new ListBlockVolume(sliceList), permutation, filterOption ?? {});
                yield;
            }
        }
        this.palettes.clear();
    }
}
