
import os
import json

# List of files that previously failed parsing
FILES_TO_FIX = [
    "GaiaDimensions_BP/blocks/ores/copal/gaia_copal_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/copal/gaia_cracked_copal_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/copal/gaia_crusted_copal_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jade/gaia_cracked_jade_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jade/gaia_crusted_jade_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jade/gaia_jade_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jet/gaia_cracked_jet_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jet/gaia_crusted_jet_brick_stair.json",
    "GaiaDimensions_BP/blocks/ores/jet/gaia_jet_brick_stair.json",
    "GaiaDimensions_BP/blocks/stones/gaia_stone/gaia_crusted_gaia_brick_stair.json",
    "GaiaDimensions_BP/blocks/stones/gaia_stone/gaia_gaia_brick_stair.json",
    "GaiaDimensions_BP/blocks/stones/gaia_stone/gaia_gaia_cobblestone_stair.json",
    "GaiaDimensions_BP/blocks/stones/gaia_stone/gaia_gaia_stone_stair.json",
    "GaiaDimensions_BP/entities/gaia_mobs/crystal_golem.json",
    "GaiaDimensions_BP/items/glint_and_gold.json"
]

def find_matching_brace(text, start_index):
    brace_level = 0
    for i in range(start_index, len(text)):
        char = text[i]
        if char == '{':
            brace_level += 1
        elif char == '}':
            brace_level -= 1
            if brace_level == 0:
                return i
    return -1 # Not found

def fix_and_clear_events():
    print("--- Running final cleanup script ---")
    for file_path in FILES_TO_FIX:
        if not os.path.exists(file_path):
            print(f"Warning: File not found {file_path}. Skipping.")
            continue
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()

            events_key = '"events":'
            start_key_index = content.find(events_key)

            if start_key_index != -1:
                start_brace_index = content.find('{', start_key_index)
                if start_brace_index != -1:
                    end_brace_index = find_matching_brace(content, start_brace_index)
                    if end_brace_index != -1:
                        # Slice the string to remove the events block
                        part1 = content[:start_key_index]
                        part2 = content[end_brace_index + 1:]
                        # Replace with an empty events block
                        new_content = part1 + '"events": {{}}\n' + part2
                        
                        # As a final step, try to make the whole file valid JSON by removing comments
                        # This is a bit aggressive but should work for this case
                        new_content_no_comments = '\n'.join([line for line in new_content.split('\n') if not line.strip().startswith('//')])

                        with open(file_path, 'w') as f:
                            f.write(new_content_no_comments)
                        print(f"Cleared 'events' and comments in {file_path}")
                    else:
                        print(f"Warning: Could not find matching brace for 'events' in {file_path}")
                else:
                    print(f"Warning: Found 'events' key but no opening brace in {file_path}")
            else:
                print(f"Info: 'events' key not found in {file_path}. Skipping.")

        except Exception as e:
            print(f"Error processing {file_path}: {e}")

    print("\nFinal cleanup complete.")

if __name__ == '__main__':
    fix_and_clear_events()
