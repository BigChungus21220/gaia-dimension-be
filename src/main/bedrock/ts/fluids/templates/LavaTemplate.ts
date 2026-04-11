import { FluidInteraction, FluidTemplate } from "../lib/FluidTemplate.js";
import { generateFluidIDs } from "../lib/utils.js";
import { FogManager } from "../lib/FogManager.js";
import { Player, Entity, Dimension, Block, system } from "@minecraft/server";
import { MotionEngine } from "../../API/MotionEngine.js";

export class LavaTemplate extends FluidTemplate {
    private _ids: string[];
    private playerState: Map<string, { head: boolean, fovSet: boolean }> = new Map();

    constructor(baseName: string) {
        super();
        this._ids = generateFluidIDs(baseName);
    }

    get fluidIDs(): string[] {
        return this._ids;
    }

    get spreadDelay(): number {
        return 15;
    }

    get decayPerBlock(): number {
        // Vanilla Lava in Overworld: 2
        return 2; 
    }

    get slopeFindDistance(): number {
        // Vanilla Lava in Overworld: 2
        return 2;
    }

    getInteractions(): FluidInteraction[] {
        return [
            {
                targetBlock: ["minecraft:water", "minecraft:flowing_water"],
                action: "transformSelf",
                resultBlock: "gaiadimension:primal_mass",
                directions: "adjacent",
                sound: "random.fizz"
            },
            {
                targetBlock: ["minecraft:water", "minecraft:flowing_water"],
                action: "transformTarget",
                resultBlock: "gaiadimension:primal_mass",
                directions: "below",
                sound: "random.fizz"
            },
            {
                targetBlock: ["minecraft:water", "minecraft:flowing_water"],
                action: "transformSelf",
                resultBlock: "gaiadimension:primal_mass",
                directions: "below",
                sound: "random.fizz"
            }
        ];
    }

    onPlayerTick(player: Player, block: Block, isHeadInside: boolean, isFeetInside: boolean): void {
        const prevState = this.playerState.get(player.id) || { head: false, fovSet: false };

        // 1. Motion Engine Physics & Slowness
        let gravityVal = 9.8;
        let slownessLevel = 0;
        let amplifier = 0;
        
        if (isHeadInside) {
            gravityVal = 0.5;
            slownessLevel = 10;
            amplifier = 2;
        }
        else if (isFeetInside) {
            // Check waist depth
            const blockMid = player.dimension.getBlock({ x: player.location.x, y: player.location.y + 0.8, z: player.location.z });
            if (blockMid && this._ids.includes(blockMid.typeId)) {
                gravityVal = 2.0; // Waist deep
                slownessLevel = 8;
                amplifier = 1;
            } else {
                gravityVal = 5.0; // Ankle deep
                slownessLevel = 6;
                amplifier = 0;
            }
        }

        if (player.isSneaking) {
            gravityVal = Math.max(0.2, gravityVal - 1.0);
            slownessLevel = Math.min(15, slownessLevel + 2);
            amplifier = Math.min(2, amplifier + 1);
        }

        if (isHeadInside || isFeetInside) {
            MotionEngine.tickPlayer(player, gravityVal, 0.1, 25.0, true);
            
            // Apply slowness to physically restrict movement/sprint
            player.addEffect("slowness", 5, { amplifier: slownessLevel, showParticles: false });
            
            // Normal fluid effects
            player.addEffect("slow_falling", 4, { amplifier: amplifier, showParticles: false });
            if ((player as any).isJumping) {
                player.addEffect("levitation", 3, { amplifier: 2, showParticles: false });
            }

            // Counteract FOV zoom (30% per level)
            const fovAdjustment = Math.min(170, 70 + (slownessLevel * 21)); 
            player.runCommand(`camera @s set minecraft:first_person fov ${fovAdjustment}`);
            prevState.fovSet = true;
        } else if (prevState.fovSet) {
            player.runCommand("camera @s clear");
            prevState.fovSet = false;
        }

        // Heat Damage
        player.setOnFire(10, true);
        if (system.currentTick % 20 === 0) {
            player.applyDamage(4, { cause: "lava" as any });
        }

        // Fog Logic
        const userFogId = "fluid_fog";
        if (isHeadInside) {
            FogManager.pushFog(player, "gaiadimension:liquid_magma_fog", userFogId);
        } else if (prevState.head) {
            FogManager.popFog(player, userFogId);
        }

        this.playerState.set(player.id, { head: isHeadInside, fovSet: prevState.fovSet });
    }

    onEntityTick(entity: Entity, block: Block): void {
        if (entity.typeId === "minecraft:item") {
           //burn item logic
            entity.setOnFire(5, true);
            return;
        }

        entity.setOnFire(10, true);
        if (system.currentTick % 20 === 0) {
            entity.applyDamage(4, { cause: "lava" as any });
        }
        
        //vicosity effect for mobs (mobs still use effect for now as they lack inputInfo)
        entity.addEffect("slow_falling", 4, { amplifier: 1, showParticles: false });
    }

    processBoat(boat: Entity, dimension: Dimension, isDeep: boolean): void {
    }
}
