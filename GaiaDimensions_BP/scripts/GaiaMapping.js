
import { world } from "@minecraft/server";
import { Vec3 } from "./Vec3.js";
import { level } from "./world/ModDimension.js";


// Retrieve the ModDimension instance by ID:
const gaiaMod = level.getDimension("gaia_dimension");

// Get the numerical center { x, z }:
const gaiaOrigin = gaiaMod.getCenter();

// 3. Conversion functions at 1:4 scale
/**
 * Overworld → Gaia
 *   - divide Overworld X/Z by 4, floor to block,
 *   - then offset by Gaia origin.
 */
export function worldToGaia(worldLoc) {
  return Vec3(
    Math.floor(worldLoc.x  / 4) + gaiaOrigin.x,
    worldLoc.y,
    Math.floor(worldLoc.z  / 4) + gaiaOrigin.z
  );
}

/**
 * Gaia → Overworld
 *   - subtract Gaia origin,
 *   - multiply resulting X/Z by 4.
 */
export function gaiaToWorld(gaiaLoc) {
  return Vec3(
    (gaiaLoc.x - gaiaOrigin.x) * 4,
    gaiaLoc.y,
    (gaiaLoc.z - gaiaOrigin.z) * 4
  );
}







/*
useful piece of Yasser code*/
function get_data(machine) { 
    return machines[machine.typeId.replace('gaia:furnaces:', ''      
    )
    ] 
}
function str(object) { 
    return JSON.stringify(object) 
}
function compare_lists(list1, list2) {
	for (let i = 0; i < list1.length; i++) {
		if (list1[i] != list2[i]) return false
	} return true
}
export {
    get_data,
    str,
    compare_lists
}