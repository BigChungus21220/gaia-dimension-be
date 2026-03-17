import { Player } from "@minecraft/server";

export enum BossBarColor {
    PINK = "p",
    BLUE = "b",
    RED = "r",
    GREEN = "g",
    YELLOW = "y",
    PURPLE = "m",
    WHITE = "w"
}

export enum BossBarOverlay {
    PROGRESS = "00",
    NOTCHED_6 = "06",
    NOTCHED_10 = "10",
    NOTCHED_12 = "12",
    NOTCHED_20 = "20"
}

export abstract class BossEvent {
    protected name: string;
    protected color: BossBarColor;
    protected overlay: BossBarOverlay;
    protected progress: number = 1.0;
    protected players: Set<Player> = new Set();

    constructor(name: string, color: BossBarColor, overlay: BossBarOverlay) {
        this.name = name;
        this.color = color;
        this.overlay = overlay;
    }

    public getProgress(): number {
        return this.progress;
    }

    public setProgress(progress: number): void {
        this.progress = progress;
        this.update();
    }

    public getColor(): BossBarColor {
        return this.color;
    }

    public setColor(color: BossBarColor): void {
        this.color = color;
        this.update();
    }

    public getOverlay(): BossBarOverlay {
        return this.overlay;
    }

    public setOverlay(overlay: BossBarOverlay): void {
        this.overlay = overlay;
        this.update();
    }

    public addPlayer(player: Player): void {
        this.players.add(player);
        this.update();
    }

    public removePlayer(player: Player): void {
        this.players.delete(player);
        this.clearForPlayer(player);
    }

    public setName(name: string): void {
        this.name = name;
        this.update();
    }

    protected update(): void {
        for (const player of this.players) {
            this.sendToPlayer(player);
        }
    }

    private sendToPlayer(player: Player): void {
        // thanks to CodeGeek for the Code provided
        const progressInt = Math.floor(this.progress * 1000).toString().padStart(4, "0");
        const subtitle = `§lib:bossbar_health:${progressInt}${this.color}_${this.overlay}`;
        const title = `§lib:bossbar_title:${this.name}`;
        
        player.onScreenDisplay.setTitle(title, {
            stayDuration: 100,
            fadeInDuration: 10,
            fadeOutDuration: 10,
            subtitle: subtitle
        });
    }

    private clearForPlayer(player: Player): void {
        // thanks to CodeGeek for the Code provided
        player.onScreenDisplay.setTitle("§lib:bossbar_title:", {
            stayDuration: 100,
            fadeInDuration: 10,
            fadeOutDuration: 10,
            subtitle: "§lib:bossbar_health:"
        });
    }
}
