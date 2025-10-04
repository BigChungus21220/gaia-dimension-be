
import os
import json

BP_PATH = 'GaiaDimensions_BP'

def clear_events_in_files():
    print(f"--- Scanning for 'events' in {BP_PATH} ---")
    for root, dirs, files in os.walk(BP_PATH):
        for filename in files:
            if filename.endswith('.json'):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r') as f:
                        # Read content first to check for the key, to avoid parsing large files unnecessarily
                        content = f.read()
                        if '"events"' not in content:
                            continue
                        
                        # If key exists, parse and modify
                        data = json.loads(content)

                    if 'minecraft:block' in data and 'events' in data['minecraft:block']:
                        # Check if events is not already empty
                        if data['minecraft:block']['events']:
                            print(f"Found and clearing 'events' in {file_path}")
                            data['minecraft:block']['events'] = {}
                            
                            with open(file_path, 'w') as f:
                                json.dump(data, f, indent=2)
                        else:
                            print(f"Skipping {file_path}, 'events' block is already empty.")

                except json.JSONDecodeError:
                    # This will catch files with comments or other invalid JSON
                    print(f"Warning: Could not parse {file_path}. It may be invalid JSON. Skipping.")
                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    print("\nClear events script complete.")

if __name__ == '__main__':
    clear_events_in_files()
