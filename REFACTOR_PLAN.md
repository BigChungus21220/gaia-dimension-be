# Gaia Dimension Script Refactoring Plan

This document outlines the necessary steps to update the Gaia Dimension scripts to be compatible with the modern Minecraft Bedrock Scripting API v2.0.0 and to address various issues found in the codebase.

## High-Level Goals

- **Modernize the codebase:** Replace outdated APIs and patterns with the current `@minecraft/server` module.
- **Improve performance:** Optimize inefficient code, such as data storage, entity queries, and task scheduling.
- **Enhance maintainability:** Remove custom frameworks and classes in favor of built-in APIs, making the code easier to understand and maintain.
- **Ensure future compatibility:** By adhering to the latest API standards, the scripts will be more likely to work with future versions of Minecraft.

## Core Issues and Required Changes

### 1. Event System Overhaul

- **Issue:** The scripts use a custom `GaiaEvent` system and the deprecated `world.afterEvents.worldInitialize` event. This is incompatible with the v2.0.0 API and can cause scripts to fail during startup.
- **Solution:**
    - Replace all usages of `GaiaEvent` with the corresponding events from the `@minecraft/server` module (e.g., `system.runInterval` for tick events, `world.afterEvents.playerMove` for player movement).
    - Move all logic from `world.afterEvents.worldInitialize` to the appropriate new event handlers:
        - Use `system.beforeEvents.startup` for any logic that needs to run before the world is loaded (e.g., registering custom components).
        - Use `world.afterEvents.worldLoad` for any logic that requires the world to be loaded (e.g., accessing dimensions, players, or blocks).

### 2. Replace Custom `Vec3` Class

- **Issue:** The scripts use a custom `Vec3` class for vector math.
- **Solution:**
    - Replace all instances of the custom `Vec3` class with the built-in `Vector` class from the `@minecraft/server` module. This will improve performance and ensure compatibility with the native APIs.

### 3. Refactor Data Storage

- **Issue:** The `EndlessDB` and `Portal` classes use dynamic properties to store large amounts of data as single JSON strings. This is inefficient and can lead to performance problems.
- **Solution:**
    - Refactor these classes to use more efficient data storage methods:
        - For simple key-value data, use individual dynamic properties.
        - For more complex data, or data that needs to be queried, use the `Scoreboard` API.

### 4. Remove Custom `level` Object and Mixins

- **Issue:** The scripts use a custom `level` object and non-standard methods on built-in classes (e.g., `Block.getAdjacent()`), which are likely implemented via mixins. This makes the code harder to understand and maintain.
- **Solution:**
    - Replace all usages of the `level` object with the standard `world` object from `@minecraft/server`.
    - Remove the mixin system and replace any non-standard method calls with equivalent logic using the standard API.

### 5. Address Inefficient Code and Errors

- **Issue:** The scripts contain various inefficiencies, such as frequent, broad entity queries and `system.runInterval` calls with a 0-tick delay. There are also syntax errors.
- **Solution:**
    - Optimize entity queries to be more specific and less frequent.
    - Replace `system.runInterval(..., 0)` with `system.run` for next-tick execution.
    - Fix any syntax errors.
    - Re-evaluate the use of `e.cancel = true` in the `watchdogTerminate` event, as this can hide performance issues.

## File-Specific Refactoring Plan

### `GaiaDimensionMod.js`

-   Replace `world.afterEvents.worldInitialize` with `world.afterEvents.worldLoad`.
-   Move the `ModDimension.register` call to `system.beforeEvents.startup` if it needs to run before the world loads.
-   Replace `system.runJob` with `system.run`.
-   Replace `Vec3` with `Vector`.
-   Refactor the `EndlessDB` and `TaskQueue` classes.
-   Address the watchdog termination.

### `world/Events.js`

-   Delete this file and its custom `GaiaEvent` system.
-   Move the logic that triggers these events into the appropriate native event handlers in other scripts.

### `tickEvents.js`

-   Remove the dependency on the custom `GaiaEvent` system.
-   Move the logic into `system.runInterval` calls in a main script file.
-   Replace the custom `level` object with the `world` object.
-   Replace `Vec3` with `Vector`.
-   Fix the syntax error in `level.getDimension`.
-   Optimize the entity query.

### `world/Portal.js`

-   Replace `Vec3` with `Vector`.
--   Refactor the data storage to use a more efficient method than a single dynamic property.
-   Replace the non-standard `Block.getAdjacent()` method with standard API calls.
-   Simplify the logic in `canLight`.

## Recommended Order of Operations

1.  **Setup:** Create a new main script file (e.g., `main.js`) and set up the basic `system.beforeEvents.startup` and `world.afterEvents.worldLoad` event handlers.
2.  **Core API Changes:**
    -   Replace all `Vec3` usages with `Vector`.
    -   Remove the `GaiaEvent` system and `tickEvents.js`, moving the logic into `system.runInterval` calls in the new main script.
3.  **Refactor `GaiaDimensionMod.js`:**
    -   Move the logic from `world.afterEvents.worldInitialize` into the new event handlers.
    -   Address the other issues in this file.
4.  **Refactor `world/Portal.js`:**
    -   Update the data storage and remove non-standard method calls.
5.  **Review and Refactor Other Scripts:**
    -   Go through the remaining scripts and apply the same principles, replacing outdated APIs and patterns.
6.  **Testing:**
    -   Thoroughly test the updated scripts in-game to ensure that all functionality is working as expected.
