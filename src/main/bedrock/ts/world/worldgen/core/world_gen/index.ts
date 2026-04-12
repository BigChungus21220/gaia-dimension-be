import { world, system } from "@minecraft/server";
import { SessionManager } from "./session-manager";
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
    (SESSION_MANAGER as any).init(seed);
});

export const SESSION_MANAGER = new class {
    private _instance?: SessionManager;
    init(seed: number) { this._instance = new SessionManager(seed); }
    get instance() { return this._instance; }
    // Proxy common methods used by the generator
    get(dim: any) { return this._instance?.get(dim); }
    get seed() { return this._instance?.seed ?? 0; }
    get procedural() { return this._instance?.procedural; }
};