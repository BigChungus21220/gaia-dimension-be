import { IStaffComponent, StaffStats } from "../types";

export class StaffCore implements IStaffComponent {
    static readonly ELECTRIC = new StaffCore("electric", "Electric", "core/electric.png", { damage: 12 });
    static readonly ENERGY = new StaffCore("energy", "Energy", "core/energy.png", { damage: 10 });
    static readonly FIRE = new StaffCore("fire", "Fire", "core/fire.png", { damage: 14 });
    static readonly FROST = new StaffCore("frost", "Frost", "core/frost.png", { damage: 10 });
    static readonly MAGIC = new StaffCore("magic", "Magic", "core/magic.png", { damage: 11 });
    static readonly PHYSICAL = new StaffCore("physical", "Physical", "core/physical.png", { damage: 15 });
    static readonly POISON = new StaffCore("poison", "Poison", "core/poison.png", { damage: 9 });

    private constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly texturePath: string,
        public readonly stats: StaffStats
    ) {}
}
