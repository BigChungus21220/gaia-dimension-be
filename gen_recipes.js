const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'java recipes';
const BP_RECIPES_DIR = 'data/recipes';
const PURIFIER_OUT = 'data/src/furnace_recipes/purifier/PurifierRecipes.js';
const RESTRUCTURER_OUT = 'data/src/furnace_recipes/restructurer/RestructurerRecipes.js';

const WOOD_TYPES = [
    'aura', 'blue_agate', 'burnt_agate', 'corrupted', 'fire_agate', 
    'fossilized', 'golden', 'green_agate', 'pink_agate', 'purple_agate'
];

const TAG_MAP = {
    'gaiadimension:agate_tiles': WOOD_TYPES.map(w => `gaiadimension:${w}_tiles`),
    'gaiadimension:agate_logs': WOOD_TYPES.map(w => `gaiadimension:${w}_log`),
    'gaiadimension:agate_saplings': WOOD_TYPES.map(w => `gaiadimension:${w}_sapling`)
};

function convertIngredient(ing) {
    if (Array.isArray(ing)) {
        return convertIngredient(ing[0]);
    }
    if (ing.item) {
        return { item: ing.item };
    }
    if (ing.tag) {
        // Default to aura if no specific expansion is needed for this generic call
        if (TAG_MAP[ing.tag]) {
            return { item: TAG_MAP[ing.tag][0] };
        }
        return { item: ing.tag }; // Fallback
    }
    return ing;
}

function convertRecipeToBedrock(data, recipeId, overrideIngredient = null) {
    const recipeType = data.type;

    if (recipeType === 'minecraft:crafting_shaped') {
        const bedrockRecipe = {
            format_version: '1.12',
            'minecraft:recipe_shaped': {
                description: {
                    identifier: `gaiadimension:${recipeId}`
                },
                tags: ['crafting_table'],
                pattern: data.pattern,
                key: {},
                result: {
                    item: data.result.id,
                    count: data.result.count || 1
                }
            }
        };
        for (const [key, val] of Object.entries(data.key || {})) {
            if (overrideIngredient && val.tag && TAG_MAP[val.tag]) {
                bedrockRecipe['minecraft:recipe_shaped'].key[key] = { item: overrideIngredient };
            } else {
                bedrockRecipe['minecraft:recipe_shaped'].key[key] = convertIngredient(val);
            }
        }
        return bedrockRecipe;
    }

    if (recipeType === 'minecraft:crafting_shapeless') {
        const bedrockRecipe = {
            format_version: '1.12',
            'minecraft:recipe_shapeless': {
                description: {
                    identifier: `gaiadimension:${recipeId}`
                },
                tags: ['crafting_table'],
                ingredients: (data.ingredients || []).map(ing => {
                    if (overrideIngredient && ing.tag && TAG_MAP[ing.tag]) {
                        return { item: overrideIngredient };
                    }
                    return convertIngredient(ing);
                }),
                result: {
                    item: data.result.id,
                    count: data.result.count || 1
                }
            }
        };
        return bedrockRecipe;
    }

    if (recipeType === 'minecraft:smelting') {
        let ingredientData = data.ingredient;
        if (Array.isArray(ingredientData)) {
            ingredientData = ingredientData[0];
        }

        const bedrockRecipe = {
            format_version: '1.12',
            'minecraft:recipe_furnace': {
                description: {
                    identifier: `gaiadimension:${recipeId}`
                },
                tags: ['furnace'],
                input: ingredientData.item || ingredientData.tag,
                output: data.result.id
            }
        };
        return bedrockRecipe;
    }

    return null;
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function clearDirectory(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                clearDirectory(curPath);
                fs.rmdirSync(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
    }
}

function main() {
    const purifierRecipes = {};
    const restructurerRecipes = {};

    console.log('Clearing old recipes...');
    clearDirectory(BP_RECIPES_DIR);

    walkDir(SOURCE_DIR, (filePath) => {
        if (!filePath.endsWith('.json')) return;

        const relPath = path.relative(SOURCE_DIR, filePath);
        const recipeId = path.basename(filePath, '.json');
        
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const type = data.type;

            if (type === 'gaiadimension:purifying' || type === 'gaiadimension:restructuring') {
                const input = data.ingredient.item || data.ingredient.tag;
                const recipeEntry = {
                    output: data.result.id,
                    count: data.result.count || 1,
                    cookingTime: data.cookingtime || 200,
                    experience: data.experience || 0,
                    byproduct: data.byproduct ? {
                        id: data.byproduct.id,
                        count: data.byproduct.count || 1
                    } : null
                };

                if (type === 'gaiadimension:purifying') {
                    purifierRecipes[input] = recipeEntry;
                } else {
                    restructurerRecipes[input] = recipeEntry;
                }
            } else {
                // Check if recipe needs tag expansion
                let tagsToExpand = [];
                if (data.key) {
                    for (const val of Object.values(data.key)) {
                        if (val.tag && TAG_MAP[val.tag]) tagsToExpand.push(val.tag);
                    }
                }
                if (data.ingredients) {
                    for (const ing of data.ingredients) {
                        if (ing.tag && TAG_MAP[ing.tag]) tagsToExpand.push(ing.tag);
                    }
                }
                
                // Unique tags
                tagsToExpand = [...new Set(tagsToExpand)];

                if (tagsToExpand.length > 0) {
                    // Generate one recipe for each item in the first tag found
                    const tag = tagsToExpand[0];
                    TAG_MAP[tag].forEach(item => {
                        const variantName = item.split(':').pop();
                        const variantRecipeId = `${recipeId}_from_${variantName}`;
                        const converted = convertRecipeToBedrock(data, variantRecipeId, item);
                        if (converted) {
                            const outputFilePath = path.join(BP_RECIPES_DIR, path.dirname(relPath), `${variantRecipeId}.json`);
                            const outputDir = path.dirname(outputFilePath);
                            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
                            fs.writeFileSync(outputFilePath, JSON.stringify(converted, null, 4), 'utf8');
                        }
                    });
                } else {
                    const converted = convertRecipeToBedrock(data, recipeId);
                    if (converted) {
                        const outputFilePath = path.join(BP_RECIPES_DIR, relPath);
                        const outputDir = path.dirname(outputFilePath);
                        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
                        fs.writeFileSync(outputFilePath, JSON.stringify(converted, null, 4), 'utf8');
                    }
                }
            }
        } catch (e) {
            console.error(`Error processing ${filePath}: ${e.message}`);
        }
    });

    // Write Machine JS Registries
    const purifDir = path.dirname(PURIFIER_OUT);
    if (!fs.existsSync(purifDir)) fs.mkdirSync(purifDir, { recursive: true });
    fs.writeFileSync(PURIFIER_OUT, `export const purifierRecipes = ${JSON.stringify(purifierRecipes, null, 4)};`, 'utf8');

    const restructDir = path.dirname(RESTRUCTURER_OUT);
    if (!fs.existsSync(restructDir)) fs.mkdirSync(restructDir, { recursive: true });
    fs.writeFileSync(RESTRUCTURER_OUT, `export const restructurerRecipes = ${JSON.stringify(restructurerRecipes, null, 4)};`, 'utf8');

    console.log(`Generated Bedrock recipes in ${BP_RECIPES_DIR}`);
    console.log(`Generated Purifier recipes in ${PURIFIER_OUT}`);
    console.log(`Generated Restructurer recipes in ${RESTRUCTURER_OUT}`);
}

main();
