import os
import json
import re

RP_ROOT = "GaiaDimension_RP"
ENTITY_DIR = os.path.join(RP_ROOT, "entity", "gaia_mobs")
LANG_FILE = os.path.join(RP_ROOT, "texts", "en_US.lang")

def strip_comments(json_str):
    return re.sub(r"//.*", "", json_str)

def to_title_case(text):
    return text.replace("_", " ").title()

def main():
    print("Generating translations...")

    existing_keys = set()
    if os.path.exists(LANG_FILE):
        with open(LANG_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                if '=' in line:
                    key = line.split('=')[0].strip()
                    existing_keys.add(key)

    new_translations = []

    for filename in os.listdir(ENTITY_DIR):
        if not filename.endswith(".json"):
            continue

        file_path = os.path.join(ENTITY_DIR, filename)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                content = strip_comments(content)
                entity_data = json.loads(content)

            client_entity = entity_data.get("minecraft:client_entity", {}).get("description", {})
            identifier = client_entity.get("identifier")

            if not identifier:
                continue

            # item.spawn_egg.entity.gaiadimension:entity_name.name
            translation_key = f"item.spawn_egg.entity.{identifier}.name"
            
            if translation_key not in existing_keys:
                # Value: Entity Name Spawn Egg
                # Remove namespace for the name part
                short_name = identifier.split(":")[-1]
                display_name = to_title_case(short_name)
                translation_value = f"{display_name} Spawn Egg"
                
                new_translations.append(f"{translation_key}={translation_value}")
                existing_keys.add(translation_key) # Prevent duplicates if multiple files have same ID (unlikely)

        except Exception as e:
            print(f"Error processing {filename}: {e}")

    if new_translations:
        with open(LANG_FILE, 'a', encoding='utf-8') as f:
            f.write("\n") # Ensure newline before appending
            for line in new_translations:
                f.write(line + "\n")
        print(f"Added {len(new_translations)} new translations.")
    else:
        print("No new translations needed.")

if __name__ == "__main__":
    main()