import os
import json

def transform_item_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content.strip():
                return False
            data = json.loads(content)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

    if "minecraft:item" not in data:
        return False

    item_root = data["minecraft:item"]
    description = item_root.get("description", {})
    components = item_root.get("components", {})

    # Check for the old format in components
    if "minecraft:creative_category" in components:
        creative_cat = components.pop("minecraft:creative_category")
        
        # Extract values
        category = creative_cat.get("category", "items").lower()
        group = creative_cat.get("parent", "")
        
        # New format: menu_category inside description
        description["menu_category"] = {
            "category": category,
            "group": group
        }
        
        item_root["description"] = description
        item_root["components"] = components
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False
            
    return False

def main():
    items_dir = "GaiaDimensions_BP/items"
    count = 0
    for root, _, files in os.walk(items_dir):
        for file in files:
            if file.endswith(".json"):
                if transform_item_file(os.path.join(root, file)):
                    count += 1
    print(f"Successfully transformed {count} items.")

if __name__ == "__main__":
    main()