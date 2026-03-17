import { IStaffComponent, StaffStats } from "../types";

export class StaffRod implements IStaffComponent {
    static readonly FORCE = new StaffRod("force", "Force", "rod/force.png", { damage: 2, cooldown: 1.2 });
    static readonly POWER = new StaffRod("power", "Power", "rod/power.png", { damage: 4, cooldown: 1.5 });
    static readonly RECHARGE = new StaffRod("recharge", "Recharge", "rod/recharge.png", { cooldown: 0.8 });
    static readonly SPEED = new StaffRod("speed", "Speed", "rod/speed.png", { speed: 1.2, cooldown: 0.9 });
    static readonly STANDARD = new StaffRod("standard", "Standard", "rod/standard.png", { cooldown: 1.0 });
    static readonly SUSTAIN = new StaffRod("sustain", "Sustain", "rod/sustain.png", { cooldown: 1.1 });

    private constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly texturePath: string,
        public readonly stats: StaffStats
    ) {}
}
