
import os
import json
import shutil

# --- CONFIGURATION ---
ORE_MATERIALS = [
    'cinnabar', 'copal', 'hematite', 'jade', 'jet', 'labradorite', 'malachite',
    'moonstone', 'opal', 'pyrite', 'sugilite', 'tektite'
]

TEMPLATE_SET_DIR = os.path.join('GaiaDimensions_BP', 'blocks', 'bricks_and_stones', 'brilliant_stone')
OUTPUT_DIR = os.path.join('GaiaDimensions_BP', 'blocks', 'ores')
TEMPLATE_MATERIAL_NAME = 'brilliant_stone'

# Generic template for the _ore.json file
ORE_BLOCK_TEMPLATE = {
  "format_version": "1.21.70",
  "minecraft:block": {
    "description": {
      "identifier": "gaiadimension:__material___ore"
    },
    "components": {
      "minecraft:destructible_by_mining": {
        "seconds_to_destroy": 3
      },
      "minecraft:map_color": "#000000",
      "minecraft:material_instances": {
        "*": {
          "texture": "__material___ore",
          "render_method": "opaque"
        }
      }
    }
  }
}

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

def generate_ore_sets():
    print(f"--- Generating block sets for {len(ORE_MATERIALS)} ore materials ---")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not os.path.isdir(TEMPLATE_SET_DIR):
        print(f"FATAL: Template directory not found at {TEMPLATE_SET_DIR}")
        return

    template_files = [f for f in os.listdir(TEMPLATE_SET_DIR) if f.endswith('.json')]

    for material in ORE_MATERIALS:
        material_dir = os.path.join(OUTPUT_DIR, material)
        os.makedirs(material_dir, exist_ok=True)
        print(f"\nProcessing material: {material}")

        # 1. Generate the standard set from templates
        for template_filename in template_files:
            try:
                template_path = os.path.join(TEMPLATE_SET_DIR, template_filename)
                with open(template_path, 'r') as f:
                    content_str = f.read()

                # Replace material name
                new_content_str = content_str.replace(TEMPLATE_MATERIAL_NAME, material)
                
                # Replace display name
                new_display_name = generate_display_name(material, template_filename)
                template_display_name = generate_display_name(TEMPLATE_MATERIAL_NAME, template_filename)
                new_content_str = new_content_str.replace(f'"display_name": "{template_display_name}"', f'"display_name": "{new_display_name}"')

                # Generate new filename and path
                new_filename = template_filename.replace(TEMPLATE_MATERIAL_NAME, material)
                new_filepath = os.path.join(material_dir, new_filename)

                with open(new_filepath, 'w') as f:
                    f.write(new_content_str)
                print(f"  -> Generated {new_filepath}")

            except Exception as e:
                print(f"ERROR generating standard block for {material}: {e}")

        # 2. Generate the special _ore.json block
        try:
            ore_template_str = json.dumps(ORE_BLOCK_TEMPLATE)
            ore_content_str = ore_template_str.replace("__material__", material)
            ore_filename = f"{material}_ore.json"
            ore_filepath = os.path.join(material_dir, ore_filename)

            with open(ore_filepath, 'w') as f:
                # Parse and dump to get nice formatting
                ore_data = json.loads(ore_content_str)
                json.dump(ore_data, f, indent=2)
            print(f"  -> Generated {ore_filepath}")

        except Exception as e:
            print(f"ERROR generating ore block for {material}: {e}")

    print("\n--- Ore set generation complete ---")

if __name__ == '__main__':
    generate_ore_sets()
