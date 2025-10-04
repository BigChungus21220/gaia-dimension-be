
import os
import json
import shutil

# --- CONFIGURATION ---

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
TEMPLATE_MATERIAL_NAME = 'brilliant_stone'
TEMPLATE_TEXTURE_NAME = 'gaiadimension:atlas_sandstone_dark' # The actual texture used in the templates

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

def generate_ore_block_sets_corrected():
    print(f"--- Correcting generated ore sets for {len(TEXTURE_MAP)} materials ---")

    if not os.path.isdir(TEMPLATE_SET_DIR):
        print(f"FATAL: Template directory not found at {TEMPLATE_SET_DIR}")
        return

    template_files = [f for f in os.listdir(TEMPLATE_SET_DIR) if f.endswith('.json')]

    for material, texture in TEXTURE_MAP.items():
        material_dir = os.path.join(OUTPUT_DIR, material)
        if not os.path.isdir(material_dir):
            print(f"Warning: Material directory not found for {material}. Skipping.")
            continue

        print(f"\nProcessing material: {material}")

        for template_filename in template_files:
            # Determine the filename of the already generated (but incorrect) file
            generated_filename = template_filename.replace(TEMPLATE_MATERIAL_NAME, material)
            generated_filepath = os.path.join(material_dir, generated_filename)

            if not os.path.exists(generated_filepath):
                print(f"Warning: Generated file not found at {generated_filepath}. Skipping.")
                continue

            try:
                with open(generated_filepath, 'r') as f:
                    content_str = f.read()

                # Replace the incorrect texture name with the correct one
                new_content_str = content_str.replace(f'"texture": "{TEMPLATE_TEXTURE_NAME}"', f'"texture": "{texture}"')

                # Overwrite the file with the corrected content
                with open(generated_filepath, 'w') as f:
                    f.write(new_content_str)
                print(f"  -> Corrected texture in {generated_filepath}")

            except Exception as e:
                print(f"ERROR correcting file for {material}: {e}")

    print("\n--- Texture correction complete ---")

if __name__ == '__main__':
    generate_ore_block_sets_corrected()
