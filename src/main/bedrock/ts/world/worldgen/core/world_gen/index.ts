import { world, system, Dimension } from "@minecraft/server";
import { SessionManager } from "./session-manager";
import { ProceduralRandom } from "../utils";
import { ChunkGenerator } from "./generator";
export * from "./session-manager";
export * from "./generator";

let seed: number;
system.run(() => {
    let savedSeed = world.getDynamicProperty("seed") as number | undefined;
    if(!savedSeed){
        savedSeed = Math.ceil(Date.now() * Math.random() * 2);
        world.setDynamicProperty("seed", savedSeed);
    }
    seed = savedSeed;
    SESSION_MANAGER.init(seed);
});

class SessionManagerProxy {
    private _instance?: SessionManager;
    private _readyPromise: Promise<void>;
    private _resolveReady!: () => void;

    constructor() {
        this._readyPromise = new Promise<void>(r => this._resolveReady = r);
    }

    init(seed: number): void {
        this._instance = new SessionManager(seed);
        this._resolveReady();
    }

    /** Resolves once init(seed) has been called and the SessionManager is live. */
    get ready(): Promise<void> { return this._readyPromise; }
    get instance(): SessionManager | undefined { return this._instance; }
    // Proxy common methods used by the generator
    get(dim: Dimension): ChunkGenerator | undefined { return this._instance?.get(dim); }
    get seed(): number { return this._instance?.seed ?? 0; }
    get procedural(): ProceduralRandom | undefined { return this._instance?.procedural; }
}

export const SESSION_MANAGER = new SessionManagerProxy();