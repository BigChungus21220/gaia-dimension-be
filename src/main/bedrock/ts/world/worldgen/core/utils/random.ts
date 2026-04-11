export class ProceduralRandom {
    static getNumber(pos: number, seed: number): number {
        const BIT_NOISE1 = 0x68E31DA4;
        const BIT_NOISE2 = 0xB5297A4D;
        const BIT_NOISE3 = 0x1B56C4E9;

        let mangledBits = pos & 0x7fffffff;
        mangledBits *= BIT_NOISE1;
        mangledBits += seed;
        mangledBits ^= (mangledBits >> 8);
        mangledBits += BIT_NOISE2;
        mangledBits ^= (mangledBits << 8);
        mangledBits *= BIT_NOISE3;
        mangledBits ^= (mangledBits >> 8);
        return mangledBits;
    }

    public seed: number;
    public index: number;

    constructor(seed: number) {
        this.seed = Math.floor(seed);
        this.index = 0;
    }

    getInt(r: number): number { return ProceduralRandom.getNumber(r, this.seed); }
    getFloat(r: number): number { return this.getInt(r) / 0x7fffffff; }
    getInt2(x: number, z: number): number { return this.getInt(x + z * 999999937); }
    nextInt(): number { return this.getInt(this.index++); }
    nextFloat(): number { return this.getFloat(this.index++); }
    getSeqence(x: number, z: number): ProceduralRandom { return new ProceduralRandom(x + z * 999999937); }
}

// @ts-ignore
Array.prototype.random = function random(r = Math.random()) {
    return this[Math.floor(r * this.length)];
};

// @ts-ignore
String.prototype.toArray = function toArray(num) {
    return new Array(num ?? 1).fill(this);
};
