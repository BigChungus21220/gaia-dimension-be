import * as fs from "fs";
import * as path from "path";

export abstract class Datagen {
    protected readonly outputDir: string;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
    }

    public abstract generate(): void;

    protected writeJson(filePath: string, data: any): void {
        const fullPath = path.join(this.outputDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    }
}
