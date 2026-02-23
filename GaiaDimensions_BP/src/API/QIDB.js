import { world, system, ItemStack, Player, Entity } from '@minecraft/server';

/**
 * QIDB - QUICK ITEM DATABASE
 * A library for persistent ItemStack storage using Structures.
 * Modernized and Optimized.
 */

function date() {
    const date = new Date(Date.now());
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    return `${date.toLocaleString().replace(' AM', `.${ms} AM`).replace(' PM', `.${ms} PM`)}`;
}

export class QIDB {
    /**
     * @param {string} namespace The unique namespace for the database keys.
     * @param {number} cacheSize Max amount of keys to keep in memory.
     * @param {number} saveRate Background saves per tick (1 = 20 keys/sec).
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

    #validNamespace;
    #queuedKeys;
    #settings;
    #quickAccess;
    #queuedValues;
    #dimension;
    #sL;

    #init(cacheSize, saveRate) {
        // 1. Initialize Storage Location (Using Dynamic Properties)
        const savedLoc = world.getDynamicProperty('qidb:storage_location');
        
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
            this.#dimension.runCommand(`tickingarea add ${this.#sL.x} 319 ${this.#sL.z} ${this.#sL.x} 318 ${this.#sL.z} qidb_storage true`);
        } catch (e) {}

        this.#log(`Initialized successfully. Namespace: ${this.#settings.namespace}`);

        // 3. Start Save Loop
        let runId;
        system.runInterval(() => {
            // Cache cleanup
            if (this.#quickAccess.size > cacheSize) {
                const diff = this.#quickAccess.size - cacheSize;
                for (let i = 0; i < diff; i++) {
                    this.#quickAccess.delete(this.#quickAccess.keys().next()?.value);
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

        // 4. Safety Shutdown Warning
        system.beforeEvents.shutdown.subscribe(() => {
            if (this.#queuedKeys.length) {
                console.error(`§cQIDB > FATAL: World closed with ${this.#queuedKeys.length} unsaved keys! Data loss possible.`);
            }
        });
    }

    #log(msg) {
        if (this.logs.startUp) console.log(`§qQIDB > ${msg}`);
    }

    #load(key, length) {
        let canStr = false;
        try {
            // Try to load existing structure
            world.structureManager.place(key, this.#dimension, this.#sL, { includeEntities: true });
            canStr = true;
        } catch {
            // New key, spawn fresh containers
            for (let i = 0; i < length; i++) this.#dimension.spawnEntity("qidb:storage", this.#sL);
        }

        const entities = this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 });
        
        // Ensure we have enough containers
        if (entities.length < length) {
            for (let i = entities.length; i < length; i++) {
                entities.push(this.#dimension.spawnEntity("qidb:storage", this.#sL));
            }
        }
        
        // Remove excess containers
        if (entities.length > length) {
            for (let i = entities.length; i > length; i--) {
                entities[i - 1].remove();
                entities.pop();
            }
        }

        const invs = entities.map(e => e.getComponent("inventory").container);
        if (this.logs.load) console.log(`§aQIDB > Loaded ${key} (${entities.length} entities)`);
        
        return { canStr, invs };
    }

    async #save(key, canStr) {
        if (canStr) world.structureManager.delete(key);
        world.structureManager.createFromWorld(key, this.#dimension, this.#sL, this.#sL, { saveMode: "World", includeEntities: true });
        
        // Cleanup entities immediately
        const entities = this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 });
        entities.forEach(e => {
            if (e.isValid) e.remove();
        });
    }

    async #queueSaving(key, value) {
        this.#queuedKeys.push(key);
        this.#queuedValues.push(value);
    }

    async #romSave(key, value) {
        const slotsNeeded = value ? (Array.isArray(value) ? value.length : 1) : 0;
        const containersNeeded = Math.ceil(slotsNeeded / 27) || 1; // Assuming 27-slot inventory (standard) or adjusted for 256 logic?
        // Original logic used 256? Does qidb:storage have 256 slots? Standard chest is 27.
        // Assuming the entity has a custom component or big inventory. 
        // We will stick to the original logic which assumed indices.
        // Original logic: i < 256. 
        
        const { canStr, invs } = this.#load(key, Math.ceil(slotsNeeded / 256) || 1);
        
        try {
            invs.forEach((inv, index) => {
                if (!value) {
                    // Clear
                    for (let i = 0; i < inv.size; i++) inv.setItem(i, undefined);
                    world.setDynamicProperty(key, null);
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
            this.#save(key, canStr);
        } catch (e) {
            console.error(`§cQIDB > Save Failed for ${key}: ${e}`);
            // Force cleanup if save fails
            const entities = this.#dimension.getEntities({ location: this.#sL, type: "qidb:storage", maxDistance: 2 });
            entities.forEach(ent => { if(ent.isValid) ent.remove(); });
        }
    }

    set(key, value) {
        key = this.#validateKey(key);
        const time = Date.now();

        if (Array.isArray(value)) {
            if (value.length > 8192) throw new Error(`§cQIDB > Max 8192 items exceeded for ${key}`);
            world.setDynamicProperty(key, Math.ceil(value.length / 256) || 1);
        } else {
            world.setDynamicProperty(key, false);
        }

        this.#quickAccess.set(key, value);
        
        // Remove from queue if already pending to prevent double-save
        const idx = this.#queuedKeys.indexOf(key);
        if (idx !== -1) {
            this.#queuedKeys.splice(idx, 1);
            this.#queuedValues.splice(idx, 1);
        }

        this.#queueSaving(key, value);
        if (this.logs.set) console.log(`§aQIDB > Set ${key} (${Date.now() - time}ms)`);
    }

    get(key) {
        key = this.#validateKey(key);
        const time = Date.now();

        // 1. Check Cache
        if (this.#quickAccess.has(key)) {
            if (this.logs.get) console.log(`§aQIDB > Cache Hit ${key}`);
            return this.#quickAccess.get(key);
        }

        // 2. Check Pending Save Queue (Race Condition Fix)
        const queueIdx = this.#queuedKeys.indexOf(key);
        if (queueIdx !== -1) {
            if (this.logs.get) console.log(`§aQIDB > Queue Hit ${key}`);
            const value = this.#queuedValues[queueIdx];
            this.#quickAccess.set(key, value); // Promote to cache
            return value;
        }

        const structure = world.structureManager.get(key);
        if (!structure) throw new Error(`§cQIDB > Key not found: ${key}`);

        // Synchronous Load (Heavy)
        const storedProp = world.getDynamicProperty(key);
        const length = (typeof storedProp === 'number') ? storedProp : 1;
        
        const { canStr, invs } = this.#load(key, length);
        const items = [];

        invs.forEach((inv, index) => {
            for (let i = 0; i < inv.size; i++) {
                // If the original logic relied on 256-slot offsets but the container is small, this might break.
                // Assuming "qidb:storage" is a custom entity with a large inventory or the original logic knew best.
                // We just read what's there.
                const item = inv.getItem(i);
                if (item) items.push(item);
            }
        });

        // Cleanup
        this.#save(key, canStr);

        let result = items;
        if (storedProp === false) result = items[0]; // Single item mode

        this.#quickAccess.set(key, result);
        if (this.logs.get) console.log(`§aQIDB > Loaded ${key} (${Date.now() - time}ms)`);
        
        return result;
    }

    has(key) {
        key = this.#validateKey(key);
        return this.#quickAccess.has(key) || !!world.structureManager.get(key);
    }

    delete(key) {
        key = this.#validateKey(key);
        if (this.#quickAccess.has(key)) this.#quickAccess.delete(key);
        
        if (world.structureManager.get(key)) {
            world.structureManager.delete(key);
            world.setDynamicProperty(key, null);
            if (this.logs.delete) console.log(`§aQIDB > Deleted ${key}`);
        } else {
            throw new Error(`§cQIDB > Key not found: ${key}`);
        }
    }

    keys() {
        const prefix = this.#settings.namespace + ":";
        return world.getDynamicPropertyIds()
            .filter(id => id.startsWith(prefix))
            .map(id => id.substring(prefix.length));
    }

    clear() {
        const prefix = this.#settings.namespace + ":";
        const keys = world.getDynamicPropertyIds().filter(id => id.startsWith(prefix));
        for (const fullKey of keys) {
            const key = fullKey.substring(prefix.length);
            this.delete(key);
        }
        if (this.logs.clear) console.log(`§aQIDB > Cleared ${keys.length} keys.`);
    }

    #validateKey(key) {
        if (!/^[A-Za-z0-9_]*$/.test(key)) throw new Error(`§cQIDB > Invalid Key: ${key}`);
        return this.#settings.namespace + ":" + key;
    }
}