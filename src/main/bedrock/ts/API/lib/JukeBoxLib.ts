import { world, system, ItemStack, Block, Vector3, Player, Dimension } from "@minecraft/server";

// Vanilla records array 
const VANILLA_RECORDS = [
    "13", "cat", "blocks", "chirp", "far", "mall", "mellohi", "stal", "strad", "ward", "11", "wait", "otherside", "pigstep", "5", "relic", "creator", "creator_music_box", "precipice"
];

interface JukeboxData {
    soundId: string;
    discTypeId: string;
    startTime: number;
    duration: number;
    dimensionId: string;
}

/**
 * --- Music Disc Lib ---
 * 
 * @author SEN
 * Provides support for custom music discs in vanilla Jukeboxes with:
 * - Auto-ejection after song duration.
 * - Hopper interaction (Input/Output).
 * - Visuals (Actionbar titles, Note particles).
 * - Vanilla compatibility (stops vanilla music when custom plays).
 * 
 * NOTE: Your song duration should match the actual sound file length.
 */
class CustomJukeBox {
    private activeJukeboxes: Map<string, JukeboxData>;
    private activeParticles: Map<string, number>;

    constructor() {
        this.activeJukeboxes = new Map(); 
        this.activeParticles = new Map(); 
        this.init();
    }

    init(): void {
        // Global Interaction Listener (Handles Insertion & Ejection)
        world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
            if (ev.block.typeId !== "minecraft:jukebox") return;

            const { block, player, itemStack } = ev;
            const key = this.getLocationKey(block.location);

            const isPlaying = this.activeJukeboxes.has(key);
            const invComp = block.getComponent("minecraft:inventory") as any;
            const recordComp = block.getComponent("minecraft:record_player") as any;
            
            let hasRecord = false;
            try {
                if (invComp?.container?.getItem(0)) hasRecord = true;
                else if (recordComp?.getRecord()) hasRecord = true;
            } catch(e) {}

            // Ejection / Stop Logic
            if (isPlaying || hasRecord) {
                this.stopDisc(block.location, false, player, true);
                return;
            }

            // Insertion Logic
            if (itemStack && itemStack.hasTag("minecraft:is_music_disc")) {
                const tags = itemStack.getTags();
                const sTag = tags.find(t => t.startsWith("sound:"));
                
                if (sTag) {
                    const soundId = sTag.substring(6);
                    const dTag = tags.find(t => t.startsWith("duration:"));
                    const nTag = tags.find(t => t.startsWith("name:"));
                    
                    const duration = dTag ? parseFloat(dTag.substring(9)) : 0;
                    const name = nTag ? nTag.substring(5) : "";

                    system.run(() => {
                        this.insertDisc(block, player, itemStack, soundId, duration, name);
                    });
                }
            }
        });

        // Cleanup on block break (Synchronous)
        world.beforeEvents.playerBreakBlock.subscribe((ev) => {
            if (ev.block.typeId === "minecraft:jukebox") {
                this.handleBreak(ev.block, ev.player);
            }
        });
        
        // Explosion Cleanup /async 
        world.afterEvents.blockExplode.subscribe((ev) => {
            this.stopDisc(ev.block.location, false); 
        });

        // Main Logic Tick
        system.runInterval(() => this.tick(), 5);
    }

    /**
     * Handles block destruction by stopping music.
     */
    handleBreak(block: Block, player: Player): void {
        const key = this.getLocationKey(block.location);
        const data = this.activeJukeboxes.get(key);
        
        if (data) {
            this.stopDisc(block.location, false, player, true); 
        }
    }

    /**
     * Manually inserts a disc into the Jukebox inventory and starts playback.
     */
    insertDisc(block: Block, player: Player, itemStack: ItemStack, soundId: string, duration: number, name: string): void {
        const invComp = block.getComponent("minecraft:inventory") as any;
        const recordComp = block.getComponent("minecraft:record_player") as any;
        
        try {
            if (invComp && invComp.container) {
                if (invComp.container.getItem(0)) return; 
                invComp.container.setItem(0, itemStack);
            } else if (recordComp && recordComp.setRecord) {
                if (recordComp.getRecord()) return; 
                recordComp.setRecord(itemStack);
            } else return;
        } catch(e) { return; }

        this.playDisc(block, itemStack.typeId, soundId, duration, name);

        if (player.getGameMode() !== "creative") {
            const inv = (player.getComponent("minecraft:inventory") as any)?.container;
            if (inv) {
                const selected = inv.getItem(player.selectedSlotIndex);
                if (selected) {
                    if (selected.amount > 1) {
                        selected.amount--;
                        inv.setItem(player.selectedSlotIndex, selected);
                    } else {
                        inv.setItem(player.selectedSlotIndex, undefined);
                    }
                }
            }
        }
    }

    /**
     * Main tick loop. Handles duration checks and hopper interactions.
     */
    tick(): void {
        for (const [key, data] of this.activeJukeboxes) {
            const loc = this.parseLocationKey(key);
            const dim = world.getDimension(data.dimensionId || "overworld");
            
            try {
                const block = dim.getBlock(loc);
                if (!block || block.typeId !== "minecraft:jukebox") {
                    this.stopDisc(loc, false); 
                    continue;
                }

                const invComp = block.getComponent("minecraft:inventory") as any;
                const recordComp = block.getComponent("minecraft:record_player") as any;
                
                let currentRecord;
                if (invComp && invComp.container) {
                    currentRecord = invComp.container.getItem(0);
                } else if (recordComp && recordComp.getRecord) {
                    currentRecord = recordComp.getRecord();
                }

                if (!currentRecord || currentRecord.typeId !== data.discTypeId) {
                    this.stopDisc(loc, false); 
                    continue;
                }

                if (data.duration > 0) {
                    const elapsed = (Date.now() - data.startTime) / 1000;
                    if (elapsed >= data.duration) {
                        this.ejectDisc(block, data.discTypeId);
                    }
                }

                // Output to Hopper Below
                this.handleHopperInteractions(block);

            } catch (e) {
                this.activeJukeboxes.delete(key);
            }
        }

        // Scan near players for Input/Output logic
        for (const player of world.getAllPlayers()) {
            const pos = player.location;
            for (let x = -4; x <= 4; x++) {
                for (let y = -2; y <= 2; y++) {
                    for (let z = -4; z <= 4; z++) {
                        const bPos = { x: Math.floor(pos.x + x), y: Math.floor(pos.y + y), z: Math.floor(pos.z + z) };
                        try {
                            const block = player.dimension.getBlock(bPos);
                            if (block?.typeId === "minecraft:jukebox") {
                                this.handleHopperInteractions(block);
                                this.processHopperCheck(block);
                            }
                        } catch(e) {}
                    }
                }
            }
        }
    }

    /**
     * moves items between Jukebox and Hoppers.
     */
    handleHopperInteractions(block: Block): void {
        // Output to Hopper Below (Push)
        try {
            const hopperBelow = block.below();
            if (hopperBelow && hopperBelow.typeId === "minecraft:hopper") {
                this.pushToHopper(block, hopperBelow);
            }
        } catch (e) {}

        // Input from Hopper Above (Pull)
        try {
            const hopperAbove = block.above();
            if (hopperAbove && hopperAbove.typeId === "minecraft:hopper") {
                const facing = hopperAbove.permutation.getState("facing_direction" as any);
                const isLocked = hopperAbove.permutation.getState("toggle_bit" as any);
                
                // Facing 0 = Down
                if (facing === 0 && !isLocked) {
                    this.pullFromHopper(block, hopperAbove);
                }
            }
        } catch (e) {}
    }

    pushToHopper(jukebox: Block, hopperBlock: Block): void {
        if (hopperBlock.permutation.getState("toggle_bit" as any)) return;

        const jukeInv = (jukebox.getComponent("minecraft:inventory") as any)?.container;
        const hopperInv = (hopperBlock.getComponent("minecraft:inventory") as any)?.container;
        if (!jukeInv || !hopperInv) return;

        const item = jukeInv.getItem(0);
        if (!item) return;

        const itemToMove = new ItemStack(item.typeId, 1);
        const remainder = hopperInv.addItem(itemToMove);

        if (!remainder || remainder.amount === 0) {
            jukeInv.setItem(0, undefined);
        }
    }

    pullFromHopper(jukebox: Block, hopperBlock: Block): void {
        const jukeInv = (jukebox.getComponent("minecraft:inventory") as any)?.container;
        const hopperInv = (hopperBlock.getComponent("minecraft:inventory") as any)?.container;
        if (!jukeInv || !hopperInv) return;

        if (jukeInv.getItem(0)) return; 

        for (let i = 0; i < hopperInv.size; i++) {
            const item = hopperInv.getItem(i);
            if (item) {
                // Clone item
                const clone = item.clone();
                clone.amount = 1;
                jukeInv.setItem(0, clone);

                if (item.amount > 1) {
                    item.amount--;
                    hopperInv.setItem(i, item);
                } else {
                    hopperInv.setItem(i, undefined);
                }
                return;
            }
        }
    }

    /**
     * Checks if a new disc has entered the Jukebox (via Hopper) and starts playback.
     */
    processHopperCheck(block: Block): void {
        const invComp = block.getComponent("minecraft:inventory") as any;
        const recordComp = block.getComponent("minecraft:record_player") as any;

        let currentRecord;
        try {
            if (invComp && invComp.container) currentRecord = invComp.container.getItem(0);
            else if (recordComp && recordComp.getRecord) currentRecord = recordComp.getRecord();
        } catch(e) {}

        if (!currentRecord) return;

        const key = this.getLocationKey(block.location);

        // Allow vanilla discs to function normally
        if (currentRecord.typeId.startsWith("minecraft:music_disc_")) return;

        if (!this.activeJukeboxes.has(key)) {
            const tags = currentRecord.getTags();
            const sTag = tags.find(t => t.startsWith("sound:"));
            const dTag = tags.find(t => t.startsWith("duration:"));
            const nTag = tags.find(t => t.startsWith("name:")); 
            
            if (sTag) {
                const sound = sTag.substring(6);
                const duration = dTag ? parseFloat(dTag.substring(9)) : 0;
                const name = nTag ? nTag.substring(5) : "";
                this.playDisc(block, currentRecord.typeId, sound, duration, name);
            }
        }
    }

    /**
     * Starts playback, visuals, and state tracking.
     */
    playDisc(block: Block, discTypeId: string, soundId: string, duration = 0, name = ""): void {
        const key = this.getLocationKey(block.location);
        if (!soundId) soundId = `record.${discTypeId.split(':')[1]}`;

        if (this.activeJukeboxes.has(key)) this.stopDisc(block.location, false);

        this.stopVanillaMusic(block);
        block.dimension.playSound(soundId, block.location, { volume: 4.0 });

        if (name) {
            block.dimension.runCommand(`title @a[x=${block.location.x},y=${block.location.y},z=${block.location.z},r=10] actionbar §dNow Playing: ${name}`);
        }
        
        const dimId = block.dimension.id;
        const px = Math.floor(block.location.x) + 0.5;
        const py = Math.floor(block.location.y) + 1.2;
        const pz = Math.floor(block.location.z) + 0.5;
        
        const particleRun = system.runInterval(() => {
            try {
                const d = world.getDimension(dimId);
                d.runCommand(`particle minecraft:note_particle ${px} ${py} ${pz}`);
            } catch(e) {}
        }, 20);

        this.activeParticles.set(key, particleRun);
        this.activeJukeboxes.set(key, { 
            soundId, 
            discTypeId, 
            startTime: Date.now(), 
            duration,
            dimensionId: dimId 
        });
    }

    /**
     * Forces item ejection and stops music (e.g. duration end).
     */
    ejectDisc(block: Block, discTypeId: string): void {
        this.stopDisc(block.location, false);
        
        const invComp = block.getComponent("minecraft:inventory") as any;
        const recordComp = block.getComponent("minecraft:record_player") as any;

        try {
            if (invComp && invComp.container) invComp.container.setItem(0, undefined);
            else if (recordComp && recordComp.setRecord) recordComp.setRecord(undefined);
        } catch(e) {}

        const center = { x: block.location.x + 0.5, y: block.location.y + 1.1, z: block.location.z + 0.5 };
        block.dimension.spawnItem(new ItemStack(discTypeId, 1), center);
    }

    /**
     * Stops music and clears tracking.
     * @param defer - If true, command runs next tick.
     */
    stopDisc(location: Vector3, shouldDrop = false, player: Player | null = null, defer = false): void {
        const key = this.getLocationKey(location);
        const data = this.activeJukeboxes.get(key);
        
        if (data) {
            const dim = world.getDimension(data.dimensionId || "overworld");
            const soundId = data.soundId;
            const x = Math.floor(location.x);
            const y = Math.floor(location.y);
            const z = Math.floor(location.z);

            const stopCmd = () => {
                try {
                    if (player && player.isValid) player.runCommand(`stopsound @s ${soundId}`);
                    dim.runCommand(`stopsound @a[x=${x},y=${y},z=${z},r=64] ${soundId}`);
                    dim.runCommand(`stopsound @a ${soundId}`);
                } catch (e) {}
            };

            if (defer) system.run(stopCmd);
            else stopCmd();

            if (shouldDrop) {
                try {
                    const center = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
                    dim.spawnItem(new ItemStack(data.discTypeId, 1), center);
                } catch(e) {}
            }
            this.activeJukeboxes.delete(key);
        }

        const particleRunId = this.activeParticles.get(key);
        if (particleRunId !== undefined) {
            system.clearRun(particleRunId);
            this.activeParticles.delete(key);
        }
    }

    stopVanillaMusic(block: Block): void {
        for (const name of VANILLA_RECORDS) {
            try {
                block.dimension.runCommand(`stopsound @a[x=${block.location.x},y=${block.location.y},z=${block.location.z},r=64] record.${name}`);
            } catch(e) {}
        }
    }

    getLocationKey(loc: Vector3): string {
        return `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`;
    }

    parseLocationKey(key: string): Vector3 {
        const [x, y, z] = key.split(',').map(Number);
        return { x, y, z };
    }
}

export const musicDiscManager = new CustomJukeBox();


