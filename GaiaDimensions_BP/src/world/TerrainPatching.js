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
/** @type {string[]} */
let clearFilter = [];

/**
 * Class for endless object databases
 */
class EndlessDB {
  prefix = '';
  /**
   * 
   * @param {string} prefix Prefix for the database. Should be unique for each DB
   */
  constructor(prefix) {
    this.prefix = prefix
  }
  /**
   * Count of used dynamic properties for this DB
   */
  get count() {
    try {
        return world.getDynamicProperty(this.prefix + "count") ?? 1
    } catch(e) { return 1; }
  }
  set count(value) {
    world.setDynamicProperty(this.prefix + "count", value)
  }
  /**
   * Gets all data stored in DB
   * @returns Database object
   */
  getAll() {
    let json = '';
    try {
        for (let i = 0; i < this.count; i++) {
          json += world.getDynamicProperty(this.prefix + "part_" + i) ?? ""
        }
    } catch(e) {}
    try {
        return JSON.parse(json === "" ? "{}" : json)
    } catch(e) {
        return {};
    }
  }
  /**
   * 
   * @param {object} object Saves given data into DB (rewriting)
   */
  setAll(object) {
    let json = JSON.stringify(object);
    let i = 0;
    while (json.length !== 0) {
      world.setDynamicProperty(this.prefix + "part_" + i, json.slice(0, 32767))
      json = json.slice(32767)
      i++
    };
    this.count = i
  }
}

const size = 16;
const ysize = 16;

/**
 * A piece of loaded blocks with utils 
 */
class MiniChunk {
  constructor(chunkLoc, dim) {
    this.x = Math.floor(chunkLoc.x);
    this.y = Math.floor(chunkLoc.y);
    this.z = Math.floor(chunkLoc.z);
    this.dim = dim;
  }
  /**
   * Alternative constructor
   * @param {import("@minecraft/server").Vector3} pos 
   * @param {import("@minecraft/server").Dimension} dim 
   */
  static getAt(pos, dim) {
    if (!dim) dim = the_end;
    let { x, y, z } = pos;
    return new MiniChunk({ x: x / size, z: z / size, y: y / ysize }, dim)
  }
  /**
   * if the chunk is already cleared
   */
  get isChecked() {
    return !!data[this.y]?.[this.x]?.[this.z];
  }
  set isChecked(value) {
    if (!data[this.y]) data[this.y] = {};
    if (!data[this.y][this.x]) data[this.y][this.x] = {};
    
    if (value) {
      data[this.y][this.x][this.z] = true;
    } else {
      delete data[this.y][this.x][this.z];
    }
  }

  clear() {
    if (!air) return false;
    try {     
      const min = { x: this.x * size, y: this.y * ysize, z: this.z * size };
      const max = { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 };
      const volume = new BlockVolume(min, max);

      this.dim.fillBlocks(volume, air, { 
          blockFilter: { 
              includeTypes: clearFilter
          } 
      });
      return true;
    } catch(e) {
        return false;
    }
  }
}

/**
 * Class for optimization
 */
class TaskQueue {
  tasks = [];
  #run;
  runCount = 10;
  /**
   * 
   * @param {number} runCount 
   */
  run(runCount) {
    this.runCount = runCount;
    this.#run = system.runInterval(() => {
      const start = Date.now();
      const BUDGET = 15;
      
      for (let iter = 0; iter < this.runCount; iter++) {
        if (Date.now() - start > BUDGET) break; 
        
        if (this.tasks.length !== 0) {
          const task = this.tasks.shift();
          if (task) task();
        } else {
            this.push(main);
        }
      }
    }, 0);
  }
  stop() {
    if (this.#run !== undefined) system.clearRun(this.#run);
  }

  push = (...args) => this.tasks.push(...args)
}

let DB = new EndlessDB("lum:end_stone_clearing:");
let data = {};
const Q = new TaskQueue();

system.run(() => {
  try {
      the_end = world.getDimension("minecraft:overworld");
      air = BlockPermutation.resolve("minecraft:air");
      
      // Initialize the filter with vanilla data for logs, leaves, lichen, and more
      clearFilter = Object.values(MinecraftBlockTypes).filter(typeId => {
          // Keep common essential blocks
          if (["minecraft:air", "minecraft:bedrock", "minecraft:stone", "minecraft:dirt", "minecraft:grass_block", "minecraft:sand", "minecraft:gravel", "minecraft:water", "minecraft:lava", "minecraft:deepslate"].includes(typeId)) return false;
          
          // Only target vanilla blocks
          if (!typeId.startsWith("minecraft:")) return false;

          // Inclusion criteria: logs, leaves, vegetation, lichen
          return (
              typeId.includes("log") || 
              typeId.includes("leaves") || 
              typeId.includes("wood") || 
              typeId.includes("lichen") || 
              typeId.includes("grass") || 
              typeId.includes("flower") || 
              typeId.includes("plant") || 
              typeId.includes("fern") || 
              typeId.includes("bush") || 
              typeId.includes("vine") || 
              typeId.includes("sapling") || 
              typeId.includes("mushroom") || 
              typeId.includes("bamboo") || 
              typeId.includes("sugar_cane") || 
              typeId.includes("lily_pad") ||
              typeId.includes("chorus_") ||
              typeId.includes("end_stone") ||
              typeId.includes("end_gateway")
          );
      });

      data = DB.getAll();
      Q.run(30); 
      world.sendMessage("TerrainPatching initialized (extended overworld clearing enabled)");
  } catch(e) {
      world.sendMessage("TerrainPatching init error: " + e);
  }
});

const main = () => {
  if (!GaiaDimension || !the_end) return; 
  const players = GaiaDimension.getPlayers();
  
  for (const p of players) {
    let range = 8;
    let loc = p.location;
    for (let radius = 1; radius <= range; radius++) {
      for (let y = -2; y <= 3; y++) {
        for (let x = -radius; x <= radius; x++) {
          for (let z = -radius; z <= radius; z++) {
            if (x === 0 && y === 0 && z === 0 && radius > 1) continue;
            
            const checkX = loc.x + x * size;
            const checkY = loc.y + y * ysize;
            const checkZ = loc.z + z * size;
            
            if (GaiaDimension.isInDimension({ x: checkX, y: checkY, z: checkZ })) {
                Q.push(() => {
                  const chunk = MiniChunk.getAt({ x: checkX, y: checkY, z: checkZ }, p.dimension);
                  if (!chunk.isChecked) {
                      if (chunk.clear()) {
                          chunk.isChecked = true;
                      }
                  }
                })
            }
          }
        }
      }
    };
  }
}

// TPS counter
export let ticksPerSecond = 20;
let startTime = Date.now();

system.runInterval(() => {
  const now = Date.now();
  ticksPerSecond = 1000 / ((now - startTime) / 20);
  startTime = now;

  if (ticksPerSecond > 20.15) {
    Q.runCount = Math.min(Q.runCount + 1, 100);
  } else if (ticksPerSecond < 19.3){
    Q.runCount = Math.max(Q.runCount - 1, 1);
  };
}, 20);

// Persistence
system.runInterval(() => {
    if (Object.keys(data).length > 0) {
        DB.setAll(data);
    }
}, 600);

system.beforeEvents.worldLeave.subscribe((e) => {
  if (Object.keys(data).length > 0) {
      DB.setAll(data);
  }
});
