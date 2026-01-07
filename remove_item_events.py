import os
import json

def remove_events_from_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content.strip():
                return False
            data = json.loads(content)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

    if "minecraft:item" not in data:
        return False

    item_root = data["minecraft:item"]
    
    has_changes = False

    # Remove 'events' block
    if "events" in item_root:
        del item_root["events"]
        has_changes = True

    components = item_root.get("components", {})

    # Helper to remove event references from components
    # Common event triggers: on_dig, on_hurt_entity, on_use, on_use_on, on_hit_block
    # These usually have structure { "event": "event_name", ... }
    
    triggers_to_clean = ["on_dig", "on_hurt_entity", "on_use", "on_use_on", "on_hit_block", "on_complete_use", "on_consume"]

    keys_to_remove = []

    # Check top-level components for triggers (e.g. minecraft:on_use)
    # Actually, minecraft:on_use IS the trigger component.
    # But minecraft:digger has 'on_dig' inside it.
    
    # 1. Check components that ARE triggers
    # e.g. "minecraft:on_use": { "event": "..." }
    for comp_name, comp_data in list(components.items()):
        if comp_name.startswith("minecraft:on_") and isinstance(comp_data, dict) and "event" in comp_data:
            # If it's just an event call, we might want to remove the component or just the event property?
            # Usually removing the component is safer if it has no other logic.
            # But let's check if it has other properties.
            if len(comp_data) == 1:
                del components[comp_name]
                has_changes = True
            else:
                del comp_data["event"]
                has_changes = True

    # 2. Check components that CONTAIN triggers
    # e.g. minecraft:digger -> on_dig
    # e.g. minecraft:weapon -> on_hurt_entity
    # e.g. minecraft:food -> on_consume
    
    complex_components = ["minecraft:digger", "minecraft:weapon", "minecraft:food", "minecraft:throwable"]
    
    for comp_key in complex_components:
        if comp_key in components:
            comp_data = components[comp_key]
            
            # Special handling for digger destroy_speeds
            if comp_key == "minecraft:digger" and "destroy_speeds" in comp_data:
                for speed_entry in comp_data["destroy_speeds"]:
                    if "on_dig" in speed_entry:
                        del speed_entry["on_dig"]
                        has_changes = True

            # General trigger removal
            for trigger in triggers_to_clean:
                if trigger in comp_data:
                    del comp_data[trigger]
                    has_changes = True

    if has_changes:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return False
            
    return False

def main():
    items_dir = "GaiaDimensions_BP/items"
    count = 0
    for root, _, files in os.walk(items_dir):
        for file in files:
            if file.endswith(".json"):
                if remove_events_from_file(os.path.join(root, file)):
                    count += 1
    print(f"Successfully removed events from {count} items.")

if __name__ == "__main__":
    main()
