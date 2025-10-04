
import os
import json
import shutil

# --- CONFIGURATION ---

# This mapping defines the target material and the texture it should use.
TEXTURE_MAP = {
    'cinnabar': 'cinnabar_block',
    'copal': 'copal_bricks',
    'hematite': 'hematite_block',
    'jade': 'jade_bricks',
    'jet': 'jet_bricks',
    'labradorite': 'labradorite_block',
    'malachite': 'malachite_bricks',
    'moonstone': 'moonstone_block',
    'blue_opal': 'blue_opal_block',
    'green_opal': 'green_opal_block',
    'red_opal': 'red_opal_block',
    'white_opal': 'white_opal_block',
    'pyrite': 'pyrite_block',
    'sugilite': 'sugilite_block',
    'tektite': 'tektite_block'
}

TEMPLATE_SET_DIR = os.path.join('GaiaDimensions_BP', 'blocks', 'bricks_and_stones', 'brilliant_stone')
OUTPUT_DIR = os.path.join('GaiaDimensions_BP', 'blocks', 'ores')
TEMPLATE_MATERIAL_NAME = 'brilliant_stone' # The name used in the template files

# --- SCRIPT LOGIC ---

def generate_display_name(material_name, template_filename):
    name_base = material_name.replace('_', ' ').title()
    if '_slab' in template_filename:
        return f"{name_base} Slab"
    if '_stairs' in template_filename:
        return f"{name_base} Stairs"
    if '_wall' in template_filename:
        return f"{name_base} Wall"
    return name_base

def generate_ore_block_sets():
    print(f"--- Generating block sets for {len(TEXTURE_MAP)} ore materials ---")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not os.path.isdir(TEMPLATE_SET_DIR):
        print(f"FATAL: Template directory not found at {TEMPLATE_SET_DIR}")
        return

    template_files = [f for f in os.listdir(TEMPLATE_SET_DIR) if f.endswith('.json')]

    for material, texture in TEXTURE_MAP.items():
        material_dir = os.path.join(OUTPUT_DIR, material)
        os.makedirs(material_dir, exist_ok=True)
        print(f"\nProcessing material: {material} (using texture: {texture})")

        for template_filename in template_files:
            try:
                template_path = os.path.join(TEMPLATE_SET_DIR, template_filename)
                with open(template_path, 'r') as f:
                    content_str = f.read()

                # 1. Replace material name (for identifiers, etc.)
                new_content_str = content_str.replace(TEMPLATE_MATERIAL_NAME, material)
                
                # 2. Replace texture name
                new_content_str = new_content_str.replace(f'"texture": "{TEMPLATE_MATERIAL_NAME}"', f'"texture": "{texture}"')

                # 3. Replace display name
                new_display_name = generate_display_name(material, template_filename)
                template_display_name = generate_display_name(TEMPLATE_MATERIAL_NAME, template_filename)
                new_content_str = new_content_str.replace(f'"display_name": "{template_display_name}"', f'"display_name": "{new_display_name}"')

                # 4. Generate new filename and path
                new_filename = template_filename.replace(TEMPLATE_MATERIAL_NAME, material)
                new_filepath = os.path.join(material_dir, new_filename)

                with open(new_filepath, 'w') as f:
                    f.write(new_content_str)
                print(f"  -> Generated {new_filepath}")

            except Exception as e:
                print(f"ERROR generating block for {material} from template {template_filename}: {e}")

    print("\n--- Ore set generation complete ---")

if __name__ == '__main__':
    generate_ore_block_sets()
