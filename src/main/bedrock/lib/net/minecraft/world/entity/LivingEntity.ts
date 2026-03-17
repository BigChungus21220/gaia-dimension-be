import { Entity as VanillaEntity, world } from "@minecraft/server";
import { Vec3 } from "../phys/Vec3.js";
import { Entity } from "./Entity.js";
import { Navigation } from "./ai/Navigation.js";
import { LookControl } from "./ai/control/LookControl.js";

export abstract class LivingEntity extends Entity {
    protected navigation: Navigation;
    protected lookControl: LookControl;

    constructor(entity: VanillaEntity) {
        super(entity);
        this.navigation = new Navigation(entity);
        this.lookControl = new LookControl(entity);
    }

    public getHealth(): number {
        const health = this.entity ? this.entity.getComponent("minecraft:health") : null;
        return health ? (health as any).currentValue : 0;
    }

    public setHealth(value: number): void {
        const health = this.entity ? this.entity.getComponent("minecraft:health") : null;
        if (health) {
            (health as any).setCurrentValue(value);
        }
    }

    public getMaxHealth(): number {
        const health = this.entity ? this.entity.getComponent("minecraft:health") : null;
        return health ? (health as any).effectiveMax : 0;
    }

    public getTarget(): LivingEntity | null {
        return null;
    }

    public getNavigation(): Navigation {
        return this.navigation;
    }

    public getLookControl(): LookControl {
        return this.lookControl;
    }

    public abstract tick(): void;

    /**
     * Java-style hurt method.
     */
    public hurtServer(level: any, src: any, amount: number): boolean {
        if (this.entity && (this.entity as any).isValid) {
            this.entity.applyDamage(amount);
            return true;
        }
        return false;
    }

    public getRandom(): any {
        return {
            nextInt: (max: number) => Math.floor(Math.random() * max),
            nextFloat: () => Math.random(),
            nextGaussian: () => 0
        };
    }

    public playSound(soundId: string, volume: number = 1, pitch: number = 1) {
        const loc = (this.entity as any)?.location;
        if (loc) {
            // Standard 3-arg signature to match @minecraft/server types
            this.entity.dimension.playSound(soundId, loc, { volume, pitch });
        }
    }
}
