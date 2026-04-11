import { FluidInteraction, FluidTemplate } from "../lib/FluidTemplate.js";
import { generateFluidIDs } from "../lib/utils.js";
import { FogManager } from "../lib/FogManager.js";
import { Player, Entity, Dimension, Block, system } from "@minecraft/server";
import { MotionEngine } from "../../API/MotionEngine.js";

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
    private config: WaterConfig;
    private playerState: Map<string, { head: boolean, feet: boolean, fovSet: boolean }> = new Map();

    constructor(config: WaterConfig) {
        super();
        this.config = config;
        this._ids = generateFluidIDs(config.baseName);
    }

    get fluidIDs(): string[] { return this._ids; }
    get spreadDelay(): number { return this.config.spreadDelay ?? 5; }
    get decayPerBlock(): number { return this.config.decayPerBlock ?? 1; }
    get slopeFindDistance(): number { return this.config.slopeFindDistance ?? 4; }
    getInteractions(): FluidInteraction[] { return this.config.interactions || []; }

    onPlayerTick(player: Player, block: Block, isHeadInside: boolean, isFeetInside: boolean): void {
        const prevState = this.playerState.get(player.id) || { head: false, feet: false, fovSet: false };
        
        let gravityVal = 9.8;
        let slownessLevel = 0;
        let amplifier = 0; 
        let viscosity = 0;

        if (this.config.viscosity !== undefined && this.config.viscosity > 1) {
            viscosity = this.config.viscosity;
            gravityVal = 0.5;
            slownessLevel = Math.min(10, viscosity);
            amplifier = 2;
        } else {
            if (isHeadInside) {
                gravityVal = 0.5;
                slownessLevel = 4;
                amplifier = 2;
            } else if (isFeetInside) {
                const blockMid = player.dimension.getBlock({ x: player.location.x, y: player.location.y + 0.8, z: player.location.z });
                if (blockMid && this._ids.includes(blockMid.typeId)) {
                    gravityVal = 2.0; 
                    slownessLevel = 3;
                    amplifier = 1;
                } else {
                    gravityVal = 5.0; 
                    slownessLevel = 2;
                    amplifier = 0;
                }
            }
        }

        if (player.isSneaking) {
            gravityVal = Math.max(0.2, gravityVal - 1.0);
            slownessLevel = Math.min(6, slownessLevel + 1);
            amplifier = Math.min(2, amplifier + 1);
        }

        if (isHeadInside || isFeetInside) {
            MotionEngine.tickPlayer(player, gravityVal, 0.2, 15.0, true, viscosity);
            player.addEffect("slowness", 5, { amplifier: slownessLevel, showParticles: false });
            player.addEffect("slow_falling", 4, { amplifier: amplifier, showParticles: false });
            
            if ((player as any).isJumping && viscosity < 5) {
                player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
            }

            const fovAdjustment = Math.min(170, 70 + (slownessLevel * 21)); 
            player.runCommand(`camera @s set minecraft:first_person fov ${fovAdjustment}`);
            prevState.fovSet = true;
        } else if (prevState.fovSet) {
            player.runCommand("camera @s clear");
            prevState.fovSet = false;
        }

        const userFogId = "fluid_fog";
        if (isHeadInside) {
            if (this.config.fogId) FogManager.pushFog(player, this.config.fogId, userFogId);
        } else if (prevState.head) {
            FogManager.popFog(player, userFogId);
        }

        if (isHeadInside && !prevState.head) {
             player.playSound("ambient.underwater.enter", { volume: 0.5, pitch: 1 });
             player.playSound("ambient.underwater.loop", { volume: 1, pitch: 1 });
        } else if (!isHeadInside && prevState.head) {
             player.playSound("ambient.underwater.exit", { volume: 0.5, pitch: 1 });
             player.runCommand("stopsound @s ambient.underwater.loop");
        }

        this.playerState.set(player.id, { head: isHeadInside, feet: isFeetInside, fovSet: prevState.fovSet });
    }

    processBoat(boat: Entity, dimension: Dimension, isDeep: boolean): void {
        if (!this.config.hasBoatPhysics) return;
        if (isDeep) boat.applyImpulse({ x: 0, y: 0.2, z: 0 });

        const rotation = boat.getRotation().y;
        const dirX = -Math.sin(rotation * (Math.PI / 180));
        const dirZ = Math.cos(rotation * (Math.PI / 180));
        const vel = boat.getVelocity();
        const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        
        if (speed > 0.01) boat.applyImpulse({ x: dirX * 0.15, y: 0, z: dirZ * 0.15 });
        this.manageBoatHolder(boat, dimension);
    }

    private manageBoatHolder(boat: Entity, dimension: Dimension) {
        const location = boat.location;
        const holders = dimension.getEntities({ type: "gaiadimension:boat_holder", location: location, maxDistance: 2 });
        let holder = holders.length > 0 ? holders[0] : null;
        const targetHolderY = Math.floor(location.y) + 1 - 0.55; 

        if (!holder) holder = dimension.spawnEntity("gaiadimension:boat_holder", { x: location.x, y: targetHolderY, z: location.z });
        if (holder && holder.isValid) {
            try {
                holder.teleport({ x: location.x, y: targetHolderY, z: location.z }, { dimension: dimension, rotation: { x: 0, y: boat.getRotation().y } });
            } catch {}
        }
    }
}
