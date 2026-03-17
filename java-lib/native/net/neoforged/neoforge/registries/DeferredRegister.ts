import { DeferredHolder } from "./DeferredHolder.js";

export class DeferredRegister<T> {
    private readonly entries: Map<string, DeferredHolder<any, T>> = new Map();
    private readonly registryName: string;
    private readonly namespace: string;

    // For Datagen to sniff
    public static readonly REGISTRIES: DeferredRegister<any>[] = [];

    private constructor(registryName: string, namespace: string) {
        this.registryName = registryName;
        this.namespace = namespace;
        DeferredRegister.REGISTRIES.push(this);
    }

    public static create<T>(registry: string, namespace: string): DeferredRegister<T> {
        return new DeferredRegister<T>(registry, namespace);
    }

    public register<I extends T>(name: string, supplier: () => I): DeferredHolder<T, I> {
        const holder = new DeferredHolder<T, I>(name, supplier);
        this.entries.set(name, holder);
        return holder;
    }

    public registerBus(bus: any): void {
    }

    public getEntries(): Map<string, DeferredHolder<any, T>> {
        return this.entries;
    }

    public getNamespace(): string {
        return this.namespace;
    }
}
