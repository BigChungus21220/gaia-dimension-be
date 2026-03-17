import { Datagen } from "./Datagen.js";
import * as path from "path";

export class UIDefsGenerator extends Datagen {
    private static readonly FILES: Set<string> = new Set();

    constructor(outputDir: string) {
        super(outputDir);
    }

    public static add(filePath: string): void {
        this.FILES.add(filePath);
    }

    public generate(): void {
        if (UIDefsGenerator.FILES.size === 0) return;

        const defs = {
            ui_defs: Array.from(UIDefsGenerator.FILES)
        };

        this.writeJson(path.join("RP", "ui", "_ui_defs.json"), defs);
    }
}
