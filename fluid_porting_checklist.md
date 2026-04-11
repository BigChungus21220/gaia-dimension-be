# Gaia Dimension - Fluid Porting Checklist

The following fluids must be ported from the old static geometry system to the new procedural slope datagen.

| Fluid ID | Texture (Still) | Stages | Heights (Source → S3) | Light Level | Render Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `liquid_aura` | `gaiadimension:liquid_aura_still` | 3 | `[16.0, 11.0, 8.0, 3.5]` | 15 | `blend` |
| `liquid_bismuth` | `gaiadimension:liquid_bismuth_still` | 3 | `[16.0, 11.0, 8.0, 3.5]` | 15 | `blend` |
| `mineral_water` | `gaiadimension:mineral_water_still` | 3 | `[16.0, 11.0, 8.0, 3.5]` | 15 | `blend` |
| `superhot_magma` | `gaiadimension:superhot_magma_still` | 3 | `[16.0, 11.0, 8.0, 3.5]` | 15 | `blend` |
| `sweet_muck` | `gaiadimension:sweet_muck_still` | 3 | `[16.0, 11.0, 8.0, 3.5]` | 15 | `blend` |

## Required System Changes

### 1. Datagen Updates
- Update `FluidDatagen.js` with the Gaia fluid registry.
- Modify `FluidGenCore.js` to:
    - Use `gaiadimension` namespace instead of `pu_bn`.
    - Point paths to `src/main/bedrock/data/blocks/gaiadimension/fluids` and `src/main/bedrock/resources/models/blocks/fluids`.
    - Update loot tables to `loot_tables/msc/empty.json`.

### 2. Scripting Updates (`fluids_better.ts`)
- Implement a logic to calculate `gaiadimension:flow_dir` based on neighbors.
- Port interaction logic (Magma + Aura = Crystal, etc.) from `fluids.ts`.
- Optimize performance using the Budgeted Tick system.
- Replace `fluids.ts` with the new component-based `fluids_better.ts`.

### 3. Block JSON Updates
- All fluids should now use the `gaiadimension:fluid_flow` custom component.
- Source blocks (e.g., `liquid_aura.json`) should be kept or regenerated with compatible states.
