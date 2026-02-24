import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import stripJsonComments from 'strip-json-comments';
import nbt from 'prismarine-nbt';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const MCS = require("mcstructure-js");

const convertTemplatePath = join(dirname(process.argv[1]), 'convert_template.json');
const templateData = readFileSync(convertTemplatePath, 'utf8');
const convertTemplate = JSON.parse(stripJsonComments(templateData));

const BEDROCK_BLOCK_VERSION = 17959425;

function norm(value) {
    if (typeof value === "boolean") return value ? 1 : 0;
    return value;
}

function convertBlockData(name, properties) {
    let newName = name;
    if (!name.includes(":")) newName = "minecraft:" + name;
    
    // Vanilla/Legacy mappings
    if (newName === "minecraft:grass") newName = "minecraft:short_grass";
    if (newName === "minecraft:structure_block") newName = "minecraft:air";

    const mapping = convertTemplate[name] || convertTemplate[newName];
    
    let newProperties = {};
    if (properties) {
        for (const key in properties) {
            newProperties[key] = properties[key].value;
        }
    }

    if (mapping) {
        if (typeof mapping === "string") {
            newName = mapping;
        } else {
            newName = mapping.convert_block_name;
            const convertData = mapping.convert_data;
            if (convertData) {
                const convertedProps = {};
                for (const oldKey in newProperties) {
                     const oldValue = newProperties[oldKey];
                     const oldValueStr = String(oldValue);
                     
                     const rule = convertData[oldKey];
                     if (rule) {
                         const targetKey = rule.convert_property_name;
                         if (targetKey === null) continue;

                         let newValue = oldValue;
                         if (rule.convert) {
                             newValue = rule.convert[oldValueStr] ?? rule.convert['_other'];
                             if (newValue === undefined) newValue = oldValue;
                         }
                         
                         if (rule.transfer && rule.transfer[oldValueStr]) {
                             const parts = rule.transfer[oldValueStr].split(">>");
                             if (parts.length === 3) {
                                 convertedProps[parts[0]] = parts[2];
                             }
                         }
                         
                         convertedProps[targetKey] = norm(newValue);
                     } else {
                         convertedProps[oldKey] = oldValue;
                     }
                }
                newProperties = convertedProps;
             }
        }
    }

    // SPECIAL HANDLING FOR TAR (Strip level and other unwanted states)
    if (newName === "pu_bn:tar") {
        newProperties = {};
    }

    const mcsBlock = {
        "str>name": newName,
        "comp>states": {},
        "i32>version": BEDROCK_BLOCK_VERSION
    };

    for (const [k, v] of Object.entries(newProperties)) {
        const val = norm(v);
        let type = "u8"; // default byte

        // Try to find type hint in mapping
        const mappingObj = convertTemplate[name] || convertTemplate[newName];
        if (mappingObj && mappingObj.convert_data && mappingObj.convert_data[k]) {
            const nbtType = mappingObj.convert_data[k].nbt_type;
            if (nbtType === "int") type = "i32";
            else if (nbtType === "byte") type = "u8";
            else if (nbtType === "string") type = "str";
        } else if (typeof val === "string") {
            type = "str";
        } else if (typeof val === "number") {
            if (!Number.isInteger(val)) type = "f32";
            else if (val > 1 || val < 0) type = "i32";
        }

        if (type === "str") mcsBlock["comp>states"][`str>${k}`] = String(val);
        else mcsBlock["comp>states"][`${type}>${k}`] = val;
    }
    
    return mcsBlock;
}

async function convert(inputFile, outputFile) {
    console.log(`Reading ${inputFile}...`);
    const buffer = readFileSync(inputFile);
    const { parsed } = await nbt.parse(buffer);
    
    const sizeList = parsed.value.size.value.value;
    const size = { x: sizeList[0], y: sizeList[1], z: sizeList[2] };
    const palette = parsed.value.palette.value.value;
    const blocks = parsed.value.blocks.value.value;
    
    const bedrockPalette = palette.map(p => {
        const name = p.Name.value;
        const props = p.Properties ? p.Properties.value : {};
        return convertBlockData(name, props);
    });
    
    const structure = new MCS(size.x, size.y, size.z);
    
    for (const b of blocks) {
        const pos = b.pos.value.value;
        const stateIdx = b.state.value;
        structure.setBlock({ x: pos[0], y: pos[1], z: pos[2] }, bedrockPalette[stateIdx]);
    }
    
    const outBuffer = structure.serialize();
    const outDir = dirname(outputFile);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    
    writeFileSync(outputFile, Buffer.from(outBuffer));
    console.log(`Saved to ${outputFile}`);
}

async function main() {
    const files = [
        { in: 'Assets/tar_pit.nbt', out: 'src/BP/structures/pu_bn/natural_gen/tar_pit.mcstructure' },
        { in: 'Assets/tar_pit_small.nbt', out: 'src/BP/structures/pu_bn/natural_gen/tar_pit_small.mcstructure' }
    ];
    for (const task of files) {
        await convert(task.in, task.out).catch(err => console.error(err));
    }
}

main();
