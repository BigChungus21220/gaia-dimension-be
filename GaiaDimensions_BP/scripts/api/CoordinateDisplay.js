import { vec3 } from "../Vector";
import { MathRound } from "../utils";

export class CoordinateDisplay {
    static locMap = new Map();

    constructor(player) {
        this.player = player;
    }

    setCoordinate(coord) {
        this.player.onScreenDisplay.setActionBar(coord)
    }

    coordinates() {
        const { location, nameTag } = this.player;
        const { locMap } = CoordinateDisplay;
        const prevLocation = locMap?.get(nameTag)?.current || { x: 0, z: 0 };
        const deltaX = MathRound(location.x - prevLocation.x);
        const deltaZ = MathRound(location.z - prevLocation.z);

        let temporaryLoc = location;

        const calVector = vec3(
            MathRound(((temporaryLoc.x - 100000) / 1000) + deltaX),
            MathRound(temporaryLoc.y),
            MathRound(((temporaryLoc.z - 100000) / 1000) + deltaZ)
        );

        temporaryLoc = undefined;

        locMap.set(nameTag, { current: calVector });

        // Handle movement:
        if (deltaX !== 0 || deltaZ !== 0) {
            const movementX = (locMap.get(nameTag).current.x || 0) + (deltaX > 0 ? 1 : -1);
            const movementZ = (locMap.get(nameTag).current.z || 0) + (deltaZ > 0 ? 1 : -1);
            locMap.set(nameTag, { current: vec3(movementX, location.y, movementZ) });
        }

        const isNonNumerical = isNaN(calVector.x) && isNaN(calVector.z)
        const coord = isNonNumerical ? "Loading Coords..." : `x: ${calVector.x} y: ${calVector.y} z: ${calVector.z}`;
        return coord;

    }
}
