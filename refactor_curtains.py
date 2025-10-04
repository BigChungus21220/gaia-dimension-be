
import os
import json

def refactor_curtain_file(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    # 1. Remove inverse state
    if 'gaiadimension:inverse' in data['minecraft:block']['description']['states']:
        del data['minecraft:block']['description']['states']['gaiadimension:inverse']

    # 2. Update permutations
    new_permutations = [
        {
            "condition": "q.block_state('gaiadimension:open') == false",
            "components": {
                "minecraft:selection_box": { "origin": [-8, 0, 7], "size": [16, 16, 1] },
                "minecraft:collision_box": { "origin": [-8, 0, 7], "size": [16, 16, 1] }
            }
        },
        {
            "condition": "q.block_state('gaiadimension:open') == true",
            "components": {
                "minecraft:collision_box": False,
                "minecraft:selection_box": False
            }
        }
    ]
    # Keep rotation permutations
    if 'permutations' in data['minecraft:block']:
        for p in data['minecraft:block']['permutations']:
            if 'minecraft:cardinal_direction' in p['condition']:
                new_permutations.append(p)
    data['minecraft:block']['permutations'] = new_permutations

    # 3. Simplify geometry bone visibility
    is_lower = '_lower' in file_path
    if is_lower:
        data['minecraft:block']['components']['minecraft:geometry']['bone_visibility'] = {
            "down": "q.block_state('gaiadimension:open') == false",
            "down2": "q.block_state('gaiadimension:open') == true"
        }
    else: # is upper
        data['minecraft:block']['components']['minecraft:geometry']['bone_visibility'] = {
            "up": "q.block_state('gaiadimension:open') == false",
            "up2": "q.block_state('gaiadimension:open') == true"
        }
        
    # 4. Remove old root-level collision/selection boxes if they exist
    if 'minecraft:collision_box' in data['minecraft:block']['components']:
        del data['minecraft:block']['components']['minecraft:collision_box']
    if 'minecraft:selection_box' in data['minecraft:block']['components']:
        del data['minecraft:block']['components']['minecraft:selection_box']

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    bp_path = os.path.join('GaiaDimensions_BP', 'blocks', 'trees')
    folders = ['curtain_lowers', 'curtain_uppers']
    
    for folder in folders:
        dir_path = os.path.join(bp_path, folder)
        if os.path.isdir(dir_path):
            for filename in os.listdir(dir_path):
                if filename.endswith('.json'):
                    file_path = os.path.join(dir_path, filename)
                    try:
                        print(f"Refactoring {file_path}...")
                        refactor_curtain_file(file_path)
                        print(f"Successfully refactored {file_path}")
                    except Exception as e:
                        print(f"Error refactoring {file_path}: {e}")

if __name__ == '__main__':
    main()
