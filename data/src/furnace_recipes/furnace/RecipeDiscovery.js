import { world, system, ItemStack } from "@minecraft/server";
import { nativeRecipes } from "./NativeFurnaceData.js";

const DB_PREFIX = "luminiae:fn_";
const ENTITY_ID = "luminiae:recipe_check";
const TICK_BUDGET_MS = 3;

class RecipeDiscoverySystem {
    constructor() {
        this.activeTests = new Map(); // Persistence: ID -> {loc, dim}
        this.runtimeTests = new Map(); // Logic: ID -> {stage, nextTick, ...}
        this.failedCooldowns = new Map(); // Cooldown: ID -> Expiry Time
        this.MAX_CONCURRENT_TESTS = 5;
        this.customRecipes = [];
        
        this.init();
    }

    init() {
        this.loadState();

        // Single centralized ticker
        system.runInterval(() => this.tick(), 1);

        // Resume tests on load
        system.runTimeout(() => this.resumeTests(), 40);

        world.afterEvents.entityLoad.subscribe(ev => {
            if (ev.entity.typeId === ENTITY_ID) {
                if (ev.entity.hasTag('luminiae:checked')) {
                    // If entity exists but not in runtime tests (e.g. after reload), ensure cleanup
                    if (!this.runtimeTests.has(ev.entity.nameTag)) {
                        this.cleanupTest(ev.entity, ev.entity.nameTag);
                    }
                } else {
                    ev.entity.addTag('luminiae:checked');
                }
            }
        });
    }

    tick() {
        if (this.runtimeTests.size === 0) return;

        const now = Date.now();
        const currentTick = system.currentTick;
        const toDelete = [];

        for (const [id, test] of this.runtimeTests) {
            if (Date.now() - now > TICK_BUDGET_MS) break; // Budget protection

            if (currentTick >= test.nextTick) {
                // Fail-safe: Ensure marker exists. If dead, test context is lost/unsafe.
                // We restart the test setup (blocks & marker) to guarantee validity.
                if (!test.marker || !test.marker.isValid) {
                    console.warn(`[RecipeDiscovery] Marker lost for ${id}. Restarting setup.`);
                    this.cleanupBlocks(test); // Clear old blocks just in case
                    this.startTest(id, test.location, test.dimension); // Restart
                    return; // Skip this tick for this test
                }

                if (test.stage === 0) {
                    // Check Lit State
                    if (!this.checkLitState(test)) {
                        this.markFailed(id);
                        toDelete.push(id);
                        this.cleanupBlocks(test); 
                    } else {
                        // Move to Stage 1 (Cooking)
                        test.stage = 1;
                        test.nextTick = currentTick + 205; 
                    }
                } else if (test.stage === 1) {
                    // Check Final Result
                    if (this.analyzeResult(id, test)) {
                        toDelete.push(id);
                        this.cleanupBlocks(test);
                    } else {
                        this.markFailed(id);
                        toDelete.push(id);
                        this.cleanupBlocks(test);
                    }
                }
            }
        }

        for (const id of toDelete) {
            this.runtimeTests.delete(id);
            this.activeTests.delete(id);
            this.saveState('tests');
        }
    }

    discover(inputId, location, dimension) {
        if (nativeRecipes[inputId] || this.activeTests.has(inputId)) return;

        // Cooldown check
        if (this.failedCooldowns.has(inputId)) {
            if (Date.now() < this.failedCooldowns.get(inputId)) return;
            this.failedCooldowns.delete(inputId);
        }

        // Concurrency Check
        if (this.activeTests.size >= this.MAX_CONCURRENT_TESTS) return;

        this.startTest(inputId, location, dimension);
    }

    startTest(inputId, location, dimension) {
        this.activeTests.set(inputId, { location, dimId: dimension.id });
        this.saveState('tests');

        const offset = this.runtimeTests.size * 2;
        // Hardcode height to Y: -60 (near bedrock in Overworld)
        // Clamped to dimension min + 4 to prevent void placement in dimensions like Nether/End
        const testY = Math.max(dimension.heightRange.min + 4, -60);
        const testLoc = { x: location.x, y: testY, z: location.z + offset };

        // Spawn Marker
        let marker;
        try {
            marker = dimension.spawnEntity(ENTITY_ID, testLoc);
            marker.nameTag = inputId;
        } catch(e) { 
            this.activeTests.delete(inputId);
            this.saveState('tests');
            return; 
        }

        // Setup Blocks
        const types = ['furnace', 'blast_furnace', 'smoker'];
        
        for (let i = 0; i < types.length; i++) {
            const blockLoc = { x: testLoc.x + i, y: testLoc.y, z: testLoc.z };
            try {
                const block = dimension.getBlock(blockLoc);
                if (block) {
                    block.setType(`minecraft:${types[i]}`);
                    const inv = block.getComponent('inventory')?.container;
                    if (inv) {
                        inv.setItem(0, new ItemStack(inputId, 1));
                        inv.setItem(1, new ItemStack('minecraft:oak_log', 1));
                        inv.setItem(2, undefined);
                    }
                }
            } catch(e) {
            }
        }

        this.runtimeTests.set(inputId, {
            stage: 0,
            nextTick: system.currentTick + 60, // Wait 60 ticks (3s) for lag/ignition
            location: testLoc,
            dimension: dimension,
            marker: marker,
            types: types
        });
    }

    checkLitState(test) {
        // Check ALL furnace types. If ANY are lit, the item is valid.
        const { location, dimension, types } = test;
        for (let i = 0; i < types.length; i++) {
            try {
                const blockLoc = { x: location.x + i, y: location.y, z: location.z };
                const block = dimension.getBlock(blockLoc);
                if (block && block.typeId.includes("lit")) return true;
            } catch (e) {}
        }
        return false;
    }

    analyzeResult(inputId, test) {
        let found = false;
        const { location, dimension, types } = test;

        for (let i = 0; i < types.length; i++) {
            const blockLoc = { x: location.x + i, y: location.y, z: location.z };
            const block = dimension.getBlock(blockLoc);
            const inv = block.getComponent('inventory')?.container;
            
            if (inv) {
                const result = inv.getItem(2);
                if (result) {
                    this.customRecipes.push({
                        input: inputId,
                        output: result.typeId,
                        type: types[i]
                    });
                    found = true;
                }
            }
        }

        if (found) {
            this.saveState('recipes');
            this.applyRecipes();
        }
        return found;
    }

    cleanupBlocks(test) {
        const { location, dimension, marker } = test;
        if (marker && marker.isValid) marker.remove();

        for (let i = 0; i < 3; i++) {
            try {
                const block = dimension.getBlock({ x: location.x + i, y: location.y, z: location.z });
                if (block) block.setType('minecraft:air');
            } catch(e) {}
        }
    }

    markFailed(inputId) {
        // 2 minutes cooldown (120,000 ms)
        this.failedCooldowns.set(inputId, Date.now() + 120000);
    }

    resumeTests() {
        for (const [inputId, data] of this.activeTests) {
            if (this.runtimeTests.has(inputId)) continue;
            try {
                const dim = world.getDimension(data.dimId);
                if (dim) this.startTest(inputId, data.location, dim);
            } catch (e) {}
        }
    }

    loadState() {
        try {
            const activeRaw = world.getDynamicProperty(`${DB_PREFIX}tests`);
            if (activeRaw) {
                const parsed = JSON.parse(activeRaw);
                for (const [k, v] of Object.entries(parsed)) this.activeTests.set(k, v);
            }
            
            const customRaw = world.getDynamicProperty(`${DB_PREFIX}recipes`);
            if (customRaw) {
                this.customRecipes = JSON.parse(customRaw);
                this.applyRecipes();
            }
        } catch (e) {}
    }

    saveState(key) {
        try {
            if (key === 'tests') world.setDynamicProperty(`${DB_PREFIX}tests`, JSON.stringify(Object.fromEntries(this.activeTests)));
            else if (key === 'recipes') world.setDynamicProperty(`${DB_PREFIX}recipes`, JSON.stringify(this.customRecipes));
        } catch(e) {}
    }

    applyRecipes() {
        for (const recipe of this.customRecipes) {
            nativeRecipes[recipe.input] = { output: recipe.output, xp: 0.1 };
        }
    }
}

export const recipeDiscovery = new RecipeDiscoverySystem();