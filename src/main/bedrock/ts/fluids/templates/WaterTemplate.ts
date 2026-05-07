import { FluidInteraction, FluidTemplate } from "../lib/FluidTemplate.js";
import { generateFluidIDs } from "../lib/utils.js";
import { FogManager } from "../lib/FogManager.js";
import { Player, Entity, Dimension, Block } from "@minecraft/server";

export interface WaterConfig {
    baseName: string;
    viscosity?: number; 
    spreadDelay?: number;
    decayPerBlock?: number;
    slopeFindDistance?: number;
    stickiness?: number; 
    fogId?: string;
    hasBoatPhysics?: boolean;
    interactions?: FluidInteraction[];
}

export class WaterTemplate extends FluidTemplate {
    private _ids: string[];
    private _idsSet: Set<string>;
    private config: WaterConfig;
    private playerState: Map<string, { head: boolean, feet: boolean }> = new Map();

    constructor(config: WaterConfig) {
        super();
        this.config = config;
        this._ids = generateFluidIDs(config.baseName);
        this._idsSet = new Set(this._ids);
    }

    get fluidIDs(): string[] {
        return this._ids;
    }

    get spreadDelay(): number {
        return this.config.spreadDelay ?? 5;
    }

    get decayPerBlock(): number {
        return this.config.decayPerBlock ?? 1;
    }

    get slopeFindDistance(): number {
        return this.config.slopeFindDistance ?? 4;
    }

    getInteractions(): FluidInteraction[] {
        return this.config.interactions || [];
    }

    onPlayerTick(player: Player, block: Block, isHeadInside: boolean, isFeetInside: boolean): void {
        const prevState = this.playerState.get(player.id) || { head: false, feet: false };

        // Depth-based gravity scaling (deeper = stronger pull)
        let gravityScale = 1.0;
        let amplifier = 0; // For slow_falling


        if (this.config.viscosity !== undefined) {
            // Custom viscosity fluids (like Tar) use viscosity as gravity multiplier
            gravityScale = this.config.viscosity / 2.0; // normalize: viscosity 10 → gravityScale 5.0 (effective 0.10)
            amplifier = 2;

        } else {
            if (isHeadInside) {
                gravityScale = 1.0;  // Submerged: gentle sinking (effective 0.02)
                amplifier = 2;

            } else if (isFeetInside) {
                const loc = player.location;
                const resolver = FluidTemplate.blockResolver;
                const midBlock = resolver
                    ? resolver(player.dimension, loc.x, loc.y + 0.8, loc.z)
                    : player.dimension.getBlock({ x: loc.x, y: loc.y + 0.8, z: loc.z });
                if (midBlock && this._idsSet.has(midBlock.typeId)) {
                    gravityScale = 2.0;  // Waist deep (effective 0.04)
                    amplifier = 1;

                } else {
                    gravityScale = 3.0;  // Ankle deep (effective 0.06)
                    amplifier = 0;

                }
            }

            if (player.isSneaking) {
                gravityScale = Math.max(0.2, gravityScale - 0.6);
                amplifier = Math.min(2, amplifier + 1);

            }
        }

        // Java-parity drag for water-like fluids
        // Stickiness config modifies drag: higher stickiness = lower drag = more viscous
        const baseDrag = this.config.stickiness
            ? Math.max(0.3, 0.8 - this.config.stickiness * 0.1)
            : 0.8;

        if (isHeadInside || isFeetInside) {
            // Store physics state — the dedicated every-tick loop in fluids.ts applies it each tick.
            FluidTemplate.physicsStates.set(player.id, {
                player,
                drag: baseDrag,
                acceleration: 0.02,
                gravityScale,
                canSprint: !this.config.stickiness,
            });
            // All movement handled by MotionEngine — no effects needed.
        }

        // Fog Logic
        const userFogId = "fluid_fog";
        if (isHeadInside) {
            if (this.config.fogId) {
                FogManager.pushFog(player, this.config.fogId, userFogId);
            }
        } else if (prevState.head) {
            FogManager.popFog(player, userFogId);
        }

        // 2. Sounds
        if (isHeadInside && !prevState.head) {
             player.playSound("ambient.underwater.enter", { volume: 0.5, pitch: 1 });
             player.playSound("ambient.underwater.loop", { volume: 1, pitch: 1 });
        } else if (!isHeadInside && prevState.head) {
             // Exit
             player.playSound("ambient.underwater.exit", { volume: 0.5, pitch: 1 });
             player.runCommand("stopsound @s ambient.underwater.loop");
        }

        this.playerState.set(player.id, { head: isHeadInside, feet: isFeetInside });
    }

    processBoat(boat: Entity, dimension: Dimension, isDeep: boolean): void {
        if (!this.config.hasBoatPhysics) return;

        // Buoyancy
        if (isDeep) {
            boat.applyImpulse({ x: 0, y: 0.2, z: 0 });
        }

        // Movement Logic
        const rotation = boat.getRotation().y;
        const dirX = -Math.sin(rotation * (Math.PI / 180));
        const dirZ = Math.cos(rotation * (Math.PI / 180));
        
        const vel = boat.getVelocity();
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        
        if (speed > 0.01) {
             boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
        }
        this.manageBoatHolder(boat, dimension);
    }

    private manageBoatHolder(boat: Entity, dimension: Dimension) {
        const location = boat.location;
        const holders = dimension.getEntities({
            type: "pu_bn:boat_holder",
            location: location,
            maxDistance: 2
        });
        
        let holder = holders.length > 0 ? holders[0] : null;        let waterTopY = Math.floor(location.y) + 1; // Approx
        const targetHolderY = waterTopY - 0.55; 

        if (!holder) {
            holder = dimension.spawnEntity("pu_bn:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
        }
        
        if (holder && holder.isValid) {
            try {
                holder.teleport(
                    { x: location.x, y: targetHolderY, z: location.z }, 
                    { dimension: dimension, rotation: { x: 0, y: boat.getRotation().y } }
                );
            } catch {}
        }
    }
}
