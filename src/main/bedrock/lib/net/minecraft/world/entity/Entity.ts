import { Entity as VanillaEntity } from "@minecraft/server";
import { Vec3 } from "../phys/Vec3.js";
import { EntityDimensions } from "./EntityDimensions.js";

export enum RemovalReason {
    KILLED, DISCARDED, UNLOADED_TO_CHUNK, UNLOADED_WITH_PLAYER, CHANGED_DIMENSION
}

export enum Pose {
    STANDING, FALL_FLYING, SLEEPING, SWIMMING, SPIN_ATTACK, CROUCHING, LONG_JUMPING, DYING, CROAKING, USING_TONGUE, SITTING, ROARING, SNIFFING, EMERGING, DIGGING, SLIDING, SHOOTING, INHALING
}

export abstract class Entity {
    protected readonly entity: VanillaEntity;
    public tickCount: number = 0;
    public yRotO: number = 0;
    public xRotO: number = 0;
    protected dimensions: EntityDimensions = EntityDimensions.fixed(1, 1);

    constructor(entity: VanillaEntity) {
        if (entity && typeof entity === 'object') {
            this.entity = new Proxy(entity, {
                get(target, prop, receiver) {
                    // Check validity for ALL access (properties and methods)
                    if (prop !== 'isValid' && !(target as any).isValid) {
                        return undefined;
                    }

                    const value = Reflect.get(target, prop, receiver);
                    
                    if (typeof value === 'function') {
                        return (...args: any[]) => {
                            if ((target as any).isValid) {
                                return value.apply(target, args);
                            }
                            return undefined;
                        };
                    }
                    return value;
                }
            });
        } else {
            this.entity = entity;
        }
    }

    public getX(): number { 
        return (this.entity as any)?.location?.x ?? 0;
    }
    public getY(): number { 
        return (this.entity as any)?.location?.y ?? 0;
    }
    public getZ(): number { 
        return (this.entity as any)?.location?.z ?? 0;
    }

    public position(): Vec3 {
        return new Vec3(this.getX(), this.getY(), this.getZ());
    }

    public setPos(x: number, y: number, z: number): void {
        if (this.entity && (this.entity as any).isValid) {
            this.entity.teleport({ x, y, z });
        }
    }

    public getYRot(): number {
        return (this.entity as any)?.getRotation?.()?.y ?? 0;
    }

    public getXRot(): number {
        return (this.entity as any)?.getRotation?.()?.x ?? 0;
    }

    public setYRot(yaw: number): void {
        if (this.entity && (this.entity as any).isValid) {
            const rot = (this.entity as any).getRotation();
            this.entity.setRotation({ x: rot.x, y: yaw });
        }
    }

    public setXRot(pitch: number): void {
        if (this.entity && (this.entity as any).isValid) {
            const rot = (this.entity as any).getRotation();
            this.entity.setRotation({ x: pitch, y: rot.y });
        }
    }

    public setRot(yaw: number, pitch: number): void {
        if (this.entity && (this.entity as any).isValid) {
            this.entity.setRotation({ x: pitch, y: yaw });
        }
    }

    public moveTo(x: number, y: number, z: number): void {
        this.setPos(x, y, z);
    }

    public remove(reason: RemovalReason): void {
        if (this.entity && (this.entity as any).isValid) {
            this.entity.remove();
        }
    }

    public isRemoved(): boolean {
        return !this.entity || !(this.entity as any).isValid;
    }

    public isInvisible(): boolean {
        return false;
    }

    public setInvisible(invisible: boolean): void {
    }

    public getId(): string {
        return this.entity?.id ?? "";
    }

    public getDimensions(pose: Pose): EntityDimensions {
        return this.dimensions;
    }

    public refreshDimensions(): void {
    }

    public isCurrentlyGlowing(): boolean {
        return false;
    }

    public isPickable(): boolean {
        return true;
    }
}
