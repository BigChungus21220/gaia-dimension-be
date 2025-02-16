import { world, Entity, system } from "@minecraft/server";

/**
 * MalachiteGuard manages guard behavior using dynamic linking.
 * Each minion (with nameTag "MG_MINION") is linked to a single guard.
 */
class MalachiteGuard {
    /**
     * Initialize the guard’s mg_defend property if not already set.
     * @param {Entity} guard 
     */
    static initializeGuard(guard) {
        if (guard.getDynamicProperty("mg_defend") === undefined) {
            guard.setDynamicProperty("mg_defend", 0);
        }
    }
    
    /**
     * Updates the guard’s mg_defend value:
     * Decreases it by 1 (if ≥ 1) and triggers native events based on threshold.
     * @param {Entity} guard 
     */
    static updateGuardScore(guard) {
        this.initializeGuard(guard);
        let score = guard.getDynamicProperty("mg_defend");
        if (score >= 1) {
            score--;
            guard.setDynamicProperty("mg_defend", score);
        }
        // Trigger events based on the updated score.
        if (score >= 5) {
            guard.triggerEvent("mg_defend");
        } else if (score <= 4 && !guard.hasTag("mg_defend")) {
            guard.triggerEvent("no_mg_defend");
        }
    }
    
    /**
     * Dynamically links a minion to a guard.
     * If the minion already has a linked guard (stored in dynamic property "linkedGuardId"),
     * that guard is returned; otherwise, one is chosen from nearby available guards.
     * @param {Entity} minion 
     * @returns {Entity|null} The guard linked to the minion or null if none found.
     */
    static linkMinion(minion) {
        const storedGuardId = minion.getDynamicProperty("linkedGuardId");
        if (storedGuardId) {
            const guard = world.getEntity(storedGuardId);
            if (guard) return guard;
        }
        const dimension = minion.dimension;
        // Query for guard entities within 100 blocks.
        const query = {
            type: "gaia:malachite_guard",
            location: minion.location,
            maxDistance: 100
        };
        const guards = dimension.getEntities(query);
        // Determine which guards are already linked by checking all minions.
        const minions = world.getAllPlayers().filter(p => p.nameTag === "MG_MINION");
        const linkedGuardIds = minions
            .map(m => m.getDynamicProperty("linkedGuardId"))
            .filter(id => id);
        // Pick a guard that isn’t linked yet.
        const availableGuards = guards.filter(guard => !linkedGuardIds.includes(guard.id));
        let selectedGuard = availableGuards[0] || guards[0] || null;
        if (selectedGuard) {
            minion.setDynamicProperty("linkedGuardId", selectedGuard.id);
        }
        return selectedGuard;
    }
    
    /**
     * For a given minion, update its linked guard by setting mg_defend to 7.
     * @param {Entity} minion 
     */
    static updateMinionInfluence(minion) {
        const guard = this.linkMinion(minion);
        if (guard) {
            guard.setDynamicProperty("mg_defend", 7);
        }
    }
    
    /**
     * Main activation method.
     * If the player is a minion (nameTag "MG_MINION"), update its linked guard’s score.
     * @param {Entity} player 
     */
    static activate(player) {
        if (!(player instanceof Entity)) {
            throw new Error("The provided argument is not an instance of Player.");
        }
        if (player.nameTag === "MG_MINION") {
            this.updateMinionInfluence(player);
        }
        // Update the linked guard’s score if one exists.
        const linkedGuardId = player.getDynamicProperty("linkedGuardId");
        if (linkedGuardId) {
            const guard = world.getEntity(linkedGuardId);
            if (guard) {
                this.updateGuardScore(guard);
            }
        }
    }
}

// Run an interval that processes all players every 5 ticks.
system.runInterval(() => {
    world.getAllPlayers().forEach(player => {
        MalachiteGuard.activate(player);
    });
}, 5);

export default MalachiteGuard;

