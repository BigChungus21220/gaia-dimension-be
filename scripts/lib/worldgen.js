import fs from 'fs';
import path from 'path';
import { Molang, q, v, t, Mth, molang, loop } from './molang_math.js';

/**
 * Bedrock Worldgen Standard Library
 * A generic DSL for procedural dimension generation.
 */

export class Layer {
    constructor(block, depth = 1) {
        this.block = block;
        this.depth = depth;
    }
}

export class Biome {
    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.layers = [];
        this.condition = "0";
    }

    addLayer(block, depth = 1) {
        this.layers.push(new Layer(block, depth));
        return this;
    }

    when(expr) {
        this.condition = Molang.compile(expr);
        return this;
    }
}

/**
 * Categorical Biome Selector
 * Mirrors Java's hierarchical selection logic (Common, Uncommon, Rare).
 */
export class BiomePicker {
    constructor() {
        this.categories = [];
        this.defaultBiomes = [];
    }

    /** Add a category with a 1/chance probability */
    addCategory(chance, biomes) {
        this.categories.push({ chance, biomes });
        return this;
    }

    /** Set the fallback biomes (the 'common' category) */
    default(biomes) {
        this.defaultBiomes = biomes;
        return this;
    }

    /** Compiles to a Molang expression that returns a biome ID */
    compile(seedVar = "v.rx") {
        // We use the seedVar (a 0-1 float) to derive random choices
        const pick = (list) => {
            if (list.length === 1) return list[0];
            const index = `math.floor(${seedVar} * ${list.length})`;
            let chain = `${list[0]}`;
            for (let i = 1; i < list.length; i++) {
                chain = `(${index} == ${i}) ? ${list[i]} : (${chain})`;
            }
            return chain;
        };

        let result = pick(this.defaultBiomes);

        // Build from rarest to most common
        for (const cat of this.categories.reverse()) {
            const chanceCond = `math.random_integer(0, ${cat.chance - 1}) == 0`;
            result = `${chanceCond} ? (${pick(cat.biomes)}) : (${result})`;
        }

        return result;
    }
}

export class Carver {
    constructor(name) {
        this.name = name;
        this.iterations = 1;
        this.x = 0; this.y = 0; this.z = 0;
        this.places = "minecraft:air";
    }

    configure(config) {
        const c = (e) => Molang.compile(e);
        if (config.iterations) this.iterations = c(config.iterations);
        if (config.x) this.x = c(config.x);
        if (config.y) this.y = c(config.y);
        if (config.z) this.z = c(config.z);
        if (config.places) this.places = config.places;
        return this;
    }
}

export class WorldgenPipeline {
    constructor(namespace, bpPath) {
        this.namespace = namespace;
        this.bpPath = bpPath;
        this.biomes = [];
        this.carvers = [];
        this.logicSteps = [];
        this.heightLogic = "0";
    }

    addLogic(logic) {
        this.logicSteps.push(Molang.compile(logic));
        return this;
    }

    setHeight(logic) {
        this.heightLogic = Molang.compile(logic);
        return this;
    }

    registerBiome(biome) {
        this.biomes.push(biome);
        return this;
    }

    registerCarver(carver) {
        this.carvers.push(carver);
        return this;
    }

    build() {
        console.log(`[WorldgenLib] Building Pipeline: ${this.namespace}`);
        this._genHeight();
        this._genPicker();
        this._genCarvers();
    }

    _write(sub, data) {
        const p = path.join(this.bpPath, sub);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(data, null, 4));
    }

    _genHeight() {
        let script = [...this.logicSteps];
        this.biomes.forEach(b => script.push(`${b.condition} ? { t.biome_id = ${b.id}; } : { 0; };`));
        script.push(`t.height = ${this.heightLogic}; return 1;`);

        this._write(`features/gen/base/column_height.json`, {
            "format_version": "1.20.20",
            "minecraft:scatter_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/column_height` },
                "places_feature": `${this.namespace}:gen/base/column_stack`,
                "iterations": script.join(" "),
                "x": 0, "z": 0, "y": 0
            }
        });
    }

    _genPicker() {
        const refs = [];
        this.biomes.forEach(biome => {
            let depth = 0;
            biome.layers.forEach((layer, i) => {
                const isLast = i === biome.layers.length - 1;
                const cond = isLast 
                    ? `t.biome_id == ${biome.id} && t.layer >= ${depth}`
                    : `t.biome_id == ${biome.id} && t.layer >= ${depth} && t.layer < ${depth + layer.depth}`;

                const id = `${this.namespace}:conditions/gen_${biome.name}_${i}`;
                this._write(`features/conditions/gen_${biome.name}_${i}.json`, {
                    "format_version": "1.20.20",
                    "minecraft:scatter_feature": {
                        "description": { "identifier": id },
                        "places_feature": layer.block,
                        "iterations": cond,
                        "x": 0, "z": 0, "y": 0
                    }
                });
                refs.push(id);
                depth += layer.depth;
            });
        });

        this._write(`features/gen/base/block_picker.json`, {
            "format_version": "1.20.20",
            "minecraft:aggregate_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/block_picker` },
                "features": refs, "early_out": "first_success"
            }
        });
    }

    _genCarvers() {
        this.carvers.forEach(c => {
            this._write(`features/gen/carver/${c.name}.json`, {
                "format_version": "1.20.20",
                "minecraft:scatter_feature": {
                    "description": { "identifier": `${this.namespace}:gen/carver/${c.name}` },
                    "places_feature": c.places, "iterations": c.iterations, "x": c.x, "y": c.y, "z": c.z
                }
            });
        });
    }
}

// Re-export constants and math
export { q, v, t, Mth, molang, loop };
