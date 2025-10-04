import os

# Configuration
WOOD_TYPES = [
    "blue_agate",
    "burnt_agate",
    "fire_agate",
    "green_agate",
    "pink_agate",
    "purple_agate"
]
BEHAVIOR_PACK_ROOT = os.path.abspath("C:/Users/ADMIN/OneDrive/Documents/GitHub/gaia-dimension-be/GaiaDimensions_BP")
TEMPLATE_DIR = os.path.join(BEHAVIOR_PACK_ROOT, "blocks", "template")
TREES_DIR = os.path.join(BEHAVIOR_PACK_ROOT, "blocks", "trees")

# Mapping from template filename suffix to target subdirectory
# This is inferred from the template file names and the target directories
SUFFIX_MAP = {
    "_leaves.json": "leaves",
    "_log.json": "logs", # Assuming the target is 'logs' not 'log'
    "_sapling.json": "saplings",
    "_wood.json": "woods",
    "stripped_alder_log.json": "stripped_log", # Special case
    "stripped_alder_wood.json": "stripped_woods" # Special case
}

# Ensure target directories exist
for subdir in set(SUFFIX_MAP.values()):
    os.makedirs(os.path.join(TREES_DIR, subdir), exist_ok=True)

# --- Main Script ---
def main():
    print(f"Template directory: {TEMPLATE_DIR}")
    print(f"Trees directory: {TREES_DIR}")

    if not os.path.isdir(TEMPLATE_DIR):
        print(f"Error: Template directory not found at {TEMPLATE_DIR}")
        return

    template_files = os.listdir(TEMPLATE_DIR)
    print(f"Found {len(template_files)} template files.")

    for wood_type in WOOD_TYPES:
        print(f"--- Processing wood type: {wood_type} ---")
        for template_filename in template_files:
            if not template_filename.startswith("alder") and not template_filename.startswith("stripped_alder"):
                continue

            # Read template content
            with open(os.path.join(TEMPLATE_DIR, template_filename), 'r') as f:
                content = f.read()

            # Replace 'alder' with the new wood type
            new_content = content.replace("alder", wood_type).replace("door", "curtain")

            # Determine target subdirectory and filename
            target_subdir = None
            new_filename = template_filename.replace("alder", wood_type)

            if template_filename == "stripped_alder_log.json":
                target_subdir = SUFFIX_MAP["stripped_alder_log.json"]
            elif template_filename == "stripped_alder_wood.json":
                target_subdir = SUFFIX_MAP["stripped_alder_wood.json"]
            else:
                for suffix, subdir in SUFFIX_MAP.items():
                    if template_filename.endswith(suffix):
                        target_subdir = subdir
                        break
            
            # Fallback for other files like planks, stairs, etc.
            if target_subdir is None:
                # For files like alder_planks.json, alder_stairs.json, etc.
                # we will place them in a directory named after the block type
                # e.g., trees/planks/blue_agate_planks.json
                block_type_name = template_filename.replace("alder_", "").replace(".json", "")
                # a simple pluralization for directory name
                if not block_type_name.endswith('s'):
                    block_type_name += 's'
                target_subdir = block_type_name
                os.makedirs(os.path.join(TREES_DIR, target_subdir), exist_ok=True)


            if target_subdir:
                target_path = os.path.join(TREES_DIR, target_subdir, new_filename)
                with open(target_path, 'w') as f:
                    f.write(new_content)
                print(f"  Created: {os.path.relpath(target_path, BEHAVIOR_PACK_ROOT)}")
            else:
                print(f"  Warning: Could not determine target directory for {template_filename}")

    print("--- Script finished ---")

if __name__ == "__main__":
    main()
