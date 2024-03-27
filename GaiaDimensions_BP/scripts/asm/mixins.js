import { Entity, Block, World } from "@minecraft/server";
import { vec3, Vec3 } from "../apis/Vec3";
import { CoordinateDisplay } from '../world/CoordinateDisplay'


World.prototype.getAllDimensions = function () {
  return ['overworld', 'nether', 'the_end'].map(dimensionStr => this.getDimension(dimensionStr));
}

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

Object.defineProperty(Entity.prototype, 'coordinateDisplay', {
  get: function () {
    if (!this._coordinateDisplay) {
      this._coordinateDisplay = new CoordinateDisplay(this);
    }
    return this._coordinateDisplay;
  }
})



/**
 * Made by Redux
 * Gets adjacent blocks connected to the current block.
 * @this {Block}
 * @param {function(Block):void} filter A filter to apply to the search
 * @param {number} maxSearch The maximum number of blocks to search
 * @returns {Block[]} - An array of adjacent blocks.
 */
Block.prototype.getAdjacent = function (filter, maxSearch) {
  const connectedBlocks = [];
  const visited = new Set();
  // Fix issue with directly passing in this.location to vec3 function
  const { x, y, z } = this.location;
  const queue = [vec3(x, y, z)];

  while (queue.length > 0 && connectedBlocks.length < maxSearch) {
    const currentPosition = queue.shift();
    visited.add(currentPosition);

    try {
      for (const direction of Vec3.directions) {
        const newPosition = currentPosition.add(direction);
        if (!visited.has(newPosition)) {
          const adjacentBlock = this.dimension.getBlock(
            vec3(newPosition.x, newPosition.y, newPosition.z)
          );
          if (adjacentBlock && filter(adjacentBlock)) {
            connectedBlocks.push(adjacentBlock);
            queue.push(newPosition);
          }
        }
      }
    } catch (err) {
      console.warn(err, err.stack);
    }
  }

  return connectedBlocks;
}


