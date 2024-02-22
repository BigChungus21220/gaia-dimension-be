import { Entity, Block, system, Dimension, Vector, Direction, World, Player } from "@minecraft/server";
import { vec3, Vec3 } from "./Vector";
import { CoordinateDisplay } from './api/CoordinateDisplay'
/**
 * @returns {boolean} Whether the entity is in a gaia portal or not
 */
Entity.prototype.isInPortal = function () {
  try {
    return this.dimension.getBlock(this.location).typeId === "gaia:gaia_portal";
  } catch (e) { }
};

/**
 * @param {boolean} [on] Whether to turn off/on the coordinate indicator. By default this is false
 */
Entity.prototype.turnCoords = function (on = false) {
  this.runCommand(`gamerule showcoordinates ${on}`)
}

Object.defineProperty(Player.prototype, 'coordinateDisplay', {
  get: function () {
    if (!this._coordinateDisplay) {
      this._coordinateDisplay = new CoordinateDisplay(this);
    }
    return this._coordinateDisplay;
  }
}),


  World.prototype.getAllDimensions = function () {
    ['overworld', 'nether', 'the_end'].map(dimensionStr => this.getDimension(dimensionStr));
  }

/**
 * Made by Redux
 * Gets adjacent blocks connected to the current block.
 * @this {Block}
 * @param {function(Block):void} filter A filter to apply to the search
 * @param {number} maxSearch The maximum number of blocks to search
 * @returns {Block[]} - An array of adjacent blocks.
 */
Block.prototype.getAdjacent = function (filter, maxSearch) {
  const connectedBlocks = []; //blocks that are connected to this block
  const visited = new Set(); //blocks that have been checked
  const queue = [vec3(this.location)]; //blocks to check next
  let i = 0;
  const intervalId = system.runInterval(() => {
    //exit condition
    if (queue.length === 0 || i >= maxSearch) {
      system.clearRun(intervalId);
      return;
    }

    const position = queue.shift(); //get next position in queue
    visited.add(position);

    //in case of unloaded chunks
    try {
      const currentBlock = this?.dimension?.getBlock(new Vector(x, y, z));

      //check if current block meets filter
      if (filter(currentBlock)) {
        connectedBlocks.push(currentBlock);
        //add adjacent blocks to queue
        for (const direction of Vec3.directions) {
          const newPosition = position.add(direction);
          if (!visited.has(newPosition)) queue.push(newPosition);
        }
      }
    } catch (err) {
      console.log(err, err.stack);
    }
    i++;
  });
  system.clearRun(intervalId)
  return connectedBlocks;
};

/**
 * Finds the ground of a dimension based off a location
 * @param {Vector} location 
 * @returns {Block}
 */
Dimension.prototype.findGround = function (location) {
  try {
    let blockFound;
    let y = location.y
    let check = system.runInterval(() => {
      if (y <= 0) {
        return;
      }
      const block = this?.getBlock({ x: location.x, y: Math.round(y), z: location.z })
      if (block && block.type.id !== 'minecraft:air') {
        blockFound = block
        system.clearRun(check)
      } else {
        y--
      }
    })
    return blockFound
  } catch (e) { }
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

Vector.prototype.toString = function () {
  return vec3(this.x, this.y, this.z).toString();
}
/**
 * Converts a Direction to a Vector 
 * @param {Direction | string} direction
 * @memberof Vector
 * @method convertDirection
 */
Vector.prototype.convertDirection = function (direction) {
  return vec3(direction.toLowerCase())
}