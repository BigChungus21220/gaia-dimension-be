import { Entity as VanillaEntity } from "@minecraft/server";
import { LivingEntity } from "../../LivingEntity.js";

export class LookControl {
    private readonly entity: VanillaEntity;

    constructor(entity: VanillaEntity) {
        this.entity = entity;
    }

    public setLookAt(target: LivingEntity | null, yaw: number, pitch: number): void {
        // Native lookAt implementation
    }
}
