# Wither Storm Evolution & Systems Investigation: Decayed Reality

This document outlines the technical architecture of the Wither Storm in the "Decayed Reality" project, focusing on its procedural growth, dynamic combat systems, and modular model structure.

---

## 1. Procedural Evolution & Scaling (The "Mutation" System)

The Wither Storm features a randomized, non-uniform growth system that ensures every instance evolves uniquely.

### 1.1. Behavioral Logic (`ws_proc_points.js`)
Growth is driven by "Procedural Points" stored as entity properties. When a point is added (via cluster consumption or time), the system uses weighted randomness to decide which axes to scale.

**Weighted Distribution:**
*   **55% chance:** Single axis (X, Y, or Z).
*   **35% chance:** Two axes.
*   **10% chance:** Uniform scaling (All three axes).

```javascript
// Sample from ws_proc_points.js
if (u < 0.55) mask = 1 << ((r >>> 24) % 3); // Single axis
else if (u < 0.9) {
  const a = (r >>> 24) % 3, b = (r >>> 16) % 3;
  mask = (1 << a) | (1 << b); // Two axes
} else mask = 7; // All three axes (Binary 111)
```

### 1.2. Molang Persistence Trick (`wither_storm.json`)
To prevent the storm from "shrinking" when it stops evolving, the project uses a persistence loop in Molang.

```c
// If query.is_stunned (evolution mode) is true, update the scale.
// If false, set the variable to its own current value to "lock" it.
v.sx = v.proc ? v.tx : v.sx;
```

---

## 2. Dynamic Tentacle System (Combat AI)

The tentacles are not just animations; they are a reactive AI system handled by `tentacleattacks.js`.

### 2.1. The "Drilling" Mechanic
If a player is behind blocks, the storm initiates a "Drill" attack, using raycasting to find obstructions and clearing them with a chain of explosions.

```javascript
function drillObstruction(dim, startLoc, targetLoc, source) {
  const dx = targetLoc.x - startLoc.x;
  const dy = targetLoc.y - startLoc.y;
  const dz = targetLoc.z - startLoc.z;
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  const step = 1.5;
  const count = Math.min(8, Math.floor(dist / step));
  
  // Spawns a sequence of explosions along the line of sight
  const interval = system.runInterval(() => {
    // ... increment position and dim.createExplosion ...
  }, 2);
}
```

### 2.2. Height-Aware Targeting
The AI sorts its attacks (Zones A1-A5) based on whether the player is above or below the storm's center.
*   **Bottom Tentacles (A1, A2):** Triggered when `player.y < storm.y - bias`.
*   **Top Tentacles (A3, A4, A5):** Triggered when `player.y >= storm.y - bias`.

---

## 3. Modular Model Architecture

The Wither Storm's visual representation is a "layered puzzle" of multiple geometry files.

### 3.1. Phase Swapping
The project uses separate `.geo.json` files for every sub-phase (e.g., `phase_4.0` to `phase_5.5`). These are swapped using Render Controllers based on the `variant` and `skin_id`.

### 3.2. Growth Bone Strategy
Instead of stretching the main body texture, the `phase_procedural` model contains dozens of "hidden" bones (e.g., `growth_procedural3`, `TendrilA`).
*   **The Math:** `position: ["15 * v.sx", "4 * v.sy2", "20 * v.sz"]`
*   **Result:** As the procedural variables increase, these bones are **pushed out** and **scaled up**. This creates new physical mass on the surface of the storm without distorting the base model's UVs.

---

## 4. Evolution Tracks

| Path | Driver | Key Property | Visual Result |
| :--- | :--- | :--- | :--- |
| **Destroyer** | Growth Score | `skin_id: 1` | Massive size increases, more heads. |
| **Devourer** | Growth Score | `skin_id: 3` | Belly-focused geometry, debris vortex. |
| **Vortex** | Health % | `vortex_level` | Intensity of debris ring increases as HP drops. |
| **Procedural** | Cluster Consumption | `proc_scale_x/y/z` | Asymmetrical mutations, extra tendrils. |

---
**Investigation Complete.** 
*Findings based on Decayed Reality BP/RP source code.*
