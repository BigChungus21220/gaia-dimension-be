import { Entity as VanillaEntity, world } from "@minecraft/server";
import { LivingEntity } from "./LivingEntity.js";
import { MoveControl } from "./ai/control/MoveControl.js";
import { GoalSelector } from "./ai/goal/GoalSelector.js";
import { PartEntity } from "../../../neoforged/neoforge/entity/PartEntity.js";
import { MultipartEntityUtil } from "../../../../MultipartEntityUtil.js";
import { RemovalReason } from "./Entity.js";

export abstract class Mob extends LivingEntity {
    protected moveControl: MoveControl;
    public readonly goalSelector: GoalSelector = new GoalSelector();
    public readonly targetSelector: GoalSelector = new GoalSelector();
    private _partsInitialized: boolean = false;

    constructor(entity: VanillaEntity) {
        super(entity);
        this.moveControl = new MoveControl(this);
        this.registerGoals();
    }

    protected registerGoals(): void {
    }

    public tick(): void {
        if (!this._partsInitialized) {
            if (this.isMultipartEntity()) {
                MultipartEntityUtil.initializeParts(this, this.getPartsTypeID());
            }
            this._partsInitialized = true;
        }
        this.goalSelector.tick();
        this.targetSelector.tick();
    }

    public isMultipartEntity(): boolean {
        return false;
    }

    public getParts(): PartEntity<any>[] {
        return [];
    }

    protected getPartsTypeID(): string {
        return "";
    }

    public getMoveControl(): MoveControl {
        return this.moveControl;
    }
}
