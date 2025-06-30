import { world } from "@minecraft/server";
import { vec3 } from "../Vec3";

export function loadSaplingStructure(location, structureName) {
    const dimension = world.getDimension("the_end"); // Assuming Gaia dimension is 'the_end'
    const x = Math.floor(location.x);
    const y = Math.floor(location.y);
    const z = Math.floor(location.z);
    // The mcfunction uses relative coordinates ~-5 ~ ~-5, so we need to adjust the absolute location
    const adjustedX = x - 5;
    const adjustedY = y;
    const adjustedZ = z - 5;
    dimension.runCommandAsync(`structure load ${structureName} ${adjustedX} ${adjustedY} ${adjustedZ}`);
}
