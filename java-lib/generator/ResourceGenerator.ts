import * as fs from "fs";
import * as path from "path";
import { Datagen } from "./Datagen.js";

export class ResourceGenerator extends Datagen {
    private readonly sourceRP: string;
    private readonly sourceBP: string;

    constructor(outputDir: string, sourceRP: string, sourceBP: string) {
        super(outputDir);
        this.sourceRP = sourceRP;
        this.sourceBP = sourceBP;
    }

    public generate(): void {
        if (fs.existsSync(this.sourceRP)) {
            this.copyRecursive(this.sourceRP, path.join(this.outputDir, "RP"));
        }
        if (fs.existsSync(this.sourceBP)) {
            this.copyRecursive(this.sourceBP, path.join(this.outputDir, "BP"));
        }
    }

    private copyRecursive(src: string, dest: string) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyRecursive(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}
