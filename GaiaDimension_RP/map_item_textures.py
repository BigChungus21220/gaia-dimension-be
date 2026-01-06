import os
import json
import glob

# --- Configuration ---
BP_ROOT = r"C:\Users\ADMIN\Documents\GitHub\WildCraft-BP"
RP_ROOT = r"C:\Users\ADMIN\Documents\GitHub\WildCraft-RP"

ITEM_TEXTURE_PATH = os.path.join(RP_ROOT, "textures", "item_texture.json")
BP_BLOCKS_DIR = os.path.join(BP_ROOT, "blocks", "cc_wild")

# Define the item types we expect to map for each woodset
ITEM_TYPES_TO_MAP = ["door", "boat", "chest_boat", "sapling"]

# --- Main Script ---
def get_generated_wood_types():
    """Gets the list of generated wood type folders."""
    all_dirs = glob.glob(os.path.join(BP_BLOCKS_DIR, "*"))
    wood_dirs = [d for d in all_dirs if os.path.isdir(d)]
    wood_types = [os.path.basename(d) for d in wood_dirs]
    return sorted(wood_types)

def map_item_textures():
    print("--- Starting Item Texture Mapping ---")

    try:
        with open(ITEM_TEXTURE_PATH, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"[ERROR] Could not read item_texture.json: {e}")
        return

    if "texture_data" not in data:
        data["texture_data"] = {}

    wood_types = get_generated_wood_types()
    if not wood_types:
        print("No wood types found in Behavior Pack.")
        return

    added_count = 0
    for wood in wood_types:
        for item_type in ITEM_TYPES_TO_MAP:
            item_key = f"{wood}_{item_type}"

            if item_key not in data["texture_data"]:
                # Determine the texture path based on the item type
                if item_type == "sapling":
                    # Saplings are often in the blocks texture folder
                    texture_path = f"textures/Sen/wild/blocks/{wood}_sapling"
                else:
                    texture_path = f"textures/Sen/wild/items/{wood}_{item_type}"
                
                data["texture_data"][item_key] = {"textures": texture_path}
                print(f"  - Added: '{item_key}'")
                added_count += 1

    if added_count > 0:
        print(f"\nAdded {added_count} new item texture definitions. Saving file...")
        try:
            with open(ITEM_TEXTURE_PATH, 'w') as f:
                json.dump(data, f, indent=4)
            print("Successfully updated item_texture.json.")
        except Exception as e:
            print(f"[ERROR] Could not write to item_texture.json: {e}")
    else:
        print("\nNo new item texture definitions were needed.")

    print("\n--- Item Mapping Complete ---")

if __name__ == "__main__":
    map_item_textures()
