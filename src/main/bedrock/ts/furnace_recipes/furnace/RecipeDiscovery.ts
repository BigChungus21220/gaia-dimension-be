import { world, system, ItemStack, Dimension, Entity, Vector3 } from "@minecraft/server";
import { nativeRecipes } from "./NativeFurnaceData.js";

const DB_PREFIX = "luminiae:fn_";
const ENTITY_ID = "luminiae:recipe_check";
const TICK_BUDGET_MS = 3;

interface ActiveTest {
    location: Vector3;
    dimId: string;
}

interface RuntimeTest {
    stage: number;
    nextTick: number;
    location: Vector3;
    dimension: Dimension;
    marker: Entity;
    types: string[];
}

interface CustomRecipe {
    input: string;
    output: string;
    type: string;
}

class RecipeDiscoverySystem {
    private activeTests: Map<string, ActiveTest> = new Map(); // Persistence: ID -> {loc, dim}
    private runtimeTests: Map<string, RuntimeTest> = new Map(); // Logic: ID -> {stage, nextTick, ...}
    private failedCooldowns: Map<string, number> = new Map(); // Cooldown: ID -> Expiry Time
    private MAX_CONCURRENT_TESTS = 5;
    private customRecipes: CustomRecipe[] = [];
    
    constructor() {
        this.init();
    }

    private init(): void {
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

    private cleanupTest(entity: Entity, id: string): void {
        if (entity && entity.isValid) entity.remove();
        // and other cleanup if needed
    }

    private tick(): void {
        if (this.runtimeTests.size === 0) return;

        const now = Date.now();
        const currentTick = system.currentTick;
        const toDelete: string[] = [];

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

    public discover(inputId: string, location: Vector3, dimension: Dimension): void {
        if (nativeRecipes[inputId] || this.activeTests.has(inputId)) return;

        // Cooldown check
        const cooldown = this.failedCooldowns.get(inputId);
        if (cooldown) {
            if (Date.now() < cooldown) return;
            this.failedCooldowns.delete(inputId);
        }

        // Concurrency Check
        if (this.activeTests.size >= this.MAX_CONCURRENT_TESTS) return;

        this.startTest(inputId, location, dimension);
    }

    private startTest(inputId: string, location: Vector3, dimension: Dimension): void {
        this.activeTests.set(inputId, { location, dimId: dimension.id });
        this.saveState('tests');

        const offset = this.runtimeTests.size * 2;
        // Hardcode height to Y: -60 (near bedrock in Overworld)
        // Clamped to dimension min + 4 to prevent void placement in dimensions like Nether/End
        const testY = Math.max(dimension.heightRange.min + 4, -60);
        const testLoc = { x: location.x, y: testY, z: location.z + offset };

        // Spawn Marker
        let marker: Entity;
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
                    const inv = (block.getComponent('inventory') as any)?.container;
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

    private checkLitState(test: RuntimeTest): boolean {
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

    private analyzeResult(inputId: string, test: RuntimeTest): boolean {
        let found = false;
        const { location, dimension, types } = test;

        for (let i = 0; i < types.length; i++) {
            const blockLoc = { x: location.x + i, y: location.y, z: location.z };
            const block = dimension.getBlock(blockLoc);
            if (!block) continue;
            const inv = (block.getComponent('inventory') as any)?.container;
            
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

    private cleanupBlocks(test: RuntimeTest): void {
        const { location, dimension, marker } = test;
        if (marker && marker.isValid) marker.remove();

        for (let i = 0; i < 3; i++) {
            try {
                const block = dimension.getBlock({ x: location.x + i, y: location.y, z: location.z });
                if (block) block.setType('minecraft:air');
            } catch(e) {}
        }
    }

    private markFailed(inputId: string): void {
        // 2 minutes cooldown (120,000 ms)
        this.failedCooldowns.set(inputId, Date.now() + 120000);
    }

    private resumeTests(): void {
        for (const [inputId, data] of this.activeTests) {
            if (this.runtimeTests.has(inputId)) continue;
            try {
                const dim = world.getDimension(data.dimId);
                if (dim) this.startTest(inputId, data.location, dim);
            } catch (e) {}
        }
    }

    private loadState(): void {
        try {
            const activeRaw = world.getDynamicProperty(`${DB_PREFIX}tests`) as string | undefined;
            if (activeRaw) {
                const parsed = JSON.parse(activeRaw);
                for (const [k, v] of Object.entries(parsed)) this.activeTests.set(k, v as ActiveTest);
            }
            
            const customRaw = world.getDynamicProperty(`${DB_PREFIX}recipes`) as string | undefined;
            if (customRaw) {
                this.customRecipes = JSON.parse(customRaw);
                this.applyRecipes();
            }
        } catch (e) {}
    }

    private saveState(key: 'tests' | 'recipes'): void {
        try {
            if (key === 'tests') world.setDynamicProperty(`${DB_PREFIX}tests`, JSON.stringify(Object.fromEntries(this.activeTests)));
            else if (key === 'recipes') world.setDynamicProperty(`${DB_PREFIX}recipes`, JSON.stringify(this.customRecipes));
        } catch(e) {}
    }

    private applyRecipes(): void {
        for (const recipe of this.customRecipes) {
            nativeRecipes[recipe.input] = { output: recipe.output };
        }
    }
}

export const recipeDiscovery = new RecipeDiscoverySystem();