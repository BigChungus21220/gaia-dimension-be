import os
import shutil

RECIPE_DIR = "GaiaDimensions_BP/recipes"
WOODSETS = [
    "aura",
    "blue_agate",
    "burnt_agate",
    "corrupted",
    "fire_agate",
    "fossilized",
    "golden",
    "green_agate",
    "pink_agate"
]

def main():
    if not os.path.exists(RECIPE_DIR):
        print(f"Error: {RECIPE_DIR} not found.")
        return

    count = 0
    for woodset in WOODSETS:
        # Create directory
        target_dir = os.path.join(RECIPE_DIR, woodset)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        # Move files
        for filename in os.listdir(RECIPE_DIR):
            # Check if file belongs to this woodset
            # We check if filename starts with woodset_
            if filename.startswith(f"{woodset}_") and filename.endswith(".json"):
                src_path = os.path.join(RECIPE_DIR, filename)
                dst_path = os.path.join(target_dir, filename)
                
                try:
                    shutil.move(src_path, dst_path)
                    count += 1
                except Exception as e:
                    print(f"Error moving {filename}: {e}")

    print(f"Moved {count} recipe files into organized folders.")

if __name__ == "__main__":
    main()
