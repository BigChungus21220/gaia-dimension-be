import os
import json
import re

def clean_molang(s):
    if not isinstance(s, str):
        return s
    # Remove leading/trailing whitespace and excessive internal whitespace
    s = s.strip()
    s = re.sub(r'\s+', ' ', s)
    # Ensure semicolons have a space after them
    s = s.replace(';', '; ')
    s = re.sub(r'\s+;', ';', s)
    # Ensure spaces around operators
    for op in ['=', '+', '-', '*', '/']:
        s = re.sub(r'\s*\{0}\s*'.format(re.escape(op)), ' {0} '.format(op), s)
    
    # Cleanup spaces around braces and colons
    s = s.replace('{ ', '{').replace(' {', '{').replace('{', ' { ')
    s = s.replace(' }', '}').replace('} ', '}').replace('}', ' } ')
    s = s.replace(': ', ':').replace(' :', ':').replace(':', ' : ')
    
    # Remove double spaces again after replacements
    s = re.sub(r'\s+', ' ', s).strip()
    
    # Special fix for v.x , v.y etc if I messed up something like v . x
    s = s.replace('v . ', 'v.')
    s = s.replace('q . ', 'q.')
    s = s.replace('math . ', 'math.')
    
    return s

def fix_particle_files():
    dir_path = "GaiaDimension_RP/particles"
    for filename in os.listdir(dir_path):
        if filename.startswith("cloud_") and filename.endswith(".json") or filename == "sky_particle.particle.json":
            file_path = os.path.join(dir_path, filename)
            with open(file_path, 'r') as f:
                try:
                    data = json.load(f)
                except:
                    print(f"Failed to load {filename}")
                    continue
            
            # Fix cloud files
            if filename.startswith("cloud_"):
                comp = data.get("particle_effect", {}).get("components", {})
                if "minecraft:particle_lifetime_expression" in comp:
                    ml = comp["minecraft:particle_lifetime_expression"].get("max_lifetime")
                    if ml:
                        comp["minecraft:particle_lifetime_expression"]["max_lifetime"] = clean_molang(ml)
                
                if "minecraft:particle_motion_parametric" in comp:
                    rp = comp["minecraft:particle_motion_parametric"].get("relative_position")
                    if isinstance(rp, list) and len(rp) > 0:
                        rp[0] = clean_molang(rp[0])
                        if len(rp) > 2:
                            rp[2] = clean_molang(rp[2])
            
            # Fix sky_particle
            if filename == "sky_particle.particle.json":
                comp = data.get("particle_effect", {}).get("components", {})
                if "minecraft:emitter_lifetime_expression" in comp:
                    ae = comp["minecraft:emitter_lifetime_expression"].get("activation_expression")
                    if ae:
                        comp["minecraft:emitter_lifetime_expression"]["activation_expression"] = clean_molang(ae)
                
                if "minecraft:emitter_shape_point" in comp:
                    offset = comp["minecraft:emitter_shape_point"].get("offset")
                    if isinstance(offset, list):
                        comp["minecraft:emitter_shape_point"]["offset"] = [clean_molang(x) for x in offset]
                
                if "minecraft:particle_appearance_billboard" in comp:
                    pab = comp["minecraft:particle_appearance_billboard"]
                    if "uv" in pab and "uv" in pab["uv"]:
                        pab["uv"]["uv"] = [clean_molang(x) for x in pab["uv"]["uv"]]
                    if "direction" in pab and "custom_direction" in pab["direction"]:
                        pab["direction"]["custom_direction"] = [clean_molang(x) for x in pab["direction"]["custom_direction"]]

            with open(file_path, 'w') as f:
                json.dump(data, f, indent=4)
            print(f"Fixed {filename}")

if __name__ == "__main__":
    fix_particle_files()
