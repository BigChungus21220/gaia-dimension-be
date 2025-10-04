
import os
import json

CURTAIN_PATH = os.path.join('GaiaDimensions_BP', 'blocks', 'trees', 'curtain')

def fix_selection_box():
    folders_to_scan = ['curtain_lowers', 'curtain_uppers']
    new_selection_box = { "origin": [-8, 0, 7], "size": [16, 16, 1] }

    for folder in folders_to_scan:
        dir_path = os.path.join(CURTAIN_PATH, folder)
        if not os.path.isdir(dir_path):
            print(f"Warning: Directory not found at {dir_path}. Skipping.")
            continue

        for filename in os.listdir(dir_path):
            if filename.endswith('.json'):
                file_path = os.path.join(dir_path, filename)
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    block_data = data.get('minecraft:block', {})
                    permutations = block_data.get('permutations', [])
                    
                    found = False
                    for perm in permutations:
                        if perm.get('condition') == "q.block_state('gaiadimension:open') == true":
                            if 'components' in perm:
                                perm['components']['minecraft:selection_box'] = new_selection_box
                                print(f"Updated selection box in {file_path}")
                                found = True
                                break
                    
                    if found:
                        with open(file_path, 'w') as f:
                            json.dump(data, f, indent=2)

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    print("Selection box fix complete.")

if __name__ == '__main__':
    fix_selection_box()
