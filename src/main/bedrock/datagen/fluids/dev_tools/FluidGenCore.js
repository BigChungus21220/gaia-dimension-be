import { createSlope } from "./ProceduralSlope.js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const RP_PATH = "src/main/bedrock/resources/models/blocks/fluids";
const BP_PATH = "src/main/bedrock/data/blocks/gaiadimension/fluids";

export function generateBlockJson(fluid, stageNum) {
    const json = {
        "format_version": "1.21.70",
        "minecraft:block": {
            "description": {
                "identifier": `gaiadimension:${fluid.id}${stageNum}`,
                "states": {
                    "gaiadimension:perm_dim": [0, 1, 2],
                    "gaiadimension:flow_dir": [0, 1, 2, 3, 4, 5, 6, 7, 8]
                }
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {
                        "texture": fluid.texture,
                        "render_method": fluid.render_method || "blend"
                    }
                },
                "minecraft:loot": "loot_tables/msc/empty.json",
                [`tag:template${stageNum}`]: {},
                "tag:template": {},
                "minecraft:selection_box": false,
                "tag:fluid": {},
                "minecraft:light_dampening": 0,
                ...(fluid.light ? { "minecraft:light_emission": fluid.light } : {}),
                "minecraft:destructible_by_mining": false,
                "minecraft:collision_box": false,
                "minecraft:destructible_by_explosion": false,
                "minecraft:flammable": false,
                "gaiadimension:fluid_flow": {},
                "minecraft:tick": { "interval_range": [4, 4], "looping": true },
                "minecraft:geometry": `geometry.gaiadimension.fluid_stage_${stageNum}_straight`
            },
            "permutations": []
        }
    };

    if (fluid.particles) {
        json["minecraft:block"].components[fluid.particles] = {};
    }

    const baseGeo = `geometry.gaiadimension.fluid_stage_${stageNum}`;
    const flowPerms = [
        { condition: "q.block_state('gaiadimension:flow_dir') == 0", components: { "minecraft:geometry": `${baseGeo}_straight`, "minecraft:transformation": { "rotation": [0, 0, 0] } } },
        { condition: "q.block_state('gaiadimension:flow_dir') == 1", components: { "minecraft:geometry": `${baseGeo}_straight`, "minecraft:transformation": { "rotation": [0, 180, 0] } } }, // N
        { condition: "q.block_state('gaiadimension:flow_dir') == 2", components: { "minecraft:geometry": `${baseGeo}_diagonal`, "minecraft:transformation": { "rotation": [0, 180, 0] } } }, // NW
        { condition: "q.block_state('gaiadimension:flow_dir') == 3", components: { "minecraft:geometry": `${baseGeo}_straight`, "minecraft:transformation": { "rotation": [0, 270, 0] } } }, // W
        { condition: "q.block_state('gaiadimension:flow_dir') == 4", components: { "minecraft:geometry": `${baseGeo}_diagonal`, "minecraft:transformation": { "rotation": [0, 270, 0] } } }, // SW
        { condition: "q.block_state('gaiadimension:flow_dir') == 5", components: { "minecraft:geometry": `${baseGeo}_straight`, "minecraft:transformation": { "rotation": [0, 0, 0] } } },   // S
        { condition: "q.block_state('gaiadimension:flow_dir') == 6", components: { "minecraft:geometry": `${baseGeo}_diagonal`, "minecraft:transformation": { "rotation": [0, 0, 0] } } },   // SE
        { condition: "q.block_state('gaiadimension:flow_dir') == 7", components: { "minecraft:geometry": `${baseGeo}_straight`, "minecraft:transformation": { "rotation": [0, 90, 0] } } },  // E
        { condition: "q.block_state('gaiadimension:flow_dir') == 8", components: { "minecraft:geometry": `${baseGeo}_diagonal`, "minecraft:transformation": { "rotation": [0, 90, 0] } } }   // NE
    ];

    json["minecraft:block"].permutations.push(...flowPerms);
    return json;
}

export function runFluidDatagen(registry) {
    console.log("\u2615 Starting Fluid Datagen...");

    const uniqueStages = [...new Set(registry.map(f => f.stages))];
    uniqueStages.forEach(sCount => {
        const fluid = registry.find(f => f.stages === sCount);
        for (let i = 1; i <= sCount; i++) {
            const startH = fluid.heights[i-1];
            const endH = fluid.heights[i];
            
            const modelS = createSlope({
                identifier: `geometry.gaiadimension.fluid_stage_${i}_straight`,
                startHeight: startH,
                endHeight: endH,
                slices: 64,
                addLid: true,
                shape: "straight"
            });
            if (!existsSync(RP_PATH)) mkdirSync(RP_PATH, { recursive: true });
            writeFileSync(join(RP_PATH, `fluid_stage_${i}_straight.geo.json`), JSON.stringify(modelS, null, '\t'));

            const modelD = createSlope({
                identifier: `geometry.gaiadimension.fluid_stage_${i}_diagonal`,
                startHeight: startH,
                endHeight: endH,
                slices: i === 2 ? 32 : 16,
                addLid: true,
                shape: "diagonal"
            });
            writeFileSync(join(RP_PATH, `fluid_stage_${i}_diagonal.geo.json`), JSON.stringify(modelD, null, '\t'));
            
            console.log(`\u2714 Generated shared geometry for Stage ${i}`);
        }
    });

    registry.forEach(fluid => {
        const fluidDir = join(BP_PATH, fluid.id);
        if (!existsSync(fluidDir)) mkdirSync(fluidDir, { recursive: true });

        for (let i = 1; i <= fluid.stages; i++) {
            const blockJson = generateBlockJson(fluid, i);
            const fileName = join(fluidDir, `${fluid.id}${i}.json`);
            writeFileSync(fileName, JSON.stringify(blockJson, null, 4));
            console.log(`\u2714 Datagen: ${fluid.id}${i}.json`);
        }
    });

    console.log("\u2705 Fluid Datagen Complete!");
}
