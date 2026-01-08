"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RedstoneControl = void 0;

var _server = require("@minecraft/server");

var _utils = require("../utils.js");

var RedstoneControl = {
  // Door tracking system
  // Maps door keys to tracker info
  doorTrackers: new Map(),

  /**
   * Wakes up the door tracking system for a specific source.
   * Call this when a button/plate is pressed.
   * @param {import("@minecraft/server").Block} sourceBlock - The block that initiated the signal
   */
  updateRedstonePower: function updateRedstonePower(sourceBlock) {
    // Trace the network to find doors that might be affected by this source
    var doorInfos = this.traceNetworkForDoors(sourceBlock);
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = doorInfos[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var doorInfo = _step.value;
        // Start tracking/polling this door
        this.trackDoor(doorInfo.block, sourceBlock); // Force an immediate check

        var doorKey = this.getBlockKey(doorInfo.block.location);
        this.checkDoorTracker(doorKey);
      }
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
  },

  /**
   * Adds a door to be tracked for signal timeout
   */
  trackDoor: function trackDoor(doorBlock, sourceBlock) {
    var _this = this;

    if (!doorBlock) return; // For double doors, we always track the lower half as the primary door

    var primaryDoorBlock = doorBlock;

    if (doorBlock.typeId.includes("door") && doorBlock.typeId.includes("_upper")) {
      var lowerBlock = doorBlock.below();

      if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
        primaryDoorBlock = lowerBlock;
      }
    }

    var doorKey = this.getBlockKey(primaryDoorBlock.location); // Create or update tracker

    var tracker = this.doorTrackers.get(doorKey);

    if (!tracker) {
      tracker = {
        doorBlock: primaryDoorBlock,
        lastSignalTick: _server.system.currentTick,
        checkInterval: null
      };
      this.doorTrackers.set(doorKey, tracker);
    } else {
      tracker.lastSignalTick = _server.system.currentTick;
    } // Start checking interval if not already running


    if (!tracker.checkInterval) {
      // Check every 5 ticks (0.25s) for responsiveness
      tracker.checkInterval = _server.system.runInterval(function () {
        _this.checkDoorTracker(doorKey);
      }, 5);
    }
  },

  /**
   * Checks a door tracker and handles redstone power logic
   */
  checkDoorTracker: function checkDoorTracker(doorKey) {
    var tracker = this.doorTrackers.get(doorKey);
    if (!tracker) return; // Check if the door block still exists

    if (!tracker.doorBlock.isValid) {
      this.stopTracking(doorKey);
      return;
    }

    var _tracker$doorBlock$lo = tracker.doorBlock.location,
        x = _tracker$doorBlock$lo.x,
        y = _tracker$doorBlock$lo.y,
        z = _tracker$doorBlock$lo.z;
    var dimension = tracker.doorBlock.dimension;
    var hasActiveSignal = false; // Check all blocks in a 3x3 area around the door for redstone power
    // (Checking direct neighbors is usually sufficient for redstone, 
    // but existing logic checked 3x3, keeping it for robustness with wire positioning)

    for (var dx = -1; dx <= 1; dx++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          var checkPos = {
            x: x + dx,
            y: y + dy,
            z: z + dz
          };
          var checkBlock = dimension.getBlock(checkPos);
          var redstonePower = (0, _utils.getRedstonePower)(checkBlock);

          if (redstonePower > 0) {
            hasActiveSignal = true;
            break;
          }
        }

        if (hasActiveSignal) break;
      }

      if (hasActiveSignal) break;
    } // Update Door State


    this.setDoorState(tracker.doorBlock, hasActiveSignal); // If no active signal, stop tracking after a short delay or immediately?
    // We stop tracking immediately if closed to save performance, 
    // assuming it won't open again until a source wakes it up.

    if (!hasActiveSignal) {
      this.stopTracking(doorKey);
    }
  },
  stopTracking: function stopTracking(doorKey) {
    var tracker = this.doorTrackers.get(doorKey);

    if (tracker && tracker.checkInterval) {
      _server.system.clearRun(tracker.checkInterval);
    }

    this.doorTrackers["delete"](doorKey);
  },
  setDoorState: function setDoorState(doorBlock, open) {
    try {
      // Handle Double Doors
      var lowerDoor = doorBlock;
      var upperDoor = null;

      if (doorBlock.typeId.includes("_upper")) {
        // Should have been normalized to lower, but safe check
        lowerDoor = doorBlock.below();
        upperDoor = doorBlock;
      } else {
        upperDoor = doorBlock.above();
      } // Update Lower


      if (lowerDoor && lowerDoor.isValid && lowerDoor.typeId.includes("gaiadimension:p")) {//gaiadimension:plant_door etc
        // Just checking it's a valid door block roughly
      }

      var updateBlock = function updateBlock(block) {
        if (!block || !block.isValid || !block.typeId.includes("door")) return;
        var perm = block.permutation;
        var isOpen = perm.getState("gaiadimension:open") === true;

        if (isOpen !== open) {
          block.setPermutation(perm.withState("gaiadimension:open", open));
          (0, _utils.playDoorSound)(block, open);
        }
      };

      updateBlock(lowerDoor);
      updateBlock(upperDoor);
    } catch (e) {
      console.warn("Error setting door state", e);
    }
  },
  // Kept for "Wake Up" phase
  openAndTrackDoor: function openAndTrackDoor(doorBlock, sourceBlock) {
    // Compatibility wrapper: just start tracking.
    // The tracking loop will handle the actual opening in the next check (few ms)
    // or we can force it.
    this.trackDoor(doorBlock, sourceBlock); // Force immediate check to ensure instant response

    var key = this.getBlockKey(doorBlock.location);
    this.checkDoorTracker(key);
  },
  updateDoorTracker: function updateDoorTracker(doorBlock, sourceBlock) {
    this.trackDoor(doorBlock, sourceBlock);
  },

  /**
   * Traces the redstone network to find custom doors.
   * Uses simple connectivity logic.
   */
  traceNetworkForDoors: function traceNetworkForDoors(sourceBlock) {
    var _this2 = this;

    var maxDepth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
    if (!sourceBlock) return [];
    var foundDoors = [];
    var visited = new Set();
    var queue = [{
      block: sourceBlock,
      depth: 0
    }];
    var dimension = sourceBlock.dimension;

    while (queue.length > 0) {
      var _queue$shift = queue.shift(),
          block = _queue$shift.block,
          depth = _queue$shift.depth;

      if (depth > maxDepth) continue;
      var blockKey = this.getBlockKey(block.location);
      if (visited.has(blockKey)) continue;
      visited.add(blockKey); // Check neighbors

      var neighbors = this.getNeighbors(block.location);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = neighbors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var neighborLoc = _step2.value;
          var neighborBlock = dimension.getBlock(neighborLoc);
          if (!neighborBlock || neighborBlock.isAir) continue; // Found a custom door?

          if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("door")) {
            (function () {
              var doorKey = _this2.getBlockKey(neighborBlock.location); // Avoid duplicates in result


              if (!foundDoors.some(function (d) {
                return _this2.getBlockKey(d.block.location) === doorKey;
              })) {
                // Lever exception: Don't trace through air/walls to a door if it's too close? 
                // Existing logic had a specific lever check. We'll simplify:
                // Just add it. The Polling system will verify if it's *actually* powered.
                foundDoors.push({
                  block: neighborBlock
                });
              }
            })();
          } // Continue tracing through conductors


          if (depth < maxDepth && this.isRedstoneConductor(neighborBlock)) {
            queue.push({
              block: neighborBlock,
              depth: depth + 1
            });
          }
        }
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
    }

    return foundDoors;
  },
  isRedstoneConductor: function isRedstoneConductor(block) {
    if (!block) return false;
    var typeId = block.typeId;
    return typeId === "minecraft:redstone_wire" || typeId.includes("repeater") || typeId.includes("redstone_torch") || typeId === "minecraft:redstone_block" || typeId.includes("piston") || typeId.includes("comparator");
  },
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
  getBlockKey: function getBlockKey(location) {
    return "".concat(location.x, ",").concat(location.y, ",").concat(location.z);
  }
};
exports.RedstoneControl = RedstoneControl;
//# sourceMappingURL=Redstone.dev.js.map
