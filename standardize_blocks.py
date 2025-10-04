import os
import json
import re

# --- CONFIGURATION ---
BEHAVIOR_PACK_ROOT = os.path.abspath("C:/Users/ADMIN/OneDrive/Documents/GitHub/gaia-dimension-be/GaiaDimensions_BP")
BLOCKS_DIR = os.path.join(BEHAVIOR_PACK_ROOT, "blocks")
TEMPLATE_DIR = os.path.join(BLOCKS_DIR, "template")

# --- FILE DISCOVERY ---
print("--- Finding all slab and stairs files... ---")
all_slab_files = []
all_stairs_files = []
for root, _, files in os.walk(BLOCKS_DIR):
    # Avoid re-scanning the directories we are about to create
    if os.path.basename(root) in ["slabs", "stairs"]:
        continue
    for file in files:
        if file.endswith("_slab.json"):
            all_slab_files.append(os.path.join(root, file))
        elif file.endswith("_stairs.json"):
            all_stairs_files.append(os.path.join(root, file))

print(f"Found {len(all_slab_files)} slab files.")
print(f"Found {len(all_stairs_files)} stairs files.")

# --- MATERIAL EXTRACTION (IMPROVED) ---
def extract_material_name(filepath, filetype):
    """Extracts a clean material name from the filepath."""
    filename = os.path.basename(filepath)
    # Remove prefixes and suffixes
    name = re.sub(r'^(gaia_|gaiadimension_)', '', filename)
    name = re.sub(f'_{filetype}\.json$', '', name)
    name = re.sub(r'\.json$', '', name)
    # Handle specific inconsistent names found previously
    if name == "burned_agate_tile":
        return "burnt_agate_tile"
    if name == "burning":
        return None # Ignore this material
    return name

slab_materials = set(extract_material_name(f, "slab") for f in all_slab_files)
stairs_materials = set(extract_material_name(f, "stairs") for f in all_stairs_files)
all_materials = sorted([m for m in slab_materials.union(stairs_materials) if m and m != 'alder'])

print(f"\n--- Found {len(all_materials)} unique materials ---")
print(all_materials)

# --- FILE DELETION ---
print("\n--- Deleting old slab and stairs files... ---")
for f in all_slab_files:
    if os.path.basename(f) != "alder_slab.json":
        try:
            os.remove(f)
            print(f"Deleted: {f}")
        except OSError as e:
            print(f"Error deleting file {f}: {e}")
for f in all_stairs_files:
    if os.path.basename(f) != "alder_stairs.json":
        try:
            os.remove(f)
            print(f"Deleted: {f}")
        except OSError as e:
            print(f"Error deleting file {f}: {e}")

# --- FILE GENERATION ---
def generate_files(material_type, template_file, output_dir, suffix):
    """Generates a new block file from a template."""
    new_filename = f"{material_type}{suffix}"
    output_path = os.path.join(output_dir, new_filename)

    # Do not regenerate if the file already exists
    if os.path.exists(output_path):
        # print(f"  - Skipping, already exists: {output_path}")
        return

    try:
        with open(template_file, 'r') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Error reading template {template_file}: {e}")
        return

    # Remove flammable component
    if "minecraft:flammable" in data.get("minecraft:block", {}).get("components", {}):
        del data["minecraft:block"]["components"]["minecraft:flammable"]

    # Convert to string and replace placeholders
    content_str = json.dumps(data, indent=2)
    
    # Determine the correct texture name
    texture_name = f"{material_type}_planks" if "planks" not in material_type else material_type
    if "brick" in material_type or "tile" in material_type:
        texture_name = material_type

    # Replace alder and texture
    new_content = content_str.replace("alder", material_type)
    new_content = new_content.replace("alder_planks", texture_name)
    
    # Write the new file
    os.makedirs(output_dir, exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(new_content)
    print(f"  - Created: {output_path}")

print("\n--- Generating new standardized files... ---")
slab_template = os.path.join(TEMPLATE_DIR, "alder_slab.json")
stairs_template = os.path.join(TEMPLATE_DIR, "alder_stairs.json")

new_slabs_dir = os.path.join(BLOCKS_DIR, "slabs")
new_stairs_dir = os.path.join(BLOCKS_DIR, "stairs")

for material in all_materials:
    print(f"Processing material: {material}")
    generate_files(material, slab_template, new_slabs_dir, "_slab.json")
    generate_files(material, stairs_template, new_stairs_dir, "_stairs.json")

print("\n--- Standardization complete. ---")
