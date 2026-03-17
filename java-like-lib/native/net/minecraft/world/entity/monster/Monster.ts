import { Entity as VanillaEntity } from "@minecraft/server";
import { Mob } from "../Mob.js";

export abstract class Monster extends Mob {
    constructor(entity: VanillaEntity) {
        super(entity);
    }

    public static createMonsterAttributes(): any {
        return {
            add: (attr: any, value?: any) => ({
                add: (attr: any, value?: any) => ({})
            })
        };
    }

    public isDeadOrDying(): boolean {
        return this.getHealth() <= 0;
    }
}
