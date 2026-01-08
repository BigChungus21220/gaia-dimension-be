import os
import json
import re
from PIL import Image, ImageOps
import colorsys

RP_ROOT = "GaiaDimension_RP"
ENTITY_DIR = os.path.join(RP_ROOT, "entity", "gaia_mobs")
TEXTURE_DIR = os.path.join(RP_ROOT, "textures")
TEMPLATE_PATH = os.path.join(TEXTURE_DIR, "gaiadimension/androsa/item/spawn_gaia.png")
OUTPUT_DIR = os.path.join(TEXTURE_DIR, "gaiadimension/androsa/item")
ENTITY_TEXTURE_ROOT = os.path.join(TEXTURE_DIR, "gaiadimension/androsa/entity")

def strip_comments(json_str):
    return re.sub(r"//.*", "", json_str)

def get_vibrant_color(image_path):
    try:
        img = Image.open(image_path).convert("RGBA")
        img.thumbnail((128, 128)) 
        
        max_score = -1.0
        best_color = (128, 128, 128)
        
        pixels = list(img.getdata())
        
        for r, g, b, a in pixels:
            if a < 128: 
                continue
                
            h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            
            # Filter out grays/blacks/whites to find the "Color"
            if v < 0.15 or (s < 0.1 and v > 0.9): 
                score = -1
            else:
                score = s * 2 + v 
                
            if score > max_score:
                max_score = score
                best_color = (r, g, b)
                
        # Force "Gem" Look: High Saturation, Max Brightness
        br, bg, bb = best_color
        h, s, v = colorsys.rgb_to_hsv(br/255.0, bg/255.0, bb/255.0)
        
        new_s = max(0.80, s) # Boost min saturation
        new_s = min(1.0, new_s + 0.2) 
        new_v = 1.0 # Max brightness
        
        fr, fg, fb = colorsys.hsv_to_rgb(h, new_s, new_v)
        
        return (int(fr*255), int(fg*255), int(fb*255), 255)
        
    except Exception as e:
        print(f"Error analyzing color from {image_path}: {e}")
        return None

def apply_aggressive_tint(template_path, color, output_path):
    try:
        base = Image.open(template_path).convert("RGBA")
        alpha = base.split()[3]
        
        # 1. Convert to Grayscale
        gray = base.convert("L")
        
        # 2. Normalize Brightness (Make the brightest pixel 255/White)
        # This fixes the "too dark" template issue
        min_val, max_val = gray.getextrema()
        if max_val < 255:
            if max_val == 0: max_val = 1
            scale = 255.0 / max_val
            gray = gray.point(lambda x: x * scale)
        
        # 3. Colorize (Map Black -> Black, White -> Target Color)
        target_rgb = color[:3]
        colored = ImageOps.colorize(gray, black="black", white=target_rgb)
        
        # 4. Restore Alpha
        colored.putalpha(alpha)
        
        colored.save(output_path)
        return True
    except Exception as e:
        print(f"Error applying tint: {e}")
        return False

def resolve_texture_path(given_path, short_name):
    full_path = os.path.join(RP_ROOT, given_path)
    if not full_path.endswith(".png"):
        full_path_png = full_path + ".png"
    else:
        full_path_png = full_path

    if os.path.exists(full_path_png) and os.path.isfile(full_path_png):
        return full_path_png
        
    if os.path.isdir(full_path):
        candidate = os.path.join(full_path, f"{short_name}.png")
        if os.path.exists(candidate):
            return candidate
        for f in os.listdir(full_path):
            if f.endswith(".png"):
                return os.path.join(full_path, f)

    candidate = os.path.join(ENTITY_TEXTURE_ROOT, f"{short_name}.png")
    if os.path.exists(candidate):
        return candidate
        
    for root, dirs, files in os.walk(ENTITY_TEXTURE_ROOT):
        if f"{short_name}.png" in files:
            return os.path.join(root, f"{short_name}.png")

    return None

def main():
    print("Starting aggressive spawn egg generation...")
    
    processed_count = 0
    
    for filename in os.listdir(ENTITY_DIR):
        if not filename.endswith(".json"):
            continue
            
        file_path = os.path.join(ENTITY_DIR, filename)
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
                content = strip_comments(content)
                entity_data = json.loads(content)
            
            client_entity = entity_data.get("minecraft:client_entity", {}).get("description", {})
            identifier = client_entity.get("identifier")
            if not identifier:
                continue
                
            short_name = identifier.split(":")[-1]
            
            textures = client_entity.get("textures", {})
            default_texture = textures.get("default")
            
            if not default_texture:
                continue
                
            texture_full_path = resolve_texture_path(default_texture, short_name)
            if not texture_full_path:
                texture_full_path = resolve_texture_path("", short_name)

            if not texture_full_path:
                print(f"Skipping {short_name}: Texture not found")
                continue
                
            color = get_vibrant_color(texture_full_path)
            if not color:
                continue
                
            egg_name = f"spawn_egg_{short_name}"
            egg_filename = f"{egg_name}.png"
            egg_output_path = os.path.join(OUTPUT_DIR, egg_filename)
            
            if apply_aggressive_tint(TEMPLATE_PATH, color, egg_output_path):
                processed_count += 1
                
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    print(f"Completed. Aggressively updated {processed_count} spawn eggs.")

if __name__ == "__main__":
    main()
