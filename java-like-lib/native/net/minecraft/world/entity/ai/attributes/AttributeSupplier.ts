export class AttributeSupplier {
    private readonly attributes: Map<string, number> = new Map();

    private constructor() {}

    public static Builder = class Builder {
        private readonly supplier: AttributeSupplier = new (AttributeSupplier as any)();

        public add(attribute: string, value: number): this {
            (this.supplier as any).attributes.set(attribute, value);
            return this;
        }

        public build(): AttributeSupplier {
            return this.supplier;
        }
    };

    public getAttributes(): Map<string, number> {
        return this.attributes;
    }
}
