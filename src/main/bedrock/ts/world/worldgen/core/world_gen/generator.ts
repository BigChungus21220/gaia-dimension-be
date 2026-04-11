import { BlockPermutation, BlockVolume, Dimension, system, Vector3 } from "@minecraft/server";
import { easeOutQuad, proximityEaseing, FastNoiseLite, PalettedPlacer, ProceduralRandom, Vec3 } from "../utils";
import { GaiaTerrainWarp } from "./warper";

const air = BlockPermutation.resolve("air");
const water = BlockPermutation.resolve("water");
const seaLevel = -40;
const entry = -60;

interface ConceptBlock extends Vector3 {
    underGroundPaletted: any;
}

interface VegetationProcess extends Vector3 {
    vegetationPalette: any;
    vegetationValidation: boolean;
}

interface TreeProcess extends Vector3 {
    treePalete: any;
    dimension: Dimension;
}

export class ChunkGenerator{
    private warper: GaiaTerrainWarp;
    public seaLevel: number;
    public entry: number;
    public manager: any;
    public dimension: Dimension;
    public dimensionId: string;
    public range: any;
    public building: Set<any>;
    public seed: ProceduralRandom;
    public base: FastNoiseLite;
    public spikes: FastNoiseLite;
    public kind: FastNoiseLite;
    public overall: FastNoiseLite;
    public deep: FastNoiseLite;
    public trees: FastNoiseLite;
    public temp: FastNoiseLite;
    public humi: FastNoiseLite;
    public isGenerating: Set<string> = new Set();

    /**@param {Dimension} dimension @param {any} sessionManager @param {ProceduralRandom} seed */
    constructor(sessionManager: any, dimension: Dimension, seed: ProceduralRandom){
        this.seaLevel = seaLevel;
        this.entry = entry;
        this.manager = sessionManager;
        this.dimension = dimension;
        this.dimensionId = dimension.id;
        this.range = dimension.heightRange;
        this.building = new Set();
        this.seed = seed;
        const biomeFactor = (1/(this.manager.definition.biomeManager.biomes.length*2 + 10))/200;
        
        // Ported Gaia Terrain Warp
        this.warper = new GaiaTerrainWarp(4, 4, 32, 1.0, 0.0, seed.nextInt());

        // base
        this.base = new FastNoiseLite(seed.nextInt());
        this.base.SetNoiseType(FastNoiseLite.NoiseType.Perlin);
        this.base.SetFractalType(FastNoiseLite.FractalType.FBm);
        this.base.SetFractalOctaves(2);
        // Spikes
        this.spikes = new FastNoiseLite(seed.nextInt());
        this.spikes.SetNoiseType(FastNoiseLite.NoiseType.Cellular);
        this.spikes.SetCellularJitter(1.2);
        this.spikes.SetFrequency(0.02);
        // Kind - Flat/Peaky
        this.kind = new FastNoiseLite(seed.nextInt());
        this.kind.SetFrequency(0.0008);
        // overall - OverAllGeneration
        this.overall = new FastNoiseLite(seed.nextInt());
        this.overall.SetFrequency(0.02);
        // deep - Flat/Peaky
        this.deep = new FastNoiseLite(seed.nextInt());
        this.deep.SetFrequency(0.0004);
        // trees
        this.trees = new FastNoiseLite(seed.nextInt());
        this.trees.SetFrequency(0.003);
        // temp
        this.temp = new FastNoiseLite(seed.nextInt());
        this.temp.SetFrequency(biomeFactor * 0.5);
        // temp
        this.humi = new FastNoiseLite(seed.nextInt());
        this.humi.SetFrequency(biomeFactor * 0.75);
    }
    getStats(x: number, z: number){
        const {temp, humi} = this;
        const temperature = (temp.GetNoise(x, z)+1)/2;
        const humidity = (humi.GetNoise(x, z)+1)/2;
        const biome = this.getBiome(temperature, humidity);

        const noiseColumn = new Array(33);
        this.warper.fillNoiseColumn(
            noiseColumn, x, z, this.seaLevel, 0, 32,
            (bx, bz) => {
                const bt = (temp.GetNoise(bx, bz)+1)/2;
                const bh = (humi.GetNoise(bx, bz)+1)/2;
                return this.getBiome(bt, bh).depth;
            },
            (bx, bz) => {
                const bt = (temp.GetNoise(bx, bz)+1)/2;
                const bh = (humi.GetNoise(bx, bz)+1)/2;
                return this.getBiome(bt, bh).scale;
            }
        );

        let densityHeight = 0;
        for (let i = 32; i >= 0; i--) {
            if (noiseColumn[i] > 0) {
                densityHeight = i / 3.2; // Match the scaling used in the original generator
                break;
            }
        }

        return {
            temperature, humidity,
            height: densityHeight
        };
    }
    buildChunk(X: number, Z: number, hash: string){
        if(this.isGenerating.has(hash)) return Promise.resolve();
        if(this.isGenerated(hash)) return Promise.resolve();
        const task = new Promise<void>((r,j)=>(system as any).runJob(this.generate(X,Z,r,j)));
        this.isGenerating.add(hash);
        task.then(()=>this.setGenerated(hash))
        .catch(e=>console.error(e, e.stack))
        .finally(()=>this.isGenerating.delete(hash));
        return task;
    }
    isGenerated(hash: string){  return this.manager.isGenerated(hash + this.dimensionId); }
    setGenerated(hash: string){ this.manager.setGenerated(hash + this.dimensionId); }
    *generate(X: number, Z: number, res: () => void, rej: (reason: any) => void){
        const {seaLevel, entry, dimension: d} = this;
        const mainPalette = new PalettedPlacer();
        const secondPalette = new PalettedPlacer();
        let errorCount = 0;
        try {
            let theLowest = Infinity;
            let concepts: ConceptBlock[] = [];
            const stats: any[] = [];
            const random = this.seed.getSeqence(X, Z);
            const postProccess: VegetationProcess[] = [];
            const trees: TreeProcess[] = [];
            X = X*16, Z = Z*16;
            /// FIRST LAYER CALCULATION
            for (let x = 0; x < 16; x++){
                for (let z = 0; z < 16; z++) {
                    const xx = X + x, zz = Z + z;
                    const index = x*16 + z;
                    const index2 = x*16 + (z>14?256+z:z+1);

                    const currentStats = stats[index]??(stats[index] = this.getStats(xx, zz));
                    let terrain = currentStats.height * 10;
                    let terrain2 = (stats[index2]??(stats[index2] = this.getStats(xx, zz + 1))).height * 10;
                    let terrain3 = (stats[index + 16]??(stats[index + 16] = this.getStats(xx + 1, zz))).height * 10;

                    const biomeData = this.getBiome(currentStats.temperature, currentStats.humidity);
                    const {
                        groundPaletted, 
                        underGroundPaletted, 
                        vegetationPalette,
                        vegetationChance,
                        trees:treePalete,
                        hasTrees,
                        treesChance,
                        treeAreaChance,
                        vegetationValidation
                    } = biomeData;

                    let sklon = Math.sqrt((terrain - terrain2)**2 + (terrain - terrain3)**2);
                    terrain += entry;
                    const underSeaLevel = terrain < seaLevel;
                    if(theLowest>terrain) theLowest = terrain;
                    
                    const pos = { x: xx, y: terrain, z: zz };
                    
                    if(underSeaLevel) {
                        mainPalette.setBlock(pos, underGroundPaletted.toPermutation(random.nextFloat()));
                        concepts[index] = { ...pos, underGroundPaletted };
                    }
                    else if(sklon*(random.nextFloat()*0.4 + 0.6) > 1.5){
                        mainPalette.setBlock(pos, underGroundPaletted.toPermutation(random.nextFloat()));
                        concepts[index] = { ...pos, underGroundPaletted };
                    }
                    else{
                        if(random.nextFloat() < vegetationChance) postProccess.push({x:xx, y: terrain + 1, z:zz, vegetationPalette, vegetationValidation});
                        if(
                            random.nextFloat() < treesChance && 
                            easeOutQuad((this.trees.GetNoise(xx, zz) + 1)/2) < treeAreaChance
                            && hasTrees) trees.push({x:xx, y: terrain + 1, z:zz, treePalete, dimension:d});
                        
                        mainPalette.setBlock(pos, groundPaletted.toPermutation(random.nextFloat()));
                        concepts[index] = { ...pos, underGroundPaletted };
                    }
                }
                yield;
            }

            /// PROCESSING UNDER LAYER RE-FILL
            for(const concept of concepts){
                if (!concept) continue;
                for(let i = theLowest - 1; i < concept.y; i++) {
                    secondPalette.setBlock({x: concept.x, y: i, z: concept.z}, concept.underGroundPaletted.toPermutation(random.nextFloat()));
                }
                yield;
            }
            yield * secondPalette.flush(d, {ignoreChunkBoundErrors: true, blockFilter:{includePermutations:[air as any]}});
            yield * mainPalette.flush(d, {ignoreChunkBoundErrors: true});
            yield;

            ///
            if(this.manager.definition.IsPrecalculated){
                for(let loc of trees) {
                    const treedDef = loc.treePalete.get(random.nextFloat());
                    const offSetCalculator = (v: Vector3) => Vec3.add(loc, v);
                    if(treedDef.canPlaceValidator(loc)) {
                        const sample = treedDef.getCompiledSample(random.nextFloat());
                        for(const [permutation, list] of sample){
                            const locations = mainPalette.getPaletteLocations(permutation);
                            mainPalette.setPaletteLocations(permutation, locations.concat(list.map(offSetCalculator)))
                        }
                        yield;
                    }
                }
            }else{
                for(const loc of trees) {
                    const treedDef = loc.treePalete.get(random.nextFloat());
                    if(treedDef.canPlaceValidator(loc)) yield * treedDef.place(loc, random, mainPalette);
                }
            }          
            yield;
            
            for(const loc of postProccess){
                const p = loc.vegetationPalette.toPermutation(random.nextFloat());
                const block = d.getBlock(loc);
                if(block === undefined) errorCount++;
                else if(block?.canPlace(p)) mainPalette.setBlock(loc, p);
                yield;
            }
            yield * mainPalette.flush(d, {ignoreChunkBoundErrors: true, blockFilter:{includePermutations:[air as any]}});

            //Sea level filler
            while(theLowest > this.range.min){
                const distance = Math.min(16, theLowest - this.range.min);
                d.fillBlocks(new BlockVolume({x:X, y:theLowest, z:Z},{x:X + 15, y: theLowest-= distance, z:Z + 15}), "stone", {
                    blockFilter:{
                        includePermutations:[air as any],
                        includeTags:["water"],
                    },
                    ignoreChunkBoundErrors:true
                });
                yield;
            }            
            /// CHUNK FINIALIZER
            if(theLowest < seaLevel){
                d.fillBlocks(new BlockVolume({x:X, y:seaLevel, z:Z},{x:X + 15, y:theLowest, z:Z + 15}), water as any, {
                    blockFilter:{
                        includePermutations:[air as any],
                        includeTags:["water"],
                    },
                    ignoreChunkBoundErrors:true
                });
            }
            if(errorCount) console.warn("Failing to get blocks, error count: " + errorCount + ". Try increasing your simulation distance, or lower the generation distance in settings.");
            res();
        } catch (error) {
            rej(error);
        }
    }
    getBiome(temp: number, humi: number){ return this.manager.getBiome(temp, humi); }
    getHeight(x: number, z: number){ return Math.max(this.getStats(x, z).height * 10 + this.entry, this.seaLevel + 1); }
}
