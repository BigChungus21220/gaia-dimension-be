import { 
    BlockCustomComponent, 
    BlockComponentRandomTickEvent, 
    BlockComponentPlayerDestroyEvent, 
    BlockComponentPlaceEvent,
    world
} from "@minecraft/server";

export const AuraShootComponent: BlockCustomComponent = {
    onRandomTick(event: BlockComponentRandomTickEvent) {
        const { block } = event;
        
        const blockAbove = block.above();
        if (!blockAbove || !blockAbove.isAir) {
            return;
        }

        let currentBlock = block;
        let count = 1;

        // Count connected Aura Shoots downwards
        while (true) {
            const blockBelow = currentBlock.below();
            if (blockBelow && blockBelow.typeId === "gaiadimension:aura_shoot") {
                count++;
                currentBlock = blockBelow;
            } else {
                break;
            }
        }

        if (count < 15) {
            const permutation = block.permutation;
            let age = permutation.getState("gaiadimension:age") as number;

            if (age === 5) {
                blockAbove.setType("gaiadimension:aura_shoot");
                
                // Set the block above to be the new top and calculate its color
                const loc = blockAbove.location;
                const locationColor = (Math.abs(loc.x % 5)) + (Math.abs(loc.z % 5));
                const newPerm = blockAbove.permutation.withState("gaiadimension:is_top", true).withState("gaiadimension:age", 0).withState("gaiadimension:color", locationColor);
                blockAbove.setPermutation(newPerm);

                // Update current block to not be top
                const currentPerm = permutation.withState("gaiadimension:age", 0).withState("gaiadimension:is_top", false);
                block.setPermutation(currentPerm);
            } else {
                // Increment age
                const currentPerm = permutation.withState("gaiadimension:age", age + 1);
                block.setPermutation(currentPerm);
            }
        }
    },
    
    onPlace(event: BlockComponentPlaceEvent) {
        const { block } = event;
        const loc = block.location;
        const locationColor = (Math.abs(loc.x % 5)) + (Math.abs(loc.z % 5));
        
        let isTop = true;
        const blockAbove = block.above();
        if (blockAbove) {
            const isTrunk = blockAbove.typeId.includes("log") || blockAbove.typeId.includes("wood");
            if (blockAbove.typeId === "gaiadimension:aura_shoot" || isTrunk) {
                isTop = false;
            }
        }
        
        block.setPermutation(block.permutation.withState("gaiadimension:color", locationColor).withState("gaiadimension:is_top", isTop));

        const blockBelow = block.below();
        if (blockBelow && blockBelow.typeId === "gaiadimension:aura_shoot") {
            const currentPerm = blockBelow.permutation.withState("gaiadimension:is_top", false);
            blockBelow.setPermutation(currentPerm);
        }
    },

    onPlayerDestroy(event: BlockComponentPlayerDestroyEvent) {
        const { block } = event;
        const blockBelow = block.below();
        if (blockBelow && blockBelow.typeId === "gaiadimension:aura_shoot") {
            const currentPerm = blockBelow.permutation.withState("gaiadimension:is_top", true);
            blockBelow.setPermutation(currentPerm);
        }
    }
};

export function registerAuraShootComponent({ blockComponentRegistry }: { blockComponentRegistry: any }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:aura_shoot", AuraShootComponent);

    // Global listener for when ANY block is placed (like a trunk) on top of an aura shoot
    world.afterEvents.playerPlaceBlock.subscribe((event) => {
        const { block } = event;
        const blockBelow = block.below();
        if (blockBelow && blockBelow.typeId === "gaiadimension:aura_shoot") {
            const isTrunk = block.typeId.includes("log") || block.typeId.includes("wood");
            if (block.typeId === "gaiadimension:aura_shoot" || isTrunk) {
                const currentPerm = blockBelow.permutation.withState("gaiadimension:is_top", false);
                blockBelow.setPermutation(currentPerm);
            }
        }
    });

    // Global listener for when ANY block is broken (like a trunk) above an aura shoot
    world.afterEvents.playerBreakBlock.subscribe((event) => {
        const { block } = event; // This is now AIR
        const blockBelow = block.below();
        if (blockBelow && blockBelow.typeId === "gaiadimension:aura_shoot") {
            // Re-evaluate if there's anything else above it somehow, but usually it's just air now
            const blockAbove = blockBelow.above();
            let isTop = true;
            if (blockAbove) {
                const isTrunk = blockAbove.typeId.includes("log") || blockAbove.typeId.includes("wood");
                if (blockAbove.typeId === "gaiadimension:aura_shoot" || isTrunk) {
                    isTop = false;
                }
            }
            if (isTop) {
                const currentPerm = blockBelow.permutation.withState("gaiadimension:is_top", true);
                blockBelow.setPermutation(currentPerm);
            }
        }
    });
}
