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

    // Pass 1: Terrain queue
    private chunkQueue: { x: number, z: number, key: string, retries: number }[] = [];
    private queuedChunks = new Set<string>();

    // Pass 2: Surface queue (vegetation + trees) — dispatched after terrain
    private surfaceQueue: { x: number, z: number, key: string, retries: number }[] = [];
    private queuedSurface = new Set<string>();

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
        if (this.player.dimension.id !== "gaiadimension:gaia_dimension") return;

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

        // Enqueue terrain (Pass 1)
        let added = 0;
        for (const entry of chunks) {
            if (gen.isGenerated(entry.key)) continue;
            if (this.queuedChunks.has(entry.key)) continue;

            this.queuedChunks.add(entry.key);
            this.chunkQueue.push({ ...entry, retries: 0 });
            added++;
            if (added >= 6) break;
        }

        // Enqueue surface (Pass 2) — only for chunks whose terrain is done
        let surfAdded = 0;
        for (const entry of chunks) {
            if (!gen.isGenerated(entry.key)) continue;  // terrain must be done first
            if (gen.isSurfaced(entry.key)) continue;    // already surfaced
            if (this.queuedSurface.has(entry.key)) continue;

            this.queuedSurface.add(entry.key);
            this.surfaceQueue.push({ ...entry, retries: 0 });
            surfAdded++;
            if (surfAdded >= 4) break;
        }

        this._processQueue(gen);
    }

    _processQueue(gen: any) {
        // Prioritize terrain, then surface
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
                .catch((e: any) => console.error(`[GaiaDim] Terrain error:`, e))
                .finally(() => { this.activeJobs--; });
        }

        // Surface pass — lower priority, fills remaining job slots
        while (this.activeJobs < this.maxJobs && this.surfaceQueue.length > 0) {
            const entry = this.surfaceQueue.shift()!;
            this.queuedSurface.delete(entry.key);

            if (gen.isSurfaced(entry.key)) continue;

            this.activeJobs++;

            gen.buildSurface(entry.x, entry.z, entry.key)
                .then((success: boolean) => {
                    if (!success && entry.retries < MAX_RETRIES) {
                        system.runTimeout(() => {
                            if (!gen.isSurfaced(entry.key) && !this.queuedSurface.has(entry.key)) {
                                this.queuedSurface.add(entry.key);
                                this.surfaceQueue.push({ ...entry, retries: entry.retries + 1 });
                            }
                        }, 20);
                    }
                })
                .catch((e: any) => console.error(`[GaiaDim] Surface error:`, e))
                .finally(() => { this.activeJobs--; });
        }
    }
}

