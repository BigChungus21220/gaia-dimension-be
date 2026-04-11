import { Player, system } from "@minecraft/server";

type AxisKey = "x" | "y" | "z";
type AxisPair = [AxisKey, AxisKey];

export const Geo = new class {
  distance(vector1: any, vector2: any) {
    return Math.sqrt(Math.abs(vector1.x - vector2.x)**2 + Math.abs(vector1.y - vector2.y)**2 + Math.abs(vector1.z - vector2.z)**2)
  }
  
  getDirection3D(vector1: any, vector2: any) {
    let dist = this.distance(vector1, vector2) || 1
    return {
      x: (vector2.x - vector1.x)/dist,
      y: (vector2.y - vector1.y)/dist,
      z: (vector2.z - vector1.z)/dist
    }
  }

  rotate(offset: Partial<Record<AxisKey, number>>, angle: number, axis: AxisPair = ["x", "z"]) {
    const [primaryAxis, secondaryAxis] = axis;
    const flatOffset = {
      [primaryAxis]: offset[primaryAxis] ?? 0,
      [secondaryAxis]: offset[secondaryAxis] ?? 0
    };
    let offsetDir = this.getDirection3D({x: 0, y: 0, z: 0}, sumObjects({}, flatOffset))
    let offsetDist = this.distance({x: 0, y: 0, z: 0}, sumObjects({}, flatOffset))
    angle += Math.acos(offsetDir[primaryAxis])*57.2958 * (offsetDir[secondaryAxis] < 0 ? -1 : 1)
    let direction: any = {
      [primaryAxis]: Math.cos(angle/57.2958),
      [secondaryAxis]: Math.sin(angle/57.2958)
    }
    return sumObjects({}, direction, offsetDist)
  }
}

export function sumObjects(vector1: any, vector2: any, multi = 1) {
  return {
    x: (vector1.x || 0) + (vector2.x || 0) * multi,
    y: (vector1.y || 0) + (vector2.y || 0) * multi,
    z: (vector1.z || 0) + (vector2.z || 0) * multi
  }
}

export function getXZVelocity(player: Player, forceZeroSprint: boolean = false) {
  let vector: any = { x: 0, z: 0 }
  const input = (player as any).inputInfo.getMovementVector()
  const strafeInput = input.y;
  const forwardInput = -input.x;
  vector = sumObjects(vector, Geo.rotate({ x: strafeInput, z: forwardInput }, player.getRotation().y + 90))
  const speedModifier = (player.getEffect('speed')?.amplifier ?? -1) + 1 - ((player.getEffect('slowness')?.amplifier ?? -1) + 1)
  const baseSpeed = forceZeroSprint ? 0.37 : (0.37 + (player.isSprinting ? 0.13 : 0) + speedModifier/10);
  vector = sumObjects({}, vector, baseSpeed)
  return vector
}

export class MotionEngine {
    static tickPlayer(player: Player, gravityValue: number, speedMultiplier: number = 1.0, resistance: number = 5.0, forceZeroSprint: boolean = false, viscosity: number = 0) {
        const p = player as any;

        if (player.isOnGround) {
            if (p.fallingVelocity > 0.5 && !player.getEffect('slow_falling')) {
                let damage = (p.fallingVelocity * 2) ** 1.7;
                if (damage >= 1) player.applyDamage(damage, { cause: 'fall' as any });
            }
            p.fallVelocity = 0;
            p.fallingVelocity = 0;
            p.onGroundTick = system.currentTick;
        }

        if (p.isJumping && p.onGroundTick >= system.currentTick - 1) {
            if (viscosity < 5) {
                p.fallVelocity -= (0.2 * 9.8/( (gravityValue + 9.8*0.2) / 1.2 )) + ((player.getEffect('jump_boost')?.amplifier ?? -1) + 1)/10;
            } else {
                p.fallVelocity = 0.05; 
            }
        }

        if ((player.isOnGround && viscosity === 0) || player.isFlying || player.isGliding) {
            p.fallVelocity = 0
            p.fallingTime = 0
            p.savedXZ = undefined
            return;
        }  

        p.fallVelocity = p.fallVelocity || 0
        p.fallingTime = (p.fallingTime || 0) + 1

        if (viscosity > 0) {
            const sinkSpeed = 0.005 * viscosity;
            p.fallVelocity = (p.fallVelocity * 0.5) + (sinkSpeed * 0.5);
        } else {
            p.fallVelocity += (9.8*1.5 + gravityValue) / 2.5 / Math.min(300, 190 + p.fallingTime*(9.8 - gravityValue))
        }

        let xz = getXZVelocity(player, forceZeroSprint || viscosity > 5)
        const effectiveMultiplier = speedMultiplier / (1 + viscosity);
        xz.x *= effectiveMultiplier;
        xz.z *= effectiveMultiplier;

        p.savedXZ = sumObjects({}, sumObjects(xz, p.savedXZ || xz, resistance), 1/(resistance + 1))
        xz = p.savedXZ

        const xzPower = Geo.distance({x: 0, y: 0, z: 0}, xz)
        const xzDir = Geo.getDirection3D({x: 0, y: 0, z: 0}, xz)

        if (player.isOnGround && p.fallVelocity < 0) p.fallVelocity = 0;

        if (player.dimension.heightRange.min <= player.location.y || player.dimension.heightRange.max - 2 >= player.location.y) {
            let above = player.dimension.getBlockFromRay(player.getHeadLocation(), { x: 0, y: 1, z: 0 }, { maxDistance: 1 })
            if (above && !above.block.isAir && !above.block.isLiquid && p.fallVelocity < 0) p.fallVelocity = 0;

            const locations = [sumObjects(player.location, {y: 0.55}), player.getHeadLocation()]
            if (locations.map(loc => player.dimension.getBlockFromRay(loc, xzDir)).some((ray, index) => {
                if (ray == undefined) return false;
                if (Geo.distance(sumObjects(ray.faceLocation, ray.block.location), locations[index]) < 0.6 && !ray.block.isAir) return true;
            })) {
                xz = { x: 0, z: 0 }
                p.savedXZ = xz
            }
        }

        if (p.fallVelocity != 0) player.applyKnockback({x: 0, z: 0}, 0)
        player.applyKnockback({x: xzDir.x * xzPower, z: xzDir.z * xzPower}, -p.fallVelocity)
        
        let ray = player.dimension.getBlockFromRay(player.location, { x: 0, y: -1, z: 0 })
        if (ray != undefined) {
            let distance = player.location.y - sumObjects(ray.block.location, ray.faceLocation).y
            p.distance = distance
            if (distance < -player.getVelocity().y*3) player.addEffect('slow_falling', 5, { amplifier: 0, showParticles: false });
        }

        p.fallingVelocity = p.fallVelocity/2
    }
}
