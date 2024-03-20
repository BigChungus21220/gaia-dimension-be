import {BlockPermutation, Player,system,world} from "@minecraft/server";
import Gaia from "./api/Gaia";

const air = BlockPermutation.resolve("minecraft:air");
const endstone = BlockPermutation.resolve("minecraft:end_stone");
const flower = BlockPermutation.resolve("minecraft:chorus_flower");
const plant = BlockPermutation.resolve("minecraft:chorus_plant");
const size = 16;
const ysize =16;

const the_end = world.getDimension("the_end");


class EndlessDB{
  prefix='';
  constructor(prefix){
    this.prefix=prefix
  }
  get count(){
    return world.getDynamicProperty(this.prefix+"count") ?? 1
  }
  set count(value){
    world.setDynamicProperty(this.prefix+"count",value)
  }
  getAll(){
    let json='';
    for (let i=0;i<this.count;i++){
      json+=world.getDynamicProperty(this.prefix+"part_"+i)??""
    }
    return JSON.parse(json===""?"{}":json)
  }
  setAll(obj){
    let json = JSON.stringify(obj);
    let i = 0;
    while (json.length!==0){
      world.setDynamicProperty(this.prefix+"part_"+i,json.slice(0,32767))
      json=json.slice(32767)
      i++
    };
    this.count=i
  }
}

class MiniChunk{
  x;
  y;
  z;
  dim;
  constructor(chunkLoc,dim){
    this.x=Math.floor(chunkLoc.x);
    this.y=Math.floor(chunkLoc.y);
    this.z=Math.floor(chunkLoc.z);
    this.dim=dim;
  }
  static getAt(pos,dim=the_end){
    let {x,y,z}=pos;
    return new this({x:x/size,z:z/size,y:y/ysize},dim)
  }
  get isChecked(){
    let chunk= data[this.y]?.[this.x]?.[this.z];
    return !!chunk
  }
  set isChecked(value){
    if (typeof value !== "boolean") value = !!value;
    let chunk = data[this.y]?.[this.x]?.[this.z];
    if (!chunk && value){
      if (!data[this.y]) data[this.y] = {};
      if (!data[this.y][this.x]) data[this.y][this.x] = {};
      data[this.y][this.x][this.z] = true
    } else if (chunk){
      if (data[this.y] &&
        data[this.y][this.x]){
          delete data[this.y][this.x][this.z]
        }
    };
  }
  getBlocks(){
    let blocks=[];
    for (let x = this.x*size; x < this.x*size + size ; x++){
      for (let y = this.y*ysize; y < this.y*ysize + size ; y++){
        for (let z = this.z*size; z < this.z*size + size  ; z++){
          let b = this.dim.getBlock({x,y,z});
          if (b) blocks.push(b)
        }
      }
    };
    return blocks
  }
  clear(){
    this.dim.fillBlocks({x:this.x*size,y:this.y*ysize,z:this.z*size},{x:this.x*size+size-1,y:this.y*ysize+ysize-1,z:this.z*size+size-1},air,{matchingBlock:endstone})
    this.dim.fillBlocks({x:this.x*size,y:this.y*ysize,z:this.z*size},{x:this.x*size+size-1,y:this.y*ysize+ysize-1,z:this.z*size+size-1},air,{matchingBlock:flower})
    this.dim.fillBlocks({x:this.x*size,y:this.y*ysize,z:this.z*size},{x:this.x*size+size-1,y:this.y*ysize+ysize-1,z:this.z*size+size-1},air,{matchingBlock:plant})
    
  }
}
class TaskQueue{
  tasks=[];
  #run;
  runCount=1;
  timeout=0;
  constructor(count=1){
    if (count > 0){
      this.runCount=count;
    } else {
      this.runCount=1;
      this.timeout=-count;
    }
  }
  
  run(){
    this.#run = system.runInterval(()=>{
    for (let iter=0;iter<this.runCount;iter++){ 
        if (this.tasks.length !== 0){
          this.tasks.shift()()
        } else Q.push(()=>main())
      }
    },this.timeout)
  }
  stop(){
    system.clearRun(this.#run)
  }
  
  push=(...args)=>this.tasks.push(...args)
}




let DB = new EndlessDB("lum:stone:");
let data = DB.getAll();
const Q = new TaskQueue(30);
Q.run();
const main = ()=>{
  for (const p of world.getAllPlayers()){
    if (p.dimension !== the_end ){
      continue
    }
    //fell free to change
    let range = 8;
    // try{
    //   while (p.dimension.getBlock({...off,x:off.x+(range+1)*size})){
    //     range++
    //   }
    // }catch(e){};
    let loc = p.location;
    for (let radius=1;radius<=range;radius++){
      for (let y=-2;y<=3;y++){
        for (let x=-radius;x<=radius;x++){
          for (let z=-radius;z<=radius;z++){
            if (x===0 && y===0 && z===0 && radius > 1) continue;
            //console.warn('x:'+x+' y:'+y+' z:'+z)
            Q.push(()=>{
              try{const chunk = MiniChunk.getAt({x:loc.x+x*size,y:loc.y+y*ysize,z:loc.z+z*size},p.dimension);
              if (chunk.isChecked){
                return
              };
              chunk.clear();
              chunk.isChecked=true;}catch(e){}
            })
          }
        }
      }
    };
    Q.push(()=>console.warn("Clearing Done"))
    DB.setAll(data);
  }
};
system.runTimeout(main,0)

//tps counter
export var ticksPerSecond = 20;
var startTime = new Date();
system.runInterval(()=>{
  ticksPerSecond=150000/(new Date()-startTime);
  startTime=new Date();
  console.warn(ticksPerSecond);
  console.warn("Count of dynProps: "+DB.count);
  console.warn("Queue: "+Q.tasks.length);
},149)

system.beforeEvents.watchdogTerminate.subscribe((e)=>{
  e.cancel=true
})