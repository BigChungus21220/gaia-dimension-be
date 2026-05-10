import { BlockPermutation } from "@minecraft/server";

declare module "@minecraft/server" {
    interface BlockPermutation {
        toPermutation(r?: number): BlockPermutation;
    }
}

declare global {
    interface String {
        toPermutation(r?: number): BlockPermutation;
    }
}

export class PalettedBrush {
    public permutations: (BlockPermutation | string)[];
    public resolved: BlockPermutation[];

    constructor(){ 
        this.permutations = []; 
        this.resolved = [];
    }

    add(type: BlockPermutation | string, repeat?: number): this {
        const count = repeat ?? 1;
        for (let i = 0; i < count; i++) {
            this.permutations.push(type);
        }
        return this;
    }

    addArray(list: (BlockPermutation | string)[]): this { 
        for(const entry of list) this.add(entry); 
        return this;
    }

    private resolveAll(): void {
        if (this.resolved.length === this.permutations.length) return;
        this.resolved = this.permutations.map(p => {
            if (typeof p === "string") {
                try { return BlockPermutation.resolve(p); } 
                catch (e) { return BlockPermutation.resolve("minecraft:air"); }
            }
            return p;
        });
    }

    next(r: number = Math.random()): BlockPermutation { 
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
BlockPermutation.prototype.toPermutation = function(this: BlockPermutation, r?: number): BlockPermutation { return this; };
String.prototype.toPermutation = function(this: string, r?: number): BlockPermutation { 
    return BlockPermutation.resolve(this); 
};
