import { Vector3 } from "@minecraft/server";

const isVec3Symbol = Symbol("isVec3");

export class Vec3 implements Vector3 {
    public x: number;
    public y: number;
    public z: number;
    // @ts-ignore
    private [isVec3Symbol] = true;

    constructor(x = 0, y = 0, z = 0) {
        this.x = Number(x);
        this.y = Number(y);
        this.z = Number(z);
    }

    static magnitude(vec: Vector3): number {
        return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    }

    static normalize(vec: Vector3): Vec3 {
        const l = Vec3.magnitude(vec);
        return new Vec3(vec.x / l, vec.y / l, vec.z / l);
    }

    static cross(a: Vector3, b: Vector3): Vec3 {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.x * b.z - a.z * b.x,
            a.x * b.y - a.y * b.x
        );
    }

    static dot(a: Vector3, b: Vector3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static angleBetween(a: Vector3, b: Vector3): number {
        return Math.acos(Vec3.dot(a, b) / (Vec3.magnitude(a) * Vec3.magnitude(b)));
    }

    static subtract(a: Vector3, b: Vector3): Vec3 {
        return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static add(a: Vector3, b: Vector3): Vec3 {
        return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static multiply(vec: Vector3, num: number | Vector3): Vec3 {
        if (typeof num === "number") {
            return new Vec3(vec.x * num, vec.y * num, vec.z * num);
        } else {
            return new Vec3(vec.x * num.x, vec.y * num.y, vec.z * num.z);
        }
    }

    static isVec3(vec: unknown): vec is Vec3 {
        return !!(vec && typeof vec === "object" && isVec3Symbol in vec && (vec as any)[isVec3Symbol] === true);
    }

    static floor(vec: Vector3): Vec3 {
        return new Vec3(Math.floor(vec.x), Math.floor(vec.y), Math.floor(vec.z));
    }

    static ceil(vec: Vector3): Vec3 {
        return new Vec3(Math.ceil(vec.x), Math.ceil(vec.y), Math.ceil(vec.z));
    }

    static projection(a: Vector3, b: Vector3): Vec3 {
        return Vec3.multiply(b, Vec3.dot(a, b) / ((b.x * b.x + b.y * b.y + b.z * b.z) ** 2));
    }

    static rejection(a: Vector3, b: Vector3): Vec3 {
        return Vec3.subtract(a, Vec3.projection(a, b));
    }

    static reflect(v: Vector3, n: Vector3): Vec3 {
        return Vec3.subtract(v, Vec3.multiply(n, 2 * Vec3.dot(v, n)));
    }

    static lerp(a: Vector3, b: Vector3, t: number): Vec3 {
        return Vec3.add(Vec3.multiply(a, 1 - t), Vec3.multiply(b, t));
    }

    static distance(a: Vector3, b: Vector3): number {
        return Vec3.magnitude(Vec3.subtract(a, b));
    }

    static from(object: unknown): Vec3 {
        if (Vec3.isVec3(object)) return object;
        if (Array.isArray(object)) return new Vec3(object[0], object[1], object[2]);
        const { x = 0, y = 0, z = 0 } = (object as Vector3) ?? {};
        return new Vec3(Number(x), Number(y), Number(z));
    }

    static sort(vec1: Vector3, vec2: Vector3): [Vec3, Vec3] {
        const [x1, x2] = vec1.x < vec2.x ? [vec1.x, vec2.x] : [vec2.x, vec1.x];
        const [y1, y2] = vec1.y < vec2.y ? [vec1.y, vec2.y] : [vec2.y, vec1.y];
        const [z1, z2] = vec1.z < vec2.z ? [vec1.z, vec2.z] : [vec2.z, vec1.z];
        return [new Vec3(x1, y1, z1), new Vec3(x2, y2, z2)];
    }

    static invert(vec: Vector3): Vec3 {
        return new Vec3(-vec.x, -vec.y, -vec.z);
    }

    static get up(): Vec3 { return new Vec3(0, 1, 0); }
    static get down(): Vec3 { return new Vec3(0, -1, 0); }
    static get right(): Vec3 { return new Vec3(1, 0, 0); }
    static get left(): Vec3 { return new Vec3(-1, 0, 0); }
    static get forward(): Vec3 { return new Vec3(0, 0, 1); }
    static get backward(): Vec3 { return new Vec3(0, 0, -1); }
    static get zero(): Vec3 { return new Vec3(0, 0, 0); }

    distance(vec: Vector3): number { return Vec3.distance(this, vec); }
    lerp(vec: Vector3, t: number): Vec3 { return Vec3.lerp(this, vec, t); }
    projection(vec: Vector3): Vec3 { return Vec3.projection(this, vec); }
    reflect(vec: Vector3): Vec3 { return Vec3.reflect(this, vec); }
    rejection(vec: Vector3): Vec3 { return Vec3.rejection(this, vec); }
    cross(vec: Vector3): Vec3 { return Vec3.cross(this, vec); }
    dot(vec: Vector3): number { return Vec3.dot(this, vec); }
    floor(): Vec3 { return Vec3.floor(this); }
    ceil(): Vec3 { return Vec3.ceil(this); }
    add(vec: Vector3): Vec3 { return Vec3.add(this, vec); }
    subtract(vec: Vector3): Vec3 { return Vec3.subtract(this, vec); }
    multiply(num: number | Vector3): Vec3 { return Vec3.multiply(this, num); }
    get length(): number { return Vec3.magnitude(this); }
    get normalized(): Vec3 { return Vec3.normalize(this); }

    toString(): string { return `<${this.x}, ${this.y}, ${this.z}>`; }
}

export function Vec3Factory(x: number = 0, y: number = 0, z: number = 0): Vec3 {
    return new Vec3(x, y, z);
}
