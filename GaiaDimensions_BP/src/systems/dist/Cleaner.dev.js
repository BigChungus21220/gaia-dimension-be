"use strict";

var _server = require("@minecraft/server");

var _Gaia = require("../world/Gaia.js");

var CLUTTER_TAGS = ["grass", "plant", "leaves", "log", "wood", "acacia", "birch", "dark_oak", "jungle", "oak", "spruce", "minecraft:is_shears_item_destructible", "minecraft:is_hoe_item_destructible", "minecraft:crop", "flower", "bush", "vine", "mushroom", "coral", "waterlily", "reeds"];
var CLUTTER_TYPES = ["minecraft:deadbush", "minecraft:sugar_cane", "minecraft:bamboo", "minecraft:kelp", "minecraft:glow_lichen"];
var FILTER = {
  blockFilter: {
    includeTags: CLUTTER_TAGS,
    includeTypes: CLUTTER_TYPES
  },
  ignoreChunkBoundErrors: true
};
var AIR, DIM, SHARED_VOL;
var QUEUE = [];
var CACHE = new Set();
var QUEUED = new Set();

_server.system.run(function () {
  try {
    AIR = _server.BlockPermutation.resolve("minecraft:air");
    DIM = _server.world.getDimension("minecraft:overworld");
    SHARED_VOL = new _server.BlockVolume({
      x: 0,
      y: 0,
      z: 0
    }, {
      x: 0,
      y: 0,
      z: 0
    });
  } catch (e) {}
});
/**
 * PRIORITY SORTING (Infrequent)
 */


_server.system.runInterval(function () {
  if (QUEUE.length < 2) return;

  var players = _server.world.getAllPlayers().filter(function (p) {
    return p.dimension.id === "minecraft:overworld";
  });

  if (players.length === 0) return;
  var pLoc = players[0].location;
  QUEUE.sort(function (a, b) {
    var dA = Math.abs(a.x - pLoc.x) + Math.abs(a.z - pLoc.z);
    var dB = Math.abs(b.x - pLoc.x) + Math.abs(b.z - pLoc.z);
    return dA - dB;
  });
}, 100);
/**
 * ROCK-SOLID RUNNER
 */


_server.system.runInterval(function () {
  if (QUEUE.length === 0 || !SHARED_VOL || !DIM) return; // Always work on the first item in the queue

  var t = QUEUE[0]; // Proximity check: If no players are near this chunk, move it to the back
  // This prevents trying to fill blocks in unloaded chunks.

  var players = _server.world.getAllPlayers();

  var isAnyPlayerNear = players.some(function (p) {
    if (p.dimension.id !== "minecraft:overworld") return false;
    var loc = p.location;
    return Math.abs(loc.x - (t.x + 8)) < 128 && Math.abs(loc.z - (t.z + 8)) < 128;
  });

  if (!isAnyPlayerNear) {
    QUEUE.push(QUEUE.shift());
    return;
  }

  var yMin = 85 + t.s * 32;
  var yMax = Math.min(yMin + 31, 200);
  SHARED_VOL.from = {
    x: t.x,
    y: yMin,
    z: t.z
  };
  SHARED_VOL.to = {
    x: t.x + 15,
    y: yMax,
    z: t.z + 15
  };

  try {
    DIM.fillBlocks(SHARED_VOL, AIR, FILTER);
    t.s++;

    if (yMax >= 200) {
      CACHE.add(t.key);
      QUEUED["delete"](t.key);
      QUEUE.shift();
    }
  } catch (e) {
    // If it fails (likely chunk became unloaded mid-process), rotate to back
    QUEUE.push(QUEUE.shift());
  }
}, 1);

_server.system.beforeEvents.startup.subscribe(function (_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  blockComponentRegistry.registerCustomComponent('gaiadimension:overworld_cleaner', {
    onTick: function onTick(_ref2) {
      var block = _ref2.block;
      var _block$location = block.location,
          x = _block$location.x,
          z = _block$location.z;
      var cx = Math.floor(x) >> 4 << 4;
      var cz = Math.floor(z) >> 4 << 4;
      var key = cx * 1000000 + cz; // If this chunk is already cleared, remove the cleaner block

      if (CACHE.has(key)) {
        block.setPermutation(AIR);
        return;
      } // Skip if already in the processing queue


      if (QUEUED.has(key)) return; // Add to queue if within Gaia range

      if (_Gaia.GaiaDimension && _Gaia.GaiaDimension.isInDimension({
        x: x,
        z: z
      })) {
        QUEUED.add(key);
        QUEUE.push({
          x: cx,
          z: cz,
          s: 0,
          key: key
        });
      }
    }
  });
});
//# sourceMappingURL=Cleaner.dev.js.map
