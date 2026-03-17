import { world, system, ItemStack, Player, Entity, Dimension, Vector3 } from '@minecraft/server';

/**
 * QIDB - QUICK ITEM DATABASE
 * A library for persistent ItemStack storage using Structures.
 * Modernized and Optimized.
 */

function date(): string {
    const date = new Date(Date.now());
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    return `${date.toLocaleString().replace(' AM', `.${ms} AM`).replace(' PM', `.${ms} PM`)}`;
}

interface QIDBSettings {
    namespace: string;
}

interface QIDBLogs {
    startUp: boolean;
    save: boolean;
    load: boolean;
    set: boolean;
    get: boolean;
    has: boolean;
    delete: boolean;
    clear: boolean;
    values: boolean;
    keys: boolean;
}

export class QIDB {
    #validNamespace: boolean;
    #queuedKeys: string[];
    #settings: QIDBSettings;
    #quickAccess: Map<string, any>;
    #queuedValues: any[];
    #dimension: Dimension;
    #sL: Vector3 | undefined;

    public logs: QIDBLogs;

    /**
     * @param namespace The unique namespace for the database keys.
     * @param cacheSize Max amount of keys to keep in memory.
     * @param saveRate Background saves per tick (1 = 20 keys/sec).
     */
    constructor(namespace = "", cacheSize = 50, saveRate = 1) {
        this.#settings = { namespace: namespace };
        this.#queuedKeys = [];
        this.#queuedValues = [];
        this.#quickAccess = new Map();
        this.#validNamespace = /^[A-Za-z0-9_]*$/.test(this.#settings.namespace);
        this.#dimension = world.getDimension("overworld");
        
        // Logs disabled by default for performance
        this.logs = {
            startUp: false,
            save: false,
            load: false,
            set: false,
            get: false,
            has: false,
            delete: false,
            clear: false,
            values: false,
            keys: false,
        };

        if (!this.#validNamespace) throw new Error(`§cQIDB > Invalid namespace. Accepted: A-Z a-z 0-9 _`);

        system.run(() => this.#init(cacheSize, saveRate));
    }

    #init(cacheSize: number, saveRate: number): void {
        // 1. Initialize Storage Location (Using Dynamic Properties)
        const savedLoc = world.getDynamicProperty('qidb:storage_location') as string | undefined;
        
        if (savedLoc) {
            this.#sL = JSON.parse(savedLoc);
        } else {
            // First time setup: Pick a far location based on first player or default
            const player = world.getPlayers()[0];
            const x = player ? Math.floor(player.location.x) : 0;
            const z = player ? Math.floor(player.location.z) : 0;
            this.#sL = { x: x, y: 318, z: z }; // Height 318 for safety
            world.setDynamicProperty('qidb:storage_location', JSON.stringify(this.#sL));
            this.#log(`Initialized storage at ${x}, 318, ${z}`);
        }

        // 2. Setup Ticking Area (Once per load is sufficient)
        // We use a try-catch because running it multiple times is harmless but can error if overlapping
        try {
            if (this.#sL) {
                this.#dimension.runCommand(`tickingarea add ${this.#sL.x} 319 ${this.#sL.z} ${this.#sL.x} 318 ${this.#sL.z} qidb_storage true`);
            }
        } catch (e) {}

        this.#log(`Initialized successfully. Namespace: ${this.#settings.namespace}`);

        // 3. Start Save Loop
        let runId: number | undefined;
        system.runInterval(() => {
            // Cache cleanup
            if (this.#quickAccess.size > cacheSize) {
                const diff = this.#quickAccess.size - cacheSize;
                for (let i = 0; i < diff; i++) {
                    const firstKey = this.#quickAccess.keys().next()?.value;
                    if (firstKey !== undefined) {
                        this.#quickAccess.delete(firstKey);
                    }
                }
            }

            // Save Queue Processing
            if (this.#queuedKeys.length) {
                if (!runId) {
                    runId = system.runInterval(() => {
                        if (this.logs.save) console.log(`§eQIDB > Saving... Queue: ${this.#queuedKeys.length}`);
                    }, 120);
                }

                const k = Math.min(saveRate, this.#queuedKeys.length);
                for (let i = 0; i < k; i++) {
                    this.#romSave(this.#queuedKeys[0], this.#queuedValues[0]);
                    this.#queuedKeys.shift();
                    this.#queuedValues.shift();
                }
            } else if (runId) {
                system.clearRun(runId);
                runId = undefined;
                if (this.logs.save) console.log(`§aQIDB > All Data Saved.`);
            }
        }, 1);
    }

    #log(msg: string): void {
        if (this.logs.startUp) console.log(`§bQIDB > ${msg}`);
    }

    #load(key: string, length: number): { canStr: boolean, invs: any[] } {
        let canStr = false;
        try {
            // Try to load existing structure
            if (this.#sL) {
                world.structureManager.place(key, this.#dimension, this.#sL, { includeEntities: true });
                canStr = true;
            }
        } catch {
            // New key, spawn fresh containers
            if (this.#sL) {
                for (let i = 0; i < length; i++) this.#dimension.spawnEntity("qidb:storage", this.#sL);
            }
        }

        const entities = this.#sL ? this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 }) : [];
        
        // Ensure we have enough containers
        if (entities.length < length) {
            if (this.#sL) {
                for (let i = entities.length; i < length; i++) {
                    entities.push(this.#dimension.spawnEntity("qidb:storage", this.#sL));
                }
            }
        }
        
        // Remove excess containers
        if (entities.length > length) {
            for (let i = entities.length; i > length; i--) {
                entities[i - 1].remove();
                entities.pop();
            }
        }

        const invs = entities.map(e => (e.getComponent("minecraft:inventory") as any).container);
        if (this.logs.load) console.log(`§aQIDB > Loaded ${key} (${entities.length} entities)`);
        
        return { canStr, invs };
    }

    async #save(key: string, canStr: boolean): Promise<void> {
        if (this.#sL) {
            if (canStr) world.structureManager.delete(key);
            world.structureManager.createFromWorld(key, this.#dimension, this.#sL, this.#sL, { saveMode: "World", includeEntities: true });
            
            // Cleanup entities immediately
            const entities = this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 });
            entities.forEach(e => {
                if (e.isValid) e.remove();
            });
        }
    }

    async #queueSaving(key: string, value: any): Promise<void> {
        this.#queuedKeys.push(key);
        this.#queuedValues.push(value);
    }

    async #romSave(key: string, value: any): Promise<void> {
        const slotsNeeded = value ? (Array.isArray(value) ? value.length : 1) : 0;
        
        const { canStr, invs } = this.#load(key, Math.ceil(slotsNeeded / 256) || 1);
        
        try {
            invs.forEach((inv, index) => {
                if (!value) {
                    // Clear
                    for (let i = 0; i < inv.size; i++) inv.setItem(i, undefined);
                    world.setDynamicProperty(key, undefined);
                } else if (Array.isArray(value)) {
                    // Save Array
                    for (let i = 0; i < inv.size; i++) {
                        const valIndex = (256 * index) + i;
                        if (valIndex < value.length) inv.setItem(i, value[valIndex] || undefined);
                    }
                    world.setDynamicProperty(key, Math.ceil(value.length / 256) || 1);
                } else {
                    // Save Single
                    inv.setItem(0, value);
                    world.setDynamicProperty(key, false);
                }
            });
            await this.#save(key, canStr);
        } catch (e) {
            console.error(`§cQIDB > Save Failed for ${key}: ${e}`);
            // Force cleanup if save fails
            const entities = this.#sL ? this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 }) : [];
            entities.forEach(ent => { if(ent.isValid) ent.remove(); });
        }
    }

    public set(key: string, value: any): void {
        const validatedKey = this.#validateKey(key);
        const time = Date.now();

        if (Array.isArray(value)) {
            if (value.length > 8192) throw new Error(`§cQIDB > Max 8192 items exceeded for ${key}`);
            world.setDynamicProperty(validatedKey, Math.ceil(value.length / 256) || 1);
        } else {
            world.setDynamicProperty(validatedKey, false);
        }

        this.#quickAccess.set(validatedKey, value);
        
        // Remove from queue if already pending to prevent double-save
        const idx = this.#queuedKeys.indexOf(validatedKey);
        if (idx !== -1) {
            this.#queuedKeys.splice(idx, 1);
            this.#queuedValues.splice(idx, 1);
        }

        this.#queueSaving(validatedKey, value);
        if (this.logs.set) console.log(`§aQIDB > Set ${validatedKey} (${Date.now() - time}ms)`);
    }

    public get(key: string): any {
        const validatedKey = this.#validateKey(key);
        const time = Date.now();

        // 1. Check Cache
        if (this.#quickAccess.has(validatedKey)) {
            if (this.logs.get) console.log(`§aQIDB > Cache Hit ${validatedKey}`);
            return this.#quickAccess.get(validatedKey);
        }

        // 2. Check Pending Save Queue (Race Condition Fix)
        const queueIdx = this.#queuedKeys.indexOf(validatedKey);
        if (queueIdx !== -1) {
            if (this.logs.get) console.log(`§aQIDB > Queue Hit ${validatedKey}`);
            const value = this.#queuedValues[queueIdx];
            this.#quickAccess.set(validatedKey, value); // Promote to cache
            return value;
        }

        const structure = world.structureManager.get(validatedKey);
        if (!structure) throw new Error(`§cQIDB > Key not found: ${validatedKey}`);

        // Synchronous Load (Heavy)
        const storedProp = world.getDynamicProperty(validatedKey);
        const length = (typeof storedProp === 'number') ? storedProp : 1;
        
        const { canStr, invs } = this.#load(validatedKey, length);
        const items: any[] = [];

        invs.forEach((inv, index) => {
            for (let i = 0; i < inv.size; i++) {
                const item = inv.getItem(i);
                if (item) items.push(item);
            }
        });

        // Cleanup
        this.#save(validatedKey, canStr);

        let result: any = items;
        if (storedProp === false) result = items[0]; // Single item mode

        this.#quickAccess.set(validatedKey, result);
        if (this.logs.get) console.log(`§aQIDB > Loaded ${validatedKey} (${Date.now() - time}ms)`);
        
        return result;
    }

    public has(key: string): boolean {
        const validatedKey = this.#validateKey(key);
        return this.#quickAccess.has(validatedKey) || !!world.structureManager.get(validatedKey);
    }

    public delete(key: string): void {
        const validatedKey = this.#validateKey(key);
        if (this.#quickAccess.has(validatedKey)) this.#quickAccess.delete(validatedKey);
        
        if (world.structureManager.get(validatedKey)) {
            world.structureManager.delete(validatedKey);
            world.setDynamicProperty(validatedKey, undefined);
            if (this.logs.delete) console.log(`§aQIDB > Deleted ${validatedKey}`);
        } else {
            throw new Error(`§cQIDB > Key not found: ${validatedKey}`);
        }
    }

    public keys(): string[] {
        const prefix = this.#settings.namespace + ":";
        return world.getDynamicPropertyIds()
            .filter(id => id.startsWith(prefix))
            .map(id => id.substring(prefix.length));
    }

    public clear(): void {
        const prefix = this.#settings.namespace + ":";
        const keys = world.getDynamicPropertyIds().filter(id => id.startsWith(prefix));
        for (const fullKey of keys) {
            const key = fullKey.substring(prefix.length);
            this.delete(key);
        }
        if (this.logs.clear) console.log(`§aQIDB > Cleared ${keys.length} keys.`);
    }

    #validateKey(key: string): string {
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cQIDB > Invalid Key: ${key}`);
        return this.#settings.namespace + ":" + key;
    }
}
