import os
import zipfile
import shutil

# --- CONFIGURATION ---
BP_PATH = "GaiaDimensions_BP"
RP_PATH = "GaiaDimension_RP"
BUILD_DIR = "build"
ADDON_NAME = "GaiaDimension"

# Exclude src folder and other non-essential files from the behavior pack
BP_EXCLUDES = ['src', '.git', '.gitignore', 'package.json', 'package-lock.json', 'node_modules']
RP_EXCLUDES = ['.git', '.gitignore']

def zip_folder(folder_path, output_path, excludes=None):
    """Zips a folder, excluding specified files/directories."""
    if excludes is None:
        excludes = []
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(folder_path):
            # Filter directories
            dirs[:] = [d for d in dirs if d not in excludes]
            
            for file in files:
                if file in excludes:
                    continue
                
                file_path = os.path.join(root, file)
                # Calculate the relative path for the zip file
                arcname = os.path.relpath(file_path, os.path.dirname(folder_path))
                zipf.write(file_path, arcname)

def package():
    print(f"--- Starting {ADDON_NAME} Packaging ---")
    
    # 1. Prepare build directory
    if os.path.exists(BUILD_DIR):
        print(f"Cleaning old build directory: {BUILD_DIR}")
        shutil.rmtree(BUILD_DIR)
    os.makedirs(BUILD_DIR)

    bp_mcpack = os.path.join(BUILD_DIR, f"{BP_PATH}.mcpack")
    rp_mcpack = os.path.join(BUILD_DIR, f"{RP_PATH}.mcpack")
    addon_file = os.path.join(BUILD_DIR, f"{ADDON_NAME}.mcaddon")

    # 2. Create BP .mcpack
    print(f"Creating Behavior Pack: {bp_mcpack}")
    zip_folder(BP_PATH, bp_mcpack, BP_EXCLUDES)

    # 3. Create RP .mcpack
    print(f"Creating Resource Pack: {rp_mcpack}")
    zip_folder(RP_PATH, rp_mcpack, RP_EXCLUDES)

    # 4. Create .mcaddon (Zipping the two .mcpack files)
    print(f"Creating Addon Bundle: {addon_file}")
    with zipfile.ZipFile(addon_file, 'w', zipfile.ZIP_DEFLATED) as addon_zip:
        addon_zip.write(bp_mcpack, os.path.basename(bp_mcpack))
        addon_zip.write(rp_mcpack, os.path.basename(rp_mcpack))

    print(f"\n--- Packaging Complete! ---")
    print(f"Location: {os.path.abspath(BUILD_DIR)}")
    print(f"Files: {os.path.basename(addon_file)}")

if __name__ == "__main__":
    package()
