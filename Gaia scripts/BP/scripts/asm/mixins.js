import { Entity, Block, World } from "@minecraft/server";
import { Vec3 } from "../Vec3";
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
Block.prototype.getAdjacent = function (
    maxSearch,
    filter = (block) => block && block?.isValid()
) {
    const connectedBlocks = [];
    const visited = new Set();
    const queue = [this.location];
    while (queue.length > 0 && connectedBlocks.length < maxSearch) {
        const hash = Vec3.stringify(queue.shift());
        if (!visited.has(hash)) {
            visited.add(hash);
            try {
                for (const dir of [
                    Vec3.up,
                    Vec3.down,
                    Vec3.forward,
                    Vec3.backward,
                    Vec3.left,
                    Vec3.right,
                ]) {
                    const offsetBlock = this.offset(dir);
                    const newHash = Vec3.stringify(offsetBlock.location);
                    if (!visited.has(newHash)) {
                        if (filter(offsetBlock)) {
                            connectedBlocks.push(offsetBlock);
                            queue.push(offsetBlock.location);
                        }
                    }
                }
            } catch (err) {
                console.warn(err, err.stack);
            }
        }
    }

    return connectedBlocks;
};



