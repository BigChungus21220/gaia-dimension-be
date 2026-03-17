import { Datagen } from "./Datagen.js";
import * as path from "path";
import * as fs from "fs";

export class LangGenerator extends Datagen {
    private readonly entries: Record<string, string> = {};

    constructor(outputDir: string) {
        super(outputDir);
    }

    public add(key: string, value: string): void {
        this.entries[key] = value;
    }

    public generate(): void {
        const langContent = Object.entries(this.entries)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");

        const languagesJson = ["en_US"];

        // Write to both BP and RP
        for (const pack of ["BP", "RP"]) {
            this.writeText(path.join(pack, "texts", "en_US.lang"), langContent);
            this.writeJson(path.join(pack, "texts", "languages.json"), languagesJson);
        }
    }

    private writeText(filePath: string, content: string): void {
        const fullPath = path.join(this.outputDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, content);
    }
}
