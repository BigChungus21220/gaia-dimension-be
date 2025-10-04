
import os
import re

TREES_PATH = os.path.join('GaiaDimensions_BP', 'blocks', 'trees')

def fix_and_delete_duplicates():
    print("--- Scanning for duplicates with comments ---")
    for root, dirs, files in os.walk(TREES_PATH):
        # Skip the curtain directory as per previous instructions
        if 'curtain' in root.split(os.sep):
            continue

        for filename in files:
            if filename.startswith('gaia_') and filename.endswith('.json'):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    # Remove lines with comments to make it parsable or searchable
                    content_no_comments = re.sub(r'.*//.*\n', '\n', content)
                    
                    # Check for the presence of an events block
                    if '"events":' in content_no_comments:
                        print(f"Found 'events' in {file_path}. Deleting...")
                        os.remove(file_path)
                        print(f"  -> Deleted {file_path}")

                except Exception as e:
                    print(f"Error processing {file_path}: {e}")

    print("\nCleanup complete.")

if __name__ == '__main__':
    fix_and_delete_duplicates()

