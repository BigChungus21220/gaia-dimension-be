import { BlockPermutation } from "@minecraft/server";

export class PalettedBrush {
    public permutations: (BlockPermutation | string)[];
    public resolved: BlockPermutation[];

    constructor(){ 
        this.permutations = []; 
        this.resolved = [];
    }

    add(type: any, repeat?: number){
        repeat = repeat ?? 1;
        while(repeat--) this.permutations.push(type);
        return this;
    }

    addArray(list: any[]){ 
        for(const entry of list) this.add(entry); 
        return this;
    }

    private resolveAll() {
        if (this.resolved.length === this.permutations.length) return;
        this.resolved = this.permutations.map(p => {
            if (typeof p === "string") {
                try { return BlockPermutation.resolve(p); } 
                catch (e) { return BlockPermutation.resolve("minecraft:air"); }
            }
            return p;
        });
    }

    next(r = Math.random()): BlockPermutation { 
        this.resolveAll();
        return this.resolved[Math.floor(r * this.resolved.length)] ?? BlockPermutation.resolve("minecraft:air"); 
    }

    toPermutation(r?: number): BlockPermutation {
        return this.next(r);
    }

    /** Returns the raw string block ID (or BlockPermutation) without resolving.
     *  This is safe to pass directly to fillBlocks() which accepts string | BlockPermutation. */
    toBlockId(r: number): string | BlockPermutation {
        if (!this.permutations.length) return "minecraft:air";
        return this.permutations[Math.floor(r * this.permutations.length)];
    }
}

// @ts-ignore
PalettedBrush.prototype.toPermutation = PalettedBrush.prototype.next;
// @ts-ignore
BlockPermutation.prototype.toPermutation = function toPermutation(r?: number){ return this; }
// @ts-ignore
String.prototype.toPermutation = function toPermutation(r?: number){ return BlockPermutation.resolve(this as string); }
