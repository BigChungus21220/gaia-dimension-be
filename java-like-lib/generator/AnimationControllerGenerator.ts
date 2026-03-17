import { Datagen } from "./Datagen.js";
import * as path from "path";

export interface AnimationControllerState {
    animations?: (string | Record<string, string>)[];
    transitions?: Record<string, string>[];
    on_entry?: string[];
    on_exit?: string[];
}

export interface AnimationControllerDefinition {
    initial_state?: string;
    states: Record<string, AnimationControllerState>;
}

export class AnimationControllerGenerator extends Datagen {
    public static readonly CONTROLLERS: Record<string, AnimationControllerDefinition> = {};

    constructor(outputDir: string) {
        super(outputDir);
    }

    public static register(id: string, definition: AnimationControllerDefinition): string {
        this.CONTROLLERS[id] = definition;
        return id;
    }

    public generate(): void {
        const controllerCount = Object.keys(AnimationControllerGenerator.CONTROLLERS).length;
        if (controllerCount === 0) return;

        const output = {
            format_version: "1.10.0",
            animation_controllers: AnimationControllerGenerator.CONTROLLERS
        };

        this.writeJson(path.join("RP", "animation_controllers", "twilightforest.animation_controllers.json"), output);
    }
}
