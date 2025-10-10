"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerButtonComponent = registerButtonComponent;

var _server = require("@minecraft/server");

var _Redstone = require("../systems/Redstone.js");

var _event_manager = require("../systems/event_manager.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var BUTTON_SUFFIX = "_button";
var PRESS_DURATION = 1.5 * 20; // 2 seconds

var VANILLA_BUTTON_DURATION = 1.5 * 20; // 2 seconds for vanilla buttons too

var ButtonComponent =
/*#__PURE__*/
function () {
  function ButtonComponent() {
    _classCallCheck(this, ButtonComponent);

    this.onPlayerInteract = this.onPlayerInteract.bind(this);
  }

  _createClass(ButtonComponent, [{
    key: "isCustomButton",
    value: function isCustomButton(blockTypeId) {
      return blockTypeId.endsWith(BUTTON_SUFFIX);
    }
  }, {
    key: "isVanillaButton",
    value: function isVanillaButton(blockTypeId) {
      return blockTypeId.startsWith("minecraft:") && blockTypeId.includes("button");
    }
  }, {
    key: "getSoundName",
    value: function getSoundName(blockTypeId, isPressing) {
      if (this.isCustomButton(blockTypeId)) {
        // Using a generic sound name that should work for all wood types
        return isPressing ? "click_on.bamboo_wood_button" : "click_off.bamboo_wood_button";
      }

      return "";
    }
  }, {
    key: "updateNeighbors",
    value: function updateNeighbors(buttonBlock, newState) {
      // STEP 1: Find the solid block that the button is attached to
      var solidBlock = this.findSolidBlock(buttonBlock);

      if (solidBlock) {
        // STEP 2: Check all directions from the solid block to find doors
        this.checkAllDirectionsFromSolidBlock(solidBlock, newState);
      } // Also update any direct neighbors that might be doors


      var directions = ["north", "south", "east", "west", "above", "below"];

      for (var _i = 0, _directions = directions; _i < _directions.length; _i++) {
        var dir = _directions[_i];
        var neighborBlock = buttonBlock[dir]();

        if (neighborBlock && !neighborBlock.isAir) {
          var perm = neighborBlock.permutation;

          if (perm.getState("gaiadimension:open") !== undefined) {
            neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
          }

          if (perm.getState("open_bit") !== undefined && !neighborBlock.typeId.includes("lever")) {
            neighborBlock.setPermutation(perm.withState("open_bit", newState));
          } // Also check for generic "open" state


          if (perm.getState("open") !== undefined && !neighborBlock.typeId.includes("lever")) {
            neighborBlock.setPermutation(perm.withState("open", newState));
          } // Special handling for custom doors - update both upper and lower halves


          if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
            var _perm = neighborBlock.permutation;

            if (_perm.getState("gaiadimension:open") !== undefined) {
              neighborBlock.setPermutation(_perm.withState("gaiadimension:open", newState));
            } // Special handling for custom doors - update both upper and lower halves


            if (neighborBlock.typeId.includes("_lower")) {
              var upperBlock = neighborBlock.above();

              if (upperBlock && !upperBlock.isAir && upperBlock.typeId.includes("_upper")) {
                var upperPerm = upperBlock.permutation;

                if (upperPerm.getState("gaiadimension:open") !== undefined) {
                  upperBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                }
              }
            } else if (neighborBlock.typeId.includes("_upper")) {
              var lowerBlock = neighborBlock.below();

              if (lowerBlock && !lowerBlock.isAir && lowerBlock.typeId.includes("_lower")) {
                var lowerPerm = lowerBlock.permutation;

                if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                  lowerBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                }
              }
            }
          }
        }
      }
    }
  }, {
    key: "findSolidBlock",
    value: function findSolidBlock(buttonBlock) {
      var blockFace = buttonBlock.permutation.getState("minecraft:block_face");

      switch (blockFace) {
        case "down":
          return buttonBlock.above();

        case "up":
          return buttonBlock.below();

        case "north":
          return buttonBlock.south();

        case "south":
          return buttonBlock.north();

        case "west":
          return buttonBlock.east();

        case "east":
          return buttonBlock.west();

        default:
          return null;
      }
    }
  }, {
    key: "checkAllDirectionsFromSolidBlock",
    value: function checkAllDirectionsFromSolidBlock(solidBlock, newState) {
      if (!solidBlock) return; // Check all directions from the solid block to find doors

      var directions = ["north", "south", "east", "west", "above", "below"];

      for (var _i2 = 0, _directions2 = directions; _i2 < _directions2.length; _i2++) {
        var dir = _directions2[_i2];
        var neighborBlock = solidBlock[dir]();

        if (neighborBlock && !neighborBlock.isAir) {
          // Check if it's a custom door
          if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
            // Handle custom doors with upper/lower halves
            if (neighborBlock.typeId.includes("_upper")) {
              // Found upper door half, now update it and the lower half below it
              var lowerDoorBlock = neighborBlock.below();

              if (lowerDoorBlock && !lowerDoorBlock.isAir && lowerDoorBlock.typeId.includes("_lower")) {
                // Update upper door half
                var upperPerm = neighborBlock.permutation;

                if (upperPerm.getState("gaiadimension:open") !== undefined) {
                  neighborBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState));
                } // Update lower door half


                var lowerPerm = lowerDoorBlock.permutation;

                if (lowerPerm.getState("gaiadimension:open") !== undefined) {
                  lowerDoorBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState));
                }
              }
            } else if (neighborBlock.typeId.includes("_lower")) {
              // Found lower door half, now update it and the upper half above it
              var upperDoorBlock = neighborBlock.above();

              if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
                // Update lower door half
                var _lowerPerm = neighborBlock.permutation;

                if (_lowerPerm.getState("gaiadimension:open") !== undefined) {
                  neighborBlock.setPermutation(_lowerPerm.withState("gaiadimension:open", newState));
                } // Update upper door half


                var _upperPerm = upperDoorBlock.permutation;

                if (_upperPerm.getState("gaiadimension:open") !== undefined) {
                  upperDoorBlock.setPermutation(_upperPerm.withState("gaiadimension:open", newState));
                }
              }
            } else {
              // Single door block
              var perm = neighborBlock.permutation;

              if (perm.getState("gaiadimension:open") !== undefined) {
                neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState));
              }
            }
          } // Handle vanilla doors
          else if (neighborBlock.typeId.startsWith("minecraft:") && (neighborBlock.typeId.includes("door") || neighborBlock.typeId.includes("trapdoor") || neighborBlock.typeId.includes("fence_gate"))) {
              var _perm2 = neighborBlock.permutation; // Try open_bit state first

              if (_perm2.getState("open_bit") !== undefined) {
                neighborBlock.setPermutation(_perm2.withState("open_bit", newState));
              }
            }
        }
      }
    }
  }, {
    key: "handleCustomButtonPress",
    value: function handleCustomButtonPress(player, block) {
      var _this = this;

      var currentState = block.permutation.getState("gaiadimension:pressed");

      if (currentState === false) {
        // Visual state change
        block.setPermutation(block.permutation.withState("gaiadimension:pressed", true)); // Sound

        var pressSound = this.getSoundName(block.typeId, true);

        if (pressSound) {
          player.playSound(pressSound, {
            location: block.location,
            volume: 1,
            pitch: 1
          });
        }

        var attachedBlock = this.findSolidBlock(block);

        if (attachedBlock) {
          var sourceId = "button_".concat(block.location.x, "_").concat(block.location.y, "_").concat(block.location.z);

          _Redstone.RedstoneControl.setRedstonePower(attachedBlock.location, 15, sourceId);
        } // Schedule the button to release


        _server.system.runTimeout(function () {
          // Check if the block is still valid before proceeding
          if (block.isValid) {
            try {
              // Visual state change
              block.setPermutation(block.permutation.withState("gaiadimension:pressed", false));
            } catch (e) {} // Ignore error if block is no longer valid
            // Sound


            var releaseSound = _this.getSoundName(block.typeId, false);

            if (releaseSound) {
              player.playSound(releaseSound, {
                location: block.location,
                volume: 1,
                pitch: 1
              });
            }

            if (attachedBlock) {
              var _sourceId = "button_".concat(block.location.x, "_").concat(block.location.y, "_").concat(block.location.z);

              _Redstone.RedstoneControl.setRedstonePower(attachedBlock.location, 0, _sourceId);
            }
          }
        }, PRESS_DURATION);
      }
    }
  }, {
    key: "handleVanillaButtonPress",
    value: function handleVanillaButtonPress(player, block) {
      var _this2 = this;

      // For vanilla buttons, we just need to open the custom doors
      // The button press itself is handled by Minecraft
      this.updateCustomDoorsOnly(block, true); // Schedule the custom doors to close

      _server.system.runTimeout(function () {
        _this2.updateCustomDoorsOnly(block, false);
      }, VANILLA_BUTTON_DURATION);
    }
  }, {
    key: "updateCustomDoorsOnly",
    value: function updateCustomDoorsOnly(buttonBlock, newState) {
      var dimension = buttonBlock.dimension;
      var center = buttonBlock.location;
      var checkedDoors = new Set(); // To avoid toggling the same door twice
      // Scan a 3x3x3 cube around the button

      for (var x = -1; x <= 1; x++) {
        for (var y = -1; y <= 1; y++) {
          for (var z = -1; z <= 1; z++) {
            var checkLocation = {
              x: center.x + x,
              y: center.y + y,
              z: center.z + z
            };
            var block = dimension.getBlock(checkLocation);

            if (block && block.typeId.includes("curtain") && !block.typeId.includes("trapdoor")) {
              var lowerHalf = void 0,
                  upperHalf = void 0;

              if (block.typeId.includes("_lower")) {
                lowerHalf = block;
                upperHalf = block.above();
              } else if (block.typeId.includes("_upper")) {
                upperHalf = block;
                lowerHalf = block.below();
              } else {
                continue;
              }

              if (!lowerHalf || !upperHalf || !lowerHalf.typeId.includes("_lower") || !upperHalf.typeId.includes("_upper")) {
                continue;
              }

              var lowerKey = "".concat(lowerHalf.location.x, ",").concat(lowerHalf.location.y, ",").concat(lowerHalf.location.z);

              if (checkedDoors.has(lowerKey)) {
                continue;
              }

              checkedDoors.add(lowerKey);
              var blocksToToggle = [lowerHalf, upperHalf];

              for (var _i3 = 0, _blocksToToggle = blocksToToggle; _i3 < _blocksToToggle.length; _i3++) {
                var doorBlock = _blocksToToggle[_i3];
                var perm = doorBlock.permutation;

                if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== newState) {
                  doorBlock.setPermutation(perm.withState("gaiadimension:open", newState));
                  doorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", doorBlock.location, {
                    volume: 1,
                    pitch: 1
                  });

                  if (newState) {
                    _Redstone.RedstoneControl.openAndTrackDoor(doorBlock, buttonBlock);
                  } else {
                    _Redstone.RedstoneControl.updateDoorTracker(doorBlock, buttonBlock);
                  }
                }
              }
            }
          }
        }
      }
    }
  }, {
    key: "checkCustomDoorsFromSolidBlock",
    value: function checkCustomDoorsFromSolidBlock(solidBlock, newState, sourceBlock) {
      if (!solidBlock) return; // Check all directions from the solid block to find custom doors only

      var directions = ["north", "south", "east", "west", "above", "below"];

      for (var _i4 = 0, _directions3 = directions; _i4 < _directions3.length; _i4++) {
        var dir = _directions3[_i4];
        var neighborBlock = solidBlock[dir]();

        if (neighborBlock && !neighborBlock.isAir) {
          // Check if it's a custom door
          if (neighborBlock.typeId.includes("gaiadimension:") && neighborBlock.typeId.includes("curtain")) {
            // Handle custom doors with upper/lower halves
            if (neighborBlock.typeId.includes("_upper")) {
              // Found upper door half, now update it and the lower half below it
              var lowerDoorBlock = neighborBlock.below();

              if (lowerDoorBlock && !lowerDoorBlock.isAir && lowerDoorBlock.typeId.includes("_lower")) {
                // Update upper door half
                var upperPerm = neighborBlock.permutation;

                if (upperPerm.getState("gaiadimension:open") !== undefined && upperPerm.getState("gaiadimension:open") !== newState) {
                  neighborBlock.setPermutation(upperPerm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                  neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
                    volume: 1,
                    pitch: 1
                  }); // Start tracking the door if it's being opened

                  if (newState) {
                    _Redstone.RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                  } else {
                    // Update tracker if door is being closed
                    _Redstone.RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                  }
                } // Update lower door half


                var lowerPerm = lowerDoorBlock.permutation;

                if (lowerPerm.getState("gaiadimension:open") !== undefined && lowerPerm.getState("gaiadimension:open") !== newState) {
                  lowerDoorBlock.setPermutation(lowerPerm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                  lowerDoorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", lowerDoorBlock.location, {
                    volume: 1,
                    pitch: 1
                  }); // Start tracking the door if it's being opened

                  if (newState) {
                    _Redstone.RedstoneControl.openAndTrackDoor(lowerDoorBlock, sourceBlock);
                  } else {
                    // Update tracker if door is being closed
                    _Redstone.RedstoneControl.updateDoorTracker(lowerDoorBlock, sourceBlock);
                  }
                }
              }
            } else if (neighborBlock.typeId.includes("_lower")) {
              // Found lower door half, now update it and the upper half above it
              var upperDoorBlock = neighborBlock.above();

              if (upperDoorBlock && !upperDoorBlock.isAir && upperDoorBlock.typeId.includes("_upper")) {
                // Update lower door half
                var _lowerPerm2 = neighborBlock.permutation;

                if (_lowerPerm2.getState("gaiadimension:open") !== undefined && _lowerPerm2.getState("gaiadimension:open") !== newState) {
                  neighborBlock.setPermutation(_lowerPerm2.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                  neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
                    volume: 1,
                    pitch: 1
                  }); // Start tracking the door if it's being opened

                  if (newState) {
                    _Redstone.RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                  } else {
                    // Update tracker if door is being closed
                    _Redstone.RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                  }
                } // Update upper door half


                var _upperPerm2 = upperDoorBlock.permutation;

                if (_upperPerm2.getState("gaiadimension:open") !== undefined && _upperPerm2.getState("gaiadimension:open") !== newState) {
                  upperDoorBlock.setPermutation(_upperPerm2.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                  upperDoorBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", upperDoorBlock.location, {
                    volume: 1,
                    pitch: 1
                  }); // Start tracking the door if it's being opened

                  if (newState) {
                    _Redstone.RedstoneControl.openAndTrackDoor(upperDoorBlock, sourceBlock);
                  } else {
                    // Update tracker if door is being closed
                    _Redstone.RedstoneControl.updateDoorTracker(upperDoorBlock, sourceBlock);
                  }
                }
              }
            } else {
              // Single door block
              var perm = neighborBlock.permutation;

              if (perm.getState("gaiadimension:open") !== undefined && perm.getState("gaiadimension:open") !== newState) {
                neighborBlock.setPermutation(perm.withState("gaiadimension:open", newState)); // Play sound when door is opened or closed

                neighborBlock.dimension.playSound(newState ? "open.wooden_trapdoor" : "close.wooden_trapdoor", neighborBlock.location, {
                  volume: 1,
                  pitch: 1
                }); // Start tracking the door if it's being opened

                if (newState) {
                  _Redstone.RedstoneControl.openAndTrackDoor(neighborBlock, sourceBlock);
                } else {
                  // Update tracker if door is being closed
                  _Redstone.RedstoneControl.updateDoorTracker(neighborBlock, sourceBlock);
                }
              }
            }
          }
        }
      }
    }
  }, {
    key: "onPlayerInteract",
    value: function onPlayerInteract(event) {
      var player = event.player,
          block = event.block;

      if (this.isCustomButton(block.typeId)) {
        this.handleCustomButtonPress(player, block);
      } else if (this.isVanillaButton(block.typeId)) {
        this.handleVanillaButtonPress(player, block);
      }
    }
  }]);

  return ButtonComponent;
}();

function registerButtonComponent(_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  var buttonComponent = new ButtonComponent(); // Subscribe to player interact with block event for vanilla button support

  _server.world.beforeEvents.playerInteractWithBlock.subscribe(function (event) {
    _server.system.run(function () {
      var player = event.player,
          block = event.block; // Only handle vanilla buttons (minecraft: namespace buttons)

      if (block.typeId.startsWith("minecraft:") && block.typeId.includes("button")) {
        // For vanilla buttons, we need to handle both direct adjacent doors AND network-traced doors
        // 1. Handle doors directly adjacent to the button (existing functionality)
        buttonComponent.updateCustomDoorsOnly(block, true); // 2. Trace the redstone network to find doors further away

        var foundDoors = _Redstone.RedstoneControl.traceNetworkForDoors(block); // Open found doors and start tracking them


        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = foundDoors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var doorInfo = _step.value;

            _Redstone.RedstoneControl.openAndTrackDoor(doorInfo.block, block);
          } // Schedule the custom doors to close

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

        _server.system.runTimeout(function () {
          buttonComponent.updateCustomDoorsOnly(block, false);
        }, VANILLA_BUTTON_DURATION);
      } // Handle vanilla levers
      else if (block.typeId.startsWith("minecraft:") && block.typeId.includes("lever")) {
          // For vanilla levers, we need to handle both direct adjacent doors AND network-traced doors
          // 1. Handle doors directly adjacent to the lever (existing functionality)
          buttonComponent.updateCustomDoorsOnly(block, true); // 2. Trace the redstone network and open custom doors

          var _foundDoors = _Redstone.RedstoneControl.traceNetworkForDoors(block); // Open found doors and start tracking them


          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = _foundDoors[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var _doorInfo = _step2.value;

              _Redstone.RedstoneControl.openAndTrackDoor(_doorInfo.block, block);
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
    });
  }); // Register custom component for custom buttons


  blockComponentRegistry.registerCustomComponent("gaiadimension:button", {
    onPlayerInteract: function onPlayerInteract(e) {
      return _server.system.run(function () {
        return buttonComponent.onPlayerInteract(e);
      });
    }
  });
  (0, _event_manager.registerBreakHandler)({
    event: "before",
    check: function check(block) {
      return buttonComponent.isCustomButton(block.typeId);
    },
    execute: function execute(event) {
      var block = event.block;
      var sourceId = "button_".concat(block.location.x, "_").concat(block.location.y, "_").concat(block.location.z);

      _Redstone.RedstoneControl.removeRedstonePower(sourceId);
    }
  });
}
//# sourceMappingURL=button.dev.js.map
