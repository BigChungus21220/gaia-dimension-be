import { BlockPermutation } from "@minecraft/server";

const bedrock = BlockPermutation.resolve("bedrock");

export class PalettedBrush {
    public permutations: BlockPermutation[];
    public uniques: Set<BlockPermutation>;

    constructor(){ 
        this.permutations = []; 
        this.uniques = new Set(); 
    }

    add(type: any, repeat?: number){
        repeat = repeat ?? 1;
        const p = type.toPermutation();
        this.uniques.add(p);
        while(repeat--) this.permutations.push(p);
        return this;
    }

    addArray(list: any[]){ 
        for(const entry of list) this.add(entry); 
        return this;
    }

    next(r = Math.random()): BlockPermutation { 
        return this.permutations[Math.floor(r * this.permutations.length)] ?? bedrock; 
    }

    toPermutation(r?: number): BlockPermutation {
        return this.next(r);
    }
}

// @ts-ignore
BlockPermutation.prototype.toPermutation = function toPermutation(r?: number){ return this; }
// @ts-ignore
String.prototype.toPermutation = function toPermutation(r?: number){ return BlockPermutation.resolve(this as string); }
