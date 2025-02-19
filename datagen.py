#datagen lmao
import os
import json
import argparse




def generate_loot_table(identifier):
    """
    Generate a simple loot table that drops the block (using its identifier).
    """
    return {
        "pools": [
            {
                "rolls": 1,
                "entries": [
                    {
                        "type": "item",
                        "name": identifier
                    }
                ]
            }
        ]
    }

def update_block_file(filepath, loot_table_rel_path):
    """
    Load a block JSON file, extract its identifier and update its components to include
    a reference to the loot table (given by loot_table_rel_path).
    Returns a tuple (identifier, updated_data) or None if file doesn't meet criteria.
    """
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"Skipping invalid JSON file: {filepath}")
        return None

    block_section = data.get("minecraft:block")
    if not block_section:
        print(f"Skipping file (missing 'minecraft:block'): {filepath}")
        return None

    description = block_section.get("description", {})
    identifier = description.get("identifier")
    if not identifier:
        print(f"Skipping file (no identifier found): {filepath}")
        return None

    # Ensure there is a components section and set the loot table reference.
    components = block_section.setdefault("components", {})
    components["minecraft:loot"] = loot_table_rel_path

    return identifier, data

def main():
    parser = argparse.ArgumentParser(
        description="Recursively update all block JSON files in a behaviour pack to add a loot table reference. "
                    "Generates loot table files (mirroring the blocks folder structure) and updates the block JSONs."
    )
    parser.add_argument(
        "--blocks-folder",
        required=True,
        help="Path to the blocks folder containing block definition JSON files (can include subfolders)."
    )
    parser.add_argument(
        "--loot-table-folder",
        required=True,
        help="Path to the loot_tables folder where generated loot table files will be saved. A 'blocks' subfolder will be created."
    )
    args = parser.parse_args()

    blocks_folder = os.path.abspath(args.blocks_folder)
    loot_base_folder = os.path.abspath(args.loot_table_folder)
    loot_tables_blocks_base = os.path.join(loot_base_folder, "blocks")
    
    for root, dirs, files in os.walk(blocks_folder):
        # Compute relative path from the base blocks folder
        rel_dir = os.path.relpath(root, blocks_folder)  # e.g. "subfolder1/subfolder2" or "."
        for file in files:
            if not file.endswith(".json"):
                continue
            block_file_path = os.path.join(root, file)
            # Use a temporary placeholder for loot table reference (will update below)
            temp_loot_ref = "placeholder"
            result = update_block_file(block_file_path, temp_loot_ref)
            if result is None:
                continue
            identifier, block_data = result
            # Derive loot table filename from the identifier (e.g. custom:my_block -> my_block.json)
            loot_filename = identifier.split(":")[-1] + ".json"
            # Create the output directory mirroring the blocks folder structure
            loot_output_dir = os.path.join(loot_tables_blocks_base, rel_dir)
            os.makedirs(loot_output_dir, exist_ok=True)
            loot_file_path = os.path.join(loot_output_dir, loot_filename)
            # Generate and save loot table JSON file
            loot_table = generate_loot_table(identifier)
            with open(loot_file_path, "w") as f:
                json.dump(loot_table, f, indent=4)
            # Construct the relative loot table path to reference in the block file.
            # This is relative to the pack root.
            # For example: "loot_tables/blocks/subfolder1/subfolder2/my_block.json"
            if rel_dir == ".":
                loot_rel_path = os.path.join("loot_tables", "blocks", loot_filename)
            else:
                loot_rel_path = os.path.join("loot_tables", "blocks", rel_dir, loot_filename)
            loot_rel_path = loot_rel_path.replace("\\", "/")
            # Update block data with the correct loot table reference.
            block_data["minecraft:block"]["components"]["minecraft:loot"] = loot_rel_path
            with open(block_file_path, "w") as f:
                json.dump(block_data, f, indent=4)
            print(f"Updated {block_file_path} with loot table {loot_rel_path}")

if __name__ == "__main__":
    main()
#python datagen.py --blocks-folder "./GaiaDimensions_BP/blocks/" --loot-table-folder "./aiaDimensions_BP/loot_tables/"

