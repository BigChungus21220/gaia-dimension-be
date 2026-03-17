import { BossEvent, BossBarColor, BossBarOverlay } from "../../world/BossEvent.js";

export class ServerBossEvent extends BossEvent {
    constructor(name: string, color: BossBarColor, overlay: BossBarOverlay) {
        super(name, color, overlay);
    }
}
