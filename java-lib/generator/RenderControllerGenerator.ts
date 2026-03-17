import { Datagen } from "./Datagen.js";
import * as path from "path";

export interface RenderControllerDefinition {
    arrays?: {
        geometries?: Record<string, string[]>;
        materials?: Record<string, string[]>;
        textures?: Record<string, string[]>;
    };
    geometry: string;
    materials: Record<string, string>[];
    textures: string[];
    part_visibility?: Record<string, string | boolean>[];
    color?: {
        r: string | number;
        g: string | number;
        b: string | number;
        a: string | number;
    };
}

export class RenderControllerGenerator extends Datagen {
    public static readonly CONTROLLERS: Record<string, RenderControllerDefinition> = {};

    constructor(outputDir: string) {
        super(outputDir);
    }

    public static register(id: string, definition: RenderControllerDefinition): string {
        this.CONTROLLERS[id] = definition;
        return id;
    }

    public generate(): void {
        const controllerCount = Object.keys(RenderControllerGenerator.CONTROLLERS).length;
        if (controllerCount === 0) return;

        const output = {
            format_version: "1.8.0",
            render_controllers: RenderControllerGenerator.CONTROLLERS
        };

        this.writeJson(path.join("RP", "render_controllers", "twilightforest.render_controllers.json"), output);
    }
}
