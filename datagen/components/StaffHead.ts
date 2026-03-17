import { IStaffComponent, StaffStats } from "../types";

export class StaffHead implements IStaffComponent {
    static readonly BASIC = new StaffHead("basic", "Basic", "head/basic.png", { projectile: "basic" });
    static readonly BLAST = new StaffHead("blast", "Blast", "head/blast.png", { projectile: "blast" });
    static readonly BURST = new StaffHead("burst", "Burst", "head/burst.png", { projectile: "burst" });
    static readonly LINGER = new StaffHead("linger", "Linger", "head/linger.png", { projectile: "linger" });
    static readonly RICOCHET = new StaffHead("ricochet", "Ricochet", "head/ricochet.png", { projectile: "ricochet" });
    static readonly SCATTER = new StaffHead("scatter", "Scatter", "head/scatter.png", { projectile: "scatter" });

    private constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly texturePath: string,
        public readonly stats: StaffStats
    ) {}
}
