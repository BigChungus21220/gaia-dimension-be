const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'java recipes';
const BP_RECIPES_DIR = 'GaiaDimensions_BP/recipes';
const PURIFIER_OUT = 'GaiaDimensions_BP/src/furnace_recipes/purifier/PurifierRecipes.js';
const RESTRUCTURER_OUT = 'GaiaDimensions_BP/src/furnace_recipes/restructurer/RestructurerRecipes.js';

function convertIngredient(ing) {
    if (Array.isArray(ing)) {
        return convertIngredient(ing[0]);
    }
    if (ing.item) {
        return { item: ing.item };
    }
    if (ing.tag) {
        return { tag: ing.tag };
    }
    return ing;
}

function convertRecipeToBedrock(data, recipeId) {
    const recipeType = data.type;

    if (recipeType === 'minecraft:crafting_shaped') {
        const bedrockRecipe = {
            format_version: '1.20.10',
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
            bedrockRecipe['minecraft:recipe_shaped'].key[key] = convertIngredient(val);
        }
        return bedrockRecipe;
    }

    if (recipeType === 'minecraft:crafting_shapeless') {
        const bedrockRecipe = {
            format_version: '1.20.10',
            'minecraft:recipe_shapeless': {
                description: {
                    identifier: `gaiadimension:${recipeId}`
                },
                tags: ['crafting_table'],
                ingredients: (data.ingredients || []).map(convertIngredient),
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
            format_version: '1.20.10',
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

function main() {
    const purifierRecipes = {};
    const restructurerRecipes = {};

    walkDir(SOURCE_DIR, (filePath) => {
        if (!filePath.endsWith('.json')) return;

        const relPath = path.relative(SOURCE_DIR, filePath);
        const recipeId = path.basename(filePath, '.json');
        
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const type = data.type;

            if (type === 'gaiadimension:purifying' || type === 'gaiadimension:restructuring') {
                // Collect for JS machine registries
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
                // Convert to individual Bedrock JSON files
                const converted = convertRecipeToBedrock(data, recipeId);
                if (converted) {
                    const outputFilePath = path.join(BP_RECIPES_DIR, relPath);
                    const outputDir = path.dirname(outputFilePath);
                    
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(outputFilePath, JSON.stringify(converted, null, 4), 'utf8');
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
