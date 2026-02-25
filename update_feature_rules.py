import os
import json

def update_filters():
    dir_path = 'GaiaDimensions_BP/feature_rules'
    for filename in os.listdir(dir_path):
        if not filename.endswith('.json'):
            continue
        
        file_path = os.path.join(dir_path, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                data = json.loads(content)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            continue

        if 'minecraft:feature_rules' not in data:
            continue
        
        feature_rules = data['minecraft:feature_rules']
        if 'conditions' not in feature_rules:
            continue
        
        conditions = feature_rules['conditions']
        if 'minecraft:biome_filter' not in conditions:
            continue
        
        # Define the new filter
        new_filter = [
            {
                "any_of": [
                    {
                        "test": "has_biome_tag",
                        "value": "overworld"
                    },
                    {
                        "test": "has_biome_tag",
                        "value": "overworld_generation"
                    }
                ]
            }
        ]
        
        conditions['minecraft:biome_filter'] = new_filter
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent='\t')
            f.write('\n')
        print(f"Updated {filename}")

if __name__ == "__main__":
    update_filters()
