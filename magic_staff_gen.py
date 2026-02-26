import os
import json
from PIL import Image

# --- CONFIGURATION ---
RP_PATH = "GaiaDimension_RP"
BP_PATH = "GaiaDimensions_BP"

TEXTURE_SRC = os.path.join(RP_PATH, "textures/gaiadimension/androsa/item/magic_staff")
TEXTURE_OUT = os.path.join(RP_PATH, "textures/gaiadimension/androsa/item/gen/magic_staff")
ITEM_OUT = os.path.join(BP_PATH, "items/androsa/magic_staff")

ITEM_TEXTURE_JSON = os.path.join(RP_PATH, "textures/item_texture.json")
LANG_FILE = os.path.join(RP_PATH, "texts/en_US.lang")

# --- INITIALIZATION ---
os.makedirs(TEXTURE_OUT, exist_ok=True)
os.makedirs(ITEM_OUT, exist_ok=True)

def get_components(folder):
    path = os.path.join(TEXTURE_SRC, folder)
    if not os.path.exists(path):
        return []
    return [f.replace(".png", "") for f in os.listdir(path) if f.endswith(".png")]

cores = get_components("core")
heads = get_components("head")
rods = get_components("rod")

print(f"--- Magic Staff Generator ---")
print(f"Cores: {len(cores)} | Heads: {len(heads)} | Rods: {len(rods)}")
print(f"Total Combinations: {len(cores) * len(heads) * len(rods)}")

if not cores or not heads or not rods:
    print("Error: Missing components. Check source folders.")
    exit(1)

# --- GENERATION ---

generated_items = []

for rod in rods:
    for core in cores:
        for head in heads:
            staff_id = f"magic_staff_{core}_{head}_{rod}"
            tex_filename = f"staff_{core}_{head}_{rod}.png"
            
            # 1. Texture Composition
            rod_img = Image.open(os.path.join(TEXTURE_SRC, "rod", f"{rod}.png")).convert("RGBA")
            core_img = Image.open(os.path.join(TEXTURE_SRC, "core", f"{core}.png")).convert("RGBA")
            head_img = Image.open(os.path.join(TEXTURE_SRC, "head", f"{head}.png")).convert("RGBA")
            
            # Layering: Rod -> Core -> Head
            composite = Image.alpha_composite(rod_img, core_img)
            composite = Image.alpha_composite(composite, head_img)
            
            composite.save(os.path.join(TEXTURE_OUT, tex_filename))
            
            # 2. Item JSON (Behavior Pack)
            item_json = {
                "format_version": "1.21.10",
                "minecraft:item": {
                    "description": {
                        "identifier": f"gaiadimension:{staff_id}",
                        "menu_category": {
                            "category": "equipment"
                        }
                    },
                    "components": {
                        "minecraft:max_stack_size": 1,
                        "minecraft:hand_equipped": True,
                        "minecraft:icon": staff_id,
                        "minecraft:display_name": { "value": f"item.gaiadimension:{staff_id}.name" }
                    }
                }
            }
            
            with open(os.path.join(ITEM_OUT, f"{staff_id}.json"), "w") as f:
                json.dump(item_json, f, indent=4)
            
            generated_items.append(staff_id)

# --- METADATA UPDATES ---

# Update item_texture.json
with open(ITEM_TEXTURE_JSON, "r") as f:
    tex_data = json.load(f)

for staff_id in generated_items:
    tex_data["texture_data"][staff_id] = {
        "textures": f"textures/gaiadimension/androsa/item/gen/magic_staff/staff_{staff_id.replace('magic_staff_', '')}"
    }

with open(ITEM_TEXTURE_JSON, "w") as f:
    json.dump(tex_data, f, indent=4)

# Update en_US.lang
with open(LANG_FILE, "r") as f:
    lang_lines = f.readlines()

# Filter out old magic staff translations to prevent bloat
new_lang_lines = [line for line in lang_lines if "item.gaiadimension:magic_staff_" not in line]

# Append new translations
for staff_id in generated_items:
    # Optional: You could make the name more dynamic here if desired
    # e.g., f"item.gaiadimension:{staff_id}.name={core.capitalize()} {head.capitalize()} Staff\n"
    new_lang_lines.append(f"item.gaiadimension:{staff_id}.name=Magic Staff\n")

with open(LANG_FILE, "w") as f:
    f.writelines(new_lang_lines)

print("-> Successfully generated textures, items, and unique translation keys.")
