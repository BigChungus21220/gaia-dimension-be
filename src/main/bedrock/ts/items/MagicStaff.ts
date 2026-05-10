import { world, system, Block, BlockPermutation, Entity, Dimension, Player, ItemComponentUseEvent, ItemComponentRegistry, Vector3, EntityProjectileComponent } from "@minecraft/server";
import { ContraptionBody, ContraptionScanner, ContraptionManager } from "../physics/ContraptionPhysics.js";

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

// ── Staff Component Registration ────────────────────────────────────

export function registerMagicStaffComponent({ itemComponentRegistry }: { itemComponentRegistry: ItemComponentRegistry }): void {
    itemComponentRegistry.registerCustomComponent("gaiadimension:magic_staff", {
        onUse: (event: ItemComponentUseEvent) => {
            const { source: player, itemStack } = event;
            if (!(player instanceof Player) || !itemStack) return;

            const idParts = itemStack.typeId.split('_');
            if (idParts.length < 4) return;

            const elementStr = idParts[2];
            const behaviorStr = idParts[3];

            const elementMap: Record<string, Element> = {
                "physical": Element.PHYSICAL,
                "fire": Element.FIRE,
                "electric": Element.ELECTRIC,
                "poison": Element.POISON,
                "frost": Element.FROST,
                "magic": Element.MAGIC,
                "energy": Element.ENERGY
            };

            const behaviorMap: Record<string, Behavior> = {
                "basic": Behavior.BASIC,
                "blast": Behavior.BLAST,
                "burst": Behavior.BURST,
                "linger": Behavior.LINGER,
                "ricochet": Behavior.RICOCHET,
                "scatter": Behavior.SCATTER
            };

            const element = elementMap[elementStr] ?? Element.PHYSICAL;
            const behavior = behaviorMap[behaviorStr] ?? Behavior.BASIC;
            const stat = idParts[4];

            if (stat === 'force') {
                if (player.isSneaking) {
                    handleForceGrab(player);
                    return;
                } else if (ContraptionManager.has(player.id)) {
                    handleForceThrow(player);
                    return;
                }
            }

            const viewDir = player.getViewDirection();
            const spawnLoc: Vector3 = {
                x: player.location.x + viewDir.x * 1.5,
                y: player.getHeadLocation().y + viewDir.y * 1.5,
                z: player.location.z + viewDir.z * 1.5
            };

            if (behavior === Behavior.SCATTER) {
                for (let i = -1; i <= 1; i++) {
                    const angle = i * 0.2;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const scatterDir: Vector3 = {
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

function spawnProjectile(player: Player, location: Vector3, direction: Vector3, element: Element, behavior: Behavior): void {
    const projectile = player.dimension.spawnEntity("gaiadimension:staff_projectile", location);
    projectile.setProperty("gaiadimension:element", element);
    projectile.setProperty("gaiadimension:behavior", behavior);
    const projectileComp = projectile.getComponent("minecraft:projectile") as EntityProjectileComponent;
    if (projectileComp) {
        projectileComp.shoot(direction);
    }
}

// ── Force Grab ──────────────────────────────────────────────────────

function handleForceGrab(player: Player): void {
    if (ContraptionManager.has(player.id)) return;

    // 1) Try to re-grab a nearby thrown/resting contraption
    const nearby = ContraptionManager.findNearby(player.location);
    if (nearby) {
        ContraptionManager.delete(nearby.key);
        nearby.body.hold(player);
        ContraptionManager.register(player.id, nearby.body);
        player.dimension.playSound("random.orb", player.location);
        return;
    }

    // 2) Grab a small cube of blocks around the target
    const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
    if (!blockHit) return;

    const origin = blockHit.block.location;
    const dim = player.dimension;
    const RADIUS = 1; // 3×3×3 cube
    const blocks: Block[] = [];

    for (let dx = -RADIUS; dx <= RADIUS; dx++) {
        for (let dy = -RADIUS; dy <= RADIUS; dy++) {
            for (let dz = -RADIUS; dz <= RADIUS; dz++) {
                const b = dim.getBlock({ x: origin.x + dx, y: origin.y + dy, z: origin.z + dz });
                if (b && ContraptionScanner.isValidBlock(b)) {
                    blocks.push(b);
                }
            }
        }
    }
    if (blocks.length === 0) return;

    const body = ContraptionBody.assemble(
        blocks,
        blockHit.block.location,
        dim
    );
    body.hold(player);

    ContraptionManager.register(player.id, body);
    player.dimension.playSound("random.orb", player.location);
}

// ── Force Throw ─────────────────────────────────────────────────────

function handleForceThrow(player: Player): void {
    const body = ContraptionManager.get(player.id);
    if (!body) return;

    ContraptionManager.delete(player.id);
    body.throw(player.getViewDirection());

    ContraptionManager.register('thrown_' + Date.now(), body);
    player.dimension.playSound("random.explode", player.location, { volume: 0.3 });
}
