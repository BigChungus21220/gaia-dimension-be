import { Player, ItemComponentUseEvent, ItemComponentRegistry } from "@minecraft/server";

export enum Element {
    PHYSICAL = 0,
    FIRE = 1,
    ELECTRIC = 2,
    POISON = 3,
    FROST = 4,
    MAGIC = 5,
    ENERGY = 6
}

export enum Behavior {
    BASIC = 0,
    BLAST = 1,
    BURST = 2,
    LINGER = 3,
    RICOCHET = 4,
    SCATTER = 5
}

export function registerMagicStaffComponent({ itemComponentRegistry }: { itemComponentRegistry: ItemComponentRegistry }): void {
    itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
        onUse: (event: ItemComponentUseEvent) => {
            const { source: player, itemStack } = event;
            if (!(player instanceof Player)) return;

            const idParts = itemStack.typeId.split('_');
            if (idParts.length < 4) return;

            const elementStr = idParts[2];
            const behaviorStr = idParts[3];

            const element = {
                "physical": Element.PHYSICAL,
                "fire": Element.FIRE,
                "electric": Element.ELECTRIC,
                "poison": Element.POISON,
                "frost": Element.FROST,
                "magic": Element.MAGIC,
                "energy": Element.ENERGY
            }[elementStr] ?? Element.PHYSICAL;

            const behavior = {
                "basic": Behavior.BASIC,
                "blast": Behavior.BLAST,
                "burst": Behavior.BURST,
                "linger": Behavior.LINGER,
                "ricochet": Behavior.RICOCHET,
                "scatter": Behavior.SCATTER
            }[behaviorStr] ?? Behavior.BASIC;

            const viewDir = player.getViewDirection();
            const spawnLoc = {
                x: player.location.x + viewDir.x * 1.5,
                y: player.location.y + player.getHeadLocation().y - player.location.y + viewDir.y * 1.5,
                z: player.location.z + viewDir.z * 1.5
            };

            if (behavior === Behavior.SCATTER) {
                for (let i = -1; i <= 1; i++) {
                    const angle = i * 0.2;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const scatterDir = {
                        x: viewDir.x * cos - viewDir.z * sin,
                        y: viewDir.y,
                        z: viewDir.x * sin + viewDir.z * cos
                    };
                    spawnProjectile(player, spawnLoc, scatterDir, element, behavior);
                }
            } else {
                spawnProjectile(player, spawnLoc, viewDir, element, behavior);
            }

            player.dimension.playSound("random.bow", player.location, { pitch: 0.5 });
        }
    });
}

function spawnProjectile(player: Player, location: any, direction: any, element: Element, behavior: Behavior) {
    const projectile = player.dimension.spawnEntity("gaiadimension:staff_projectile", location);
    
    // Use Actor Properties to set element and behavior
    projectile.setProperty("gaiadimension:element", element);
    projectile.setProperty("gaiadimension:behavior", behavior);

    const projectileComp = projectile.getComponent("minecraft:projectile") as any;
    if (projectileComp) {
        projectileComp.shoot(direction);
    }
}
