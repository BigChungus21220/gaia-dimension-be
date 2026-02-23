//* *//
//Прощай, старый друг
//Прощавай, старий друг
//* Спасибо тебе, добрый друг, за то, что был с нами в студии, мы тебя любим на земле и на небесах
//* Дякуємо тобі, добрий друже, за те, що був з нами в студії, ми тебе любимо на землі і на небі
// We will never forget you Error404
//* *//
// The stars will remember your name
// Code was made by Error404

import { BlockPermutation, system, world, BlockVolume } from "@minecraft/server";
import { GaiaDimension } from "./Gaia.js";

let the_end;
let air, endstone, flower, plant, bedrock, gateway;

system.run(() => {
  try {
      the_end = world.getDimension("minecraft:the_end");
      air = BlockPermutation.resolve("minecraft:air");
      endstone = BlockPermutation.resolve("minecraft:end_stone");
      flower = BlockPermutation.resolve("minecraft:chorus_flower");
      plant = BlockPermutation.resolve("minecraft:chorus_plant");
      bedrock = BlockPermutation.resolve("minecraft:bedrock");
      gateway = BlockPermutation.resolve("minecraft:end_gateway");
      
      data = DB.getAll();
      Q.run(30);
      world.sendMessage("TerrainPatching initialized");
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
    return JSON.parse(json === "" ? "{}" : json)
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
    } else if (chunk) {
      if (data[this.y] &&
        data[this.y][this.x]) {
        delete data[this.y][this.x][this.z]
      }
    };
  }
  /**
   * unused
   */
  getBlocks() {
    let blocks = [];
    for (let x = this.x * size; x < this.x * size + size; x++) {
      for (let y = this.y * ysize; y < this.y * ysize + size; y++) {
        for (let z = this.z * size; z < this.z * size + size; z++) {
          let b = this.dim.getBlock({ x, y, z });
          if (b) blocks.push(b)
        }
      }
    };
    return blocks
  }
  clear() {
    if (!air) return false;
    try{     
      const min = { x: this.x * size, y: this.y * ysize, z: this.z * size };
      const max = { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 };
      const volume = new BlockVolume(min, max);

      this.dim.fillBlocks(volume, air, { 
          blockFilter: { 
              includeTypes: [
                  "minecraft:end_stone", 
                  "minecraft:chorus_flower", 
                  "minecraft:chorus_plant", 
                  "minecraft:bedrock", 
                  "minecraft:end_gateway"
              ] 
          } 
      });
      return true;
    } catch(e){
        // world.sendMessage(`Clear failed: ${e}`);
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
        if (Date.now() - start > BUDGET) break; // Hard cap at 15ms
        
        if (this.tasks.length !== 0) {
          this.tasks.shift()()
        } else this.push(main)
      }
    },0);
    this.runCount = runCount;
  }
  stop() {
    system.clearRun(this.#run)
  }

  push = (...args) => this.tasks.push(...args)
}




let DB = new EndlessDB("lum:end_stone_clearing:");
let data = {}; // Init empty
const Q = new TaskQueue();

// Note: DB and Q run are initialized inside system.run above

//console.warn("Terrain Interpolator loaded sucessfully")
const main = () => {
  if (!GaiaDimension || !the_end) return; // Wait for initialization
  const players = GaiaDimension.getPlayers();
  // if (players.length > 0) world.sendMessage(`TP Players: ${players.length}`);
  
  for (const p of players) {
    //feel free to change
    let range = 8;
    // try{
    //   while (p.dimension.getBlock({...off,x:off.x+(range+1)*size})){
    //     range++
    //   }
    // }catch(e){};
    let loc = p.location;
    for (let radius = 1; radius <= range; radius++) {
      for (let y = -2; y <= 3; y++) {
        // Height range checks might fail if heightRange undefined in some API versions for sim dims
        // if (loc.y + y*ysize < the_end.heightRange.min || loc.y + y*ysize > the_end.heightRange.max) continue;
        for (let x = -radius; x <= radius; x++) {
          for (let z = -radius; z <= radius; z++) {
            if (x === 0 && y === 0 && z === 0 && radius > 1) continue;
            
            const checkX = loc.x + x * size;
            const checkZ = loc.z + z * size;
            
            // Only patch terrain within Gaia Dimension bounds
            if (checkX >= 100000 && checkX <= 400000 && checkZ >= 100000 && checkZ <= 400000) {
                Q.push(() => {
                  const chunk = MiniChunk.getAt({ x: checkX, y: loc.y + y * ysize, z: checkZ }, p.dimension);
                  if (chunk.isChecked) {
                    return
                  };
                  // world.sendMessage("Clearing chunk at " + checkX + " " + checkZ);
                  if (chunk.clear()) {
                      chunk.isChecked = true;
                  }
                })
            }
          }
        }
      }
    };
    Q.push(() => null/*console.warn("Clearing Done")*/)
    DB.setAll(data);
  }
}

//tps counter
export var ticksPerSecond = 20;
var startTime = new Date();
system.runInterval(() => {
  ticksPerSecond = 150000 / (new Date() - startTime);
  startTime = new Date();
  // console.warn("TPS: "+ticksPerSecond);
  // console.warn("Count of dynProps: " + DB.count);
  if (ticksPerSecond > 20.15) {
    Q.stop();
    Q.run(Q.runCount+1)
  } else if (ticksPerSecond < 19.3){
    Q.stop();
    Q.run(Q.runCount-1)
  };
  // console.warn("Total byte size of dynprops (not only my ones): "+world.getDynamicPropertyTotalByteCount())
  // console.warn(JSON.stringify(world.getDynamicPropertyIds().filter((value)=>value.startsWith(DB.prefix))))
  // console.warn("Operations per tick: " + Q.runCount);
  DB.setAll(data);
}, 149)

system.beforeEvents.shutdown.subscribe((e) => {
  e.cancel = true
})
