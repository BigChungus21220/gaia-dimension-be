import os
import zipfile
import shutil

# --- CONFIGURATION ---
BP_PATH = "data"
RP_PATH = "resources"
BUILD_DIR = "build"
ADDON_NAME = "GaiaDimension"

# Exclude src folder and other non-essential files from the behavior pack
BP_EXCLUDES = ['src', '.git', '.gitignore', 'package.json', 'package-lock.json', 'node_modules']
RP_EXCLUDES = ['.git', '.gitignore']

def zip_folder(folder_path, output_path, excludes=None):
    """Zips a folder, excluding specified files/directories."""
    if excludes is None:
        excludes = []
    
    print(f"Zipping {folder_path} to {output_path}...")
    file_count = 0
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            # Filter directories
            dirs[:] = [d for d in dirs if d not in excludes]
            
            for file in files:
                if file in excludes:
                    continue
                
                file_path = os.path.join(root, file)
                # Calculate the relative path for the zip file (relative to the folder being zipped)
                arcname = os.path.relpath(file_path, folder_path)
                zipf.write(file_path, arcname)
                file_count += 1
    print(f"Added {file_count} files to {output_path}")

def package():
    print(f"--- Starting GaiaDimension Packaging ---")
    
    # 1. Prepare build directory
    if os.path.exists(BUILD_DIR):
        print(f"Cleaning old build directory: {BUILD_DIR}")
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR)

    bp_mcpack = os.path.join(BUILD_DIR, "GaiaDimensions_BP.mcpack")
    rp_mcpack = os.path.join(BUILD_DIR, "GaiaDimension_RP.mcpack")
    addon_file = os.path.join(BUILD_DIR, f"{ADDON_NAME}.mcaddon")

    # 2. Create BP .mcpack
    print(f"Creating Behavior Pack...")
    zip_folder(BP_PATH, bp_mcpack, BP_EXCLUDES)

    # 3. Create RP .mcpack
    print(f"Creating Resource Pack...")
    zip_folder(RP_PATH, rp_mcpack, RP_EXCLUDES)

    # 4. Create .mcaddon (Zipping the two .mcpack files)
    print(f"Creating Addon Bundle: {addon_file}")
    if os.path.exists(bp_mcpack) and os.path.exists(rp_mcpack):
        with zipfile.ZipFile(addon_file, 'w', zipfile.ZIP_DEFLATED) as addon_zip:
            addon_zip.write(bp_mcpack, os.path.basename(bp_mcpack))
            addon_zip.write(rp_mcpack, os.path.basename(rp_mcpack))
    else:
        print(f"ERROR: .mcpack files not found in {BUILD_DIR}!")

    print(f"\n--- Packaging Complete! ---")
    print(f"Location: {os.path.abspath(BUILD_DIR)}")
    if os.path.exists(addon_file):
        print(f"Files: {os.path.basename(addon_file)}")
    else:
        print("ERROR: Failed to create .mcaddon file.")

if __name__ == "__main__":
    package()
