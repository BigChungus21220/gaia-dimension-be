import os
import json

# This script generates clean, minimal JSON for all fluid state blocks with correct, hardcoded names.

FLUID_DATA = {
    "liquid_aura": { "texture": "liquid_aura_still", "suffix": "aura" },
    "liquid_bismuth": { "texture": "liquid_bismuth_still", "suffix": "bismuth" },
    "mineral_water": { "texture": "mineral_water_still", "suffix": "mineral_water" },
    "superhot_magma": { "texture": "superhot_magma_still", "suffix": "superhot_magma" },
    "sweet_muck": { "texture": "sweet_muck_still", "suffix": "sweet_muck" },
}

BEHAVIOR_PACK_ROOT = os.path.abspath("C:/Users/ADMIN/OneDrive/Documents/GitHub/gaia-dimension-be/GaiaDimensions_BP")
FLUIDS_DIR = os.path.join(BEHAVIOR_PACK_ROOT, "blocks", "fluids")

def generate_minimal_fluid_json(identifier, texture, state):
    geometry = "geometry.fluid"
    if state in ["1", "2", "3"]:
        geometry = f"geometry.fluid{state}"

    return {
        "format_version": "1.20.80",
        "minecraft:block": {
            "description": {
                "identifier": identifier
            },
            "components": {
                "minecraft:material_instances": {
                    "*": {
                        "texture": texture,
                        "render_method": "blend"
                    }
                },
                "minecraft:loot": "loot_tables/blocks/null.json",
                "tag:fluid": {},
                "minecraft:geometry": geometry,
                "minecraft:light_dampening": 0,                "minecraft:selection_box": False,
                "minecraft:collision_box": False,
                "minecraft:destructible_by_mining": False,
                "minecraft:destructible_by_explosion": False
            }
        }
    }

print("--- Generating minimal fluid state JSON files... ---")

for base_id, info in FLUID_DATA.items():
    folder_path = os.path.join(FLUIDS_DIR, base_id)
    os.makedirs(folder_path, exist_ok=True)

    # State files 1, 2, 3
    for i in range(1, 4):
        state_str = str(i)
        identifier = f"gaia:liquid{info['suffix']}{state_str}"
        filename = f"liquid_{info['suffix']}{state_str}.json"
        file_path = os.path.join(folder_path, filename)
        json_content = generate_minimal_fluid_json(identifier, info["texture"], state_str)
        with open(file_path, 'w') as f: json.dump(json_content, f, indent=2)
        print(f"Generated: {file_path}")

    # Down state file
    down_identifier = f"gaia:{base_id}_down"
    down_filename = f"{base_id}_down.json"
    down_file_path = os.path.join(folder_path, down_filename)
    down_json_content = generate_minimal_fluid_json(down_identifier, info["texture"], "down")
    with open(down_file_path, 'w') as f: json.dump(down_json_content, f, indent=2)
    print(f"Generated: {down_file_path}")

print("--- Fluid state file generation complete. ---")
