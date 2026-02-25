# 🌍 Gaia Dimension: Worldgen Schematic

This document abstracts the nested Molang and feature-rule pipeline that generates the simulated Gaia Dimension within the Overworld (Coordinates 100,000 to 400,000).

---

## 🏗️ The Generation Pipeline

The generation flows through seven distinct layers of nesting to achieve high-performance per-block terrain.

### 1. The Trigger (`feature_rules/base_chunk.json`)
- **Action**: Listens for Overworld chunk generation.
- **Filter**: Checks if coordinates are within the Gaia Range.
- **Goal**: Fires the `chunk_sequence`.

### 2. The Coordinator (`features/gen/base/chunk_sequence.json`)
- **Action**: Orchestrates two primary tasks:
    1. **Build**: Triggers the `column_placer`.
    2. **Wipe**: Triggers the `utils/cleaner` (JS-based overworld clutter removal).

### 3. The Scatter (`features/gen/base/column_placer.json`)
- **Action**: Scatters 256 iterations across a 16x16 area.
- **Goal**: Ensures every X/Z coordinate in the chunk is processed once at Y=0.

### 4. The Brain (`features/gen/base/column_height.json`)
- **Logic**: The most complex layer. Uses heavy Molang math to:
    - **Calculate Noise**: River noise, mountain noise, and ocean noise.
    - **Determine Height**: Interpolates noise values into a `t.height` variable.
    - **Assign Biome ID**: Maps noise results to a **Numeric ID** (`t.biome_id`).
- **Critical Fix**: Numeric IDs are used because the engine cannot compare biome strings during generation.

### 5. The Vertical Stack (`features/gen/base/column_stack.json`)
- **Action**: Iterates vertically from Y=0 to `t.height`.
- **Variable**: Tracks `t.layer` (depth from surface) to decide block types.

### 6. The Block Picker (`features/gen/base/block_picker.json`)
- **Logic**: Selects blocks based on:
    - `t.layer`: Surface (Grass/Soil) vs. Underground (Stone).
    - `t.biome_id`: Specific blocks for specific biomes (e.g., Pink Agate vs. Crystal).
- **Identity**: At Y=0, the `bedrock_picker` places a unique **Bedrock Marker** tied to the `t.biome_id`.

### 7. The Atmospheric Bridge (`JS: Gaia.js & Fog.js`)
- **Detection**: The JavaScript system looks at the player's X/Z and checks **Y=0 or Y=-64**.
- **Logic**: Identifies the Bedrock Marker block.
- **Result**: Pushes the corresponding `gaiadimension:[biome]_fog` to the player.

---

## 🛠️ Performance Architecture

| Component | Strategy | Performance Impact |
| :--- | :--- | :--- |
| **Molang** | Native engine execution | Near-zero lag |
| **Numeric IDs** | Bypasses string comparison | Mandatory for 1.20+ |
| **Cleaner** | Lagless Component + 2ms Budget | No tick spikes |
| **Fog Tracking** | Bedrock Markers | O(1) Biome Lookups |

---

## 📋 Biome ID Reference Map

| ID | Biome Name | ID | Biome Name |
| :--- | :--- | :--- | :--- |
| **1** | mineral_river | **9** | purple_agate_swamp |
| **2** | volcanic_lands | **10** | pink_agate_forest |
| **3** | shining_grove | **11** | blue_agate_taiga |
| **4** | smoldering_bog | **12** | fossil_woodland |
| **5** | static_wasteland | **13** | goldstone_lands |
| **6** | green_agate_jungle | **14** | mineral_resevoir |
| **7** | crystal_plains | **15** | salt_dunes |
| **8** | mutant_agate_wildwood | | |
