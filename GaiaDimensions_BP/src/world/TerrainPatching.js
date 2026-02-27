//* *//
//Прощай, старый друг
//Прощавай, старий друг
//* Спасибо тебе, добрый друг, за то, что был с нами в студии, мы тебя любим на земле и на небесах
//* Дякуємо тобі, добрий друже, за те, що был з нами в студії, ми тебе любимо на землі і на небі
// We will never forget you Error404
//* *//
// The stars will remember your name
// Code was made by Error404

import { BlockPermutation, system, world, BlockVolume } from "@minecraft/server";
import { MinecraftBlockTypes } from "@minecraft/vanilla-data";
import { GaiaDimension } from "./Gaia.js";

let the_end;
let air;
let clearFilter = [];
const queue = [];
const clearedSlices = new Set();

system.run(() => {
  try {
      the_end = world.getDimension("minecraft:overworld");
      air = BlockPermutation.resolve("minecraft:air");
      
      const targets = ["log", "leaves", "wood", "lichen", "grass", "flower", "plant", "fern", "bush", "vine", "sapling", "mushroom", "bamboo", "sugar_cane", "lily_pad", "kelp", "seagrass", "coral", "roots", "hanging", "spore", "moss", "azalea", "mangrove", "dripleaf", "glow_berry", "pumpkin", "melon", "cactus", "berry", "sea_pickle", "turtle_egg", "pink_petals", "propule", "cherry", "sculk", "snow", "ice", "mud", "dripstone", "sunflower", "lilac", "rose", "peony", "reeds", "waterlily", "web", "cobblestone", "sandstone"];
      const filterSet = new Set();
      Object.values(MinecraftBlockTypes).forEach(id => {
          if (!id.startsWith("minecraft:")) return;
          const l = id.toLowerCase();
          if (targets.some(t => l.includes(t))) {
              const essentials = ["minecraft:air", "minecraft:bedrock", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:sand", "minecraft:gravel", "minecraft:tuff", "minecraft:water", "minecraft:lava", "minecraft:deepslate"];
              if (!essentials.includes(l) && !l.includes("brick") && !l.includes("ore")) {
                  filterSet.add(id);
              }
          }
      });
      clearFilter = Array.from(filterSet);
      world.sendMessage("TerrainPatching Optimized: " + clearFilter.length + " targets.");
  } catch(e) {
      console.warn("TerrainPatching init error: " + e);
  }
});

// High-Speed Processor: ONE safe slice per tick
system.runInterval(() => {
    if (queue.length === 0) return;
    const task = queue.shift();
    const overworld = world.getDimension('minecraft:overworld');
    try {
        overworld.fillBlocks(
            new BlockVolume({x: task.x, y: task.y, z: task.z}, {x: task.x + 15, y: task.ey, z: task.z + 15}), 
            air, 
            { blockFilter: { includeTypes: clearFilter } }
        );
    } catch(e) {}
}, 1);

const size = 16;
const lastPlayerChunks = new Map();

const main = () => {
  if (!GaiaDimension || !the_end) return; 
  const players = GaiaDimension.getPlayers();
  
  for (const p of players) {
    const loc = p.location;
    const currentChunkKey = `${Math.floor(loc.x/size)}|${Math.floor(loc.z/size)}`;
    
    // Only scan when the player enters a new chunk
    if (lastPlayerChunks.get(p.id) === currentChunkKey) continue;
    lastPlayerChunks.set(p.id, currentChunkKey);

    const range = 4; // 64 block radius
    for (let x = -range; x <= range; x++) {
      for (let z = -range; z <= range; z++) {
            const cx = Math.floor((loc.x + x * size) / 16) * 16;
            const cz = Math.floor((loc.z + z * size) / 16) * 16;
            
            if (cx >= 100000 && cx <= 400000 && cz >= 100000 && cz <= 400000) {
                // Vertical range Y=85 to Y=200 in steps of 24 (approx 5 slices per chunk)
                for (let y = 85; y < 200; y += 24) {
                    const sliceKey = `${cx},${y},${cz}`;
                    if (!clearedSlices.has(sliceKey)) {
                        clearedSlices.add(sliceKey);
                        queue.push({x: cx, y: y, z: cz, ey: y + 23});
                    }
                }
            }
      }
    }
  }
}

// Tick the scanner twice a second
system.runInterval(() => {
    main();
}, 10);

// Persistence logic removed for zero lag, but can be added if needed
system.beforeEvents.shutdown.subscribe(() => {
    // Data lost on restart for speed, but will re-patch quickly
});
