import os
import json
import re

# This script finds all curtain textures and adds them to terrain_texture.json.

RP_ROOT = os.path.abspath("C:/Users/ADMIN/OneDrive/Documents/GitHub/gaia-dimension-be/GaiaDimension_RP")
TEXTURES_DIR = os.path.join(RP_ROOT, "textures", "block")
TERRAIN_TEXTURE_PATH = os.path.join(RP_ROOT, "textures", "terrain_texture.json")

print("--- Updating terrain_texture.json with curtain textures ---")

# 1. Find all curtain texture files
curtain_files = []
for f in os.listdir(TEXTURES_DIR):
    if "_curtain_" in f and f.endswith(".png"):
        curtain_files.append(f)

if not curtain_files:
    print("No curtain texture files found. Exiting.")
    exit()

print(f"Found {len(curtain_files)} curtain texture files.")

# 2. Read terrain_texture.json
try:
    with open(TERRAIN_TEXTURE_PATH, 'r') as f:
        # Use regex to strip comments before parsing
        content = f.read()
        content_no_comments = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        data = json.loads(content_no_comments)
except (IOError, json.JSONDecodeError) as e:
    print(f"Error reading or parsing {TERRAIN_TEXTURE_PATH}: {e}")
    exit()

# 3. Add new texture definitions
texture_data = data.get("texture_data", {})
added_count = 0

for filename in curtain_files:
    # texture_name is the filename without the .png extension
    texture_name = os.path.splitext(filename)[0]
    
    # Check if the entry already exists
    if texture_name not in texture_data:
        texture_data[texture_name] = {
            "textures": f"textures/block/{texture_name}"
        }
        added_count += 1
        print(f"  + Added entry for: {texture_name}")

data["texture_data"] = texture_data

# 4. Write the updated file
if added_count > 0:
    try:
        with open(TERRAIN_TEXTURE_PATH, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"\nSuccessfully added {added_count} new texture definitions to {os.path.basename(TERRAIN_TEXTURE_PATH)}.")
    except IOError as e:
        print(f"Error writing to file {TERRAIN_TEXTURE_PATH}: {e}")
else:
    print("\nNo new curtain textures to add. The file is already up-to-date.")

print("--- Script finished. ---")
