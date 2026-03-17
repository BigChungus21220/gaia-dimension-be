import os
import json
import re

BP_ITEMS_ROOT = "data/items/androsa"
LANG_FILE = "resources/texts/en_US.lang"
KEEP_FOLDERS = ["weapons", "armor", "buckets", "flowers"]

def strip_comments(json_str):
    return re.sub(r"//.*", "", json_str)

def get_identifiers_in_folder(folder_name):
    identifiers = set()
    folder_path = os.path.join(BP_ITEMS_ROOT, folder_name)
    
    if not os.path.exists(folder_path):
        print(f"Warning: Folder {folder_path} does not exist.")
        return identifiers

    for root, dirs, files in os.walk(folder_path):
        for filename in files:
            if filename.endswith(".json"):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        content = strip_comments(content)
                        data = json.loads(content)
                        
                        desc = data.get("minecraft:item", {}).get("description", {})
                        identifier = desc.get("identifier")
                        if identifier:
                            identifiers.add(identifier)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    return identifiers

def main():
    print("Scanning for exception items...")
    keep_identifiers = set()
    for folder in KEEP_FOLDERS:
        ids = get_identifiers_in_folder(folder)
        keep_identifiers.update(ids)
        print(f"Found {len(ids)} items in '{folder}'")

    print(f"Total items to keep .name: {len(keep_identifiers)}")

    if not os.path.exists(LANG_FILE):
        print(f"Error: {LANG_FILE} not found.")
        return

    new_lines = []
    changes_count = 0
    
    with open(LANG_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        stripped = line.strip()
        
        # Check if it's an item key that might need changing
        # Matches item.namespace:id.name=Value
        # Excludes item.spawn_egg...
        match = re.match(r"^(item\.[^=]+?)\.name=(.*)$", stripped)
        
        if match:
            base_key = match.group(1) # e.g. item.gaiadimension:cinnabar
            value = match.group(2)
            
            # Check if this is a spawn egg or special key
            if "spawn_egg" in base_key:
                new_lines.append(line)
                continue

            # Extract the identifier from the key
            # Expected format: item.namespace:identifier
            if ":" in base_key:
                parts = base_key.split(":")
                if len(parts) >= 2:
                    # Construct full identifier: namespace:id
                    # item.gaiadimension -> gaiadimension
                    namespace = parts[0].replace("item.", "")
                    item_id = parts[1]
                    full_identifier = f"{namespace}:{item_id}"
                    
                    if full_identifier in keep_identifiers:
                        new_lines.append(line)
                    else:
                        # Remove .name
                        new_key = base_key
                        new_lines.append(f"{new_key}={value}\n")
                        changes_count += 1
                        # print(f"Changed: {base_key}.name -> {new_key}")
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    with open(LANG_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Processed lang file. Modified {changes_count} lines.")

if __name__ == "__main__":
    main()
