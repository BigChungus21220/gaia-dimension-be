import os
import json

DIRS = [
    "GaiaDimensions_BP/blocks/gaiadimension/ores",
    "GaiaDimensions_BP/blocks/gaiadimension/flower"
]
LANG_FILE = "GaiaDimension_RP/texts/en_US.lang"

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def get_human_name(identifier):
    name = identifier.split(":")[-1]
    name = name.replace("_", " ")
    return name.title()

def main():
    if not os.path.exists(LANG_FILE):
        print(f"Lang file not found: {LANG_FILE}")
        return

    with open(LANG_FILE, 'r') as f:
        lang_content = f.read()
        
    lines = lang_content.splitlines()
    existing_keys = set()
    for line in lines:
        if "=" in line:
            key = line.split("=")[0].strip()
            existing_keys.add(key)

    new_entries = []
    
    for base_dir in DIRS:
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                if file.endswith(".json"):
                    file_path = os.path.join(root, file)
                    try:
                        data = load_json(file_path)
                        identifier = data.get("minecraft:block", {}).get("description", {}).get("identifier")
                        
                        if identifier:
                            key = f"tile.{identifier}.name"
                            if key not in existing_keys:
                                human_name = get_human_name(identifier)
                                new_entries.append(f"{key}={human_name}")
                                existing_keys.add(key)
                                
                    except Exception as e:
                        print(f"Error processing {file_path}: {e}")

    if new_entries:
        with open(LANG_FILE, 'a') as f:
            if not lang_content.endswith("\n"):
                f.write("\n")
            f.write("\n## Block Translations\n")
            for entry in new_entries:
                f.write(entry + "\n")
        print(f"Added {len(new_entries)} new translation entries to {LANG_FILE}")
    else:
        print("No new translation entries to add.")

if __name__ == "__main__":
    main()
