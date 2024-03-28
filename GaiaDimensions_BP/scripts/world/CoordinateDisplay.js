import { vec3 } from "../Vec3";
import { MathRound as round } from "../utils";

export class CoordinateDisplay {
    static locationMap = new Map();

    constructor(player) {
        this.player = player;
    }

    setCoordinate(coordString) {
        this.player.onScreenDisplay.setActionBar(coordString);
    }

    static adjustCoordinates(x, z) {
        const adjustedX = round((x - 100000) / 1000);
        const adjustedZ = round((z - 100000) / 1000);
        return { adjustedX, adjustedZ };
    }

    updateCoordinates() {
        const { location, name } = this.player;
        const { locationMap } = CoordinateDisplay;

        const prevLocation = locationMap.get(name)?.current || { x: 0, z: 0 };

        const deltaX = location.x - prevLocation.x;
        const deltaZ = location.z - prevLocation.z;

        const { adjustedX, adjustedZ } = CoordinateDisplay.adjustCoordinates(deltaX, deltaZ);

        if (!locationMap.has(name)) {
            const { adjustedX: newX, adjustedZ: newZ } = CoordinateDisplay.adjustCoordinates(location.x, location.z);
            const calculatedVector = vec3(newX + adjustedX, location.y, newZ + adjustedZ).round();
            locationMap.set(name, { current: calculatedVector });
        } else {
            if (adjustedX !== 0 || adjustedZ !== 0) {
                const current = locationMap.get(name).current || { x: 0, z: 0 };
                const movementX = current.x + (adjustedX > 0 ? 1 : -1);
                const movementZ = current.z + (adjustedZ > 0 ? 1 : -1);
                locationMap.set(name, { current: vec3(movementX, location.y, movementZ).round() });
            }
        }

        const currentLocation = locationMap.get(name)?.current;

        const isNonNumerical = isNaN(currentLocation?.x) && isNaN(currentLocation?.z);
        const coordString = isNonNumerical ? "Loading Coordinates..." : `x: ${currentLocation.x} y: ${currentLocation.y} z: ${currentLocation.z}`;
        return coordString;
    }
}
