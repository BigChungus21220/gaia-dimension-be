# 🪄 Magic Staff Modular System

This document outlines the automated generation system for the "Magic Staff" items in the Gaia Dimension. It uses a component-based approach to generate textures, item definitions, and metadata dynamically during the build process.

---

## 🏗️ The Modular Architecture

Every Magic Staff is composed of three distinct parts layered together. This creates a total of **252 unique combinations** (7 Cores × 6 Heads × 6 Rods).

### 1. Components
| Layer | Folder | Description |
| :--- | :--- | :--- |
| **Base** | `rod/` | Defines the handle and body. Affects speed/durability stats. |
| **Middle** | `core/` | Defines the element/type of magic. Affects damage type. |
| **Top** | `head/` | Defines the spell delivery method. Affects projectile behavior. |

### 2. Layers (Composition Order)
The generator layers the textures in this specific order to ensure visual integrity:
1.  **Rod** (Bottom)
2.  **Core** (Center)
3.  **Head** (Top Overlay)

---

## ⚙️ Generation Pipeline (`magic_staff_gen.py`)

The script performs the following steps when `npm run build` is executed:

### Step 1: Texture Stitching
- Scans `resources/textures/gaiadimension/androsa/item/magic_staff/` for source PNGs.
- Uses **Pillow (PIL)** to composite the three layers.
- Outputs unique 16x16 PNGs to `resources/textures/gaiadimension/androsa/item/gen/magic_staff/`.
- Naming format: `staff_[core]_[head]_[rod].png`

### Step 2: Item Definition (Behavior Pack)
- Generates 252 JSON files in `data/items/magic_staff/`.
- **Identifier**: `gaiadimension:magic_staff_[core]_[head]_[rod]`
- Sets stack size to 1 and moves them to the "Equipment" category.

### Step 3: Meta Automation (Resource Pack)
- **`item_texture.json`**: Appends unique texture shortnames for every combination.
- **`en_US.lang`**: Localizes every combination to display as "Magic Staff" in the inventory.

---

## 🛠️ Usage for Developers

### Adding New Components
To add a new element or handle type:
1. Drop the 16x16 `.png` into the correct subfolder (`core`, `head`, or `rod`).
2. Run `npm run build`.
3. The system will automatically calculate the new permutations and update all files.

### Statistical Balance
Stats (damage, reload speed, effects) are derived from the component names within the generation script. Edit the `STATS_MAP` in `magic_staff_gen.py` to adjust balance across all 252 items at once.
