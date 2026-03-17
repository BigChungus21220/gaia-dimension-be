import { StaffCore } from "./components/StaffCore";
import { StaffHead } from "./components/StaffHead";
import { StaffRod } from "./components/StaffRod";

export class MagicStaffRegistry {
    static readonly CORES: StaffCore[] = [
        StaffCore.ELECTRIC,
        StaffCore.ENERGY,
        StaffCore.FIRE,
        StaffCore.FROST,
        StaffCore.MAGIC,
        StaffCore.PHYSICAL,
        StaffCore.POISON
    ];

    static readonly HEADS: StaffHead[] = [
        StaffHead.BASIC,
        StaffHead.BLAST,
        StaffHead.BURST,
        StaffHead.LINGER,
        StaffHead.RICOCHET,
        StaffHead.SCATTER
    ];

    static readonly RODS: StaffRod[] = [
        StaffRod.FORCE,
        StaffRod.POWER,
        StaffRod.RECHARGE,
        StaffRod.SPEED,
        StaffRod.STANDARD,
        StaffRod.SUSTAIN
    ];
}
