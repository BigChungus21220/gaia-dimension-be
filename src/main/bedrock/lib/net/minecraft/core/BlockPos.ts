import { Vector3 } from "@minecraft/server";

export class BlockPos {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    constructor(x: number, y: number, z: number) {
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.z = Math.floor(z);
    }

    public static containing(x: number, y: number, z: number): BlockPos {
        return new BlockPos(x, y, z);
    }

    public static betweenClosed(min: BlockPos, max: BlockPos): BlockPos[] {
        const positions: BlockPos[] = [];
        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                for (let z = min.z; z <= max.z; z++) {
                    positions.push(new BlockPos(x, y, z));
                }
            }
        }
        return positions;
    }

    public getY(): number { return this.y; }
    public getX(): number { return this.x; }
    public getZ(): number { return this.z; }
}
