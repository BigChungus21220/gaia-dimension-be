import fs from 'fs';
import { Molang } from './scripts/lib/molang_math.js';

// 1. Break down the massive logic into readable chunks
const columnHeightMolang = [
    // --- 1. Coordinates ---
    "v.x = v.originx / 256;",
    "v.z = v.originz / 256;",
    
    // --- 2. Noise Generation ---
    Molang.toMolang("t.rivernoise = Math.abs(q.noise(0.5*v.x + 3167, 0.5*v.z + 2396)*0.25 + q.noise(0.05*v.x - 1279, 0.05*v.z - 1279));"),
    Molang.toMolang("t.mountainnoise = Math.pow(q.noise(v.x*0.1 + 3812, v.z*0.1 + 4598), 2.0)*4 + q.noise(v.x*0.5 + t.rivernoise*0.5 + 7843, v.x*0.5 + t.rivernoise*0.5 + 2364)*0.5;"),
    Molang.toMolang("t.oceannoise = q.noise(0.05*v.x - 1279, 0.05*v.z - 2342)*0.5 + 0.5;"),
    
    // --- 3. Heightmap Interpolation ---
    Molang.toMolang("t.heightmap = Math.lerp(t.rivernoise - 0.05, t.mountainnoise*0.7 - t.oceannoise*0.25, t.rivernoise);"),
    
    // --- 4. Biome Thresholds ---
    "t.biometyperivermin = -0.05; t.biometyperivermax = 0;",
    "t.biometypemountainmin = 0.95; t.biometypemountainmax = 999;",
    "t.biometypeplainmin = 0.1; t.biometypeplainmax = 0.7;",
    
    // ... Add the rest of your logic ...
    
    // --- 5. Return Statement ---
    "return t.heightmap;"
].join(""); // Join everything into a single massive string

// 2. Define the JSON structure
const columnHeightJson = {
    "format_version": "1.20.20",
    "minecraft:scatter_feature": {
        "description": {
            "identifier": "gaiadimension:gen/base/column_height"
        },
        "places_feature": "gaiadimension:gen/base/column_stack",
        "iterations": columnHeightMolang, // Insert the generated string here
        "x": 0,
        "z": 0,
        "y": 0
    }
};

// 3. Write it to the behavior pack
fs.writeFileSync(
    'data/features/gen/base/column_height.json', 
    JSON.stringify(columnHeightJson, null, 4)
);

console.log("-> Generated column_height.json");
