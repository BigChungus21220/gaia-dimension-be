"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerLeavesComponent = registerLeavesComponent;

var _server = require("@minecraft/server");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var LeavesComponent =
/*#__PURE__*/
function () {
  function LeavesComponent() {
    _classCallCheck(this, LeavesComponent);

    this.onRandomTick = this.onRandomTick.bind(this);
  }

  _createClass(LeavesComponent, [{
    key: "onRandomTick",
    value: function onRandomTick(event) {
      var block = event.block,
          dimension = event.dimension;
      dimension.spawnParticle(block.typeId, block.center(), new _server.MolangVariableMap());
    }
  }]);

  return LeavesComponent;
}();

function registerLeavesComponent(_ref) {
  var blockComponentRegistry = _ref.blockComponentRegistry;
  blockComponentRegistry.registerCustomComponent("gaiadimension:leaves", new LeavesComponent());
}
//# sourceMappingURL=leaves.dev.js.map
