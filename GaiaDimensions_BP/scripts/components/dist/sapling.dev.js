"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerSaplingComponent = registerSaplingComponent;

var _server = require("@minecraft/server");

var _sapling_config = require("../config/sapling_config.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var SaplingComponent =
/*#__PURE__*/
function () {
  function SaplingComponent() {
    _classCallCheck(this, SaplingComponent);

    this.onPlace = this.onPlace.bind(this);
    this.onPlayerInteract = this.onPlayerInteract.bind(this);
  }

  _createClass(SaplingComponent, [{
    key: "onPlace",
    value: function onPlace(event) {
      var block = event.block;
      var blockBelow = block.below();
      var config = _sapling_config.saplingConfig[block.typeId];

      if (config && blockBelow && !config.ground.includes(blockBelow.typeId)) {
        block.setType("minecraft:air");
      }
    }
  }, {
    key: "onPlayerInteract",
    value: function onPlayerInteract(event) {
      var block = event.block,
          player = event.player,
          itemStack = event.itemStack;

      if (itemStack && itemStack.typeId === "minecraft:bone_meal") {
        var config = _sapling_config.saplingConfig[block.typeId];

        if (config && Math.random() < 0.25) {
          // 25% chance to grow
          var structureName = config.structures[Math.floor(Math.random() * config.structures.length)];
          block.setType("minecraft:air");

          _server.world.structureManager.place(structureName, block.dimension, block.location); // Consume bone meal


          if (player.gamemode === "survival") {
            itemStack.amount--;
            player.getComponent("minecraft:equippable").setEquipment("Mainhand", itemStack);
          }
        }
      }
    }
  }]);

  return SaplingComponent;
}();

function registerSaplingComponent(_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  var saplingComponent = new SaplingComponent();
  blockComponentRegistry.registerCustomComponent("gaiadimension:sapling", {
    onPlace: saplingComponent.onPlace,
    onPlayerInteract: saplingComponent.onPlayerInteract
  });
}
//# sourceMappingURL=sapling.dev.js.map
