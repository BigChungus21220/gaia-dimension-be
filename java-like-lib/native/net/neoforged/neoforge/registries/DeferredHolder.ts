export class DeferredHolder<R, T> {
    private readonly name: string;
    private value?: T;
    private readonly supplier: () => T;

    constructor(name: string, supplier: () => T) {
        this.name = name;
        this.supplier = supplier;
    }

    public get(): T {
        if (!this.value) {
            this.value = this.supplier();
        }
        return this.value;
    }

    public getId(): string {
        return this.name;
    }
}
