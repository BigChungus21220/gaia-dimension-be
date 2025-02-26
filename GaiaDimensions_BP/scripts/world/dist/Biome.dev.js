"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.playerChangeBiomeEvent = exports.BiomeSystem = void 0;

var _server = require("@minecraft/server");

var _ModDimension = require("./ModDimension");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// Cache the Gaia dimension once.
var gaiaDimension = _ModDimension.level.getDimension("gaia_dimension"); // Use a Map for efficient per–player biome storage.


var playerBiomes = new Map(); // Custom event emitter for biome changes.

var playerChangeBiomeEvent = {
  _listeners: [],
  subscribe: function subscribe(callback) {
    this._listeners.push(callback);
  },
  trigger: function trigger(eventData) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this._listeners[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var listener = _step.value;

        try {
          listener(eventData);
        } catch (error) {
          console.error("Error in playerChangeBiome event:", error);
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
  }
};
exports.playerChangeBiomeEvent = playerChangeBiomeEvent;

var BiomeSystem =
/*#__PURE__*/
function () {
  function BiomeSystem() {
    _classCallCheck(this, BiomeSystem);
  }

  _createClass(BiomeSystem, null, [{
    key: "updateBiome",

    /**
     * Checks the bedrock block (always at y=0) beneath the player's x/z coordinates to determine the biome.
     * If the biome (extracted from the block’s typeId in the format "<biome>_bedrock")
     * has changed compared to what was previously stored, triggers a playerChangeBiome event.
     *
     * @param {Player} player - The player to update.
     */
    value: function updateBiome(player) {
      // Only process if the player is in the Gaia dimension.
      if (!gaiaDimension.isInDimension(player.location)) return; // Calculate the block position at y=0 (bedrock) using the player's x and z.

      var _player$location = player.location,
          x = _player$location.x,
          z = _player$location.z;
      var pos = {
        x: Math.floor(x),
        y: 0,
        z: Math.floor(z)
      }; // Get the block at the specified position from the cached Gaia dimension.

      var blockBelow = gaiaDimension.getBlock(pos);
      if (!blockBelow || typeof blockBelow.typeId !== "string") return; // Expect the typeId format to be "<biome>_bedrock" and extract the biome.

      var suffix = "_bedrock";
      var typeId = blockBelow.typeId;
      if (!typeId.endsWith(suffix)) return;
      var currentBiome = typeId.slice(0, -suffix.length); // If the stored biome for this player differs, trigger the custom event.

      if (playerBiomes.get(player.id) !== currentBiome) {
        playerChangeBiomeEvent.trigger({
          player: player,
          biome: currentBiome
        });
      } // Update the stored biome.


      playerBiomes.set(player.id, currentBiome);
    }
    /**
     * Retrieves the currently tracked biome for the given player.
     *
     * @param {Player} player - The player whose biome is to be retrieved.
     * @returns {string|undefined} The current biome name, if available.
     */

  }, {
    key: "getBiome",
    value: function getBiome(player) {
      return playerBiomes.get(player.id);
    }
  }]);

  return BiomeSystem;
}();

exports.BiomeSystem = BiomeSystem;
//# sourceMappingURL=Biome.dev.js.map
