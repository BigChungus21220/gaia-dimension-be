import { BiomeDefinition } from "./definition-biome";
import { ProceduralRandom } from "../utils";

export class BiomeManager {
    public definition: any;
    public biomes: BiomeDefinition[];
    public table: BiomeDefinition[][] | null;
    public default: BiomeDefinition;

    /**@param {any} definition @param {BiomeDefinition} defaultBiome */
    constructor(definition: any, defaultBiome: BiomeDefinition){
        this.definition = definition;
        this.biomes = [];
        this.table = null;
        this.default = defaultBiome;
        definition.finialize.subscribe(()=>this.selfFinialize());
    }

    addBiome(biome: BiomeDefinition){ this.biomes.push(biome); }

    selfFinialize(){
        const mDistance = getSmallestDistance(
            [].concat(
                this.biomes.map(e=>e.temperature[0]) as any,
                this.biomes.map(e=>e.temperature[1]) as any
            )
        );
        let array: BiomeDefinition[][] = [];
        this.biomes.sort((a,b)=>(a.temperature[0] + a.temperature[1])/2 - (b.temperature[0] + b.temperature[1])/2)
        for(let i = 0; i < 1; i+=mDistance){
            const currentBiomes: BiomeDefinition[] = [];
            for(const biome of this.biomes){
                const [min, max] = biome.temperature;
                if(i >= min && i < max) currentBiomes.push(biome);
            }
            if(!currentBiomes.length) continue;
            
            // This part needs to handle humidity mapping within the temperature slice
            // For now, we'll store the currentBiomes slice
            array.push(currentBiomes);
        }
        this.table = array;
    }

    /**@returns {BiomeDefinition} */
    getBiome(temperature: number, humidity: number): BiomeDefinition { 
        if (!this.table) return this.default;
        const tempSlice = (this.table as any).random(temperature);
        if (!tempSlice) return this.default;
        return (tempSlice as any).random(humidity) ?? this.default; 
    }

    onPrecalculate(samples: number, seed: ProceduralRandom){
        this.biomes.forEach(e=>e.onPrecalculate(samples, seed));
    }
}

function getSmallestDistance(numbers: number[]): number {
    numbers.sort((a,b)=> a - b);
    let smallest = Infinity;
    for(let l = 1; l < numbers.length; l++){
        const diff = numbers[l] - numbers[l-1];
        if(diff < smallest && diff !== 0) smallest = diff;
    }
    return smallest === Infinity ? 0.1 : smallest;
}
