import { 
    world, 
    system, 
    Block, 
    BlockPermutation, 
    Entity, 
    Dimension, 
    Vector3, 
    EquipmentSlot, 
    Player, 
    ItemUseOnBeforeEvent,
    ItemStack,
    EntityEquippableComponent
} from "@minecraft/server";

interface ContraptionChild {
    entity: Entity;
    relPos: Vector3;
}

interface Contraption {
    parent: Entity;
    children: ContraptionChild[];
    velocity: Vector3;
}

const activeContraptions = new Map<string, Contraption>();

world.beforeEvents.itemUseOn.subscribe((event: ItemUseOnBeforeEvent) => {
    const { itemStack, source: player, blockLocation } = event;
    if (!itemStack || itemStack.typeId !== "minecraft:stick") return;

    // Use system.run to handle world mutations outside of beforeEvent
    system.run(() => {
        if (player.isSneaking) {
            // Launch: find nearby contraptions to the interaction point
            for (const [id, contraption] of activeContraptions) {
                if (!contraption.parent.isValid) {
                    activeContraptions.delete(id);
                    continue;
                }
                const dist = Math.sqrt(
                    Math.pow(contraption.parent.location.x - blockLocation.x, 2) +
                    Math.pow(contraption.parent.location.y - blockLocation.y, 2) +
                    Math.pow(contraption.parent.location.z - blockLocation.z, 2)
                );
                if (dist < 8) {
                    const view = player.getViewDirection();
                    contraption.velocity = { x: view.x * 0.5, y: view.y * 0.5, z: view.z * 0.5 };
                }
            }
        } else {
            // Capture: Scan 5x5x5 around the target block
            const dimension = player.dimension;
            const center = { x: blockLocation.x, y: blockLocation.y, z: blockLocation.z };
            const parent = dimension.spawnEntity("gaiadimension:contraption", center);
            const children: ContraptionChild[] = [];

            for (let x = -2; x <= 2; x++) {
                for (let y = -2; y <= 2; y++) {
                    for (let z = -2; z <= 2; z++) {
                        const loc = { x: center.x + x, y: center.y + y, z: center.z + z };
                        const b = dimension.getBlock(loc);
                        if (!b || b.isAir || b.isLiquid) continue;

                        const typeId = b.typeId;
                        // Spawn block display entity at block location (centered)
                        const child = dimension.spawnEntity("gaiadimension:contraption", { 
                            x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5 
                        });
                        
                        const equippable = child.getComponent("minecraft:equippable") as EntityEquippableComponent;
                        if (equippable) {
                            equippable.setEquipment(EquipmentSlot.Mainhand, new ItemStack(typeId, 1));
                        }

                        const relPos = { x: loc.x - center.x, y: loc.y - center.y, z: loc.z - center.z };
                        child.setDynamicProperty("relPos", JSON.stringify(relPos));
                        
                        children.push({ entity: child, relPos });
                        dimension.getBlock(loc).setPermutation(BlockPermutation.resolve("minecraft:air"));
                    }
                }
            }

            if (children.length > 0) {
                activeContraptions.set(parent.id, { parent, children, velocity: { x: 0, y: 0, z: 0 } });
            } else {
                parent.remove();
            }
        }
    });
});

system.runInterval(() => {
    for (const [id, contraption] of activeContraptions) {
        if (!contraption.parent.isValid) {
            activeContraptions.delete(id);
            continue;
        }

        const { parent, children, velocity } = contraption;
        
        // Apply Gravity
        velocity.y -= 0.04;
        
        // Drag
        velocity.x *= 0.98;
        velocity.y *= 0.98;
        velocity.z *= 0.98;

        const nextLoc = {
            x: parent.location.x + velocity.x,
            y: parent.location.y + velocity.y,
            z: parent.location.z + velocity.z
        };

        // Simple floor collision
        if (nextLoc.y < -64) {
            nextLoc.y = -64;
            velocity.y = 0;
        }

        parent.teleport(nextLoc);

        // Update children positions relative to parent
        for (const child of children) {
            if (child.entity.isValid) {
                child.entity.teleport({
                    x: nextLoc.x + child.relPos.x + 0.5,
                    y: nextLoc.y + child.relPos.y,
                    z: nextLoc.z + child.relPos.z + 0.5
                });
            }
        }
    }
}, 1);
