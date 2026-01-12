"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerGlitteringFireComponent = registerGlitteringFireComponent;

var _server = require("@minecraft/server");

var _PortalLib = require("../API/lib/PortalLib.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

// Register the Gaia Dimension Portal
// Portal Block ID:gaiadimension:gaia_dimension_portal
// Frame Block ID:gaiadimension:keystone_block
_PortalLib.PortalManager.register("gaiadimension:gaia_dimension_portal", "gaiadimension:keystone_block");
/**
 * Registers the glittering fire component logic.
 * This handles the interaction withgaiadimension:glittering_fire to extinguish it,
 * and attempts to light the portal when placed.
 */


function registerGlitteringFireComponent() {
  // Handle extinguishing the fire
  _server.world.beforeEvents.playerInteractWithBlock.subscribe(function (event) {
    var block = event.block;

    if (block.typeId === "gaiadimension:glittering_fire") {
      event.cancel = true;

      _server.system.run(function () {
        if (block.isValid) {
          block.setType("minecraft:air");
          block.dimension.playSound("random.fizz", block.location, {
            volume: 1,
            pitch: 1
          });
        }
      });
    }
  }); // Handle lighting the portal


  _server.world.afterEvents.playerPlaceBlock.subscribe(function (event) {
    var block = event.block;

    if (block.typeId === "gaiadimension:glittering_fire") {
      // Attempt to ignite the portal
      // The PortalManager will handle checking the shape and placing portal blocks
      _server.system.run(function () {
        var ignited = _PortalLib.PortalManager.tryIgnite(block);
      });
    }
  }); // Handle preventing breaking of fire


  _server.world.beforeEvents.playerBreakBlock.subscribe(function (event) {
    var block = event.block;

    if (block.typeId === "gaiadimension:glittering_fire") {
      event.cancel = true;
    }
  }); // Handle portal shattering


  _server.world.afterEvents.playerBreakBlock.subscribe(function (event) {
    var block = event.block,
        brokenBlockPermutation = event.brokenBlockPermutation,
        dimension = event.dimension;
    var brokenId = brokenBlockPermutation.type.id; // Check if broken block was a portal

    if (_PortalLib.PortalManager.registeredPortals.has(brokenId)) {
      // Check neighbors for remaining portal blocks to trigger chain reaction
      var neighbors = [block.above(), block.below(), block.north(), block.south(), block.east(), block.west()];

      for (var _i = 0, _neighbors = neighbors; _i < _neighbors.length; _i++) {
        var neighbor = _neighbors[_i];

        if (neighbor && neighbor.typeId === brokenId) {
          _PortalLib.PortalManager.breakPortal(dimension, neighbor.location, brokenId);

          break;
        }
      }

      return;
    } // Check if broken block was a frame


    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _PortalLib.PortalManager.registeredPortals[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _step$value = _slicedToArray(_step.value, 2),
            portalId = _step$value[0],
            config = _step$value[1];

        if (config.frameId === brokenId) {
          // Frame broken, check for adjacent portal blocks
          var _neighbors2 = [block.above(), block.below(), block.north(), block.south(), block.east(), block.west()];

          for (var _i2 = 0, _neighbors3 = _neighbors2; _i2 < _neighbors3.length; _i2++) {
            var _neighbor = _neighbors3[_i2];

            if (_neighbor && _neighbor.typeId === portalId) {
              _PortalLib.PortalManager.breakPortal(dimension, _neighbor.location, portalId);

              break;
            }
          }
        }
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
  });
}
//# sourceMappingURL=glittering_fire.dev.js.map
