"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RedstoneControl = void 0;

var _server = require("@minecraft/server");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

//Dear review team, this is my magnum opus
// Maps source IDs to their power info
var redstoneSources = new Map(); // Maps block keys to the network ID they belong to

var blockToNetwork = new Map(); // Maps network IDs to a Set of block keys in that network

var networkToBlocks = new Map();
var nextNetworkId = 0;
var RedstoneControl = {
  /**
   * Sets redstone power level for a block at a specified location
   * Handles different redstone component types appropriately
   * @param {import("@minecraft/server").Vector3} location - The world location of the block
   * @param {number|boolean} power - Power level (0-15) for dust; boolean for repeaters/doors
   * @param {string} sourceId - Unique identifier for the power source
   * @returns {boolean} True if the operation was successful
   */
  setRedstonePower: function setRedstonePower(location, power, sourceId) {
    if (!sourceId) {
      console.error("Redstone source ID is required");
      return false;
    }

    var dimension = _server.world.getDimension("overworld");

    var block = dimension.getBlock(location);
    if (!block) return false;

    try {
      if (!this.isRedstoneConductor(block)) {
        if (power > 0) {
          redstoneSources.set(sourceId, {
            location: block.location,
            power: power,
            type: "generic_source"
          });
        } else {
          this.updateAdjacentComponents(block, false);
          redstoneSources["delete"](sourceId);
        }

        this.recalculateAllNetworks();
        return true;
      }

      var blockId = block.typeId;

      if (blockId === "minecraft:redstone_wire") {
        return this.setRedstoneDustSignal(block, power, sourceId);
      } else if (blockId.includes("repeater")) {
        return this.setRepeaterPowered(block, power > 0);
      } else if (blockId.includes("piston")) {
        if (power > 0) {
          return this.PistonController.extend(block);
        } else {
          return this.PistonController.retract(block);
        }
      }

      return false;
    } catch (e) {
      console.error("Error setting redstone power: ".concat(e));
      return false;
    }
  },

  /**
   * Checks adjacent blocks for doors and opens them when redstone is powered
   * @param {import("@minecraft/server").Block} redstoneBlock - The redstone block that is powered
   * @param {boolean} powered - Whether the redstone is powered or unpowered
   */
  updateAdjacentComponents: function updateAdjacentComponents(redstoneBlock, powered) {
    if (!redstoneBlock) return;
    var dimension = redstoneBlock.dimension;
    var _redstoneBlock$locati = redstoneBlock.location,
        x = _redstoneBlock$locati.x,
        y = _redstoneBlock$locati.y,
        z = _redstoneBlock$locati.z; // Check all adjacent blocks for doors

    var adjacentPositions = [{
      x: x + 1,
      y: y,
      z: z
    }, {
      x: x - 1,
      y: y,
      z: z
    }, {
      x: x,
      y: y,
      z: z + 1
    }, {
      x: x,
      y: y,
      z: z - 1
    }, {
      x: x,
      y: y + 1,
      z: z
    }, {
      x: x,
      y: y - 1,
      z: z
    }];

    for (var _i = 0, _adjacentPositions = adjacentPositions; _i < _adjacentPositions.length; _i++) {
      var pos = _adjacentPositions[_i];
      var adjacentBlock = dimension.getBlock(pos);

      if (adjacentBlock && !adjacentBlock.isAir) {
        if (adjacentBlock.typeId.includes("piston")) {
          console.log("Found piston at ".concat(adjacentBlock.location.x, ",").concat(adjacentBlock.location.y, ",").concat(adjacentBlock.location.z));

          if (powered) {
            this.PistonController.extend(adjacentBlock);
          } else {
            this.PistonController.retract(adjacentBlock);
          }
        } // Handle custom doors
        else if (adjacentBlock.typeId.includes("gaiadimension:") && adjacentBlock.typeId.includes("curtain")) {
            var perm = adjacentBlock.permutation;

            if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== powered) {
              adjacentBlock.setPermutation(perm.withState("gaiadimension:open", powered));
            } // Special handling for custom doors - update both upper and lower halves


            if (adjacentBlock.typeId.includes("curtain")) {
              // If this is the lower half of a door, also update the upper half
              if (adjacentBlock.typeId.includes("_lower")) {
                var upperBlock = adjacentBlock.above();

                if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                  var upperPerm = upperBlock.permutation;

                  if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== powered) {
                    upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", powered));
                  }
                }
              } // If this is the upper half of a door, also update the lower half
              else if (adjacentBlock.typeId.includes("_upper")) {
                  var lowerBlock = adjacentBlock.below();

                  if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                    var lowerPerm = lowerBlock.permutation;

                    if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== powered) {
                      lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", powered));
                    }
                  }
                }
            }
          } // Handle vanilla doors
          else if (adjacentBlock.typeId.startsWith("minecraft:") && adjacentBlock.typeId.includes("door") && !adjacentBlock.typeId.includes("trapdoor")) {
              var doorBlock = adjacentBlock;
              var permutation = doorBlock.permutation; // Check if this is the upper half of a door

              if (permutation.getState("upper_block_bit")) {
                var lowerHalf = doorBlock.below();

                if (lowerHalf && lowerHalf.typeId === doorBlock.typeId) {
                  doorBlock = lowerHalf;
                } else {
                  return;
                }
              }

              var _perm = doorBlock.permutation;

              if (_perm.getState("open_bit") !== undefined && _perm.getState("open_bit") !== powered) {
                doorBlock.setPermutation(_perm.withState("open_bit", powered));
              }
            } // Handle trapdoors and fence gates separately
            else if (adjacentBlock.typeId.startsWith("minecraft:") && (adjacentBlock.typeId.includes("trapdoor") || adjacentBlock.typeId.includes("fence_gate"))) {
                var _perm2 = adjacentBlock.permutation;

                if (_perm2.getState("open_bit") !== undefined && _perm2.getState("open_bit") !== powered) {
                  adjacentBlock.setPermutation(_perm2.withState("open_bit", powered));
                }
              }
      }
    }
  },

  /**
   * Removes redstone power from a source, triggering network recalculation
   * @param {string} sourceId - Unique identifier for the power source
   * @returns {boolean} True if the operation was successful
   */
  removeRedstonePower: function removeRedstonePower(sourceId) {
    if (!redstoneSources.has(sourceId)) {
      return false;
    }

    redstoneSources["delete"](sourceId);
    this.recalculateAllNetworks();
    return true;
  },

  /**
   * Gets the redstone power level for a block at a specified location
   * @param {import("@minecraft/server").Vector3} location - The world location of the block
   * @returns {number} The power level (0-15) or -1 if not found
   */
  getRedstonePower: function getRedstonePower(location) {
    var dimension = _server.world.getDimension("overworld");

    var block = dimension.getBlock(location);
    if (!block) return -1;

    try {
      var blockId = block.typeId;

      if (blockId === "minecraft:redstone_wire") {
        return this.getRedstoneDustSignal(block);
      } else if (blockId.includes("repeater")) {
        return this.getRepeaterSignal(block);
      } else if (blockId.includes("piston")) {
        var pistonKey = this.getBlockKey(block.location);
        return this.PistonController.poweredPistons.has(pistonKey) ? 15 : 0;
      }

      return 0;
    } catch (e) {
      console.error("Error getting redstone power: ".concat(e));
      return 0;
    }
  },

  /**
   * Sets power level for redstone dust with proper propagation
   * @param {import("@minecraft/server").Block} block - The redstone dust block
   * @param {number} power - Power level (0-15)
   * @param {string} sourceId - Unique identifier for the power source
   */
  setRedstoneDustSignal: function setRedstoneDustSignal(block, power, sourceId) {
    if (block.typeId !== "minecraft:redstone_wire") return false;
    power = Math.max(0, Math.min(15, Math.round(power)));
    redstoneSources.set(sourceId, {
      location: block.location,
      power: power,
      type: "redstone_dust"
    }); // Update adjacent doors when redstone power changes

    this.updateAdjacentComponents(block, power > 0);
    this.recalculateAllNetworks();
    return true;
  },

  /**
  * Recalculates all redstone networks based on current sources.
  */
  recalculateAllNetworks: function recalculateAllNetworks() {
    var _this = this;

    _server.system.run(function () {
      var dimension = _server.world.getDimension("overworld");

      var powerMap = new Map();
      var queue = []; // Get a list of all blocks that were part of any network before this update.

      var allPreviouslyKnownBlocks = new Set();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = networkToBlocks.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var blockSet = _step.value;
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = blockSet[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var blockKey = _step5.value;
              allPreviouslyKnownBlocks.add(blockKey);
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
                _iterator5["return"]();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }
        } // Rebuild the network map from scratch.

      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      _this.buildNetworkMap(); // Initialize powerMap and queue from all sources


      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = redstoneSources.values()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var source = _step2.value;

          if (source.type === "generic_source") {
            // Power adjacent blocks in a 3x3x3 cube
            for (var x = -1; x <= 1; x++) {
              for (var y = -1; y <= 1; y++) {
                for (var z = -1; z <= 1; z++) {
                  var adjacentLocation = {
                    x: source.location.x + x,
                    y: source.location.y + y,
                    z: source.location.z + z
                  };
                  var adjacentBlock = dimension.getBlock(adjacentLocation);

                  if (adjacentBlock && adjacentBlock.typeId === 'minecraft:redstone_wire') {
                    var adjacentKey = _this.getBlockKey(adjacentLocation);

                    if (source.power > (powerMap.get(adjacentKey) || 0)) {
                      powerMap.set(adjacentKey, source.power);
                      queue.push({
                        location: adjacentLocation,
                        power: source.power
                      });
                    }
                  }
                }
              }
            }
          } else if (source.type === "redstone_dust") {
            var sourceKey = _this.getBlockKey(source.location);

            if (source.power > (powerMap.get(sourceKey) || 0)) {
              powerMap.set(sourceKey, source.power);
              queue.push({
                location: source.location,
                power: source.power
              });
            }
          }
        } // Propagate power using BFS

      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var head = 0;

      var _loop = function _loop() {
        var _queue = queue[head++],
            location = _queue.location,
            power = _queue.power;

        if (power > 1) {
          _this.getValidRedstoneConnections(location, dimension).forEach(function (neighborLocation) {
            var neighborKey = _this.getBlockKey(neighborLocation);

            var neighborBlock = dimension.getBlock(neighborLocation);

            if (neighborBlock && neighborBlock.typeId === 'minecraft:redstone_wire') {
              var newPower = power - 1;

              if (newPower > (powerMap.get(neighborKey) || 0)) {
                powerMap.set(neighborKey, newPower);
                queue.push({
                  location: neighborLocation,
                  power: newPower
                });
              }
            }
          });
        }
      };

      while (head < queue.length) {
        _loop();
      } // Create a final list of all blocks that need an update.


      var allBlocksToUpdate = new Set(allPreviouslyKnownBlocks);
      powerMap.forEach(function (_, key) {
        return allBlocksToUpdate.add(key);
      }); // Apply changes to all affected blocks.

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = allBlocksToUpdate[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _blockKey = _step3.value;

          var location = _this.keyToLocation(_blockKey);

          var block = dimension.getBlock(location);

          if (block && block.typeId === 'minecraft:redstone_wire') {
            var newPower = powerMap.get(_blockKey) || 0;
            var currentPower = block.permutation.getState("redstone_signal") || 0;

            if (newPower !== currentPower) {
              block.setPermutation(block.permutation.withState("redstone_signal", newPower));
            }

            _this.updateAdjacentComponents(block, newPower > 0);
          } // NEW PISTON LOGIC


          for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
              for (var dz = -1; dz <= 1; dz++) {
                var checkPos = {
                  x: location.x + dx,
                  y: location.y + dy,
                  z: location.z + dz
                };
                var checkBlock = dimension.getBlock(checkPos);

                if (checkBlock && checkBlock.typeId.includes("piston")) {
                  var blockBelow = checkBlock.below();

                  if (blockBelow && !_this.isRedstoneConductor(blockBelow)) {
                    var _newPower = powerMap.get(_blockKey) || 0;

                    if (_newPower > 0) {
                      _this.PistonController.extend(checkBlock);
                    } else {
                      _this.PistonController.retract(checkBlock);
                    }
                  }
                }
              }
            }
          }
        } // Handle components adjacent to generic sources

      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
            _iterator3["return"]();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = redstoneSources.values()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var _source = _step4.value;

          if (_source.type === "generic_source") {
            _this.updateAdjacentComponents(dimension.getBlock(_source.location), _source.power > 0);
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
            _iterator4["return"]();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    });
  },

  /**
   * Scans the world to build a map of all connected redstone dust networks.
   */
  buildNetworkMap: function buildNetworkMap() {
    var _this2 = this;

    blockToNetwork.clear();
    networkToBlocks.clear();
    nextNetworkId = 0;

    var dimension = _server.world.getDimension("overworld");

    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
      for (var _iterator6 = redstoneSources.values()[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
        var source = _step6.value;
        var startKey = this.getBlockKey(source.location);

        if (!blockToNetwork.has(startKey)) {
          (function () {
            var networkId = nextNetworkId++;
            var newNetwork = new Set();
            var queue = [source.location];
            var visited = new Set([startKey]);

            while (queue.length > 0) {
              var currentLocation = queue.shift();

              var currentKey = _this2.getBlockKey(currentLocation);

              blockToNetwork.set(currentKey, networkId);
              newNetwork.add(currentKey);

              _this2.getValidRedstoneConnections(currentLocation, dimension).forEach(function (neighborLocation) {
                var neighborKey = _this2.getBlockKey(neighborLocation);

                if (!visited.has(neighborKey)) {
                  var neighborBlock = dimension.getBlock(neighborLocation);

                  if (neighborBlock && neighborBlock.typeId === 'minecraft:redstone_wire') {
                    visited.add(neighborKey);
                    queue.push(neighborLocation);
                  }
                }
              });
            }

            networkToBlocks.set(networkId, newNetwork);
          })();
        }
      }
    } catch (err) {
      _didIteratorError6 = true;
      _iteratorError6 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion6 && _iterator6["return"] != null) {
          _iterator6["return"]();
        }
      } finally {
        if (_didIteratorError6) {
          throw _iteratorError6;
        }
      }
    }
  },

  /**
  * Gets an array of validly connected redstone wire neighbors.
  * This checks for flat, vertical (towers), and slope connections.
  * @param {import("@minecraft/server").Vector3} location The location of the starting block.
  * @param {import("@minecraft/server").Dimension} dimension The dimension the block is in.
  * @returns {import("@minecraft/server").Vector3[]}
  */
  getValidRedstoneConnections: function getValidRedstoneConnections(location, dimension) {
    var x = location.x,
        y = location.y,
        z = location.z;
    var connections = []; // Check the full 3x3x3 cube around the block

    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          var neighborLoc = {
            x: x + dx,
            y: y + dy,
            z: z + dz
          };
          var neighborBlock = dimension.getBlock(neighborLoc); // We only care if the destination is actually redstone wire

          if (!neighborBlock || neighborBlock.typeId !== 'minecraft:redstone_wire') {
            continue;
          } // Now, validate the connection based on its type (flat, up, or down)


          if (dy === 0) {
            // Flat connections are always valid
            connections.push(neighborLoc);
          } else if (dy === 1) {
            // Connection is 1 block UP
            // A straight-up tower connection is valid
            if (dx === 0 && dz === 0) {
              connections.push(neighborLoc);
              continue;
            } // A diagonal-up connection (a slope) is valid only if
            // there is a solid block for the wire to climb on.
            // We use !isAir as a proxy for a solid block.


            var stepBlock = dimension.getBlock({
              x: x + dx,
              y: y,
              z: z + dz
            });

            if (stepBlock && !stepBlock.isAir) {
              connections.push(neighborLoc);
            }
          } else if (dy === -1) {
            // Connection is 1 block DOWN
            // A straight-down tower connection is valid
            if (dx === 0 && dz === 0) {
              connections.push(neighborLoc);
              continue;
            } // A diagonal-down connection is valid only if the block
            // above the destination wire is air (allowing the signal to drop down).


            var blockAboveNeighbor = dimension.getBlock({
              x: x + dx,
              y: y,
              z: z + dz
            });

            if (blockAboveNeighbor && blockAboveNeighbor.isAir) {
              connections.push(neighborLoc);
            }
          }
        }
      }
    }

    return connections;
  },

  /**
   * Gets power level for redstone dust
   * @param {import("@minecraft/server").Block} block - The redstone dust block
   * @returns {number} Power level (0-15)
   */
  getRedstoneDustSignal: function getRedstoneDustSignal(block) {
    if (block.typeId !== "minecraft:redstone_wire") return 0;
    return block.permutation.getState("redstone_signal") || 0;
  },

  /**
   * Powers/unpowers a repeater
   * @param {import("@minecraft/server").Block} block - The repeater block
   * @param {boolean} powered - Whether the repeater should be powered
   */
  setRepeaterPowered: function setRepeaterPowered(block, powered) {
    if (!block.typeId.includes("repeater")) return false;
    var isCurrentlyPowered = block.typeId.includes("powered");
    if (powered === isCurrentlyPowered) return true; // No change needed

    var newTypeId = powered ? "minecraft:powered_repeater" : "minecraft:unpowered_repeater";

    try {
      var newPermutation = _server.BlockPermutation.resolve(newTypeId, block.permutation.getAllStates());

      block.setPermutation(newPermutation); // Update adjacent doors when repeater power changes

      this.updateAdjacentComponents(block, powered);
      return true;
    } catch (e) {
      console.error("Failed to set repeater state: ".concat(e));
      return false;
    }
  },

  /**
   * Gets repeater power state
   * @param {import("@minecraft/server").Block} block - The repeater block
   * @returns {number} Power level (0 or 15)
   */
  getRepeaterSignal: function getRepeaterSignal(block) {
    return block.typeId === "minecraft:powered_repeater" ? 15 : 0;
  },

  /**
   * Gets neighboring locations for a given block location.
   * @param {import("@minecraft/server").Vector3} location
   * @returns {import("@minecraft/server").Vector3[]}
   */
  getNeighbors: function getNeighbors(location) {
    var x = location.x,
        y = location.y,
        z = location.z;
    return [{
      x: x + 1,
      y: y,
      z: z
    }, {
      x: x - 1,
      y: y,
      z: z
    }, {
      x: x,
      y: y + 1,
      z: z
    }, {
      x: x,
      y: y - 1,
      z: z
    }, {
      x: x,
      y: y,
      z: z + 1
    }, {
      x: x,
      y: y,
      z: z - 1
    }];
  },

  /**
   * Generates a unique key for a block location
   * @param {import("@minecraft/server").Vector3} location - The block location
   * @returns {string} Unique key for the location
   */
  getBlockKey: function getBlockKey(location) {
    return "".concat(location.x, ",").concat(location.y, ",").concat(location.z);
  },

  /**
   * Collects all doors adjacent to a redstone block
   * @param {import("@minecraft/server").Block} redstoneBlock - The redstone block
   * @param {Set} doorsToOpen - Set to store door keys that should be open
   */
  collectAdjacentDoors: function collectAdjacentDoors(redstoneBlock, doorsToOpen) {
    if (!redstoneBlock) return;
    var dimension = redstoneBlock.dimension;
    var _redstoneBlock$locati2 = redstoneBlock.location,
        x = _redstoneBlock$locati2.x,
        y = _redstoneBlock$locati2.y,
        z = _redstoneBlock$locati2.z; // Check all adjacent blocks for doors

    var adjacentPositions = [{
      x: x + 1,
      y: y,
      z: z
    }, {
      x: x - 1,
      y: y,
      z: z
    }, {
      x: x,
      y: y,
      z: z + 1
    }, {
      x: x,
      y: y,
      z: z - 1
    }, {
      x: x,
      y: y + 1,
      z: z
    }, {
      x: x,
      y: y - 1,
      z: z
    }];

    for (var _i2 = 0, _adjacentPositions2 = adjacentPositions; _i2 < _adjacentPositions2.length; _i2++) {
      var pos = _adjacentPositions2[_i2];
      var adjacentBlock = dimension.getBlock(pos);

      if (adjacentBlock && !adjacentBlock.isAir) {
        // Handle custom doors (gaiadimension: namespace)
        if (adjacentBlock.typeId.includes("gaiadimension:") && adjacentBlock.typeId.includes("curtain")) {
          var doorKey = "".concat(dimension.id, ",").concat(adjacentBlock.location.x, ",").concat(adjacentBlock.location.y, ",").concat(adjacentBlock.location.z);
          doorsToOpen.add(doorKey);
        } // Handle vanilla doors
        else if (adjacentBlock.typeId.startsWith("minecraft:") && (adjacentBlock.typeId.includes("door") || adjacentBlock.typeId.includes("trapdoor") || adjacentBlock.typeId.includes("fence_gate"))) {
            var _doorKey = "".concat(dimension.id, ",").concat(adjacentBlock.location.x, ",").concat(adjacentBlock.location.y, ",").concat(adjacentBlock.location.z);

            doorsToOpen.add(_doorKey);
          }
      }
    }
  },

  /**
   * Updates doors based on redstone power state
   * @param {Set} doorsToOpen - Set of door keys that should be open
   */
  updateDoorsBasedOnPower: function updateDoorsBasedOnPower(doorsToOpen) {
    // This would need to be implemented to track door states
    // For now, we'll just open the doors that are powered
    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
      for (var _iterator7 = doorsToOpen[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
        var doorKey = _step7.value;

        try {
          var _doorKey$split$map = doorKey.split(',').map(function (part, index) {
            return index === 0 ? part : Number(part);
          }),
              _doorKey$split$map2 = _slicedToArray(_doorKey$split$map, 4),
              dimensionId = _doorKey$split$map2[0],
              x = _doorKey$split$map2[1],
              y = _doorKey$split$map2[2],
              z = _doorKey$split$map2[3];

          var dimension = _server.world.getDimension(dimensionId);

          var doorBlock = dimension.getBlock({
            x: x,
            y: y,
            z: z
          });

          if (doorBlock && !doorBlock.isAir) {
            // Handle custom doors
            if (doorBlock.typeId.includes("gaiadimension:") && doorBlock.typeId.includes("curtain")) {
              var perm = doorBlock.permutation;

              if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== true) {
                doorBlock.setPermutation(perm.withState("gaiadimension:open", true));
              } // Special handling for custom doors - update both upper and lower halves


              if (doorBlock.typeId.includes("curtain")) {
                // If this is the lower half of a door, also update the upper half
                if (doorBlock.typeId.includes("_lower")) {
                  var upperBlock = doorBlock.above();

                  if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                    var upperPerm = upperBlock.permutation;

                    if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== true) {
                      upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", true));
                    }
                  }
                } // If this is the upper half of a door, also update the lower half
                else if (doorBlock.typeId.includes("_upper")) {
                    var lowerBlock = doorBlock.below();

                    if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                      var lowerPerm = lowerBlock.permutation;

                      if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== true) {
                        lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", true));
                      }
                    }
                  }
              }
            } // Handle vanilla doors
            else if (doorBlock.typeId.startsWith("minecraft:") && (doorBlock.typeId.includes("curtain") || doorBlock.typeId.includes("trapdoor") || doorBlock.typeId.includes("fence_gate"))) {
                var _perm3 = doorBlock.permutation;

                if (_perm3.getState("open_bit") !== undefined && _perm3.getState("open_bit") !== true) {
                  doorBlock.setPermutation(_perm3.withState("open_bit", true));
                } // Also check for generic "open" state
                else if (_perm3.getState("open") !== undefined && _perm3.getState("open") !== true) {
                    doorBlock.setPermutation(_perm3.withState("open", true));
                  }
              }
          }
        } catch (e) {
          console.error("Error updating door: ".concat(e));
        }
      }
    } catch (err) {
      _didIteratorError7 = true;
      _iteratorError7 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion7 && _iterator7["return"] != null) {
          _iterator7["return"]();
        }
      } finally {
        if (_didIteratorError7) {
          throw _iteratorError7;
        }
      }
    }
  },

  /**
   * Traces the redstone network to find custom doors without modifying anything
   * @param {import("@minecraft/server").Block} sourceBlock - The block that initiated the signal
   * @param {number} maxDepth - Maximum depth to trace (default: 15)
   * @returns {Array} Array of door locations found in the network
   */
  traceNetworkForDoors: function traceNetworkForDoors(sourceBlock) {
    var maxDepth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
    if (!sourceBlock) return [];
    var foundDoors = [];
    var visited = new Set();
    var queue = [{
      block: sourceBlock,
      depth: 0
    }];
    var dimension = sourceBlock.dimension;

    while (queue.length > 0 && queue[0].depth <= maxDepth) {
      var _queue$shift = queue.shift(),
          block = _queue$shift.block,
          depth = _queue$shift.depth;

      var blockKey = this.getBlockKey(block.location); // Skip if we've already visited this block

      if (visited.has(blockKey)) continue;
      visited.add(blockKey); // Check adjacent blocks for custom doors

      var neighbors = this.getNeighbors(block.location);
      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        var _loop2 = function _loop2() {
          var neighborLoc = _step8.value;
          var neighborBlock = dimension.getBlock(neighborLoc);

          if (neighborBlock && !neighborBlock.isAir) {
            // Check if this block is a custom door
            if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
              // Check if we've already found this door
              var doorExists = foundDoors.some(function (door) {
                return door.location.x === neighborLoc.x && door.location.y === neighborLoc.y && door.location.z === neighborLoc.z;
              });

              if (!doorExists) {
                // Exception: If the source block is a lever and it's within 3x3 area of the door,
                // ignore this door since levers don't produce consistent redstone signals
                if (sourceBlock.typeId.startsWith("minecraft:") && sourceBlock.typeId.includes("lever")) {
                  var dx = Math.abs(sourceBlock.location.x - neighborLoc.x);
                  var dy = Math.abs(sourceBlock.location.y - neighborLoc.y);
                  var dz = Math.abs(sourceBlock.location.z - neighborLoc.z); // If lever is within 3x3x3 area around the door, skip this door

                  if (dx <= 1 && dy <= 1 && dz <= 1) {
                    return "continue";
                  }
                }

                foundDoors.push({
                  block: neighborBlock,
                  location: neighborLoc,
                  dimension: dimension
                });
              }
            }
          }
        };

        for (var _iterator8 = neighbors[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var _ret = _loop2();

          if (_ret === "continue") continue;
        } // Continue tracing if we haven't reached maximum depth

      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8["return"] != null) {
            _iterator8["return"]();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }

      if (depth < maxDepth) {
        // Check connected redstone components
        var redstoneNeighbors = this.getNeighbors(block.location);
        var _iteratorNormalCompletion9 = true;
        var _didIteratorError9 = false;
        var _iteratorError9 = undefined;

        try {
          for (var _iterator9 = redstoneNeighbors[Symbol.iterator](), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
            var neighborLoc = _step9.value;
            var neighborBlock = dimension.getBlock(neighborLoc);

            if (neighborBlock && !neighborBlock.isAir) {
              // Check if it's a redstone component that can conduct signals
              if (this.isRedstoneConductor(neighborBlock)) {
                var neighborKey = this.getBlockKey(neighborLoc);

                if (!visited.has(neighborKey)) {
                  queue.push({
                    block: neighborBlock,
                    depth: depth + 1
                  });
                }
              }
            }
          }
        } catch (err) {
          _didIteratorError9 = true;
          _iteratorError9 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion9 && _iterator9["return"] != null) {
              _iterator9["return"]();
            }
          } finally {
            if (_didIteratorError9) {
              throw _iteratorError9;
            }
          }
        }
      }
    }

    return foundDoors;
  },

  /**
   * Checks if a block can conduct redstone signals
   * @param {import("@minecraft/server").Block} block 
   * @returns {boolean}
   */
  isRedstoneConductor: function isRedstoneConductor(block) {
    if (!block) return false;
    var typeId = block.typeId; // Redstone dust conducts signals

    if (typeId === "minecraft:redstone_wire") return true; // Repeaters conduct signals

    if (typeId.includes("repeater")) return true; // Redstone torches conduct signals

    if (typeId.includes("redstone_torch")) return true; // Redstone blocks conduct signals

    if (typeId === "minecraft:redstone_block") return true; // Pistons can conduct signals

    if (typeId.includes("piston")) return true; // Note blocks can conduct signals

    if (typeId === "minecraft:noteblock") return true; // Comparator can conduct signals

    if (typeId.includes("comparator")) return true;
    return false;
  },
  // Door tracking system
  doorTrackers: new Map(),
  // Maps door keys to tracker info

  /**
   * Adds a door to be tracked for signal timeout
   * @param {import("@minecraft/server").Block} doorBlock - The door block to track
   * @param {import("@minecraft/server").Block} sourceBlock - The source block that triggered the signal
   */
  trackDoor: function trackDoor(doorBlock, sourceBlock) {
    var _this3 = this;

    if (!doorBlock || !sourceBlock) return; // For double doors, we always track the lower half as the primary door

    var primaryDoorBlock = doorBlock;

    if (doorBlock.typeId.includes("curtain") && doorBlock.typeId.includes("_upper")) {
      var lowerBlock = doorBlock.below();

      if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
        primaryDoorBlock = lowerBlock;
      }
    }

    var doorKey = "".concat(primaryDoorBlock.dimension.id, ",").concat(primaryDoorBlock.location.x, ",").concat(primaryDoorBlock.location.y, ",").concat(primaryDoorBlock.location.z);
    var sourceKey = this.getBlockKey(sourceBlock.location); // Create or update tracker

    var tracker = this.doorTrackers.get(doorKey);

    if (!tracker) {
      tracker = {
        doorBlock: primaryDoorBlock,
        // Always track the primary (lower) door block
        sourceKeys: new Set([sourceKey]),
        lastSignalTick: _server.system.currentTick,
        checkInterval: null
      };
      this.doorTrackers.set(doorKey, tracker);
    } else {
      // Add source to existing tracker
      tracker.sourceKeys.add(sourceKey);
      tracker.lastSignalTick = _server.system.currentTick;
    } // Start checking interval if not already running


    if (!tracker.checkInterval) {
      tracker.checkInterval = _server.system.runInterval(function () {
        _this3.checkDoorTracker(doorKey);
      }, 10); // Check every 10 ticks
    }
  },

  /**
   * Checks a door tracker and handles redstone power logic
   * @param {string} doorKey - The key of the door to check
   */
  checkDoorTracker: function checkDoorTracker(doorKey) {
    var tracker = this.doorTrackers.get(doorKey);
    if (!tracker) return; // Check if the door block still exists

    if (!tracker.doorBlock.isValid) {
      if (tracker.checkInterval) {
        _server.system.clearRun(tracker.checkInterval);
      }

      this.doorTrackers["delete"](doorKey);
      return;
    } // Check a 3x3 area around the door for redstone power


    var hasActiveSignal = false;
    var _tracker$doorBlock$lo = tracker.doorBlock.location,
        x = _tracker$doorBlock$lo.x,
        y = _tracker$doorBlock$lo.y,
        z = _tracker$doorBlock$lo.z;
    var dimension = tracker.doorBlock.dimension; // Check all blocks in a 3x3 area around the door for redstone power

    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dz = -1; dz <= 1; dz++) {
          // Skip the door block itself
          if (dx === 0 && dy === 0 && dz === 0) continue;
          var checkPos = {
            x: x + dx,
            y: y + dy,
            z: z + dz
          };

          try {
            var checkBlock = dimension.getBlock(checkPos); // Special case: Check if the block is a pressure plate

            if (checkBlock && (checkBlock.typeId.includes("pressure_plate") || checkBlock.typeId.includes("pressureplate"))) {
              // Check if the pressure plate is pressed/active
              var isPressed = checkBlock.permutation.getState("gaiadimension:pressed") === true || checkBlock.permutation.getState("minecraft:pressed") === true;

              if (isPressed) {
                hasActiveSignal = true;
                break;
              }
            } // Regular redstone power check


            var redstonePower = this.getRedstonePower(checkPos);

            if (redstonePower !== undefined && redstonePower > 0) {
              hasActiveSignal = true;
              break;
            }
          } catch (e) {// Ignore errors when checking power
          }
        } // Break outer loops if we found an active signal


        if (hasActiveSignal) break;
      } // Break outer loops if we found an active signal


      if (hasActiveSignal) break;
    } // If no active signal, close the door


    if (!hasActiveSignal) {
      try {
        var lowerDoorBlock = tracker.doorBlock;
        var upperDoorBlock = lowerDoorBlock.above(); // Close both halves of double doors together

        var anyDoorClosed = false; // Check if this is a double door (lower half)

        if (lowerDoorBlock.typeId.includes("_lower")) {
          var perm = lowerDoorBlock.permutation;
          var isOpen = perm.getState("gaiadimension:open") || false;

          if (isOpen) {
            lowerDoorBlock.setPermutation(perm.withState("gaiadimension:open", false));
            anyDoorClosed = true;
          } // Also close upper half if it exists


          if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
            var upperPerm = upperDoorBlock.permutation;
            var upperIsOpen = upperPerm.getState("gaiadimension:open") || false;

            if (upperIsOpen) {
              upperDoorBlock.setPermutation(upperPerm.withState("gaiadimension:open", false)); // Don't play sound again if we already played it for lower door

              if (!anyDoorClosed) {
                anyDoorClosed = true;
              }
            }
          }
        } // Single door or upper half
        else {
            var _perm4 = lowerDoorBlock.permutation;

            var _isOpen = _perm4.getState("gaiadimension:open") || false;

            if (_isOpen) {
              lowerDoorBlock.setPermutation(_perm4.withState("gaiadimension:open", false));
              anyDoorClosed = true;
            }
          } // Play close sound if any door was closed


        if (anyDoorClosed) {
          lowerDoorBlock.dimension.playSound("close.wooden_trapdoor", lowerDoorBlock.location, {
            volume: 1,
            pitch: 1
          });
        }
      } catch (e) {
        console.warn("Error closing door:", e);
      } // Remove tracker


      if (tracker.checkInterval) {
        _server.system.clearRun(tracker.checkInterval);
      }

      this.doorTrackers["delete"](doorKey);
    }
  },

  /**
   * Updates a door tracker with a new signal
   * @param {import("@minecraft/server").Block} doorBlock - The door block that received signal
   * @param {import("@minecraft/server").Block} sourceBlock - The source block that sent the signal
   */
  updateDoorTracker: function updateDoorTracker(doorBlock, sourceBlock) {
    if (!doorBlock || !sourceBlock) return;
    var doorKey = "".concat(doorBlock.dimension.id, ",").concat(doorBlock.location.x, ",").concat(doorBlock.location.y, ",").concat(doorBlock.location.z);
    var tracker = this.doorTrackers.get(doorKey);

    if (tracker) {
      // Update last signal time
      tracker.lastSignalTick = _server.system.currentTick; // Add source key if not already present

      var sourceKey = this.getBlockKey(sourceBlock.location);
      tracker.sourceKeys.add(sourceKey);
    } else {
      // Create new tracker
      this.trackDoor(doorBlock, sourceBlock);
    }
  },

  /**
   * Opens a custom door and starts tracking it
   * @param {import("@minecraft/server").Block} doorBlock - The door to open
   * @param {import("@minecraft/server").Block} sourceBlock - The source that triggered the opening
   */
  openAndTrackDoor: function openAndTrackDoor(doorBlock, sourceBlock) {
    if (!doorBlock || !sourceBlock) return;

    try {
      // Handle double doors properly - treat both halves as a single unit
      var lowerDoorBlock = null;
      var upperDoorBlock = null; // Determine which blocks are the lower and upper halves

      if (doorBlock.typeId.includes("curtain")) {
        if (doorBlock.typeId.includes("_lower")) {
          lowerDoorBlock = doorBlock;
          var upperBlock = doorBlock.above();

          if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
            upperDoorBlock = upperBlock;
          }
        } else if (doorBlock.typeId.includes("_upper")) {
          upperDoorBlock = doorBlock;
          var lowerBlock = doorBlock.below();

          if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
            lowerDoorBlock = lowerBlock;
          }
        }
      } // If we have a double door, use the lower half as the primary tracking key


      var primaryDoorBlock = lowerDoorBlock || doorBlock;
      var doorKey = "".concat(primaryDoorBlock.dimension.id, ",").concat(primaryDoorBlock.location.x, ",").concat(primaryDoorBlock.location.y, ",").concat(primaryDoorBlock.location.z); // Open both halves if they exist

      var blocksToOpen = [];
      if (lowerDoorBlock) blocksToOpen.push(lowerDoorBlock);
      if (upperDoorBlock) blocksToOpen.push(upperDoorBlock);
      if (!lowerDoorBlock && !upperDoorBlock) blocksToOpen.push(doorBlock);
      var anyDoorOpened = false;

      for (var _i3 = 0, _blocksToOpen = blocksToOpen; _i3 < _blocksToOpen.length; _i3++) {
        var block = _blocksToOpen[_i3];
        var perm = block.permutation;
        var isOpen = perm.getState("gaiadimension:open") || false; // Only open if not already open

        if (!isOpen) {
          block.setPermutation(perm.withState("gaiadimension:open", true)); // Play open sound (only once for the pair)

          if (!anyDoorOpened) {
            block.dimension.playSound("open.wooden_trapdoor", block.location, {
              volume: 1,
              pitch: 1
            });
            anyDoorOpened = true;
          }
        }
      } // Start tracking the primary door (lower half or single door)


      this.trackDoor(primaryDoorBlock, sourceBlock);
    } catch (e) {
      console.warn("Error opening and tracking door:", e);
    }
  },

  /**
   * Converts a block key string back to a location object.
   * @param {string} key
   * @returns {import("@minecraft/server").Vector3}
   */
  keyToLocation: function keyToLocation(key) {
    var _key$split$map = key.split(',').map(Number),
        _key$split$map2 = _slicedToArray(_key$split$map, 3),
        x = _key$split$map2[0],
        y = _key$split$map2[1],
        z = _key$split$map2[2];

    return {
      x: x,
      y: y,
      z: z
    };
  },
  PistonController: new (
  /*#__PURE__*/
  function () {
    function _class() {
      _classCallCheck(this, _class);

      this.poweredPistons = new Map();
    }

    _createClass(_class, [{
      key: "extend",
      value: function extend(pistonBlock) {
        if (!pistonBlock || !pistonBlock.typeId.includes("piston")) {
          return false;
        }

        var pistonKey = RedstoneControl.getBlockKey(pistonBlock.location);
        var pistonInfo = this.poweredPistons.get(pistonKey);

        if (pistonInfo) {
          pistonInfo.refCount++;
          return true;
        }

        var facing = pistonBlock.permutation.getState("minecraft:facing_direction");
        var powerLocation;

        switch (facing) {
          case 0:
            powerLocation = pistonBlock.above().location;
            break;

          case 1:
            powerLocation = pistonBlock.below().location;
            break;

          case 2:
            powerLocation = pistonBlock.south().location;
            break;

          case 3:
            powerLocation = pistonBlock.north().location;
            break;

          case 4:
            powerLocation = pistonBlock.east().location;
            break;

          case 5:
            powerLocation = pistonBlock.west().location;
            break;

          default:
            return false;
        }

        try {
          var dimension = pistonBlock.dimension;
          var originalBlock = dimension.getBlock(powerLocation);
          var originalPermutation = originalBlock.permutation;
          dimension.getBlock(powerLocation).setType("minecraft:redstone_block");
          this.poweredPistons.set(pistonKey, {
            refCount: 1,
            powerLocation: powerLocation,
            originalPermutation: originalPermutation
          });
          return true;
        } catch (e) {
          console.error("Failed to extend piston: ".concat(e));
          return false;
        }
      }
    }, {
      key: "retract",
      value: function retract(pistonBlock) {
        if (!pistonBlock || !pistonBlock.typeId.includes("piston")) {
          return false;
        }

        var pistonKey = RedstoneControl.getBlockKey(pistonBlock.location);
        var pistonInfo = this.poweredPistons.get(pistonKey);

        if (!pistonInfo) {
          return true;
        }

        pistonInfo.refCount--;

        if (pistonInfo.refCount > 0) {
          return true;
        }

        try {
          var dimension = pistonBlock.dimension;
          dimension.getBlock(pistonInfo.powerLocation).setPermutation(pistonInfo.originalPermutation);
          this.poweredPistons["delete"](pistonKey);
          return true;
        } catch (e) {
          console.error("Failed to retract piston: ".concat(e));
          return false;
        }
      }
    }]);

    return _class;
  }())()
};
exports.RedstoneControl = RedstoneControl;
//# sourceMappingURL=Redstone.dev.js.map
