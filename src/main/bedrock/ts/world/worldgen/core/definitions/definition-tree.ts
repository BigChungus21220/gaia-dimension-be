import { BlockPermutation, Dimension, ListBlockVolume, Vector3, system } from "@minecraft/server";
import { PalettedPlacer, ProceduralRandom } from "../utils";

export class CompiledTreeSmaple {
    public lists: Map<BlockPermutation, import("@minecraft/server").Vector3[]>;
    constructor(){ 
        this.lists = new Map();
    }
    placePaleteLike(){return this.lists.entries();}
    [Symbol.iterator](){return this.lists.entries();}
}

export abstract class TreeDefinition {
    public id: string;
    public IsPrecalculated: boolean;
    public samples: CompiledTreeSmaple[];

    constructor(id: string){
        this.id = id;
        this.IsPrecalculated = false;
        this.samples = [];
    }

    abstract build(location: Vector3, seed: ProceduralRandom, placer: PalettedPlacer): Generator<void, void, unknown>;
    
    place(location: Vector3 & { dimension: Dimension }, seed: ProceduralRandom, placer: PalettedPlacer){ 
        return this.build(location, seed, placer); 
    }

    onPrecalculate(samples: number, seed: ProceduralRandom){
        samples ??= 5;
        this.IsPrecalculated = true;
        while(samples-- > 0){
            const placer = new PalettedPlacer();
            for(const empty of this.build({x:0,y:0,z:0}, seed, placer));
            const sample = new CompiledTreeSmaple();
            for(const [p, list] of placer.palettes.entries()) {
                const volume = new ListBlockVolume(list);
                const newList = [];
                for(const a of volume.getBlockLocationIterator()) newList.push(a);
                sample.lists.set(p, newList);
            }
            this.samples.push(sample);
        }
    }

    /**@returns {CompiledTreeSmaple} */
    getCompiledSample(r: number){ return (this.samples as any).random(r); }

    /** Used by the generator to validate placement */
    public canPlaceValidator: (loc: any) => boolean = () => true;
}

export class PillarTreeDefinition extends TreeDefinition {
    public height: [number, number];
    public logPaletted: any;

    constructor(id: string = "pillar"){
        super(id);
        this.height = [3, 10];
        this.logPaletted = "minecraft:spruce_log";
    }

    setCanPlaceValidator(p: (loc: any) => boolean){this.canPlaceValidator = p; return this;}

    setLogPaletted(p: any){
        this.logPaletted = p;
        return this;
    }

    setHeight(min: number, max: number){
        this.height[0] = min;
        this.height[1] = max??min;
        return this;
    }

    *build(location: Vector3, seed: ProceduralRandom, placer: PalettedPlacer): Generator<void, void, unknown>{
        const {x,y,z} = location;
        const h =  seed.nextFloat() * (this.height[1] - this.height[0]) + this.height[0]
        for(let Y = 0; Y < h; Y++) {
            placer.setBlock({x: x + 0.5, y:y + Y, z: z + 0.5}, this.logPaletted.toPermutation(seed.nextFloat()));
        }
    }
}

export class SpruceTreeDefinition extends PillarTreeDefinition {
    public offset: [number, number];
    public leavesPaletted: any;

    constructor(){
        super("spruce");
        this.offset = [1, 2];
        this.leavesPaletted = "minecraft:spruce_leaves";
    }

    setLeavesPaletted(p: any){
        this.leavesPaletted = p;
        return this;
    }

    setOffSet(min: number, max: number){
        this.offset[0] = min;
        this.offset[1] = max??min;
        return this;
    }

    *build(location: Vector3, seed: ProceduralRandom, placer: PalettedPlacer): Generator<void, void, unknown>{
        const {x,y,z} = location;
        const add = seed.nextFloat() * (this.offset[1] - this.offset[0]) + this.offset[0];
        const h =  seed.nextFloat() * (this.height[1] - this.height[0]) + this.height[0];
        const height = h + add;
        for(let Y = 0; Y < height; Y++) {
            let max = height - Y + 1;
            if(Y < height - 1) placer.setBlock({x: x, y:y + Y, z: z}, this.logPaletted.toPermutation(seed.nextFloat()));
            else placer.setBlock({x: x + 0.5, y:y + Y, z: z + 0.5}, this.leavesPaletted.toPermutation(seed.nextFloat()));
            if(Y >= add) for (let i = 0.5; i < max; i+=0.8){
                let count  = i * Math.PI;
                for(let j = 0; j < count; j++){
                    const distance = seed.nextFloat() * i / 3 + 0.2;
                    const rot = seed.nextFloat() * Math.PI * 2;
                    placer.setBlock({
                        x: x + Math.sin(rot) * distance + 0.5,
                        y: y + Y,
                        z: z + Math.cos(rot) * distance + 0.5
                    }, this.leavesPaletted.toPermutation(seed.nextFloat()))
                }
                yield;
            }
        }
    }
}

export class CuttedSpruceTreeDefinition extends PillarTreeDefinition {
    public carpetPaletted: any;

    constructor(){
        super("cut_spruce");
        this.carpetPaletted = "minecraft:moss_carpet";
    }

    setCarpetPaletted(p: any){
        this.carpetPaletted = p;
        return this;
    }

    *build(location: Vector3, seed: ProceduralRandom, placer: PalettedPlacer): Generator<void, void, unknown>{
        const {x,y,z} = location;
        const h =  seed.nextFloat() * (this.height[1] - this.height[0]) + this.height[0];
        let lastHeights = [0, 0, 0, 0];
        for(let Y = -2; Y < h; Y++) {
            if(Y < h - 1){
                placer.setBlock({x: x+1, y:(lastHeights[0] = y + Y), z: z+1}, this.logPaletted.toPermutation(seed.nextFloat()));
                placer.setBlock({x: x+1, y:(lastHeights[1] = y + Y), z: z}, this.logPaletted.toPermutation(seed.nextFloat()));
                placer.setBlock({x: x, y:(lastHeights[2] = y + Y), z: z+1}, this.logPaletted.toPermutation(seed.nextFloat()));
                placer.setBlock({x: x, y:(lastHeights[3] = y + Y), z: z}, this.logPaletted.toPermutation(seed.nextFloat()));
            }else{
                if(seed.nextFloat() < 0.4) placer.setBlock({x: x+1, y:(lastHeights[0] = y + Y), z: z+1}, this.logPaletted.toPermutation(seed.nextFloat()));
                if(seed.nextFloat() < 0.4) placer.setBlock({x: x+1, y:(lastHeights[1] = y + Y), z: z}, this.logPaletted.toPermutation(seed.nextFloat()));
                if(seed.nextFloat() < 0.4) placer.setBlock({x: x, y:(lastHeights[2] = y + Y), z: z+1}, this.logPaletted.toPermutation(seed.nextFloat()));
                if(seed.nextFloat() < 0.4) placer.setBlock({x: x, y:(lastHeights[3] = y + Y), z: z}, this.logPaletted.toPermutation(seed.nextFloat()));
            }
        }
        placer.setBlock({x: x+1, y:lastHeights[0]+1, z: z+1}, this.carpetPaletted.toPermutation(seed.nextFloat()));
        placer.setBlock({x: x+1, y:lastHeights[1]+1, z: z}, this.carpetPaletted.toPermutation(seed.nextFloat()));
        placer.setBlock({x: x, y:lastHeights[2]+1, z: z+1}, this.carpetPaletted.toPermutation(seed.nextFloat()));
        placer.setBlock({x: x, y:lastHeights[3]+1, z: z}, this.carpetPaletted.toPermutation(seed.nextFloat()));
    }
}

export class TreePalette {
    public trees: TreeDefinition[];
    constructor(){ this.trees = []; }
    add(treeDefinition: TreeDefinition, num?: number){
        let value = num??1;
        while(value--) this.trees.push(treeDefinition);
        return this;
    }
    /**@returns {TreeDefinition} */
    get(random: number): TreeDefinition { return (this.trees as any).random(random); }
    onPrecalculate(samples: number, seed: ProceduralRandom){
        for(const tree of this.trees) if(!tree.IsPrecalculated) tree.onPrecalculate(samples, seed);
    }
}
