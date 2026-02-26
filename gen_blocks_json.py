import os
import json

# --- CONFIGURATION ---
BP_BLOCKS_PATH = "GaiaDimensions_BP/blocks/gaiadimension"
RP_BLOCKS_JSON = "GaiaDimension_RP/blocks.json"

def generate_blocks_json():
    print("--- Gaia blocks.json Generator ---")
    
    # 1. Load existing blocks.json if it exists
    if os.path.exists(RP_BLOCKS_JSON):
        with open(RP_BLOCKS_JSON, "r") as f:
            try:
                blocks_data = json.load(f)
            except:
                blocks_data = {"format_version": "1.21.10"}
    else:
        blocks_data = {"format_version": "1.21.10"}

    # 2. Walk through BP blocks to find identifiers
    for root, dirs, files in os.walk(BP_BLOCKS_PATH):
        for file in files:
            if not file.endswith(".json"):
                continue
            
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)
                
                # Extract identifier
                if "minecraft:block" in data and "description" in data["minecraft:block"]:
                    identifier = data["minecraft:block"]["description"]["identifier"]
                    
                    # Logic for sounds
                    sound = None
                    lower_id = identifier.lower()
                    
                    if "grass" in lower_id:
                        sound = "grass"
                    elif "leaves" in lower_id:
                        sound = "glass"
                    
                    # Only add if we found a sound match AND it's not already manually defined
                    if sound and identifier not in blocks_data:
                        blocks_data[identifier] = {
                            "sound": sound
                        }
                        print(f"Added {identifier} with sound: {sound}")
            except Exception as e:
                print(f"Error processing {file}: {e}")

    # 3. Write final blocks.json
    with open(RP_BLOCKS_JSON, "w") as f:
        json.dump(blocks_data, f, indent=4)
    
    print("-> Successfully updated GaiaDimension_RP/blocks.json")

if __name__ == "__main__":
    generate_blocks_json()
