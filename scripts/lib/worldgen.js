import fs from 'fs';
import path from 'path';
import { Molang, q, v, t, Mth, molang, loop } from './molang_math.js';

/**
 * Bedrock Worldgen Standard Library
 * A generic DSL for procedural dimension generation.
 */

// Simple string hash for condition naming (matching WORKING GEN style)
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

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
        
        // 1. Copy ALL files from WORKING GEN to data/features and data/feature_rules
        const workingGenPath = path.resolve('WORKING GEN');
        if (fs.existsSync(workingGenPath)) {
            const featuresDest = path.join(this.bpPath, 'features');
            const rulesDest = path.join(this.bpPath, 'feature_rules');
            fs.cpSync(path.join(workingGenPath, 'features'), featuresDest, { recursive: true });
            fs.cpSync(path.join(workingGenPath, 'feature_rules'), rulesDest, { recursive: true });
            console.log(`[WorldgenLib] Synced static features from WORKING GEN.`);
        }

        // 2. Programmatic Regeneration
        this._genBaseStructure();
        this._genHeight();
        this._genPickers();
        this._genCarvers();
    }

    _write(sub, data) {
        const p = path.join(this.bpPath, sub);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, JSON.stringify(data, null, 4));
    }

    _genBaseStructure() {
        // main_sequence.json (exactly as WORKING GEN)
        this._write(`features/gen/base/main_sequence.json`, {
            "format_version": "1.20.20",
            "minecraft:aggregate_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/main_sequence` },
                "features": [
                    "flakey:gen/void/private/chunk_erase",
                    `${this.namespace}:gen/base/column_height`,
                    `${this.namespace}:gen/caves/cave_layer_placer`,
                    `${this.namespace}:gen/caves/magma_placer`,
                    `${this.namespace}:gen/base/bedrock_picker`
                ]
            }
        });

        // column_stack.json (exactly as WORKING GEN)
        this._write(`features/gen/base/column_stack.json`, {
            "format_version": "1.20.20",
            "minecraft:scatter_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/column_stack` },
                "places_feature": `${this.namespace}:gen/base/block_picker`,
                "iterations": "math.max(t.height,63) + 1",
                "x": 0,
                "z": "t.layer = t.layer + 1; return 0;",
                "y": { "distribution": "fixed_grid", "extent": [0, "math.max(t.height,63)"] }
            }
        });
    }

    _genHeight() {
        this._write(`features/gen/base/column_height.json`, {
            "format_version": "1.20.20",
            "minecraft:scatter_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/column_height` },
                "places_feature": `${this.namespace}:gen/base/column_stack`,
                "iterations": this.logicSteps.join(" ") + "; return 1;",
                "x": 0, "z": 0, "y": 0
            }
        });
    }

    _genCondition(id, places, iterations) {
        const hash = hashString(id + places + iterations);
        const conditionId = `${this.namespace}:conditions/condition_${hash}`;
        this._write(`features/conditions/condition_${hash}.json`, {
            "format_version": "1.20.20",
            "minecraft:scatter_feature": {
                "description": { "identifier": conditionId },
                "places_feature": places,
                "iterations": iterations,
                "x": 0, "z": 0, "y": 0
            }
        });
        return conditionId;
    }

    _genPickers() {
        // 1. Expand all biomes to have a flat array of 1-block-deep layers
        const expandedBiomes = this.biomes.map(biome => {
            const flatLayers = [];
            biome.layers.forEach(layer => {
                for (let i = 0; i < layer.depth; i++) {
                    flatLayers.push(layer.block);
                }
            });
            return { ...biome, flatLayers };
        });

        const maxDepth = Math.max(...expandedBiomes.map(b => b.flatLayers.length));
        const layerSelectors = [];

        // 2. Water condition (t.layer < 1)
        const waterId = this._genCondition("water_filling", "flakey:gen/blocks/water", "t.layer < 1");
        layerSelectors.push(waterId);

        // 3. Stone Catch-all (for t.layer > maxDepth)
        const stoneId = this._genCondition("stone_catchall", `${this.namespace}:gen/gaia_blocks/gaia_stone`, `t.layer > ${maxDepth}`);
        layerSelectors.push(stoneId);

        // 4. Generate Layer Aggregate Features (layer1.json, etc.)
        for (let d = 0; d < maxDepth; d++) {
            const biomeConds = [];
            expandedBiomes.forEach(biome => {
                if (biome.flatLayers[d]) {
                    const condId = this._genCondition(
                        `${biome.name}_layer_${d}`,
                        biome.flatLayers[d],
                        `t.biome_id == ${biome.id}`
                    );
                    biomeConds.push(condId);
                }
            });

            const layerId = `${this.namespace}:gen/base/layer${d + 1}`;
            this._write(`features/gen/base/layer${d + 1}.json`, {
                "format_version": "1.20.20",
                "minecraft:aggregate_feature": {
                    "description": { "identifier": layerId },
                    "features": biomeConds,
                    "early_out": "first_success"
                }
            });

            // 5. Generate Condition Feature for this Layer (t.layer == X)
            const layerCondId = this._genCondition(
                `layer_selector_${d}`,
                layerId,
                `t.layer == ${d + 1}`
            );
            layerSelectors.push(layerCondId);
        }

        // 6. block_picker.json
        this._write(`features/gen/base/block_picker.json`, {
            "format_version": "1.20.20",
            "minecraft:aggregate_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/block_picker` },
                "features": layerSelectors, 
                "early_out": "first_success"
            }
        });

        // 5. bedrock_picker.json
        const bedrockConds = [];
        this.biomes.forEach(biome => {
            const bedrockBlock = `${this.namespace}:gen/gaia_blocks/bedrock_${biome.name}`;
            const condId = this._genCondition(
                `${biome.name}_bedrock`,
                bedrockBlock,
                `t.biome_id == ${biome.id}`
            );
            bedrockConds.push(condId);
        });

        this._write(`features/gen/base/bedrock_picker.json`, {
            "format_version": "1.20.20",
            "minecraft:aggregate_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/bedrock_picker` },
                "features": bedrockConds,
                "early_out": "first_success"
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
