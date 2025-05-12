"use strict";

var _server = require("@minecraft/server");

var _GaiaMapping = require("../GaiaMapping.js");

var _Vec = require("../Vec3.js");

//applies velocity to entities that stand on an active geyser for duration ticks
function push_entities(dimension, spawn_pos, duration) {
  var t = 0;
  var determinant_y = spawn_pos.y - 0.5;
  var tickdelay = 4; //how often to repeat

  _server.system.runInterval(function () {
    //run only while geyser is active
    if (t < duration) {
      //loop through all entities
      dimension.getEntities().forEach(function (e) {
        var player_pos = e.location;
        var heightDelta = player_pos.y - determinant_y; //check if velocity should be applied

        if (Math.floor(spawn_pos.x) == Math.floor(player_pos.x) && Math.floor(spawn_pos.z) == Math.floor(player_pos.z) && heightDelta > 0 && heightDelta < 5 && determinant_y + 0.2 >= dimension.getBlockFromRay(player_pos, _Vec.Vec3.down, {
          includeLiquidBlocks: false,
          includePassableBlocks: false,
          maxDistance: 15
        }).block.location.y) {
          //apply velocity
          try {
            e.applyKnockback(0, 0, 0, 1 + e.getVelocity().y);
          } catch (e) {}
        }
      });
      t += tickdelay;
    } else {
      //exit when geyser stops
      return;
    }
  }, tickdelay);
} //blast entities using the geyser


_server.world.beforeEvents.worldInitialize.subscribe(function (eventData) {
  eventData.blockComponentRegistry.registerCustomComponent('gaia:geyser', {
    onStepOn: function onStepOn(e) {
      var block, dimension, spawn_pos;
      return regeneratorRuntime.async(function onStepOn$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              block = e;
              dimension = block.dimension;
              spawn_pos = _Vec.Vec3.add(block.location, (0, _Vec.Vec3)(0.5, 1.1, 0.5));
              dimension.getPlayers().forEach(function (e) {
                e.playSound("geyser.blast", {
                  location: spawn_pos
                });
              });
              _context.next = 6;
              return regeneratorRuntime.awrap((0, _GaiaMapping.delay)(10));

            case 6:
              push_entities(dimension, spawn_pos, 120); //start blasting entities

              dimension.spawnParticle("gaia:geyser_pre_steam", spawn_pos);
              _context.next = 10;
              return regeneratorRuntime.awrap((0, _GaiaMapping.delay)(20));

            case 10:
              dimension.spawnParticle("gaia:geyser_steam", spawn_pos);
              dimension.spawnParticle("gaia:geyser_blast", spawn_pos);

            case 12:
            case "end":
              return _context.stop();
          }
        }
      });
    }
  });
});
//# sourceMappingURL=GaiaGeyser.dev.js.map
