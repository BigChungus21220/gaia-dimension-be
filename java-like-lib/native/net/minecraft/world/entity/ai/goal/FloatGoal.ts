import { Goal } from "./Goal.js";
import { Mob } from "../../Mob.js";

export class FloatGoal extends Goal {
    private readonly mob: Mob;

    constructor(mob: Mob) {
        super();
        this.mob = mob;
    }

    public canUse(): boolean {
        return false; // Handled natively
    }

    public getNativeConfig(): any {
        return {
            "minecraft:behavior.float": {
                priority: 1
            }
        };
    }
}
