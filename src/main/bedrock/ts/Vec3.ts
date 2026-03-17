import { Vector3 } from "@minecraft/server";

export class Vec3 {
    static get zero(): Vector3 {
        return { x: 0, y: 0, z: 0 };
    }

    static add(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }

    static subtract(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    static multiply(v: Vector3, scale: number): Vector3 {
        return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
    }

    static divide(v: Vector3, scale: number): Vector3 {
        if (scale === 0) return this.zero;
        return { x: v.x / scale, y: v.y / scale, z: v.z / scale };
    }

    static dot(v1: Vector3, v2: Vector3): number {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static cross(v1: Vector3, v2: Vector3): Vector3 {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    static magnitude(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    static normalize(v: Vector3): Vector3 {
        const mag = this.magnitude(v);
        if (mag === 0) return this.zero;
        return this.divide(v, mag);
    }

    static distance(v1: Vector3, v2: Vector3): number {
        return this.magnitude(this.subtract(v1, v2));
    }

    static lerp(v1: Vector3, v2: Vector3, t: number): Vector3 {
        return this.add(v1, this.multiply(this.subtract(v2, v1), t));
    }

    static floor(v: Vector3): Vector3 {
        return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
    }

    static ceil(v: Vector3): Vector3 {
        return { x: Math.ceil(v.x), y: Math.ceil(v.y), z: Math.ceil(v.z) };
    }

    static round(v: Vector3): Vector3 {
        return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
    }

    static abs(v: Vector3): Vector3 {
        return { x: Math.abs(v.x), y: Math.abs(v.y), z: Math.abs(v.z) };
    }

    static min(v1: Vector3, v2: Vector3): Vector3 {
        return { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), z: Math.min(v1.z, v2.z) };
    }

    static max(v1: Vector3, v2: Vector3): Vector3 {
        return { x: Math.max(v1.x, v2.x), y: Math.max(v1.y, v2.y), z: Math.max(v1.z, v2.z) };
    }

    static toString(v: Vector3): string {
        return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
    }
}
