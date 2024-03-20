import { vec3 } from "../Vec3";
import { MathRound } from "../utils";

export class CoordinateDisplay {
    static locMap = new Map();

    constructor(player) {
        this.player = player;
    }

    setCoordinate(coord) {
        this.player.onScreenDisplay.setActionBar(coord);
    }

    coordinates() {
        const { location, name } = this.player;
        const { locMap } = CoordinateDisplay;
        const prevLocation = locMap.get(name)?.current || { x: 0, z: 0 };
        const deltaX = MathRound(location.x - prevLocation.x);
        const deltaZ = MathRound(location.z - prevLocation.z);

        // Only do this if the locMap doesn't have the player
        if (!locMap.has(name)) {
            let temporaryLoc = location;

            const calVector = vec3(
                ((temporaryLoc.x - 100000) / 1000) + deltaX,
                temporaryLoc.y,
                ((temporaryLoc.z - 100000) / 1000) + deltaZ
            ).round();

            temporaryLoc = undefined;

            locMap.set(name, { current: calVector });
        }
        // Handle movement:
        if (deltaX !== 0 || deltaZ !== 0) {
            const movementX = (locMap.get(name)?.current.x || 0) + (deltaX > 0 ? 1 : -1);
            const movementZ = (locMap.get(name)?.current.z || 0) + (deltaZ > 0 ? 1 : -1);
            locMap.set(name, { current: vec3(movementX, location.y, movementZ) });
        }

        const isNonNumerical = isNaN(calVector.x) && isNaN(calVector.z);
        const coord = isNonNumerical ? "Loading Coordinates..." : `x: ${calVector.x} y: ${calVector.y} z: ${calVector.z}`;
        return coord;
    }
}
