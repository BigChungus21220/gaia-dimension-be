
import os
import json

blocks_path = r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks'

def process_directory_recursively(directory):
    for entry in os.scandir(directory):
        if entry.is_dir():
            process_directory_recursively(entry.path)
        elif entry.is_file() and entry.name.endswith('.json'):
            remove_components(entry.path)

def remove_components(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        if 'minecraft:block' in data and 'components' in data['minecraft:block']:
            components = data['minecraft:block']['components']

            if 'minecraft:display_name' in components:
                del components['minecraft:display_name']
            
            if 'minecraft:geometry' in components:
                # Only delete if it's a simple string, not a permutation object
                if isinstance(components['minecraft:geometry'], str):
                    del components['minecraft:geometry']
            
            if 'minecraft:transformation' in components:
                del components['minecraft:transformation']

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f'Processed: {file_path}')

    except Exception as e:
        print(f'ERROR: Failed to update file {file_path}. Reason: {e}')

print("Starting recursive component removal script...")
process_directory_recursively(blocks_path)
print("Recursive component removal script finished.")
