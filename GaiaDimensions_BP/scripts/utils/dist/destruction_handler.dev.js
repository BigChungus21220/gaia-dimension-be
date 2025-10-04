"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.trackBlock = trackBlock;
exports.untrackBlock = untrackBlock;
exports.initializeDestructionHandlers = initializeDestructionHandlers;

var _server = require("@minecraft/server");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

// --- Constants ---
var STAIRS_TAG = "gaiadimension:stairs"; // --- State Management (inspired by door.js) ---
// We will track all active collision/invisible blocks in this map.

var trackedBlocks = new Map(); // Key: location string, Value: { typeId: string }

/**
 * Adds a block to the tracking list. Exported for use in other component files.
 * @param {import("@minecraft/server").Block} block The block to track.
 */

function trackBlock(block) {
  if (!block || !block.location) return;
  var locationStr = "".concat(block.location.x, ",").concat(block.location.y, ",").concat(block.location.z);

  if (!trackedBlocks.has(locationStr)) {
    trackedBlocks.set(locationStr, {
      typeId: block.typeId
    });
  }
}
/**
 * Removes a block from the tracking list. Exported for use in other component files.
 * @param {import("@minecraft/server").BlockLocation} location The location of the block to untrack.
 */


function untrackBlock(location) {
  if (!location) return;
  var locationStr = "".concat(location.x, ",").concat(location.y, ",").concat(location.z);
  trackedBlocks["delete"](locationStr);
}
/**
 * Initializes the cleanup interval.
 */


function initializeDestructionHandlers() {
  console.warn("[OrphanCleanup] Initializing tracker-based cleanup script.");

  _server.system.runInterval(function () {
    // Iterate over a copy of the values, as the map can be modified during the loop.
    for (var _i = 0, _arr = _toConsumableArray(trackedBlocks.entries()); _i < _arr.length; _i++) {
      var _arr$_i = _slicedToArray(_arr[_i], 2),
          locationStr = _arr$_i[0],
          blockData = _arr$_i[1];

      try {
        // The dimension is not stored, so we must assume the overworld.
        // This is a limitation but is often sufficient.
        var dimension = _server.world.getDimension("overworld");

        var location = {
          x: parseInt(locationStr.split(',')[0]),
          y: parseInt(locationStr.split(',')[1]),
          z: parseInt(locationStr.split(',')[2])
        };
        var block = dimension.getBlock(location); // If the block at the location is not what we are tracking, it's an orphan or gone.

        if (!block || block.typeId !== blockData.typeId) {
          trackedBlocks["delete"](locationStr);
          continue; // Stop processing this one
        }

        var isOrphan = false; // --- Check for Invisible Block Orphan ---

        if (block.typeId.includes("_invisible")) {
          // Generic check
          var parentBlock = block.below();

          if (!parentBlock || !parentBlock.typeId.includes("_fence")) {
            // Generic check
            isOrphan = true;
          }
        } // --- Check for Stair Collision Orphan ---


        if (block.typeId.includes("_stairs_collision")) {
          // Generic check
          var verticalHalf = block.permutation.getState("minecraft:vertical_half");

          var _parentBlock = verticalHalf === "top" ? block.above() : block.below();

          if (!_parentBlock || !_parentBlock.hasTag(STAIRS_TAG)) {
            isOrphan = true;
          }
        }

        if (isOrphan) {
          block.setType("minecraft:air");
          trackedBlocks["delete"](locationStr); // Untrack it after deleting
        }
      } catch (e) {
        // If block is in an unloaded chunk, this will error. Remove it from tracking.
        trackedBlocks["delete"](locationStr);
      }
    }
  }, 100);
}
//# sourceMappingURL=destruction_handler.dev.js.map
