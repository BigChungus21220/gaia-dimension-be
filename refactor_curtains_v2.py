
import os
import json

CURTAIN_TYPES = [
    'aura', 'blue_agate', 'burnt_agate', 'corrupted', 'fire_agate',
    'fossilized', 'golden', 'green_agate', 'pink_agate', 'purple_agate'
]

def refactor_curtain_file(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    block_data = data['minecraft:block']
    is_lower = '_lower' in os.path.basename(file_path)
    curtain_type = ''
    for t in CURTAIN_TYPES:
        if t in os.path.basename(file_path):
            curtain_type = t
            break

    if not curtain_type:
        raise ValueError(f"Could not determine curtain type for {file_path}")

    # 1. Remove inverse state
    if 'gaiadimension:inverse' in block_data['description']['states']:
        del block_data['description']['states']['gaiadimension:inverse']

    # 2. Define new permutations with texture changes
    closed_texture = f"{curtain_type}_curtain_{ 'bottom' if is_lower else 'top' }"
    open_texture = f"{closed_texture}_open"

    new_permutations = [
        {
            "condition": "q.block_state('gaiadimension:open') == false",
            "components": {
                "minecraft:selection_box": { "origin": [-8, 0, 7], "size": [16, 16, 1] },
                "minecraft:collision_box": { "origin": [-8, 0, 7], "size": [16, 16, 1] },
                "minecraft:material_instances": {
                    "*": {
                        "texture": closed_texture,
                        "render_method": "alpha_test"
                    }
                }
            }
        },
        {
            "condition": "q.block_state('gaiadimension:open') == true",
            "components": {
                "minecraft:collision_box": False,
                "minecraft:selection_box": False,
                "minecraft:material_instances": {
                    "*": {
                        "texture": open_texture,
                        "render_method": "alpha_test"
                    }
                }
            }
        }
    ]

    # Keep existing rotation permutations
    if 'permutations' in block_data:
        for p in block_data['permutations']:
            if 'minecraft:cardinal_direction' in p['condition']:
                new_permutations.append(p)
    block_data['permutations'] = new_permutations

    # 3. Simplify geometry bone visibility
    if is_lower:
        block_data['components']['minecraft:geometry']['bone_visibility'] = {
            "down": "q.block_state('gaiadimension:open') == false",
            "down2": "q.block_state('gaiadimension:open') == true"
        }
    else: # is upper
        block_data['components']['minecraft:geometry']['bone_visibility'] = {
            "up": "q.block_state('gaiadimension:open') == false",
            "up2": "q.block_state('gaiadimension:open') == true"
        }
        
    # 4. Remove old root-level components that are now in permutations
    for component in ['minecraft:collision_box', 'minecraft:selection_box', 'minecraft:material_instances']:
        if component in block_data['components']:
            del block_data['components'][component]

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
