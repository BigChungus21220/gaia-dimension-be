import { BiomeDefinition } from "./definition-biome";
import { ProceduralRandom } from "../utils";
import { DefinitionManager } from "./definition-manager";

export class BiomeManager {
    public definition: DefinitionManager;
    public biomes: BiomeDefinition[];
    public table: BiomeDefinition[][] | null;
    public default: BiomeDefinition;

    constructor(definition: DefinitionManager, defaultBiome: BiomeDefinition){
        this.definition = definition;
        this.biomes = [];
        this.table = null;
        this.default = defaultBiome;
        definition.finialize.subscribe(()=>this.selfFinialize());
    }

    addBiome(biome: BiomeDefinition): void { this.biomes.push(biome); }

    selfFinialize(): void {
        // Temperature slices
        const tempSteps = 20;
        const humiSteps = 20;
        let array: BiomeDefinition[][] = [];

        for (let i = 0; i < tempSteps; i++) {
            const temp = i / tempSteps;
            const currentBiomes: BiomeDefinition[] = [];
            
            // Find all biomes that fit this temperature
            const tempMatches = this.biomes.filter(b => temp >= b.temperature[0] && temp < b.temperature[1]);
            
            for (let j = 0; j < humiSteps; j++) {
                const humi = j / humiSteps;
                const match = tempMatches.find(b => humi >= b.humidity[0] && humi < b.humidity[1]) ?? this.default;
                currentBiomes.push(match);
            }
            array.push(currentBiomes);
        }
        this.table = array;
    }

    getBiome(temperature: number, humidity: number): BiomeDefinition { 
        if (!this.table) return this.default;
        
        const tempIdx = Math.floor(temperature * (this.table.length - 1));
        const tempSlice = this.table[Math.max(0, Math.min(tempIdx, this.table.length - 1))];
        
        const humiIdx = Math.floor(humidity * (tempSlice.length - 1));
        return tempSlice[Math.max(0, Math.min(humiIdx, tempSlice.length - 1))] ?? this.default;
    }

    onPrecalculate(samples: number, seed: ProceduralRandom): void {
        this.biomes.forEach(e=>e.onPrecalculate(samples, seed));
    }
}

function _getSmallestDistance(numbers: number[]): number {
    numbers.sort((a,b)=> a - b);
    let smallest = Infinity;
    for(let l = 1; l < numbers.length; l++){
        const diff = numbers[l] - numbers[l-1];
        if(diff < smallest && diff !== 0) smallest = diff;
    }
    return smallest === Infinity ? 0.1 : smallest;
}
