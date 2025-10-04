
import os
import json
import shutil

TREES_PATH = os.path.join('GaiaDimensions_BP', 'blocks', 'trees')

def restructure_trees():
    # --- Phase 1: Deletion ---
    print("--- Starting Phase 1: Deleting duplicate files with 'events' ---")
    for root, dirs, files in os.walk(TREES_PATH):
        for filename in files:
            if filename.startswith('gaia_') and filename.endswith('.json'):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    if 'minecraft:block' in data and 'events' in data['minecraft:block']:
                        print(f"Found 'events' in {file_path}. Deleting...")
                        os.remove(file_path)
                        print(f"  -> Deleted {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path} for deletion: {e}")

    # --- Phase 2: Moving ---
    print("\n--- Starting Phase 2: Moving files to parent wood folders ---")
    folders_to_cleanup = set()
    for root, dirs, files in os.walk(TREES_PATH):
        # Don't touch the curtain folder or its subdirectories
        if 'curtain' in root.split(os.sep):
            continue

        for filename in files:
            file_path = os.path.join(root, filename)
            
            # Path looks like ...\[wood_type]\[block_type]\file.json
            # We want to move it to ...\[wood_type]\file.json
            try:
                path_parts = root.replace(TREES_PATH, '').strip(os.sep).split(os.sep)
                if len(path_parts) == 2:
                    wood_type_folder, block_type_folder = path_parts
                    dest_dir = os.path.join(TREES_PATH, wood_type_folder)
                    dest_path = os.path.join(dest_dir, filename)

                    if os.path.abspath(file_path) == os.path.abspath(dest_path):
                        continue # Already in the correct location

                    if not os.path.exists(dest_path):
                        print(f"Moving {file_path} to {dest_path}")
                        shutil.move(file_path, dest_path)
                        folders_to_cleanup.add(root)
                    else:
                        print(f"Warning: Destination {dest_path} already exists. Deleting source duplicate {file_path}")
                        os.remove(file_path)
                        folders_to_cleanup.add(root)

            except Exception as e:
                print(f"Error moving {file_path}: {e}")

    # --- Phase 3: Cleanup ---
    print("\n--- Starting Phase 3: Cleaning up empty directories ---")
    # Sort folders by depth to delete sub-folders first
    for folder in sorted(list(folders_to_cleanup), key=lambda p: p.count(os.sep), reverse=True):
        try:
            if os.path.isdir(folder) and not os.listdir(folder):
                print(f"Removing empty directory: {folder}")
                os.rmdir(folder)
        except Exception as e:
            print(f"Error removing directory {folder}: {e}")

    print("\nRestructuring complete.")

if __name__ == '__main__':
    restructure_trees()
