import { Vector, BlockPermutation,Dimension,system,Block, world } from "@minecraft/server"
import { log, vectorToString } from './utils.js'

export function isUnlitPortal(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "minecraft:air"){
                isValid = false
                break
            }
        }
    }
    return isValid
}

export function isLitPortal(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "gaia:gaia_portal"){
                isValid = false
                break
            }
        }
    }
    return isValid
}


/**
 * @param {Vector} location
 * @param {Dimension} dimension
 * @returns {Block}
 */
export function findGround(location,dimension){
    try {
        let blockFound;
    let y = location.y
    let check = system.runInterval(()=>{
        if (y <= 0){
            return;
        }
        const block = dimension?.getBlock({x:location.x,y:Math.round(y),z:location.z})
        if (block && block.type.id !== 'minecraft:air'){
            blockFound = block
            system.clearRun(check)
        } else{
        y--
    }
    })
    return blockFound
} catch (e){console.error(e)}
}
export function placePortal(corner, dimension, x_oriented){
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge){
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
            } else {
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:gaia_portal", {"gaia:x_oriented": x_oriented}))
            }
        }
    }
}

  
  export function breakPortal(corner, dimension, x_oriented){
    for (let x = -3; x <= 3; x++){
        for (let y = -3; y <= 3; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let block = dimension.getBlock(blockpos);
            let adjacent = block.getAdjacent()
            if (block.type.id === 'gaia:gaia_portal'){
                block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            }
            adjacent.filter(b=>{
                b.typeId === 'gaia:gaia_portal'
            }).forEach(b=>{
                b.setPermutation(BlockPermutation.resolve("minecraft:air"));
            })
        }
    }
}


export function decode(input) {
  const L = {
    a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9,
    k: 10, l: 11, m: 12, n: 13, o: 14, p: 15, q: 16, r: 17, s: 18, t: 19,
    u: 20, v: 21, w: 22, x: 23, y: 24, z: 25, A: 26, B: 27, C: 28, D: 29,
    E: 30, F: 31, G: 32, H: 33, I: 34, J: 35, K: 36, L: 37, M: 38, N: 39,
    O: 40, P: 41, Q: 41, R: 42, S: 43, T: 44, U: 45, V: 46, W: 47, X: 48,
    Y: 49, Z: 50
  };

  const P = input.split('*');
  const V = P.map((p) => p.split('').reduce((a, l) => a * L[l], 1));
  const C = V.reduce((a, v) => a * v, 1); 

  return C;
}


export function ConvertCoords(location, fromDimension, toDimension) {
    const scaleFactor = 1 / 4; // 1 block in 'gaia' is 4 blocks in 'overworld'
    const xOffset = 300000; // Offset for the x-axis
    const zOffset = 300000; // Offset for the z-axis

    switch (fromDimension) {
        case 'minecraft:overworld':
            switch (toDimension) {
                case 'gaia:gaia':
                    return {
                        x: Math.floor((location.x + xOffset) * scaleFactor+200000),
                        y: location.y,
                        z: Math.floor((location.z + zOffset) * scaleFactor+200000)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        case 'gaia:gaia':
            switch (toDimension) {
                case 'minecraft:overworld':
                    return {
                        x: Math.floor(location.x / scaleFactor),
                        y: location.y,
                        z: Math.floor(location.z / scaleFactor)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        default:
            throw new Error(`Unsupported conversion from ${fromDimension}`);
    }
}

/**
 * @typedef Link
 * @property {Vector} location
 * @property {Vector} linkedLocation
 */

/**
 * Made by Redux
 * Class for Portal Linking.
 */
export class PortalLink {
    /**
     * Create a PortalLink.
     */
    constructor() {
        /**
         * @type {Array<Link>}
         */
      this.linked = JSON.parse(world.getDynamicProperty('PortalLinked')) ?? [];
      this.serialize = JSON.stringify;
    }
  
    /**
     * Link two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     */
    link(fromLocation, toLocation) {
      if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
        throw new Error('Both fromLocation and toLocation must be objects');
      }
      const data = { location: fromLocation, linkedLocation: toLocation };
      if (!this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation)) {
        this.linked.push(data);
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
      }
    }
  
    /**
     * Unlink two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     */
    unlink(fromLocation, toLocation) {
      if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
        throw new Error('Both fromLocation and toLocation must be objects');
      }
      this.linked = this.linked.filter(
        (d) => !(d.location === fromLocation && d.linkedLocation === toLocation)
      );
      world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
    }

    /**
     * Get the linked location from a given location.
     * @param {Vector} fromLocation - The starting location.
     * @returns {Vector} The linked location.
     */
    getLinked(fromLocation){
        if (typeof fromLocation !== 'object') {
            throw new Error('fromLocation must be a object');
          }
        const link = this.linked.find(d=>d.location === fromLocation);
        return link ? link.linkedLocation : undefined;
    }

    /**
     * Get all links.
     * @returns {Array<Link>} The array of all links.
     */
    getAllLinks(){
        return this.linked;
    }

    /**
     * Clear all links.
     */
    clearAllLinks(){
        this.linked = []
        world.setDynamicProperty('PortalLinked',this.serialize(this.linked))
    }
    
    /**
     * Check if two locations are linked.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @returns {boolean} True if the locations are linked, false otherwise.
     */
    isLinked(fromLocation,toLocation){
        return this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation);
    }

    /**
     * Get the count of links.
     * @returns {number} The count of links.
     */
    getCount(){
        return this.linked.length
    }

    /**
     * Check if a link exists.
     * @param {Link} link - The link to check.
     * @returns {boolean} True if the link exists, false otherwise.
     */
    hasLink(link){
        return this.linked.includes(link)
    }
}