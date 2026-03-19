export interface StaffStats {
    damage?: number;
    cooldown?: number;
    speed?: number;
    projectile?: string;
    description?: string;
}

export interface IStaffComponent {
    id: string;
    name: string;
    texturePath: string;
    stats?: StaffStats;
}
