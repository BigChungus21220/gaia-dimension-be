import { Vector3 } from "@minecraft/server";

/**
 * A utility class for 3D vector operations compatible with @minecraft/server Vector3.
 */
export class Vec3 {
    /**
     * Returns a zero vector (0, 0, 0).
     */
    static get zero(): Vector3 {
        return { x: 0, y: 0, z: 0 };
    }

    /**
     * Adds two vectors together.
     * @param v1 The first vector.
     * @param v2 The second vector.
     * @returns A new vector that is the sum of v1 and v2.
     */
    static add(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }

    /**
     * Subtracts the second vector from the first.
     * @param v1 The first vector.
     * @param v2 The second vector.
     * @returns A new vector that is the difference of v1 and v2.
     */
    static subtract(v1: Vector3, v2: Vector3): Vector3 {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    /**
     * Multiplies a vector by a scalar.
     * @param v The vector to multiply.
     * @param scale The scalar to multiply by.
     * @returns A new scaled vector.
     */
    static multiply(v: Vector3, scale: number): Vector3 {
        return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
    }

    /**
     * Divides a vector by a scalar. Returns zero vector if scale is 0.
     * @param v The vector to divide.
     * @param scale The scalar to divide by.
     * @returns A new divided vector.
     */
    static divide(v: Vector3, scale: number): Vector3 {
        if (scale === 0) return this.zero;
        return { x: v.x / scale, y: v.y / scale, z: v.z / scale };
    }

    /**
     * Calculates the dot product of two vectors.
     */
    static dot(v1: Vector3, v2: Vector3): number {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    /**
     * Calculates the cross product of two vectors.
     */
    static cross(v1: Vector3, v2: Vector3): Vector3 {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    /**
     * Calculates the magnitude (length) of a vector.
     */
    static magnitude(v: Vector3): number {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    /**
     * Returns a normalized version of the vector (magnitude of 1).
     * Returns zero vector if original magnitude is 0.
     */
    static normalize(v: Vector3): Vector3 {
        const mag = this.magnitude(v);
        if (mag === 0) return this.zero;
        return this.divide(v, mag);
    }

    /**
     * Calculates the distance between two vectors.
     */
    static distance(v1: Vector3, v2: Vector3): number {
        return this.magnitude(this.subtract(v1, v2));
    }

    /**
     * Linearly interpolates between two vectors.
     * @param v1 Start vector.
     * @param v2 End vector.
     * @param t Interpolation factor (0.0 to 1.0).
     */
    static lerp(v1: Vector3, v2: Vector3, t: number): Vector3 {
        return this.add(v1, this.multiply(this.subtract(v2, v1), t));
    }

    /**
     * Applies Math.floor to each component of the vector.
     */
    static floor(v: Vector3): Vector3 {
        return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
    }

    /**
     * Applies Math.ceil to each component of the vector.
     */
    static ceil(v: Vector3): Vector3 {
        return { x: Math.ceil(v.x), y: Math.ceil(v.y), z: Math.ceil(v.z) };
    }

    /**
     * Applies Math.round to each component of the vector.
     */
    static round(v: Vector3): Vector3 {
        return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
    }

    /**
     * Applies Math.abs to each component of the vector.
     */
    static abs(v: Vector3): Vector3 {
        return { x: Math.abs(v.x), y: Math.abs(v.y), z: Math.abs(v.z) };
    }

    /**
     * Returns a vector containing the minimum components of two vectors.
     */
    static min(v1: Vector3, v2: Vector3): Vector3 {
        return { x: Math.min(v1.x, v2.x), y: Math.min(v1.y, v2.y), z: Math.min(v1.z, v2.z) };
    }

    /**
     * Returns a vector containing the maximum components of two vectors.
     */
    static max(v1: Vector3, v2: Vector3): Vector3 {
        return { x: Math.max(v1.x, v2.x), y: Math.max(v1.y, v2.y), z: Math.max(v1.z, v2.z) };
    }

    /**
     * Returns a string representation of the vector.
     */
    static toString(v: Vector3): string {
        return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
    }
}
