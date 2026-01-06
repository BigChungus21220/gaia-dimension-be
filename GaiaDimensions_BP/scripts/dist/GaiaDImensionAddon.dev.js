"use strict";

var _server = require("@minecraft/server");

var _leaves = require("./components/leaves.js");

var _invisible = require("./components/invisible.js");

var _door = require("./components/door.js");

var _wood = require("./components/wood.js");

var _fence = require("./components/fence.js");

var _sapling = require("./components/sapling.js");

var _wall = require("./components/wall.js");

var _button = require("./components/button.js");

var _pressure_plate = require("./components/pressure_plate.js");

var _stairs = require("./components/stairs.js");

var _sandstone_slab = require("./components/sandstone_slab.js");

var _destruction_handler = require("./systems/destruction_handler.js");

var _event_manager = require("./systems/event_manager.js");

// Initialize systems
(0, _destruction_handler.initializeDestructionHandlers)();
(0, _event_manager.initializeEventManager)();

_server.system.beforeEvents.startup.subscribe(function (_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  (0, _leaves.registerLeavesComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _invisible.registerInvisibleComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _door.registerDoorComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _wood.registerWoodComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _fence.registerFenceComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _sapling.registerSaplingComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _wall.registerWallComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _button.registerButtonComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _pressure_plate.registerPressurePlateComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _stairs.registerStairsComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
  (0, _sandstone_slab.registerSandstoneComponent)({
    blockComponentRegistry: blockComponentRegistry
  });
});
//# sourceMappingURL=GaiaDImensionAddon.dev.js.map
