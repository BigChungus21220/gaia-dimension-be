import { Entity,Block,system} from "@minecraft/server";

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