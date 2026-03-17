export class EntityDimensions {
    public readonly width: number;
    public readonly height: number;
    public readonly fixed: boolean;

    constructor(width: number, height: number, fixed: boolean) {
        this.width = width;
        this.height = height;
        this.fixed = fixed;
    }

    public static scalable(width: number, height: number): EntityDimensions {
        return new EntityDimensions(width, height, false);
    }

    public static fixed(width: number, height: number): EntityDimensions {
        return new EntityDimensions(width, height, true);
    }
}
