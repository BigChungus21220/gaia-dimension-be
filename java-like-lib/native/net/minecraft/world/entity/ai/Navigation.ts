import { Entity as VanillaEntity } from "@minecraft/server";
import { Vec3 } from "../../phys/Vec3.js";

export class Navigation {
    private readonly entity: VanillaEntity;

    constructor(entity: VanillaEntity) {
        this.entity = entity;
    }

    public moveTo(x: number, y: number, z: number, speed: number): boolean {
        return true;
    }

    public stop(): void {
        this.entity.clearVelocity();
    }

    public isDone(): boolean {
        return true; // Simplified
    }

    public isStuck(): boolean {
        return false;
    }
}
