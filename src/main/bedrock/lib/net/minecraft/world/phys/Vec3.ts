import { Vector3 } from "@minecraft/server";

export class Vec3 {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public add(x: number, y: number, z: number): Vec3 {
        return new Vec3(this.x + x, this.y + y, this.z + z);
    }

    public subtract(other: Vec3): Vec3 {
        return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    public normalize(): Vec3 {
        const d = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        return d < 1.0E-4 ? new Vec3(0, 0, 0) : new Vec3(this.x / d, this.y / d, this.z / d);
    }

    public distanceToSqr(x: number, y: number, z: number): number {
        const dx = this.x - x;
        const dy = this.y - y;
        const dz = this.z - z;
        return dx * dx + dy * dy + dz * dz;
    }

    public scale(factor: number): Vec3 {
        return new Vec3(this.x * factor, this.y * factor, this.z * factor);
    }

    public yRot(angle: number): Vec3 {
        const f = Math.cos(angle);
        const f1 = Math.sin(angle);
        const d0 = this.x * f + this.z * f1;
        const d1 = this.y;
        const d2 = this.z * f - this.x * f1;
        return new Vec3(d0, d1, d2);
    }
}
