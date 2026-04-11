import { PalettedBrush, ProceduralRandom } from "../utils";
import { TreeDefinition, TreePalette } from "./definition-tree";

export class BiomeDefinition {
    public id: string;
    public trees: TreePalette;
    public treesChance: number;
    public treeAreaChance: number;
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

    /**@param {string} id */
    constructor(id: string){
        this.id =  id;
        this.trees = new TreePalette();
        this.treesChance = 0.02;
        this.treeAreaChance = 0.5;
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

    setDepth(p: number){ this.depth = p; return this; }
    setScale(p: number){ this.scale = p; return this; }

    onPrecalculate(samples: number, seed: ProceduralRandom){ 
        this.trees.onPrecalculate(samples, seed);
        this.IsPrecalculated = true;
    }

    /**@default 0.02 */
    setTreesChance(p: number){
        this.treesChance = p;
        return this;
    }

    /**@default 0.5 */
    setTreesAreaChance(p: number){
        this.treeAreaChance = p;
        return this;
    }

    setTrees(p: TreePalette){
        this.trees = p;
        return this;
    }

    setTemperature(min: number, max: number){
        this.temperature = [min, max];
        return this;
    }

    setHumidity(min: number, max: number){
        this.humidity = [min, max];
        return this;
    }

    setGroundPalette(p: PalettedBrush){this.groundPaletted = p; return this;}
    setUnderGroundPalette(p: PalettedBrush){this.underGroundPaletted = p; return this;}
    setVegetationPalette(p: PalettedBrush){this.vegetationPalette = p; return this;}

    /**@default true @deprecated */
    setVegetationValidation(p: boolean){
        this.vegetationValidation = p;
        return this;
    }

    /**@default 0.1 */
    setVegetationChance(p: number){
        this.vegetationChance = p; return this;
    }

    get hasTrees(){return this.trees.trees.length;}
    getTreeDefinition(random: ProceduralRandom): TreeDefinition {return this.trees.get(random.nextFloat());}
}
