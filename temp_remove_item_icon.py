
import os
import json

file_paths = [
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\purple_agate\purple_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\pink_agate\pink_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\green_agate\green_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\golden\golden_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\fossilized\fossilized_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\fire_agate\fire_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\corrupted\corrupted_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\burnt_agate\burnt_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\blue_agate\blue_agate_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\trees\aura\aura_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\amethyst_bricks\amethyst_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\crusted_copal_bricks\crusted_copal_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\brilliant_stone\brilliant_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\copal_bricks\copal_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\cracked_amethyst_bricks\cracked_amethyst_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gaia_keystone\gaia_keystone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\crusted_amethyst_bricks\crusted_amethyst_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\cracked_gaia_stone_bricks\cracked_gaia_stone_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\crusted_gaia_stone_bricks\crusted_gaia_stone_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\cracked_copal_bricks\cracked_copal_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\crusted_jet_bricks\crusted_jet_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\cracked_jade_bricks\cracked_jade_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gaia_cobblestone\gaia_cobblestone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gaia_crystalized_cracked_bricks\gaia_crystalized_cracked_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gaia_stone\gaia_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gaia_stone_bricks\gaia_stone_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\bolstered_bricks\bolstered_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\crusted_jade_bricks\crusted_jade_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\golden_stone\golden_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\gilded_brilliant_stone\gilded_brilliant_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\jade_bricks\jade_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\jet_bricks\jet_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\malachite_bricks\malachite_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\wasteland_stone\wasteland_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\tough_golden_stone\tough_golden_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\malachite_cracked_bricks\malachite_cracked_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\malachite_chisel_bricks\malachite_chisel_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\reinforced_bricks\reinforced_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\pulsing_malachite_bricks\pulsing_malachite_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\malachite_crusted_bricks\malachite_crusted_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\static_stone\static_stone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\malachite_crystalized_cracked_bricks\malachite_crystalized_cracked_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\moonstone\moonstone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\nexustone\nexustone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\bricks_and_stones\cracked_jet_bricks\cracked_jet_bricks_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\copal\copal_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\cinnabar\cinnabar_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\jade\jade_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\hematite\hematite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\jet\jet_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\malachite\malachite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\labradorite\labradorite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\red_opal\red_opal_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\moonstone\moonstone_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\white_opal\white_opal_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\pyrite\pyrite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\tektite\tektite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\sugilite\sugilite_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\opal\opal_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\blue_opal\blue_opal_stairs.json',
    r'C:\Users\ADMIN\OneDrive\Documents\GitHub\gaia-dimension-be\GaiaDimensions_BP\blocks\ores\green_opal\green_opal_stairs.json'
]

def remove_item_icon_permutation(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        if 'permutations' in data['minecraft:block']:
            data['minecraft:block']['permutations'] = [p for p in data['minecraft:block']['permutations'] if p.get('condition') != "q.transform_to_item_icon"]

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f'Successfully removed item icon permutation from: {file_path}')

    except Exception as e:
        print(f'ERROR: Failed to update file {file_path}. Reason: {e}')

print("Starting item icon permutation removal script...")
for file_path in file_paths:
    remove_item_icon_permutation(file_path)
print("Item icon permutation removal script finished.")
