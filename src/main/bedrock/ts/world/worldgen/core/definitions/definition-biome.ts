import { PalettedBrush, ProceduralRandom } from "../utils";
import { TreeDefinition, TreePalette } from "./definition-tree";

export class BiomeDefinition {
    public id: string;
    public trees: TreePalette;
    /** @deprecated Use treesPerChunk instead */
    public treesChance: number;
    /** @deprecated Use treesPerChunk instead */
    public treeAreaChance: number;
    /** Java countExtra: base tree count per chunk */
    public treesPerChunk: number;
    /** Java countExtra: chance of extra trees (0.0 - 1.0) */
    public treesExtraChance: number;
    /** Java countExtra: number of extra trees when chance succeeds */
    public treesExtra: number;
    public temperature: [number, number];
    public humidity: [number, number];
    public groundPaletted: PalettedBrush;
    public underGroundPaletted: PalettedBrush;
    public vegetationPalette: PalettedBrush;
    public vegetationChance: number;
    public vegetationValidation: boolean;
    public IsPrecalculated: boolean;
    public depth: number;
    public scale: number;

    constructor(id: string){
        this.id =  id;
        this.trees = new TreePalette();
        this.treesChance = 0.02;
        this.treeAreaChance = 0.5;
        this.treesPerChunk = 0;
        this.treesExtraChance = 0.1;
        this.treesExtra = 1;
        this.temperature = [0,1];
        this.humidity = [0,1];
        this.groundPaletted = new PalettedBrush();
        this.underGroundPaletted = new PalettedBrush();
        this.vegetationPalette = new PalettedBrush();
        this.vegetationChance = 0.1;
        this.vegetationValidation = true;
        this.IsPrecalculated = false;
        this.depth = 0.125;
        this.scale = 0.05;
    }

    setDepth(p: number): this { this.depth = p; return this; }
    setScale(p: number): this { this.scale = p; return this; }

    onPrecalculate(samples: number, seed: ProceduralRandom): void { 
        this.trees.onPrecalculate(samples, seed);
        this.IsPrecalculated = true;
    }

    /**@default 0.02 @deprecated Use setTreesPerChunk instead */
    setTreesChance(p: number): this {
        this.treesChance = p;
        return this;
    }

    /**@default 0.5 @deprecated Use setTreesPerChunk instead */
    setTreesAreaChance(p: number): this {
        this.treeAreaChance = p;
        return this;
    }

    /**
     * Java-parity tree placement: countExtra(count, chance, extra)
     * Places `count` trees per chunk, with `chance` probability of placing `extra` more.
     */
    setTreesPerChunk(count: number, chance: number = 0.1, extra: number = 1): this {
        this.treesPerChunk = count;
        this.treesExtraChance = chance;
        this.treesExtra = extra;
        return this;
    }

    setTrees(p: TreePalette): this {
        this.trees = p;
        return this;
    }

    setTemperature(min: number, max: number): this {
        this.temperature = [min, max];
        return this;
    }

    setHumidity(min: number, max: number): this {
        this.humidity = [min, max];
        return this;
    }

    setGroundPalette(p: PalettedBrush): this {this.groundPaletted = p; return this;}
    setUnderGroundPalette(p: PalettedBrush): this {this.underGroundPaletted = p; return this;}
    setVegetationPalette(p: PalettedBrush): this {this.vegetationPalette = p; return this;}

    /**@default true @deprecated */
    setVegetationValidation(p: boolean): this {
        this.vegetationValidation = p;
        return this;
    }

    /**@default 0.1 */
    setVegetationChance(p: number): this {
        this.vegetationChance = p; return this;
    }

    get hasTrees(): number {return this.trees.trees.length;}
    getTreeDefinition(random: ProceduralRandom): TreeDefinition {return this.trees.get(random.nextFloat());}
}
