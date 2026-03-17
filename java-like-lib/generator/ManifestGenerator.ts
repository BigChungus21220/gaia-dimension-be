import { Datagen } from "./Datagen.js";
import * as path from "path";
import * as crypto from "crypto";

export class ManifestGenerator extends Datagen {
    constructor(outputDir: string) {
        super(outputDir);
    }

    public generate(): void {
        const bpUUID = this.generateUUID("TWILIGHT_FOREST_BP_HEADER_V1");
        const bpDataUUID = this.generateUUID("TWILIGHT_FOREST_BP_DATA_V1");
        const bpScriptUUID = this.generateUUID("TWILIGHT_FOREST_BP_SCRIPT_V1");
        const rpUUID = this.generateUUID("TWILIGHT_FOREST_RP_HEADER_V1");
        const rpModuleUUID = this.generateUUID("TWILIGHT_FOREST_RP_MODULE_V1");

        this.generateBP(bpUUID, bpDataUUID, bpScriptUUID, rpUUID);
        this.generateRP(rpUUID, rpModuleUUID);
    }

    private generateUUID(seed: string): string {
        const hash = crypto.createHash('sha256').update(seed).digest('hex');
        const s1 = hash.substring(0, 8);
        const s2 = hash.substring(8, 12);
        const s3 = '4' + hash.substring(12, 15);
        const s4 = ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20);
        const s5 = hash.substring(20, 32);
        return `${s1}-${s2}-${s3}-${s4}-${s5}`;
    }

    private generateBP(headerUUID: string, dataUUID: string, scriptUUID: string, rpUUID: string): void {
        const manifest = {
            format_version: 3, 
            header: {
                name: "pack.name",
                description: "pack.description",
                uuid: headerUUID,
                min_engine_version: "1.21.130", // String format
                version: "1.0.0",
                pack_scope: "world"
            },
            modules: [
                {
                    description: "Data Module",
                    type: "data",
                    uuid: dataUUID,
                    version: "1.0.0"
                },
                {
                    description: "Script Module",
                    entry: "scripts/main.js",
                    language: "javascript",
                    type: "script",
                    uuid: scriptUUID,
                    version: "1.0.0"
                }
            ],
            dependencies: [
                {
                    module_name: "@minecraft/server",
                    version: "2.4.0"
                },
                {
                    module_name: "@minecraft/server-ui",
                    version: "2.0.0"
                },
                {
                    uuid: rpUUID,
                    version: "1.0.0"
                }
            ],
            metadata: {
                product_type: "addon",
                authors: ["Twilight Forest Team", "Benimatic"]
            }
        };
        
        this.writeJson(path.join("BP", "manifest.json"), manifest);
    }

    private generateRP(headerUUID: string, moduleUUID: string): void {
        const manifest = {
            format_version: 3,
            header: {
                name: "pack.name",
                description: "pack.description",
                uuid: headerUUID,
                min_engine_version: "1.21.130", // String format
                version: "1.0.0"
            },
            modules: [
                {
                    description: "Resource Pack Module",
                    type: "resources",
                    uuid: moduleUUID,
                    version: "1.0.0"
                }
            ],
            metadata: {
                product_type: "addon",
                authors: ["Twilight Forest Team", "Benimatic"]
            }
        };
        this.writeJson(path.join("RP", "manifest.json"), manifest);
    }
}
