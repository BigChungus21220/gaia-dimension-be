# 🌍 Gaia Dimension: Worldgen Schematic

This document abstracts the nested Molang and feature-rule pipeline that generates the simulated Gaia Dimension within the Overworld (Coordinates 100,000 to 400,000).

---

## 🏗️ The Generation Pipeline

The generation is split into two primary phases to ensure terrain stability and proper structure placement.

### Phase 1: Terrain, Cleaning & Towers (First Pass)
**Trigger: `feature_rules/base_chunk.json`**
- **Pass**: **`first_pass`** (Terrain generation entry point).
- **Action**: Fires the `chunk_sequence`.
- **Sequential Tasks**:
    1. **Build**: Triggers `column_placer` to generate terrain columns.
    2. **Wipe**: Triggers `utils/cleaner` to remove Overworld clutter.
    3. **Finalize**: Triggers `tower_spawn_wrapper` to place landmarks on the built terrain.

---

## 🏗️ Layered Nesting (Internal Flow)

1. **The Trigger (`base_chunk.json`)** -> `first_pass` entry point.
2. **The Coordinator (`chunk_sequence.json`)** -> Orchestrates column building.
3. **The Scatter (`column_placer.json`)** -> Processes 256 columns per chunk.
4. **The Brain (`column_height.json`)** -> Molang noise & Biome ID logic.
5. **The Vertical Stack (`column_stack.json`)** -> Iterates Y=0 to `t.height`.
6. **The Block Picker (`block_picker.json`)** -> Selects blocks based on Layer & Biome ID.

---

## 🛠️ Performance Architecture

| Component | Strategy | Performance Impact |
| :--- | :--- | :--- |
| **Molang** | Native engine execution | Near-zero lag |
| **Numeric IDs** | Bypasses string comparison | Mandatory for 1.20+ |
| **Cleaner** | Lagless Component + 2ms Budget | No tick spikes |
| **Pass Splitting** | First Pass (Terrain) vs Final Pass (Towers) | Prevents structure corruption |

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
