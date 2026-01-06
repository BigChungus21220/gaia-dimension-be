import os
import json
import glob

# --- Configuration ---
# The root directory of the resource pack where this script is located
RP_ROOT = os.path.dirname(os.path.abspath(__file__))

# The directory containing the block textures to map
BLOCKS_DIR = os.path.join(RP_ROOT, "textures", "gaiadimension", "androsa", "blocks")

# The path to the terrain_texture.json file
TERRAIN_TEXTURE_PATH = os.path.join(RP_ROOT, "textures", "terrain_texture.json")

# The base path for the textures as it should appear in the JSON file
JSON_TEXTURE_BASE_PATH = "textures/gaiadimension/androsa/blocks"


def map_block_textures():
    """
    Finds all block textures and ensures they are registered in terrain_texture.json.
    """
    print("--- Starting Texture Mapping Process ---")

    # 1. Read the existing terrain_texture.json
    try:
        with open(TERRAIN_TEXTURE_PATH, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"[ERROR] terrain_texture.json not found at: {TERRAIN_TEXTURE_PATH}")
        return
    except json.JSONDecodeError:
        print(f"[ERROR] Could not decode terrain_texture.json. Please check for syntax errors.")
        return

    if "texture_data" not in data:
        data["texture_data"] = {}

    # 2. Find all .png textures in the target directory
    search_pattern = os.path.join(BLOCKS_DIR, "*")
    block_textures = glob.glob(search_pattern)

    if not block_textures:
        print(f"[INFO] No textures found in {BLOCKS_DIR}.")
        return

    print(f"Found {len(block_textures)} textures to check...")

    # 3. Add any textures that are not already in the JSON file
    added_count = 0
    for texture_path in block_textures:
        file_name = os.path.basename(texture_path)
        # The texture key is the filename without the .png extension
        texture_key = os.path.splitext(file_name)[0]

        if texture_key not in data["texture_data"]:
            json_texture_path = f"{JSON_TEXTURE_BASE_PATH}/{file_name}"
            data["texture_data"][texture_key] = {"textures": json_texture_path}
            added_count += 1
            print(f"  - Added new texture definition: '{texture_key}'")

    # 4. Save the file only if changes were made
    if added_count > 0:
        print(f"\nAdded {added_count} new texture definitions. Saving file...")
        try:
            with open(TERRAIN_TEXTURE_PATH, 'w') as f:
                json.dump(data, f, indent=4)
            print("Successfully updated terrain_texture.json.")
        except Exception as e:
            print(f"[ERROR] Could not write to terrain_texture.json: {e}")
    else:
        print("\nNo new texture definitions were needed. The file is already up-to-date.")

    print("\n--- Process Complete ---")

if __name__ == "__main__":
    map_block_textures()
