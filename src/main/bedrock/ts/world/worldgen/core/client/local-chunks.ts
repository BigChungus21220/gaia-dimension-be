import { system, Player, Dimension } from "@minecraft/server";
import { SessionManager } from "../world_gen/index";
import { DEFINITION_MANAGER } from "../definitions/index";

const CLIENT_CHUNKS = new WeakMap<Player, ClientChunk>();
export class ClientChunk {
    /**@param {Player} player @param {SessionManager} sessionManager @returns {ClientChunk} */
    static open(sessionManager: SessionManager, player: Player){
        let m = CLIENT_CHUNKS.get(player);
        if(!m) CLIENT_CHUNKS.set(player, m = new this(player, sessionManager));
        return m;
    }

    public player: Player;
    public manager: SessionManager;
    public biomes: any;
    public lastChunks: any[] = [];
    public viewDistance = 8;
    public maxJobs = 4;
    public lastVisitedChunk = "";
    public tasks = new Set<any>();
    public currentArea = new Set<string>();
    public knownUnrenderedChunks = new Map<string, any>();
    public id: number | undefined = undefined;
    public runTick = 0n;
    public priorities: string[][] = [];

    /**@param {Player} player @param {SessionManager} sessionManager */
    constructor(player: Player, sessionManager: SessionManager){ 
        this.player = player; 
        this.manager = sessionManager;
        this.biomes = DEFINITION_MANAGER.biomeManager;
    }

    get emptyTasks(){ return this.maxJobs - this.tasks.size; }
    get chunkXZ(){
        const {x,z} = this.player.location;
        return {x: Math.floor(x/16), z: Math.floor(z/16)};
    }
    get isRunning(){return typeof this.id === "number";}
    get currentGenerator(){
        return this.manager.get(this.player.dimension);
    }
    isGenerated(){
        const gen = this.currentGenerator;
        return gen ? gen.isGenerated(this.getKey(this.chunkXZ)) : true;
    }
    getKey(loc: {x: number, z: number}){return `${loc.x};${loc.z}`;}
    start(){
        this.id = system.runInterval(()=>this._tick().catch(e=>console.error(e,e?.stack)));
    }
    stop(){
        if(this.isRunning && this.id !== undefined) system.clearRun(this.id);
    }
    _recalc2(X: number, Z: number){
        this.priorities = [];
        const newArea = new Set<string>();
        const r = this.viewDistance;
        let power = r ** 2;
        for (let x = -r; x < r; x++) {
            for (let z = -r; z < r; z++) {
                const R = x ** 2 + z ** 2;
                if (R > power) continue;
                const xx = X + x;
                const zz = Z + z;
                const key = `${xx};${zz}`;
                newArea.add(key);
                const priority = Math.floor(R**0.5);
                const p = this.priorities[priority]??(this.priorities[priority]=[]);
                if (!this.currentArea.delete(key)) this.knownUnrenderedChunks.set(key, {x:xx,z:zz, key}); 
                if(this.knownUnrenderedChunks.has(key)) p.push(key);
            }
        }
        for(const key of this.currentArea) this.knownUnrenderedChunks.delete(key);
        this.currentArea = newArea;
        return this.priorities; 
    }
    
    _generateChunk(x: number, z: number, hash: string){
        const gen = this.currentGenerator;
        if (!gen) return Promise.resolve();
        const task = gen.buildChunk(x,z, hash).catch((e)=>console.error(e,e?.stack));
        task.finally(()=>this.tasks.delete(task));
        this.tasks.add(task);
        return task;
    }
    async _tick(){
        const {x:X,z:Z} = this.chunkXZ;
        const key = `${X};${Z}`;
        let emptyTasks = this.emptyTasks;

        const gen = this.currentGenerator;
        if (!gen) return;

        const {x,z} = this.player.location;
        if((this.player as any)._debug){
            const a = gen.getStats(x, z);
            const {temperature, humidity} = a;
            const biome = this.biomes.getBiome(temperature, humidity);
    
            if(this.runTick++ & 1n) this._showDebug(biome);
        }
        if(!emptyTasks) return;
        const priorities = (this.lastVisitedChunk === (this.lastVisitedChunk = key))?this.priorities:this._recalc2(X,Z);
        let i = 0;
        main: for(let o = 0; o < priorities.length; o++){
            const major = priorities[o]??[];
            while(major.length){
                if(++i > emptyTasks) break main;
                const key = major.shift() as string;
                const loc = this.knownUnrenderedChunks.get(key);
                if(loc) {
                    this.knownUnrenderedChunks.delete(key);
                    this._generateChunk(loc.x, loc.z, key);
                }
            }
        }
    }
    _showDebug(b: any){
        this.player.onScreenDisplay.setActionBar([
            `§7Running Tasks:§n§l ${this.tasks.size} §7/§n§l ${this.maxJobs}`,
            `§7Queue: §n§l${this.knownUnrenderedChunks.size}§r§7 chunks`,
            `§7Biome: §n§l${b.id}`,
            "§7Radius: §n§l" + this.viewDistance + "§r§7 chunks",
            "§7Seed: §n§l" + this.manager.seed,
        ].join("\n§r"));
    }
}
