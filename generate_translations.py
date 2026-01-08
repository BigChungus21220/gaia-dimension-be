import os
import json

def get_block_translations(blocks_dir):
    translations = {}
    for root, _, files in os.walk(blocks_dir):
        for file in files:
            if file.endswith(".json"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if not content.strip(): continue
                        data = json.loads(content)
                        
                        block = data.get("minecraft:block")
                        if not block: continue
                        desc = block.get("description")
                        if not desc: continue
                        identifier = desc.get("identifier")
                        if not identifier: continue
                        
                        display_name = generate_display_name(identifier)
                        key = f"tile.{identifier}.name"
                        translations[key] = display_name
                except Exception as e:
                    print(f"Error processing block {file_path}: {e}")
    return translations

def get_item_translations(items_dir):
    translations = {}
    
    for root, _, files in os.walk(items_dir):
        # Determine relative path from items_dir
        rel_path = os.path.relpath(root, items_dir).replace(os.sep, "/")
        
        # Check exclusions
        # Use simple string check for subdirectories
        if "androsa/armor" in rel_path or "androsa/weapons" in rel_path:
            continue
            
        for file in files:
            if file.endswith(".json"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if not content.strip(): continue
                        data = json.loads(content)
                        
                        item = data.get("minecraft:item")
                        if not item: continue
                        desc = item.get("description")
                        if not desc: continue
                        identifier = desc.get("identifier")
                        if not identifier: continue
                        
                        display_name = generate_display_name(identifier)
                        key = f"item.{identifier}.name"
                        translations[key] = display_name
                except Exception as e:
                    print(f"Error processing item {file_path}: {e}")
    return translations

def generate_display_name(identifier):
    if ":" in identifier:
        short_name = identifier.split(":", 1)[1]
    else:
        short_name = identifier
    return short_name.replace("_", " ").title()

def write_lang_file(translations, output_path):
    sorted_keys = sorted(translations.keys())
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("## Auto-generated Translations\n")
        for key in sorted_keys:
            f.write(f"{key}={translations[key]}\n")

def main():
    blocks_dir = "GaiaDimensions_BP/blocks"
    items_dir = "GaiaDimensions_BP/items"
    output_path = "GaiaDimension_RP/texts/en_US.lang"
    
    print("Generating block translations...")
    block_trans = get_block_translations(blocks_dir)
    print(f"Found {len(block_trans)} blocks.")
    
    print("Generating item translations...")
    item_trans = get_item_translations(items_dir)
    print(f"Found {len(item_trans)} items.")
    
    all_trans = {**block_trans, **item_trans}
    
    if all_trans:
        write_lang_file(all_trans, output_path)
        print(f"Successfully generated {len(all_trans)} translations in {output_path}")
    else:
        print("No translations found.")

if __name__ == "__main__":
    main()
