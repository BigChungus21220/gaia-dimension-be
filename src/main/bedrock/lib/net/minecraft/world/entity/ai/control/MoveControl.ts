import { Entity as VanillaEntity } from "@minecraft/server";
import { Mob } from "../../Mob.js";

export class MoveControl {
    protected readonly mob: Mob;
    protected wantedX: number = 0;
    protected wantedY: number = 0;
    protected wantedZ: number = 0;
    protected speedModifier: number = 0;
    protected operation: Operation = Operation.WAIT;

    constructor(mob: Mob) {
        this.mob = mob;
    }

    public setWantedPosition(x: number, y: number, z: number, speed: number): void {
        this.wantedX = x;
        this.wantedY = y;
        this.wantedZ = z;
        this.speedModifier = speed;
        if (this.operation !== Operation.STRAFE) {
            this.operation = Operation.MOVE_TO;
        }
    }

    public tick(): void {
        if (this.operation === Operation.MOVE_TO) {
            this.operation = Operation.WAIT;
            
            const entity = (this.mob as any).entity as VanillaEntity;
            const dx = this.wantedX - entity.location.x;
            const dy = this.wantedY - entity.location.y;
            const dz = this.wantedZ - entity.location.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist > 0.01) {
                const vx = (dx / dist) * this.speedModifier * 0.5;
                const vy = (dy / dist) * this.speedModifier * 0.5;
                const vz = (dz / dist) * this.speedModifier * 0.5;
                entity.applyImpulse({ x: vx, y: vy, z: vz });
            }
        }
    }
}

export enum Operation {
    WAIT, MOVE_TO, STRAFE, JUMPING
}
