"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerPressurePlateComponent = registerPressurePlateComponent;

var _server = require("@minecraft/server");

var _Redstone = require("../systems/Redstone.js");

var _event_manager = require("../systems/event_manager.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var PRESSURE_PLATE_SUFFIX = "_pressure_plate";
var doorStates = new Map(); // Track door states to prevent conflicts

/**
 * Checks if a block is a custom pressure plate
 * @param {string} blockTypeId 
 * @returns {boolean}
 */

function isPressurePlate(blockTypeId) {
  // Vanilla plates are handled separately
  if (blockTypeId.startsWith("minecraft:")) {
    return false;
  }

  return blockTypeId.endsWith(PRESSURE_PLATE_SUFFIX);
}
/**
 * Checks if a block is a vanilla Minecraft pressure plate
 * @param {string} blockTypeId 
 * @returns {boolean}
 */


function isVanillaPressurePlate(blockTypeId) {
  return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("pressure_plate");
}
/**
 * Updates neighboring blocks when pressure plate state changes
 * @param {import("@minecraft/server").Block} block 
 * @param {boolean} newState 
 * @param {string} sourceId 
 */


function updateNeighbors(block, newState, sourceId) {
  var directions = ["north", "south", "east", "west"];

  for (var _i = 0, _directions = directions; _i < _directions.length; _i++) {
    var dir = _directions[_i];
    var neighborBlock = block[dir]();

    if (neighborBlock) {
      var perm = neighborBlock.permutation; // Handle custom doors (gaiadimension: namespace)

      if (neighborBlock.typeId.startsWith("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
        if (perm.getState("gaiadimension:open") !== undefined) {
          var oldState = perm.getState("gaiadimension:open"); // Generate unique key for this door

          var doorKey = "".concat(neighborBlock.dimension.id, ",").concat(neighborBlock.location.x, ",").concat(neighborBlock.location.y, ",").concat(neighborBlock.location.z);
          var currentDoorState = doorStates.get(doorKey) || false; // Only update if the door state needs to change

          if (currentDoorState !== newState) {
            neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

            if (oldState !== newState) {
              neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
                volume: 1,
                pitch: 1
              });
            } // Update door state tracking


            doorStates.set(doorKey, newState); // Start tracking the door for timeout if it's being opened

            if (newState) {
              _Redstone.RedstoneControl.openAndTrackDoor(neighborBlock, block);
            } else {
              // Update tracker if door is being closed
              _Redstone.RedstoneControl.updateDoorTracker(neighborBlock, block);
            }
          } // Update door state tracking


          doorStates.set(doorKey, newState);
        } // Special handling for custom doors - update both upper and lower halves
        // If this is the lower half of a door, also update the upper half


        if (neighborBlock.typeId.includes("_lower")) {
          var upperBlock = neighborBlock.above();

          if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
            var upperPerm = upperBlock.permutation;

            if (upperPerm.getState("gaiadimension:open") !== undefined) {
              var _oldState = upperPerm.getState("gaiadimension:open"); // Generate unique key for the upper door


              var upperDoorKey = "".concat(upperBlock.dimension.id, ",").concat(upperBlock.location.x, ",").concat(upperBlock.location.y, ",").concat(upperBlock.location.z);
              var currentUpperDoorState = doorStates.get(upperDoorKey) || false; // Only update if the door state needs to change

              if (currentUpperDoorState !== newState) {
                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                if (_oldState !== newState) {
                  upperBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, {
                    volume: 1,
                    pitch: 1
                  });
                } // Update door state tracking for upper half


                doorStates.set(upperDoorKey, newState);
              }
            }
          }
        } // If this is the upper half of a door, also update the lower half
        else if (neighborBlock.typeId.includes("_upper")) {
            var lowerBlock = neighborBlock.below();

            if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
              var lowerPerm = lowerBlock.permutation;

              if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                var _oldState2 = lowerPerm.getState("gaiadimension:open"); // Generate unique key for the lower door


                var lowerDoorKey = "".concat(lowerBlock.dimension.id, ",").concat(lowerBlock.location.x, ",").concat(lowerBlock.location.y, ",").concat(lowerBlock.location.z);
                var currentLowerDoorState = doorStates.get(lowerDoorKey) || false; // Only update if the door state needs to change

                if (currentLowerDoorState !== newState) {
                  lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                  if (_oldState2 !== newState) {
                    lowerBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, {
                      volume: 1,
                      pitch: 1
                    });
                  } // Update door state tracking for lower half


                  doorStates.set(lowerDoorKey, newState);
                }
              }
            }
          }
      } // Handle vanilla Minecraft blocks with open_bit state
      else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open_bit") !== undefined && !neighborBlock.typeId.includes("lever")) {
          var _oldState3 = perm.getState("open_bit");

          neighborBlock.setPermutation(perm.withState("open_bit", newState)); // Play sound when door is opened or closed

          if (_oldState3 !== newState) {
            neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
              volume: 1,
              pitch: 1
            });
          }
        } // Handle vanilla Minecraft blocks with generic "open" state
        else if (neighborBlock.typeId.startsWith("minecraft:") && perm.getState("open") !== undefined && !neighborBlock.typeId.includes("lever")) {
            var _oldState4 = perm.getState("open");

            neighborBlock.setPermutation(perm.withState("open", newState)); // Play sound when door is opened or closed

            if (_oldState4 !== newState) {
              neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
                volume: 1,
                pitch: 1
              });
            }
          } // Set redstone signal for vanilla redstone components


      if (newState) {
        // When pressure plate is pressed, send power level 15 (max power)
        _Redstone.RedstoneControl.setRedstonePower(neighborBlock.location, 15, sourceId);
      } else {
        // When pressure plate is released, remove the power source
        _Redstone.RedstoneControl.removeRedstonePower(sourceId);
      }
    }
  }
}
/**
 * Checks adjacent blocks for custom doors and opens/closes them
 * @param {import("@minecraft/server").Block} block - The pressure plate block
 * @param {boolean} open - Whether to open or close the doors
 */


function checkAdjacentCustomDoors(block, open) {
  var dimension = block.dimension;
  var _block$location = block.location,
      x = _block$location.x,
      y = _block$location.y,
      z = _block$location.z; // Check adjacent blocks for custom doors only

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

  for (var _i2 = 0, _adjacentPositions = adjacentPositions; _i2 < _adjacentPositions.length; _i2++) {
    var pos = _adjacentPositions[_i2];
    var adjacentBlock = dimension.getBlock(pos); // Only process custom doors (gaiadimension: namespace)

    if (adjacentBlock && adjacentBlock.typeId.startsWith("gaiadimension:") && adjacentBlock.typeId.includes("curtain")) {
      // Generate unique key for this door
      var doorKey = "".concat(adjacentBlock.dimension.id, ",").concat(adjacentBlock.location.x, ",").concat(adjacentBlock.location.y, ",").concat(adjacentBlock.location.z); // For multiple pressure plates, we need to track which pressure plates are activating this door

      var activationKey = "".concat(doorKey, "_activators");
      var activators = doorStates.get(activationKey) || new Set(); // Generate a unique key for this pressure plate

      var plateKey = "".concat(block.dimension.id, ",").concat(block.location.x, ",").concat(block.location.y, ",").concat(block.location.z);

      if (open) {
        // Add this pressure plate to the activators set
        activators.add(plateKey);
      } else {
        // Remove this pressure plate from the activators set
        activators["delete"](plateKey);
      } // Update the activators set


      doorStates.set(activationKey, activators); // Door should be open if any pressure plate is activating it

      var shouldDoorBeOpen = activators.size > 0; // Check current door state

      var currentDoorState = doorStates.get(doorKey) || false; // Only update if the door state needs to change

      if (currentDoorState !== shouldDoorBeOpen) {
        // Found a custom door, open/close it
        var perm = adjacentBlock.permutation;

        if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
          adjacentBlock.setPermutation(perm.withState("gaiadimension:open", shouldDoorBeOpen)); // Play sound when door is opened or closed

          dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", adjacentBlock.location, {
            volume: 1,
            pitch: 1
          }); // Update door state tracking

          doorStates.set(doorKey, shouldDoorBeOpen); // Start tracking the door for timeout if it's being opened

          if (shouldDoorBeOpen) {
            _Redstone.RedstoneControl.openAndTrackDoor(adjacentBlock, block);
          } else {
            // Update tracker if door is being closed
            _Redstone.RedstoneControl.updateDoorTracker(adjacentBlock, block);
          }
        } // Special handling for custom doors - update both upper and lower halves


        if (adjacentBlock.typeId.includes("curtain")) {
          // If this is the lower half of a door, also update the upper half
          if (adjacentBlock.typeId.includes("_lower")) {
            var upperBlock = adjacentBlock.above();

            if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
              var upperPerm = upperBlock.permutation;

              if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", shouldDoorBeOpen)); // Play sound when door is opened or closed

                dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperBlock.location, {
                  volume: 1,
                  pitch: 1
                }); // Update door state tracking for upper half

                var upperDoorKey = "".concat(upperBlock.dimension.id, ",").concat(upperBlock.location.x, ",").concat(upperBlock.location.y, ",").concat(upperBlock.location.z);
                doorStates.set(upperDoorKey, shouldDoorBeOpen); // Start tracking the door for timeout if it's being opened

                if (shouldDoorBeOpen) {
                  _Redstone.RedstoneControl.openAndTrackDoor(upperBlock, block);
                } else {
                  // Update tracker if door is being closed
                  _Redstone.RedstoneControl.updateDoorTracker(upperBlock, block);
                }
              }
            }
          } // If this is the upper half of a door, also update the lower half
          else if (adjacentBlock.typeId.includes("_upper")) {
              var lowerBlock = adjacentBlock.below();

              if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                var lowerPerm = lowerBlock.permutation;

                if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== shouldDoorBeOpen) {
                  lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", shouldDoorBeOpen)); // Play sound when door is opened or closed

                  dimension.playSound(shouldDoorBeOpen ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerBlock.location, {
                    volume: 1,
                    pitch: 1
                  }); // Update door state tracking for lower half

                  var lowerDoorKey = "".concat(lowerBlock.dimension.id, ",").concat(lowerBlock.location.x, ",").concat(lowerBlock.location.y, ",").concat(lowerBlock.location.z);
                  doorStates.set(lowerDoorKey, shouldDoorBeOpen); // Start tracking the door for timeout if it's being opened

                  if (shouldDoorBeOpen) {
                    _Redstone.RedstoneControl.openAndTrackDoor(lowerBlock, block);
                  } else {
                    // Update tracker if door is being closed
                    _Redstone.RedstoneControl.updateDoorTracker(lowerBlock, block);
                  }
                }
              }
            }
        }
      }
    }
  }
}
/**
 * Cleans up door states for doors that no longer exist
 */


function cleanupDoorStates() {
  var keysToDelete = []; // Check all tracked door states

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = doorStates.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var doorKey = _step.value;

      // Skip activator tracking keys for now
      if (doorKey.endsWith("_activators")) {
        continue;
      }

      try {
        // Parse the key to get dimension and coordinates
        var _doorKey$split$map = doorKey.split(',').map(function (part, index) {
          return index === 0 ? part : Number(part);
        }),
            _doorKey$split$map2 = _slicedToArray(_doorKey$split$map, 4),
            dimensionId = _doorKey$split$map2[0],
            x = _doorKey$split$map2[1],
            y = _doorKey$split$map2[2],
            z = _doorKey$split$map2[3]; // Only delete door state tracking if we can confirm the door no longer exists
        // We'll be more conservative about deleting door states


        var dimension = _server.world.getDimension(dimensionId);

        var block = dimension.getBlock({
          x: x,
          y: y,
          z: z
        }); // If the block is no longer a custom door, mark it for deletion

        if (!block || !block.typeId.startsWith("gaiadimension:") || !block.typeId.includes("curtain")) {
          keysToDelete.push(doorKey); // Also delete the activator tracking key

          keysToDelete.push("".concat(doorKey, "_activators"));
        }
      } catch (e) {// If there's an error parsing the key or getting the block, be conservative
        // and don't delete the door state tracking
        // This prevents accidental deletion of door states for doors in unloaded chunks
      }
    } // Delete the marked keys

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

  for (var _i3 = 0, _keysToDelete = keysToDelete; _i3 < _keysToDelete.length; _i3++) {
    var key = _keysToDelete[_i3];
    doorStates["delete"](key);
  } // Clean up orphaned activator tracking keys


  var orphanedActivatorKeys = [];
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = doorStates.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _key = _step2.value;

      if (_key.endsWith("_activators")) {
        var _doorKey = _key.substring(0, _key.length - 11); // Remove "_activators"


        if (!doorStates.has(_doorKey)) {
          orphanedActivatorKeys.push(_key);
        }
      }
    } // Delete orphaned activator tracking keys

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

  for (var _i4 = 0, _orphanedActivatorKey = orphanedActivatorKeys; _i4 < _orphanedActivatorKey.length; _i4++) {
    var _key2 = _orphanedActivatorKey[_i4];
    doorStates["delete"](_key2);
  }
} // Start the pressure plate checking system


var activePlates = new Set();

_server.system.runInterval(function () {
  var players = _server.world.getPlayers();

  var newlyActivePlates = new Set(); // 1. Find all currently active plates by checking player locations

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = players[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var player = _step3.value;
      // Check the block the player is standing on and the block they are in
      var loc = {
        x: Math.floor(player.location.x),
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z)
      };
      var headBlock = player.dimension.getBlock(loc);
      var blockBelow = player.dimension.getBlock({
        x: loc.x,
        y: loc.y - 1,
        z: loc.z
      });

      if (headBlock && (isPressurePlate(headBlock.typeId) || isVanillaPressurePlate(headBlock.typeId))) {
        var key = "".concat(headBlock.dimension.id, ",").concat(headBlock.location.x, ",").concat(headBlock.location.y, ",").concat(headBlock.location.z);
        newlyActivePlates.add(key);
      }

      if (blockBelow && (isPressurePlate(blockBelow.typeId) || isVanillaPressurePlate(blockBelow.typeId))) {
        var _key3 = "".concat(blockBelow.dimension.id, ",").concat(blockBelow.location.x, ",").concat(blockBelow.location.y, ",").concat(blockBelow.location.z);

        newlyActivePlates.add(_key3);
      }
    } // 2. Detect plates that were just pressed

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
    for (var _iterator4 = newlyActivePlates[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var plateKey = _step4.value;

      if (!activePlates.has(plateKey)) {
        // Plate was just pressed
        var _plateKey$split = plateKey.split(','),
            _plateKey$split2 = _slicedToArray(_plateKey$split, 4),
            dimensionId = _plateKey$split2[0],
            x = _plateKey$split2[1],
            y = _plateKey$split2[2],
            z = _plateKey$split2[3];

        var dimension = _server.world.getDimension(dimensionId);

        var block = dimension.getBlock({
          x: Number(x),
          y: Number(y),
          z: Number(z)
        });

        if (block) {
          if (isPressurePlate(block.typeId)) {
            // For custom plates, we control the state
            block.setPermutation(block.permutation.withState("gaiadimension:pressed", true));
            block.dimension.playSound("click_on.wooden_pressure_plate", block.location, {
              volume: 1,
              pitch: 1
            });
            var sourceId = "pressure_plate_".concat(x, "_").concat(y, "_").concat(z);
            updateNeighbors(block, true, sourceId);
          } else if (isVanillaPressurePlate(block.typeId)) {
            // For vanilla plates, we ONLY trigger our custom logic.
            // The game handles the state and sound.
            var _sourceId = "pressure_plate_".concat(block.location.x, "_").concat(block.location.y, "_").concat(block.location.z);

            updateNeighbors(block, true, _sourceId);
            checkAdjacentCustomDoors(block, true);
          }
        }
      }
    } // 3. Detect plates that were just released

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

  var _iteratorNormalCompletion5 = true;
  var _didIteratorError5 = false;
  var _iteratorError5 = undefined;

  try {
    for (var _iterator5 = activePlates[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
      var _plateKey = _step5.value;

      if (!newlyActivePlates.has(_plateKey)) {
        // Plate was just released
        var _plateKey$split3 = _plateKey.split(','),
            _plateKey$split4 = _slicedToArray(_plateKey$split3, 4),
            _dimensionId = _plateKey$split4[0],
            _x = _plateKey$split4[1],
            _y = _plateKey$split4[2],
            _z = _plateKey$split4[3];

        var _dimension = _server.world.getDimension(_dimensionId);

        var _block = _dimension.getBlock({
          x: Number(_x),
          y: Number(_y),
          z: Number(_z)
        });

        if (_block && (isPressurePlate(_block.typeId) || isVanillaPressurePlate(_block.typeId))) {
          if (isPressurePlate(_block.typeId)) {
            // For custom plates, we control the state
            _block.setPermutation(_block.permutation.withState("gaiadimension:pressed", false));

            _block.dimension.playSound("click_off.wooden_pressure_plate", _block.location, {
              volume: 1,
              pitch: 1
            });

            var _sourceId2 = "pressure_plate_".concat(_x, "_").concat(_y, "_").concat(_z);

            updateNeighbors(_block, false, _sourceId2);
          } else if (isVanillaPressurePlate(_block.typeId)) {
            // For vanilla plates, we ONLY trigger our custom logic.
            var _sourceId3 = "pressure_plate_".concat(_block.location.x, "_").concat(_block.location.y, "_").concat(_block.location.z);

            updateNeighbors(_block, false, _sourceId3);
            checkAdjacentCustomDoors(_block, false);
          }
        }
      }
    } // 4. Update the state for the next tick

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

  activePlates = newlyActivePlates;
}, 2); // Run every 2 ticks for responsiveness
// Periodically clean up door states to prevent memory leaks


_server.system.runInterval(function () {
  cleanupDoorStates();
}, 1200); // Clean up every 60 seconds (1200 ticks)


var PressurePlateComponent = function PressurePlateComponent() {
  _classCallCheck(this, PressurePlateComponent);
};

function registerPressurePlateComponent(_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  var pressurePlateComponent = new PressurePlateComponent();
  blockComponentRegistry.registerCustomComponent("gaiadimension:pressure_plate", pressurePlateComponent);
  (0, _event_manager.registerBreakHandler)({
    event: "before",
    check: function check(block) {
      return isPressurePlate(block.typeId);
    },
    execute: function execute(event) {
      var block = event.block;
      var sourceId = "pressure_plate_".concat(block.location.x, "_").concat(block.location.y, "_").concat(block.location.z);

      _Redstone.RedstoneControl.removeRedstonePower(sourceId);
    }
  });
}
//# sourceMappingURL=pressure_plate.dev.js.map
