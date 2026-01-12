"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initializeGeyser = initializeGeyser;
exports.registerGeyserComponent = registerGeyserComponent;

var _server = require("@minecraft/server");

var _Vec = require("../Vec3.js");

var _utils = require("../utils.js");

/**
 * Applies velocity to entities near the geyser.
 * @param {import("@minecraft/server").Dimension} dimension 
 * @param {import("@minecraft/server").Vector3} spawnPos 
 * @param {number} duration Ticks to continue pushing
 */
function pushEntities(dimension, spawnPos, duration) {
  var elapsed = 0;
  var intervalTicks = 4;

  var runId = _server.system.runInterval(function () {
    if (elapsed >= duration) {
      _server.system.clearRun(runId);

      return;
    }

    var entities = dimension.getEntities({
      location: spawnPos,
      maxDistance: 5
    });
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = entities[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var entity = _step.value;
        var pos = entity.location;
        var dx = Math.abs(pos.x - spawnPos.x);
        var dz = Math.abs(pos.z - spawnPos.z);
        var dy = pos.y - (spawnPos.y - 1.1); // relative to block top
        // Check if entity is roughly above the geyser

        if (dx < 0.7 && dz < 0.7 && dy > 0 && dy < 6) {
          try {
            // Apply upward impulse
            entity.applyImpulse({
              x: 0,
              y: 0.5,
              z: 0
            });
          } catch (e) {// Some entities might not support impulse
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

    elapsed += intervalTicks;
  }, intervalTicks);
}
/**
 * Triggers the geyser eruption logic.
 * @param {import("@minecraft/server").Block} block 
 */


function eruptGeyser(block) {
  var dimension, blockCenter;
  return regeneratorRuntime.async(function eruptGeyser$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (!(!block || !block.isValid)) {
            _context.next = 2;
            break;
          }

          return _context.abrupt("return");

        case 2:
          dimension = block.dimension;
          blockCenter = {
            x: block.location.x + 0.5,
            y: block.location.y + 1.1,
            z: block.location.z + 0.5
          }; // Initial blast sound

          dimension.playSound("geyser.blast", blockCenter); // Pre-steam particles

          dimension.spawnParticle("gaiadimension:geyser_pre_steam", blockCenter);
          _context.next = 8;
          return regeneratorRuntime.awrap((0, _utils.sleep)(10));

        case 8:
          if (block.isValid) {
            _context.next = 10;
            break;
          }

          return _context.abrupt("return");

        case 10:
          // Start the physical push
          pushEntities(dimension, blockCenter, 60); // Blast for 3 seconds
          // Main steam and blast particles

          dimension.spawnParticle("gaiadimension:geyser_steam", blockCenter);
          dimension.spawnParticle("gaiadimension:geyser_blast", blockCenter);

        case 13:
        case "end":
          return _context.stop();
      }
    }
  });
}

function initializeGeyser() {
  _server.system.afterEvents.scriptEventReceive.subscribe(function (event) {
    if (event.id === "gaiadimension:geyser.erupt" || event.id === "gaiadimension:geyser.erupt") {
      if (event.sourceBlock) {
        eruptGeyser(event.sourceBlock);
      }
    }
  });
}

function registerGeyserComponent(_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  blockComponentRegistry.registerCustomComponent("gaiadimension:geyser", {
    onRandomTick: function onRandomTick(_ref2) {
      var block = _ref2.block;
      eruptGeyser(block);
    },
    onPlayerInteract: function onPlayerInteract(_ref3) {
      var block = _ref3.block;
      eruptGeyser(block);
    }
  });
}
//# sourceMappingURL=geyser.dev.js.map
