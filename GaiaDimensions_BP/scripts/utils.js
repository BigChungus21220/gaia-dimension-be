import { world } from "@minecraft/server";

export function getDimensions() {
    return [
        world.getDimension("overworld"),
        world.getDimension("the_end"),
        world.getDimension("nether")
    ];
}