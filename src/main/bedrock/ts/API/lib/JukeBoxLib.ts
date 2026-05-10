import { 
    world, 
    system, 
    ItemStack, 
    Block, 
    Vector3, 
    Player, 
    Dimension, 
    BlockInventoryComponent, 
    BlockRecordPlayerComponent, 
    EntityInventoryComponent, 
    Container,
    PlayerInteractWithBlockBeforeEvent,
    PlayerBreakBlockBeforeEvent,
    BlockExplodeAfterEvent,
    BlockPermutation,
    GameMode
} from "@minecraft/server";

declare module "@minecraft/server" {
    interface Block {
        below(): Block | undefined;
        above(): Block | undefined;
    }
    interface BlockPermutation {
        getState(stateName: string): string | number | boolean | undefined;
    }
}

// Vanilla records array 
const VANILLA_RECORDS: string[] = [
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
        world.beforeEvents.playerInteractWithBlock.subscribe((ev: PlayerInteractWithBlockBeforeEvent) => {
            if (ev.block.typeId !== "minecraft:jukebox") return;

            const { block, player, itemStack } = ev;
            const key = this.getLocationKey(block.location);

            const isPlaying: boolean = this.activeJukeboxes.has(key);
            const invComp = block.getComponent("minecraft:inventory") as BlockInventoryComponent;
            const recordComp = block.getComponent("minecraft:record_player") as BlockRecordPlayerComponent;
            
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
                const tags: string[] = itemStack.getTags();
                const sTag: string | undefined = tags.find(t => t.startsWith("sound:"));
                
                if (sTag) {
                    const soundId: string = sTag.substring(6);
                    const dTag: string | undefined = tags.find(t => t.startsWith("duration:"));
                    const nTag: string | undefined = tags.find(t => t.startsWith("name:"));
                    
                    const duration: number = dTag ? parseFloat(dTag.substring(9)) : 0;
                    const name: string = nTag ? nTag.substring(5) : "";

                    system.run(() => {
                        this.insertDisc(block, player, itemStack, soundId, duration, name);
                    });
                }
            }
        });

        // Cleanup on block break (Synchronous)
        world.beforeEvents.playerBreakBlock.subscribe((ev: PlayerBreakBlockBeforeEvent) => {
            if (ev.block.typeId === "minecraft:jukebox") {
                this.handleBreak(ev.block, ev.player);
            }
        });
        
        // Explosion Cleanup /async 
        world.afterEvents.blockExplode.subscribe((ev: BlockExplodeAfterEvent) => {
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
        const invComp = block.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const recordComp = block.getComponent("minecraft:record_player") as BlockRecordPlayerComponent;
        
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

        if (player.getGameMode() !== GameMode.creative) {
            const playerInvComp = player.getComponent("minecraft:inventory") as EntityInventoryComponent;
            const inv: Container | undefined = playerInvComp?.container;
            if (inv) {
                const selected: ItemStack | undefined = inv.getItem(player.selectedSlotIndex);
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
            const loc: Vector3 = this.parseLocationKey(key);
            const dim: Dimension = world.getDimension(data.dimensionId || "overworld");
            
            try {
                const block: Block | undefined = dim.getBlock(loc);
                if (!block || block.typeId !== "minecraft:jukebox") {
                    this.stopDisc(loc, false); 
                    continue;
                }

                const invComp = block.getComponent("minecraft:inventory") as BlockInventoryComponent;
                const recordComp = block.getComponent("minecraft:record_player") as BlockRecordPlayerComponent;
                
                let currentRecord: ItemStack | undefined;
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
                    const elapsed: number = (Date.now() - data.startTime) / 1000;
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
            const pos: Vector3 = player.location;
            for (let x = -4; x <= 4; x++) {
                for (let y = -2; y <= 2; y++) {
                    for (let z = -4; z <= 4; z++) {
                        const bPos: Vector3 = { x: Math.floor(pos.x + x), y: Math.floor(pos.y + y), z: Math.floor(pos.z + z) };
                        try {
                            const block: Block | undefined = player.dimension.getBlock(bPos);
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
            const hopperBelow: Block | undefined = block.below();
            if (hopperBelow && hopperBelow.typeId === "minecraft:hopper") {
                this.pushToHopper(block, hopperBelow);
            }
        } catch (e) {}

        // Input from Hopper Above (Pull)
        try {
            const hopperAbove: Block | undefined = block.above();
            if (hopperAbove && hopperAbove.typeId === "minecraft:hopper") {
                const facing = hopperAbove.permutation.getState("facing_direction");
                const isLocked = hopperAbove.permutation.getState("toggle_bit");
                
                // Facing 0 = Down
                if (facing === 0 && !isLocked) {
                    this.pullFromHopper(block, hopperAbove);
                }
            }
        } catch (e) {}
    }

    pushToHopper(jukebox: Block, hopperBlock: Block): void {
        if (hopperBlock.permutation.getState("toggle_bit")) return;

        const jukeInvComp = jukebox.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const jukeInv: Container | undefined = jukeInvComp?.container;
        const hopperInvComp = hopperBlock.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const hopperInv: Container | undefined = hopperInvComp?.container;
        
        if (!jukeInv || !hopperInv) return;

        const item: ItemStack | undefined = jukeInv.getItem(0);
        if (!item) return;

        const itemToMove: ItemStack = new ItemStack(item.typeId, 1);
        const remainder: ItemStack | undefined = hopperInv.addItem(itemToMove);

        if (!remainder || remainder.amount === 0) {
            jukeInv.setItem(0, undefined);
        }
    }

    pullFromHopper(jukebox: Block, hopperBlock: Block): void {
        const jukeInvComp = jukebox.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const jukeInv: Container | undefined = jukeInvComp?.container;
        const hopperInvComp = hopperBlock.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const hopperInv: Container | undefined = hopperInvComp?.container;
        
        if (!jukeInv || !hopperInv) return;

        if (jukeInv.getItem(0)) return; 

        for (let i = 0; i < hopperInv.size; i++) {
            const item: ItemStack | undefined = hopperInv.getItem(i);
            if (item) {
                // Clone item
                const clone: ItemStack = item.clone();
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
        const invComp = block.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const recordComp = block.getComponent("minecraft:record_player") as BlockRecordPlayerComponent;

        let currentRecord: ItemStack | undefined;
        try {
            if (invComp && invComp.container) currentRecord = invComp.container.getItem(0);
            else if (recordComp && recordComp.getRecord) currentRecord = recordComp.getRecord();
        } catch(e) {}

        if (!currentRecord) return;

        const key: string = this.getLocationKey(block.location);

        // Allow vanilla discs to function normally
        if (currentRecord.typeId.startsWith("minecraft:music_disc_")) return;

        if (!this.activeJukeboxes.has(key)) {
            const tags: string[] = currentRecord.getTags();
            const sTag: string | undefined = tags.find(t => t.startsWith("sound:"));
            const dTag: string | undefined = tags.find(t => t.startsWith("duration:"));
            const nTag: string | undefined = tags.find(t => t.startsWith("name:")); 
            
            if (sTag) {
                const sound: string = sTag.substring(6);
                const duration: number = dTag ? parseFloat(dTag.substring(9)) : 0;
                const name: string = nTag ? nTag.substring(5) : "";
                this.playDisc(block, currentRecord.typeId, sound, duration, name);
            }
        }
    }

    /**
     * Starts playback, visuals, and state tracking.
     */
    playDisc(block: Block, discTypeId: string, soundId: string, duration = 0, name = ""): void {
        const key: string = this.getLocationKey(block.location);
        if (!soundId) soundId = `record.${discTypeId.split(':')[1]}`;

        if (this.activeJukeboxes.has(key)) this.stopDisc(block.location, false);

        this.stopVanillaMusic(block);
        block.dimension.playSound(soundId, block.location, { volume: 4.0 });

        if (name) {
            const { x, y, z } = block.location;
            block.dimension.runCommand(`title @a[x=${x},y=${y},z=${z},r=10] actionbar §dNow Playing: ${name}`);
        }
        
        const dimId: string = block.dimension.id;
        const px: number = Math.floor(block.location.x) + 0.5;
        const py: number = Math.floor(block.location.y) + 1.2;
        const pz: number = Math.floor(block.location.z) + 0.5;
        
        const particleRun: number = system.runInterval(() => {
            try {
                const d: Dimension = world.getDimension(dimId);
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
        
        const invComp = block.getComponent("minecraft:inventory") as BlockInventoryComponent;
        const recordComp = block.getComponent("minecraft:record_player") as BlockRecordPlayerComponent;

        try {
            if (invComp && invComp.container) invComp.container.setItem(0, undefined);
            else if (recordComp && recordComp.setRecord) recordComp.setRecord(undefined);
        } catch(e) {}

        const center: Vector3 = { x: block.location.x + 0.5, y: block.location.y + 1.1, z: block.location.z + 0.5 };
        block.dimension.spawnItem(new ItemStack(discTypeId, 1), center);
    }

    /**
     * Stops music and clears tracking.
     * @param defer - If true, command runs next tick.
     */
    stopDisc(location: Vector3, shouldDrop = false, player: Player | null = null, defer = false): void {
        const key: string = this.getLocationKey(location);
        const data: JukeboxData | undefined = this.activeJukeboxes.get(key);
        
        if (data) {
            const dim: Dimension = world.getDimension(data.dimensionId || "overworld");
            const soundId: string = data.soundId;
            const x: number = Math.floor(location.x);
            const y: number = Math.floor(location.y);
            const z: number = Math.floor(location.z);

            const stopCmd: () => void = () => {
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
                    const center: Vector3 = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
                    dim.spawnItem(new ItemStack(data.discTypeId, 1), center);
                } catch(e) {}
            }
            this.activeJukeboxes.delete(key);
        }

        const particleRunId: number | undefined = this.activeParticles.get(key);
        if (particleRunId !== undefined) {
            system.clearRun(particleRunId);
            this.activeParticles.delete(key);
        }
    }

    stopVanillaMusic(block: Block): void {
        const { x, y, z } = block.location;
        for (const name of VANILLA_RECORDS) {
            try {
                block.dimension.runCommand(`stopsound @a[x=${x},y=${y},z=${z},r=64] record.${name}`);
            } catch(e) {}
        }
    }

    getLocationKey(loc: Vector3): string {
        return `${Math.floor(loc.x)},${Math.floor(loc.y)},${Math.floor(loc.z)}`;
    }

    parseLocationKey(key: string): Vector3 {
        const parts: string[] = key.split(',');
        const x: number = Number(parts[0]);
        const y: number = Number(parts[1]);
        const z: number = Number(parts[2]);
        return { x, y, z };
    }
}

export const musicDiscManager = new CustomJukeBox();


