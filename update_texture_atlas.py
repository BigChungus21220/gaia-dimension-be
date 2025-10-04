
import os
import json

RP_PATH = 'GaiaDimension_RP'
TEXTURES_PATH = os.path.join(RP_PATH, 'textures')
TERRAIN_TEXTURE_PATH = os.path.join(TEXTURES_PATH, 'terrain_texture.json')

def update_texture_atlas():
    print(f"--- Updating {TERRAIN_TEXTURE_PATH} ---")

    # 1. Find all .png files
    all_textures = []
    for root, dirs, files in os.walk(TEXTURES_PATH):
        for filename in files:
            if filename.endswith('.png'):
                # Get path relative to textures folder, without extension
                # e.g., blocks/my_block
                relative_path = os.path.join(root, filename)
                texture_path = os.path.splitext(relative_path.replace(TEXTURES_PATH + os.sep, ''))[0]
                texture_path = texture_path.replace('\\', '/') # Ensure forward slashes
                all_textures.append(texture_path)

    # 2. Read existing terrain_texture.json
    try:
        with open(TERRAIN_TEXTURE_PATH, 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"FATAL: Could not read or parse {TERRAIN_TEXTURE_PATH}: {e}")
        return

    texture_data = data.get('texture_data', {})
    existing_aliases = set(texture_data.keys())
    
    # 3. Find and add missing textures
    added_count = 0
    for texture_path in all_textures:
        # Alias is the last part of the path, e.g., 'my_block' from 'blocks/my_block'
        alias = os.path.basename(texture_path)

        if alias not in existing_aliases:
            print(f"Adding missing texture: {alias} -> {texture_path}")
            texture_data[alias] = {
                "textures": texture_path
            }
            added_count += 1
            existing_aliases.add(alias) # Add to set to handle duplicates in scan

    # 4. Write back if changes were made
    if added_count > 0:
        data['texture_data'] = texture_data
        try:
            with open(TERRAIN_TEXTURE_PATH, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"\nSuccessfully added {added_count} new texture definitions to {TERRAIN_TEXTURE_PATH}")
        except Exception as e:
            print(f"FATAL: Could not write updates to {TERRAIN_TEXTURE_PATH}: {e}")
    else:
        print("\nNo missing textures found. The file is already up-to-date.")

if __name__ == '__main__':
    update_texture_atlas()
