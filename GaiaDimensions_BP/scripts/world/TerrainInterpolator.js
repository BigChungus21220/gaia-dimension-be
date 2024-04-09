import { BlockPermutation, system, world } from "@minecraft/server";
import Gaia from "./Gaia";
const air = BlockPermutation.resolve("minecraft:air");
const endstone = BlockPermutation.resolve("minecraft:end_stone");
const flower = BlockPermutation.resolve("minecraft:chorus_flower");
const plant = BlockPermutation.resolve("minecraft:chorus_plant");
const size = 16;
const ysize = 16;

const the_end = world.getDimension("the_end");

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
    return world.getDynamicProperty(this.prefix + "count") ?? 1
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
    for (let i = 0; i < this.count; i++) {
      json += world.getDynamicProperty(this.prefix + "part_" + i) ?? ""
    }
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
  static getAt(pos, dim = the_end) {
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
    this.dim.fillBlocks({ x: this.x * size, y: this.y * ysize, z: this.z * size }, { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 }, air, { matchingBlock: endstone })
    this.dim.fillBlocks({ x: this.x * size, y: this.y * ysize, z: this.z * size }, { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 }, air, { matchingBlock: flower })
    this.dim.fillBlocks({ x: this.x * size, y: this.y * ysize, z: this.z * size }, { x: this.x * size + size - 1, y: this.y * ysize + ysize - 1, z: this.z * size + size - 1 }, air, { matchingBlock: plant })
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
      for (let iter = 0; iter < runCount; iter++) {
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
let data = DB.getAll();
const Q = new TaskQueue();
Q.run(30);


const main = () => {
  //for (const p of Gaia.getPlayers()) {
  for (const p of world.getAllPlayers()) { // it's used for testing
    if (p.dimension !== the_end) return;
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
        for (let x = -radius; x <= radius; x++) {
          for (let z = -radius; z <= radius; z++) {
            if (x === 0 && y === 0 && z === 0 && radius > 1) continue;
            //console.warn('x:'+x+' y:'+y+' z:'+z)
            Q.push(() => {
              const chunk = MiniChunk.getAt({ x: (loc.x + x) * size, y: (loc.y + y) * ysize, z: (loc.z + z) * size }, p.dimension);
              if (chunk.isChecked) {
                return
              };
              chunk.clear();
              chunk.isChecked = true;
            })
          }
        }
      }
    };
    Q.push(() => console.warn("Clearing Done"))
    DB.setAll(data);
  }
}

//tps counter
export var ticksPerSecond = 20;
var startTime = new Date();
system.runInterval(() => {
  ticksPerSecond = 150000 / (new Date() - startTime);
  startTime = new Date();
  console.warn("TPS: "+ticksPerSecond);
  console.warn("Count of dynProps: " + DB.count);
  if (ticksPerSecond > 20.15) {
    Q.stop();
    Q.run(Q.runCount+1)
  } else if (ticksPerSecond < 19.3){
    Q.stop();
    Q.run(Q.runCount-1)
  };
  console.warn("Operations per tick: " + Q.runCount);
  DB.setAll(data);
}, 149)

system.beforeEvents.watchdogTerminate.subscribe((e) => {
  e.cancel = true
})