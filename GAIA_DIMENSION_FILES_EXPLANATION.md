# Gaia Dimension Mod - File Structure and Functionality

## Overview
The Gaia Dimension is a Minecraft Bedrock mod that creates a fake custom dimension by using a specific region within the End dimension. This document explains the various files and their roles in creating this immersive world.

## Project Structure

### Behavior Pack (BP) - GaiaDimensions_BP
The Behavior Pack contains all the logic, features, and world generation definitions.

#### Feature System
- **feature_rules/** - Controls where features are placed in the world
  - `base_chunk.json` - The main feature rule that restricts all Gaia world generation to coordinates X:100k-400k, Z:100k-400k within the End
  - Various placement files (e.g., `agathum_placement.json`, `crystal_placement.json`) - Control where structures appear, all using the same coordinate constraints
  - These files ensure all Gaia features only generate within the designated region

- **features/** - Defines how the world is generated
  - **/conditions** - Biome-specific condition files that determine what blocks to place based on the calculated biome
  - **/gen** - World generation features
    - **/base** - Core generation pipeline (column_placer, column_height, main_sequence)
    - **/gaia_blocks** - Biome-specific blocks (bedrock_*, glitter_grass, soils, etc.)
    - **/structures** - Feature definitions for structures
    - **/caves** - Cave system generation
  - **/decorations, /foliage, /ground_cover** - Additional world features

#### Scripts System
- **scripts/world/** - Core game systems
  - `Gaia.js` - Contains the Gaia dimension definitions and coordinate ranges
  - `GaiaDimension.js` - Class to manage virtual dimension boundaries within the End
  - `Portal.js` - Handles portal creation and linking functionality
  - `Biome.js` - Manages biome detection and changes for players
  - `Fog.js` - Applies biome-specific fog effects
  - `Events.js` - Custom event system for tracking player actions

- **scripts/blocks/** - Custom block component implementations
  - Various block types with custom behaviors (buttons, curtains, fences, etc.)

#### Blocks Directory
- **blocks/** - Block definitions for all Gaia-specific blocks
  - **/bedrock/** - Biome-specific bedrock blocks that identify biomes
  - **/grass, /soils, /stones, /ores** - Various biome-specific terrain blocks
  - **/amethyst, /flower, /logs, /trees** - Biome-specific decorative elements
  - **/fluids/** - Custom fluid blocks (liquid aura, liquid bismuth, etc.)
  - Special functional blocks like `gaia_portal.json` and `gaia_keystone_block.json`

#### Structures Directory
- **structures/** - Minecraft structure files (.mcstructure) containing pre-built buildings and features
  - Various tree structures (blueagate, pinkagate, greenagate, etc.)
  - Crystal growth structures, towers, various plant life
  - Unique biome-specific structures like geysers and agathum formations

### Resource Pack (RP) - GaiaDimension_RP
The Resource Pack contains all the visual and audio assets.

#### Textures
- **textures/terrain_texture.json** - Maps block textures to in-game blocks
- **textures/item_texture.json** - Maps textures for items in inventory
- **textures/flipbook_textures.json** - Defines animated textures (like fluid blocks)

#### Other Resource Files
- **blocks.json** - Maps block IDs to their visual representations
- **manifest.json** - Defines the resource pack metadata
- Various texture files in subdirectories for blocks, items, and other assets

## Key Mechanics

### Fake Dimension Implementation
The mod creates a "fake" dimension by:
1. Restricting all world generation to a specific coordinate range (100k-400k in both X and Z within the End)
2. Implementing biome detection based on block types at Y=0
3. Using JavaScript to determine player location and apply appropriate effects
4. Providing portal functionality to travel to/from the region

### Biome System
- The Gaia dimension has 15 different biomes determined by complex noise algorithms
- Each biome has unique visual blocks (bedrock with different names), grass types, and decorative features
- The biome is determined by examining the block at Y=0 level at a given X,Z coordinate

### World Generation
- Uses Minecraft's feature system with noise functions to generate terrain
- Creates varied landscapes including rivers, mountains, forests, wastelands, and swamps
- Each biome generates with appropriate flora, structures, and terrain features

## Custom Features

### Portal System
- Players can create portals using Keystone Blocks and portal blocks
- Portals allow travel between the Overworld and the Gaia dimension region
- Uses custom block interactions and JavaScript logic

### Fluid Blocks
- Custom fluids like liquid aura and liquid bismuth with animated textures
- Implement physics similar to vanilla water/lava but with unique properties
- Found in the fluids directory with different stages of animation

### Ores and Materials
- Various Gaia-specific ores and materials throughout the dimension
- Different colored opals (green, blue, red, white) and other minerals
- Used for crafting unique tools, blocks, and items

## Summary
The Gaia Dimension mod is a sophisticated implementation that creates an immersive alternative world experience within Minecraft Bedrock by leveraging the game's feature system to generate a custom region within the End dimension, complete with unique biomes, structures, blocks, and gameplay mechanics.