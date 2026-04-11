import { Vector3 } from "@minecraft/server";

export class BlockPos implements Vector3 {
    constructor(public x: number, public y: number, public z: number) {}

    above(n = 1): BlockPos { return new BlockPos(this.x, this.y + n, this.z); }
    below(n = 1): BlockPos { return new BlockPos(this.x, this.y - n, this.z); }
    north(n = 1): BlockPos { return new BlockPos(this.x, this.y, this.z - n); }
    south(n = 1): BlockPos { return new BlockPos(this.x, this.y, this.z + n); }
    east(n = 1):  BlockPos { return new BlockPos(this.x + n, this.y, this.z); }
    west(n = 1):  BlockPos { return new BlockPos(this.x - n, this.y, this.z); }
    
    offset(x: number, y: number, z: number): BlockPos {
        return new BlockPos(this.x + x, this.y + y, this.z + z);
    }

    set(x: number, y: number, z: number): BlockPos {
        this.x = x; this.y = y; this.z = z;
        return this;
    }
}
