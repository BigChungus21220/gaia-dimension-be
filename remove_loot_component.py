import os
import json

def remove_loot_from_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content.strip():
                return False
            data = json.loads(content)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

    if "minecraft:block" not in data:
        return False

    block_root = data["minecraft:block"]
    components = block_root.get("components", {})
    
    if "minecraft:loot" in components:
        del components["minecraft:loot"]
        block_root["components"] = components
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False
            
    return False

def main():
    base_dir = "GaiaDimensions_BP/blocks/gaiadimension"
    target_subdirs = ["soils", "amethyst"]
    
    count = 0
    for subdir in target_subdirs:
        dir_path = os.path.join(base_dir, subdir)
        if not os.path.exists(dir_path):
            print(f"Directory not found: {dir_path}")
            continue
            
        for root, _, files in os.walk(dir_path):
            for file in files:
                if file.endswith(".json"):
                    if remove_loot_from_file(os.path.join(root, file)):
                        count += 1
                        
    print(f"Successfully removed minecraft:loot from {count} blocks.")

if __name__ == "__main__":
    main()
