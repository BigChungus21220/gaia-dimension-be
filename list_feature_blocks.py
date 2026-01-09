import os
import json
import re

FEATURES_DIR = "GaiaDimensions_BP/features"
OUTPUT_FILE = "feature_blocks_list.md"

def extract_identifiers(data, identifiers):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, str):
                if value.startswith("gaiadimension:"):
                    # Check if it looks like a block identifier (simple heuristic)
                    # Exclude known non-block patterns if necessary, but "gaiadimension:" usually prefixes blocks/items/entities
                    # Features often use block identifiers directly.
                    identifiers.add(value)
            elif isinstance(value, (dict, list)):
                extract_identifiers(value, identifiers)
    elif isinstance(data, list):
        for item in data:
            extract_identifiers(item, identifiers)

def main():
    block_identifiers = set()
    
    print(f"Scanning {FEATURES_DIR}...")
    for root, dirs, files in os.walk(FEATURES_DIR):
        for file in files:
            if file.endswith(".json"):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        extract_identifiers(data, block_identifiers)
                except Exception as e:
                    print(f"Error reading {file}: {e}")

    # Filter out likely non-block IDs if possible, or just list all found
    # Commonly features use "places_block": "gaiadimension:block_name"
    # Logic above captures all "gaiadimension:..." strings.
    # We might capture feature names too (e.g. gaiadimension:gen/...). 
    # Let's try to filter purely based on "places_block" or "block" keys?
    # The prompt says "find all gaiadimension: blocks id", implies I should try to be specific.
    # But recursively searching values is safer to catch all usages.
    # I will list them all, and maybe categorize if possible, or just raw list.
    
    # Let's verify by checking if the string contains "/" which usually denotes a feature/function,
    # whereas blocks are usually just "namespace:name".
    
    blocks = []
    others = []
    
    for id in sorted(block_identifiers):
        if "/" in id:
            others.append(id)
        else:
            blocks.append(id)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("# Gaia Dimension Feature Blocks\n\n")
        f.write("## Potential Block Identifiers\n")
        for id in blocks:
            f.write(f"- `{id}`\n")
            
        f.write("\n## Other Identifiers (Features, etc.)\n")
        for id in others:
            f.write(f"- `{id}`\n")

    print(f"Found {len(blocks)} potential blocks and {len(others)} other identifiers.")
    print(f"List written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
