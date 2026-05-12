import { system, Player } from "@minecraft/server";
import { SessionManager } from "../world_gen/index";

const CLIENT_CHUNKS = new WeakMap<Player, ClientChunk>();
const MAX_RETRIES = 3;

export class ClientChunk {
    static open(sessionManager: SessionManager, player: Player){
        let m = CLIENT_CHUNKS.get(player);
        if(!m) CLIENT_CHUNKS.set(player, m = new this(player, sessionManager));
        return m;
    }

    public player: Player;
    public manager: SessionManager;
    public lastVisitedChunk = "";
    public id: number | undefined = undefined;

    private chunkQueue: { x: number, z: number, key: string, retries: number }[] = [];
    private queuedChunks = new Set<string>();
    private activeJobs = 0;
    private maxJobs = 3;

    constructor(player: Player, sessionManager: SessionManager){ 
        this.player = player; 
        this.manager = sessionManager;
    }

    get chunkXZ(){
        const {x,z} = this.player.location;
        return {x: Math.floor(x/16), z: Math.floor(z/16)};
    }

    get isRunning(){return typeof this.id === "number";}

    get currentGenerator(){
        return this.manager.get(this.player.dimension);
    }

    getKey(loc: {x: number, z: number}){return `${loc.x};${loc.z}`;}

    start(){
        this.id = system.runInterval(()=> {
            try { this._tick(); } catch(e) { console.error(e); }
        });
    }

    stop(){
        if(this.isRunning && this.id !== undefined) system.clearRun(this.id);
    }

    _tick(){
        if (!this.player.dimension.id.startsWith("gaiadimension:")) return;

        const gen = this.currentGenerator;
        if (!gen) return;

        const {x: X, z: Z} = this.chunkXZ;
        const radius = 4;

        const chunks: { x: number, z: number, key: string, dist: number }[] = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = X + dx;
                const cz = Z + dz;
                const key = this.getKey({ x: cx, z: cz });
                const dist = dx * dx + dz * dz;
                chunks.push({ x: cx, z: cz, key, dist });
            }
        }

        chunks.sort((a, b) => a.dist - b.dist);

        let added = 0;
        for (const entry of chunks) {
            if (gen.isGenerated(entry.key)) continue;
            if (this.queuedChunks.has(entry.key)) continue;

            this.queuedChunks.add(entry.key);
            this.chunkQueue.push({ ...entry, retries: 0 });
            added++;
            if (added >= 6) break;
        }

        this._processQueue(gen);
    }

    _processQueue(gen: any) {
        while (this.activeJobs < this.maxJobs && this.chunkQueue.length > 0) {
            const entry = this.chunkQueue.shift()!;
            this.queuedChunks.delete(entry.key);

            if (gen.isGenerated(entry.key)) continue;

            this.activeJobs++;

            gen.buildChunk(entry.x, entry.z, entry.key)
                .then((success: boolean) => {
                    if (!success && entry.retries < MAX_RETRIES) {
                        system.runTimeout(() => {
                            if (!gen.isGenerated(entry.key) && !this.queuedChunks.has(entry.key)) {
                                this.queuedChunks.add(entry.key);
                                this.chunkQueue.push({ ...entry, retries: entry.retries + 1 });
                            }
                        }, 20);
                    }
                })
                .catch((e: any) => console.error(`[GaiaDim] Chunk error:`, e))
                .finally(() => { this.activeJobs--; });
        }
    }
}
