import os
import re

def clean_molang(s):
    # Remove leading/trailing whitespace and collapsible newlines/tabs
    s = s.strip()
    s = re.sub(r'\s+', ' ', s)
    # Basic cleanup
    s = s.replace('; ', ';').replace(';', '; ')
    s = s.replace('{ ', '{').replace(' {', '{').replace('{', ' { ')
    s = s.replace(' }', '}').replace('} ', '}').replace('}', ' } ')
    s = s.replace(': ', ':').replace(' :', ':').replace(':', ' : ')
    # Remove double spaces again
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def fix_particle_files():
    dir_path = "GaiaDimension_RP/particles"
    # Regex to find multi-line strings in JSON
    # This finds everything between quotes, including newlines
    pattern = re.compile(r'"([^"]*?)"', re.DOTALL)

    for filename in os.listdir(dir_path):
        if (filename.startswith("cloud_") or filename == "sky_particle.particle.json") and filename.endswith(".json"):
            file_path = os.path.join(dir_path, filename)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            def replacer(match):
                s = match.group(1)
                # Only clean if it looks like it has code-like stuff or newlines
                if '\n' in s or ';' in s or 'v.' in s or 'q.' in s:
                    return '"' + clean_molang(s) + '"'
                return match.group(0)

            new_content = pattern.sub(replacer, content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filename}")

if __name__ == "__main__":
    fix_particle_files()
