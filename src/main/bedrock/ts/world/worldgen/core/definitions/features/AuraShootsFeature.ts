import { BlockPermutation, Dimension } from "@minecraft/server";
import { Feature } from "./Feature";
import { ProceduralRandom } from "../../utils";

export class AuraShootsFeature extends Feature {
    place(
        dim: Dimension, 
        random: ProceduralRandom, 
        worldX: number, 
        worldZ: number, 
        terrainMap: number[], 
        underwaterMap: boolean[]
    ): void {
        for (let i = 0; i < 20; ++i) {
            const centerX = Math.floor(random.nextFloat() * 16);
            const centerZ = Math.floor(random.nextFloat() * 16);
            
            const dx = Math.floor(random.nextFloat() * 4) - Math.floor(random.nextFloat() * 4);
            const dz = Math.floor(random.nextFloat() * 4) - Math.floor(random.nextFloat() * 4);
            
            let localX = centerX + dx;
            let localZ = centerZ + dz;
            
            if (localX < 0 || localX > 15 || localZ < 0 || localZ > 15) {
                continue;
            }

            const tIdx = localX * 16 + localZ;
            if (underwaterMap[tIdx]) continue;
            
            const terrain = terrainMap[tIdx];
            if (terrain === undefined) continue;

            const txx = worldX + localX;
            const tzz = worldZ + localZ;
            const ty = terrain + 1;

            const block = dim.getBlock({ x: txx, y: ty, z: tzz });
            if (block && block.typeId === "minecraft:air") {
                const ground = dim.getBlock({ x: txx, y: terrain, z: tzz });
                if (!ground || (!ground.typeId.includes("soil") && !ground.typeId.includes("grass") && !ground.typeId.includes("mookaite") && !ground.typeId.includes("dirt"))) {
                    continue;
                }

                const height = 7 + Math.floor(random.nextFloat() * 5);
                const color = (Math.abs(txx % 5)) + (Math.abs(tzz % 5));

                for (let k = 0; k < height; ++k) {
                    const currentY = ty + k;
                    const b = dim.getBlock({ x: txx, y: currentY, z: tzz });
                    
                    if (b && (b.typeId === "minecraft:air" || b.typeId.includes("leaves") || b.typeId.includes("grass"))) {
                        const isTop = (k + 1 === height);
                        const perm = BlockPermutation.resolve("gaiadimension:aura_shoot", {
                            "gaiadimension:is_top": isTop,
                            "gaiadimension:color": color,
                            "gaiadimension:age": 0
                        });
                        try {
                            b.setPermutation(perm);
                        } catch (e) {
                            console.warn(`[GaiaDim] Failed to place Aura Shoot at ${txx},${currentY},${tzz}`);
                        }
                    } else {
                        // Blocked by something else
                        break;
                    }
                }
            }
        }
    }
}
