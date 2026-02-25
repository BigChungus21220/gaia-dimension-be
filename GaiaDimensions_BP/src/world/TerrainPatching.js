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

system.run(() => {
  try {
      the_end = world.getDimension("minecraft:overworld");
      air = BlockPermutation.resolve("minecraft:air");
      
      const filterSet = new Set();
      Object.values(MinecraftBlockTypes).forEach(typeId => {
          if (!typeId.startsWith("minecraft:")) return;
          const target = typeId.toLowerCase();
          if (
              target.includes("log") || target.includes("leaves") || target.includes("wood") || 
              target.includes("lichen") || target.includes("grass") || target.includes("flower") || 
              target.includes("plant") || target.includes("fern") || target.includes("bush") || 
              target.includes("vine") || target.includes("sapling") || target.includes("mushroom") || 
              target.includes("bamboo") || target.includes("sugar_cane") || target.includes("lily_pad") ||
              target.includes("kelp") || target.includes("seagrass") || target.includes("coral") ||
              target.includes("double_plant") || target.includes("chorus_") || 
              target.includes("end_stone") || target.includes("end_gateway")
          ) {
              if (!["minecraft:air", "minecraft:bedrock", "minecraft:dirt", "minecraft:stone"].includes(target)) {
                  filterSet.add(typeId);
              }
          }
      });
      clearFilter = Array.from(filterSet);

      data = DB.getAll();
      Q.run(30); 
      world.sendMessage("TerrainPatching initialized (Manual Mode)");
  } catch(e) {
      world.sendMessage("TerrainPatching init error: " + e);
  }
});

const size = 16;
const ysize = 16;

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

/**
 * A piece of loaded blocks with utils 
 */
class MiniChunk {
  x;
  y;
  z;
  dim;
  constructor(chunkLoc, dim) {
    this.x = Math.floor(chunkLoc.x);
    this.y = Math.floor(chunkLoc.y);
    this.z = Math.floor(chunkLoc.z);
    this.dim = dim;
  }
  /**
   * Alternative constructor
   * @param {Vector} pos 
   * @param {Dimension} dim 
   */
  static getAt(pos, dim) {
    if (!dim) dim = the_end;
    let { x, y, z } = pos;
    return new this({ x: x / size, z: z / size, y: y / ysize }, dim)
  }
  /**
   * if the chunk is already cleared
   */
  get isChecked() {
    let chunk = data[this.y]?.[this.x]?.[this.z];
    return !!chunk
  }
  set isChecked(value) {
    if (typeof value !== "boolean") value = !!value;
    let chunk = data[this.y]?.[this.x]?.[this.z];
    if (!chunk && value) {
      if (!data[this.y]) data[this.y] = {};
      if (!data[this.y][this.x]) data[this.y][this.x] = {};
      data[this.y][this.x][this.z] = true
    } else if (chunk && !value) {
      if (data[this.y] &&
        data[this.y][this.x]) {
        delete data[this.y][this.x][this.z]
      }
    };
  }

  clear() {
    if (!air || !this.dim) return false;
    try {     
      const min = { x: this.x * size, y: this.y * ysize, z: this.z * size };
      const max = { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 };
      
      this.dim.fillBlocks(new BlockVolume(min, max), air, { 
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
  runCount;
  /**
   * 
   * @param {number} runCount 
   */
  run(runCount) {
    this.#run = system.runInterval(() => {
      const start = Date.now();
      const BUDGET = 15;
      
      for (let iter = 0; iter < runCount; iter++) {
        if (Date.now() - start > BUDGET) break; 
        
        if (this.tasks.length !== 0) {
          this.tasks.shift()()
        } else this.push(main)
      }
    }, 0);
    this.runCount = runCount;
  }
  stop() {
    if (this.#run !== undefined) system.clearRun(this.#run);
  }

  push = (...args) => this.tasks.push(...args)
}

let DB = new EndlessDB("lum:end_stone_clearing:");
let data = {};
const Q = new TaskQueue();

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
            const checkZ = loc.z + z * size;
            
            if (checkX >= 100000 && checkX <= 400000 && checkZ >= 100000 && checkZ <= 400000) {
                Q.push(() => {
                  const chunk = MiniChunk.getAt({ x: checkX, y: loc.y + y * ysize, z: checkZ }, p.dimension);
                  if (chunk.isChecked) return;
                  if (chunk.clear()) { 
                      chunk.isChecked = true;
                  }
                })
            }
          }
        }
      }
    };
    Q.push(() => null)
  }
}

//tps counter
export var ticksPerSecond = 20;
var startTime = new Date();
system.runInterval(() => {
  ticksPerSecond = 150000 / (new Date() - startTime);
  startTime = new Date();
  if (ticksPerSecond > 20.15) {
    Q.stop();
    Q.run(Q.runCount+1)
  } else if (ticksPerSecond < 19.3){
    Q.stop();
    Q.run(Q.runCount-1)
  };
}, 149)

// Persistence
system.runInterval(() => {
    if (Object.keys(data).length > 0) {
        DB.setAll(data);
    }
}, 600);

system.beforeEvents.shutdown.subscribe((e) => {
  if (Object.keys(data).length > 0) {
      DB.setAll(data);
  }
});
