import { runFluidDatagen } from "./FluidGenCore.js";

/**
 * FLUID DATAGEN REGISTRY
 * Add your custom fluids here to automatically generate geometries and block JSONs.
 */
const FLUID_REGISTRY = [
    {
        id: "liquid_aura",
        texture: "gaiadimension:liquid_aura_still",
        stages: 7,
        heights: [14.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 0.5], // Vanilla-like heights starting from source (14)
        light: 15,
        light_dim: 5,
        render_method: "blend"
    },
    {
        id: "liquid_bismuth",
        texture: "gaiadimension:liquid_bismuth_still",
        stages: 7,
        heights: [14.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 0.5],
        light: 15,
        light_dim: 5,
        render_method: "blend"
    },
    {
        id: "mineral_water",
        texture: "gaiadimension:mineral_water_still",
        stages: 7,
        heights: [14.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 0.5],
        light: 15,
        light_dim: 5,
        render_method: "blend"
    },
    {
        id: "superhot_magma",
        texture: "gaiadimension:superhot_magma_still",
        stages: 7,
        heights: [14.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 0.5],
        light: 15,
        light_dim: 5,
        render_method: "blend"
    },
    {
        id: "sweet_muck",
        texture: "gaiadimension:sweet_muck_still",
        stages: 7,
        heights: [14.0, 12.0, 10.0, 8.0, 6.0, 4.0, 2.0, 0.5],
        light: 15,
        light_dim: 5,
        render_method: "blend"
    }
];

runFluidDatagen(FLUID_REGISTRY);
