import fs from 'fs';
import path from 'path';
import { Molang } from './molang_math.js';

/**
 * Defines a structural layer for a biome.
 * @example new Layer('gaiadimension:soft_grass', { depth: 1 })
 */
export class Layer {
    constructor(blockIdentifier, options = {}) {
        this.block = blockIdentifier;
        this.depth = options.depth || 1; // How many blocks deep this layer goes
        this.noiseOffset = options.noiseOffset || false; // If the depth should vary by noise
    }
}

/**
 * Defines a Biome, its generation thresholds, and its terrain composition.
 */
export class Biome {
    constructor(identifier, numericId) {
        this.id = identifier;
        this.numericId = numericId;
        
        // Default thresholds (min/max) for the determinant variables
        this.thresholds = {
            height: [-999, 999],
            temperature: [-999, 999],
            humidity: [-999, 999]
        };
        
        // Layers ordered from Top (Surface) to Bottom (Bedrock)
        this.layers = [];
    }

    setHeight(min, max) {
        this.thresholds.height = [min, max];
        return this;
    }

    setTemperature(min, max) {
        this.thresholds.temperature = [min, max];
        return this;
    }

    addLayer(layer) {
        this.layers.push(layer);
        return this;
    }
}

/**
 * The main compiler that takes Biomes and Noise definitions and generates 
 * the massive Molang files and JSON features required for Bedrock.
 */
export class WorldgenCompiler {
    constructor(bpPath, namespace) {
        this.bpPath = bpPath;
        this.namespace = namespace;
        this.biomes = [];
        this.baseNoiseScript = [];
    }

    addBiome(biome) {
        this.biomes.push(biome);
        return this;
    }

    /** Set the Molang script that generates `t.heightmap`, `t.temperature`, etc. */
    setNoiseLogic(scriptArray) {
        this.baseNoiseScript = scriptArray;
        return this;
    }

    // --- FILE GENERATION ---

    _writeJson(subpath, data) {
        const fullPath = path.join(this.bpPath, subpath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 4));
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0, len = str.length; i < len; i++) {
            let chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    compile() {
        console.log(`[WorldgenCompiler] Compiling dimension generation for namespace: ${this.namespace}...`);
        
        this._compileColumnHeight();
        this._compileBlockPicker();
        
        console.log(`[WorldgenCompiler] Compilation complete.`);
    }

    /**
     * Generates `column_height.json`, stitching together the base noise 
     * and the biome selection logic based on thresholds.
     */
    _compileColumnHeight() {
        let molang = [...this.baseNoiseScript];

        // 1. Define Biome Thresholds in Molang
        for (const b of this.biomes) {
            molang.push(`t.biome_${b.id}_h_min = ${b.thresholds.height[0]};`);
            molang.push(`t.biome_${b.id}_h_max = ${b.thresholds.height[1]};`);
            // Add temp/humidity as needed...
        }

        // 2. Default biome
        const defaultBiome = this.biomes[0];
        molang.push(`t.biome = '${defaultBiome.id}'; t.biome_id = ${defaultBiome.numericId};`);

        // 3. Conditional logic to pick biome based on `t.heightmap` (determinant_height)
        molang.push(`v.dh = t.heightmap;`); // dh = determinant height
        
        for (let i = 1; i < this.biomes.length; i++) {
            const b = this.biomes[i];
            const cond = `(t.biome_${b.id}_h_min <= v.dh && v.dh < t.biome_${b.id}_h_max)`;
            const action = `{ t.biome = '${b.id}'; t.biome_id = ${b.numericId}; }`;
            molang.push(`${cond} ? ${action} : { 0; };`);
        }

        // Return height (assuming t.heightmap represents Y level, scaled to your needs)
        molang.push(`t.height = (t.heightmap * 64) + 64;`); // Example scaling
        molang.push(`return 0;`);

        const feature = {
            "format_version": "1.20.20",
            "minecraft:scatter_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/column_height` },
                "places_feature": `${this.namespace}:gen/base/column_stack`,
                "iterations": molang.join(" "),
                "x": 0, "z": 0, "y": 0
            }
        };

        this._writeJson(`features/gen/base/column_height.json`, feature);
    }

    /**
     * Generates `block_picker.json` and all the associated `conditions/` JSON files
     * that map a specific biome_id and depth to a block.
     */
    _compileBlockPicker() {
        const conditionFeatures = [];

        for (const biome of this.biomes) {
            let currentDepth = 0;

            for (const layer of biome.layers) {
                // E.g. t.layer == 0 (top block), t.layer > 0 && t.layer <= 3 (dirt), t.layer > 3 (stone)
                const minLayer = currentDepth;
                const maxLayer = currentDepth + layer.depth;
                
                let layerCondition = `t.layer >= ${minLayer}`;
                if (layer.depth < 999) { // 999 implies "all the way to the bottom"
                    layerCondition += ` && t.layer < ${maxLayer}`;
                }

                // E.g. "t.biome_id == 14 && t.layer == 0"
                const molangCondition = `t.biome_id == ${biome.numericId} && ${layerCondition}`;
                const hash = this._hashString(molangCondition + layer.block);
                const conditionId = `${this.namespace}:conditions/condition_${hash}`;

                // Create the condition feature file
                const conditionJson = {
                    "format_version": "1.20.20",
                    "minecraft:scatter_feature": {
                        "description": { "identifier": conditionId },
                        "places_feature": layer.block,
                        "iterations": molangCondition,
                        "x": 0, "z": 0, "y": 0
                    }
                };

                this._writeJson(`features/conditions/condition_${hash}.json`, conditionJson);
                conditionFeatures.push(conditionId);

                currentDepth += layer.depth;
            }
        }

        // Create the main block_picker aggregate
        const blockPickerJson = {
            "format_version": "1.20.20",
            "minecraft:aggregate_feature": {
                "description": { "identifier": `${this.namespace}:gen/base/block_picker` },
                "features": conditionFeatures,
                "early_out": "first_success"
            }
        };

        this._writeJson(`features/gen/base/block_picker.json`, blockPickerJson);
    }
}
