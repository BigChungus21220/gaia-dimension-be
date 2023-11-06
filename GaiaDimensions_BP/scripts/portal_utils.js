import { Vector, BlockPermutation,Dimension,system,Block } from "@minecraft/server"
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

/**
 * Made by Redux
* Gets adjacent blocks connected to the current block.
* @this {Block}
* @returns {Block[]} - An array of adjacent blocks.
*/Block.prototype.getAdjacent = function () {
    const connectedBlocks = [];
    const visited = new Set();
    const queue = [{ x: this.x, y: this.y, z: this.z }];
  
    const intervalId = system.runInterval(() => {
      if (queue.length === 0) {
        system.clearRun(intervalId);
        return;
      }
  
      const { x, y, z } = queue.shift();
      const position = `${x},${y},${z}`;
  
      if (visited.has(position)) return;
  
      visited.add(position);
  
      try {
        const adjacentBlock = this.dimension.getBlock(new Vector(x, y, z));
        connectedBlocks.push(adjacentBlock);
        const directions = [
          { x: 0, y: 0, z: -1 }, // north
          { x: 1, y: 0, z: 0 },  // east
          { x: 0, y: 0, z: 1 },  // south
          { x: -1, y: 0, z: 0 }, // west
          { x: 0, y: 1, z: 0 },  // up
          { x: 0, y: -1, z: 0 }  // down
        ];
  
        for (const direction of directions) {
          const newX = x + direction.x;
          const newY = y + direction.y;
          const newZ = z + direction.z;
          const newPosition = `${newX},${newY},${newZ}`;
  
          if (!visited.has(newPosition)) {
            queue.push({ x: newX, y: newY, z: newZ });
          }
        }
      } catch (err) {
        console.log(err, err.stack);
      }
    });
system.clearRun(intervalId)
    return connectedBlocks;
  };
  
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



