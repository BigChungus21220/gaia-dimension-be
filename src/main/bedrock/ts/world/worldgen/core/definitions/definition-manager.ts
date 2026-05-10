import { world, system } from "@minecraft/server";
import { NativeEvent, ProceduralRandom } from "../utils";
import { BiomeManager } from "./biome-manager";
import { BiomeDefinition } from "./definition-biome";
import { TreeDefinition } from "./definition-tree";

export class DefinitionManager {
    /**@readonly */
    public finialize: NativeEvent;
    /**@readonly */
    public precalculate: NativeEvent;
    /**@readonly */
    public treeDefinitions: Map<string, TreeDefinition>;
    public biomeManager: BiomeManager;
    private __precalculated: boolean;
    private __precalculatedSamples: number;

    constructor(){
        this.finialize = new NativeEvent();
        this.precalculate = new NativeEvent();
        this.treeDefinitions = new Map();
        this.biomeManager = new BiomeManager(this, new BiomeDefinition("gaiadimension:crystal_plains"));
        this.__precalculated = true;
        this.__precalculatedSamples = 15;
        
        system.run(() => {
            this.__precalculated = (world.getDynamicProperty("property-precalculated") as boolean) ?? true;
            this.__precalculatedSamples = (world.getDynamicProperty("property-precalculated-sampling") as number) ?? 15;
            if(this.__precalculatedSamples > 50) this.__precalculatedSamples = 50;
        });
    }

    get IsPrecalculated(): boolean {return this.__precalculated;}
    set IsPrecalculated(v: boolean){ this.__precalculated = v; world.setDynamicProperty("property-precalculated", v); }
    
    get PrecalculatedSamples(): number {return this.__precalculatedSamples;}
    set PrecalculatedSamples(v: number){ this.__precalculatedSamples = v; world.setDynamicProperty("property-precalculated-sampling", v); }
    
    get IsPrecalculatedVariable(): boolean {return (world.getDynamicProperty("property-precalculated") as boolean) ?? false;}
    get IsPrecalculatedSamplesVariable(): number {return (world.getDynamicProperty("property-precalculated-sampling") as number) ?? 10;}

    triggerFinialize(seed: ProceduralRandom): void {
        // DEFER TO NEXT TICK TO ENSURE ALL BIOMES ARE REGISTERED AND PROPERTIES LOADED
        system.run(() => {
            this.finialize.subscribe(()=>{
                let time = Date.now();
                this.biomeManager.selfFinialize();
                console.warn("PRECALUCLATION WITH SAMPLES: " + this.__precalculatedSamples);
                if(this.__precalculated) this.biomeManager.onPrecalculate(this.__precalculatedSamples, seed);
                console.warn("PRECALCULATED IN " + (Date.now() - time) + " ms");
            });
            this.finialize.trigger(seed);
        });
    }
}
