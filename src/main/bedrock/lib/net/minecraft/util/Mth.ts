export class Mth {
    public static readonly PI = Math.PI;
    public static readonly RAD_TO_DEG = 180 / Math.PI;
    public static readonly DEG_TO_RAD = Math.PI / 180;

    public static floor(value: number): number {
        return Math.floor(value);
    }

    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    public static sin(value: number): number {
        return Math.sin(value);
    }

    public static cos(value: number): number {
        return Math.cos(value);
    }

    public static sqrt(value: number): number {
        return Math.sqrt(value);
    }

    public static atan2(y: number, x: number): number {
        return Math.atan2(y, x);
    }
}
