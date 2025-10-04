# Refactor Plan v2: The Unified Component Model

This document outlines a new, more efficient strategy for handling custom block logic by consolidating all interaction logic into a single, universal custom component. This approach is significantly more performant and maintainable than the previous methods.

## The Core Problem (Recap)

The old system was highly inefficient for two main reasons:
1.  **Fake Block Entities:** It used helper entities to store block data, which is resource-intensive.
2.  **Massive Component Registration:** It subscribed to the world initialization event for every single block type, creating dozens of redundant event listeners.

## The Solution: A Single, Unified Component

We will create **one single custom component** called `gaia:interaction_handler`. This component will be attached to *all* custom blocks (slabs, logs, etc.) in their JSON behavior files.

The component's code will act as a "router." When a player interacts with a block, the component will check the block's ID (`block.typeId`) and run the specific logic for that block type (e.g., if it's a log, run the stripping logic; if it's a slab, run the combining logic).

---

## Step-by-Step Implementation Guide

### Step 1: Create the Unified Component File

First, delete the old, inefficient files:
- `GaiaDimensions_BP/scripts/blocks/ModSlabs.js`
- `GaiaDimensions_BP/scripts/blocks/ModLogs.js`
- `GaiaDimensions_BP/scripts/registration/ModBlocks.js`

Now, create a new file at `GaiaDimensions_BP/scripts/registration/unifiedComponent.js` and paste the following code into it. This file will contain all the logic for all your custom blocks.

```javascript
import { system, ItemStack, BlockPermutation } from '@minecraft/server';

// --- Define the logic for each block type in its own function ---

/**
 * Handles the interaction logic for all custom log blocks.
 * @param {import('@minecraft/server').BlockPlayerInteractEvent} event
 */
function handleLogInteraction(event) {
    const { block, player } = event;
    const equipment = player.getComponent('equippable');
    const selectedItem = equipment.getEquipment('Mainhand');

    // Check if the player is using an axe
    if (!selectedItem?.hasTag('minecraft:is_axe')) return;

    const strippedLogId = block.typeId.replace(':', ':stripped_');
    const blockState = block.permutation.getState("minecraft:block_face");

    try {
        const strippedLogPermutation = BlockPermutation.resolve(strippedLogId, { "minecraft:block_face": blockState });
        block.setPermutation(strippedLogPermutation);
        player.playSound('step.wood', { location: block.location });
    } catch (e) {
        console.error(`Failed to find stripped log permutation for ${block.typeId}. Ensure ${strippedLogId} exists.`);
    }
}

/**
 * Handles the interaction logic for all custom slab blocks.
 * @param {import('@minecraft/server').BlockPlayerInteractEvent} event
 */
function handleSlabInteraction(event) {
    const { block, player, face } = event;
    const equipment = player.getComponent('equippable');
    const selectedItem = equipment.getEquipment('Mainhand');

    // Check if player is using the same slab type on the block
    if (selectedItem?.typeId !== block.typeId) return;
    
    // Check if the slab is already a double slab
    if (block.permutation.getState(`kai:double`)) return;

    const verticalHalf = block.permutation.getState('minecraft:vertical_half');
    const isBottomUp = verticalHalf === 'bottom' && face === 'Up';
    const isTopDown = verticalHalf === 'top' && face === 'Down';

    if (isBottomUp || isTopDown) {
        if (player.gameMode !== "creative") {
            selectedItem.amount -= 1;
            equipment.setEquipment('Mainhand', selectedItem.amount === 0 ? undefined : selectedItem);
        }
        // The 'kai:double' state seems to be custom. Ensure it exists on your blocks.
        block.setPermutation(block.permutation.withState(`kai:double`, true));
        block.setWaterlogged(false);
        player.playSound('use.stone', { location: block.location });
    }
}

// --- The single component that routes logic based on block type ---

const unifiedInteractionHandler = {
    onPlayerInteract(event) {
        const { block } = event;

        // ** LOGIC ROUTER **
        // Check the block's ID and call the appropriate handler.
        if (block.typeId.includes('_log')) {
            handleLogInteraction(event);
        } else if (block.typeId.includes('_slab')) {
            handleSlabInteraction(event);
        }
        // Add more 'else if' conditions here for other block types like stairs, fences, etc.
    },

    onPlayerDestroy(event) {
        const { block, player, destroyedBlockPermutation } = event;

        // Handle custom drops for slabs
        if (destroyedBlockPermutation.type.id.includes('_slab')) {
            if (!player || !player.isValid()) return;
            const equippable = player.getComponent('equippable');
            if (!equippable) return;

            const selectedItem = equippable.getEquipment('Mainhand');
            const isPickaxe = selectedItem?.hasTag('minecraft:is_pickaxe');

            if (isPickaxe) {
                const slabItem = new ItemStack(destroyedBlockPermutation.type.id, 1);
                block.dimension.spawnItem(slabItem, block.location);
            }
        }
    }
};


// --- Subscribe ONCE to the startup event to register our single component ---

system.beforeEvents.startup.subscribe(event => {
    event.worldBuilder.registerBlockComponent('gaia:interaction_handler', unifiedInteractionHandler);
});

```

### Step 2: Update the Main Script File

Your main script file (`GaiaDimensions_BP/scripts/main.v2.js`) now only needs to import the new unified component file. All other registrations are obsolete.

```javascript
// In main.v2.js
import { system } from "@minecraft/server";

// Import the single file that handles all component registrations
import "./registration/unifiedComponent.js";

// Import other necessary scripts
import "./GaiaDimensionMod.js";
// ... other imports ...

system.beforeEvents.startup.subscribe(() => {
    console.log("Gaia Dimension scripts loaded with Unified Component Model.");
});
```

### Step 3: Modify Block Behavior JSON files (Crucial!)

This is the most important step. You must go into the behavior pack JSON file for **every single custom log and slab** and tell it to use the new `gaia:interaction_handler` component.

**Example for a slab (`jade_brick_slab.json`):**

*   **BEFORE:**
    ```json
    {
      "format_version": "1.19.50",
      "minecraft:block": {
        "description": {
          "identifier": "gaiadimension:jade_brick_slab"
        },
        "components": {
          "gaiadimension:jade_brick_slab": {} // <-- OLD, SPECIFIC COMPONENT
        }
      }
    }
    ```

*   **AFTER:**
    ```json
    {
      "format_version": "1.19.50",
      "minecraft:block": {
        "description": {
          "identifier": "gaiadimension:jade_brick_slab"
        },
        "components": {
          "gaiadimension:interaction_handler": {} // <-- NEW, UNIFIED COMPONENT
        }
      }
    }
    ```

You must repeat this change for all log and slab JSON files.

### Step 4: Clean Up Old Code

Ensure you have deleted the following files, as they are now completely replaced by `unifiedComponent.js`:
- `GaiaDimensions_BP/scripts/blocks/ModSlabs.js`
- `GaiaDimensions_BP/scripts/blocks/ModLogs.js`
- `GaiaDimensions_BP/scripts/registration/ModBlocks.js`

---

## Benefits of This New Approach

1.  **Massively Improved Performance:** The game now only loads and manages ONE custom component for all your blocks, instead of dozens. This will significantly speed up world load times.
2.  **Easier Maintenance:** All interaction logic is in one place. If you want to change how all slabs behave, you only need to edit `handleSlabInteraction` in one file.
3.  **Scalability:** Adding a new type of block (e.g., custom stairs) is easy. You just create a `handleStairsInteraction` function and add another `else if` to the router.
4.  **Modern and Future-Proof:** This method uses the latest, most efficient patterns recommended by Mojang.
