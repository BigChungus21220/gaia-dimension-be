/**
 * DataSystem provides Java-like NBT path traversal and manipulation for Bedrock Dynamic Properties.
 */

export interface DynamicPropertyTarget {
    getDynamicProperty(key: string): string | number | boolean | undefined;
    setDynamicProperty(key: string, value: string | number | boolean | undefined): void;
}

export class DataSystem {
    /**
     * Traverses an object using a path string (e.g., "inventory[0].id")
     */
    static getByPath<T>(obj: Record<string, any> | any[], path: string): T | undefined {
        if (!path) return obj as unknown as T;
        const parts: string[] = path.split(/[.\[\]]+/).filter(p => p !== "");
        let current: any = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = (current as Record<string, any>)[part];
        }
        return current as T;
    }

    /**
     * Sets a value in an object using a path string.
     */
    static setByPath<T>(obj: Record<string, any> | any[], path: string, value: T): Record<string, any> | any[] {
        const parts: string[] = path.split(/[.\[\]]+/).filter(p => p !== "");
        let current: any = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const currentObj = current as Record<string, any>;
            if (!(part in currentObj)) {
                // Peek at next part to see if we should create array or object
                const nextPart = parts[i + 1];
                currentObj[part] = !isNaN(Number(nextPart)) ? [] : {};
            }
            current = currentObj[part];
        }
        (current as Record<string, any>)[parts[parts.length - 1]] = value;
        return obj;
    }

    /**
     * Deep merges source into target
     */
    static deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
        for (const key in source) {
            const sourceValue = source[key];
            const targetValue = target[key];
            if (sourceValue instanceof Object && key in target && targetValue instanceof Object) {
                Object.assign(sourceValue, this.deepMerge(targetValue as Record<string, any>, sourceValue as Record<string, any>));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    /**
     * Helper to read the "root" data object from a target's dynamic property
     */
    static getRoot<T = Record<string, any>>(target: Pick<DynamicPropertyTarget, "getDynamicProperty">, key: string = "nbt"): T {
        const raw = target.getDynamicProperty(key);
        if (typeof raw !== "string") return {} as unknown as T;
        try {
            return JSON.parse(raw) as T;
        } catch (e) {
            return {} as unknown as T;
        }
    }

    /**
     * Helper to save the "root" data object
     */
    static saveRoot<T>(target: Pick<DynamicPropertyTarget, "setDynamicProperty">, data: T, key: string = "nbt"): void {
        target.setDynamicProperty(key, JSON.stringify(data));
    }
}
