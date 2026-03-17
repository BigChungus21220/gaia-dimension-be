/**
 * DataSystem provides Java-like NBT path traversal and manipulation for Bedrock Dynamic Properties.
 */
export class DataSystem {
    /**
     * Traverses an object using a path string (e.g., "inventory[0].id")
     */
    static getByPath(obj: any, path: string): any {
        if (!path) return obj;
        const parts = path.split(/[.\[\]]+/).filter(p => p !== "");
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    /**
     * Sets a value in an object using a path string.
     */
    static setByPath(obj: any, path: string, value: any): any {
        const parts = path.split(/[.\[\]]+/).filter(p => p !== "");
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                // Peek at next part to see if we should create array or object
                current[part] = !isNaN(Number(parts[i+1])) ? [] : {};
            }
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
        return obj;
    }

    /**
     * Deep merges source into target
     */
    static deepMerge(target: any, source: any): any {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                Object.assign(source[key], this.deepMerge(target[key], source[key]));
            }
        }
        Object.assign(target || {}, source);
        return target;
    }

    /**
     * Helper to read the "root" data object from a target's dynamic property
     */
    static getRoot(target: { getDynamicProperty: (key: string) => string | number | boolean | undefined }, key: string = "nbt"): any {
        const raw = target.getDynamicProperty(key);
        if (typeof raw !== "string") return {};
        try {
            return JSON.parse(raw);
        } catch (e) {
            return {};
        }
    }

    /**
     * Helper to save the "root" data object
     */
    static saveRoot(target: { setDynamicProperty: (key: string, value: string | number | boolean | undefined) => void }, data: any, key: string = "nbt"): void {
        target.setDynamicProperty(key, JSON.stringify(data));
    }
}
