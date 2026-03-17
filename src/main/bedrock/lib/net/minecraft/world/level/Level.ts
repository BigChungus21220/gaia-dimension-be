import { Dimension, Vector3, world, Entity as VanillaEntity } from "@minecraft/server";
import { BlockPos } from "../../core/BlockPos.js";

export class Level {
    private readonly dimension: Dimension;

    constructor(dimension: Dimension) {
        this.dimension = dimension;
    }

    /**
     * Projects-wide wrapper for spawning entities.
     * Handles the "jank" of multipart spawners by redirecting base names to _head variants.
     */
    public static spawnEntity(dimension: Dimension, typeId: string, location: Vector3): VanillaEntity {
        const [namespace, name] = typeId.split(":");
        
        // Multipart Hand-off: If this is a base entity name (no suffix), attempt to redirect to _head
        if (namespace && name && !name.endsWith("_head") && !name.endsWith("_segment")) {
            const headId = `${namespace}:${name}_head`;
            try {
                // Attempt to spawn the multipart head variant
                return dimension.spawnEntity(headId, location);
            } catch (e) {
                // Fallback to original type if no head variant exists in the behavior pack
            }
        }

        return dimension.spawnEntity(typeId, location);
    }

    public isClientSide(): boolean {
        return false; 
    }

    public getDifficulty(): any {
        return {
            getId: () => 2 
        };
    }

    public addParticle(type: any, x: number, y: number, z: number, dx: number, dy: number, dz: number): void {
    }

    public playSound(player: any, pos: BlockPos, sound: any, source: any, volume: number, pitch: number): void {
        this.dimension.playSound(sound, { x: pos.x, y: pos.y, z: pos.z }, { volume, pitch });
    }
}
