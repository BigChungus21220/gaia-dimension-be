import * as fs from "fs";
import * as path from "path";
import { Datagen } from "./Datagen.js";
import { fileURLToPath } from 'url';
import { UIDefsGenerator } from "./UIDefsGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BossBarGenerator extends Datagen {
    private readonly resourceDir: string;

    constructor(outputDir: string) {
        super(outputDir);
        this.resourceDir = path.resolve(__dirname, "../resources/bossbar");
    }

    public generate(): void {
        if (!fs.existsSync(this.resourceDir)) {
            return;
        }

        const uiSource = path.join(this.resourceDir, "ui");
        const textureSource = path.join(this.resourceDir, "textures");

        // Copy UI files directly to ui/ (no nesting)
        if (fs.existsSync(uiSource)) {
            const uiFiles = fs.readdirSync(uiSource);
            for (const file of uiFiles) {
                const src = path.join(uiSource, file);
                if (fs.statSync(src).isFile()) {
                    const dest = path.join(this.outputDir, "RP", "ui", file);
                    const destDir = path.dirname(dest);
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    fs.copyFileSync(src, dest);
                }
            }
        }

        this.copyRecursive(textureSource, path.join(this.outputDir, "RP", "textures", "ui", "bossbar"));

        // Register custom UI (un-nested)
        UIDefsGenerator.add("ui/bossbar.json");
    }

    private copyRecursive(src: string, dest: string) {
        if (!fs.existsSync(src)) return;
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
