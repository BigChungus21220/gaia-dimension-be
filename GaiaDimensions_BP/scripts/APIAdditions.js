import { Entity,Block,system, Dimension, Vector, Direction} from "@minecraft/server";
import { vec3 } from "./Vector";


/**
 * @returns {boolean} Whether the entity is in a gaia portal or not
 */
Entity.prototype.isInPortal = function (){
    try {
	return this.dimension.getBlock(this.location).typeId === "gaia:gaia_portal";
    } catch (e){}
};

/**
 * @param {boolean} [off] Whether to turn off/on the coordinate indicator. By default this is false
 */
Entity.prototype.turnCoords = function (on = false){
    this.runCommand(`gamerule showcoordinates ${on}`)
}


/**
 * Made by Redux
* Gets adjacent blocks connected to the current block.
* @this {Block}
* @returns {Block[]} - An array of adjacent blocks.
*/
Block.prototype.getAdjacent = function () {
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

  /**
   * Finds the ground of a dimension based off a location
   * @param {Vector} location 
   * @returns {Block}
   */
  Dimension.prototype.findGround = function (location){
    try {
        let blockFound;
    let y = location.y
    let check = system.runInterval(()=>{
        if (y <= 0){
            return;
        }
        const block = this?.getBlock({x:location.x,y:Math.round(y),z:location.z})
        if (block && block.type.id !== 'minecraft:air'){
            blockFound = block
            system.clearRun(check)
        } else{
        y--
    }
    })
    return blockFound
} catch (e){}
}

  
String.prototype.decode = function () {
  const L = {
    a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7, i: 8, j: 9,
    k: 10, l: 11, m: 12, n: 13, o: 14, p: 15, q: 16, r: 17, s: 18, t: 19,
    u: 20, v: 21, w: 22, x: 23, y: 24, z: 25, A: 26, B: 27, C: 28, D: 29,
    E: 30, F: 31, G: 32, H: 33, I: 34, J: 35, K: 36, L: 37, M: 38, N: 39,
    O: 40, P: 41, Q: 41, R: 42, S: 43, T: 44, U: 45, V: 46, W: 47, X: 48,
    Y: 49, Z: 50
  };

  const P = this.split('*');
  const V = P.map((p) => p.split('').reduce((a, l) => a * L[l], 1));
  const C = V.reduce((a, v) => a * v, 1); 

  return C;
}

Vector.prototype.toString = function(){
  return vec3(this.x,this.y,this.z).toString()
}
/**
 * Converts a Direction to a Vector 
 * @param {Direction | string} direction
 */
Vector.convertDirection = function(direction){
  switch (direction){
    case "Up":
        return new Vector(0,1,0)
    case "Down":
        return new Vector(0,-1,0)
    case "North":
        return new Vector(0,0,-1)
    case "South":
        return new Vector(0,0,1)
    case "East":
        return new Vector(-1,0,0)
    case "West":
        return new Vector(1,0,0)
    default:
        return new Vector(0,0,0)
}
}