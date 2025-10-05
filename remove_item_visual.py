
import os
import json

def remove_item_visual(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".json"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    try:
                        data = json.load(f)
                    except json.JSONDecodeError:
                        print(f"Error decoding JSON from {filepath}")
                        continue

                if 'minecraft:block' in data and 'components' in data['minecraft:block'] and 'minecraft:item_visual' in data['minecraft:block']['components']:
                    del data['minecraft:block']['components']['minecraft:item_visual']
                    with open(filepath, 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"Removed minecraft:item_visual from {filepath}")

remove_item_visual("C:\\Users\\ADMIN\\OneDrive\\Documents\\GitHub\\gaia-dimension-be\\GaiaDimensions_BP\\blocks\\trees")
