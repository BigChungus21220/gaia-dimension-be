import { FluidInteraction, FluidTemplate } from "../lib/FluidTemplate.js";
import { generateFluidIDs } from "../lib/utils.js";
import { FogManager } from "../lib/FogManager.js";
import { Player, Entity, Dimension, Block, system } from "@minecraft/server";
export class LavaTemplate extends FluidTemplate {
    private _ids: string[];
    private _idsSet: Set<string>;
    private playerState: Map<string, { head: boolean }> = new Map();

    constructor(baseName: string) {
        super();
        this._ids = generateFluidIDs(baseName);
        this._idsSet = new Set(this._ids);
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
                resultBlock: "pu_bn:fragile_magma",
                directions: "adjacent",
                sound: "random.fizz"
            },
            {
                targetBlock: ["minecraft:water", "minecraft:flowing_water"],
                action: "transformTarget",
                resultBlock: "pu_bn:fragile_magma",
                directions: "below",
                sound: "random.fizz"
            },
            {
                targetBlock: ["minecraft:water", "minecraft:flowing_water"],
                action: "transformSelf",
                resultBlock: "pu_bn:fragile_magma",
                directions: "below",
                sound: "random.fizz"
            }
        ];
    }

    onPlayerTick(player: Player, block: Block, isHeadInside: boolean, isFeetInside: boolean): void {
        const prevState = this.playerState.get(player.id) || { head: false };

        // Depth-based gravity scaling
        let gravityScale = 1.0;  // base gravity is 0.02 → effective 0.02 (vanilla lava parity)
        let amplifier = 0;

        if (isHeadInside) {
            gravityScale = 0.6;  // Submerged: slow sinking (effective 0.012)
            amplifier = 2;

        } else if (isFeetInside) {
            const loc = player.location;
            const resolver = FluidTemplate.blockResolver;
            const midBlock = resolver
                ? resolver(player.dimension, loc.x, loc.y + 0.8, loc.z)
                : player.dimension.getBlock({ x: loc.x, y: loc.y + 0.8, z: loc.z });
            if (midBlock && this._idsSet.has(midBlock.typeId)) {
                gravityScale = 1.0;  // Waist deep (effective 0.02)
                amplifier = 1;

            } else {
                gravityScale = 1.6;  // Ankle deep (effective 0.032)
                amplifier = 0;

            }
        }

        if (player.isSneaking) {
            gravityScale = Math.max(0.2, gravityScale - 0.4);
            amplifier = Math.min(2, amplifier + 1);

        }

        if (isHeadInside || isFeetInside) {
            // Java lava: drag = 0.5 (much more viscous than water's 0.8)
            FluidTemplate.physicsStates.set(player.id, {
                player,
                drag: 0.5,
                acceleration: 0.02,
                gravityScale,
                canSprint: false,
            });

            // All movement handled by MotionEngine — no effects needed.
        }

        // Heat Damage
        player.setOnFire(10, true);
        if (system.currentTick % 20 === 0) {
            player.applyDamage(4, { cause: "lava" as any });
        }

        // Fog Logic
        const userFogId = "fluid_fog";
        if (isHeadInside) {
            FogManager.pushFog(player, "pu_bn:liquid_magma_fog", userFogId);
        } else if (prevState.head) {
            FogManager.popFog(player, userFogId);
        }

        this.playerState.set(player.id, { head: isHeadInside });
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
