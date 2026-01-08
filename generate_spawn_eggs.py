import os
import json
from PIL import Image, ImageChops
import colorsys

RP_ROOT = "GaiaDimension_RP"
ENTITY_DIR = os.path.join(RP_ROOT, "entity", "gaia_mobs")
TEXTURE_DIR = os.path.join(RP_ROOT, "textures")
TEMPLATE_PATH = os.path.join(TEXTURE_DIR, "gaiadimension/androsa/item/spawn_gaia.png")
OUTPUT_DIR = os.path.join(TEXTURE_DIR, "gaiadimension/androsa/item")
ITEM_TEXTURE_PATH = os.path.join(TEXTURE_DIR, "item_texture.json")

def get_dominant_color(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        # Resize to 1x1 to get average color
        img = img.resize((1, 1), resample=Image.Resampling.LANCZOS)
        color = img.getpixel((0, 0))
        return color
    except Exception as e:
        print(f"Error getting color from {image_path}: {e}")
        return None

def normalize_color(rgba):
    r, g, b, a = rgba
    h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
    
    # Normalize: Ensure distinct color (boost saturation/value)
    s = max(s, 0.6) 
    v = max(v, 0.8)
    
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r*255), int(g*255), int(b*255), 255)

def apply_tint(template_path, color, output_path):
    try:
        base = Image.open(template_path).convert("RGBA")
        tint = Image.new("RGBA", base.size, color)
        
        r, g, b, a = base.split()
        tr, tg, tb, ta = tint.split()
        
        # Multiply RGB channels
        comp_r = ImageChops.multiply(r, tr)
        comp_g = ImageChops.multiply(g, tg)
        comp_b = ImageChops.multiply(b, tb)
        
        result = Image.merge("RGBA", (comp_r, comp_g, comp_b, a))
        result.save(output_path)
        return True
    except Exception as e:
        print(f"Error applying tint: {e}")
        return False

def main():
    print("Starting spawn egg generation...")
    
    if not os.path.exists(ITEM_TEXTURE_PATH):
        print(f"Error: {ITEM_TEXTURE_PATH} not found.")
        return

    with open(ITEM_TEXTURE_PATH, 'r') as f:
        item_texture_data = json.load(f)
    
    texture_defs = item_texture_data.get("texture_data", {})
    processed_count = 0
    
    for filename in os.listdir(ENTITY_DIR):
        if not filename.endswith(".json"):
            continue
            
        file_path = os.path.join(ENTITY_DIR, filename)
        
        try:
            with open(file_path, 'r') as f:
                entity_data = json.load(f)
            
            client_entity = entity_data.get("minecraft:client_entity", {}).get("description", {})
            identifier = client_entity.get("identifier")
            if not identifier:
                continue
                
            short_name = identifier.split(":")[-1]
            
            # Find texture
            textures = client_entity.get("textures", {})
            default_texture = textures.get("default")
            
            if not default_texture:
                print(f"Skipping {short_name}: No default texture found.")
                continue
                
            texture_full_path = os.path.join(RP_ROOT, default_texture)
            if not os.path.exists(texture_full_path):
                texture_full_path += ".png"
            
            if not os.path.exists(texture_full_path):
                print(f"Skipping {short_name}: Texture file not found at {texture_full_path}")
                continue
                
            # Process
            color = get_dominant_color(texture_full_path)
            if not color:
                continue
                
            norm_color = normalize_color(color)
            
            egg_name = f"spawn_egg_{short_name}"
            egg_filename = f"{egg_name}.png"
            egg_output_path = os.path.join(OUTPUT_DIR, egg_filename)
            
            if apply_tint(TEMPLATE_PATH, norm_color, egg_output_path):
                # Update item_texture.json
                # Format: textures/gaiadimension/androsa/item/spawn_egg_...
                rel_path = os.path.relpath(egg_output_path, RP_ROOT).replace("\\", "/").replace(".png", "")
                texture_defs[egg_name] = { "textures": rel_path }
                
                # Update Entity JSON
                if "spawn_egg" not in client_entity:
                    client_entity["spawn_egg"] = {}
                
                client_entity["spawn_egg"]["texture"] = egg_name
                if "texture_index" in client_entity["spawn_egg"]:
                    del client_entity["spawn_egg"]["texture_index"]
                    
                with open(file_path, 'w') as f:
                    json.dump(entity_data, f, indent=2)
                
                processed_count += 1
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    item_texture_data["texture_data"] = texture_defs
    with open(ITEM_TEXTURE_PATH, 'w') as f:
        json.dump(item_texture_data, f, indent=2)

    print(f"Completed. Processed {processed_count} entities.")

if __name__ == "__main__":
    main()
