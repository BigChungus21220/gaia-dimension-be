
import os
import json

blocks_path = r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks'

def process_directory_recursively(directory):
    for entry in os.scandir(directory):
        if entry.is_dir():
            process_directory_recursively(entry.path)
        elif entry.is_file() and entry.name.endswith('.json'):
            remove_loot_component(entry.path)

def remove_loot_component(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        if 'minecraft:block' in data and 'components' in data['minecraft:block']:
            components = data['minecraft:block']['components']

            if 'minecraft:loot' in components:
                del components['minecraft:loot']
                print(f'Removed minecraft:loot from: {file_path}')

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)

    except Exception as e:
        print(f'ERROR: Failed to update file {file_path}. Reason: {e}')

print("Starting recursive loot component removal script...")
process_directory_recursively(blocks_path)
print("Recursive loot component removal script finished.")
