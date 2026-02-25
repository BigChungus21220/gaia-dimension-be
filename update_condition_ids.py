import os
import json

# Map biomes to their new numeric IDs
biome_map = {
    'mineral_river': 1,
    'volcanic_lands': 2,
    'shining_grove': 3,
    'smoldering_bog': 4,
    'static_wasteland': 5,
    'green_agate_jungle': 6,
    'crystal_plains': 7,
    'mutant_agate_wildwood': 8,
    'purple_agate_swamp': 9,
    'pink_agate_forest': 10,
    'blue_agate_taiga': 11,
    'fossil_woodland': 12,
    'goldstone_lands': 13,
    'mineral_resevoir': 14,
    'salt_dunes': 15
}

def update_conditions():
    dir_path = 'GaiaDimensions_BP/features/conditions'
    for filename in os.listdir(dir_path):
        if not filename.endswith('.json'):
            continue
        
        file_path = os.path.join(dir_path, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            continue

        if 'minecraft:scatter_feature' not in data:
            continue
        
        scatter = data['minecraft:scatter_feature']
        if 'iterations' not in scatter:
            continue
        
        iterations = scatter['iterations']
        if not isinstance(iterations, str) or 't.biome ==' not in iterations:
            continue
        
        # Replace string comparison with numeric ID comparison
        updated = False
        for biome, b_id in biome_map.items():
            str_comp = f"t.biome == '{biome}'"
            if str_comp in iterations:
                scatter['iterations'] = iterations.replace(str_comp, f"t.biome_id == {b_id}")
                updated = True
                break
        
        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent='\t')
                f.write('\n')
            print(f"Updated {filename}")

if __name__ == "__main__":
    update_conditions()
