export class Vec3 {
    static get zero() {
        return { x: 0, y: 0, z: 0 };
    }

    static add(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }

    static subtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    static multiply(v, scale) {
        return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
    }

    static round(v) {
        return { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z) };
    }
}
